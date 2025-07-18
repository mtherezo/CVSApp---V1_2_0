//app/Cadastrovenda.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ImageBackground,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { cadastrarVendaSQLite } from '../src/database/sqlite';
import { Venda, ItemVenda } from '../src/types';
import * as Crypto from 'expo-crypto';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// ✨ ALTERAÇÃO 1: O tipo do item recebido agora omite 'idVenda'.
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

export default function CadastroVendaScreen() {
  const router = useRouter();
  const { idCliente, nome: clienteNome } = useLocalSearchParams<{ idCliente?: string; nome?: string; }>();

  // ✨ ALTERAÇÃO 2: O estado dos itens agora é uma lista de itens sem 'idVenda'.
  const [itens, setItens] = useState<Omit<ItemVenda, 'idVenda'>[]>([]);
  const [itemDescricao, setItemDescricao] = useState('');
  const [itemValor, setItemValor] = useState('');
  const [itemQuantidade, setItemQuantidade] = useState('1');
  const [desconto, setDesconto] = useState('');
  const [tipoPagamento, setTipoPagamento] = useState<'À Vista' | 'Parcelado'>('À Vista');
  const [quantidadeParcelas, setQuantidadeParcelas] = useState('2');
  const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState(new Date());
  const [mostrarDataPicker, setMostrarDataPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const subtotal = itens.reduce((total, item) => total + (item.valor * item.quantidade), 0);
  const valorDesconto = parseFloat(desconto.replace(',', '.')) || 0;
  const totalFinal = Math.max(0, subtotal - valorDesconto);

  const handleAdicionarItem = () => {
    const valorNum = parseFloat(itemValor.replace(',', '.'));
    const quantidadeNum = parseInt(itemQuantidade, 10);
    if (!itemDescricao.trim() || isNaN(valorNum) || valorNum <= 0 || isNaN(quantidadeNum) || quantidadeNum <= 0) {
      Alert.alert("Atenção", "Preencha a descrição, quantidade e um valor válido para o produto.");
      return;
    }
    // ✨ ALTERAÇÃO 3: O novo item é criado sem 'idVenda', o que agora corresponde ao tipo.
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
    
    const dadosNovaVenda = {
      idCliente: idCliente,
      itens: itens,
      subtotal: subtotal,
      valorTotal: totalFinal,
      dataVenda: new Date().toISOString(),
      tipoPagamento,
      ...(valorDesconto > 0 && { desconto: valorDesconto }),
      ...(tipoPagamento === 'Parcelado' && {
        parcelasTotais: quantidadeParcelasNum,
        parcelasPagas: 0,
        dataPrimeiraParcela: dataPrimeiraParcela.toISOString(),
      }),
    };

    try {
      await cadastrarVendaSQLite(dadosNovaVenda);
      Alert.alert('Sucesso', 'Venda cadastrada com sucesso!');
      router.back();
    } catch (error) {
      console.error('Falha ao cadastrar venda (catch na tela):', error);
      Alert.alert('Erro Inesperado', 'Ocorreu um erro ao cadastrar a venda.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const onChangeData = (event: DateTimePickerEvent, selectedDate?: Date) => {
      setMostrarDataPicker(Platform.OS === 'ios');
      if (selectedDate) {
          setDataPrimeiraParcela(selectedDate);
      }
  };

  return (
    <ImageBackground source={require("../assets/images/fundo.jpg")} style={styles.background} blurRadius={2}>
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
                  <Text style={styles.title}>Nova Venda</Text>
              </View>
              <Text style={styles.subtitle}>{`para ${clienteNome}`}</Text>
              
              <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>1. Adicionar Itens</Text>
                  <View style={styles.inputContainer}>
                      <MaterialCommunityIcons name="tag-outline" size={22} color="#A9A9A9" style={styles.inputIcon} />
                      <TextInput placeholder="Descrição do Produto" value={itemDescricao} onChangeText={setItemDescricao} placeholderTextColor="#A9A9A9" style={styles.input} />
                  </View>
                  <View style={styles.inputRow}>
                      <View style={[styles.inputContainer, {flex:1}]}>
                          <MaterialCommunityIcons name="counter" size={22} color="#A9A9A9" style={styles.inputIcon} />
                          <TextInput placeholder="Qtde." value={itemQuantidade} onChangeText={setItemQuantidade} keyboardType="number-pad" placeholderTextColor="#A9A9A9" style={styles.input} />
                      </View>
                      <View style={[styles.inputContainer, {flex:2}]}>
                          <MaterialCommunityIcons name="cash" size={22} color="#A9A9A9" style={styles.inputIcon} />
                          <TextInput placeholder="Valor (un.)" value={itemValor} onChangeText={setItemValor} keyboardType="decimal-pad" placeholderTextColor="#A9A9A9" style={styles.input} />
                      </View>
                  </View>
                  <TouchableOpacity style={[styles.actionButton, styles.additemButton]} onPress={handleAdicionarItem}>
                      <MaterialCommunityIcons name="plus-circle-outline" size={22} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Adicionar Produto</Text>
                  </TouchableOpacity>
              </View>

              <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>2. Resumo e Pagamento</Text>
                  {itens.length === 0 ? (
                      <Text style={styles.emptyListText}>Nenhum item adicionado ainda.</Text>
                  ) : (
                      <>
                          {itens.map(item => (<MemoizedItemAdicionado key={item.id} item={item} onRemove={handleRemoverItem} />))}
                          <View style={styles.resumoContainer}>
                              <View style={styles.resumoRow}><Text style={styles.textoResumo}>Subtotal:</Text><Text style={styles.textoResumo}>{`R$ ${subtotal.toFixed(2)}`}</Text></View>
                              <View style={[styles.resumoRow, styles.descontoInputContainer]}><Text style={styles.textoResumo}>Desconto:</Text><View style={styles.inputDescontoWrapper}><Text style={styles.inputDescontoPrefix}>R$</Text><TextInput placeholder="0,00" placeholderTextColor="#A9A9A9" value={desconto} onChangeText={setDesconto} keyboardType="decimal-pad" style={styles.inputDesconto} /></View></View>
                              <View style={[styles.resumoRow, styles.totalRow]}><Text style={styles.textoTotalFinal}>Total:</Text><Text style={styles.textoTotalFinal}>{`R$ ${totalFinal.toFixed(2)}`}</Text></View>
                          </View>
                          <View style={styles.pagamentoSectionContainer}>
                              <Text style={styles.subSectionTitle}>Forma de Pagamento</Text>
                              <View style={styles.pagamentoContainer}><TouchableOpacity style={[styles.pagamentoBotao, tipoPagamento === 'À Vista' && styles.pagamentoSelecionado]} onPress={() => setTipoPagamento('À Vista')}><MaterialCommunityIcons name="cash" size={24} color={tipoPagamento === 'À Vista' ? "#FFF" : "#A9A9A9"} /><Text style={styles.textoBotaoPagamento}>À Vista</Text></TouchableOpacity><TouchableOpacity style={[styles.pagamentoBotao, tipoPagamento === 'Parcelado' && styles.pagamentoSelecionado]} onPress={() => setTipoPagamento('Parcelado')}><MaterialCommunityIcons name="credit-card-multiple-outline" size={24} color={tipoPagamento === 'Parcelado' ? "#FFF" : "#A9A9A9"} /><Text style={styles.textoBotaoPagamento}>Parcelado</Text></TouchableOpacity></View>
                              {tipoPagamento === 'Parcelado' && (<View style={styles.parceladoContainer}><View style={[styles.inputContainer, {flex:1}]}><MaterialCommunityIcons name="format-list-numbered" size={22} color="#A9A9A9" style={styles.inputIcon} /><TextInput placeholder="Nº Parc." value={quantidadeParcelas} onChangeText={setQuantidadeParcelas} keyboardType="number-pad" style={styles.input} placeholderTextColor="#A9A9A9" /></View><TouchableOpacity style={[styles.inputContainer, {flex: 2, alignItems: 'center'}]} onPress={() => setMostrarDataPicker(true)}><MaterialCommunityIcons name="calendar-range" size={22} color="#A9A9A9" style={styles.inputIcon} /><Text style={styles.dateInputText}>{dataPrimeiraParcela.toLocaleDateString('pt-BR')}</Text></TouchableOpacity>{mostrarDataPicker && (<DateTimePicker value={dataPrimeiraParcela} mode="date" display="default" onChange={onChangeData} />)}</View>)}
                          </View>
                      </>
                  )}
              </View>

            <View style={styles.actionButtonsContainer}>
                {isSaving ? (
                    <ActivityIndicator size="large" color="#FFFFFF" style={styles.loader} />
                ) : (
                    <TouchableOpacity style={[styles.actionButton, styles.saveButton, itens.length === 0 && styles.disabledButton]} onPress={handleSalvarVenda} disabled={itens.length === 0 || isSaving}>
                        <MaterialCommunityIcons name="content-save-check-outline" size={22} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Concluir e Salvar Venda</Text>
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
});