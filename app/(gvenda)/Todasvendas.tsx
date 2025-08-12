//Todasvendas.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ImageBackground, ActivityIndicator, RefreshControl, Platform, SafeAreaView, StatusBar, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { listarTodasVendasSQLite, excluirVendaSQLite } from '../../src/database/sqlite';
import { Venda } from '../../src/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type FiltroStatus = 'todas' | 'pendentes' | 'parciais' | 'quitadas';

export default function TodasVendasScreen() {
    const [vendas, setVendas] = useState<Venda[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filtroAtivo, setFiltroAtivo] = useState<FiltroStatus>('todas');
    const [termoBusca, setTermoBusca] = useState('');
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

    const calcularValorPago = (venda: Venda): number => {
        return venda.pagamentos?.reduce((acc, p) => acc + p.valorPago, 0) || 0;
    };

    const vendasFiltradas = useMemo(() => {
        return vendas
            .filter(venda => {
                if (filtroAtivo === 'todas') return true;
                const valorPago = calcularValorPago(venda);
                const saldoDevedor = venda.valorTotal - valorPago;
                if (filtroAtivo === 'pendentes') return valorPago === 0 && venda.valorTotal > 0;
                if (filtroAtivo === 'parciais') return valorPago > 0 && saldoDevedor > 0.001;
                if (filtroAtivo === 'quitadas') return saldoDevedor <= 0.001;
                return false;
            })
            .filter(venda => {
                const termo = termoBusca.toLowerCase();
                if (!termo) return true;
                return venda.clienteNome.toLowerCase().includes(termo) ||
                       venda.itens.some(item => item.descricao.toLowerCase().includes(termo));
            });
    }, [vendas, filtroAtivo, termoBusca]);

    const resumo = useMemo(() => {
        const listaParaResumo = vendasFiltradas;
        let totalVendas = listaParaResumo.length;
        let valorTotalVendido = 0;
        let totalPagoAoConsultor = 0;
        listaParaResumo.forEach(venda => {
            valorTotalVendido += venda.valorTotal;
            totalPagoAoConsultor += calcularValorPago(venda);
        });
        const valorPendenteDeRecebimento = valorTotalVendido - totalPagoAoConsultor;
        return { totalVendas, valorTotalVendido, totalPagoAoConsultor, valorPendenteDeRecebimento };
    }, [vendasFiltradas]);


    const renderItemVenda = ({ item }: { item: Venda }) => {
        const valorPagoNestaVenda = calcularValorPago(item);
        const saldoDevedorItem = item.valorTotal - valorPagoNestaVenda;

        //  LÓGICA PARA DETERMINAR O STATUS E O ESTILO
        const getStatusInfo = () => {
            if (saldoDevedorItem <= 0.001) {
                return { text: 'Pagamento Quitado', style: styles.statusQuitada };
            }
            if (valorPagoNestaVenda > 0) {
                return { text: 'Pagamento Parcial', style: styles.statusParcial };
            }
            return { text: 'Pagamento Pendente', style: styles.statusPendente };
        };

        const statusInfo = getStatusInfo();

        return (
            <TouchableOpacity
                style={styles.cardVenda}
                onPress={() => router.push({ pathname: '/(gcliente)/Parcelasvendacliente', params: { idVenda: item.id } })}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialCommunityIcons name="account-outline" size={20} color="#E0E0FF" style={{ marginRight: 8 }} />
                            <Text style={styles.clienteNomeCard} numberOfLines={1}>{item.clienteNome}</Text>
                        </View>
                        {item.tipoPagamento === 'Parcelado' && (
                            <Text style={styles.parcelaStatus}>
                                {`Parcelas: ${item.parcelasPagas || 0} de ${item.parcelasTotais}`}
                            </Text>
                        )}
                    </View>
                    <Text style={statusInfo.style}>{statusInfo.text}</Text>
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
        );
    };

    const ListHeaderComponent = () => {
        const percentualPago = resumo.valorTotalVendido > 0
            ? (resumo.totalPagoAoConsultor / resumo.valorTotalVendido) * 100
            : 0;

        return (
            <>
                <View style={styles.headerContainer}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Histórico Geral</Text>
                </View>
                <View style={styles.resumoContainer}>
                    <Text style={styles.resumoItem}>📦 Vendas Exibidas: {resumo.totalVendas}</Text>
                    <Text style={styles.resumoItem}>💰 Valor Total: R$ {resumo.valorTotalVendido.toFixed(2)}</Text>
                    <Text style={styles.resumoItem}>✅ Total Recebido: R$ {resumo.totalPagoAoConsultor.toFixed(2)}</Text>
                    <Text style={styles.resumoItemPendente}>💸 Total Pendente: R$ {resumo.valorPendenteDeRecebimento.toFixed(2)}</Text>

                    <View style={{ marginTop: 15 }}>
                        <View style={styles.progressoHeader}>
                            <Text style={styles.progressoLabel}>Progresso de Recebimentos</Text>
                            <Text style={styles.progressoTexto}>{`${percentualPago.toFixed(1)}%`}</Text>
                        </View>
                        <View style={styles.progressoContainer}>
                            <View style={[styles.progressoBarra, { width: `${Math.min(100, percentualPago)}%` }]} />
                        </View>
                    </View>
                </View>

                <View style={styles.filtroContainer}>
                    <TouchableOpacity style={[styles.filtroBotao, filtroAtivo === 'todas' && styles.filtroTodasAtivo]} onPress={() => setFiltroAtivo('todas')}><Text style={styles.filtroTexto}>Todas</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.filtroBotao, filtroAtivo === 'pendentes' && styles.filtroPendenteAtivo]} onPress={() => setFiltroAtivo('pendentes')}><Text style={styles.filtroTexto}>Pendentes</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.filtroBotao, filtroAtivo === 'parciais' && styles.filtroParcialAtivo]} onPress={() => setFiltroAtivo('parciais')}><Text style={styles.filtroTexto}>Parciais</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.filtroBotao, filtroAtivo === 'quitadas' && styles.filtroQuitadoAtivo]} onPress={() => setFiltroAtivo('quitadas')}><Text style={styles.filtroTexto}>Quitadas</Text></TouchableOpacity>
                </View>
                <Text style={styles.subTitle}>Lista de Vendas Individuais</Text>
            </>
        );
    };

    if (isLoading && !refreshing) {
        return (
            <ImageBackground source={require("../../assets/images/fundo.jpg")} style={styles.background} blurRadius={2}>
                <View style={styles.overlay} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.loadingText}>Carregando...</Text>
                </View>
            </ImageBackground>
        );
    }

    return (
        <ImageBackground source={require("../../assets/images/fundo.jpg")} style={styles.background} blurRadius={2}>
            <View style={styles.overlay} />
            <SafeAreaView style={styles.safeArea}>
                <FlatList
                    data={vendasFiltradas}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItemVenda}
                    ListHeaderComponent={ListHeaderComponent}
                    ListEmptyComponent={
                        <View style={styles.emptyListContainer}>
                            <MaterialCommunityIcons name="chart-bar-stacked" size={60} color="rgba(255,255,255,0.3)" />
                            <Text style={styles.emptyListText}>
                                {vendas.length === 0 ? "Nenhuma venda registrada." : "Nenhuma venda para este filtro."}
                            </Text>
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
    resumoContainer: { backgroundColor: 'rgba(0,0,0,0.4)', padding: 18, borderRadius: 16, marginBottom: 10, marginHorizontal: 10, },
    resumoItem: { fontSize: 16, color: '#E0E0FF', marginBottom: 8, lineHeight: 22 },
    resumoItemPendente: { fontSize: 16, color: '#FFCC80', fontWeight: 'bold', marginBottom: 8, lineHeight: 22 },
    subTitle: { fontSize: 22, fontWeight: '600', marginBottom: 15, color: '#FFFFFF', textAlign: 'center' },
    progressoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, },
    progressoLabel: { fontSize: 14, color: '#E0E0FF', fontWeight: '500', },
    progressoTexto: { fontSize: 14, color: '#FFFFFF', fontWeight: 'bold', },
    progressoContainer: { height: 12, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 6, overflow: 'hidden', },
    progressoBarra: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 6, },
    filtroContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, marginBottom: 20, },
    filtroBotao: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', },
    filtroTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13, },
    filtroTodasAtivo: { backgroundColor: '#81D4FA', borderColor: '#81D4FA', },
    filtroPendenteAtivo: { backgroundColor: '#FFCC80', borderColor: '#FFCC80', },
    filtroParcialAtivo: { backgroundColor: '#B39DDB', borderColor: '#B39DDB', },
    filtroQuitadoAtivo: { backgroundColor: '#A5D6A7', borderColor: '#A5D6A7', },
    cardVenda: { backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    clienteNomeCard: { fontSize: 17, fontWeight: 'bold', color: '#FFFFFF', flex: 1 },
    parcelaStatus: { fontSize: 13, color: '#B39DDB', fontWeight: 'bold', marginTop: 4, },
    statusQuitada: { fontSize: 12, fontWeight: 'bold', color: '#A5D6A7', backgroundColor: 'rgba(76, 175, 80, 0.25)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
    statusParcial: { fontSize: 12, fontWeight: 'bold', color: '#D1C4E9', backgroundColor: 'rgba(126, 87, 194, 0.3)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
    statusPendente: { fontSize: 12, fontWeight: 'bold', color: '#FFCC80', backgroundColor: 'rgba(255, 152, 0, 0.25)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
    itensContainer: { marginBottom: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', },
    itemLinha: { flexDirection: 'row', alignItems: 'center', marginBottom: 5, },
    itemQuantidade: { color: '#E0E0FF', fontSize: 15, fontWeight: 'bold', marginRight: 8, minWidth: 30, },
    itemDescricao: { flex: 1, color: '#E0E0E0', fontSize: 15, },
    itemPreco: { color: '#E0E0E0', fontSize: 15, fontWeight: '500', marginLeft: 8, },
    detalhesFinanceiros: { borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.15)', paddingTop: 10, marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', },
    valorLabel: { fontSize: 14, color: '#E0E0FF', width: '40%', lineHeight: 22 },
    valorMontante: { fontSize: 15, color: '#FFFFFF', fontWeight: '500', width: '60%', textAlign: 'right', lineHeight: 22 },
    textoPendente: { color: '#FFAB91', fontWeight: 'bold' },
    textoDesconto: { color: '#FFCC80' },
    textoQuitado: { color: '#A5D6A7' },
    labelTotalFinal: { fontWeight: 'bold', },
    textoTotalFinal: { fontWeight: 'bold', fontSize: 16, },
    divisorFinanceiro: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.15)', width: '100%', marginVertical: 8, },
    emptyListContainer: { justifyContent: 'center', alignItems: 'center', paddingTop: '20%' },
    emptyListText: { textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: 'rgba(255,255,255,0.7)', marginTop: 15 },
});