// src/database/sqlite.ts
import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Cliente, Venda, Pagamento, ItemVenda, Usuario, Produto } from '../types'; // Adicionado Produto

export const db = SQLite.openDatabaseSync('cvsapp.db');

export const setupDatabase = async () => {
    try {
        await db.execAsync('PRAGMA foreign_keys = ON;');
        
        let currentDbVersion = (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))?.user_version ?? 0;
        console.log(`Versão atual do banco: ${currentDbVersion}`);

        const MIGRATIONS = [
            {
                version: 1,
                queries: [
                    `CREATE TABLE IF NOT EXISTS clientes (id TEXT PRIMARY KEY NOT NULL, nome TEXT NOT NULL, telefone TEXT, email TEXT);`,
                    `CREATE TABLE IF NOT EXISTS vendas (id TEXT PRIMARY KEY NOT NULL, idCliente TEXT NOT NULL, clienteNome TEXT NOT NULL, clienteTelefone TEXT, dataVenda TEXT NOT NULL, valorTotal REAL NOT NULL, subtotal REAL, desconto REAL, tipoPagamento TEXT NOT NULL, parcelasTotais INTEGER, parcelasPagas INTEGER, dataPrimeiraParcela TEXT, FOREIGN KEY (idCliente) REFERENCES clientes (id) ON DELETE CASCADE);`,
                    `CREATE TABLE IF NOT EXISTS itens_venda (id TEXT PRIMARY KEY NOT NULL, idVenda TEXT NOT NULL, descricao TEXT NOT NULL, quantidade INTEGER NOT NULL, valor REAL NOT NULL, FOREIGN KEY (idVenda) REFERENCES vendas (id) ON DELETE CASCADE);`,
                    `CREATE TABLE IF NOT EXISTS pagamentos (id TEXT PRIMARY KEY NOT NULL, idVenda TEXT NOT NULL, dataPagamento TEXT NOT NULL, valorPago REAL NOT NULL, FOREIGN KEY (idVenda) REFERENCES vendas (id) ON DELETE CASCADE);`,
                    `CREATE TABLE IF NOT EXISTS usuarios (username TEXT PRIMARY KEY NOT NULL, passwordHash TEXT NOT NULL);`,
                ],
            },
            {
                version: 2,
                queries: [ `ALTER TABLE clientes ADD COLUMN endereco TEXT;` ],
            },
            // ✨ NOVA MIGRAÇÃO PARA A TABELA DE PRODUTOS
            {
                version: 3,
                queries: [ `CREATE TABLE IF NOT EXISTS produtos (id TEXT PRIMARY KEY NOT NULL, descricao TEXT NOT NULL UNIQUE, valor REAL NOT NULL);` ],
            }
        ];

        const targetVersion = MIGRATIONS.length;
        if (currentDbVersion >= targetVersion) {
            console.log("Banco de dados já está na versão mais recente.");
            return;
        }

        for (let i = currentDbVersion; i < targetVersion; i++) {
            const migration = MIGRATIONS[i];
            console.log(`- Aplicando migração para a versão ${migration.version}...`);
            await db.withTransactionAsync(async () => {
                for (const query of migration.queries) {
                    await db.execAsync(query);
                }
            });
            await db.execAsync(`PRAGMA user_version = ${migration.version};`);
            console.log(`- Banco de dados atualizado para a versão ${migration.version}`);
        }
    } catch (error) {
        console.error("Erro crítico durante a migração do banco de dados:", error);
        throw new Error("Falha ao configurar o banco de dados do aplicativo.");
    }
};

// --- Funções de Migração de Dados (do AsyncStorage) ---
export const inserirCliente = async (cliente: Cliente) => {
    await db.runAsync('INSERT INTO clientes (id, nome, telefone, email, endereco) VALUES (?, ?, ?, ?, ?);',
        cliente.id, cliente.nome, cliente.telefone || null, cliente.email || null, cliente.endereco || null);
};

export const inserirVendaCompleta = async (venda: Venda) => {
    await db.withTransactionAsync(async () => {
        await db.runAsync(
            'INSERT INTO vendas (id, idCliente, clienteNome, clienteTelefone, dataVenda, valorTotal, subtotal, desconto, tipoPagamento, parcelasTotais, parcelasPagas, dataPrimeiraParcela) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
            venda.id, venda.idCliente, venda.clienteNome, venda.clienteTelefone, venda.dataVenda, venda.valorTotal, venda.subtotal, venda.desconto, venda.tipoPagamento, venda.parcelasTotais, venda.parcelasPagas, venda.dataPrimeiraParcela
        );
        if (venda.itens) {
            for (const item of venda.itens) {
                await db.runAsync('INSERT INTO itens_venda (id, idVenda, descricao, quantidade, valor) VALUES (?, ?, ?, ?, ?);',
                    item.id || Crypto.randomUUID(), venda.id, item.descricao, item.quantidade, item.valor);
            }
        }
        if (venda.pagamentos) {
            for (const pagamento of venda.pagamentos) {
                await db.runAsync('INSERT INTO pagamentos (id, idVenda, dataPagamento, valorPago) VALUES (?, ?, ?, ?);',
                    pagamento.id || Crypto.randomUUID(), venda.id, pagamento.dataPagamento, pagamento.valorPago);
            }
        }
    });
};

// --- Funções CRUD para Clientes ---
export const listarClientesSQLite = async (): Promise<Cliente[]> => await db.getAllAsync<Cliente>('SELECT * FROM clientes ORDER BY nome ASC');
export const cadastrarClienteSQLite = async (cliente: Cliente) => {
    await db.runAsync(`INSERT INTO clientes (id, nome, telefone, email, endereco) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET nome = excluded.nome, telefone = excluded.telefone, email = excluded.email, endereco = excluded.endereco;`,
        cliente.id, cliente.nome, cliente.telefone || null, cliente.email || null, cliente.endereco || null);
};
export const excluirClienteSQLite = async (idCliente: string) => await db.runAsync('DELETE FROM clientes WHERE id = ?;', idCliente);
export const buscarClientePorIdSQLite = async (id: string): Promise<Cliente | null> => await db.getFirstAsync<Cliente>('SELECT * FROM clientes WHERE id = ?;', id);
export const pesquisarClientesPorNomeSQLite = async (termo: string): Promise<Cliente[]> => await db.getAllAsync<Cliente>('SELECT * FROM clientes WHERE nome LIKE ? ORDER BY nome ASC;', `%${termo}%`);

// --- Funções CRUD para Vendas e Pagamentos ---
export const cadastrarVendaSQLite = async (venda: Omit<Venda, 'id' | 'clienteNome' | 'clienteTelefone' | 'itens' | 'pagamentos'> & { idCliente: string, itens: Omit<ItemVenda, 'idVenda'>[] }): Promise<Venda> => {
    const cliente = await buscarClientePorIdSQLite(venda.idCliente);
    if (!cliente) throw new Error("Cliente não encontrado para realizar a venda.");
    const novaVenda: Venda = { ...venda, id: Crypto.randomUUID(), clienteNome: cliente.nome, clienteTelefone: cliente.telefone, itens: venda.itens as ItemVenda[], pagamentos: [] };
    await inserirVendaCompleta(novaVenda);
    return novaVenda;
};
export const editarVendaSQLite = async (venda: Venda) => {
    await db.withTransactionAsync(async () => {
        await db.runAsync(`UPDATE vendas SET valorTotal = ?, subtotal = ?, desconto = ?, tipoPagamento = ?, parcelasTotais = ?, parcelasPagas = ?, dataPrimeiraParcela = ? WHERE id = ?;`,
            venda.valorTotal, venda.subtotal || null, venda.desconto || null, venda.tipoPagamento,
            venda.parcelasTotais || null, venda.parcelasPagas || null, venda.dataPrimeiraParcela || null, venda.id);
        await db.runAsync('DELETE FROM itens_venda WHERE idVenda = ?;', venda.id);
        if (venda.itens && venda.itens.length > 0) {
            for (const item of venda.itens) {
                await db.runAsync('INSERT INTO itens_venda (id, idVenda, descricao, quantidade, valor) VALUES (?, ?, ?, ?, ?);', item.id || Crypto.randomUUID(), venda.id, item.descricao, item.quantidade, item.valor);
            }
        }
    });
};
export const listarTodasVendasSQLite = async (): Promise<Venda[]> => {
    const vendas = await db.getAllAsync<Venda>('SELECT * FROM vendas ORDER BY dataVenda DESC');
    if (vendas.length === 0) return [];
    const vendaIds = vendas.map(v => v.id);
    const placeholders = vendaIds.map(() => '?').join(',');
    const todosItens = await db.getAllAsync<ItemVenda>(`SELECT * FROM itens_venda WHERE idVenda IN (${placeholders})`, ...vendaIds);
    const todosPagamentos = await db.getAllAsync<Pagamento>(`SELECT * FROM pagamentos WHERE idVenda IN (${placeholders})`, ...vendaIds);
    return vendas.map(venda => ({ ...venda, itens: todosItens.filter(item => item.idVenda === venda.id), pagamentos: todosPagamentos.filter(p => p.idVenda === venda.id) }));
};
export const listarVendasPorClienteSQLite = async (idCliente: string): Promise<Venda[]> => {
    const vendas = await db.getAllAsync<Venda>('SELECT * FROM vendas WHERE idCliente = ? ORDER BY dataVenda DESC', idCliente);
    if (vendas.length === 0) return [];
    const vendaIds = vendas.map(v => v.id);
    const placeholders = vendaIds.map(() => '?').join(',');
    const todosItens = await db.getAllAsync<ItemVenda>(`SELECT * FROM itens_venda WHERE idVenda IN (${placeholders})`, ...vendaIds);
    const todosPagamentos = await db.getAllAsync<Pagamento>(`SELECT * FROM pagamentos WHERE idVenda IN (${placeholders})`, ...vendaIds);
    return vendas.map(venda => ({ ...venda, itens: todosItens.filter(item => item.idVenda === venda.id), pagamentos: todosPagamentos.filter(p => p.idVenda === venda.id) }));
};
export const listarVendaPorIdSQLite = async (idVenda: string): Promise<Venda | null> => {
    const venda = await db.getFirstAsync<Venda>('SELECT * FROM vendas WHERE id = ?', idVenda);
    if (venda) {
        venda.itens = await db.getAllAsync<ItemVenda>('SELECT * FROM itens_venda WHERE idVenda = ?', venda.id);
        venda.pagamentos = await db.getAllAsync<Pagamento>('SELECT * FROM pagamentos WHERE idVenda = ?', venda.id);
    }
    return venda;
};
export const listarVendasPorPeriodoSQLite = async (dataInicio: string, dataFim: string): Promise<Venda[]> => {
    const vendas = await db.getAllAsync<Venda>('SELECT * FROM vendas WHERE dataVenda >= ? AND dataVenda <= ? ORDER BY dataVenda DESC', dataInicio, dataFim);
    if (vendas.length === 0) return [];
    const vendaIds = vendas.map(v => v.id);
    const placeholders = vendaIds.map(() => '?').join(',');
    const todosItens = await db.getAllAsync<ItemVenda>(`SELECT * FROM itens_venda WHERE idVenda IN (${placeholders})`, ...vendaIds);
    const todosPagamentos = await db.getAllAsync<Pagamento>(`SELECT * FROM pagamentos WHERE idVenda IN (${placeholders})`, ...vendaIds);
    return vendas.map(venda => ({ ...venda, itens: todosItens.filter(item => item.idVenda === venda.id), pagamentos: todosPagamentos.filter(p => p.idVenda === venda.id) }));
};
export const excluirVendaSQLite = async (idVenda: string) => await db.runAsync('DELETE FROM vendas WHERE id = ?;', idVenda);
export const registrarPagamentoSQLite = async (idVenda: string, valor: number, dataPagamento: string) => await db.runAsync('INSERT INTO pagamentos (id, idVenda, dataPagamento, valorPago) VALUES (?, ?, ?, ?);', Crypto.randomUUID(), idVenda, dataPagamento, valor);
export const excluirPagamentoSQLite = async (idPagamento: string) => await db.runAsync('DELETE FROM pagamentos WHERE id = ?;', idPagamento);
export const listarPagamentosSQLite = async (idVenda: string): Promise<Pagamento[]> => await db.getAllAsync<Pagamento>('SELECT * FROM pagamentos WHERE idVenda = ? ORDER BY dataPagamento ASC', idVenda);
export const atualizarVendaSQLite = async (venda: Pick<Venda, 'id' | 'parcelasPagas'>) => await db.runAsync('UPDATE vendas SET parcelasPagas = ? WHERE id = ?;', venda.parcelasPagas || 0, venda.id);

// --- Funções CRUD para Usuários ---
export const cadastrarUsuarioSQLite = async (usuario: Usuario) => await db.runAsync('INSERT INTO usuarios (username, passwordHash) VALUES (?, ?);', usuario.username, usuario.passwordHash);
export const buscarUsuarioPorUsernameSQLite = async (username: string): Promise<Usuario | null> => await db.getFirstAsync<Usuario>('SELECT * FROM usuarios WHERE username = ?;', username);
export const excluirUsuarioSQLite = async (username: string): Promise<boolean> => (await db.runAsync('DELETE FROM usuarios WHERE username = ?;', username)).changes > 0;

// ✨ --- FUNÇÕES CRUD PARA PRODUTOS ---
export const listarProdutosSQLite = async (): Promise<Produto[]> => await db.getAllAsync<Produto>('SELECT * FROM produtos ORDER BY descricao ASC');
export const cadastrarProdutoSQLite = async (produto: Produto) => {
    await db.runAsync(
        `INSERT INTO produtos (id, descricao, valor) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET descricao = excluded.descricao, valor = excluded.valor;`,
        produto.id, produto.descricao, produto.valor
    );
};
export const excluirProdutoSQLite = async (idProduto: string) => await db.runAsync('DELETE FROM produtos WHERE id = ?;', idProduto);