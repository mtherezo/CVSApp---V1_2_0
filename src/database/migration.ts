import AsyncStorage from '@react-native-async-storage/async-storage';
// Esta importação agora deve funcionar, pois você restaurou a pasta 'storage'
import { listarClientesAntigos, listarVendasAntigas } from '../storage/asyncStorage.helpers'; 
import { db, inserirCliente } from './sqlite';
import * as Crypto from 'expo-crypto';

const NOME_DA_BANDEIRA_DE_MIGRACAO = 'migracao_sqlite_v1_concluida';

export const executarMigracaoDeDados = async () => {
  try {
    const migracaoJaFeita = await AsyncStorage.getItem(NOME_DA_BANDEIRA_DE_MIGRACAO);
    if (migracaoJaFeita === 'true') {
      // A migração de DADOS para este usuário já foi feita, então não fazemos nada.
      return;
    }
    
    console.log("MIGRAÇÃO DE DADOS: Iniciando migração de dados do AsyncStorage para SQLite...");

    // A transação principal garante que toda a migração seja "tudo ou nada".
    await db.withTransactionAsync(async () => {
      // Lê os dados do sistema antigo (AsyncStorage)
      const clientesAntigos = await listarClientesAntigos();
      const vendasAntigas = await listarVendasAntigas();

      if (clientesAntigos && clientesAntigos.length > 0) {
        console.log(`MIGRAÇÃO DE DADOS: Migrando ${clientesAntigos.length} clientes...`);
        for (const cliente of clientesAntigos) {
          await inserirCliente(cliente);
        }
      }

      if (vendasAntigas && vendasAntigas.length > 0) {
        console.log(`MIGRAÇÃO DE DADOS: Migrando ${vendasAntigas.length} vendas...`);
        for (const venda of vendasAntigas) {
          // Inserimos os dados da venda diretamente aqui para evitar transações aninhadas
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
        }
      }
    });

    // Se a transação foi concluída com sucesso, gravamos a bandeira.
    await AsyncStorage.setItem(NOME_DA_BANDEIRA_DE_MIGRACAO, 'true');
    console.log("MIGRAÇÃO DE DADOS: Migração concluída com sucesso!");

  } catch (error) {
    console.error("MIGRAÇÃO DE DADOS: ERRO CRÍTICO DURANTE A MIGRAÇÃO:", error);
    // Não gravamos a bandeira, permitindo uma nova tentativa na próxima vez que o app abrir.
  }
};