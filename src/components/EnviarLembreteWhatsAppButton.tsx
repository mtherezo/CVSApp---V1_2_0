// src/components/EnviarLembreteWhatsAppButton.tsx
import React from 'react';
import { TouchableOpacity, Linking, Alert, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { StyledText as Text } from './StyledText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ItemVenda } from '../types';

interface LembreteWhatsAppProps {
  clienteTelefone: string | undefined; 
  nomeCliente: string | undefined;
  dataDaCompraOriginal: string | Date; 
  valorLembrete: number;
  dataVencimentoLembrete: string | Date; // Esta será a data da PRIMEIRA parcela
  tipoPagamento: 'À Vista' | 'Parcelado';
  numeroParcela?: number; // Ex: 2 (para a segunda parcela)
  totalParcelas?: number;
  subtotal: number;
  desconto?: number;
  itensVenda?: ItemVenda[];
  style?: StyleProp<ViewStyle>;
}

const EnviarLembreteWhatsAppButton: React.FC<LembreteWhatsAppProps> = ({
  clienteTelefone,
  nomeCliente,
  dataDaCompraOriginal,
  valorLembrete,
  dataVencimentoLembrete,
  tipoPagamento,
  numeroParcela,
  totalParcelas,
  subtotal,
  desconto,
  itensVenda,
  style,
}) => {
  const formatarTelefone = (telefoneInput: string): string => {
    let numeroLimpo = telefoneInput.replace(/\D/g, '');
    if (numeroLimpo.startsWith('55') && (numeroLimpo.length === 12 || numeroLimpo.length === 13)) {
      return numeroLimpo;
    }
    if (numeroLimpo.length === 10 || numeroLimpo.length === 11) { 
     return '55' + numeroLimpo;
    }
    console.warn("Número de telefone em formato não esperado:", telefoneInput);
    return ''; 
  };

  const handleEnviarLembrete = async () => {
    if (!clienteTelefone || !nomeCliente) {
      Alert.alert("Dados Incompletos", "Telefone ou nome do cliente não disponível.");
      return;
    }

    const telefoneFormatado = formatarTelefone(clienteTelefone);
    if (!telefoneFormatado) {
        Alert.alert("Erro de Formato", "O telefone do cliente não pôde ser formatado corretamente. Verifique o cadastro.");
        return;
    }

    // LÓGICA DE CÁLCULO DA DATA DE VENCIMENTO CORRETA
    let dataVencimentoFinal = new Date(dataVencimentoLembrete);
    if (tipoPagamento === 'Parcelado' && numeroParcela && numeroParcela > 1) {
        // Cria a data base a partir da primeira parcela
        const dataBase = new Date(dataVencimentoLembrete);
        // Adiciona os meses necessários (se a parcela é a 2ª, adiciona 1 mês, etc.)
        dataBase.setMonth(dataBase.getMonth() + (numeroParcela - 1));
        dataVencimentoFinal = dataBase;
    }

    const dataCompraFormatada = new Date(dataDaCompraOriginal).toLocaleDateString('pt-BR');
    const dataVencimentoFormatada = dataVencimentoFinal.toLocaleDateString('pt-BR');

    if (valorLembrete <= 0) {
        Alert.alert("Valor Inválido", "Não há valor pendente para este lembrete.");
        return;
    }

    let resumoProdutos = '';
    if (itensVenda && itensVenda.length > 0) {
        resumoProdutos = '*Resumo da sua compra:*\n' + itensVenda.map(item => {
            const marca = item.marca ? ` (${item.marca})` : '';
            return `- ${item.quantidade}x ${item.descricao}${marca}`;
        }).join('\n');
    }

    let tipoLembrete = "sobre o pagamento da sua compra";
    if (tipoPagamento === 'Parcelado') {
        if (numeroParcela && totalParcelas) {
            tipoLembrete = `da sua parcela ${numeroParcela}/${totalParcelas}`;
        } else {
            tipoLembrete = "da sua parcela";
        }
    }

    let mensagem = `Olá ${nomeCliente}!\n\n`;
    mensagem += `Estou passando para lembrar ${tipoLembrete} realizada em *${dataCompraFormatada}*.\n\n`;
    
    if (resumoProdutos) {
        mensagem += `${resumoProdutos}\n\n`;
    }

    mensagem += `O valor de *R$ ${valorLembrete.toFixed(2)}* vence em *${dataVencimentoFormatada}*.\n\n`;
    mensagem += `Obrigada desde já! 😊`;

    const mensagemCodificada = encodeURIComponent(mensagem);
    const url = `whatsapp://send?phone=${telefoneFormatado}&text=${mensagemCodificada}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Erro", "Não foi possível abrir o WhatsApp. Verifique se o aplicativo está instalado.");
      }
    } catch (error) {
      Alert.alert("Erro", "Ocorreu um problema ao tentar enviar o lembrete.");
    }
  };

  return (
    <TouchableOpacity style={[styles.botaoLembrete, style]} onPress={handleEnviarLembrete}>
      <MaterialCommunityIcons name="whatsapp" size={24} color="#FFFFFF" />
      <Text style={styles.textoBotaoLembrete}>Lembrete</Text>
   </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  botaoLembrete: {
    backgroundColor: '#25D366', 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotaoLembrete: {
    color: 'white',
    fontSize: 13, 
    fontFamily: 'Roboto-Bold',
    marginLeft: 8,
  },
});

export default EnviarLembreteWhatsAppButton;


