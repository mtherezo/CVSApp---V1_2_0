// src/database/migration.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
// Supondo que você criou este arquivo para ler os dados do jeito antigo
import { listarClientesAntigos, listarVendasAntigas } from '../storage/asyncStorage.helpers'; 

// IMPORTA AS FUNÇÕES CORRETAS DO SQLITE
import { db, cadastrarClienteSQLite, inserirVendaCompleta as inserirVendaCompletaSQLite } from './sqlite';
import * as Crypto from 'expo-crypto';

const NOME_DA_BANDEIRA_DE_MIGRACAO = 'migracao_sqlite_v1_concluida';

export const executarMigracaoDeDados = async () => {
  try {
    const migracaoJaFeita = await AsyncStorage.getItem(NOME_DA_BANDEIRA_DE_MIGRACAO);
    if (migracaoJaFeita === 'true') {
      // A migração de DADOS para este usuário já foi feita, então não fazemos nada.
      console.log("Migração de dados já foi realizada. Nenhuma ação necessária.");
      return;
    }
    
    console.log("MIGRAÇÃO DE DADOS: Iniciando migração de dados do AsyncStorage para SQLite...");

    // Lê os dados do sistema antigo (AsyncStorage)
    const clientesAntigos = await listarClientesAntigos();
    const vendasAntigas = await listarVendasAntigas();

    // Se não há absolutamente nenhum dado antigo, não há o que migrar.
    if (clientesAntigos.length === 0 && vendasAntigas.length === 0) {
        console.log("Nenhum dado antigo encontrado para migrar.");
        await AsyncStorage.setItem(NOME_DA_BANDEIRA_DE_MIGRACAO, 'true');
        return;
    }

    // A transação principal garante que toda a migração seja "tudo ou nada".
    await db.withTransactionAsync(async () => {
      if (clientesAntigos && clientesAntigos.length > 0) {
        console.log(`MIGRAÇÃO DE DADOS: Migrando ${clientesAntigos.length} clientes...`);
        for (const cliente of clientesAntigos) {
          // ✨ 2. CHAMA A FUNÇÃO COM O NOME CORRETO
          await cadastrarClienteSQLite(cliente);
        }
      }

      if (vendasAntigas && vendasAntigas.length > 0) {
        console.log(`MIGRAÇÃO DE DADOS: Migrando ${vendasAntigas.length} vendas...`);
        for (const venda of vendasAntigas) {
          // ✨ 3. REFINAMENTO: Usa a função centralizada para inserir a venda completa
          await inserirVendaCompletaSQLite(venda);
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