// src/theme/commonStyles.ts
import { StyleSheet } from 'react-native';

export const commonStyles = StyleSheet.create({
  // Estilo de input padrão para todo o app
  input: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 15,
    fontFamily: 'Roboto-Regular', // ✨ Adiciona a fonte aqui
  },
    // Adicionar outros estilos comuns aqui (botões, cards, etc.)
  
  loadingText: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
  },  
  inputCadcli: {
        flex: 1,
        paddingVertical: 14,
        paddingRight: 15,
        fontSize: 16,
        color: '#FFFFFF',
        fontFamily: 'Roboto-Regular',
  },
  
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
    marginRight: 40,
  },
  actionButtonTextcli: {
    color: 'white',
    fontSize: 17, 
    fontFamily: 'Roboto-Bold',
    marginLeft: 10,
  },
  loginButtonText: { color: "white", fontSize: 17,  marginLeft: 10,fontFamily: 'Roboto-Bold', },
});