import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router'; // Importar useRouter
import { useTheme } from '../../src/contexts/ThemeContext'; // Usando seu ThemeContext
import { Ionicons } from '@expo/vector-icons';
import { usePremium } from '../../src/contexts/PremiumContext'; // Importamos o contexto premium

// Componente para um item da lista de benefícios
const BeneficioItem: React.FC<{ text: string }> = ({ text }) => {
  const { colors } = useTheme(); // <-- CORRIGIDO
  const styles = createStyles(colors); // <-- CORRIGIDO

  return (
    <View style={styles.beneficioItem}>
      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
      <Text style={styles.beneficioText}>{text}</Text>
    </View>
  );
};


export default function UpgradeScreen() {
  const { colors } = useTheme(); // <-- CORRIGIDO
  const styles = createStyles(colors); // <-- CORRIGIDO
  const { setPremiumStatus } = usePremium(); // Pegamos a função para atualizar o status
  const router = useRouter(); // Instanciar o router

  // Estado para simular o carregamento da compra
  const [isComprando, setIsComprando] = React.useState(false);

  // --- Função de Compra (Simulação) ---
  const handleCompraSimulada = async () => {
    setIsComprando(true);
    
    // Simula uma chamada de API ou da loja (ex: 2 segundos)
    setTimeout(async () => {
      // 1. Atualiza o status no Contexto (que também salva no AsyncStorage)
      await setPremiumStatus(true); 
      
      // 2. Avisa o usuário (Idealmente, usar um modal/toast)
      console.log("Compra simulada concluída! Status Premium ativado.");
      
      // SUBSTITUIR alert() por um modal ou toast no futuro!
      // Por enquanto, vamos manter o alert para fins de teste.
      alert("Parabéns! Você agora é Premium."); 
      
      setIsComprando(false);
      
      // (Opcional) Navega o usuário de volta após a compra
      if (router.canGoBack()) {
        router.back();
      }
      
    }, 2000);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Stack.Screen options={{ 
        title: 'Seja Premium',
        headerShown: true, // Mostra o cabeçalho
        headerStyle: { backgroundColor: colors.background }, // <-- CORRIGIDO
        headerTintColor: colors.text, // <-- CORRIGIDO
        headerTitleStyle: { color: colors.text }, // <-- CORRIGIDO
      }} />

      <View style={styles.headerIconContainer}>
        <Ionicons name="diamond" size={60} color={colors.primary} />
      </View>

      <Text style={styles.title}>Desbloqueie o CVSApp Completo!</Text>
      <Text style={styles.subtitle}>
        Tenha acesso ilimitado a todas as ferramentas de gestão para o seu negócio.
      </Text>

      {/* Lista de Benefícios */}
      <View style={styles.beneficiosContainer}>
        <BeneficioItem text="Relatórios detalhados" />
        <BeneficioItem text="Backup seguro na nuvem (em breve)" />
        <BeneficioItem text="Cadastro ilimitado de clientes" />
        <BeneficioItem text="Cadastro ilimitado de produtos" />
        <BeneficioItem text="Todas as futuras atualizações" />
      </View>

      {/* Botão de Compra */}
      <Pressable 
        style={({ pressed }) => [
          styles.buyButton, 
          (isComprando || pressed) && styles.buyButtonDisabled
        ]} 
        onPress={handleCompraSimulada}
        disabled={isComprando}
      >
        {isComprando ? (
          <ActivityIndicator size="small" color={colors.background} />
        ) : (
          <Text style={styles.buyButtonText}>Comprar Versão Completa</Text>
        )}
      </Pressable>
      
      <Text style={styles.disclaimer}>
        Pagamento único. Acesso vitalício.
      </Text>

    </ScrollView>
  );
}

// Criando os estilos dinamicamente fora do componente
// CORRIGIDO: A função agora recebe 'colors' (o objeto) em vez de 'theme' (a string)
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 50,
    alignItems: 'center',
  },
  headerIconContainer: {
    marginBottom: 20,
    marginTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted || colors.text, // (fallback)
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  beneficiosContainer: {
    width: '100%',
    marginBottom: 30,
  },
  beneficioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  beneficioText: {
    fontSize: 17,
    color: colors.text,
    marginLeft: 12,
  },
  buyButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 50,
  },
  buyButtonDisabled: {
    backgroundColor: colors.primaryMuted || colors.primary, // (fallback)
  },
  buyButtonText: {
    color: colors.background,
    fontSize: 17,
    fontWeight: 'bold',
  },
  disclaimer: {
    fontSize: 14,
    color: colors.textMuted || colors.text, // (fallback)
    marginTop: 15,
  }
});

