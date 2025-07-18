import { Stack, SplashScreen } from "expo-router";
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, Platform } from 'react-native';

// ✨ Passo 1 da Inicialização: Prepara a ESTRUTURA do banco de dados (tabelas, colunas, etc.)
import { setupDatabase } from '../src/database/sqlite'; 
// ✨ Passo 2 da Inicialização: Migra os DADOS do AsyncStorage para o SQLite (só roda uma vez)
import { executarMigracaoDeDados } from '../src/database/migration';

// Mantém a tela de splash nativa visível enquanto preparamos o app.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appPronto, setAppPronto] = useState(false);
  const [erroSetup, setErroSetup] = useState<string | null>(null);

  useEffect(() => {
    const prepararApp = async () => {
      try {
        // 1. Configura ou migra o SCHEMA do banco de dados para a última versão.
        console.log("INICIALIZAÇÃO: Preparando estrutura do banco de dados...");
        await setupDatabase();
        
        // 2. Executa a migração de DADOS do AsyncStorage (só roda uma vez).
        console.log("INICIALIZAÇÃO: Verificando migração de dados antigos...");
        await executarMigracaoDeDados();

        console.log("INICIALIZAÇÃO: Aplicativo pronto para iniciar.");
        setAppPronto(true);
      } catch (error: any) {
        console.error("Falha crítica ao preparar a aplicação:", error);
        setErroSetup(error.message || "Ocorreu um erro desconhecido ao configurar o app.");
      } finally {
        // Esconde a tela de splash, seja em caso de sucesso ou erro.
        SplashScreen.hideAsync();
      }
    };
    
    prepararApp();
  }, []); // O array vazio [] garante que este efeito rode apenas uma vez.

  if (erroSetup) {
    return (
      <View style={styles.containerErro}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.textoErroTitulo}>Erro Crítico</Text>
        <Text style={styles.textoErro}>Não foi possível iniciar o aplicativo.</Text>
        <Text style={styles.textoErroDetalhe}>{erroSetup}</Text>
      </View>
    );
  }

  if (!appPronto) {
    // Retorna nulo enquanto o app não está pronto, pois a tela de splash está visível.
    return null;
  }

  // Se a aplicação está pronta, renderiza a navegação principal.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* ✨ CORREÇÃO: Os nomes agora correspondem exatamente aos seus arquivos */}
      <Stack.Screen name="index" />
      <Stack.Screen name="Home" />
      <Stack.Screen name="Clientes" />
      <Stack.Screen name="Cadastrocliente" />
      <Stack.Screen name="Cadastrousuario" />
      <Stack.Screen name="Cadastrovenda" />
      <Stack.Screen name="Gerarrelatorios" />
      <Stack.Screen name="Parcelasvendacliente" />
      <Stack.Screen name="Pesquisarvendascliente" />
      <Stack.Screen name="Todasvendas" />
      <Stack.Screen name="Vendascliente" /> 
      <Stack.Screen name="Vendasporclientes" /> 
    </Stack>
  );
}

const styles = StyleSheet.create({
    containerErro: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1c1c1e',
        padding: 20,
    },
    textoErroTitulo: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ff453a',
        marginBottom: 15,
    },
    textoErro: {
        fontSize: 16,
        color: '#aeaeae',
        textAlign: 'center',
    },
    textoErroDetalhe: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        marginTop: 20,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    }
});