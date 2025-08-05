// app/_layout.tsx
import { Stack, SplashScreen } from "expo-router";
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, Platform, ActivityIndicator } from 'react-native';
import { setupDatabase } from '../src/database/sqlite'; 
import { executarMigracaoDeDados } from '../src/database/migration';
import { useFonts } from 'expo-font';
import { AppProvider, useAppContext } from '../src/contexts/AppContext'; // ✨ Importa o Contexto

// Mantém a tela de splash nativa visível.
SplashScreen.preventAutoHideAsync();

// Componente principal que será envolvido pelo Provedor de Contexto
function MainLayout() {
  const { isDbReady, setIsDbReady } = useAppContext(); // ✨ Usa o contexto para saber se o DB está pronto

  const [fontsLoaded, fontError] = useFonts({
    'NotoSansJP': require('../assets/fonts/NotoSansJP-VariableFont_wght.ttf'),
    'Playwrite': require('../assets/fonts/PlaywriteAUQLD-VariableFont_wght.ttf'),
    'Playwrite-Regular': require('../assets/fonts/PlaywriteAUQLD-Regular.ttf'),
    'Playwrite-Thin': require('../assets/fonts/PlaywriteAUQLD-Thin.ttf'),
  });

  // Efeito para preparar o banco de dados
  useEffect(() => {
    const prepararBancoDeDados = async () => {
      try {
        await setupDatabase();
        await executarMigracaoDeDados();
        console.log("INICIALIZAÇÃO: Banco de dados e migração prontos.");
        setIsDbReady(true); // ✨ Avisa para todo o app que o DB está pronto!
      } catch (error: any) {
        console.error("Falha crítica ao preparar a aplicação:", error);
        // Em um caso real, você poderia navegar para uma tela de erro aqui.
        // Por enquanto, o app ficará em tela de loading.
      }
    };
    
    prepararBancoDeDados();
  }, []); // Roda apenas uma vez

  // Efeito para esconder a splash screen quando TUDO estiver pronto
  useEffect(() => {
    if ((fontsLoaded || fontError) && isDbReady) {
      SplashScreen.hideAsync();
      console.log("INICIALIZAÇÃO: App pronto para iniciar.");
    }
  }, [fontsLoaded, fontError, isDbReady]); // Roda quando fontes OU o DB mudarem de estado

  // Se o banco de dados OU as fontes ainda não estiverem prontos,
  // mostra um loading genérico (a splash screen ainda estará visível por cima).
  if (!isDbReady || (!fontsLoaded && !fontError)) {
    return null; // Retornar null é o ideal enquanto a splash screen está ativa
  }
  
  // Se tudo estiver pronto, renderiza a navegação.
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

// ✨ A exportação padrão agora envolve o MainLayout com o AppProvider
export default function RootLayout() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

// Seus estilos de erro podem ser mantidos, mas a lógica de erro agora
// pode ser gerenciada dentro do MainLayout se preferir.
const styles = StyleSheet.create({
    // ... seus estilos de erro aqui
});