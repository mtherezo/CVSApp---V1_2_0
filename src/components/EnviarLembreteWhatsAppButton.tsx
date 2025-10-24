// src/components/EnviarLembreteWhatsAppButton.tsx
import React from 'react';
import { TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { StyledText as Text } from './StyledText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ItemVenda } from '../types';

interface LembreteWhatsAppProps {
  clienteTelefone?: string; 
  nomeCliente?: string;
  dataDaCompraOriginal: string | Date; 
  valorLembrete: number;
  dataVencimentoLembrete: string | Date; 
  tipoPagamento: 'À Vista' | 'Parcelado';
  numeroParcela?: number; 
  totalParcelas?: number;
  subtotal: number;
  desconto?: number;
  itensVenda?: ItemVenda[];
  style?: StyleProp<ViewStyle>;
}

const EnviarLembreteWhatsAppButton: React.FC<LembreteWhatsAppProps> = ({
  style,
}) => {
  // O botão está sempre desativado, então não precisa de lógica de envio
  const handleEnviarLembrete = () => {};

  return (
    <TouchableOpacity
      style={[styles.botaoLembrete, style, styles.botaoDesativado]}
      onPress={handleEnviarLembrete}
      disabled={true} // sempre desativado
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons
        name="whatsapp"
        size={24}
        color="#AAAAAA" // ícone cinza
      />
      <Text style={[styles.textoBotaoLembrete, { color: '#AAAAAA' }]}>
        Lembrete
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  botaoLembrete: {
    backgroundColor: '#25D366', 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
  },
  botaoDesativado: {
    backgroundColor: '#C1C1C1', // fundo cinza
  },
  textoBotaoLembrete: {
    color: 'white',
    fontSize: 13, 
    fontFamily: 'Roboto-Bold',
    marginLeft: 8,
  },
});

export default EnviarLembreteWhatsAppButton;
