// app/Cadastrovenda.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ImageBackground,
    Platform, KeyboardAvoidingView, ActivityIndicator, ScrollView, SafeAreaView, StatusBar, FlatList
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { cadastrarVenda, editarVenda, listarVendaPorId } from '../src/storage/vendasStorage';
import { listarProdutos } from '../src/storage/produtosStorage';
import { Venda, ItemVenda, Produto } from '../src/types';
import * as Crypto from 'expo-crypto';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Componente Memoizado para itens da venda (sem alterações)
const MemoizedItemAdicionado = React.memo(({ item, onRemove }: { item: Omit<ItemVenda, 'idVenda'>, onRemove: (id: string) => void }) => {
    const subtotalItem = item.valor * item.quantidade;
    return (
        <View style={styles.itemAdicionado}>
            <View style={styles.itemInfo}>
                <Text style={styles.itemDescricao} numberOfLines={1} ellipsizeMode="tail">{`${item.quantidade}x ${item.descricao}`}</Text>
                <Text style={styles.itemValorTexto}>{`R$ ${subtotalItem.toFixed(2)}`}</Text>
            </View>
            <TouchableOpacity onPress={() => onRemove(item.id)} style={styles.botaoRemover}>
                <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FF6B6B" />
            </TouchableOpacity>
        </View>
    );
});

// ✨ ALTERADO: O componente do catálogo agora tem lógica de busca interna
const CatalogoProdutosView = ({ produtos, onSelect, onClose }: { produtos: Produto[], onSelect: (produto: Produto) => void, onClose: () => void }) => {
    // Estado para o termo da busca e para a lista filtrada
    const [termoBusca, setTermoBusca] = useState('');
    const [produtosFiltrados, setProdutosFiltrados] = useState(produtos);

    // Efeito que filtra os produtos sempre que o termo de busca muda
    useEffect(() => {
        if (termoBusca.trim() === '') {
            setProdutosFiltrados(produtos); // Se a busca estiver vazia, mostra todos
        } else {
            const filtrados = produtos.filter(produto =>
                produto.descricao.toLowerCase().startsWith(termoBusca.toLowerCase())
            );
            setProdutosFiltrados(filtrados); // Mostra os produtos filtrados
        }
    }, [termoBusca, produtos]);

    return (
        <View style={styles.catalogoContainer}>
            <Text style={styles.catalogoTitle}>Selecione um Produto</Text>
            
            {/* ✨ NOVO: Campo de busca adicionado */}
            <View style={styles.buscaContainer}>
                <MaterialCommunityIcons name="magnify" size={22} color="#A9A9A9" style={styles.buscaIcon} />
                <TextInput
                    style={styles.buscaInput}
                    placeholder="Buscar produto por nome..."
                    placeholderTextColor="#A9A9A9"
                    value={termoBusca}
                    onChangeText={setTermoBusca}
                />
            </View>

            <FlatList
                data={produtosFiltrados} // ✨ ALTERADO: Usa a lista filtrada
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.productListItem} onPress={() => onSelect(item)}>
                        <Text style={styles.productListItemDesc}>{item.descricao}</Text>
                        <Text style={styles.productListItemValue}>{`R$ ${item.valor.toFixed(2)}`}</Text>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <Text style={styles.emptyListText}>
                        {termoBusca ? 'Nenhum produto encontrado.' : 'Nenhum produto no catálogo.'}
                    </Text>
                }
                style={{ maxHeight: 250 }}
                keyboardShouldPersistTaps="handled"
            />
            <TouchableOpacity style={[styles.catalogoButton, styles.cancelButton]} onPress={onClose}>
                <Text style={styles.catalogoButtonText}>Fechar Catálogo</Text>
            </TouchableOpacity>
        </View>
    );
};


export default function CadastroVendaScreen() {
    const router = useRouter();
    const { idCliente, nome: clienteNome, telefone: clienteTelefone, idVenda } = useLocalSearchParams<{ idCliente?: string; nome?: string; telefone?: string; idVenda?: string }>();
    const isEditing = !!idVenda;

    const [catalogoProdutos, setCatalogoProdutos] = useState<Produto[]>([]);
    const [catalogoVisivel, setCatalogoVisivel] = useState(false);

    const [itens, setItens] = useState<Omit<ItemVenda, 'idVenda'>[]>([]);
    const [itemDescricao, setItemDescricao] = useState('');
    const [itemValor, setItemValor] = useState('');
    const [itemQuantidade, setItemQuantidade] = useState('1');
    const [desconto, setDesconto] = useState('');
    const [tipoPagamento, setTipoPagamento] = useState<'À Vista' | 'Parcelado'>('À Vista');
    const [quantidadeParcelas, setQuantidadeParcelas] = useState('2');
    const [dataVenda, setDataVenda] = useState(new Date());
    const [showDatePickerVenda, setShowDatePickerVenda] = useState(false);
    const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState(new Date());
    const [mostrarDataPickerParcela, setMostrarDataPickerParcela] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [vendaOriginal, setVendaOriginal] = useState<Venda | null>(null);

    useEffect(() => {
        const carregarDadosIniciais = async () => {
            try {
                const produtosDoCatalogo = await listarProdutos();
                setCatalogoProdutos(produtosDoCatalogo);

                if (isEditing && idVenda) {
                    const vendaExistente = await listarVendaPorId(idVenda);
                    if (vendaExistente) {
                        setVendaOriginal(vendaExistente);
                        setItens(vendaExistente.itens || []);
                        setDesconto(vendaExistente.desconto?.toString().replace('.', ',') || '');
                        setTipoPagamento(vendaExistente.tipoPagamento);
                        setDataVenda(new Date(vendaExistente.dataVenda));
                        if (vendaExistente.tipoPagamento === 'Parcelado') {
                            setQuantidadeParcelas(vendaExistente.parcelasTotais?.toString() || '2');
                            setDataPrimeiraParcela(new Date(vendaExistente.dataPrimeiraParcela || Date.now()));
                        }
                    } else {
                        Alert.alert("Erro", "Venda não encontrada para edição.");
                        router.back();
                    }
                }
            } catch (error) {
                Alert.alert("Erro", "Não foi possível carregar os dados necessários.");
            } finally {
                setIsLoadingData(false);
            }
        };
        carregarDadosIniciais();
    }, [idVenda, isEditing]);

    const subtotal = itens.reduce((total, item) => total + (item.valor * item.quantidade), 0);
    const valorDesconto = parseFloat(desconto.replace(',', '.')) || 0;
    const totalFinal = Math.max(0, subtotal - valorDesconto);

    const handleSelecionarProduto = (produto: Produto) => {
        setItemDescricao(produto.descricao);
        setItemValor(produto.valor.toString().replace('.', ','));
        setCatalogoVisivel(false);
    };

    const handleAdicionarItem = () => {
        const valorNum = parseFloat(itemValor.replace(',', '.'));
        const quantidadeNum = parseInt(itemQuantidade, 10);
        if (!itemDescricao.trim() || isNaN(valorNum) || valorNum <= 0 || isNaN(quantidadeNum) || quantidadeNum <= 0) {
            Alert.alert("Atenção", "Preencha a descrição, quantidade e um valor válido para o produto.");
            return;
        }
        const novoItem: Omit<ItemVenda, 'idVenda'> = {
            id: Crypto.randomUUID(),
            descricao: itemDescricao.trim(),
            quantidade: quantidadeNum,
            valor: valorNum,
        };
        setItens(prevItens => [...prevItens, novoItem]);
        setItemDescricao('');
        setItemValor('');
        setItemQuantidade('1');
    };

    const handleRemoverItem = useCallback((id: string) => {
        setItens(prevItens => prevItens.filter(item => item.id !== id));
    }, []);

    const handleSalvarVenda = async () => {
        if (!idCliente) {
            Alert.alert("Erro Crítico", "A referência do cliente foi perdida.");
            return;
        }
        if (itens.length === 0) {
            Alert.alert("Atenção", "Adicione pelo menos um produto à venda.");
            return;
        }
        if (valorDesconto > subtotal) {
            Alert.alert("Erro", "O desconto não pode ser maior que o subtotal da venda.");
            return;
        }
        const quantidadeParcelasNum = parseInt(quantidadeParcelas, 10);
        if (tipoPagamento === 'Parcelado' && (isNaN(quantidadeParcelasNum) || quantidadeParcelasNum <= 1)) {
            Alert.alert('Atenção', 'Para pagamento parcelado, a quantidade de parcelas deve ser 2 ou mais.');
            return;
        }
        
        setIsSaving(true);
        let sucesso = false;
        try {
            if (isEditing && vendaOriginal) {
                const vendaEditada: Venda = {
                    ...vendaOriginal,
                    itens: itens as ItemVenda[],
                    subtotal: subtotal,
                    valorTotal: totalFinal,
                    desconto: valorDesconto > 0 ? valorDesconto : undefined,
                    tipoPagamento: tipoPagamento,
                    dataVenda: dataVenda.toISOString(),
                    parcelasTotais: tipoPagamento === 'Parcelado' ? quantidadeParcelasNum : undefined,
                    dataPrimeiraParcela: tipoPagamento === 'Parcelado' ? dataPrimeiraParcela.toISOString() : undefined,
                };
                sucesso = await editarVenda(vendaEditada);
            } else {
                const dadosNovaVenda: Omit<Venda, 'id'> = {
                    idCliente: idCliente!, clienteNome: clienteNome!, clienteTelefone: clienteTelefone || '',
                    itens: itens as ItemVenda[], subtotal: subtotal, valorTotal: totalFinal,
                    dataVenda: dataVenda.toISOString(), tipoPagamento,
                    ...(valorDesconto > 0 && { desconto: valorDesconto }),
                    ...(tipoPagamento === 'Parcelado' && {
                        parcelasTotais: quantidadeParcelasNum, parcelasPagas: 0,
                        dataPrimeiraParcela: dataPrimeiraParcela.toISOString(),
                    }),
                };
                const vendaCadastrada = await cadastrarVenda(dadosNovaVenda);
                sucesso = !!vendaCadastrada;
            }

            if (sucesso) {
                Alert.alert('Sucesso', `Venda ${isEditing ? 'atualizada' : 'cadastrada'} com sucesso!`);
                router.back();
            } else {
                Alert.alert('Erro', `Não foi possível ${isEditing ? 'atualizar' : 'cadastrar'} a venda.`);
            }
        } catch (error) {
            console.error(`Falha ao ${isEditing ? 'editar' : 'cadastrar'} venda (catch na tela):`, error);
            Alert.alert('Erro Inesperado', `Ocorreu um erro ao tentar ${isEditing ? 'editar' : 'cadastrar'} a venda.`);
        } finally {
            setIsSaving(false);
        }
    };

    const onChangeDataVenda = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowDatePickerVenda(Platform.OS === 'ios');
        if (selectedDate) {
            setDataVenda(selectedDate);
        }
    };
    
    const onChangeDataParcela = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setMostrarDataPickerParcela(Platform.OS === 'ios');
        if (selectedDate) {
            setDataPrimeiraParcela(selectedDate);
        }
    };

    if (isLoadingData) {
        return (
            <ImageBackground source={require("../assets/images/fundo.jpg")} style={styles.background} blurRadius={2}>
                <View style={styles.overlay} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.loadingText}>A carregar dados...</Text>
                </View>
            </ImageBackground>
        );
    }

    return (
        <ImageBackground source={require("../assets/images/fundo.jpg")} style={styles.background} blurRadius={2}>
            <View style={styles.overlay} />
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingContainer}>
                    <FlatList
                        data={[]}
                        keyExtractor={() => 'main-list'}
                        renderItem={null}
                        contentContainerStyle={styles.scrollContainer}
                        keyboardShouldPersistTaps="handled"
                        ListHeaderComponent={
                            <>
                                <View style={styles.headerContainer}>
                                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" /></TouchableOpacity>
                                    <Text style={styles.title}>{isEditing ? 'Editar Venda' : 'Nova Venda'}</Text>
                                </View>
                                <Text style={styles.subtitle}>{`para ${clienteNome}`}</Text>
                                
                                <View style={styles.sectionContainer}>
                                    <Text style={styles.sectionTitle}>1. Adicionar Itens</Text>
                                    
                                    {catalogoVisivel ? (
                                        <CatalogoProdutosView
                                            produtos={catalogoProdutos}
                                            onSelect={handleSelecionarProduto}
                                            onClose={() => setCatalogoVisivel(false)}
                                        />
                                    ) : (
                                        <>
                                            <TouchableOpacity style={styles.selectProductButton} onPress={() => setCatalogoVisivel(true)}>
                                                <MaterialCommunityIcons name="tag-search-outline" size={22} color="#FFFFFF" />
                                                <Text style={styles.selectProductButtonText}>Selecionar Produto do Catálogo</Text>
                                            </TouchableOpacity>
                                            <Text style={styles.orText}>- ou adicione um item avulso abaixo -</Text>

                                            <View style={styles.inputContainer}>
                                                <MaterialCommunityIcons name="tag-outline" size={22} color="#A9A9A9" style={styles.inputIcon} />
                                                <TextInput placeholder="Descrição do Produto Avulso" value={itemDescricao} onChangeText={setItemDescricao} placeholderTextColor="#A9A9A9" style={styles.input} />
                                            </View>
                                            <View style={styles.inputRow}>
                                                <View style={[styles.inputContainer, {flex:1}]}><MaterialCommunityIcons name="counter" size={22} color="#A9A9A9" style={styles.inputIcon} /><TextInput placeholder="Qtde." value={itemQuantidade} onChangeText={setItemQuantidade} keyboardType="number-pad" placeholderTextColor="#A9A9A9" style={styles.input} /></View>
                                                <View style={[styles.inputContainer, {flex:2}]}><MaterialCommunityIcons name="cash" size={22} color="#A9A9A9" style={styles.inputIcon} /><TextInput placeholder="Valor (un.)" value={itemValor} onChangeText={setItemValor} keyboardType="decimal-pad" placeholderTextColor="#A9A9A9" style={styles.input} /></View>
                                            </View>
                                        </>
                                    )}
                                    
                                    <TouchableOpacity style={[styles.actionButton, styles.additemButton]} onPress={handleAdicionarItem} disabled={catalogoVisivel}>
                                        <MaterialCommunityIcons name="plus-circle-outline" size={22} color="#FFFFFF" />
                                        <Text style={styles.actionButtonText}>Adicionar Item</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.sectionContainer}>
                                    <Text style={styles.sectionTitle}>2. Resumo e Pagamento</Text>
                                    
                                    <View style={styles.dateSelectorContainer}>
                                        <Text style={styles.dateSelectorLabel}>Data da Venda:</Text>
                                        <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePickerVenda(true)}>
                                            <MaterialCommunityIcons name="calendar" size={22} color="#A9A9A9" />
                                            <Text style={styles.datePickerText}>{dataVenda.toLocaleDateString('pt-BR')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                    {showDatePickerVenda && (<DateTimePicker value={dataVenda} mode="date" display="default" onChange={onChangeDataVenda} />)}

                                    {itens.length === 0 ? (<Text style={styles.emptyListText}>Nenhum item adicionado ainda.</Text>) : (<>
                                        {itens.map(item => (<MemoizedItemAdicionado key={item.id} item={item} onRemove={handleRemoverItem} />))}
                                        <View style={styles.resumoContainer}>
                                            <View style={styles.resumoRow}><Text style={styles.textoResumo}>Subtotal:</Text><Text style={styles.textoResumo}>{`R$ ${subtotal.toFixed(2)}`}</Text></View>
                                            <View style={[styles.resumoRow, styles.descontoInputContainer]}><Text style={styles.textoResumo}>Desconto:</Text><View style={styles.inputDescontoWrapper}><Text style={styles.inputDescontoPrefix}>R$</Text><TextInput placeholder="0,00" placeholderTextColor="#A9A9A9" value={desconto} onChangeText={setDesconto} keyboardType="decimal-pad" style={styles.inputDesconto} /></View></View>
                                            <View style={[styles.resumoRow, styles.totalRow]}><Text style={styles.textoTotalFinal}>Total:</Text><Text style={styles.textoTotalFinal}>{`R$ ${totalFinal.toFixed(2)}`}</Text></View>
                                        </View>
                                        <View style={styles.pagamentoSectionContainer}>
                                            <Text style={styles.subSectionTitle}>Forma de Pagamento</Text>
                                            <View style={styles.pagamentoContainer}><TouchableOpacity style={[styles.pagamentoBotao, tipoPagamento === 'À Vista' && styles.pagamentoSelecionado]} onPress={() => setTipoPagamento('À Vista')}><MaterialCommunityIcons name="cash" size={24} color={tipoPagamento === 'À Vista' ? "#FFF" : "#A9A9A9"} /><Text style={styles.textoBotaoPagamento}>À Vista</Text></TouchableOpacity><TouchableOpacity style={[styles.pagamentoBotao, tipoPagamento === 'Parcelado' && styles.pagamentoSelecionado]} onPress={() => setTipoPagamento('Parcelado')}><MaterialCommunityIcons name="credit-card-multiple-outline" size={24} color={tipoPagamento === 'Parcelado' ? "#FFF" : "#A9A9A9"} /><Text style={styles.textoBotaoPagamento}>Parcelado</Text></TouchableOpacity></View>
                                            {tipoPagamento === 'Parcelado' && (<View style={styles.parceladoContainer}><View style={[styles.inputContainer, {flex:1}]}><MaterialCommunityIcons name="format-list-numbered" size={22} color="#A9A9A9" style={styles.inputIcon} /><TextInput placeholder="Nº Parc." value={quantidadeParcelas} onChangeText={setQuantidadeParcelas} keyboardType="number-pad" style={styles.input} placeholderTextColor="#A9A9A9" /></View><TouchableOpacity style={[styles.inputContainer, {flex: 2, alignItems: 'center'}]} onPress={() => setMostrarDataPickerParcela(true)}><MaterialCommunityIcons name="calendar-range" size={22} color="#A9A9A9" style={styles.inputIcon} /><Text style={styles.dateInputText}>{dataPrimeiraParcela.toLocaleDateString('pt-BR')}</Text></TouchableOpacity>{mostrarDataPickerParcela && (<DateTimePicker value={dataPrimeiraParcela} mode="date" display="default" onChange={onChangeDataParcela} />)}</View>)}
                                        </View>
                                    </>
                                    )}
                                </View>

                                <View style={styles.actionButtonsContainer}>
                                    {isSaving ? ( <ActivityIndicator size="large" color="#FFFFFF" style={styles.loader} /> ) : (
                                        <TouchableOpacity style={[styles.actionButton, styles.saveButton, itens.length === 0 && styles.disabledButton]} onPress={handleSalvarVenda} disabled={itens.length === 0 || isSaving}>
                                            <MaterialCommunityIcons name="content-save-check-outline" size={22} color="#FFFFFF" />
                                            <Text style={styles.actionButtonText}>{isEditing ? 'Atualizar Venda' : 'Salvar Venda'}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </>
                        }
                    />
                </KeyboardAvoidingView>
            </SafeAreaView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: { flex: 1 },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(25, 10, 50, 0.75)' },
    safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
    keyboardAvoidingContainer: { flex: 1 },
    scrollContainer: { flexGrow: 1, padding: 20, paddingBottom: 50 },
    headerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
    backButton: { padding: 8 },
    title: { fontSize: 26, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', flex: 1, marginRight: 40 },
    subtitle: { fontSize: 18, fontWeight: '300', color: '#E0E0FF', textAlign: 'center', marginBottom: 25 },
    sectionContainer: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 16, padding: 20, marginBottom: 15 },
    sectionTitle: { fontSize: 20, fontWeight: '600', color: '#FFFFFF', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.3)', paddingBottom: 10 },
    subSectionTitle: { fontSize: 18, fontWeight: '500', color: '#FFFFFF', marginBottom: 15, textAlign:'center' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.25)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
    inputIcon: { paddingLeft: 15, paddingRight: 10 },
    input: { flex: 1, paddingVertical: 14, paddingRight: 15, fontSize: 16, color: '#FFFFFF' },
    inputRow: { flexDirection: 'row', gap: 10, marginTop: 15},
    additemButton: { backgroundColor: '#3f51b5', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 25, marginTop: 20 },
    actionButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
    itemAdicionado: { flexDirection: 'row', alignItems: 'center', padding: 8, paddingLeft: 12, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8, marginBottom: 8 },
    itemInfo: { flex: 1, gap: 4 },
    itemDescricao: { fontSize: 16, color: '#FFFFFF', fontWeight: '500' },
    itemValorTexto: { fontSize: 14, color: '#E0E0E0' },
    botaoRemover: { padding: 8, marginLeft: 10 },
    emptyListText: { color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', textAlign: 'center', padding: 20 },
    resumoContainer: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 15, marginTop: 15 },
    resumoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    descontoInputContainer: { alignItems: 'center' },
    inputDescontoWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.25)', borderRadius: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    inputDescontoPrefix: { color: '#A9A9A9', fontSize: 16, marginRight: 5 },
    inputDesconto: { paddingVertical: 8, fontSize: 16, color: '#FFFFFF', minWidth: 80, textAlign: 'right' },
    textoResumo: { color: '#E0E0FF', fontSize: 16 },
    totalRow: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 10, marginTop: 8 },
    textoTotalFinal: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold' },
    pagamentoSectionContainer: { marginTop: 20 },
    pagamentoContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15, gap: 10 },
    pagamentoBotao: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(0, 0, 0, 0.25)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', gap: 8 },
    pagamentoSelecionado: { backgroundColor: 'rgba(98, 0, 238, 0.7)', borderColor: '#FFFFFF' },
    textoBotaoPagamento: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
    parceladoContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
    dateInputText: { color: '#FFFFFF', fontSize: 16, flex: 1 },
    actionButtonsContainer: { marginTop: 15 },
    actionButton: { flexDirection: 'row', paddingVertical: 15, borderRadius: 25, alignItems: 'center', justifyContent: 'center', elevation: 3 },
    saveButton: { backgroundColor: '#4CAF50' },
    loader: { marginVertical: 15 },
    disabledButton: { backgroundColor: '#555', opacity: 0.7 },
    dateSelectorContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)', paddingBottom: 20 },
    dateSelectorLabel: { fontSize: 16, color: '#E0E0FF', fontWeight: '500' },
    datePickerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.25)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 15, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
    datePickerText: { color: '#FFFFFF', fontSize: 16, marginLeft: 10 },
    selectProductButton: { backgroundColor: '#673AB7', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 25, marginBottom: 10 },
    selectProductButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
    orText: { color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 20, fontStyle: 'italic' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: 'white', marginTop: 10 },
    catalogoContainer: {
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 16,
        padding: 15,
        marginBottom: 15,
    },
    catalogoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 15,
        textAlign: 'center',
    },
    productListItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)'
    },
    productListItemDesc: { color: '#FFFFFF', fontSize: 16 },
    productListItemValue: { color: '#E0E0E0', fontSize: 16 },
    catalogoButton: {
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 15
    },
    cancelButton: { backgroundColor: '#757575' },
    catalogoButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16
    },
    // Estilos para o campo de busca no catálogo
    buscaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 10,
        marginBottom: 15,
    },
    buscaIcon: {
        marginRight: 8,
    },
    buscaInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#FFFFFF',
    },
});