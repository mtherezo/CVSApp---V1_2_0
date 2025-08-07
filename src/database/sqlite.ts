import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Cliente, Venda, Pagamento, ItemVenda, Usuario, Produto } from '../types';

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
                    `CREATE TABLE IF NOT EXISTS pagamentos (id TEXT PRIMARY KEY NOT NULL, idVenda TEXT NOT NULL, valorPago REAL NOT NULL, FOREIGN KEY (idVenda) REFERENCES vendas (id) ON DELETE CASCADE);`,
                    `CREATE TABLE IF NOT EXISTS usuarios (username TEXT PRIMARY KEY NOT NULL, passwordHash TEXT NOT NULL);`,
                ],
            },
            { version: 2, queries: [ `ALTER TABLE clientes ADD COLUMN endereco TEXT;` ] },
            { version: 3, queries: [ `CREATE TABLE IF NOT EXISTS produtos (id TEXT PRIMARY KEY NOT NULL, descricao TEXT NOT NULL UNIQUE, valor REAL NOT NULL);` ] },
            { version: 4, queries: [ `ALTER TABLE pagamentos ADD COLUMN dataPagamento TEXT;` ] },
            { version: 5, queries: [ `ALTER TABLE produtos ADD COLUMN marca TEXT;` ] },
            {
                version: 6,
                queries: [
                    `ALTER TABLE produtos ADD COLUMN codigo TEXT;`,
                    `ALTER TABLE produtos ADD COLUMN quantidadeEstoque INTEGER DEFAULT 0;`,
                    `ALTER TABLE produtos ADD COLUMN fotoUri TEXT;`
                ],
            },
            {
                version: 7,
                queries: [
                    `ALTER TABLE itens_venda ADD COLUMN idProduto TEXT;`
                ],
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

// --- Funções de Migração de Dados (se necessário) ---
export const inserirVendaCompleta = async (venda: Venda) => {
    await db.withTransactionAsync(async () => {
        await db.runAsync(
            'INSERT INTO vendas (id, idCliente, clienteNome, clienteTelefone, dataVenda, valorTotal, subtotal, desconto, tipoPagamento, parcelasTotais, parcelasPagas, dataPrimeiraParcela) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
            venda.id, venda.idCliente, venda.clienteNome, venda.clienteTelefone || null, venda.dataVenda, venda.valorTotal, venda.subtotal || null, venda.desconto || null, venda.tipoPagamento, venda.parcelasTotais || null, venda.parcelasPagas || null, venda.dataPrimeiraParcela || null
        );
        if (venda.itens) {
            for (const item of venda.itens) {
                await db.runAsync('INSERT INTO itens_venda (id, idVenda, idProduto, descricao, quantidade, valor) VALUES (?, ?, ?, ?, ?, ?);',
                    item.id || Crypto.randomUUID(), venda.id, item.idProduto || null, item.descricao, item.quantidade, item.valor);
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
export const cadastrarVendaSQLite = async (venda: Omit<Venda, 'id' | 'clienteNome' | 'clienteTelefone' | 'itens' | 'pagamentos'> & { idCliente: string, itens: ItemVenda[] }): Promise<Venda> => {
    const cliente = await buscarClientePorIdSQLite(venda.idCliente);
    if (!cliente) throw new Error("Cliente não encontrado para realizar a venda.");
    const novaVenda: Venda = { ...venda, id: Crypto.randomUUID(), clienteNome: cliente.nome, clienteTelefone: cliente.telefone, itens: venda.itens, pagamentos: [] };
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
                await db.runAsync('INSERT INTO itens_venda (id, idVenda, idProduto, descricao, quantidade, valor) VALUES (?, ?, ?, ?, ?, ?);', item.id || Crypto.randomUUID(), venda.id, item.idProduto || null, item.descricao, item.quantidade, item.valor);
            }
        }
    });
};
export const listarTodasVendasSQLite = async (): Promise<Venda[]> => {
    const vendas = await db.getAllAsync<Venda>('SELECT * FROM vendas ORDER BY dataVenda DESC');
    if (vendas.length === 0) return [];
    const vendaIds = vendas.map(v => v.id);
    const placeholders = vendaIds.map(() => '?').join(',');
    const todosItens = await db.getAllAsync<ItemVenda>(`SELECT iv.*, p.fotoUri FROM itens_venda iv LEFT JOIN produtos p ON iv.idProduto = p.id WHERE iv.idVenda IN (${placeholders})`, ...vendaIds);
    const todosPagamentos = await db.getAllAsync<Pagamento>(`SELECT * FROM pagamentos WHERE idVenda IN (${placeholders})`, ...vendaIds);
    return vendas.map(venda => ({ ...venda, itens: todosItens.filter(item => item.idVenda === venda.id), pagamentos: todosPagamentos.filter(p => p.idVenda === venda.id) }));
};
export const listarVendasPorClienteSQLite = async (idCliente: string): Promise<Venda[]> => {
    const vendas = await db.getAllAsync<Venda>('SELECT * FROM vendas WHERE idCliente = ? ORDER BY dataVenda DESC', idCliente);
    if (vendas.length === 0) return [];
    const vendaIds = vendas.map(v => v.id);
    const placeholders = vendaIds.map(() => '?').join(',');
    const todosItens = await db.getAllAsync<ItemVenda>(`SELECT iv.*, p.fotoUri FROM itens_venda iv LEFT JOIN produtos p ON iv.idProduto = p.id WHERE iv.idVenda IN (${placeholders})`, ...vendaIds);
    const todosPagamentos = await db.getAllAsync<Pagamento>(`SELECT * FROM pagamentos WHERE idVenda IN (${placeholders})`, ...vendaIds);
    return vendas.map(venda => ({ ...venda, itens: todosItens.filter(item => item.idVenda === venda.id), pagamentos: todosPagamentos.filter(p => p.idVenda === venda.id) }));
};
export const listarVendaPorIdSQLite = async (idVenda: string): Promise<Venda | null> => {
    const venda = await db.getFirstAsync<Venda>('SELECT * FROM vendas WHERE id = ?', idVenda);
    if (venda) {
        venda.itens = await db.getAllAsync<ItemVenda>(`SELECT iv.*, p.fotoUri FROM itens_venda iv LEFT JOIN produtos p ON iv.idProduto = p.id WHERE iv.idVenda = ?`, idVenda);
        venda.pagamentos = await db.getAllAsync<Pagamento>('SELECT * FROM pagamentos WHERE idVenda = ? ORDER BY dataPagamento ASC', idVenda);
    }
    return venda;
};
export const listarVendasPorPeriodoSQLite = async (dataInicio: string, dataFim: string): Promise<Venda[]> => {
    const vendas = await db.getAllAsync<Venda>('SELECT * FROM vendas WHERE dataVenda >= ? AND dataVenda <= ? ORDER BY dataVenda DESC', dataInicio, dataFim);
    if (vendas.length === 0) return [];
    const vendaIds = vendas.map(v => v.id);
    const placeholders = vendaIds.map(() => '?').join(',');
    const todosItens = await db.getAllAsync<ItemVenda>(`SELECT iv.*, p.fotoUri FROM itens_venda iv LEFT JOIN produtos p ON iv.idProduto = p.id WHERE iv.idVenda IN (${placeholders})`, ...vendaIds);
    const todosPagamentos = await db.getAllAsync<Pagamento>(`SELECT * FROM pagamentos WHERE idVenda IN (${placeholders})`, ...vendaIds);
    return vendas.map(venda => ({ ...venda, itens: todosItens.filter(item => item.idVenda === venda.id), pagamentos: todosPagamentos.filter(p => p.idVenda === venda.id) }));
};
export const registrarPagamentoSQLite = async (idVenda: string, valor: number, dataPagamento: string) => await db.runAsync('INSERT INTO pagamentos (id, idVenda, dataPagamento, valorPago) VALUES (?, ?, ?, ?);', Crypto.randomUUID(), idVenda, dataPagamento, valor);
export const excluirPagamentoSQLite = async (idPagamento: string) => await db.runAsync('DELETE FROM pagamentos WHERE id = ?;', idPagamento);
export const listarPagamentosSQLite = async (idVenda: string): Promise<Pagamento[]> => await db.getAllAsync<Pagamento>('SELECT * FROM pagamentos WHERE idVenda = ? ORDER BY dataPagamento ASC', idVenda);
export const atualizarVendaSQLite = async (venda: Partial<Pick<Venda, 'id' | 'parcelasPagas'>>) => {
    if (venda.id && venda.parcelasPagas !== undefined) {
        await db.runAsync('UPDATE vendas SET parcelasPagas = ? WHERE id = ?;', venda.parcelasPagas, venda.id);
    }
};
export const buscarVendasComVencimentoHojeSQLite = async (): Promise<Venda[]> => {
    const hoje = new Date().toISOString().split('T')[0];
    const query = `
        SELECT * FROM vendas 
        WHERE 
            ( tipoPagamento = 'Parcelado' AND DATE(dataPrimeiraParcela, '+' || (parcelasPagas) || ' month') = DATE(?) ) 
            OR 
            ( tipoPagamento = 'À Vista' AND DATE(dataVenda, '+30 day') = DATE(?) )
    `;
    const vendasIncompletas = await db.getAllAsync<Venda>(query, hoje, hoje);
    if (vendasIncompletas.length === 0) return [];
    const vendasCompletas = await Promise.all(vendasIncompletas.map(v => listarVendaPorIdSQLite(v.id)));
    return vendasCompletas.filter((v): v is Venda => {
        if (!v) return false;
        const totalPago = v.pagamentos?.reduce((acc, p) => acc + p.valorPago, 0) || 0;
        return v.valorTotal > totalPago;
    });
};
export const excluirVendaSQLite = async (idVenda: string) => {
    await db.withTransactionAsync(async () => {
        console.log(`EXCLUSÃO LOG: Iniciando exclusão da venda ID: ${idVenda}`);

        // 1. Busca todos os itens da venda que será excluída.
        const itensDaVenda = await db.getAllAsync<ItemVenda>(
            'SELECT idProduto, quantidade FROM itens_venda WHERE idVenda = ?;',
            idVenda
        );
        console.log(`EXCLUSÃO LOG: Encontrados ${itensDaVenda.length} tipos de item para esta venda.`);

        // 2. Loop para devolver cada item ao estoque.
        for (const item of itensDaVenda) {
            // Apenas devolve ao estoque se o item for um produto do catálogo (tiver idProduto)
            if (item.idProduto) {
                console.log(`EXCLUSÃO LOG: Devolvendo ${item.quantidade} unidade(s) do produto ID ${item.idProduto} ao estoque.`);
                // A função 'atualizarEstoqueProdutoSQLite' já soma o valor.
                await atualizarEstoqueProdutoSQLite(item.idProduto, item.quantidade);
            } else {
                console.log(`EXCLUSÃO LOG: Item avulso (sem idProduto), não há estoque para devolver.`);
            }
        }

        // 3. Finalmente, exclui a venda. O 'ON DELETE CASCADE' cuidará de apagar
        // os registros nas tabelas 'itens_venda' e 'pagamentos'.
        console.log(`EXCLUSÃO LOG: Apagando o registro da venda...`);
        await db.runAsync('DELETE FROM vendas WHERE id = ?;', idVenda);
        console.log(`EXCLUSÃO LOG: Venda ${idVenda} excluída com sucesso.`);
    });
};


// --- Funções CRUD para Usuários ---
export const obterTodosUsuariosSQLite = async (): Promise<Usuario[]> => await db.getAllAsync<Usuario>('SELECT * FROM usuarios ORDER BY username ASC;');
export const buscarUsuarioPorUsernameSQLite = async (username: string): Promise<Usuario | null> => await db.getFirstAsync<Usuario>('SELECT * FROM usuarios WHERE username = ? COLLATE NOCASE;', username);
export const adicionarOuAtualizarUsuarioSQLite = async (usuario: Usuario): Promise<void> => {
    await db.runAsync(
        'INSERT INTO usuarios (username, passwordHash) VALUES (?, ?) ON CONFLICT(username) DO UPDATE SET passwordHash = excluded.passwordHash;',
        usuario.username, usuario.passwordHash
    );
};
export const excluirUsuarioSQLite = async (username: string): Promise<boolean> => {
    const result = await db.runAsync('DELETE FROM usuarios WHERE username = ?;', username);
    return result.changes > 0;
};


// --- FUNÇÕES CRUD PARA PRODUTOS ---
export const listarProdutosSQLite = async (): Promise<Produto[]> => await db.getAllAsync<Produto>('SELECT * FROM produtos ORDER BY descricao ASC');
export const cadastrarProdutoSQLite = async (produto: Produto) => {
    await db.runAsync(
        `INSERT INTO produtos (id, descricao, valor, marca, codigo, quantidadeEstoque, fotoUri) 
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET 
            descricao = excluded.descricao, 
            valor = excluded.valor, 
            marca = excluded.marca,
            codigo = excluded.codigo,
            quantidadeEstoque = excluded.quantidadeEstoque,
            fotoUri = excluded.fotoUri;`,
        produto.id, 
        produto.descricao, 
        produto.valor, 
        produto.marca || null,
        produto.codigo || null,
        produto.quantidadeEstoque || 0,
        produto.fotoUri || null
    );
};
export const excluirProdutoSQLite = async (idProduto: string) => await db.runAsync('DELETE FROM produtos WHERE id = ?;', idProduto);
export const buscarProdutoPorIdSQLite = async (idProduto: string): Promise<Produto | null> => {
    return await db.getFirstAsync<Produto>('SELECT * FROM produtos WHERE id = ?;', idProduto);
};
export const atualizarEstoqueProdutoSQLite = async (idProduto: string, quantidadeAlterada: number): Promise<void> => {
    await db.runAsync(
        'UPDATE produtos SET quantidadeEstoque = quantidadeEstoque + ? WHERE id = ?;',
        quantidadeAlterada,
        idProduto
    );
};