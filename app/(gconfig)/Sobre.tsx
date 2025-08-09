// app/Sobre.tsx
import React from 'react';
import { View, Text, StyleSheet, ImageBackground, SafeAreaView, StatusBar, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';

export default function SobreScreen() {
    const router = useRouter();
    const appVersion = Constants.expoConfig?.version;

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
                    <Text style={styles.title}>Sobre o Aplicativo</Text>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    <View style={styles.contentContainer}>
                        <MaterialCommunityIcons name="shield-check-outline" size={80} color="#71d44aff" />
                        <Text style={styles.appName}>CVSApp</Text>
                        {appVersion && <Text style={styles.versionText}>Versão {appVersion}</Text>}
                        
                        <Text style={styles.descriptionText}>
                            Este aplicativo foi desenvolvido para auxiliar consultoras a gerenciar suas vendas, clientes e produtos de forma simples e eficiente.
                        </Text>
                        
                        <View style={styles.infoBox}>
                            <Text style={styles.infoTitle}>Desenvolvido por:</Text>
                            <Text style={styles.infoContent}>Mthz.Dev</Text>
                        </View>
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
    headerContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' },
    backButton: { padding: 8 },
    title: { fontSize: 26, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', flex: 1, marginRight: 40 },
    scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 20 },
    contentContainer: { alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 16, padding: 30 },
    appName: { fontSize: 34, fontWeight: 'bold', color: "#FFFFFF", marginTop: 10 },
    versionText: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 16, marginBottom: 25 },
    descriptionText: {
        fontSize: 16,
        color: '#E0E0FF',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30,
    },
    infoBox: {
        width: '100%',
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center'
    },
    infoTitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.6)',
    },
    infoContent: {
        fontSize: 12,
        fontFamily: 'Playwrite-Regular',
        color: '#FFFFFF',
        marginTop: 5,
    }
});