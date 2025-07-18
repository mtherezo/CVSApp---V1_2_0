import React, { useState, useCallback, useMemo } from 'react';
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
import { useRouter, useFocusEffect } from 'expo-router';
import { listarTodasVendasSQLite, excluirVendaSQLite } from '../src/database/sqlite';
import { Venda } from '../src/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import EnviarLembreteWhatsAppButton from '../src/components/EnviarLembreteWhatsAppButton';

export default function TodasVendasScreen() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const carregarTodasVendasComLoading = async (showMainLoader = true) => {
    if (showMainLoader) setIsLoading(true);
    try {
      const dados = await listarTodasVendasSQLite();
      setVendas(dados);
    } catch (error) {
      console.error('Falha ao carregar todas as vendas (catch na tela):', error);
      Alert.alert('Erro', 'Não foi possível carregar a lista de todas as vendas.');
    } finally {
      if (showMainLoader) setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carregarTodasVendasComLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregarTodasVendasComLoading();
    }, [])
  );

  const resumo = useMemo(() => {
    let totalVendas = vendas.length;
    let valorTotalVendido = 0;
    let totalPagoAoConsultor = 0; 
    let vendasQuitadas = 0;
    
    vendas.forEach(venda => {
      valorTotalVendido += venda.valorTotal; 
      const valorPagoNestaVenda = venda.pagamentos?.reduce((acc, p) => acc + p.valorPago, 0) || 0;
      totalPagoAoConsultor += valorPagoNestaVenda;
      if (valorPagoNestaVenda >= venda.valorTotal - 0.001) { 
        vendasQuitadas++;
      }
    });

    const valorPendenteDeRecebimento = valorTotalVendido - totalPagoAoConsultor;
    const vendasPendentes = totalVendas - vendasQuitadas;

    return { totalVendas, valorTotalVendido, totalPagoAoConsultor, valorPendenteDeRecebimento, vendasQuitadas, vendasPendentes };
  }, [vendas]);

  const confirmarExclusaoVenda = (vendaParaExcluir: Venda) => {
    const itensDescricao = vendaParaExcluir.itens?.map(p => p.descricao).join(', ') || 'Itens não especificados';
    Alert.alert('Confirmar Exclusão', `Deseja excluir esta venda para "${vendaParaExcluir.clienteNome}" (Itens: ${itensDescricao})?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
          if (!vendaParaExcluir.id) return; 
          setIsDeleting(vendaParaExcluir.id);
          try {
            await excluirVendaSQLite(vendaParaExcluir.id);
            Alert.alert('Sucesso', 'Venda excluída.');
            await carregarTodasVendasComLoading(false); 
          } catch (error) {
            Alert.alert('Erro Inesperado', 'Ocorreu um erro ao excluir a venda.');
          } finally {
            setIsDeleting(null);
          }
      }}
    ]);
  };

  const calcularValorPago = (venda: Venda): number => {
    return venda.pagamentos?.reduce((acc, p) => acc + p.valorPago, 0) || 0;
  };

  const renderItemVenda = ({ item }: { item: Venda }) => {
    const valorPagoNestaVenda = calcularValorPago(item);
    const saldoDevedorItem = item.valorTotal - valorPagoNestaVenda;
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
        <TouchableOpacity onPress={() => router.push({ pathname: '/Parcelasvendacliente', params: { idVenda: item.id }})}>
            <View style={styles.cardHeader}>
                <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                    <MaterialCommunityIcons name="account-outline" size={20} color="#E0E0FF" style={{marginRight: 8}} />
                    <Text style={styles.clienteNomeCard} numberOfLines={1}>{item.clienteNome}</Text>
                </View>
                <Text style={isQuitada ? styles.statusQuitada : styles.statusPendente}>{isQuitada ? "Quitada" : "Pendente"}</Text>
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
                <Text style={styles.valorMontante}>R$ {valorPagoNestaVenda.toFixed(2)}</Text>
                <Text style={styles.valorLabel}>Pendente:</Text>
                <Text style={[styles.valorMontante, saldoDevedorItem > 0 ? styles.textoPendente : styles.textoQuitado]}>R$ {saldoDevedorItem.toFixed(2)}</Text>
            </View>

        </TouchableOpacity>
        <View style={styles.botoesAcaoCard}>
            {saldoDevedorItem > 0.001 && item.clienteTelefone && (
                <EnviarLembreteWhatsAppButton
                    style={styles.botaoCard}
                    clienteTelefone={item.clienteTelefone} 
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
            <TouchableOpacity
                style={[styles.botaoCard, styles.botaoDetalhesCard]}
                onPress={() => router.push({ pathname: '/Parcelasvendacliente', params: { idVenda: item.id }})}
            >
                <MaterialCommunityIcons name="cash-multiple" size={20} color="#FFFFFF" />
                <Text style={styles.textoBotaoCard}>Pagamentos</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.botaoCard, styles.botaoExcluirCard, isDeleting === item.id && styles.disabledButton]}
                onPress={() => confirmarExclusaoVenda(item)}
                disabled={isDeleting === item.id}
            >
                {isDeleting === item.id ? 
                    <ActivityIndicator size="small" color="#FFFFFF" /> : 
                    <MaterialCommunityIcons name="delete-forever-outline" size={20} color="#FFFFFF" />
                }
            </TouchableOpacity>
        </View>
      </View>
    );
  };

  const ListHeaderComponent = () => (
    <>
      <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Histórico Geral</Text>
      </View>
      <View style={styles.resumoContainer}>
        <Text style={styles.resumoItem}>📦 Total de Vendas: {resumo.totalVendas}</Text>
        <Text style={styles.resumoItem}>💰 Valor Total Vendido: R$ {resumo.valorTotalVendido.toFixed(2)}</Text>
        <Text style={styles.resumoItem}>✅ Total Recebido: R$ {resumo.totalPagoAoConsultor.toFixed(2)}</Text>
        <Text style={styles.resumoItemPendente}>💸 Total Pendente: R$ {resumo.valorPendenteDeRecebimento.toFixed(2)}</Text>
      </View>
      <Text style={styles.subTitle}>Lista de Vendas Individuais</Text>
    </>
  );

  if (isLoading && !refreshing) {
    return (
      <ImageBackground source={require("../assets/images/fundo.jpg")} style={styles.background} blurRadius={2}>
        <View style={styles.overlay} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require("../assets/images/fundo.jpg")} style={styles.background} blurRadius={2}>
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={vendas}
          keyExtractor={(item) => item.id.toString()} 
          renderItem={renderItemVenda}
          ListHeaderComponent={ListHeaderComponent}
          ListEmptyComponent={
            <View style={styles.emptyListContainer}>
                <MaterialCommunityIcons name="chart-bar-stacked" size={60} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyListText}>Nenhuma venda registrada.</Text>
            </View>
          }
          contentContainerStyle={vendas.length === 0 ? styles.emptyListContainerStyle : styles.listContentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />
          }
        />
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
  listContentContainer: { paddingHorizontal: 16, paddingBottom: 20 },
  emptyListContainerStyle: { flex: 1 },
  headerContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10 },
  backButton: { padding: 8, marginRight: 10 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', flex: 1, marginRight: 40 },
  resumoContainer: {
    backgroundColor: 'rgba(0,0,0,0.4)', 
    padding: 18, 
    borderRadius: 16, 
    marginBottom: 20,
    marginHorizontal: 10,
  },
  resumoItem: { fontSize: 16, color: '#E0E0FF', marginBottom: 8, lineHeight: 22 },
  resumoItemPendente: { fontSize: 16, color: '#FFCC80', fontWeight: 'bold', marginBottom: 8, lineHeight: 22 },
  subTitle: { fontSize: 22, fontWeight: '600', marginBottom: 15, color: '#FFFFFF', textAlign: 'center' },
  cardVenda: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  clienteNomeCard: { fontSize: 17, fontWeight: 'bold', color: '#FFFFFF', flex: 1, marginLeft: -8 },
  statusQuitada: { fontSize: 12, fontWeight: 'bold', color: '#A5D6A7', backgroundColor: 'rgba(76, 175, 80, 0.25)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  statusPendente: { fontSize: 12, fontWeight: 'bold', color: '#FFCC80', backgroundColor: 'rgba(255, 152, 0, 0.25)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  itensContainer: {
    marginBottom: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  itemLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
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
  botoesAcaoCard: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 12 },
  botaoCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 20, marginLeft: 10 },
  textoBotaoCard: { color: 'white', fontSize: 13, fontWeight: '600', marginLeft: 6 },
  botaoDetalhesCard: { backgroundColor: 'rgba(33, 150, 243, 0.7)' },
  botaoExcluirCard: { backgroundColor: 'rgba(211, 47, 47, 0.7)' },
  emptyListContainer: { justifyContent: 'center', alignItems: 'center', paddingTop: '20%' },
  emptyListText: { textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: 'rgba(255,255,255,0.7)', marginTop: 15 },
  disabledButton: { opacity: 0.5 },
});