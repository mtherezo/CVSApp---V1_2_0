// Home.tsx
import { useLocalSearchParams, useRouter, Href } from "expo-router";
import { ImageBackground, View, Text, TouchableOpacity, StyleSheet, Platform, SafeAreaView, ScrollView, Alert, StatusBar} from "react-native";
import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// ESTRUTURA DE DADOS com "as const" no final
const navButtons = [
    { title: 'Gerenciar Clientes', icon: 'account-group-outline', pathname: '/Clientes', color: '#81D4FA' },
    { title: 'Catálogo de Produtos', icon: 'package-variant-closed', pathname: '/Produtos', color: '#81D4FA' },
    { title: 'Pesquisar Vendas', icon: 'magnify', pathname: '/Pesquisarvendascliente', color: '#A5D6A7' },
    { title: 'Histórico de Vendas', icon: 'history', pathname: '/Todasvendas', color: '#A5D6A7' },
    { title: 'Relatórios de Vendas', icon: 'file-chart-outline', pathname: '/Gerarrelatorios', color: '#A5D6A7' },
    { title: 'Configurações', icon: 'cog-outline', pathname: '/Configuracoes', color: '#BDBDBD' },
] as const; // O "as const" garante a tipagem correta para as rotas

const ADMIN_USERNAME = "stherezo";

export default function home() {
    const appVersion = Constants.expoConfig?.version;
    const { username: rawUsername } = useLocalSearchParams() as { username?: string | string[] };
    const router = useRouter();

    function capitalize(text: string | string[] | undefined): string {
        if (!text) return "Consultora";
        const nameToProcess = Array.isArray(text) ? text[0] : text;
        if (typeof nameToProcess !== "string" || !nameToProcess.trim()) return "Consultora";
        return nameToProcess.charAt(0).toUpperCase() + nameToProcess.slice(1).toLowerCase();
    }

    const displayName = capitalize(rawUsername);
    const loggedInUsername = (Array.isArray(rawUsername) ? rawUsername[0] : rawUsername)?.toLowerCase();

    
    
    const handleLogout = () => {
        Alert.alert(
            "Sair",
            "Tem certeza que deseja sair do aplicativo?",
            [
                { text: "Cancelar", style: "cancel" },
                { text: "Sair", style: "destructive", onPress: () => router.replace("./") }
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
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    <View style={styles.headerContainer}>
                        <Text style={styles.title}>Bem-vindo(a) de volta,</Text>
                        <Text style={styles.usernameText}>{displayName}!</Text>
                    </View>

                    <View style={styles.buttonGrid}>
                        {navButtons.map((button) => (
                            <TouchableOpacity 
                                key={button.title} 
                                style={styles.gridButton} 
                                // CHAMADA DIRETA E SEGURA para o router.push
                                onPress={() => router.push({
                                    pathname: button.pathname,
                                    params: { username: loggedInUsername }
                                })}
                            >
                                <MaterialCommunityIcons name={button.icon} size={40} color={button.color} />
                                <Text style={styles.gridButtonText}>{button.title}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <MaterialCommunityIcons name="logout" size={20} color="#FFDDC5" />
                        <Text style={styles.logoutButtonText}>Sair</Text>
                    </TouchableOpacity>

                    {appVersion && (
                        <Text style={styles.versionText}>
                            Versão {appVersion}
                        </Text>
                    )}
                </ScrollView>
            </SafeAreaView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: { flex: 1, },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(25, 10, 50, 0.65)', },
    safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, },
    scrollContainer: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 30, },
    headerContainer: { alignItems: 'center', marginBottom: 30, },
    title: { fontSize: 24, fontWeight: '300', color: "#E0E0FF", textAlign: "center", },
    usernameText: { fontSize: 32, fontWeight: 'bold', color: "#FFFFFF", textAlign: "center", },
    buttonGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', },
    gridButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        width: '48%',
        aspectRatio: 1,
        marginBottom: '2%',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    gridButtonText: {
        textAlign: "center",
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 12,
    },
    logoutButton: {
        backgroundColor: 'rgba(255, 120, 100, 0.2)',
        flexDirection: 'row',
        paddingVertical: 14,
        borderRadius: 25,
        marginTop: 15, 
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 150, 130, 0.5)',
    },
    logoutButtonText: {
        textAlign: "center",
        color: '#FFDDC5',
        fontSize: 17,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    versionText: {
        textAlign: 'center',
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 12,
        marginTop: 20,
        paddingBottom: 10,
    },
});