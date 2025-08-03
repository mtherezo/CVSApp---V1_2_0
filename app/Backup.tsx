// app/Backup.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform, SafeAreaView, StatusBar, ScrollView, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Updates from 'expo-updates';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { db } from '../src/database/sqlite';
import * as MediaLibrary from 'expo-media-library'; // Importa a biblioteca de permissões


const DATABASE_NAME = "cvsapp.db"; 

export default function BackupScreen() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [statusText, setStatusText] = useState('');

    const handleBackup = async () => {
        if (isLoading) return;

        // Pede permissão para acessar os arquivos
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permissão Negada", "É necessário permitir o acesso aos arquivos para criar um backup.");
            return;
        }

        setIsLoading(true);
        setStatusText('Iniciando backup...');
        try {
            const dbUri = `${FileSystem.documentDirectory}SQLite/${DATABASE_NAME}`;
            
            const dbFileInfo = await FileSystem.getInfoAsync(dbUri);
            if (!dbFileInfo.exists) {
                Alert.alert("Erro", "O arquivo do banco de dados não foi encontrado.");
                setIsLoading(false);
                return;
            }

            const date = new Date();
            const timestamp = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}-${date.getMinutes().toString().padStart(2, '0')}`;
            const backupUri = `${FileSystem.cacheDirectory}backup-${timestamp}.db`;
            
            setStatusText('Copiando dados...');
            await FileSystem.copyAsync({ from: dbUri, to: backupUri });

            setStatusText('Compartilhando arquivo...');
            await Sharing.shareAsync(backupUri, {
                mimeType: 'application/octet-stream', // MIME type genérico para melhor compatibilidade
                dialogTitle: 'Salvar backup do banco de dados',
            });
            
            Alert.alert("Sucesso!", "Backup criado e pronto para ser salvo.");

        } catch (error) {
            console.error("Erro no backup:", error);
            Alert.alert("Erro", "Não foi possível completar o backup. Verifique as permissões do aplicativo.");
        } finally {
            setIsLoading(false);
            setStatusText('');
        }
    };

    const handleRestore = async () => {
        if (isLoading) return;

        Alert.alert(
            "Restaurar Backup",
            "ATENÇÃO: Isso substituirá TODOS os dados atuais do aplicativo pelos dados do backup. Esta ação não pode ser desfeita. Deseja continuar?",
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Continuar", 
                    style: "destructive",
                    onPress: async () => {
                        setIsLoading(true);
                        setStatusText('Iniciando restauração...');
                        try {
                            const result = await DocumentPicker.getDocumentAsync({
                                type: ['application/octet-stream', 'application/x-sqlite3'],
                                copyToCacheDirectory: true,
                            });
                            
                            if (result.canceled || !result.assets?.[0]?.uri) {
                                setIsLoading(false);
                                setStatusText('');
                                return;
                            }
                            
                            const backupUri = result.assets[0].uri;
                            const dbUri = `${FileSystem.documentDirectory}SQLite/${DATABASE_NAME}`;

                            setStatusText('Fechando conexão atual...');
                            await db.closeAsync();

                            setStatusText('Restaurando dados...');
                            await FileSystem.copyAsync({ from: backupUri, to: dbUri });

                            setStatusText('Aplicativo será reiniciado...');
                            Alert.alert(
                                "Restauração Concluída!",
                                "Os dados foram restaurados com sucesso. O aplicativo será reiniciado para aplicar as alterações.",
                                [{ text: "OK", onPress: async () => await Updates.reloadAsync() }]
                            );

                        } catch (error) {
                            console.error("Erro na restauração:", error);
                            Alert.alert("Erro", "Não foi possível restaurar o backup.");
                            setIsLoading(false);
                            setStatusText('');
                        }
                    }
                }
            ]
        );
    };

    return (
        <ImageBackground
            source={require("../assets/images/fundo.jpg")} 
            style={styles.background}
            blurRadius={2}
        >
            <View style={styles.overlay} />
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.headerContainer}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Backup e Restauração</Text>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    <View style={styles.card}>
                        <MaterialCommunityIcons name="database-export-outline" size={40} color="#4CAF50" />
                        <Text style={styles.cardTitle}>Criar Backup</Text>
                        <Text style={styles.cardDescription}>
                            Crie uma cópia de segurança de todos os seus dados. Salve o arquivo em um local seguro como Google Drive ou em seu Dispositivo.
                        </Text>
                        <TouchableOpacity style={[styles.button, styles.backupButton]} onPress={handleBackup} disabled={isLoading}>
                            <Text style={styles.buttonText}>Fazer Backup Agora</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.card}>
                        <MaterialCommunityIcons name="database-import-outline" size={40} color="#F44336" />
                        <Text style={styles.cardTitle}>Restaurar Backup</Text>
                        <Text style={styles.cardDescription}>
                            Selecione um arquivo de backup para restaurar os dados. Cuidado: todos os dados atuais serão permanentemente substituídos.
                        </Text>
                        <TouchableOpacity style={[styles.button, styles.restoreButton]} onPress={handleRestore} disabled={isLoading}>
                            <Text style={styles.buttonText}>Restaurar de um Arquivo</Text>
                        </TouchableOpacity>
                    </View>

                    {isLoading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color="#FFFFFF" />
                            <Text style={styles.statusText}>{statusText}</Text>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: { flex: 1 },
    overlay: { 
        ...StyleSheet.absoluteFillObject, 
        backgroundColor: 'rgba(25, 10, 50, 0.65)',
    },
    safeArea: { 
        flex: 1, 
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 
    },
    headerContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 10, 
        paddingVertical: 10, 
    },
    backButton: { padding: 8 },
    title: { 
        fontSize: 22, 
        fontWeight: 'bold', 
        color: '#FFFFFF',
        flex: 1,
        textAlign: 'center',
        marginRight: 40,
    },
    scrollContainer: { padding: 20 },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginTop: 10,
        marginBottom: 10,
    },
    cardDescription: {
        fontSize: 15,
        textAlign: 'center',
        color: '#E0E0FF',
        marginBottom: 20,
        lineHeight: 22,
    },
    button: {
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 25,
        width: '100%',
        alignItems: 'center',
    },
    backupButton: { backgroundColor: '#4CAF50' },
    restoreButton: { backgroundColor: '#F44336' },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16, // Para ficar contido no card, se preferir
    },
    statusText: {
        marginTop: 15,
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF'
    }
    
});