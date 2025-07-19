import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  Alert,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Cliente } from '../src/types';
// ✨ SUBSTITUÍDO: Importa a nova função de pesquisa do SQLite
import { pesquisarClientesPorNomeSQLite } from '../src/database/sqlite';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function PesquisarVendasClienteScreen() {
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [clientesEncontrados, setClientesEncontrados] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pesquisaRealizada, setPesquisaRealizada] = useState(false);
  const router = useRouter();

  const handlePesquisarClientes = async () => {
    const termo = termoPesquisa.trim();
    if (!termo) {
      Alert.alert("Atenção", "Por favor, digite um nome para pesquisar.");
      setClientesEncontrados([]);
      setPesquisaRealizada(false); // Volta ao estado inicial se a busca for vazia
      return;
    }
    
    setIsLoading(true);
    setPesquisaRealizada(true);

    try {
      // ✨ SIMPLIFICADO: A pesquisa agora é feita diretamente no banco de dados.
      // É muito mais rápido e eficiente do que carregar todos os clientes para a memória.
      const filtrados = await pesquisarClientesPorNomeSQLite(termo);
      setClientesEncontrados(filtrados);
    } catch (error) {
      console.error("Erro ao pesquisar clientes:", error);
      Alert.alert("Erro", "Não foi possível realizar a pesquisa de clientes.");
      setClientesEncontrados([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelecionarCliente = (cliente: Cliente) => {
    router.push({
      pathname: '/Vendascliente',
      params: { idCliente: cliente.id, nome: cliente.nome, telefone: cliente.telefone  },
    });
  };

  const renderItemCliente = ({ item }: { item: Cliente }) => (
    <TouchableOpacity
      style={styles.cardCliente}
      onPress={() => handleSelecionarCliente(item)}
    >
        <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="account-circle-outline" size={32} color="#E0E0FF" />
        </View>
        <View style={styles.infoContainer}>
            <Text style={styles.nomeCliente}>{item.nome}</Text>
            {item.telefone && <Text style={styles.detalheCliente}>{item.telefone}</Text>}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={28} color="#A9A9A9" />
    </TouchableOpacity>
  );

  const renderEmptyOrInitialState = () => {
      if (isLoading) {
          return <ActivityIndicator size="large" color="#FFFFFF" style={{marginTop: 50}} />;
      }
      if (pesquisaRealizada) {
          return (
              <View style={styles.emptyListContainer}>
                  <MaterialCommunityIcons name="account-search-outline" size={60} color="rgba(255,255,255,0.3)" />
                  <Text style={styles.emptyListText}>Nenhum cliente encontrado.</Text>
                  <Text style={styles.emptyListSubtext}>Tente um nome diferente.</Text>
              </View>
          );
      }
      return (
        <View style={styles.emptyListContainer}>
            <MaterialCommunityIcons name="text-search" size={60} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyListText}>Pesquisar Vendas por Cliente</Text>
            <Text style={styles.emptyListSubtext}>Digite um nome acima para começar.</Text>
        </View>
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
        <View style={styles.headerContainer}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Pesquisar Vendas</Text>
        </View>

        <View style={styles.container}>
            <View style={styles.searchBarContainer}>
                <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="magnify" size={22} color="#A9A9A9" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Nome do cliente..."
                        value={termoPesquisa}
                        onChangeText={setTermoPesquisa}
                        placeholderTextColor="#A9A9A9"
                        onSubmitEditing={handlePesquisarClientes}
                    />
                </View>
                <TouchableOpacity
                    style={[styles.searchButton, isLoading && styles.disabledButton]}
                    onPress={handlePesquisarClientes}
                    disabled={isLoading}
                >
                   {isLoading ? 
                      <ActivityIndicator size="small" color="#FFFFFF" /> :
                      <Text style={styles.searchButtonText}>Buscar</Text>
                   }
                </TouchableOpacity>
            </View>

            <FlatList
              data={clientesEncontrados}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderItemCliente}
              ListEmptyComponent={renderEmptyOrInitialState}
              contentContainerStyle={{paddingTop: 10}}
            />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(25, 10, 50, 0.65)' },
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  headerContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10 },
  backButton: { padding: 8, marginRight: 10 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', flex: 1, marginRight: 40 },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  inputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.25)',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputIcon: {
      paddingLeft: 15,
  },
  input: {
    flex: 1,
    paddingVertical: 14, 
    paddingHorizontal: 10,
    fontSize: 16, 
    color: '#FFFFFF', 
  },
  searchButton: {
    backgroundColor: 'rgba(3, 218, 198, 0.8)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 52, // Para alinhar com altura do input
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardCliente: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconContainer: {
      marginRight: 15,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      padding: 10,
      borderRadius: 25,
  },
  infoContainer: {
      flex: 1,
  },
  nomeCliente: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#FFFFFF',
  },
  detalheCliente: {
      fontSize: 14,
      color: '#E0E0FF',
      marginTop: 2,
  },
  emptyListContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: '20%',
      opacity: 0.8,
  },
  emptyListText: {
      textAlign: 'center',
      fontSize: 18,
      fontWeight: 'bold',
      color: 'rgba(255,255,255,0.7)',
      marginTop: 15,
  },
  emptyListSubtext: {
      textAlign: 'center',
      fontSize: 15,
      color: 'rgba(255,255,255,0.5)',
      marginTop: 5,
  },
  disabledButton: {
      opacity: 0.5,
  },
});