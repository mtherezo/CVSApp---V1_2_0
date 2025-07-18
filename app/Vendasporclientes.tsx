import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
  RefreshControl,
  Platform,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Cliente } from '../src/types';
// ✨ SUBSTITUÍDO: Importa a função do SQLite em vez do storage antigo.
import { listarClientesSQLite } from '../src/database/sqlite';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function VendasPorClientesScreen() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const carregarClientes = useCallback(async (isRefreshing = false) => {
    if (!isRefreshing) setIsLoading(true);
    setError(null);
    try {
      // ✨ MUDANÇA: Chama a função do SQLite para buscar os clientes.
      const dados = await listarClientesSQLite();
      setClientes(dados);
    } catch (err) {
      console.error("Erro ao carregar clientes:", err);
      setError("Não foi possível carregar a lista de clientes. Tente novamente.");
    } finally {
      if (!isRefreshing) setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregarClientes();
    }, [carregarClientes])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carregarClientes(true);
    setRefreshing(false);
  }, [carregarClientes]);

  const renderClienteItem = useCallback(({ item }: { item: Cliente }) => (
    <TouchableOpacity
      style={styles.cardCliente}
      onPress={() => router.push({ pathname: '/Vendascliente', params: { idCliente: item.id, nome: item.nome, telefone: item.telefone } })}
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
  ), [router]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Carregando clientes...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => carregarClientes()}>
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={clientes}
        keyExtractor={(item) => item.id}
        renderItem={renderClienteItem}
        ListEmptyComponent={
          <View style={styles.centered}>
            <MaterialCommunityIcons name="account-multiple-outline" size={60} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyListText}>Nenhum cliente cadastrado.</Text>
          </View>
        }
        contentContainerStyle={clientes.length === 0 ? styles.emptyListContainer : styles.listContentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#FFFFFF"]}
            tintColor={"#FFFFFF"}
          />
        }
      />
    );
  }

  return (
    <ImageBackground source={require("../assets/images/fundo.jpg")} style={styles.background} blurRadius={2}>
        <View style={styles.overlay} />
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.title}>Vendas por Cliente</Text>
            </View>
            <View style={styles.container}>
                {renderContent()}
            </View>
        </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
    background: { flex: 1 },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(25, 10, 50, 0.65)' },
    safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    headerContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10 },
    backButton: { padding: 8, marginRight: 10 },
    title: { fontSize: 26, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', flex: 1, marginRight: 40 },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    loadingText: { marginTop: 10, fontSize: 16, color: '#FFFFFF' },
    errorText: { fontSize: 16, color: '#FFCDD2', textAlign: 'center', marginBottom: 20 },
    retryButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25 },
    retryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    listContentContainer: { paddingTop: 10 }, 
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
        flexGrow: 1,
    },
    emptyListText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        marginTop: 20,
    },
});