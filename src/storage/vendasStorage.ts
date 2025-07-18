// src/storage/vendasStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Venda, Pagamento } from '../types';
import uuid from 'react-native-uuid';
import { Alert } from 'react-native';

const VENDAS_KEY = 'vendas';

// Função auxiliar para obter vendas
async function obterVendas(): Promise<Venda[]> {
  try {
    const dados = await AsyncStorage.getItem(VENDAS_KEY);
    return dados ? JSON.parse(dados) : [];
  } catch (error) {
    console.error("Erro ao obter vendas:", error);
    return [];
  }
}

// Função para listar vendas de um cliente específico
export async function listarVendasPorCliente(idCliente: string): Promise<Venda[]> {
  try {
    const vendas = await obterVendas();
    return vendas.filter((v) => v.idCliente === idCliente);
  } catch (error) {
    console.error("Erro ao listar vendas:", error);
    return [];
  }
}

// Função para cadastrar uma nova venda
export async function cadastrarVenda(novaVenda: Omit<Venda, 'id'>): Promise<Venda | null> {
  try {
    const vendas = await obterVendas();
    const vendaComId: Venda = {
        ...novaVenda, 
        id: uuid.v4().toString(), 
        pagamentos: novaVenda.pagamentos || [], // Garante que pagamentos seja um array
    };
    vendas.push(vendaComId);
    await AsyncStorage.setItem(VENDAS_KEY, JSON.stringify(vendas));
    return vendaComId;
  } catch (error) {
    console.error("Erro ao cadastrar venda:", error);
    return null;
  }
}

// Função para buscar uma venda por ID
export async function listarVendaPorId(idVenda: string): Promise<Venda | null> {
  try {
    const vendas = await obterVendas();
    const venda = vendas.find(v => v.id === idVenda);
    return venda || null;
  } catch (error) {
    console.error("Erro ao buscar venda:", error);
    return null;
  }
}

// Função para registrar um pagamento
export async function registrarPagamento(idVenda: string, valorPago: number): Promise<boolean> {
  try {
    const vendas = await obterVendas();
    const vendaIndex = vendas.findIndex(v => v.id === idVenda);
    if (vendaIndex === -1) {
      Alert.alert("Erro", "Venda não encontrada.");
      return false;
    }
    const venda = vendas[vendaIndex];
    
    const totalJaPago = venda.pagamentos?.reduce((acc, p) => acc + p.valorPago, 0) || 0;
    if ((totalJaPago + valorPago) > venda.valorTotal + 0.001) {
        Alert.alert("Valor excedido", `O valor do pagamento excede o saldo devedor.`);
        return false;
    }

    const novoPagamento: Pagamento = {
      id: uuid.v4().toString(),
      dataPagamento: new Date().toISOString(),
      valorPago,
      idVenda: ''
    };
    venda.pagamentos = venda.pagamentos || [];
    venda.pagamentos.push(novoPagamento);
    if (venda.tipoPagamento === 'Parcelado' && venda.parcelasTotais) {
      venda.parcelasPagas = (venda.parcelasPagas || 0) + 1;
    }
    vendas[vendaIndex] = venda;
    await AsyncStorage.setItem(VENDAS_KEY, JSON.stringify(vendas));
    return true;
  } catch (error) {
    console.error("Erro ao registrar pagamento:", error);
    return false;
  }
}

// Função para excluir um pagamento
export async function excluirPagamento(idVenda: string, idPagamento: string): Promise<boolean> {
  try {
    const vendas = await obterVendas();
    const vendaIndex = vendas.findIndex(v => v.id === idVenda);
    if (vendaIndex === -1) return false;
    
    const venda = vendas[vendaIndex];
    const tamanhoOriginal = venda.pagamentos?.length || 0;
    venda.pagamentos = venda.pagamentos?.filter(p => p.id !== idPagamento);

    if (venda.pagamentos && venda.pagamentos.length < tamanhoOriginal) {
        if(venda.tipoPagamento === 'Parcelado' && venda.parcelasPagas && venda.parcelasPagas > 0) {
            venda.parcelasPagas--;
        }
    }

    vendas[vendaIndex] = venda;
    await AsyncStorage.setItem(VENDAS_KEY, JSON.stringify(vendas));
    return true;
  } catch (error) {
    console.error("Erro ao excluir pagamento:", error);
    return false;
  }
}

// Função para listar pagamentos
export async function listarPagamentos(idVenda: string): Promise<Pagamento[]> {
  try {
    const venda = await listarVendaPorId(idVenda);
    return venda?.pagamentos || [];
  } catch (error) {
    console.error("Erro ao listar pagamentos:", error);
    return [];
  }
}

// Função para excluir uma venda
export async function excluirVenda(idVenda: string): Promise<boolean> {
  try {
    const vendas = await obterVendas();
    const novasVendas = vendas.filter((v: Venda) => v.id !== idVenda);
    await AsyncStorage.setItem(VENDAS_KEY, JSON.stringify(novasVendas));
    return true;
  } catch (error) {
    console.error("Erro ao excluir venda:", error);
    return false;
  }
}

// Função para excluir todas as vendas de um cliente
export async function excluirVendasPorCliente(idCliente: string): Promise<boolean> {
  try {
    const vendas = await obterVendas();
    const novasVendas = vendas.filter((v: Venda) => v.idCliente !== idCliente);
    await AsyncStorage.setItem(VENDAS_KEY, JSON.stringify(novasVendas));
    return true;
  } catch (error) {
    console.error("Erro ao excluir vendas do cliente:", error);
    return false;
  }
}

// Função para listar todas as vendas
export async function listarTodasVendas(): Promise<Venda[]> {
  return await obterVendas();
}
