import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ImageBackground,
  Platform, ScrollView, KeyboardAvoidingView, ActivityIndicator, StatusBar, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import CryptoJS from 'crypto-js';
// ✨ SUBSTITUÍDO: Importa as novas funções do SQLite
import { cadastrarUsuarioSQLite, excluirUsuarioSQLite } from '../src/database/sqlite';
import { Usuario } from '../src/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function CadastroUsuarioScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameParaExcluir, setUsernameParaExcluir] = useState('');

  const [isRegistering, setIsRegistering] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleCadastro = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Atenção', 'Usuário e Senha são obrigatórios.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Atenção', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsRegistering(true);
    try {
      const novoUsuario: Usuario = {
        username: username.trim(),
        passwordHash: CryptoJS.SHA256(password).toString(),
      };
      
      // ✨ SIMPLIFICADO: Tenta inserir o usuário. O banco de dados vai
      // gerar um erro se o usuário já existir, que será pego no `catch`.
      await cadastrarUsuarioSQLite(novoUsuario);

      Alert.alert('Sucesso', 'Usuário cadastrado com sucesso!');
      setUsername('');
      setPassword('');

    } catch (error: any) {
      // ✨ MELHORADO: Verifica se o erro é de duplicidade.
      if (error.message && error.message.includes('UNIQUE constraint failed')) {
        Alert.alert('Erro', 'Este nome de usuário já existe. Tente outro.');
      } else {
        console.error('Falha ao cadastrar usuário:', error);
        Alert.alert('Erro Inesperado', 'Ocorreu um erro ao tentar cadastrar o usuário.');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const confirmarExclusao = () => {
    if (!usernameParaExcluir.trim()) {
      Alert.alert("Atenção", "Digite o nome do usuário que deseja excluir.");
      return;
    }
    Alert.alert(
      "Confirmar Exclusão",
      `Tem certeza que deseja excluir o usuário "${usernameParaExcluir.trim()}"? Esta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: () => handleExcluirConfirmado() }
      ]
    );
  };

  const handleExcluirConfirmado = async () => {
    setIsDeleting(true);
    try {
      // ✨ SIMPLIFICADO: Chama a função de exclusão e verifica o retorno booleano.
      const sucesso = await excluirUsuarioSQLite(usernameParaExcluir.trim());
      if (sucesso) {
        Alert.alert("Sucesso", `Usuário "${usernameParaExcluir.trim()}" excluído com sucesso!`);
        setUsernameParaExcluir('');
      } else {
        Alert.alert("Erro", `Usuário "${usernameParaExcluir.trim()}" não encontrado.`);
      }
    } catch (error) {
      console.error('Falha ao excluir usuário (catch na tela):', error);
      Alert.alert('Erro Inesperado', 'Ocorreu um erro ao tentar excluir o usuário.');
    } finally {
      setIsDeleting(false);
    }
  };

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
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.title}>Gerenciar Usuários</Text>
            </View>
            
            {/* Seção de Cadastro */}
            <View style={styles.formContainer}>
                <Text style={styles.sectionTitle}>Cadastrar Novo Usuário</Text>
                <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="account-plus-outline" size={22} color="#A9A9A9" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Nome de Usuário *"
                        value={username}
                        onChangeText={setUsername}
                        placeholderTextColor="#A9A9A9"
                        autoCapitalize="none"
                    />
                </View>
                <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="lock-outline" size={22} color="#A9A9A9" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Senha (mín. 6 caracteres) *"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                        placeholderTextColor="#A9A9A9"
                    />
                </View>
                {isRegistering ? (
                    <ActivityIndicator size="large" color="#FFFFFF" style={styles.loader} />
                ) : (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleCadastro}
                        disabled={isRegistering || isDeleting}
                    >
                        <MaterialCommunityIcons name="account-plus" size={22} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Cadastrar Usuário</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Seção de Exclusão */}
            <View style={[styles.formContainer, {marginTop: 30}]}>
                <Text style={styles.sectionTitle}>Excluir Usuário</Text>
                <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="account-remove-outline" size={22} color="#A9A9A9" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Nome do Usuário para Excluir"
                        value={usernameParaExcluir}
                        onChangeText={setUsernameParaExcluir}
                        placeholderTextColor="#A9A9A9"
                        autoCapitalize="none"
                    />
                </View>
                {isDeleting ? (
                    <ActivityIndicator size="large" color="#FF7F7F" style={styles.loader} />
                ) : (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton, (isRegistering || isDeleting) && styles.disabledButton]}
                        onPress={confirmarExclusao}
                        disabled={isRegistering || isDeleting}
                    >
                        <MaterialCommunityIcons name="delete-forever-outline" size={22} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Excluir Usuário</Text>
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
    padding: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
      padding: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
    marginRight: 40,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
    paddingBottom: 10,
  },
  inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.25)',
      borderRadius: 12,
      marginBottom: 15,
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
  actionButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    paddingVertical: 15, 
    borderRadius: 25,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  deleteButton: {
    backgroundColor: '#D32F2F',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 17, 
    fontWeight: 'bold',
    marginLeft: 10,
  },
  loader: { 
    marginTop: 10,
    paddingVertical: 15,
  },
  disabledButton: {
      opacity: 0.5,
  }
});