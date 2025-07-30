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
        if (error.message.includes('UNIQUE constraint failed: produtos.descricao')) {
            throw new Error('Já existe um produto com esta descrição.');
        }
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