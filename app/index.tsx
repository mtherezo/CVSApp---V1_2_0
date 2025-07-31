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
import CryptoJS from "crypto-js";
import { Usuario } from "../src/types";
import { MaterialCommunityIcons } from '@expo/vector-icons';

// ✨ 1. Funções de storage agora são importadas do arquivo central
import { obterTodosUsuarios } from "../src/storage/usuarioStorage";

// ✨ 2. As funções locais que estavam aqui foram REMOVIDAS.

export default function TelaLoginScreen() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const router = useRouter();
    const passwordInputRef = useRef<TextInput>(null);

    // ✨ 3. Lógica de inicialização ATUALIZADA
    useEffect(() => {
        const initializeApp = async () => {
            try {
                const usuariosExistentes = await obterTodosUsuarios();
                
                if (usuariosExistentes.length === 0) {
                    // Se não há usuários, redireciona para a tela de cadastro inicial.
                    console.log("Nenhum usuário encontrado, redirecionando para o cadastro inicial...");
                    router.replace('/CadastroInicial'); // Usa 'replace' para não deixar o usuário voltar
                } else {
                    // Se já existem usuários, termina a inicialização e mostra a tela de login.
                    console.log("Usuários existentes encontrados. Carregando tela de login.");
                    setIsInitializing(false);
                }
            } catch (e) {
                console.error("Erro ao inicializar dados do aplicativo:", e);
                Alert.alert("Erro de Inicialização", "Falha ao verificar os dados iniciais do usuário.");
                setIsInitializing(false); // Garante que a tela não fique em loading infinito em caso de erro
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
                Alert.alert("Erro", "Nenhum usuário cadastrado. Por favor, reinicie o aplicativo para criar uma conta.");
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
                    <Text style={styles.loadingText}>Verificando dados...</Text>
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

// ... (os estilos permanecem os mesmos)
const styles = StyleSheet.create({
    background: { flex: 1, },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(25, 10, 50, 0.65)', },
    safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, },
    keyboardAvoidingContainer: { flex: 1, },
    scrollContainer: { flexGrow: 1, justifyContent: "center", padding: 20, },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', },
    loadingText: { marginTop: 15, color: '#FFFFFF', fontSize: 18, },
    logoContainer: { alignItems: 'center', marginBottom: 40, },
    appName: { fontSize: 34, fontWeight: 'bold', color: "#FFFFFF", textAlign: "center", marginTop: 10, },
    screenTitle: { fontSize: 18, fontWeight: '300', color: "#E0E0FF", textAlign: "center", marginTop: 4, },
    formContainer: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 16, padding: 25, },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.25)', borderRadius: 12, marginBottom: 18, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', },
    inputIcon: { paddingHorizontal: 15, },
    input: { flex: 1, paddingVertical: 14, paddingRight: 15, fontSize: 16, color: '#FFFFFF', },
    loginButton: { backgroundColor: 'rgba(76, 175, 80, 0.8)', flexDirection: 'row', paddingVertical: 15, borderRadius: 25, marginTop: 20, alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, },
    loginButtonText: { color: "white", fontSize: 17, fontWeight: "bold", marginLeft: 10, },
    loader: { marginTop: 20, paddingVertical: 15, },
});