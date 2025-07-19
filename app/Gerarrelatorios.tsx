import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, ImageBackground, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import { Venda } from '../src/types';
import { listarVendasPorPeriodoSQLite } from '../src/database/sqlite';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

export default function GerarRelatoriosScreen() {
  const [isLoadingPDF, setIsLoadingPDF] = useState(false);
  const [isLoadingXLSX, setIsLoadingXLSX] = useState(false);
  const router = useRouter();

  const [dataInicio, setDataInicio] = useState<Date | null>(null);
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<'inicio' | 'fim' | null>(null);

  const calcularValorPagoVenda = (venda: Venda): number => {
    return venda.pagamentos?.reduce((acc, p) => acc + p.valorPago, 0) || 0;
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentDate = selectedDate || (showDatePicker === 'inicio' ? dataInicio : dataFim);
    setShowDatePicker(null);
    if (event.type === 'set' && currentDate) {
      if (showDatePicker === 'inicio') {
        setDataInicio(currentDate);
      } else {
        setDataFim(currentDate);
      }
    }
  };

  const fetchVendasDoPeriodo = async (): Promise<Venda[] | null> => {
    if (!dataInicio || !dataFim) {
      Alert.alert("Atenção", "Por favor, selecione uma data de início e uma data de fim.");
      return null;
    }
    if (dataInicio > dataFim) {
      Alert.alert("Erro", "A data de início não pode ser posterior à data de fim.");
      return null;
    }
    const inicioDoDia = new Date(dataInicio.setHours(0, 0, 0, 0));
    const fimDoDia = new Date(dataFim.setHours(23, 59, 59, 999));
    const vendas = await listarVendasPorPeriodoSQLite(inicioDoDia.toISOString(), fimDoDia.toISOString());
    if (vendas.length === 0) {
      Alert.alert("Relatório Vazio", "Nenhuma venda encontrada no período selecionado.");
      return null;
    }
    return vendas;
  };
  
  const gerarConteudoHTML = (vendas: Venda[], dataInicio: Date, dataFim: Date): string => {
    let valorTotalGeralVendido = 0;
    let valorTotalGeralPago = 0;
    
    const vendasPorCliente = vendas.reduce((acc, venda) => {
        const id = venda.idCliente;
        if (!acc[id]) {
          acc[id] = { clienteNome: venda.clienteNome, clienteTelefone: venda.clienteTelefone, vendas: [] };
        }
        acc[id].vendas.push(venda);
        return acc;
      }, {} as Record<string, { clienteNome: string; clienteTelefone?: string | null; vendas: Venda[] }>);

      const clientesComVendasCount = Object.keys(vendasPorCliente).length;

      let corpoTabela = '';
      for (const idCliente in vendasPorCliente) {
        const dadosCliente = vendasPorCliente[idCliente];
        corpoTabela += `<div class="cliente-bloco"><h3>Cliente: ${dadosCliente.clienteNome}</h3>`;
        if (dadosCliente.clienteTelefone) corpoTabela += `<p>Telefone: ${dadosCliente.clienteTelefone}</p>`;
        
        let subtotalVendidoCliente = 0;
        let subtotalPagoCliente = 0;

        corpoTabela += `<table><thead><tr><th>Data</th><th>Itens</th><th>Total</th><th>Pago</th><th>Pendente</th></tr></thead><tbody>`;
        for (const venda of dadosCliente.vendas) {
            const valorPagoVenda = calcularValorPagoVenda(venda);
            subtotalVendidoCliente += venda.valorTotal;
            subtotalPagoCliente += valorPagoVenda;
            valorTotalGeralVendido += venda.valorTotal;
            valorTotalGeralPago += valorPagoVenda;
            const itensHtml = venda.itens?.map(p => `${p.quantidade}x ${p.descricao}`).join('<br>') || 'N/A';
            corpoTabela += `<tr><td>${new Date(venda.dataVenda).toLocaleDateString('pt-BR')}</td><td>${itensHtml}</td><td class="text-right">R$ ${venda.valorTotal.toFixed(2)}</td><td class="text-right">R$ ${valorPagoVenda.toFixed(2)}</td><td class="text-right">R$ ${(venda.valorTotal - valorPagoVenda).toFixed(2)}</td></tr>`;
        }
        corpoTabela += `</tbody></table>`;
        corpoTabela += `<div class="subtotal-cliente"><p><strong>Subtotal para ${dadosCliente.clienteNome}:</strong> Vendido: R$ ${subtotalVendidoCliente.toFixed(2)} | Recebido: R$ ${subtotalPagoCliente.toFixed(2)}</p></div></div>`; 
      }

      const valorTotalGeralPendente = valorTotalGeralVendido - valorTotalGeralPago;
      const resumoGeralHtml = `
        <div class="resumo-geral">
          <h2>Resumo Geral do Período</h2>
          <p><strong>Período:</strong> ${dataInicio.toLocaleDateString('pt-BR')} até ${dataFim.toLocaleDateString('pt-BR')}</p>
          <p>Total de Clientes com Vendas: ${clientesComVendasCount}</p>
          <p class="total-geral"><strong>Valor Total Vendido: R$ ${valorTotalGeralVendido.toFixed(2)}</strong></p>
          <p class="total-geral"><strong>Total Geral Recebido: R$ ${valorTotalGeralPago.toFixed(2)}</strong></p>
          <p class="total-geral"><strong>Total Geral Pendente: R$ ${valorTotalGeralPendente.toFixed(2)}</strong></p>
        </div>
      `;
    
    return `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; } h1 { color: #6200EE; text-align: center; } h2 { color: #3700B3; border-bottom: 1px solid #ccc; padding-bottom: 5px; } h3 { color: #444; } table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.9em; } th, td { border: 1px solid #ddd; padding: 6px; text-align: left; } th { background-color: #f2f2f2; } .resumo-geral { background-color: #e9e0ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; } .cliente-bloco { page-break-inside: avoid; margin-bottom: 20px; } .text-right { text-align: right; } .total-geral {font-size: 1.1em;}
          </style>
        </head>
        <body>
          <h1>Relatório Consolidado de Vendas</h1>
          ${resumoGeralHtml}
          <h2>Detalhes por Cliente</h2>
          ${corpoTabela}
        </body>
      </html>
    `;
  };

  const handleGerarPDF = async () => {
    setIsLoadingPDF(true);
    try {
        const vendas = await fetchVendasDoPeriodo();
        if (!vendas) {
            setIsLoadingPDF(false); // Garante que o loading para se a função retornar
            return;
        }

        const html = gerarConteudoHTML(vendas, dataInicio!, dataFim!);
        const { uri: tempUri } = await Print.printToFileAsync({ html });

        // ✨ CORREÇÃO: Define um novo nome e caminho para o arquivo
        const novoNome = `Relatorio-Vendas-${dataInicio!.toISOString().split('T')[0]}.pdf`;
        const novoUri = FileSystem.cacheDirectory + novoNome;

        // Move o arquivo temporário para o novo caminho com o nome correto
        await FileSystem.moveAsync({
            from: tempUri,
            to: novoUri,
        });

        // Compartilha o arquivo a partir do novo caminho
        await Sharing.shareAsync(novoUri, { mimeType: 'application/pdf', dialogTitle: 'Compartilhar Relatório PDF' });
        
    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        Alert.alert("Erro", "Não foi possível gerar o relatório PDF.");
    } finally {
        setIsLoadingPDF(false);
    }
};

  const handleGerarXLSX = async () => {
    setIsLoadingXLSX(true);
    try {
        const vendas = await fetchVendasDoPeriodo();
        if (!vendas) return;

        const dadosParaPlanilha = vendas.map(venda => {
            const valorPago = calcularValorPagoVenda(venda);
            return {
                'Nome do Cliente': venda.clienteNome, 'Telefone': venda.clienteTelefone, 'Data da Venda': new Date(venda.dataVenda), 'Itens': venda.itens?.map(p => `${p.quantidade}x ${p.descricao}`).join('; '), 'Subtotal': venda.subtotal, 'Desconto': venda.desconto || 0, 'Valor Total': venda.valorTotal, 'Valor Pago': valorPago, 'Saldo Devedor': venda.valorTotal - valorPago, 'Status': (venda.valorTotal - valorPago) <= 0.001 ? 'Quitada' : 'Pendente'
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(dadosParaPlanilha);
        worksheet['!cols'] = [ { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 40 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 } ];
        
        // Formata a coluna de data
        dadosParaPlanilha.forEach((_, index) => {
            const cellRef = XLSX.utils.encode_cell({c: 2, r: index + 1}); // Coluna 'C' (Data da Venda)
            if(worksheet[cellRef]) {
                worksheet[cellRef].t = 'd';
                worksheet[cellRef].z = 'dd/mm/yyyy';
            }
        });

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Vendas");
        const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
        
        const fileName = `RelatorioVendas_${dataInicio!.toISOString().split('T')[0]}_a_${dataFim!.toISOString().split('T')[0]}.xlsx`;
        const fileUri = (FileSystem.cacheDirectory || FileSystem.documentDirectory) + fileName;
        await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: FileSystem.EncodingType.Base64 });
        
        await Sharing.shareAsync(fileUri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dialogTitle: 'Compartilhar Relatório Excel', UTI: 'com.microsoft.excel.xlsx' });

    } catch (error) {
        console.error("Erro ao gerar relatório XLSX:", error);
        Alert.alert("Erro", "Não foi possível gerar o relatório em Excel.");
    } finally {
        setIsLoadingXLSX(false);
    }
  };

  return (
    <ImageBackground source={require('../assets/images/fundo.jpg')} style={styles.background} blurRadius={2}>
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.title}>Gerar Relatórios</Text>
            </View>
            
            <View style={styles.contentContainer}>
                <Text style={styles.description}>
                  Selecione o período desejado e exporte um relatório consolidado das vendas.
                </Text>

                <View style={styles.datePickerContainer}>
                    <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker('inicio')}>
                        <MaterialCommunityIcons name="calendar-start" size={24} color="#E0E0FF" />
                        <Text style={styles.datePickerText}>{dataInicio ? dataInicio.toLocaleDateString('pt-BR') : 'Data de Início'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker('fim')}>
                        <MaterialCommunityIcons name="calendar-end" size={24} color="#E0E0FF" />
                        <Text style={styles.datePickerText}>{dataFim ? dataFim.toLocaleDateString('pt-BR') : 'Data de Fim'}</Text>
                    </TouchableOpacity>
                </View>

                {showDatePicker && (
                    <DateTimePicker
                        value={ (showDatePicker === 'inicio' ? dataInicio : dataFim) || new Date() }
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                    />
                )}

                <TouchableOpacity 
                    style={[styles.actionButton, styles.xlsxButton, (!dataInicio || !dataFim) && styles.disabledButton]}
                    onPress={handleGerarXLSX} 
                    disabled={isLoadingPDF || isLoadingXLSX || !dataInicio || !dataFim}
                >
                    {isLoadingXLSX ? <ActivityIndicator size="small" color="#FFFFFF" /> : <MaterialCommunityIcons name="microsoft-excel" size={28} color="#FFFFFF" />}
                    <Text style={styles.actionButtonText}>Exportar para Excel (.xlsx)</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.actionButton, styles.pdfButton, (!dataInicio || !dataFim) && styles.disabledButton]}
                    onPress={handleGerarPDF} 
                    disabled={isLoadingPDF || isLoadingXLSX || !dataInicio || !dataFim}
                >
                {isLoadingPDF ? <ActivityIndicator size="small" color="#FFFFFF" /> : <MaterialCommunityIcons name="file-pdf-box" size={28} color="#FFFFFF" />}
                <Text style={styles.actionButtonText}>Exportar Relatório PDF</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(25, 10, 50, 0.65)' },
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  headerContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  backButton: {
      padding: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
    marginRight: 40,
  },
  contentContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 25,
    alignItems: 'center',
  },
  description: {
    fontSize: 16,
    color: '#E0E0FF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  datePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    width: '48%',
  },
  datePickerText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    elevation: 4,
  },
  xlsxButton: {
    backgroundColor: '#1D6F42',
  },
  pdfButton: {
    backgroundColor: 'rgba(211, 47, 47, 0.8)',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  disabledButton: {
      opacity: 0.5,
  },
});