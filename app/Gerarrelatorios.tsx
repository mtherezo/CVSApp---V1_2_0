import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, ImageBackground, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Venda } from '../src/types';
// ✨ SUBSTITUÍDO: Importamos apenas a função que busca TODAS as vendas de uma só vez.
import { listarTodasVendasSQLite } from '../src/database/sqlite';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function GerarRelatoriosScreen() {
  const [isLoadingPDF, setIsLoadingPDF] = useState(false);
  const [isLoadingCSV, setIsLoadingCSV] = useState(false);
  const router = useRouter();

  const calcularValorPagoVenda = (venda: Venda): number => {
    return venda.pagamentos?.reduce((acc, p) => acc + p.valorPago, 0) || 0;
  };

  // --- Lógica para PDF ---
  const gerarConteudoHTML = async (): Promise<string> => {
    let htmlContent = `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, Helvetica, sans-serif; margin: 20px; color: #333; }
            h1 { color: #6200EE; text-align: center; border-bottom: 2px solid #6200EE; padding-bottom: 10px; }
            h2 { color: #3700B3; margin-top: 30px; border-bottom: 1px solid #ccc; padding-bottom: 5px;}
            h3 { color: #444; margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 0.9em; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .resumo-geral { background-color: #e9e0ff; padding: 15px; margin-bottom: 25px; border-radius: 8px; }
            .resumo-geral p, .subtotal-cliente p { margin: 5px 0; }
            .cliente-bloco { page-break-inside: avoid; margin-bottom: 25px; padding-bottom:15px; border-bottom: 1px dashed #aaa; }
            .total-geral strong { font-size: 1.1em; }
            .text-right { text-align: right; }
            .currency:before { content: "R$ "; }
          </style>
        </head>
        <body>
          <h1>Relatório Consolidado de Vendas</h1>
    `;

    let valorTotalGeralVendido = 0;
    let valorTotalGeralPago = 0;
    
    try {
      // ✨ OTIMIZAÇÃO: Buscamos TODAS as vendas e seus detalhes de uma única vez.
      const todasAsVendas = await listarTodasVendasSQLite();

      // Agrupamos as vendas por cliente em memória, o que é muito rápido.
      const vendasPorCliente = todasAsVendas.reduce((acc, venda) => {
        const id = venda.idCliente;
        if (!acc[id]) {
          acc[id] = {
            clienteNome: venda.clienteNome,
            clienteTelefone: venda.clienteTelefone,
            vendas: []
          };
        }
        acc[id].vendas.push(venda);
        return acc;
      }, {} as Record<string, { clienteNome: string; clienteTelefone?: string | null; vendas: Venda[] }>);

      const clientesComVendasCount = Object.keys(vendasPorCliente).length;
      htmlContent += `<h2>Clientes e Suas Vendas</h2>`;

      // Agora, iteramos sobre os dados já agrupados, sem novas buscas ao banco.
      for (const idCliente in vendasPorCliente) {
        const dadosCliente = vendasPorCliente[idCliente];
        
        htmlContent += `<div class="cliente-bloco">`;
        htmlContent += `<h3>Cliente: ${dadosCliente.clienteNome}</h3>`;
        if (dadosCliente.clienteTelefone) htmlContent += `<p>Telefone: ${dadosCliente.clienteTelefone}</p>`;
        
        let subtotalVendidoCliente = 0;
        let subtotalPagoCliente = 0;

        htmlContent += `<table><thead><tr><th>Data</th><th>Itens da Venda</th><th class="text-right">Valor Venda</th><th class="text-right">Pago</th><th class="text-right">Pendente</th></tr></thead><tbody>`;
        
        for (const venda of dadosCliente.vendas) {
            const valorPagoVenda = calcularValorPagoVenda(venda);
            const saldoDevedorVenda = venda.valorTotal - valorPagoVenda;
            
            subtotalVendidoCliente += venda.valorTotal;
            subtotalPagoCliente += valorPagoVenda;
            valorTotalGeralVendido += venda.valorTotal;
            valorTotalGeralPago += valorPagoVenda;

            const itensHtml = venda.itens?.map(p => `${p.quantidade}x ${p.descricao}`).join('<br>') || 'N/A';

            htmlContent += `
              <tr>
                <td>${new Date(venda.dataVenda).toLocaleDateString('pt-BR')}</td>
                <td>${itensHtml}</td> 
                <td class="text-right"><span class="currency">${venda.valorTotal.toFixed(2)}</span></td>
                <td class="text-right"><span class="currency">${valorPagoVenda.toFixed(2)}</span></td>
                <td class="text-right"><span class="currency">${saldoDevedorVenda.toFixed(2)}</span></td>
              </tr>
            `;
        }
        htmlContent += `</tbody></table>`;
        htmlContent += `<div class="subtotal-cliente"><p><strong>Subtotal para ${dadosCliente.clienteNome}:</strong></p><p>Vendido: <span class="currency">${subtotalVendidoCliente.toFixed(2)}</span> | Recebido: <span class="currency">${subtotalPagoCliente.toFixed(2)}</span> | Pendente: <span class="currency">${(subtotalVendidoCliente - subtotalPagoCliente).toFixed(2)}</span></p></div></div>`; 
      }

      const valorTotalGeralPendente = valorTotalGeralVendido - valorTotalGeralPago;
      const resumoGeralHtml = `
        <div class="resumo-geral">
          <h2>Resumo Geral Consolidado</h2>
          <p>Total de Clientes com Vendas Registradas: ${clientesComVendasCount}</p>
          <p class="total-geral"><strong>Valor Total Vendido (Líquido): <span class="currency">${valorTotalGeralVendido.toFixed(2)}</span></strong></p>
          <p class="total-geral"><strong>Total Geral Recebido: <span class="currency">${valorTotalGeralPago.toFixed(2)}</span></strong></p>
          <p class="total-geral"><strong>Total Geral Pendente: <span class="currency">${valorTotalGeralPendente.toFixed(2)}</span></strong></p>
        </div>
      `;
      const h1EndIndex = htmlContent.indexOf('</h1>') + 5;
      htmlContent = htmlContent.slice(0, h1EndIndex) + resumoGeralHtml + htmlContent.slice(h1EndIndex);

    } catch (error) {
      console.error("Erro ao gerar dados para HTML:", error);
      htmlContent += `<p style="color:red;">Erro ao carregar todos os dados para o relatório PDF.</p>`;
    }
    
    htmlContent += `</body></html>`;
    return htmlContent;
  };

  const handleGerarESalvarPDF = async () => {
    setIsLoadingPDF(true);
    const html = await gerarConteudoHTML();
    if (html.includes("Erro ao carregar todos os dados")) {
        Alert.alert("Erro", "Não foi possível gerar o PDF devido a um erro ao carregar os dados.");
        setIsLoadingPDF(false);
        return;
    }
    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Compartilhamento Indisponível', 'A funcionalidade de compartilhamento não está disponível neste dispositivo.');
        setIsLoadingPDF(false);
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Compartilhar Relatório de Vendas (PDF)' });
    } catch (error) {
      console.error('Erro ao gerar ou compartilhar PDF:', error);
      Alert.alert('Erro', 'Ocorreu um problema ao gerar ou compartilhar o PDF.');
    } finally {
      setIsLoadingPDF(false);
    }
  };

  const gerarConteudoCSV = async (): Promise<string> => {
    let csvString = "ID Cliente,Nome Cliente,Telefone Cliente,ID Venda,Data Venda,Itens da Venda,Valor Total Venda,Valor Pago Venda,Saldo Devedor Venda\n";
    let valorTotalGeralVendidoCSV = 0;
    let valorTotalGeralPagoCSV = 0;
    try {
      // ✨ OTIMIZAÇÃO: Mesma estratégia, busca todas as vendas de uma vez.
      const todasAsVendas = await listarTodasVendasSQLite();

      // Para CSV, nem precisamos agrupar. Apenas iteramos sobre a lista completa.
      for (const venda of todasAsVendas) {
        const valorPagoVenda = calcularValorPagoVenda(venda);
        const saldoDevedorVenda = venda.valorTotal - valorPagoVenda;
        valorTotalGeralVendidoCSV += venda.valorTotal;
        valorTotalGeralPagoCSV += valorPagoVenda;
        
        const itensCsv = venda.itens?.map(p => `${p.quantidade}x ${p.descricao}`).join('; ') || 'N/A';
        const idClienteCsv = `"${venda.idCliente}"`;
        const nomeClienteCsv = `"${venda.clienteNome.replace(/"/g, '""')}"`;
        const telefoneClienteCsv = `"${(venda.clienteTelefone || '').replace(/"/g, '""')}"`;
        const idVendaCsv = `"${venda.id}"`;
        const dataVendaCsv = `"${new Date(venda.dataVenda).toLocaleDateString('pt-BR')}"`;
        const produtoCsv = `"${itensCsv.replace(/"/g, '""')}"`;
        const valorTotalCsv = venda.valorTotal.toFixed(2);
        const valorPagoCsv = valorPagoVenda.toFixed(2);
        const saldoDevedorCsv = saldoDevedorVenda.toFixed(2);

        csvString += `${idClienteCsv},${nomeClienteCsv},${telefoneClienteCsv},${idVendaCsv},${dataVendaCsv},${produtoCsv},${valorTotalCsv},${valorPagoCsv},${saldoDevedorCsv}\n`;
      }
      
      csvString += "\n"; 
      csvString += `TOTAL GERAL VENDIDO (LÍQUIDO):,,,,,,${valorTotalGeralVendidoCSV.toFixed(2)}\n`;
      csvString += `TOTAL GERAL RECEBIDO:,,,,,,,${valorTotalGeralPagoCSV.toFixed(2)}\n`;
      csvString += `TOTAL GERAL PENDENTE:,,,,,,,,${(valorTotalGeralVendidoCSV - valorTotalGeralPagoCSV).toFixed(2)}\n`;

    } catch (error) {
      console.error("Erro ao gerar dados para CSV:", error);
      return "ERRO_AO_GERAR_DADOS_CSV"; 
    }
    return csvString;
  };

  const handleGerarESalvarCSV = async () => {
    setIsLoadingCSV(true);
    const csvString = await gerarConteudoCSV();
    if (csvString === "ERRO_AO_GERAR_DADOS_CSV") {
        Alert.alert("Erro", "Não foi possível gerar o CSV devido a um erro ao carregar os dados.");
        setIsLoadingCSV(false);
        return;
    }
    try {
      const fileName = `RelatorioVendas_CVSApp_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = (FileSystem.cacheDirectory || FileSystem.documentDirectory) + fileName; 
      await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Compartilhamento Indisponível', 'A funcionalidade de compartilhamento não está disponível neste dispositivo.');
        setIsLoadingCSV(false);
        return;
      }
      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Compartilhar Relatório de Vendas (CSV)' });
    } catch (error) {
      console.error('Erro ao gerar ou compartilhar CSV:', error);
      Alert.alert('Erro', 'Ocorreu um problema ao gerar ou compartilhar o CSV.');
    } finally {
      setIsLoadingCSV(false);
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
                Exporte um relatório consolidado de todas as vendas registradas no aplicativo. Escolha o formato desejado abaixo.
                </Text>

                <TouchableOpacity 
                    style={[styles.actionButton, styles.pdfButton, (isLoadingPDF || isLoadingCSV) && {opacity: 0.5}]} 
                    onPress={handleGerarESalvarPDF} 
                    disabled={isLoadingPDF || isLoadingCSV}
                >
                {isLoadingPDF ? 
                    <ActivityIndicator size="small" color="#FFFFFF" /> : 
                    <MaterialCommunityIcons name="file-pdf-box" size={28} color="#FFFFFF" />
                }
                <Text style={styles.actionButtonText}>Exportar Relatório PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.actionButton, styles.csvButton, (isLoadingPDF || isLoadingCSV) && {opacity: 0.5}]} 
                    onPress={handleGerarESalvarCSV} 
                    disabled={isLoadingPDF || isLoadingCSV}
                >
                {isLoadingCSV ? 
                    <ActivityIndicator size="small" color="#FFFFFF" /> : 
                    <MaterialCommunityIcons name="file-excel-outline" size={28} color="#FFFFFF" />
                }
                <Text style={styles.actionButtonText}>Exportar para Excel (CSV)</Text>
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
    marginBottom: 30,
    lineHeight: 24,
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
  pdfButton: {
    backgroundColor: 'rgba(211, 47, 47, 0.8)', // Vermelho para PDF
  },
  csvButton: {
    backgroundColor: 'rgba(27, 94, 32, 0.8)', // Verde escuro para CSV/Excel
  },
  actionButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
    marginLeft: 15,
  },
});