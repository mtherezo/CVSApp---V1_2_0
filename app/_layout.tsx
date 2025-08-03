// app/_layout.tsx
import { Stack, SplashScreen } from "expo-router";
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, Platform } from 'react-native';
import { setupDatabase } from '../src/database/sqlite'; 
import { executarMigracaoDeDados } from '../src/database/migration';
import { useFonts } from 'expo-font';

// Mantém a tela de splash nativa visível enquanto preparamos o app.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appPronto, setAppPronto] = useState(false);
  const [erroSetup, setErroSetup] = useState<string | null>(null);

  // Carrega as fontes customizadas
  const [fontsLoaded, fontError] = useFonts({
    // os nomes aqui são os que você usará no seu StyleSheet
    'NotoSansJP': require('../assets/fonts/NotoSansJP-VariableFont_wght.ttf'),
    'Playwrite': require('../assets/fonts/PlaywriteAUQLD-VariableFont_wght.ttf'),
    'Playwrite-Regular': require('../assets/fonts/PlaywriteAUQLD-Regular.ttf'),
    'Playwrite-Thin': require('../assets/fonts/PlaywriteAUQLD-Thin.ttf'),
    // Adicionar outras variações que desejar (ex: Italic, SemiBold, etc.)
  });

  useEffect(() => {
    const prepararApp = async () => {
      try {
        // ✨ 3. Agora esperamos por duas coisas: o DB e as fontes.
        // O Promise.all executa as tarefas em paralelo para mais eficiência.
        await Promise.all([
          setupDatabase(),
          executarMigracaoDeDados(),
        ]);
        
        console.log("INICIALIZAÇÃO: Banco de dados e migração prontos.");
        
        // A verificação das fontes acontece separadamente com o hook useFonts
      } catch (error: any) {
        console.error("Falha crítica ao preparar a aplicação:", error);
        setErroSetup(error.message || "Ocorreu um erro desconhecido ao configurar o app.");
      }
    };
    
    prepararApp();
  }, []); // O array vazio [] garante que este efeito rode apenas uma vez.

  // Novo useEffect para reagir ao carregamento das fontes
  useEffect(() => {
    // Se as fontes carregaram ou se deu erro nelas, consideramos essa parte pronta
    if (fontsLoaded || fontError) {
      if (fontError) {
        console.error("Erro ao carregar fontes:", fontError);
        // Decide se quer mostrar um erro crítico ou usar as fontes padrão
        setErroSetup("Não foi possível carregar as fontes customizadas.");
      }
      
      // Marca o app como pronto e esconde a splash screen
      setAppPronto(true);
      SplashScreen.hideAsync();
      console.log("INICIALIZAÇÃO: Fontes carregadas. Aplicativo pronto para iniciar.");
    }
  }, [fontsLoaded, fontError]); // Roda sempre que o estado das fontes mudar

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

  // Se o app (DB + fontes) ainda não está pronto, a splash screen continua visível
  if (!appPronto) {
    return null;
  }

  // Se a aplicação está pronta, renderiza a navegação principal.
  return (
    <Stack screenOptions={{ headerShown: false }}>
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
      <Stack.Screen name="Produtos" />
      <Stack.Screen name="Configuracoes" />
      <Stack.Screen name="Sobre" />
      <Stack.Screen name="Backup" />
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