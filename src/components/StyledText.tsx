// src/components/StyledText.tsx
import React from 'react';
import { Text, StyleSheet, TextProps } from 'react-native';

// Este componente recebe todas as propriedades de um Text normal
export function StyledText(props: TextProps) {
  const { style, ...rest } = props;

  // A única responsabilidade deste componente é aplicar a fonte padrão.
  // Qualquer estilo passado (como cor, tamanho, ou outra fontFamily) irá sobrescrevê-lo.
  return (
    <Text 
      style={[
        styles.default, // Aplica o estilo padrão primeiro
        style,          // Depois aplica os estilos que você passar
      ]} 
      {...rest} 
    />
  );
}

const styles = StyleSheet.create({
  default: {
    // Define 'Roboto-Regular' como a fonte padrão para TODO o texto no app.
    fontFamily: 'Roboto-Regular',
  },
});