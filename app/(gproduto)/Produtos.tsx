import React, { useState, useCallback, useMemo } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Alert, ImageBackground, ActivityIndicator, RefreshControl, Platform, SafeAreaView, StatusBar, TextInput, KeyboardAvoidingView, ScrollView, Image } from 'react-native';
import { StyledText as Text } from '../../src/components/StyledText';
import { Produto } from '../../src/types';
import { useRouter, useFocusEffect } from 'expo-router';
import { listarProdutosSQLite, cadastrarProdutoSQLite, excluirProdutoSQLite } from '../../src/database/sqlite';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { commonStyles } from '../../src/theme/commonStyles';
import CustomAlert from '../../src/components/CustomAlert'; // Importa o CustomAlert

// Define os tipos de filtro de Estoque
type FiltroEstoqueStatus = 'todos' | 'emEstoque' | 'semEstoque';

// --- Interfaces para as propriedades dos componentes ---
interface FormularioProdutoProps {
  produtoEditando: Produto | null;
  onSave: (dados: Omit<Produto, 'id'>) => void;
  onCancel: () => void;
  isSaving: boolean;
}

interface ListaProdutosViewProps {
    produtos: Produto[];
    onRefresh: () => void;
    refreshing: boolean;
    onEdit: (produto: Produto) => void;
    onDelete: (produto: Produto) => void;
    onAddNew: () => void;
}

// --- Componente para o Formulário de Produto ---
const FormularioProduto = ({ produtoEditando, onSave, onCancel, isSaving }: FormularioProdutoProps) => {
    const [descricao, setDescricao] = useState(produtoEditando?.descricao || '');
    const [valor, setValor] = useState(produtoEditando ? produtoEditando.valor.toString().replace('.', ',') : '');
    const [marca, setMarca] = useState(produtoEditando?.marca || '');
    const [codigo, setCodigo] = useState(produtoEditando?.codigo || '');
    const [quantidadeEstoque, setQuantidadeEstoque] = useState(produtoEditando?.quantidadeEstoque?.toString() || '0');
    const [fotoUri, setFotoUri] = useState<string | null | undefined>(produtoEditando?.fotoUri);

    const handleEscolherFoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permissão Necessária', 'É preciso permitir o acesso à galeria para escolher uma foto.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setFotoUri(result.assets[0].uri);
        }
    };

    const handleSave = () => {
        if (!descricao.trim()) {
            Alert.alert('Atenção', 'A descrição do produto é obrigatória.');
            return;
        }
        onSave({ 
            descricao: descricao.trim(), 
            valor: parseFloat(valor.replace(',', '.')) || 0, 
            marca: marca.trim(), 
            codigo: codigo.trim(),
            quantidadeEstoque: parseInt(quantidadeEstoque, 10) || 0,
            fotoUri: fotoUri || undefined
        });
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.formContainer}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formScrollContainer}>
                <Text style={styles.formTitle}>{produtoEditando ? 'Editar Produto' : 'Novo Produto'}</Text>
                
                <TouchableOpacity style={styles.imagePicker} onPress={handleEscolherFoto}>
                    {fotoUri ? (
                        <Image source={{ uri: fotoUri }} style={styles.productImage} />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <MaterialCommunityIcons name="camera-plus-outline" size={40} color="#A9A9A9" />
                            <Text style={styles.imagePlaceholderText}>Adicionar Foto</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TextInput style={commonStyles.input} placeholder="Descrição do Produto*" value={descricao} onChangeText={setDescricao} placeholderTextColor="#A9A9A9" />
                <TextInput style={commonStyles.input} placeholder="Marca" value={marca} onChangeText={setMarca} placeholderTextColor="#A9A9A9" autoCapitalize="words" />
                <View style={styles.inputRow}>
                    <TextInput style={[commonStyles.input, {flex: 1}]} placeholder="Código" value={codigo} onChangeText={setCodigo} placeholderTextColor="#A9A9A9" />
                    <TextInput style={[commonStyles.input, {flex: 1}]} placeholder="Estoque" value={quantidadeEstoque} onChangeText={setQuantidadeEstoque} keyboardType="number-pad" placeholderTextColor="#A9A9A9" />
                </View>
                <TextInput style={commonStyles.input} placeholder="Valor (R$)" value={valor} onChangeText={setValor} keyboardType="decimal-pad" placeholderTextColor="#A9A9A9" />
                
                <View style={styles.formActions}>
                    <TouchableOpacity style={[styles.formButton, styles.cancelButton]} onPress={onCancel} disabled={isSaving}>
                        <Text style={styles.formButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.formButton, styles.saveButton, isSaving && styles.disabledButton]} onPress={handleSave} disabled={isSaving}>
                        {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.formButtonText}>Salvar</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

// --- Componente para a Lista de Produtos ---
const ListaProdutosView = ({ produtos, onRefresh, refreshing, onEdit, onDelete, onAddNew }: ListaProdutosViewProps) => {
    const insets = useSafeAreaInsets();
    const renderItemProduto = ({ item }: { item: Produto }) => (
        <View style={styles.card}>
            {item.fotoUri ? (
                <Image source={{ uri: item.fotoUri }} style={styles.cardImage} />
            ) : (
                <View style={styles.cardImagePlaceholder}>
                    <MaterialCommunityIcons name="image-outline" size={30} color="#A9A9A9" />
                </View>
            )}
            <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.descricao}</Text>
                {item.marca && <Text style={styles.cardSubtitle}>{item.marca}</Text>}
                <View style={styles.cardDetailsRow}>
                    <Text style={styles.cardValue}>{`R$ ${item.valor.toFixed(2)}`}</Text>
                    <Text style={styles.cardStock}>Estoque: {item.quantidadeEstoque || 0}</Text>
                </View>
            </View>
            <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => onEdit(item)} style={styles.actionButton}><MaterialCommunityIcons name="pencil-outline" size={24} color="#FFC107" /></TouchableOpacity>
                <TouchableOpacity onPress={() => onDelete(item)} style={styles.actionButton}><MaterialCommunityIcons name="delete-outline" size={24} color="#F44336" /></TouchableOpacity>
            </View>
        </View>
    );

    return (
        <>
            <FlatList data={produtos} keyExtractor={(item) => item.id} renderItem={renderItemProduto} ListEmptyComponent={<View style={styles.emptyContainer}><MaterialCommunityIcons name="package-variant-closed" size={60} color="rgba(255,255,255,0.3)" /><Text style={styles.emptyText}>Nenhum produto cadastrado.</Text></View>} contentContainerStyle={styles.listContentContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />} />
            <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 20 }]}><TouchableOpacity style={styles.addButton} onPress={onAddNew}><MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" /><Text style={styles.addButtonText}>Novo Produto</Text></TouchableOpacity></View>
        </>
    );
};


export default function ProdutosScreen() {
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [termoBusca, setTermoBusca] = useState('');
    const [filtroEstoque, setFiltroEstoque] = useState<FiltroEstoqueStatus>('todos');
    const router = useRouter();

    //  Estados para o CustomAlert
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertInfo, setAlertInfo] = useState({ title: '', message: '', onConfirm: undefined as (() => void) | undefined, confirmText: 'Ok' });

    const showAlert = (title: string, message: string, onConfirm?: () => void, confirmText = 'Ok') => {
        setAlertInfo({ title, message, onConfirm, confirmText });
        setAlertVisible(true);
    };

    const carregarProdutos = async (showLoader = true) => {
        if (showLoader) setIsLoading(true);
        try {
            const dados = await listarProdutosSQLite();
            setProdutos(dados);
        } catch (error) { 
            console.error('Falha ao carregar produtos:', error); 
            showAlert('Erro', 'Não foi possível carregar o catálogo de produtos.');
        } finally {
            if (showLoader) setIsLoading(false);
        }
    };

    const onRefresh = useCallback(async () => { setRefreshing(true); await carregarProdutos(false); setRefreshing(false); }, []);
    useFocusEffect(useCallback(() => { carregarProdutos(); }, []));

    const handleAbrirFormularioNovo = () => { setProdutoEditando(null); setMostrarFormulario(true); };
    const handleAbrirFormularioEditar = (produto: Produto) => { setProdutoEditando(produto); setMostrarFormulario(true); };
    const handleFecharFormulario = () => { setMostrarFormulario(false); setProdutoEditando(null); };

    const handleSalvarProduto = async (dadosProduto: Omit<Produto, 'id'>) => {
        setIsSaving(true);
        try {
            const produtoParaSalvar: Produto = {
                id: produtoEditando?.id || Crypto.randomUUID(),
                ...dadosProduto,
            };
            await cadastrarProdutoSQLite(produtoParaSalvar);
            await carregarProdutos(false);
            handleFecharFormulario();
        } catch (error: any) {
            if (error instanceof Error && error.message.includes('UNIQUE constraint failed: produtos.descricao')) {
                showAlert('Erro', 'Já existe um produto com esta descrição.');
            } else {
                showAlert('Erro ao salvar', error.message || 'Não foi possível salvar o produto.');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmarExclusao = (produto: Produto) => {
        showAlert(
            'Confirmar Exclusão',
            `Tem certeza que deseja excluir o produto "${produto.descricao}"?`,
            async () => {
                await excluirProdutoSQLite(produto.id);
                await carregarProdutos(false);
                setAlertVisible(false);
            },
            'Excluir'
        );
    };

    const produtosFiltrados = useMemo(() => {
        return produtos
            .filter(produto => {
                if (filtroEstoque === 'emEstoque') return (produto.quantidadeEstoque || 0) > 0;
                if (filtroEstoque === 'semEstoque') return (produto.quantidadeEstoque || 0) === 0;
                return true;
            })
            .filter(produto => {
                const termo = termoBusca.toLowerCase();
                if (!termo) return true;
                return (
                    produto.descricao.toLowerCase().includes(termo) ||
                    (produto.marca || '').toLowerCase().includes(termo) ||
                    (produto.codigo || '').toLowerCase().includes(termo)
                );
            });
    }, [produtos, termoBusca, filtroEstoque]);

    if (isLoading) {
        return (
            <ImageBackground source={require('../../assets/images/fundo.jpg')} style={styles.background} blurRadius={2}>
                <View style={styles.overlay} />
                <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#FFFFFF" /></View>
            </ImageBackground>
        );
    }

    return (
        <ImageBackground source={require('../../assets/images/fundo.jpg')} style={styles.background} blurRadius={2}>
            <View style={styles.overlay} />
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.headerContainer}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" /></TouchableOpacity>
                    <Text style={styles.title}>Catálogo de Produtos</Text>
                </View>
                
                {mostrarFormulario ? (
                    <FormularioProduto produtoEditando={produtoEditando} onSave={handleSalvarProduto} onCancel={handleFecharFormulario} isSaving={isSaving} />
                ) : (
                    <>
                        <View style={styles.controlesContainer}>
                            <View style={styles.buscaContainer}>
                                <MaterialCommunityIcons name="magnify" size={22} color="#A9A9A9" style={styles.buscaIcon} />
                                <TextInput
                                    style={styles.buscaInput}
                                    placeholder="Buscar por nome, marca ou código..."
                                    value={termoBusca}
                                    onChangeText={setTermoBusca}
                                    placeholderTextColor="#A9A9A9"
                                />
                            </View>
                            <View style={styles.filtroContainer}>
                                <TouchableOpacity 
                                    style={[styles.filtroBotao, filtroEstoque === 'todos' && styles.filtroBotaoAtivo]}
                                    onPress={() => setFiltroEstoque('todos')}
                                ><Text style={styles.filtroTexto}>Todos</Text></TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.filtroBotao, filtroEstoque === 'emEstoque' && styles.filtroBotaoAtivo]}
                                    onPress={() => setFiltroEstoque('emEstoque')}
                                ><Text style={styles.filtroTexto}>Em Estoque</Text></TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.filtroBotao, filtroEstoque === 'semEstoque' && styles.filtroBotaoAtivo]}
                                    onPress={() => setFiltroEstoque('semEstoque')}
                                ><Text style={styles.filtroTexto}>Sem Estoque</Text></TouchableOpacity>
                            </View>
                        </View>
                        <ListaProdutosView
                            produtos={produtosFiltrados}
                            onRefresh={onRefresh}
                            refreshing={refreshing}
                            onEdit={handleAbrirFormularioEditar}
                            onDelete={handleConfirmarExclusao}
                            onAddNew={handleAbrirFormularioNovo}
                        />
                    </>
                )}
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
    safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, },
    backButton: { padding: 8 },
    title: { fontSize: 26, fontFamily: 'Roboto-Bold', color: '#FFFFFF', textAlign: 'center', flex: 1, marginRight: 40 },
    controlesContainer: {
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    buscaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.25)',
        borderRadius: 12,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    buscaIcon: {
        marginRight: 10,
    },
    buscaInput: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 16,
        color: '#FFFFFF',
        fontFamily: 'Roboto-Regular',
    },
    filtroContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginVertical: 15,
    },
    filtroBotao: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    filtroBotaoAtivo: {
        backgroundColor: '#4186a7ff',
        borderColor: '#81D4FA',
    },
    filtroTexto: {
        color: '#FFFFFF',
        fontSize: 13,
        fontFamily: 'Roboto-Regular',
    },
    listContentContainer: { paddingHorizontal: 16, paddingBottom: 120 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: '20%' },
    emptyText: { fontSize: 18, fontFamily: 'Roboto-Bold', color: 'rgba(255,255,255,0.7)' },
    card: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 12, padding: 15, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
    cardImage: { width: 60, height: 60, borderRadius: 8, marginRight: 15, backgroundColor: 'rgba(0,0,0,0.2)' },
    cardImagePlaceholder: { width: 60, height: 60, borderRadius: 8, marginRight: 15, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' },
    cardInfo: { flex: 1, justifyContent: 'center' },
    cardTitle: { fontSize: 16,fontFamily: 'Roboto-Bold', color: '#FFFFFF' },
    cardSubtitle: { fontSize: 14,fontFamily: 'Roboto-Regular', color: '#BDBDBD', marginTop: 2 },
    cardDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    cardValue: { fontSize: 16, fontFamily: 'Roboto-Bold', color: '#E0E0FF', },
    cardStock: { fontSize: 14, fontFamily: 'Roboto-Bold', color: '#FFCC80', },
    cardActions: { flexDirection: 'column', justifyContent: 'space-around', marginLeft: 10 },
    actionButton: { padding: 8 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 20, paddingHorizontal: 20, backgroundColor: 'rgba(25, 10, 50, 0.9)', borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)' },
    addButton: { backgroundColor: '#4CAF50', flexDirection: 'row', paddingVertical: 15, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
    addButtonText: { color: 'white', fontSize: 17, fontFamily: 'Roboto-Bold', marginLeft: 10 },
    formContainer: { flex: 1, },
    formScrollContainer: { padding: 20 },
    formTitle: { fontSize: 22, fontFamily: 'Roboto-Bold', color: '#FFFFFF', marginBottom: 20, textAlign: 'center' },
    imagePicker: { width: 120, height: 120, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.25)', alignSelf: 'center', marginBottom: 20, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    productImage: { width: '100%', height: '100%' },
    imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
    imagePlaceholderText: { color: '#A9A9A9', marginTop: 5 },
    inputRow: { flexDirection: 'row', gap: 10 },
    formActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    formButton: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
    cancelButton: { backgroundColor: '#555', marginRight: 10 },
    saveButton: { backgroundColor: '#4CAF50' },
    disabledButton: { opacity: 0.6 },
    formButtonText: { color: '#FFFFFF', fontFamily: 'Roboto-Bold',  fontSize: 16 },
});