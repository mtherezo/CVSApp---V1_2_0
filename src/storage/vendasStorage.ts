// src/storage/vendasStorage.ts
import { Alert } from 'react-native';
import {
    cadastrarVendaSQLite,
    editarVendaSQLite,
    listarTodasVendasSQLite,
    listarVendasPorClienteSQLite,
    listarVendaPorIdSQLite,
    excluirVendaSQLite,
    registrarPagamentoSQLite,
    excluirPagamentoSQLite,
    listarPagamentosSQLite,
    atualizarVendaSQLite
} from '../database/sqlite';
import { Venda, Pagamento } from '../types';

export const cadastrarVenda = async (venda: Omit<Venda, 'id'>): Promise<Venda | null> => {
    try {
        const vendaCompleta = await cadastrarVendaSQLite(venda as any);
        return vendaCompleta;
    } catch (error) {
        console.error("Erro ao cadastrar venda no SQLite:", error);
        return null;
    }
};


/**
 * Edita uma venda existente na base de dados.
 */
export const editarVenda = async (vendaEditada: Venda): Promise<boolean> => {
    try {
        await editarVendaSQLite(vendaEditada);
        return true;
    } catch (error) {
        console.error(`Erro ao editar a venda ${vendaEditada.id} no SQLite:`, error);
        return false;
    }
};

export const listarTodasVendas = async (): Promise<Venda[]> => {
    try {
        return await listarTodasVendasSQLite();
    } catch (error) {
        console.error("Erro ao listar todas as vendas do SQLite:", error);
        return [];
    }
};

export const listarVendasPorCliente = async (idCliente: string): Promise<Venda[]> => {
    try {
        return await listarVendasPorClienteSQLite(idCliente);
    } catch (error) {
        console.error(`Erro ao listar vendas do cliente ${idCliente} do SQLite:`, error);
        return [];
    }
};

export const listarVendaPorId = async (idVenda: string): Promise<Venda | null> => {
    try {
        return await listarVendaPorIdSQLite(idVenda);
    } catch (error) {
        console.error(`Erro ao buscar venda ${idVenda} do SQLite:`, error);
        return null;
    }
};

export const excluirVenda = async (idVenda: string): Promise<boolean> => {
    try {
        await excluirVendaSQLite(idVenda);
        return true;
    } catch (error) {
        console.error(`Erro ao excluir venda ${idVenda} do SQLite:`, error);
        return false;
    }
};

export const registrarPagamento = async (idVenda: string, valor: number): Promise<boolean> => {
    try {
        const venda = await listarVendaPorId(idVenda);
        if (!venda) {
            Alert.alert("Erro", "Venda não encontrada.");
            return false;
        }

        const totalJaPago = venda.pagamentos?.reduce((acc, p) => acc + p.valorPago, 0) || 0;
        if ((totalJaPago + valor) > venda.valorTotal + 0.001) {
            Alert.alert("Valor excedido", `O valor do pagamento excede o saldo devedor.`);
            return false;
        }

        await registrarPagamentoSQLite(idVenda, valor, new Date().toISOString());

        if (venda.tipoPagamento === 'Parcelado' && venda.parcelasTotais) {
            venda.parcelasPagas = (venda.parcelasPagas || 0) + 1;
            await atualizarVendaSQLite(venda);
        }
        
        return true;
    } catch (error) {
        console.error(`Erro ao registrar pagamento para a venda ${idVenda} no SQLite:`, error);
        return false;
    }
};

export const excluirPagamento = async (idVenda: string, idPagamento: string): Promise<boolean> => {
    try {
        const venda = await listarVendaPorId(idVenda);
        if (!venda) return false;

        await excluirPagamentoSQLite(idPagamento);

        if (venda.tipoPagamento === 'Parcelado' && venda.parcelasPagas && venda.parcelasPagas > 0) {
            venda.parcelasPagas--;
            await atualizarVendaSQLite(venda);
        }

        return true;
    } catch (error) {
        console.error(`Erro ao excluir pagamento ${idPagamento} do SQLite:`, error);
        return false;
    }
};

export const listarPagamentos = async (idVenda: string): Promise<Pagamento[]> => {
    try {
        const venda = await listarVendaPorId(idVenda);
        return venda?.pagamentos || [];
    } catch (error) {
        console.error(`Erro ao listar pagamentos da venda ${idVenda} do SQLite:`, error);
        return [];
    }
};