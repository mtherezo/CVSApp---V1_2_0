// app/Configuracoes.tsx
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, ImageBackground, SafeAreaView, StatusBar, Platform, ScrollView, Alert } from 'react-native';
import { StyledText as Text } from '../../src/components/StyledText';
import { useRouter, useLocalSearchParams, Href } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { buscarUsuarioPorUsernameSQLite } from '../../src/database/sqlite';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
//const ADMIN_USERNAME = "stherezo";

export default function ConfiguracoesScreen() {
    const router = useRouter();
    const appVersion = Constants.expoConfig?.version;
    const { username: rawUsername } = useLocalSearchParams() as { username?: string | string[] };
    const loggedInUsername = (Array.isArray(rawUsername) ? rawUsername[0] : rawUsername)?.toLowerCase();
    const [isAdmin, setIsAdmin] = useState(false);

    // Busca os dados do utilizador para verificar se é admin
    useEffect(() => {
        const verificarAdmin = async () => {
            if (loggedInUsername) {
                const utilizador = await buscarUsuarioPorUsernameSQLite(loggedInUsername);
                if (utilizador?.isAdmin === 1) {
                    setIsAdmin(true);
                }
            }
        };
        verificarAdmin();
    }, [loggedInUsername]);
    

    //função para abrir o e-mail
    const handleFaleConosco = () => {
        
        const email = 'mthinformatica@gmail.com';
        const assunto = 'Suporte App CVSApp';
        Linking.openURL(`mailto:${email}?subject=${assunto}`).catch(err => {
            Alert.alert("Erro", "Não foi possível abrir o aplicativo de e-mail.");
            console.error("Erro ao abrir e-mail:", err);
        });
    };

    // ESTRUTURA DOS BOTÕES: usa 'onPress'
    const configButtons: { title: string; icon: IconName; color: string; onPress: () => void; adminOnly: boolean }[] = [
        { title: 'Backup e Restauração', icon: 'database-export-outline', color: '#FFCC80', onPress: () => router.push('/Backup'), adminOnly: false },
        { 
            title: 'Gerenciar Usuários', 
            icon: 'account-cog-outline', 
            color: '#FFCC80', 
            onPress: () => router.push({ pathname: '/Cadastrousuario', params: { username: loggedInUsername } }), 
            adminOnly: true 
        },
        { title: 'Fale Conosco / Suporte', icon: 'email-outline', color: '#81D4FA', onPress: handleFaleConosco, adminOnly: false },
        { title: 'Sobre o Aplicativo', icon: 'information-outline', color: '#BDBDBD', onPress: () => router.push('/Sobre'), adminOnly: false },
    ];

    return (
        <ImageBackground
            source={require("../../assets/images/fundo.jpg")} 
            style={styles.background}
            blurRadius={2}
        >
            <View style={styles.overlay} />
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.headerContainer}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Configurações</Text>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    
                    {configButtons.map(button => {
                        if (!button.adminOnly || isAdmin) {
                            return (
                                <TouchableOpacity key={button.title} style={styles.menuButton} onPress={button.onPress}>
                                    <MaterialCommunityIcons name={button.icon} size={26} color={button.color} style={styles.menuIcon} />
                                    <Text style={styles.menuButtonText}>{button.title}</Text>
                                    <MaterialCommunityIcons name="chevron-right" size={24} color="#A9A9A9" />
                                </TouchableOpacity>
                            );
                        }
                        return null;
                    })}
                </ScrollView>
            </SafeAreaView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: { flex: 1 },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(25, 10, 50, 0.65)' },
    safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
    headerContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' },
    backButton: { padding: 8 },
    title: { fontSize: 26,  fontFamily: 'Roboto-Bold', color: '#FFFFFF', textAlign: 'center', flex: 1, marginRight: 40 },
    scrollContainer: { paddingHorizontal: 16, paddingTop: 20 },
    // Estilo de lista (menu) em vez de grade
    menuButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        paddingVertical: 18,
        paddingHorizontal: 15,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    menuIcon: {
        marginRight: 20,
    },
    menuButtonText: {
        flex: 1,
        color: 'white',
        fontSize: 18,
        fontWeight: '500',
    },
     versionText: {
        textAlign: 'center',
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 12,
        marginTop: 20,
        paddingBottom: 10,
    },
});