// src/storage/clientesStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Cliente } from '../types';

const CLIENTES_KEY = 'clientes_data';

async function obterClientes(): Promise<Cliente[]> {
  try {
    const dados = await AsyncStorage.getItem(CLIENTES_KEY);
    return dados ? JSON.parse(dados) : [];
  } catch (error) {
    console.error('Erro ao obter clientes:', error);
    return [];
  }
}

export async function salvarCliente(cliente: Cliente): Promise<boolean> {
  try {
    const clientes = await obterClientes();
    clientes.push(cliente);
    await AsyncStorage.setItem(CLIENTES_KEY, JSON.stringify(clientes));
    return true;
  } catch (error) {
    console.error('Erro ao salvar cliente:', error);
    return false;
  }
}

export async function listarClientes(): Promise<Cliente[]> {
  return await obterClientes();
}

export async function excluirCliente(idCliente: string): Promise<boolean> {
  try {
    const clientes = await obterClientes();
    const novosClientes = clientes.filter(c => c.id !== idCliente);
    await AsyncStorage.setItem(CLIENTES_KEY, JSON.stringify(novosClientes));
    return true;
  } catch (error) {
    console.error("Erro ao excluir cliente:", error);
    return false;
  }
}

export async function editarCliente(clienteEditado: Cliente): Promise<boolean> {
  try {
    const clientes = await obterClientes();
    const index = clientes.findIndex(c => c.id === clienteEditado.id);
    
    if (index !== -1) {
      clientes[index] = clienteEditado;
      await AsyncStorage.setItem(CLIENTES_KEY, JSON.stringify(clientes));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Erro ao editar cliente:', error);
    return false;
  }
}

export async function buscarClientePorId(id: string): Promise<Cliente | null> {
  try {
    const clientes = await obterClientes();
    return clientes.find(c => c.id === id) || null;
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    return null;
  }
}
