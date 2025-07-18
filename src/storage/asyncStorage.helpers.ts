// Em: src/storage/asyncStorage.helpers.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Cliente, Venda } from '../types';

// --- CHAVES DO ASYNCSTORAGE ---
// IMPORTANTE: Verifique se estas são as chaves que você usava para salvar seus dados.
// Se você usava nomes diferentes (ex: '@CVSApp:clientes'), altere as constantes abaixo.
const CHAVE_CLIENTES = '@clientes';
const CHAVE_VENDAS = '@vendas';

/**
 * Busca e retorna a lista de todos os clientes do AsyncStorage.
 * Esta é uma função de LEITURA para a migração.
 */
export const listarClientesAntigos = async (): Promise<Cliente[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(CHAVE_CLIENTES);
    // Se encontrar dados, faz o parse. Se não, retorna um array vazio.
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Erro ao tentar ler clientes antigos do AsyncStorage:', e);
    // Em caso de erro, retorna um array vazio para não quebrar a migração.
    return [];
  }
};

/**
 * Busca e retorna a lista de todas as vendas do AsyncStorage.
 * Esta é uma função de LEITURA para a migração.
 */
export const listarVendasAntigas = async (): Promise<Venda[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(CHAVE_VENDAS);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Erro ao tentar ler vendas antigas do AsyncStorage:', e);
    return [];
  }
};