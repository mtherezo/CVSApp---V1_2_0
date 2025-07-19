import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ImageBackground,
  ActivityIndicator,
  RefreshControl,
  Platform,
  SafeAreaView,
  FlatList,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  listarVendaPorIdSQLite,
  registrarPagamentoSQLite,
  excluirPagamentoSQLite,
  atualizarVendaSQLite,
} from '../src/database/sqlite';
import { Pagamento, Venda } from '../src/types';

const MemoizedPagamentoItem = React.memo(({ item, onExcluir, isDeleting, isSubmitting }: { item: Pagamento, onExcluir: (item: Pagamento) => void, isDeleting: boolean, isSubmitting: boolean }) => (
    <View style={styles.itemPagamento}>
      <View style={styles.itemPagamentoInfo}>
        <Text style={styles.itemValor}>R$ {item.valorPago.toFixed(2)}</Text>
        <Text style={styles.itemData}>em {new Date(item.dataPagamento).toLocaleDateString('pt-BR')} às {new Date(item.dataPagamento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
      <TouchableOpacity
        style={[styles.botaoExcluirItem, (isDeleting || isSubmitting) && styles.botaoDesabilitado]}
        onPress={() => onExcluir(item)}
        disabled={isDeleting || isSubmitting}
      >
        {isDeleting ? <ActivityIndicator size="small" color="#FFFFFF"/> : <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FF6B6B" />}
      </TouchableOpacity>
    </View>
));

const FormularioNovoPagamento = ({ saldoDevedor, onRegistrarPagamento, isSubmitting }: {
  saldoDevedor: number;
  onRegistrarPagamento: (valor: string) => void;
  isSubmitting: boolean;
}) => {
  const [valorPagamento, setValorPagamento] = useState('');

  const handlePress = () => {
    const valorNum = parseFloat(valorPagamento.replace(',', '.'));
    if (isNaN(valorNum) || valorNum <= 0) {
      Alert.alert("Valor Inválido", "Por favor, digite um valor de pagamento válido e positivo.");
      return;
    }
    onRegistrarPagamento(valorPagamento);
    setValorPagamento('');
  };

  return (
    <View style={styles.novoPagamentoContainer}>
      <Text style={styles.sectionTitle}>Registrar Novo Pagamento</Text>
      <View style={styles.inputContainer}>
        <MaterialCommunityIcons name="currency-brl" size={22} color="#A9A9A9" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={`Valor (Pendente: R$ ${saldoDevedor.toFixed(2)})`}
          keyboardType="decimal-pad"
          value={valorPagamento}
          onChangeText={setValorPagamento}
          placeholderTextColor="#A9A9A9"
          editable={!isSubmitting}
        />
      </View>
      <TouchableOpacity 
          style={[styles.botaoRegistrar, (isSubmitting || !valorPagamento) && styles.botaoDesabilitado]} 
          onPress={handlePress}
          disabled={isSubmitting || !valorPagamento}
      >
        {isSubmitting ? 
          <ActivityIndicator size="small" color="#FFFFFF" /> :
          <>
            <MaterialCommunityIcons name="content-save-check-outline" size={22} color="#FFFFFF" />
            <Text style={styles.textoBotaoPrincipal}>Registrar</Text>
          </>
        }
      </TouchableOpacity>
    </View>
  );
};

export default function ParcelasVendaClienteScreen() {
  const params = useLocalSearchParams<{ idVenda?: string }>();
  const idVenda = params.idVenda;
  const router = useRouter();
  
  const [vendaAtual, setVendaAtual] = useState<Venda | null>(null);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingPagamento, setIsSubmittingPagamento] = useState(false);
  const [isDeletingPagamento, setIsDeletingPagamento] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const carregarDadosVendaEPagamentos = useCallback(async (showMainLoader = true) => {
    if (!idVenda) {
      Alert.alert("Erro", "ID da Venda não fornecido.");
      router.canGoBack() ? router.back() : router.replace('/Home');
      return;
    }
    if (showMainLoader) setIsLoading(true);
      try {
        const dadosVenda = await listarVendaPorIdSQLite(idVenda); 
        if (!dadosVenda) {
          Alert.alert("Erro", "Venda não encontrada.");
          router.canGoBack() ? router.back() : router.replace('/Home');
          return;
        }
        setVendaAtual(dadosVenda);
        setPagamentos(dadosVenda.pagamentos || []);
    } catch (error) {
      console.error('Falha ao carregar dados da venda e pagamentos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os detalhes da venda e pagamentos.');
    } finally {
      if (showMainLoader) setIsLoading(false);
    }
  }, [idVenda]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carregarDadosVendaEPagamentos(false);
    setRefreshing(false);
  }, [carregarDadosVendaEPagamentos]);
  
  useFocusEffect(
    useCallback(() => {
      if (idVenda) {
        carregarDadosVendaEPagamentos();
      }
    }, [idVenda, carregarDadosVendaEPagamentos])
  );
  
  const handleRegistrarPagamento = useCallback(async (valorString: string) => {
    if (!idVenda || !vendaAtual) return;
    const valor = parseFloat(valorString.replace(',', '.'));
    if (isNaN(valor) || valor <= 0) return;
    
    setIsSubmittingPagamento(true);
    try {
      await registrarPagamentoSQLite(idVenda, valor, new Date().toISOString());
      
      if (vendaAtual.tipoPagamento === 'Parcelado') {
        const novasParcelasPagas = (vendaAtual.parcelasPagas || 0) + 1;
        await atualizarVendaSQLite({ id: idVenda, parcelasPagas: novasParcelasPagas });
      }
      
      await carregarDadosVendaEPagamentos(false); 
    } catch (error) {
      console.error('Falha ao registrar pagamento (catch na tela):', error);
      Alert.alert('Erro Inesperado', 'Ocorreu um erro ao tentar registrar o pagamento.');
    } finally { 
      setIsSubmittingPagamento(false);
    }
  }, [idVenda, vendaAtual, carregarDadosVendaEPagamentos]);
  
  const confirmarExclusaoPagamento = useCallback((pagamentoParaExcluir: Pagamento) => {
    if (!idVenda || !vendaAtual) return;
    Alert.alert( 'Confirmar Exclusão', `Tem certeza que deseja excluir este pagamento de R$ ${pagamentoParaExcluir.valorPago.toFixed(2)}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir Definitivamente', style: 'destructive', onPress: async () => {
        setIsDeletingPagamento(pagamentoParaExcluir.id);
        try {
          await excluirPagamentoSQLite(pagamentoParaExcluir.id);
          
          if (vendaAtual.tipoPagamento === 'Parcelado' && (vendaAtual.parcelasPagas || 0) > 0) {
            const novasParcelasPagas = (vendaAtual.parcelasPagas || 0) - 1;
            await atualizarVendaSQLite({ id: idVenda, parcelasPagas: novasParcelasPagas });
          }
          
          await carregarDadosVendaEPagamentos(false);
        } catch (error) {
          console.error('Falha ao excluir pagamento (catch na tela):', error);
          Alert.alert('Erro Inesperado', 'Ocorreu um erro ao tentar excluir o pagamento.');
        } finally { setIsDeletingPagamento(null); }
      }},
    ]);
  }, [idVenda, vendaAtual, carregarDadosVendaEPagamentos]);

  const totalPago = pagamentos.reduce((acc, p) => acc + p.valorPago, 0);
  const saldoDevedor = vendaAtual ? vendaAtual.valorTotal - totalPago : 0;

  const renderHeader = () => (
    <>
      {vendaAtual && (
        <View style={styles.resumoVendaContainer}>
          <Text style={styles.resumoVendaTexto}>Cliente: {vendaAtual.clienteNome}</Text>
          <Text style={styles.resumoVendaTexto}>Produtos: {vendaAtual.itens?.map(p => `${p.quantidade}x ${p.descricao}`).join(' | ')}</Text>
          <Text style={styles.resumoVendaTexto}>Total: R$ {vendaAtual.valorTotal.toFixed(2)}</Text>
          <Text style={styles.resumoVendaTexto}>Pago: R$ {totalPago.toFixed(2)}</Text>
          <Text style={[styles.resumoVendaTexto, styles.saldoDevedor, saldoDevedor > 0.001 ? styles.textoPendente : styles.textoQuitado]}>
            Pendente: R$ {saldoDevedor.toFixed(2)}
          </Text>
          <Text style={styles.resumoVendaTexto}>Forma de Pagamento: {vendaAtual.tipoPagamento}</Text>
          {vendaAtual.tipoPagamento === 'Parcelado' && vendaAtual.parcelasTotais &&
            <Text style={styles.resumoVendaTexto}>{`Parcelas: ${vendaAtual.parcelasPagas || 0} / ${vendaAtual.parcelasTotais}`}</Text>
          }
        </View>
      )}
      <Text style={styles.sectionTitle}>Histórico de Pagamentos</Text>
    </>
  );

  if (isLoading) {
    return (
      <ImageBackground source={require("../assets/images/fundo.jpg")} style={styles.background} blurRadius={2}>
        <View style={styles.overlay} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Carregando detalhes...</Text>
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
          <Text style={styles.title}>Pagamentos da Venda</Text>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
          <FlatList
            data={pagamentos}
            style={{flex: 1}}
            contentContainerStyle={styles.scrollContainer}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MemoizedPagamentoItem 
                item={item}
                onExcluir={confirmarExclusaoPagamento}
                isDeleting={isDeletingPagamento === item.id}
                isSubmitting={isSubmittingPagamento}
              />
            )}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={<Text style={styles.listaVaziaTexto}>Nenhum pagamento registrado.</Text>}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />}
            keyboardShouldPersistTaps="handled"
          />
          
          {saldoDevedor > 0.001 && ( 
            <FormularioNovoPagamento
              saldoDevedor={saldoDevedor}
              onRegistrarPagamento={handleRegistrarPagamento}
              isSubmitting={isSubmittingPagamento}
            />
          )}
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
  scrollContainer: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 10 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#FFFFFF', fontSize: 16 },
  headerContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, marginBottom: 10 },
  backButton: { padding: 8, marginRight: 10, marginLeft: -8 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', flex: 1, marginRight: 48 },
  sectionTitle: { fontSize: 20, fontWeight: '600', marginTop: 10, marginBottom: 15, color: '#FFFFFF' },
  resumoVendaContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    padding: 18,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  resumoVendaTexto: { fontSize: 16, color: '#E0E0FF', marginBottom: 6, lineHeight: 22 },
  saldoDevedor: { fontSize: 18, fontWeight: 'bold' },
  textoPendente: { color: '#FFAB91' }, 
  textoQuitado: { color: '#A5D6A7' }, 
  itemPagamento: {
    backgroundColor: 'rgba(255,255,255,0.1)', 
    paddingVertical: 12, 
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  itemPagamentoInfo: { flex: 1 },
  itemValor: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  itemData: { fontSize: 13, color: '#E0E0FF', marginTop: 4, fontStyle: 'italic' },
  botaoExcluirItem: { padding: 8, marginLeft: 10 },
  novoPagamentoContainer: {
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10, // Espaçamento extra no iOS
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(25, 10, 50, 0.85)'
  },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.25)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', marginBottom: 15 },
  inputIcon: { paddingLeft: 15, paddingRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 14, 
    paddingRight: 15,
    fontSize: 16, 
    color: '#FFFFFF',
  },
  botaoRegistrar: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50', 
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotaoPrincipal: { color: 'white', fontSize: 17, fontWeight: 'bold', marginLeft: 10 },
  botaoDesabilitado: { opacity: 0.5 },
  listaVaziaTexto: { 
    textAlign: 'center',
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
    paddingVertical: 40, 
  },
});