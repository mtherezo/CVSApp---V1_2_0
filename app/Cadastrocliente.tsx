import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ImageBackground, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, StatusBar, SafeAreaView} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Cliente } from '../src/types';
import * as Crypto from 'expo-crypto'; // ✨ SUBSTITUÍDO: uuid por expo-crypto para gerar IDs
// ✨ SUBSTITUÍDO: Importações do storage antigo pelas novas do SQLite
import { cadastrarClienteSQLite, buscarClientePorIdSQLite } from '../src/database/sqlite';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function CadastroClienteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const clienteIdParaEditar = params.id;

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [endereco, setEndereco] = useState('');
  
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (clienteIdParaEditar) {
      setIsEditing(true);
      setIsLoadingData(true);
      const carregarDadosDoCliente = async () => {
        try {
          // ✨ MUDANÇA: Chama a função do SQLite para buscar o cliente
          const clienteExistente = await buscarClientePorIdSQLite(clienteIdParaEditar);
          if (clienteExistente) {
            setNome(clienteExistente.nome);
            setTelefone(clienteExistente.telefone || '');
            setEmail(clienteExistente.email || '');
            setEndereco(clienteExistente.endereco || ''); // ✨ Adicionado para carregar o endereço
          } else {
            Alert.alert('Erro', 'Cliente não encontrado para edição.');
            router.back();
          }
        } catch (error) {
          console.error('Falha ao carregar dados do cliente para edição:', error);
          Alert.alert('Erro Inesperado', 'Não foi possível carregar os dados do cliente.');
          router.back();
        } finally {
          setIsLoadingData(false);
        }
      };
      carregarDadosDoCliente();
    }
  }, [clienteIdParaEditar]);

  const handleSalvarOuAtualizarCliente = async () => {
    if (!nome.trim() || !telefone.trim()) {
      Alert.alert('Atenção', 'Nome e Telefone são obrigatórios.');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        Alert.alert('Atenção', 'Por favor, insira um e-mail válido.');
        return;
    }

    setIsSaving(true);

    const dadosCliente: Cliente = {
      // ✨ MUDANÇA: Se estiver editando, usa o ID existente. Se for novo, gera um UUID seguro.
      id: isEditing && clienteIdParaEditar ? clienteIdParaEditar : Crypto.randomUUID(),
      nome: nome.trim(),
      telefone: telefone.trim(),
      email: email.trim() || undefined,
      endereco: endereco.trim() || undefined,
    };

    try {
      // ✨ SIMPLIFICAÇÃO: A mesma função agora serve para cadastrar e editar!
      await cadastrarClienteSQLite(dadosCliente);
      
      Alert.alert('Sucesso', `Cliente ${isEditing ? 'atualizado' : 'cadastrado'} com sucesso!`);
      router.back();

    } catch (error) {
      console.error(`Falha ao ${isEditing ? 'atualizar' : 'salvar'} cliente:`, error);
      Alert.alert('Erro Inesperado', `Ocorreu um erro ao tentar ${isEditing ? 'atualizar' : 'cadastrar'} o cliente.`);
    } finally {
      setIsSaving(false);
    }
  };

  // O resto do seu componente (JSX e estilos) está perfeito e não precisa de alterações.
  // ... (todo o seu JSX e estilos permanecem aqui)
  if (isLoadingData) {
    return (
      <ImageBackground source={require("../assets/images/fundo.jpg")} style={styles.background} blurRadius={2}>
        <View style={styles.overlay} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>A carregar dados do cliente...</Text>
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
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.title}>{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</Text>
            </View>
            <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="account-outline" size={22} color="#A9A9A9" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Nome Completo *"
                        value={nome}
                        onChangeText={setNome}
                        placeholderTextColor="#A9A9A9"
                        autoCapitalize="words"
                    />
                </View>
                <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="phone-outline" size={22} color="#A9A9A9" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Celular 5591999999999"
                        value={telefone}
                        onChangeText={setTelefone}
                        placeholderTextColor="#A9A9A9"
                        keyboardType="phone-pad"
                    />
                </View>
                <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="email-outline" size={22} color="#A9A9A9" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="E-mail (opcional)"
                        value={email}
                        onChangeText={setEmail}
                        placeholderTextColor="#A9A9A9"
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>
                <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="map-marker-outline" size={22} color="#A9A9A9" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Endereço (opcional)"
                        value={endereco}
                        onChangeText={setEndereco}
                        placeholderTextColor="#A9A9A9"
                        autoCapitalize="words"
                    />
                </View>
                {isSaving ? (
                <ActivityIndicator size="large" color="#FFFFFF" style={styles.loader} />
                ) : (
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleSalvarOuAtualizarCliente}
                    disabled={isSaving}
                >
                    <MaterialCommunityIcons name={isEditing ? "content-save-edit-outline" : "content-save-outline"} size={22} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>{isEditing ? 'Atualizar Cliente' : 'Salvar Cliente'}</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
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
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 17, 
    fontWeight: 'bold',
    marginLeft: 10,
  },
  loader: { 
    marginTop: 20,
    paddingVertical: 15,
  },
});