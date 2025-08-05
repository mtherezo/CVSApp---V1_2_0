// src/storage/produtosStorage.ts
import { 
    listarProdutosSQLite,
    cadastrarProdutoSQLite,
    excluirProdutoSQLite
} from '../database/sqlite';
import { Produto } from '../types';

export const listarProdutos = async (): Promise<Produto[]> => {
    try {
        return await listarProdutosSQLite();
    } catch (error) {
        console.error("Erro na camada de storage ao listar produtos:", error);
        throw error;
    }
};

export const cadastrarProduto = async (produto: Produto): Promise<boolean> => {
    try {
        await cadastrarProdutoSQLite(produto);
        return true;
    } catch (error) {
    console.error('Erro ao salvar produto no SQLite:', error);
    // PRIMEIRO VERIFICA SE 'error' É UM OBJETO DE ERRO
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed: produtos.descricao')) {
        // Se for, agora podemos acessar 'error.message' com segurança
        throw new Error('Já existe um produto com esta descrição.');
    }
    // Se não for um erro de 'UNIQUE constraint', ou se 'error' não for um Error, relança o erro original.
    throw error;
}
};

export const excluirProduto = async (idProduto: string): Promise<boolean> => {
    try {
        await excluirProdutoSQLite(idProduto);
        return true;
    } catch (error) {
        console.error("Erro ao excluir produto do SQLite:", error);
        return false;
    }
};