// app/CadastroInicial.tsx
import React, { useState } from 'react';
import {
    View, Text, TextInput, Alert, StyleSheet, ImageBackground, TouchableOpacity,
    ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView, SafeAreaView, StatusBar
} from "react-native";
import { useRouter } from "expo-router";
import CryptoJS from "crypto-js";
import { Usuario } from "../src/types";
import { salvarTodosUsuarios } from '../src/storage/usuarioStorage'; // Importa a função do arquivo compartilhado
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function CadastroInicialScreen() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSalvar = async () => {
        if (!username.trim() || !password || !confirmPassword) {
            Alert.alert("Atenção", "Por favor, preencha todos os campos.");
            return;
        }
        if (password.length < 6) {
            Alert.alert("Senha Fraca", "A senha deve ter pelo menos 6 caracteres.");
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert("Erro", "As senhas não coincidem. Tente novamente.");
            return;
        }

        setIsLoading(true);
        try {
            const passwordHash = CryptoJS.SHA256(password).toString();
            const novoUsuario: Usuario = {
                username: username.trim(),
                passwordHash,
            };
            
            await salvarTodosUsuarios([novoUsuario]);

            Alert.alert(
                "Conta Criada com Sucesso!",
                "Seu usuário foi criado. Agora você será redirecionado para a tela de login.",
                [{ text: "OK", onPress: () => router.replace('/') }] // Usa replace para não poder voltar
            );

        } catch (error) {
            console.error("Erro ao criar usuário inicial:", error);
            Alert.alert("Erro", "Não foi possível criar sua conta. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ImageBackground
            source={require("../assets/images/fundo.jpg")}
            style={styles.background}
            blurRadius={2}
        >
            <View style={styles.overlay} />
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.keyboardAvoidingContainer}
                >
                    <ScrollView contentContainerStyle={styles.scrollContainer}>
                        <View style={styles.logoContainer}>
                            <MaterialCommunityIcons name="account-plus-outline" size={80} color="#FFFFFF" />
                            <Text style={styles.appName}>Criação de Conta</Text>
                            <Text style={styles.screenTitle}>Defina seu acesso principal</Text>
                        </View>

                        <View style={styles.formContainer}>
                            <View style={styles.inputContainer}>
                                <MaterialCommunityIcons name="account-outline" size={22} color="#A9A9A9" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nome de Usuário"
                                    onChangeText={setUsername}
                                    value={username}
                                    placeholderTextColor="#A9A9A9"
                                    autoCapitalize="none"
                                />
                            </View>
                            <View style={styles.inputContainer}>
                                <MaterialCommunityIcons name="lock-outline" size={22} color="#A9A9A9" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Senha (mínimo 6 caracteres)"
                                    secureTextEntry
                                    onChangeText={setPassword}
                                    value={password}
                                    placeholderTextColor="#A9A9A9"
                                />
                            </View>
                            <View style={styles.inputContainer}>
                                <MaterialCommunityIcons name="lock-check-outline" size={22} color="#A9A9A9" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirme a Senha"
                                    secureTextEntry
                                    onChangeText={setConfirmPassword}
                                    value={confirmPassword}
                                    placeholderTextColor="#A9A9A9"
                                    onSubmitEditing={handleSalvar}
                                />
                            </View>

                            {isLoading ? (
                                <ActivityIndicator size="large" color="#FFFFFF" style={styles.loader} />
                            ) : (
                                <TouchableOpacity
                                    style={styles.loginButton}
                                    onPress={handleSalvar}
                                >
                                    <MaterialCommunityIcons name="check-circle-outline" size={22} color="#FFFFFF" />
                                    <Text style={styles.loginButtonText}>Criar e Acessar</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </ImageBackground>
    );
}

// Estilos (muitos são reutilizados da tela de login para manter a consistência)
const styles = StyleSheet.create({
    background: { flex: 1, },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(25, 10, 50, 0.65)', },
    safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, },
    keyboardAvoidingContainer: { flex: 1, },
    scrollContainer: { flexGrow: 1, justifyContent: "center", padding: 20, },
    logoContainer: { alignItems: 'center', marginBottom: 40, },
    appName: { fontSize: 34, fontWeight: 'bold', color: "#FFFFFF", textAlign: "center", marginTop: 10, },
    screenTitle: { fontSize: 18, fontWeight: '300', color: "#E0E0FF", textAlign: "center", marginTop: 4, },
    formContainer: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 16, padding: 25, },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.25)', borderRadius: 12, marginBottom: 18, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', },
    inputIcon: { paddingHorizontal: 15, },
    input: { flex: 1, paddingVertical: 14, paddingRight: 15, fontSize: 16, color: '#FFFFFF', },
    loginButton: { backgroundColor: 'rgba(76, 175, 80, 0.8)', flexDirection: 'row', paddingVertical: 15, borderRadius: 25, marginTop: 20, alignItems: 'center', justifyContent: 'center', },
    loginButtonText: { color: "white", fontSize: 17, fontWeight: "bold", marginLeft: 10, },
    loader: { marginTop: 20, paddingVertical: 15, },
});