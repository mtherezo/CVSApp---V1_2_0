import { Stack, SplashScreen } from "expo-router";
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, Platform, ActivityIndicator } from 'react-native';
import { setupDatabase } from '../src/database/sqlite'; 
import { executarMigracaoDeDados } from '../src/database/migration';
import { useFonts } from 'expo-font';
import { AppProvider, useAppContext } from '../src/contexts/AppContext';
import { ThemeProvider } from "../src/contexts/ThemeContext";
import { PremiumProvider } from "../src/contexts/PremiumContext";
import { registerBackgroundTask } from '../src/services/notificationService';

// Mantém a tela de splash nativa visível.
SplashScreen.preventAutoHideAsync();

// Componente principal que será envolvido pelo Provedor de Contexto
function MainLayout() {
  const { isDbReady, setIsDbReady } = useAppContext();

  const [fontsLoaded, fontError] = useFonts({
    'NotoSansJP': require('../assets/fonts/NotoSansJP-VariableFont_wght.ttf'),
    'Playwrite': require('../assets/fonts/PlaywriteAUQLD-VariableFont_wght.ttf'),
    'Playwrite-Regular': require('../assets/fonts/PlaywriteAUQLD-Regular.ttf'),
    'Playwrite-Thin': require('../assets/fonts/PlaywriteAUQLD-Thin.ttf'),
    'Roboto-Regular': require('../assets/fonts/Roboto-Regular.ttf'),
    'Roboto-Bold': require('../assets/fonts/Roboto-Bold.ttf'),
    'Roboto-Black': require('../assets/fonts/Roboto-Black.ttf'),
  });

  // Efeito para preparar o banco de dados e registar a tarefa
  useEffect(() => {
    const prepararApp = async () => {
      try {
        await setupDatabase();
        await executarMigracaoDeDados();
        console.log("INICIALIZAÇÃO: Banco de dados e migração prontos.");
        setIsDbReady(true);
        
        // ✨ 2. Regista a tarefa em segundo plano após o DB estar pronto
        await registerBackgroundTask();

      } catch (error: any) {
        console.error("Falha crítica ao preparar a aplicação:", error);
      }
    };
    
    prepararApp();
  }, []); // Roda apenas uma vez

  // Efeito para esconder a splash screen quando TUDO estiver pronto
  useEffect(() => {
    if ((fontsLoaded || fontError) && isDbReady) {
      SplashScreen.hideAsync();
      console.log("INICIALIZAÇÃO: App pronto para iniciar.");
    }
  }, [fontsLoaded, fontError, isDbReady]);

  if (!isDbReady || (!fontsLoaded && !fontError)) {
    return (
        <View style={styles.loadingContainer}>
            <StatusBar barStyle="light-content" />
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Preparando o aplicativo...</Text>
        </View>
    );
  }
  
  // Se tudo estiver pronto, renderiza a navegação.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="Home" />
      <Stack.Screen name="CadastroInicial" />
      
      {/* Grupo Cliente */}
      <Stack.Screen name="(gcliente)/Clientes" />
      <Stack.Screen name="(gcliente)/Cadastrocliente" />
      <Stack.Screen name="(gcliente)/Vendascliente" />
      <Stack.Screen name="(gcliente)/Parcelasvendacliente" />
      
      {/* Grupo Produto */}
      <Stack.Screen name="(gproduto)/Produtos" />
      
      {/* Grupo Venda */}
      <Stack.Screen name="(gvenda)/Todasvendas" />
      <Stack.Screen name="(gvenda)/Cadastrovenda" />
      <Stack.Screen name="(gvenda)/Pesquisarvendascliente" />
      
      {/* Grupo Relatório */}
      <Stack.Screen name="(grelatorio)/Gerarrelatorios" />
      
      {/* Grupo Configurações */}
      <Stack.Screen name="(gconfig)/Configuracoes" />
      <Stack.Screen name="(gconfig)/Backup" />
      <Stack.Screen name="(gconfig)/Sobre" />
      <Stack.Screen name="(gconfig)/Cadastrousuario" />
      {/*<Stack.Screen name="(gconfig)/AlterarSenha" />*/}
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
        <ThemeProvider>
            <PremiumProvider>
                <MainLayout />
            </PremiumProvider>
        </ThemeProvider>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#190a32',
    },
    loadingText: {
        marginTop: 15,
        color: '#FFFFFF',
        fontSize: 16,
    }
});
