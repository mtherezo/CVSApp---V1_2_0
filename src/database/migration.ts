// src/database/migration.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { 
    db, 
    cadastrarClienteSQLite, 
    cadastrarProdutoSQLite, 
    inserirVendaCompleta as inserirVendaCompletaSQLite, 
    adicionarOuAtualizarUsuarioSQLite 
} from './sqlite';
import { Cliente, Venda, Usuario, Produto } from '../types';
import { Alert } from 'react-native';

// CHAVES ANTIGAS EXATAS QUE VOCÊ ENCONTROU
const CHAVE_CLIENTES_ANTIGA = 'clientes_data';
const CHAVE_PRODUTOS_ANTIGA = '@produtos';
const CHAVE_VENDAS_ANTIGA = 'vendas';
const CHAVE_USUARIOS_ANTIGA = 'user_data'; // A chave do SecureStore

const MIGRATION_FLAG_KEY = 'dados_migrados_para_sqlite_v2'; // Mudei a versão da bandeira para forçar a execução

// --- Funções para ler os dados do sistema antigo ---

const lerClientesAntigos = async (): Promise<Cliente[]> => {
    console.log(`MIGRAÇÃO LOG: A ler clientes da chave AsyncStorage: "${CHAVE_CLIENTES_ANTIGA}"`);
    const dados = await AsyncStorage.getItem(CHAVE_CLIENTES_ANTIGA);
    console.log(`MIGRAÇÃO LOG: Dados brutos de clientes encontrados: ${dados ? 'SIM' : 'NÃO'}`);
    return dados ? JSON.parse(dados) : [];
};

const lerProdutosAntigos = async (): Promise<Produto[]> => {
    console.log(`MIGRAÇÃO LOG: A ler produtos da chave AsyncStorage: "${CHAVE_PRODUTOS_ANTIGA}"`);
    const dados = await AsyncStorage.getItem(CHAVE_PRODUTOS_ANTIGA);
    console.log(`MIGRAÇÃO LOG: Dados brutos de produtos encontrados: ${dados ? 'SIM' : 'NÃO'}`);
    return dados ? JSON.parse(dados) : [];
};

const lerVendasAntigas = async (): Promise<Venda[]> => {
    console.log(`MIGRAÇÃO LOG: A ler vendas da chave AsyncStorage: "${CHAVE_VENDAS_ANTIGA}"`);
    const dados = await AsyncStorage.getItem(CHAVE_VENDAS_ANTIGA);
    console.log(`MIGRAÇÃO LOG: Dados brutos de vendas encontrados: ${dados ? 'SIM' : 'NÃO'}`);
    return dados ? JSON.parse(dados) : [];
};

const lerUsuariosAntigos = async (): Promise<Usuario[]> => {
    console.log(`MIGRAÇÃO LOG: A ler usuários da chave SecureStore: "${CHAVE_USUARIOS_ANTIGA}"`);
    // Lê do SecureStore, que era onde os usuários ficavam
    const dados = await SecureStore.getItemAsync(CHAVE_USUARIOS_ANTIGA);
    console.log(`MIGRAÇÃO LOG: Dados brutos de usuários encontrados: ${dados ? 'SIM' : 'NÃO'}`);
    return dados ? JSON.parse(dados) : [];
};


export const executarMigracaoDeDados = async () => {
  try {
    const migracaoJaFeita = await AsyncStorage.getItem(MIGRATION_FLAG_KEY);
    if (migracaoJaFeita === 'true') {
      console.log("Migração de dados já foi realizada. Nenhuma ação necessária.");
      return;
    }
    
    console.log("MIGRAÇÃO DE DADOS: Iniciando o  processo...");
    
    // LÊ TODOS OS DADOS DE TODOS OS LOCAIS ANTIGOS
    const clientesAntigos = await lerClientesAntigos();
    const produtosAntigos = await lerProdutosAntigos();
    const vendasAntigas = await lerVendasAntigas();
    const usuariosAntigos = await lerUsuariosAntigos();

    if (clientesAntigos.length === 0 && vendasAntigas.length === 0 && produtosAntigos.length === 0 && usuariosAntigos.length === 0) {
        console.log("Nenhum dado antigo encontrado para migrar.");
        await AsyncStorage.setItem(MIGRATION_FLAG_KEY, 'true');
        return;
    }
    
    Alert.alert(
        "Atualizando os Seus Dados", 
        "Estamos organizando tudo para a nova versão do aplicativo. Por favor, aguarde um momento."
    );

    console.log(`MIGRAÇÃO LOG: ENCONTRADO(S): ${clientesAntigos.length} clientes, ${produtosAntigos.length} produtos, ${vendasAntigas.length} vendas, ${usuariosAntigos.length} usuários.`);

    // A transação garante que, se algo der errado, nada é salvo.
    await db.withTransactionAsync(async () => {
      // INSERE TODOS OS DADOS NO NOVO BANCO DE DADOS SQLITE
      for (const cliente of clientesAntigos) {
        await cadastrarClienteSQLite(cliente);
      }
      for (const produto of produtosAntigos) {
        await cadastrarProdutoSQLite(produto);
      }
      for (const venda of vendasAntigas) {
        await inserirVendaCompletaSQLite(venda);
      }
      for (const usuario of usuariosAntigos) {
        await adicionarOuAtualizarUsuarioSQLite(usuario);
      }
    });

    await AsyncStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    console.log("MIGRAÇÃO DE DADOS: Migração concluída com sucesso!");
    Alert.alert("Atualização Concluída!", "Os seus dados foram organizados com sucesso.");

  } catch (error) {
    console.error("MIGRAÇÃO DE DADOS: ERRO CRÍTICO DURANTE A MIGRAÇÃO:", error);
    Alert.alert("Erro na Atualização", "Ocorreu um erro ao atualizar os seus dados. Por favor, contate o suporte.");
  }
};