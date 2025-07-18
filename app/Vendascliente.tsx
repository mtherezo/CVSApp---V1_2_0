import React, { useState, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ImageBackground,
  ActivityIndicator,
  RefreshControl,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { listarVendasPorClienteSQLite, excluirVendaSQLite } from '../src/database/sqlite';
import { Venda } from '../src/types'; 
import EnviarLembreteWhatsAppButton from '../src/components/EnviarLembreteWhatsAppButton';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function VendasClienteScreen() {
  const params = useLocalSearchParams<{ idCliente?: string; nome?: string; telefone?: string }>();
  const idCliente = params.idCliente;
  const nomeCliente = params.nome;
  const telefoneCliente = params.telefone;

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); 
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const carregarVendasDoCliente = async (showMainLoader = true) => {
    if (!idCliente) {
      Alert.alert("Erro", "ID do Cliente não fornecido.");
      if (router.canGoBack()) router.back(); else router.replace('/Home');
      return;
    }
    if (showMainLoader) setIsLoading(true);
    try {
      const dados = await listarVendasPorClienteSQLite(idCliente);
      setVendas(dados);
    } catch (error) {
      console.error(`Falha ao carregar vendas do cliente ${idCliente} (catch na tela):`, error);
      Alert.alert('Erro', 'Não foi possível carregar as vendas deste cliente.');
    } finally {
      if (showMainLoader) setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carregarVendasDoCliente(false);
    setRefreshing(false);
  }, [idCliente]); 

  useFocusEffect(
    useCallback(() => {
      if (idCliente) { 
        carregarVendasDoCliente();
      }
    }, [idCliente]) 
  );

  const confirmarExclusaoVenda = (vendaParaExcluir: Venda) => {
    const itensDescricao = vendaParaExcluir.itens?.map(p => p.descricao).join(', ') || 'Itens não especificados';
    Alert.alert(
      'Confirmar Exclusão',
      `Tem certeza que deseja excluir esta venda de ${itensDescricao}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir Definitivamente',
          style: 'destructive',
          onPress: async () => {
            if (!vendaParaExcluir.id) return;
            setIsDeleting(vendaParaExcluir.id);
            try {
              await excluirVendaSQLite(vendaParaExcluir.id);
              Alert.alert('Sucesso', 'Venda excluída.');
              await carregarVendasDoCliente(false); 
            } catch (error) {
              console.error('Falha ao excluir venda (catch na tela):', error);
              Alert.alert('Erro Inesperado', 'Ocorreu um erro ao tentar excluir a venda.');
            } finally {
              setIsDeleting(null);
            }
          },
        },
      ]
    );
  };

  const calcularValorPago = (venda: Venda): number => {
    return venda.pagamentos?.reduce((acc, p) => acc + p.valorPago, 0) || 0;
  };

  const renderItemVenda = ({ item }: { item: Venda }) => {
    const valorPago = calcularValorPago(item);
    const saldoDevedorItem = item.valorTotal - valorPago;
    const progresso = item.valorTotal > 0 ? (valorPago / item.valorTotal) * 100 : (valorPago > 0 ? 100 : 0);
    const isQuitada = saldoDevedorItem <= 0.001;
    
    let valorParaLembrete = 0;
    let dataVencimentoParaLembrete: string | Date = item.dataVenda;
    let numeroDaParcelaParaLembrete: number | undefined = undefined;

    if (saldoDevedorItem > 0.001) {
        if (item.tipoPagamento === 'Parcelado' && item.parcelasTotais) {
            const parcelasPagasNum = item.parcelasPagas || 0;
            numeroDaParcelaParaLembrete = parcelasPagasNum + 1;
            const parcelasRestantes = item.parcelasTotais - parcelasPagasNum;
            valorParaLembrete = parcelasRestantes > 0 ? saldoDevedorItem / parcelasRestantes : saldoDevedorItem;
            if(item.dataPrimeiraParcela) dataVencimentoParaLembrete = item.dataPrimeiraParcela;
        } else {
            valorParaLembrete = saldoDevedorItem;
        }
    }

    return (
      <View style={styles.cardVenda}>
        <View style={styles.cardHeader}>
            <Text style={styles.dataVenda}>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(item.dataVenda))}</Text>
            <Text style={isQuitada ? styles.statusQuitada : styles.statusPendente}>
                {isQuitada ? "Quitada" : "Pendente"}
            </Text>
        </View>

        <View style={styles.itensContainer}>
          {item.itens?.map(produto => (
            <View key={produto.id} style={styles.itemLinha}>
              <Text style={styles.itemQuantidade}>{`${produto.quantidade}x`}</Text>
              <Text style={styles.itemDescricao} numberOfLines={2} ellipsizeMode="tail">{produto.descricao}</Text>
              <Text style={styles.itemPreco}>{`R$ ${(produto.valor * produto.quantidade).toFixed(2)}`}</Text>
            </View>
          ))}
        </View>

        <View style={styles.detalhesFinanceiros}>
            {item.desconto && item.desconto > 0 && (
              <>
                <Text style={styles.valorLabel}>Subtotal:</Text>
                <Text style={styles.valorMontante}>R$ {item.subtotal.toFixed(2)}</Text>
              </>
            )}

            {item.desconto && item.desconto > 0 && (
              <>
                <Text style={styles.valorLabel}>Desconto:</Text>
                <Text style={[styles.valorMontante, styles.textoDesconto]}>- R$ {item.desconto.toFixed(2)}</Text>
              </>
            )}

            <Text style={[styles.valorLabel, styles.labelTotalFinal]}>Total:</Text>
            <Text style={[styles.valorMontante, styles.textoTotalFinal]}>R$ {item.valorTotal.toFixed(2)}</Text>
            
            <View style={styles.divisorFinanceiro} />

            <Text style={styles.valorLabel}>Pago:</Text>
            <Text style={styles.valorMontante}>R$ {valorPago.toFixed(2)}</Text>
            <Text style={styles.valorLabel}>Pendente:</Text>
            <Text style={[styles.valorMontante, saldoDevedorItem > 0 && styles.textoPendente]}>R$ {saldoDevedorItem.toFixed(2)}</Text>
        </View>

        <View style={styles.barraProgressoContainer}>
          <View style={[styles.barraProgresso, { width: `${Math.min(100, Math.max(0,progresso))}%` }]} />
        </View>

        <View style={styles.botoesAcaoCard}>
            {saldoDevedorItem > 0.001 && telefoneCliente && (
                <EnviarLembreteWhatsAppButton
                    style={styles.botaoCard}
                    clienteTelefone={telefoneCliente}
                    nomeCliente={item.clienteNome}
                    dataDaCompraOriginal={item.dataVenda}
                    valorLembrete={valorParaLembrete}
                    dataVencimentoLembrete={dataVencimentoParaLembrete}
                    tipoPagamento={item.tipoPagamento}
                    numeroParcela={numeroDaParcelaParaLembrete}
                    totalParcelas={item.parcelasTotais}
                    desconto={item.desconto}
                />
            )}
            <TouchableOpacity style={[styles.botaoCard, styles.botaoDetalhes]} onPress={() => router.push({ pathname: './Parcelasvendacliente', params: { idVenda: item.id } })}>
                <MaterialCommunityIcons name="cash-multiple" size={20} color="#FFFFFF" />
                <Text style={styles.textoBotaoCard}>Pagamentos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.botaoCard, styles.botaoExcluir, isDeleting === item.id && styles.disabledButton]} onPress={() => confirmarExclusaoVenda(item)} disabled={isDeleting === item.id}>
                {isDeleting === item.id ? 
                    <ActivityIndicator size="small" color="#FFFFFF" /> : 
                    <MaterialCommunityIcons name="delete-outline" size={20} color="#FFFFFF" />
                }
            </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading && !refreshing) {
    return (
      <ImageBackground source={require("../assets/images/fundo.jpg")} style={styles.background} blurRadius={2}>
        <View style={styles.overlay} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Carregando vendas de {nomeCliente || 'cliente'}...</Text>
        </View>
      </ImageBackground>
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
            <Text style={styles.title} numberOfLines={1}>Vendas de {nomeCliente}</Text>
        </View>

        <FlatList
          data={vendas}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItemVenda}
          ListEmptyComponent={
            <View style={styles.emptyListContainer}>
                <MaterialCommunityIcons name="cart-off" size={60} color="rgba(255,255,255,0.3)" />
                <Text style={styles.listaVaziaTexto}>Nenhuma venda registrada para este cliente.</Text>
            </View>
          }
          contentContainerStyle={styles.listContentContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />}
        />
        
        <View style={[styles.footerAcoes, { paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 20 }]}>
            <TouchableOpacity
              style={styles.botaoPrincipal}
              onPress={() => router.push({ pathname: '/Cadastrovenda', params: { idCliente, nome: nomeCliente, telefone: telefoneCliente } })}
            >
              <MaterialCommunityIcons name="cart-plus" size={24} color="#FFFFFF" />
              <Text style={styles.textoBotaoPrincipal}>Nova Venda</Text>
            </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(25, 10, 50, 0.65)' },
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#FFFFFF', fontSize: 16 },
  headerContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10 },
  backButton: { padding: 8, marginRight: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', flex: 1 },
  listContentContainer: { paddingHorizontal: 16, paddingBottom: 100 },
  cardVenda: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 12,
      padding: 15,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dataVenda: { fontSize: 14, color: '#E0E0FF', fontStyle: 'italic' },
  statusQuitada: { fontSize: 12, fontWeight: 'bold', color: '#A5D6A7', backgroundColor: 'rgba(76, 175, 80, 0.25)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  statusPendente: { fontSize: 12, fontWeight: 'bold', color: '#FFCC80', backgroundColor: 'rgba(255, 152, 0, 0.25)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  itensContainer: {
    marginBottom: 12,
    paddingLeft: 4,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(255,255,255,0.15)',
  },
  itemLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    paddingLeft: 10,
  },
  itemQuantidade: {
    color: '#E0E0FF',
    fontSize: 15,
    fontWeight: 'bold',
    marginRight: 8,
    minWidth: 30,
  },
  itemDescricao: {
    flex: 1,
    color: '#E0E0E0',
    fontSize: 15,
  },
  itemPreco: {
    color: '#E0E0E0',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
  },
  detalhesFinanceiros: {
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
      paddingVertical: 10,
      marginVertical: 10,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
  },
  valorLabel: { fontSize: 14, color: '#E0E0FF', width: '40%', lineHeight: 22 },
  valorMontante: { fontSize: 15, color: '#FFFFFF', fontWeight: '500', width: '60%', textAlign: 'right', lineHeight: 22 },
  textoPendente: { color: '#FFAB91', fontWeight: 'bold' },
  textoDesconto: { color: '#FFCC80' },
  textoQuitado: { color: '#A5D6A7' },
  labelTotalFinal: {
    fontWeight: 'bold',
  },
  textoTotalFinal: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  divisorFinanceiro: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    width: '100%',
    marginVertical: 8,
  },
  barraProgressoContainer: { height: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 4, overflow: 'hidden', marginTop: 10 },
  barraProgresso: { height: '100%', backgroundColor: '#66BB6A', borderRadius: 4 },
  botoesAcaoCard: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)'},
  botaoCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 20, marginLeft: 10 },
  textoBotaoCard: { color: 'white', fontSize: 13, fontWeight: '600', marginLeft: 6 },
  botaoDetalhes: { backgroundColor: 'rgba(33, 150, 243, 0.7)' },
  botaoExcluir: { backgroundColor: 'rgba(211, 47, 47, 0.7)' },
  emptyListContainer: { justifyContent: 'center', alignItems: 'center', paddingTop: '30%' },
  listaVaziaTexto: { textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: 'rgba(255,255,255,0.7)', marginTop: 15 },
  footerAcoes: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 20,
      paddingTop: 20,
      backgroundColor: 'rgba(25, 10, 50, 0.9)',
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  botaoPrincipal: {
      backgroundColor: '#4CAF50',
      flexDirection: 'row',
      paddingVertical: 15,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
  },
  textoBotaoPrincipal: {
      color: 'white',
      fontSize: 17,
      fontWeight: 'bold',
      marginLeft: 10,
  },
  disabledButton: { opacity: 0.5 },
});