// app/Configuracoes.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, SafeAreaView, StatusBar, Platform, ScrollView, Alert, Switch } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { usePremium } from '../../src/contexts/PremiumContext';
import { buscarUsuarioPorUsernameSQLite } from '../../src/database/sqlite';
import { registerBackgroundTask, unregisterBackgroundTask, getNotificationStatus } from '../../src/services/notificationService';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export default function ConfiguracoesScreen() {
    const router = useRouter();
    const { username: loggedInUsername } = useLocalSearchParams<{ username?: string }>();
    const { isPremium } = usePremium();
    
    const [isAdmin, setIsAdmin] = useState(false);
    const [notificacoesAtivas, setNotificacoesAtivas] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            if (loggedInUsername) {
                const utilizador = await buscarUsuarioPorUsernameSQLite(loggedInUsername);
                if (utilizador?.isAdmin === 1) {
                    setIsAdmin(true);
                }
            }
            const status = await getNotificationStatus();
            setNotificacoesAtivas(status === 'enabled');
        };
        loadSettings();
    }, [loggedInUsername]);

    const handleToggleNotificacoes = async (valor: boolean) => {
        if (valor) {
            await registerBackgroundTask();
        } else {
            await unregisterBackgroundTask();
        }
        setNotificacoesAtivas(valor);
    };

    const handleFaleConosco = () => {
        const email = 'mthinformatica@gmail.com';
        const assunto = 'Suporte App CVSApp';
        Linking.openURL(`mailto:${email}?subject=${assunto}`).catch(err => {
            Alert.alert("Erro", "Não foi possível abrir o aplicativo de e-mail.");
        });
    };

    const configButtons: { title: string; icon: IconName; color: string; onPress: () => void; adminOnly: boolean }[] = [
        { title: 'Backup e Restauração', icon: 'database-export-outline', color: '#FFCC80', onPress: () => router.push('/(gconfig)/Backup'), adminOnly: false },
        { title: 'Gerenciar Usuários', icon: 'account-cog-outline', color: '#FFCC80', onPress: () => router.push({ pathname: '/(gconfig)/Cadastrousuario', params: { username: loggedInUsername } }), adminOnly: true },
        { title: 'Fale Conosco / Suporte', icon: 'email-outline', color: '#81D4FA', onPress: handleFaleConosco, adminOnly: false },
        { title: 'Sobre o Aplicativo', icon: 'information-outline', color: '#BDBDBD', onPress: () => router.push('/(gconfig)/Sobre'), adminOnly: false },
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
                    <View style={styles.card}>
                        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20}}>
                            <Text style={styles.cardTitle}>Notificações de Vencimento</Text>
                            
                        </View>
                        <View style={styles.toggleContainer}>
                            <Text style={styles.toggleText}>Lembrar-me de pagamentos vencendo</Text>
                            <Switch
                                trackColor={{ false: "#767577", true: "#4CAF50" }}
                                thumbColor={notificacoesAtivas ? "#FFFFFF" : "#f4f3f4"}
                                ios_backgroundColor="#3e3e3e"
                                onValueChange={handleToggleNotificacoes}
                                value={notificacoesAtivas}
                            />
                        </View>
                    </View>
                    
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
    background: { flex: 1, backgroundColor: '#190a32' },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(25, 10, 50, 0.65)' },
    safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
    headerContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.2)' },
    backButton: { padding: 8 },
    title: { fontSize: 26, fontFamily: 'Roboto-Bold', color: '#FFFFFF', textAlign: 'center', flex: 1, marginRight: 40 },
    scrollContainer: { paddingHorizontal: 16, paddingTop: 20 },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    cardTitle: {
        fontSize: 18,
        fontFamily: 'Roboto-Bold',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 0,
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    toggleText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontFamily: 'Roboto-Regular',
        flex: 1,
        marginRight: 10,
    },
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
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: 'Roboto-Regular',
    },
});
