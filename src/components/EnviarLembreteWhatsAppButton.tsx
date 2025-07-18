import React from 'react';
import { TouchableOpacity, Text, Linking, Alert, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface LembreteWhatsAppProps {
  clienteTelefone: string | undefined; 
  nomeCliente: string | undefined;
  dataDaCompraOriginal: string | Date; 
  valorLembrete: number;
  dataVencimentoLembrete: string | Date;
  tipoPagamento: 'À Vista' | 'Parcelado';
  numeroParcela?: number;
  totalParcelas?: number;
  desconto?: number; // ✨ 1. Adicionada a nova propriedade para o desconto
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
  desconto, // ✨ 2. Recebendo a nova propriedade
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

    const dataCompraFormatada = new Date(dataDaCompraOriginal).toLocaleDateString('pt-BR');
    const dataVencimentoFormatada = new Date(dataVencimentoLembrete).toLocaleDateString('pt-BR');

    if (valorLembrete <= 0) {
        Alert.alert("Valor Inválido", "Não há valor pendente para este lembrete.");
        return;
    }

    let tipoLembrete = "sobre o pagamento da sua compra Natura";
    if (tipoPagamento === 'Parcelado') {
        if (numeroParcela && totalParcelas) {
            tipoLembrete = `da sua parcela ${numeroParcela}/${totalParcelas} Natura`;
        } else {
            tipoLembrete = "da sua parcela Natura";
        }
    }

    // ✨ 3. Lógica para montar a mensagem, agora incluindo o desconto
    let mensagem = `Olá ${nomeCliente},\n\n`;
    mensagem += `Estou passando só pra lembrar ${tipoLembrete}, da compra realizada em ${dataCompraFormatada}. `;
    mensagem += `O valor de R$ ${valorLembrete.toFixed(2)} vence em ${dataVencimentoFormatada}.\n`;

    // Adiciona a linha do desconto apenas se ele existir e for maior que zero
    if (desconto && desconto > 0) {
        mensagem += `(Desconto aplicado na compra: R$ ${desconto.toFixed(2)})\n`;
    }

    mensagem += `\nObrigada desde já.`;

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
      <MaterialCommunityIcons name="whatsapp" size={20} color="#FFFFFF" />
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
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default EnviarLembreteWhatsAppButton;