// app/index.tsx
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator, 
  Platform,        
  KeyboardAvoidingView,
  ScrollView,      
  SafeAreaView,
  StatusBar,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import CryptoJS from "crypto-js";
import { Usuario } from "../src/types"; 
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Funções de storage locais (simulando o que estava em usuarioStorage.ts)
const USER_KEY = "user_data_v2"; 
async function obterTodosUsuarios(): Promise<Usuario[]> {
    const dados = await SecureStore.getItemAsync(USER_KEY);
    return dados ? JSON.parse(dados) : [];
}
async function salvarTodosUsuarios(usuarios: Usuario[]): Promise<void> {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(usuarios));
}


export default function TelaLoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false); 
  const [isInitializing, setIsInitializing] = useState(true); 
  const router = useRouter();

  const passwordInputRef = useRef<TextInput>(null);

  // Criação automática de usuário padrão caso não exista
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const usuariosExistentes = await obterTodosUsuarios();
        if (usuariosExistentes.length === 0) {
          console.log("Nenhum usuário encontrado, criando usuário padrão...");
          const usuarioPadrao: Usuario = {
            username: "stherezo", 
            passwordHash: CryptoJS.SHA256("69687421").toString(), 
          };
          await salvarTodosUsuarios([usuarioPadrao]); 
          console.log("Usuário padrão 'stherezo' criado com sucesso.");
        } else {
          console.log("Usuários existentes encontrados. Usuário padrão não foi criado.");
        }
      } catch (e) {
        console.error("Erro ao inicializar dados do aplicativo:", e);
        Alert.alert("Erro de Inicialização", "Falha ao verificar ou criar dados iniciais do usuário.");
      } finally {
        setIsInitializing(false);
      }
    };
    initializeApp();
  }, []);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Atenção", "Por favor, preencha o nome de usuário e a senha.");
      return;
    }

    setIsLoading(true);
    try {
      const usuarios = await obterTodosUsuarios(); 

      if (usuarios.length === 0 && !isInitializing) {
        Alert.alert("Erro", "Nenhum usuário cadastrado. Tente reiniciar o aplicativo ou contate o suporte.");
        setIsLoading(false);
        return;
      }
      
      const senhaHashParaComparar = CryptoJS.SHA256(password).toString();

      const usuarioValido = usuarios.find(
        (u: Usuario) => u.username.toLowerCase() === username.trim().toLowerCase() && u.passwordHash === senhaHashParaComparar
      );

      if (usuarioValido) {
        setUsername('');
        setPassword('');
        router.replace({ pathname: "/Home", params: { username: usuarioValido.username } });
      } else {
        setPassword(''); 
        Alert.alert("Login Falhou", "Usuário ou senha incorretos. Verifique seus dados e tente novamente.");
      }
    } catch (error) {
      console.error("Erro durante o processo de login:", error);
      Alert.alert("Erro de Login", "Ocorreu uma falha durante o login. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <ImageBackground
        source={require("../assets/images/fundo.jpg")}
        style={styles.background}
        blurRadius={2}
      >
        <View style={styles.overlay} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Inicializando aplicativo...</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/fundo.jpg")}
      style={styles.background}
      blurRadius={2}
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingContainer}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons name="shield-check-outline" size={80} color="#FFFFFF" />
              <Text style={styles.appName}>CVSApp</Text>
              <Text style={styles.screenTitle}>Acesso da Consultora</Text>
            </View>

            <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="account-outline" size={22} color="#A9A9A9" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Nome de Usuário"
                        onChangeText={setUsername}
                        value={username}
                        placeholderTextColor="#A9A9A9"
                        autoCapitalize="none"
                        returnKeyType="next"
                        onSubmitEditing={() => passwordInputRef.current?.focus()}
                    />
                </View>
                <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="lock-outline" size={22} color="#A9A9A9" style={styles.inputIcon} />
                    <TextInput
                        ref={passwordInputRef}
                        style={styles.input}
                        placeholder="Senha"
                        secureTextEntry
                        onChangeText={setPassword}
                        value={password}
                        placeholderTextColor="#A9A9A9"
                        returnKeyType="done"
                        onSubmitEditing={handleLogin}
                    />
                </View>

                {isLoading ? (
                  <ActivityIndicator size="large" color="#FFFFFF" style={styles.loader} />
                ) : (
                  <TouchableOpacity
                    style={styles.loginButton}
                    onPress={handleLogin}
                    disabled={isLoading}
                  >
                    <MaterialCommunityIcons name="login-variant" size={22} color="#FFFFFF" />
                    <Text style={styles.loginButtonText}>Acessar Sistema</Text>
                  </TouchableOpacity>
                )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(25, 10, 50, 0.65)',
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    color: '#FFFFFF',
    fontSize: 18,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 34,
    fontWeight: 'bold',
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 10,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '300',
    color: "#E0E0FF",
    textAlign: "center",
    marginTop: 4,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 25,
  },
  inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.25)',
      borderRadius: 12,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputIcon: {
      paddingHorizontal: 15,
  },
  input: {
    flex: 1,
    paddingVertical: 14, 
    paddingRight: 15,
    fontSize: 16, 
    color: '#FFFFFF', 
  },
  loginButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    flexDirection: 'row',
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  loginButtonText: {
    color: "white",
    fontSize: 17, 
    fontWeight: "bold",
    marginLeft: 10,
  },
  loader: {
    marginTop: 20,
    paddingVertical: 15,
  },
});
