// Home.tsx 
import { useLocalSearchParams, useRouter } from "expo-router";
import { ImageBackground, View, TouchableOpacity, StyleSheet, Platform, SafeAreaView, ScrollView, StatusBar, Modal } from "react-native";
import { StyledText as Text } from '../src/components/StyledText';
import React, { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { MotiView } from "moti"; // animação

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const navButtons = [
    { title: 'Gerenciar Clientes', icon: 'account-group-outline', pathname: '/Clientes', color: '#81D4FA' },
    //{ title: 'Catálogo de Produtos', icon: 'package-variant-closed', pathname: '/Produtos', color: '#81D4FA' },
    { title: 'Pesquisar Vendas', icon: 'magnify', pathname: '/Pesquisarvendascliente', color: '#A5D6A7' },
    //{ title: 'Histórico de Vendas', icon: 'history', pathname: '/Todasvendas', color: '#A5D6A7' },
    //{ title: 'Relatórios de Vendas', icon: 'file-chart-outline', pathname: '/Gerarrelatorios', color: '#A5D6A7' },
    { title: 'Configurações', icon: 'cog-outline', pathname: '/Configuracoes', color: '#BDBDBD' },
    { title: 'Versão completa', icon: 'account-lock-open-outline', pathname: '/Sobre_limitada', color: '#BDBDBD' },
] as const;

export default function Home() {
    const appVersion = Constants.expoConfig?.version;
    const { username: rawUsername } = useLocalSearchParams() as { username?: string | string[] };
    const router = useRouter();

    const [modalVisible, setModalVisible] = useState(false);

    function capitalize(text: string | string[] | undefined): string {
        if (!text) return "Consultora";
        const nameToProcess = Array.isArray(text) ? text[0] : text;
        if (typeof nameToProcess !== "string" || !nameToProcess.trim()) return "Consultora";
        return nameToProcess.charAt(0).toUpperCase() + nameToProcess.slice(1).toLowerCase();
    }

    const displayName = capitalize(rawUsername);
    const loggedInUsername = (Array.isArray(rawUsername) ? rawUsername[0] : rawUsername)?.toLowerCase();

    const handleLogout = () => {
        setModalVisible(true);
    };

    const confirmarLogout = () => {
        setModalVisible(false);
        router.replace("./");
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

                    {/* Botão de sair */}
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <MaterialCommunityIcons name="logout" size={20} color="#FFDDC5" />
                        <Text style={styles.logoutButtonText}>Sair</Text>
                    </TouchableOpacity>

                    {appVersion && (
                        <Text style={styles.versionText}>
                            Versão Limitada {appVersion}
                        </Text>
                    )}
                </ScrollView>
            </SafeAreaView>

            {/* Modal customizado com animação */}
            <Modal
                transparent={true}
                visible={modalVisible}
                animationType="none" // desabilita a animação nativa
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <MotiView
                        from={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ type: "timing", duration: 300 }}
                        style={styles.modalContainer}
                    >
                        <Text style={styles.modalTitulo}>Sair</Text>
                        <Text style={styles.modalMensagem}>
                            Tem certeza que deseja sair do aplicativo?
                        </Text>

                        <View style={styles.botoesContainer}>
                            <TouchableOpacity
                                style={[styles.botao, styles.cancelar]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.botaoTexto}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.botao, styles.sair]}
                                onPress={confirmarLogout}
                            >
                                <Text style={styles.botaoTexto}>Sair</Text>
                            </TouchableOpacity>
                        </View>
                    </MotiView>
                </View>
            </Modal>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: { flex: 1 },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(25, 10, 50, 0.65)' },
    safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
    scrollContainer: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 30 },
    headerContainer: { alignItems: 'center', marginBottom: 30 },
    title: { fontSize: 24, fontFamily: 'Roboto-Bold', color: "#E0E0FF", textAlign: "center" },
    usernameText: { fontSize: 32,  color: "#FFFFFF", textAlign: "center", fontFamily: 'Roboto-Bold' },
    buttonGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
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
        fontFamily: 'Roboto-Bold',
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
        marginLeft: 10,
        fontFamily: 'Roboto-Bold',
    },
    versionText: {
        textAlign: 'center',
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 12,
        fontFamily: 'Roboto-Regular',
        marginTop: 20,
        paddingBottom: 10,
    },

    // Estilos do Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        width: "80%",
        backgroundColor: "#494747f1",
        borderRadius: 20,
        padding: 20,
        alignItems: "center",
    },
    modalTitulo: {
        fontSize: 20,
        color: "#fff",
        marginBottom: 10,
        fontFamily: "Roboto-Bold",
    },
    modalMensagem: {
        fontSize: 16,
        color: "#ccc",
        textAlign: "center",
        marginBottom: 20,
        fontFamily: "Roboto-Regular",
    },
    botoesContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
    },
    botao: {
        flex: 1,
        paddingVertical: 12,
        marginHorizontal: 5,
        borderRadius: 25,
        alignItems: "center",
        borderWidth: 1,
    },
    cancelar: {
        backgroundColor: "rgba(255,255,255,0.1)",
        borderColor: "rgba(255,255,255,0.3)",
    },
    sair: {
        backgroundColor: "rgba(255, 120, 100, 0.3)",
        borderColor: "rgba(255,150,130,0.6)",
    },
    botaoTexto: {
        color: "#fff",
        fontSize: 16,
        fontFamily: "Roboto-Bold",
    },
});
