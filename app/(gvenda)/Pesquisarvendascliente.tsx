//Pesquisarvendascliente.tsx
import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, StyleSheet, ImageBackground, ActivityIndicator, Platform, SafeAreaView, Alert, StatusBar,} from 'react-native';
import { StyledText as Text } from '../../src/components/StyledText';
import { useRouter } from 'expo-router';
import { Cliente } from '../../src/types';
import { pesquisarClientesPorNomeSQLite, buscarClientesPorDataVencimentoSQLite } from '../../src/database/sqlite';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

export default function PesquisarVendasClienteScreen() {
    const [termoBusca, setTermoBusca] = useState('');
    const [resultados, setResultados] = useState<Cliente[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [dataBusca, setDataBusca] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const router = useRouter();

    // Efeito para a busca por nome (debounce)
    useEffect(() => {
        if (termoBusca.length < 2) {
            if (dataBusca === null) setResultados([]); // Só limpa se não houver busca por data
            return;
        }

        setIsLoading(true);
        const timer = setTimeout(async () => {
            try {
                setDataBusca(null); // Limpa a busca por data ao digitar o nome
                const clientesEncontrados = await pesquisarClientesPorNomeSQLite(termoBusca);
                setResultados(clientesEncontrados);
            } catch (error) {
                console.error("Erro ao pesquisar clientes:", error);
            } finally {
                setIsLoading(false);
                setHasSearched(true);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [termoBusca]);

    // Função para lidar com a seleção e busca por data
    const onDateChange = async (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (event.type === 'set' && selectedDate) {
            setDataBusca(selectedDate);
            setTermoBusca(''); // Limpa a busca por nome
            setIsLoading(true);
            setHasSearched(true);
            try {
                const dataFormatada = selectedDate.toISOString().split('T')[0];
                const clientesEncontrados = await buscarClientesPorDataVencimentoSQLite(dataFormatada);
                setResultados(clientesEncontrados);
            } catch (error) {
                console.error("Erro ao buscar por data:", error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const renderClienteItem = ({ item }: { item: Cliente }) => (
        <TouchableOpacity
            style={styles.cardCliente}
            onPress={() => router.push({ 
                pathname: '/(gcliente)/Vendascliente', 
                params: { idCliente: item.id, nome: item.nome, telefone: item.telefone } 
            })}
        >
            <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="account-circle-outline" size={32} color="#E0E0FF" />
            </View>
            <View style={styles.infoContainer}>
                <Text style={styles.nomeCliente}>{item.nome}</Text>
                {item.telefone && <Text style={styles.detalheCliente}>{item.telefone}</Text>}
            </View>
            <MaterialCommunityIcons name="chevron-right" size={28} color="#A9A9A9" />
        </TouchableOpacity>
    );

    return (
        <ImageBackground source={require("../../assets/images/fundo.jpg")} style={styles.background} blurRadius={2}>
            <View style={styles.overlay} />
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.headerContainer}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Pesquisar Vendas</Text>
                </View>

                <View style={styles.container}>
                    <View style={styles.inputContainer}>
                        <MaterialCommunityIcons name="magnify" size={22} color="#A9A9A9" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Digite o nome do cliente..."
                            value={termoBusca}
                            onChangeText={setTermoBusca}
                            placeholderTextColor="#A9A9A9"
                            autoFocus={true}
                        />
                    </View>

                    <TouchableOpacity style={styles.dateSearchButton} onPress={() => setShowDatePicker(true)}>
                        <MaterialCommunityIcons name="calendar-search" size={22} color="#FFFFFF" />
                        <Text style={styles.dateSearchButtonText}>
                            {dataBusca ? `Vencimentos em: ${dataBusca.toLocaleDateString('pt-BR')}` : "Buscar por Data de Vencimento"}
                        </Text>
                    </TouchableOpacity>

                    {showDatePicker && (
                        <DateTimePicker
                            value={dataBusca || new Date()}
                            mode="date"
                            display="default"
                            onChange={onDateChange}
                        />
                    )}

                    {isLoading ? (
                        <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 20 }} />
                    ) : (
                        <FlatList
                            data={resultados}
                            keyExtractor={(item) => item.id}
                            renderItem={renderClienteItem}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <MaterialCommunityIcons 
                                        name={hasSearched ? "account-search-outline" : "text-search"} 
                                        size={60} 
                                        color="rgba(255,255,255,0.3)" 
                                    />
                                    <Text style={styles.emptyText}>
                                        {hasSearched 
                                            ? "Nenhum cliente encontrado." 
                                            : "Digite um nome ou selecione uma data de vencimento para buscar."}
                                    </Text>
                                </View>
                            }
                            contentContainerStyle={{ paddingTop: 10 }}
                        />
                    )}
                </View>
            </SafeAreaView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: { flex: 1 },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(25, 10, 50, 0.65)' },
    safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
    container: { flex: 1, paddingHorizontal: 16 },
    headerContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10 },
    backButton: { padding: 8 },
    title: { fontSize: 26, fontFamily: 'Roboto-Bold', color: '#FFFFFF', textAlign: 'center', flex: 1, marginRight: 40 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.25)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', marginTop: 10 },
    inputIcon: { paddingLeft: 15, paddingRight: 10 },
    input: { flex: 1, paddingVertical: 14, paddingRight: 15, fontFamily: 'Roboto-Regular', fontSize: 16, color: '#FFFFFF' },
    dateSearchButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(126, 87, 194, 0.7)',
        borderRadius: 12,
        paddingVertical: 14,
        marginTop: 15,
    },
    dateSearchButtonText: {
        color: '#FFFFFF',
        fontFamily: 'Roboto-Bold',
        fontSize: 16,
        marginLeft: 10,
    },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: '20%' },
    emptyText: { fontSize: 18,fontFamily: 'Roboto-Regular', color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 20 },
    cardCliente: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 15,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    iconContainer: { marginRight: 15, backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: 10, borderRadius: 25 },
    infoContainer: { flex: 1 },
    nomeCliente: { fontSize: 18,fontFamily: 'Roboto-Bold', color: '#FFFFFF' },
    detalheCliente: { fontSize: 14,fontFamily: 'Roboto-Regular', color: '#E0E0FF', marginTop: 2 },
});