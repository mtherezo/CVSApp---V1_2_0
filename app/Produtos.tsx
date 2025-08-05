// Produtos.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ImageBackground, ActivityIndicator, RefreshControl, Platform, SafeAreaView, StatusBar, TextInput, KeyboardAvoidingView, ScrollView} from 'react-native';
import { Produto } from '../src/types';
import { useRouter, useFocusEffect } from 'expo-router';
import { listarProdutosSQLite, cadastrarProdutoSQLite, excluirProdutoSQLite } from '../src/database/sqlite';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

//Interface para as propriedades do Formulário
interface FormularioProdutoProps {
  produtoEditando: Produto | null;
  onSave: (dados: { descricao: string; valor: string; marca: string; }) => void;
  onCancel: () => void;
  isSaving: boolean;
}

const FormularioProduto = ({ produtoEditando, onSave, onCancel, isSaving }: FormularioProdutoProps) => {
    const [descricao, setDescricao] = useState(produtoEditando?.descricao || '');
    const [valor, setValor] = useState(produtoEditando ? produtoEditando.valor.toString().replace('.', ',') : '');
    const [marca, setMarca] = useState(produtoEditando?.marca || '');

    const handleSave = () => {
        if (!descricao.trim()) {
            Alert.alert('Atenção', 'A descrição do produto é obrigatória.');
            return;
        }
        onSave({ descricao, valor, marca });
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.formContainer}
        >
            <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.formTitle}>{produtoEditando ? 'Editar Produto' : 'Novo Produto'}</Text>
                <TextInput style={styles.input} placeholder="Descrição do Produto" value={descricao} onChangeText={setDescricao} placeholderTextColor="#A9A9A9" />
                <TextInput style={styles.input} placeholder="Marca (opcional)" value={marca} onChangeText={setMarca} placeholderTextColor="#A9A9A9" autoCapitalize="words" />
                <TextInput style={styles.input} placeholder="Valor (ex: 25,90)" value={valor} onChangeText={setValor} keyboardType="decimal-pad" placeholderTextColor="#A9A9A9" />
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

//Interface para as propriedades da Lista
interface ListaProdutosViewProps {
    produtos: Produto[];
    onRefresh: () => void;
    refreshing: boolean;
    onEdit: (produto: Produto) => void;
    onDelete: (produto: Produto) => void;
    onAddNew: () => void;
}

const ListaProdutosView = ({ produtos, onRefresh, refreshing, onEdit, onDelete, onAddNew }: ListaProdutosViewProps) => {
    const insets = useSafeAreaInsets();
    const renderItemProduto = ({ item }: { item: Produto }) => (
        <View style={styles.card}>
            <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.descricao}</Text>
                {item.marca && <Text style={styles.cardSubtitle}>{item.marca}</Text>}
                <Text style={styles.cardValue}>{`R$ ${item.valor.toFixed(2)}`}</Text>
            </View>
            <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => onEdit(item)} style={styles.actionButton}>
                    <MaterialCommunityIcons name="pencil-outline" size={24} color="#FFC107" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDelete(item)} style={styles.actionButton}>
                    <MaterialCommunityIcons name="delete-outline" size={24} color="#F44336" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <>
            <FlatList
                data={produtos}
                keyExtractor={(item) => item.id}
                renderItem={renderItemProduto}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="package-variant-closed" size={60} color="rgba(255,255,255,0.3)" />
                        <Text style={styles.emptyText}>Nenhum produto cadastrado.</Text>
                    </View>
                }
                contentContainerStyle={styles.listContentContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />}
            />
            <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 20 }]}>
                <TouchableOpacity style={styles.addButton} onPress={onAddNew}>
                    <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
                    <Text style={styles.addButtonText}>Novo Produto</Text>
                </TouchableOpacity>
            </View>
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
    const router = useRouter();

    const carregarProdutos = async (showLoader = true) => {
        if (showLoader) setIsLoading(true);
        try {
            const dados = await listarProdutosSQLite();
            setProdutos(dados);
        } catch (error) {
            console.error('Falha ao carregar produtos:', error);
            Alert.alert('Erro', 'Não foi possível carregar o catálogo de produtos.');
        } finally {
            if (showLoader) setIsLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await carregarProdutos(false);
        setRefreshing(false);
    }, []);

    useFocusEffect(useCallback(() => { carregarProdutos(); }, []));

    const handleAbrirFormularioNovo = () => {
        setProdutoEditando(null);
        setMostrarFormulario(true);
    };

    const handleAbrirFormularioEditar = (produto: Produto) => {
        setProdutoEditando(produto);
        setMostrarFormulario(true);
    };

    const handleFecharFormulario = () => {
        setMostrarFormulario(false);
        setProdutoEditando(null);
    };

    const handleSalvarProduto = async ({ descricao, valor, marca }: { descricao: string; valor: string; marca: string; }) => {
        const valorNum = parseFloat(valor.replace(',', '.')) || 0;
        if (!descricao.trim()) {
            Alert.alert('Atenção', 'A descrição do produto é obrigatória.');
            return;
        }
        setIsSaving(true);
        try {
            const produtoParaSalvar: Produto = {
                id: produtoEditando?.id || Crypto.randomUUID(),
                descricao: descricao.trim(),
                valor: valorNum,
                marca: marca.trim() || undefined,
            };
            await cadastrarProdutoSQLite(produtoParaSalvar);
            await carregarProdutos(false);
            handleFecharFormulario();
        } catch (error: any) {
            Alert.alert('Erro ao salvar', error.message || 'Não foi possível salvar o produto.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmarExclusao = (produto: Produto) => {
        Alert.alert(
            'Confirmar Exclusão',
            `Tem certeza que deseja excluir o produto "${produto.descricao}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Excluir', style: 'destructive',
                    onPress: async () => {
                        await excluirProdutoSQLite(produto.id);
                        await carregarProdutos(false);
                    }
                }
            ]
        );
    };

    if (isLoading) {
        return (
            <ImageBackground source={require('../assets/images/fundo.jpg')} style={styles.background} blurRadius={2}>
                <View style={styles.overlay} />
                <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#FFFFFF" /></View>
            </ImageBackground>
        );
    }

    return (
        <ImageBackground source={require('../assets/images/fundo.jpg')} style={styles.background} blurRadius={2}>
            <View style={styles.overlay} />
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.headerContainer}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" /></TouchableOpacity>
                    <Text style={styles.title}>Catálogo de Produtos</Text>
                </View>
                
                {mostrarFormulario ? (
                    <FormularioProduto
                        produtoEditando={produtoEditando}
                        onSave={handleSalvarProduto}
                        onCancel={handleFecharFormulario}
                        isSaving={isSaving}
                    />
                ) : (
                    <ListaProdutosView
                        produtos={produtos}
                        onRefresh={onRefresh}
                        refreshing={refreshing}
                        onEdit={handleAbrirFormularioEditar}
                        onDelete={handleConfirmarExclusao}
                        onAddNew={handleAbrirFormularioNovo}
                    />
                )}
            </SafeAreaView>
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
    title: { fontSize: 26, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', flex: 1, marginRight: 40 },
    listContentContainer: { paddingHorizontal: 16, paddingBottom: 120 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: '40%' },
    emptyText: { fontSize: 18, color: 'rgba(255,255,255,0.7)' },
    card: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 12, padding: 15, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
    cardSubtitle: { fontSize: 14, color: '#BDBDBD', marginTop: 4 },
    cardValue: { fontSize: 16, color: '#E0E0FF', marginTop: 4 },
    cardActions: { flexDirection: 'row' },
    actionButton: { padding: 8, marginLeft: 10 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 20, paddingHorizontal: 20, backgroundColor: 'rgba(25, 10, 50, 0.9)', borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)' },
    addButton: { backgroundColor: '#4CAF50', flexDirection: 'row', paddingVertical: 15, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
    addButtonText: { color: 'white', fontSize: 17, fontWeight: 'bold', marginLeft: 10 },
    formContainer: { flex: 1, },
    formTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 20, textAlign: 'center' },
    input: { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: 15, fontSize: 16, color: '#FFFFFF', marginBottom: 15 },
    disabledButton: { opacity: 0.6 },
    formButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    formActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    formButton: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
    cancelButton: { backgroundColor: '#555', marginRight: 10 },
    saveButton: { backgroundColor: '#4CAF50' },
    disabledInput: { backgroundColor: 'rgba(0,0,0,0.15)', color: '#999' },
});