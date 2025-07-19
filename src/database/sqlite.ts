import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Cliente, Venda, Pagamento, ItemVenda, Usuario } from '../types';

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
    await db.runAsync(
        `INSERT INTO clientes (id, nome, telefone, email, endereco) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
         nome = excluded.nome,
         telefone = excluded.telefone,
         email = excluded.email,
         endereco = excluded.endereco;`,
        cliente.id,
        cliente.nome,
        cliente.telefone || null,
        cliente.email || null,
        cliente.endereco || null
    );
};

export const excluirClienteSQLite = async (idCliente: string) => await db.runAsync('DELETE FROM clientes WHERE id = ?;', idCliente);

export const buscarClientePorIdSQLite = async (id: string): Promise<Cliente | null> => await db.getFirstAsync<Cliente>('SELECT * FROM clientes WHERE id = ?;', id);

export const pesquisarClientesPorNomeSQLite = async (termo: string): Promise<Cliente[]> => {
  const termoLike = `%${termo}%`;
  return await db.getAllAsync<Cliente>(
    'SELECT * FROM clientes WHERE nome LIKE ? ORDER BY nome ASC;',
    termoLike
  );
};

// --- Funções CRUD para Vendas e Pagamentos ---
export const cadastrarVendaSQLite = async (venda: Omit<Venda, 'id' | 'clienteNome' | 'clienteTelefone' | 'itens' | 'pagamentos'> & { idCliente: string, itens: Omit<ItemVenda, 'idVenda'>[] }): Promise<Venda> => {
    const cliente = await buscarClientePorIdSQLite(venda.idCliente);
    if (!cliente) throw new Error("Cliente não encontrado para realizar a venda.");

    const novaVenda: Venda = {
        subtotal: venda.subtotal,
        valorTotal: venda.valorTotal,
        dataVenda: venda.dataVenda,
        tipoPagamento: venda.tipoPagamento,
        desconto: venda.desconto,
        parcelasTotais: venda.parcelasTotais,
        parcelasPagas: venda.parcelasPagas,
        dataPrimeiraParcela: venda.dataPrimeiraParcela,
        id: Crypto.randomUUID(),
        idCliente: venda.idCliente,
        clienteNome: cliente.nome,
        clienteTelefone: cliente.telefone,
        itens: venda.itens as ItemVenda[],
        pagamentos: [],
    };
    
    await inserirVendaCompleta(novaVenda);
    return novaVenda;
};

export const listarTodasVendasSQLite = async (): Promise<Venda[]> => {
    const vendas = await db.getAllAsync<Venda>('SELECT * FROM vendas ORDER BY dataVenda DESC');
    if (vendas.length === 0) return [];
    
    const vendaIds = vendas.map(v => v.id);
    const placeholders = vendaIds.map(() => '?').join(',');

    const todosItens = await db.getAllAsync<ItemVenda>(`SELECT * FROM itens_venda WHERE idVenda IN (${placeholders})`, ...vendaIds);
    const todosPagamentos = await db.getAllAsync<Pagamento>(`SELECT * FROM pagamentos WHERE idVenda IN (${placeholders})`, ...vendaIds);

    return vendas.map(venda => ({
        ...venda,
        itens: todosItens.filter(item => item.idVenda && item.idVenda === venda.id),
        pagamentos: todosPagamentos.filter(pagamento => pagamento.idVenda && pagamento.idVenda === venda.id)
    }));
};

export const listarVendasPorClienteSQLite = async (idCliente: string): Promise<Venda[]> => {
    const vendas = await db.getAllAsync<Venda>('SELECT * FROM vendas WHERE idCliente = ? ORDER BY dataVenda DESC', idCliente);
    if (vendas.length === 0) return [];

    const vendaIds = vendas.map(v => v.id);
    const placeholders = vendaIds.map(() => '?').join(',');

    const todosItens = await db.getAllAsync<ItemVenda>(`SELECT * FROM itens_venda WHERE idVenda IN (${placeholders})`, ...vendaIds);
    const todosPagamentos = await db.getAllAsync<Pagamento>(`SELECT * FROM pagamentos WHERE idVenda IN (${placeholders})`, ...vendaIds);
    
    return vendas.map(venda => ({
        ...venda,
        itens: todosItens.filter(item => item.idVenda && item.idVenda === venda.id),
        pagamentos: todosPagamentos.filter(pagamento => pagamento.idVenda && pagamento.idVenda === venda.id)
    }));
};

export const listarVendaPorIdSQLite = async (idVenda: string): Promise<Venda | null> => {
    const venda = await db.getFirstAsync<Venda>('SELECT * FROM vendas WHERE id = ?', idVenda);
    if (venda) {
        venda.itens = await db.getAllAsync<ItemVenda>('SELECT * FROM itens_venda WHERE idVenda = ?', venda.id);
        venda.pagamentos = await db.getAllAsync<Pagamento>('SELECT * FROM pagamentos WHERE idVenda = ?', venda.id);
    }
    return venda;
};

// ✨ NOVA FUNÇÃO ADICIONADA PARA O RELATÓRIO
export const listarVendasPorPeriodoSQLite = async (dataInicio: string, dataFim: string): Promise<Venda[]> => {
    const vendas = await db.getAllAsync<Venda>(
        'SELECT * FROM vendas WHERE dataVenda >= ? AND dataVenda <= ? ORDER BY dataVenda DESC',
        dataInicio,
        dataFim
    );

    if (vendas.length === 0) return [];
    
    const vendaIds = vendas.map(v => v.id);
    const placeholders = vendaIds.map(() => '?').join(',');

    const todosItens = await db.getAllAsync<ItemVenda>(`SELECT * FROM itens_venda WHERE idVenda IN (${placeholders})`, ...vendaIds);
    const todosPagamentos = await db.getAllAsync<Pagamento>(`SELECT * FROM pagamentos WHERE idVenda IN (${placeholders})`, ...vendaIds);

    return vendas.map(venda => ({
        ...venda,
        itens: todosItens.filter(item => item.idVenda && item.idVenda === venda.id),
        pagamentos: todosPagamentos.filter(pagamento => pagamento.idVenda && pagamento.idVenda === venda.id)
    }));
};

export const excluirVendaSQLite = async (idVenda: string) => await db.runAsync('DELETE FROM vendas WHERE id = ?;', idVenda);

export const registrarPagamentoSQLite = async (idVenda: string, valor: number, dataPagamento: string) => {
    const pagamentoId = Crypto.randomUUID();
    await db.runAsync('INSERT INTO pagamentos (id, idVenda, dataPagamento, valorPago) VALUES (?, ?, ?, ?);', pagamentoId, idVenda, dataPagamento, valor);
};

export const excluirPagamentoSQLite = async (idPagamento: string) => await db.runAsync('DELETE FROM pagamentos WHERE id = ?;', idPagamento);

export const atualizarVendaSQLite = async (venda: Pick<Venda, 'id' | 'parcelasPagas'>) => {
    await db.runAsync(
        'UPDATE vendas SET parcelasPagas = ? WHERE id = ?;',
        venda.parcelasPagas || 0,
        venda.id
    );
};

// --- Funções CRUD para Usuários ---
export const cadastrarUsuarioSQLite = async (usuario: Usuario) => {
    await db.runAsync(
        'INSERT INTO usuarios (username, passwordHash) VALUES (?, ?);',
        usuario.username,
        usuario.passwordHash
    );
};

export const buscarUsuarioPorUsernameSQLite = async (username: string): Promise<Usuario | null> => {
    return await db.getFirstAsync<Usuario>(
        'SELECT * FROM usuarios WHERE username = ?;',
        username
    );
};

export const excluirUsuarioSQLite = async (username: string): Promise<boolean> => {
    const result = await db.runAsync('DELETE FROM usuarios WHERE username = ?;', username);
    return result.changes > 0;
};