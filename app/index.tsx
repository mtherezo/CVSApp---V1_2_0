// index.tsx (Tela de Login) - com transição animada
import { View, TextInput, StyleSheet, ImageBackground, TouchableOpacity, ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView, SafeAreaView, StatusBar, Modal } from "react-native";
import { StyledText as Text } from '../src/components/StyledText';
import { commonStyles } from "../src/theme/commonStyles";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import CryptoJS from "crypto-js";
import { Usuario } from "../src/types";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { obterTodosUsuariosSQLite as obterTodosUsuarios } from "../src/database/sqlite";
import { MotiView } from 'moti';

export default function TelaLoginScreen() {
    const appVersion = Constants.expoConfig?.version;

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const router = useRouter();
    const passwordInputRef = useRef<TextInput>(null);

    // Estados para Modal de alerta customizado
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState("");
    const [alertMessage, setAlertMessage] = useState("");

    const showCustomAlert = (title: string, message: string) => {
        setAlertTitle(title);
        setAlertMessage(message);
        setAlertVisible(true);
    };

    useEffect(() => {
        const initializeApp = async () => {
            try {
                const usuariosExistentes = await obterTodosUsuarios();
                if (usuariosExistentes.length === 0) {
                    router.replace('/CadastroInicial');
                } else {
                    setIsInitializing(false);
                }
            } catch (e) {
                console.error("Erro ao inicializar dados do aplicativo:", e);
                showCustomAlert("Erro de Inicialização", "Falha ao verificar os dados iniciais do usuário.");
                setIsInitializing(false);
            }
        };
        initializeApp();
    }, []);

    const handleLogin = async () => {
        if (!username.trim() || !password.trim()) {
            showCustomAlert("Atenção", "Por favor, preencha o nome de usuário e a senha.");
            return;
        }

        setIsLoading(true);
        try {
            const usuarios = await obterTodosUsuarios();
            if (usuarios.length === 0 && !isInitializing) {
                showCustomAlert("Erro", "Nenhum usuário cadastrado. Por favor, reinicie o aplicativo para criar uma conta.");
                setIsLoading(false);
                return;
            }
            
            const senhaHashParaComparar = CryptoJS.SHA256(password).toString();
            const usuarioValido = usuarios.find(
                (u: Usuario) => u.username.toLowerCase() === username.trim().toLowerCase() && u.passwordHash === senhaHashParaComparar
            );

            if (usuarioValido) {
                setUsername('');
                setPassword('');
                router.replace({ pathname: "/Home", params: { username: usuarioValido.username } });
            } else {
                setPassword('');
                showCustomAlert("Login Falhou", "Usuário ou senha incorretos. Verifique seus dados e tente novamente.");
            }
        } catch (error) {
            console.error("Erro durante o processo de login:", error);
            showCustomAlert("Erro de Login", "Ocorreu uma falha durante o login. Por favor, tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isInitializing) {
        return (
            <ImageBackground
                source={require("../assets/images/fundo.jpg")}
                style={styles.background}
                blurRadius={2}
            >
                <View style={styles.overlay} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.loadingText}>Verificando dados...</Text>
                </View>
            </ImageBackground>
        );
    }

    return (
        <ImageBackground
            source={require("../assets/images/fundo.jpg")}
            style={styles.background}
            blurRadius={2}
        >
            <View style={styles.overlay} />
            <SafeAreaView style={styles.safeArea}>
                {/* Transição animada da tela */}
                <MotiView
                    from={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'timing', duration: 300 }}
                    style={{ flex: 1 }}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.keyboardAvoidingContainer}
                    >
                        <ScrollView contentContainerStyle={styles.scrollContainer}>
                            <View style={styles.logoContainer}>
                                <MaterialCommunityIcons name="shield-check-outline" size={80} color="#71d44aff" />
                                <Text style={styles.appName}>CVSApp</Text>
                                <Text style={styles.screenTitle}>Acesso da Consultora</Text>
                            </View>

                            <View style={styles.formContainer}>
                                <View style={styles.inputContainer}>
                                    <MaterialCommunityIcons name="account-outline" size={22} color="#A9A9A9" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Usuário"
                                        onChangeText={setUsername}
                                        value={username}
                                        placeholderTextColor="#A9A9A9"
                                        autoCapitalize="none"
                                        returnKeyType="next"
                                        onSubmitEditing={() => passwordInputRef.current?.focus()}
                                    />
                                </View>
                                <View style={styles.inputContainer}>
                                    <MaterialCommunityIcons name="lock-outline" size={22} color="#A9A9A9" style={styles.inputIcon} />
                                    <TextInput
                                        ref={passwordInputRef}
                                        style={styles.input}
                                        placeholder="Senha"
                                        secureTextEntry
                                        onChangeText={setPassword}
                                        value={password}
                                        placeholderTextColor="#A9A9A9"
                                        returnKeyType="done"
                                        onSubmitEditing={handleLogin}
                                    />
                                </View>

                                {isLoading ? (
                                    <ActivityIndicator size="large" color="#FFFFFF" style={styles.loader} />
                                ) : (
                                    <TouchableOpacity
                                        style={styles.loginButton}
                                        onPress={handleLogin}
                                        disabled={isLoading}
                                    >
                                        <MaterialCommunityIcons name="login-variant" size={22} color="#FFFFFF" />
                                        <Text style={commonStyles.loginButtonText}>Acessar Sistema</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            
                            {appVersion && (
                                <Text style={styles.versionText}>
                                    Versão {appVersion}
                                </Text>
                            )}

                            {/* Modal de alerta animado */}
                            <Modal
                                transparent={true}
                                visible={alertVisible}
                                animationType="none"
                                onRequestClose={() => setAlertVisible(false)}
                            >
                                <View style={styles.modalOverlay}>
                                    <MotiView
                                        from={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{ type: 'timing', duration: 200 }}
                                        style={styles.modalContainer}
                                    >
                                        <Text style={styles.modalTitle}>{alertTitle}</Text>
                                        <Text style={styles.modalMessage}>{alertMessage}</Text>

                                        <TouchableOpacity
                                            style={styles.modalButton}
                                            onPress={() => setAlertVisible(false)}
                                        >
                                            <Text style={styles.modalButtonText}>Ok</Text>
                                        </TouchableOpacity>
                                    </MotiView>
                                </View>
                            </Modal>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </MotiView>
            </SafeAreaView>
        </ImageBackground>
    );
}


const styles = StyleSheet.create({
    background: { flex: 1 },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(25, 10, 50, 0.65)' },
    safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
    keyboardAvoidingContainer: { flex: 1 },
    scrollContainer: { flexGrow: 1, justifyContent: "center", padding: 20 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 15, color: '#FFFFFF', fontSize: 18 },
    logoContainer: { alignItems: 'center', marginBottom: 40 },
    appName: { fontSize: 34, color: "#FFFFFF", textAlign: "center", marginTop: 10, fontFamily: 'Roboto-Bold' },
    screenTitle: { fontSize: 18, fontWeight: '300', color: "#E0E0FF", textAlign: "center", marginTop: 4 },
    formContainer: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 16, padding: 25 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.25)', borderRadius: 12, marginBottom: 18, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
    inputIcon: { paddingHorizontal: 15 },
    input: { flex: 1, paddingVertical: 14, paddingRight: 15, fontSize: 16, color: '#FFFFFF', fontFamily: 'Roboto-Regular' },
    loginButton: { backgroundColor: 'rgba(76, 175, 80, 0.8)', flexDirection: 'row', paddingVertical: 15, borderRadius: 25, marginTop: 20, alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
    loader: { marginTop: 20, paddingVertical: 15 },
    versionText: { textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)', fontSize: 12, marginTop: 30, paddingBottom: 10 },

    // Estilos do Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
    modalContainer: { width: "80%", backgroundColor: '#494747f1', borderRadius: 20, padding: 20, alignItems: "center" },
    modalTitle: { fontSize: 20, fontFamily: 'Roboto-Bold', color: "#fff", marginBottom: 10 },
    modalMessage: { fontSize: 16, fontFamily: 'Roboto-Regular', color: "#ccc", textAlign: "center", marginBottom: 20 },
    modalButton: { backgroundColor: "rgba(255,255,255,0.1)", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
    modalButtonText: { fontSize: 16, fontFamily: 'Roboto-Bold', color: "#fff" },
});
