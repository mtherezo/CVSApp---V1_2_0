import React from 'react';
import { View, Text, Modal, StyleSheet, SafeAreaView, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext'; // Usando seu ThemeContext
import { Ionicons } from '@expo/vector-icons';

interface ModalBloqueioProps {
  visible: boolean;
  onClose: () => void;
}

export const ModalBloqueio: React.FC<ModalBloqueioProps> = ({ visible, onClose }) => {
  const router = useRouter();
  const { colors } = useTheme(); // <-- CORRIGIDO: Agora pegamos 'colors'

  const handleUpgrade = () => {
    onClose(); 
    router.push('./(gconfig)/Upgrade'); 
  };

  // Estilos dinâmicos baseados no tema
  // (Agora usa 'colors' diretamente)
  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center', 
      alignItems: 'center',
    },
    modalContainer: {
      width: '90%',
      backgroundColor: colors.background, // <-- CORRIGIDO
      borderRadius: 20, 
      padding: 24,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    iconContainer: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: colors.primary, // <-- CORRIGIDO
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text, // <-- CORRIGIDO
      marginBottom: 15,
      textAlign: 'center',
    },
    message: {
      fontSize: 16,
      color: colors.textMuted || colors.text, // <-- CORRIGIDO (com fallback)
      textAlign: 'center',
      marginBottom: 25,
      lineHeight: 22,
    },
    upgradeButton: {
      backgroundColor: colors.primary, // <-- CORRIGIDO
      paddingVertical: 14,
      paddingHorizontal: 30,
      borderRadius: 30,
      width: '100%',
      alignItems: 'center',
      marginBottom: 12,
    },
    upgradeButtonText: {
      color: colors.background, // <-- CORRIGIDO
      fontSize: 16,
      fontWeight: 'bold',
    },
    closeButton: {
      paddingVertical: 10,
    },
    closeButtonText: {
      color: colors.textMuted || colors.text, // <-- CORRIGIDO (com fallback)
      fontSize: 15,
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={styles.modalContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="diamond-outline" size={32} color={colors.background} />
          </View>
          
          <Text style={styles.title}>Funcionalidade Premium</Text>
          <Text style={styles.message}>
            Faça o upgrade para a versão completa e desbloqueie relatórios, backups e muito mais!
          </Text>

          <Pressable style={styles.upgradeButton} onPress={handleUpgrade}>
            <Text style={styles.upgradeButtonText}>Fazer Upgrade Agora</Text>
          </Pressable>

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Agora não</Text>
          </Pressable>

        </Animated.View>
      </View>
    </Modal>
  );
};

