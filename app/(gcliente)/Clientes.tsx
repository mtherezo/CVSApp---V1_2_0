import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Alert, ImageBackground, ActivityIndicator, RefreshControl, Platform, SafeAreaView, StatusBar,} from 'react-native';
import { StyledText as Text } from '../../src/components/StyledText';
import { Cliente } from '../../src/types';
import { useRouter, useFocusEffect } from 'expo-router';
import { listarClientesSQLite, excluirClienteSQLite, contarClientesSQLite } from '../../src/database/sqlite';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '../../src/contexts/AppContext';
import CustomAlert from '../../src/components/CustomAlert';
import { usePremium } from '../../src/contexts/PremiumContext';

export default function ClientesScreen() {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDbReady } = useAppContext();
    const { isPremium } = usePremium();

    const [alertVisible, setAlertVisible] = useState(false);
    const [alertInfo, setAlertInfo] = useState({ title: '', message: '', onConfirm: undefined as (() => void) | undefined, confirmText: 'Ok' });

    const showAlert = (title: string, message: string, onConfirm?: () => void, confirmText = 'Ok') => {
        setAlertInfo({ title, message, onConfirm, confirmText });
        setAlertVisible(true);
    };

    const carregarClientesComLoading = async (showLoader = true) => {
        if (showLoader) setIsLoading(true);
        try {
            const dados = await listarClientesSQLite();
            setClientes(dados);
        } catch (error) {
            console.error('Falha ao carregar clientes (catch na tela):', error);
            showAlert('Erro', 'Não foi possível carregar a lista de clientes.');
        } finally {
            if (showLoader) setIsLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await carregarClientesComLoading(false);
        setRefreshing(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            if (isDbReady) {
                carregarClientesComLoading();
                setClienteSelecionado(null);
            }
        }, [isDbReady])
    );

    const handleExcluirCliente = async () => {
        if (!clienteSelecionado) {
            showAlert("Atenção", "Nenhum cliente selecionado para excluir.");
            return;
        }

        showAlert(
            'Confirmar Exclusão',
            `Tem certeza que deseja excluir o cliente "${clienteSelecionado.nome}"? Todas as vendas associadas também serão excluídas.`,
            async () => {
                setIsDeleting(true);
                setAlertVisible(false);
                try {
                    await excluirClienteSQLite(clienteSelecionado.id);
                    setClienteSelecionado(null);
                    await carregarClientesComLoading(false);
                } catch (error) {
                    console.error('Falha ao excluir cliente:', error);
                    showAlert('Erro Inesperado', 'Ocorreu um erro ao tentar excluir o cliente.');
                } finally {
                    setIsDeleting(false);
                }
            },
            'Excluir'
        );
    };

    const handleNovoClientePress = async () => {
        if (isPremium) {
            router.push('/(gcliente)/Cadastrocliente');
            return;
        }

        try {
            const totalClientes = await contarClientesSQLite();
            if (totalClientes >= 5) {
                showAlert(
                    "Limite Atingido",
                    "A versão gratuita permite o registo de até 5 clientes. Faça o upgrade para a versão completa para registar clientes ilimitados!",
                    () => {
                        setAlertVisible(false);
                        // router.push('/(gconfig)/Upgrade');
                    },
                    "Fazer Upgrade"
                );
            } else {
                router.push('/(gcliente)/Cadastrocliente');
            }
        } catch (error) {
            showAlert("Erro", "Não foi possível verificar os limites. Tente novamente.");
        }
    };

    const renderItemCliente = ({ item }: { item: Cliente }) => (
        <TouchableOpacity
            style={[styles.cardCliente, clienteSelecionado?.id === item.id && styles.itemSelecionado]}
            onPress={() => clienteSelecionado?.id === item.id ? setClienteSelecionado(null) : setClienteSelecionado(item)}
            disabled={isDeleting}
        >
            <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="account-circle-outline" size={32} color="#E0E0FF" />
            </View>
            <View style={styles.infoContainer}>
                <Text style={styles.nomeCliente}>{item.nome}</Text>
                {item.telefone ? <Text style={styles.detalheCliente}>{item.telefone}</Text> : null}
                {item.email ? <Text style={styles.detalheCliente}>{item.email}</Text> : null}
            </View>
            <MaterialCommunityIcons
                name={clienteSelecionado?.id === item.id ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                size={24}
                color={clienteSelecionado?.id === item.id ? "#4CAF50" : "#A9A9A9"}
            />
        </TouchableOpacity>
    );

    if (!isDbReady || (isLoading && !refreshing)) {
        return (
            <ImageBackground source={require("../../assets/images/fundo.jpg")} style={styles.background} blurRadius={2}>
                <View style={styles.overlay} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.loadingText}>A carregar clientes...</Text>
                </View>
            </ImageBackground>
        );
    }

    return (
        <ImageBackground source={require("../../assets/images/fundo.jpg")} style={styles.background} blurRadius={2}>
            <View style={styles.overlay} />
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.headerContainer}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Gerenciar Clientes</Text>
                </View>

                <FlatList
                    data={clientes}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItemCliente}
                    ListEmptyComponent={
                        <View style={styles.emptyListContainer}>
                            <MaterialCommunityIcons name="account-search-outline" size={60} color="rgba(255,255,255,0.3)" />
                            <Text style={styles.listaVaziaTexto}>Nenhum cliente cadastrado.</Text>
                            <Text style={styles.listaVaziaSubtexto}>Clique em "Novo Cliente" para começar.</Text>
                        </View>
                    }
                    contentContainerStyle={styles.listContentContainer}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />}
                />

                {/* ✨ CORREÇÃO: BOTÕES RESTAURADOS NO RODAPÉ */}
                <View style={[styles.footerAcoes, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
                    <TouchableOpacity
                        style={[styles.botaoAcao, (isDeleting) && styles.disabledButton]}
                        onPress={handleNovoClientePress}
                        disabled={isDeleting}
                    >
                        <MaterialCommunityIcons name="account-plus-outline" size={22} color="#FFFFFF" />
                        <Text style={styles.textoBotaoAcao}>Novo Cliente</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.botaoAcao, (!clienteSelecionado || isDeleting) && styles.disabledButton]}
                        onPress={() => clienteSelecionado && router.push({ pathname: '/(gcliente)/Cadastrocliente', params: { id: clienteSelecionado.id } })}
                        disabled={!clienteSelecionado || isDeleting}
                    >
                        <MaterialCommunityIcons name="pencil-outline" size={22} color="#FFFFFF" />
                        <Text style={styles.textoBotaoAcao}>Editar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.botaoAcao, (!clienteSelecionado || isDeleting) && styles.disabledButton]}
                        onPress={() => clienteSelecionado && router.push({ pathname: '/(gcliente)/Vendascliente', params: { idCliente: clienteSelecionado.id, nome: clienteSelecionado.nome, telefone: clienteSelecionado.telefone } })}
                        disabled={!clienteSelecionado || isDeleting}
                    >
                        <MaterialCommunityIcons name="cash-multiple" size={22} color="#FFFFFF" />
                        <Text style={styles.textoBotaoAcao}>Vendas</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.botaoAcao, styles.deleteButton, (!clienteSelecionado || isDeleting) && styles.disabledButton]}
                        onPress={handleExcluirCliente}
                        disabled={!clienteSelecionado || isDeleting}
                    >
                        {isDeleting && clienteSelecionado ?
                            <ActivityIndicator size="small" color="#FFFFFF" /> :
                            <MaterialCommunityIcons name="delete-outline" size={22} color="#FFFFFF" />
                        }
                        <Text style={styles.textoBotaoAcao}>Excluir</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
            <CustomAlert
                visible={alertVisible}
                title={alertInfo.title}
                message={alertInfo.message}
                onClose={() => setAlertVisible(false)}
                onConfirm={alertInfo.onConfirm}
                confirmText={alertInfo.confirmText}
            />
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: { flex: 1 },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(25, 10, 50, 0.65)' },
    safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, color: '#FFFFFF', fontSize: 16, fontFamily: 'Roboto-Regular' },
    headerContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10 },
    backButton: { padding: 8 },
    title: { fontSize: 26, color: '#FFFFFF', textAlign: 'center', flex: 1, marginRight: 40, fontFamily: 'Roboto-Bold' },
    listContentContainer: { paddingHorizontal: 16, paddingBottom: 100 },
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
    itemSelecionado: {
        backgroundColor: 'rgba(126, 87, 194, 0.5)',
        borderColor: 'rgba(179, 157, 219, 0.8)',
    },
    iconContainer: {
        marginRight: 15,
    },
    infoContainer: {
        flex: 1,
    },
    nomeCliente: {
        fontSize: 18,
        color: '#FFFFFF',
        fontFamily: 'Roboto-Bold',
    },
    detalheCliente: {
        fontSize: 14,
        color: '#E0E0FF',
        marginTop: 2,
        fontFamily: 'Roboto-Regular',
    },
    emptyListContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listaVaziaTexto: {
        textAlign: 'center',
        fontSize: 18,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 15,
        fontFamily: 'Roboto-Bold',
    },
    listaVaziaSubtexto: {
        textAlign: 'center',
        fontSize: 15,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 5,
        fontFamily: 'Roboto-Regular',
    },
    footerAcoes: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 12,
        paddingHorizontal: 10,
        backgroundColor: 'rgba(25, 10, 50, 0.85)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    botaoAcao: {
        alignItems: 'center',
        padding: 5,
    },
    textoBotaoAcao: {
        color: 'white',
        fontSize: 12,
        marginTop: 8,
        fontFamily: 'Roboto-Regular',
    },
    deleteButton: {},
    disabledButton: {
        opacity: 0.4,
    },
});
