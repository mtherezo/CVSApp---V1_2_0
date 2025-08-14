// Cadastrousuario.tsx
import React, { useState, useCallback } from 'react';
import {
    View, FlatList, StyleSheet, TouchableOpacity, Alert, ImageBackground,
    ActivityIndicator, RefreshControl, Platform, SafeAreaView, StatusBar,
    TextInput, ScrollView
} from 'react-native';
import { StyledText as Text } from '../../src/components/StyledText';
import { Usuario } from '../../src/types';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { 
    obterTodosUsuariosSQLite as obterTodosUsuarios,
    adicionarOuAtualizarUsuarioSQLite as adicionarOuAtualizarUsuario,
    excluirUsuarioSQLite as excluirUsuario,
    buscarUsuarioPorUsernameSQLite
} from '../../src/database/sqlite';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CryptoJS from "crypto-js";
import PasswordPromptModal from '../../src/components/PasswordPromptModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// DEFINE A INTERFACE PARA AS PROPRIEDADES DO FORMULÁRIO
interface FormularioUsuarioProps {
    usuarioEditando: Usuario | null;
    onSave: (dados: { username: string; password?: string }) => void;
    onCancel: () => void;
    isSaving: boolean;
}

// Componente para o Formulário de Usuário
const FormularioUsuario = ({ usuarioEditando, onSave, onCancel, isSaving }: FormularioUsuarioProps) => {
    const [username, setUsername] = useState(usuarioEditando?.username || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const isEditing = !!usuarioEditando;

    const handleSave = () => {
        if (!username.trim()) {
            Alert.alert('Atenção', 'O nome de usuário é obrigatório.');
            return;
        }
        if (!isEditing && !password) {
            Alert.alert('Atenção', 'A senha é obrigatória para novos usuários.');
            return;
        }
        if (password && password.length < 6) {
            Alert.alert('Senha Fraca', 'A senha deve ter pelo menos 6 caracteres.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Erro', 'As senhas não coincidem.');
            return;
        }
        onSave({ username, password });
    };

    return (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formScrollContainer}>
            <Text style={styles.formTitle}>{isEditing ? 'Editar usuário' : 'Novo usuário'}</Text>
            <TextInput
                style={[styles.input, isEditing && styles.disabledInput]}
                placeholder="Nome de usuário"
                value={username}
                onChangeText={setUsername}
                placeholderTextColor="#A9A9AA"
                autoCapitalize="none"
                editable={!isEditing}
            />
            <TextInput
                style={styles.input}
                placeholder={isEditing ? "Nova Senha (deixe em branco para manter)" : "Senha (mínimo 6 caracteres)"}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholderTextColor="#A9A9A9"
            />
            <TextInput
                style={styles.input}
                placeholder="Confirmar Nova Senha"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholderTextColor="#A9A9A9"
            />
            <View style={styles.formActions}>
                <TouchableOpacity style={[styles.formButton, styles.cancelButton]} onPress={onCancel} disabled={isSaving}>
                    <Text style={styles.formButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.formButton, styles.saveButton, isSaving && styles.disabledButton]} onPress={handleSave} disabled={isSaving}>
                    {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.formButtonText}>Salvar</Text>}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};


export default function GerenciarUsuariosScreen() {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [termoBusca, setTermoBusca] = useState('');
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isPromptVisible, setIsPromptVisible] = useState(false);
    const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
    const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<Usuario | null>(null);
    
    // Novos estados para guardar os dados da edição enquanto se confirma a senha
    const [usuarioParaEditar, setUsuarioParaEditar] = useState<Usuario | null>(null);
    const [novaSenhaTemp, setNovaSenhaTemp] = useState('');

    const router = useRouter();
    const { username: loggedInUsername } = useLocalSearchParams<{ username?: string }>();
    const insets = useSafeAreaInsets();

    const carregarUsuarios = async (showLoader = true) => {
        if (showLoader) setIsLoading(true);
        try {
            const dados = await obterTodosUsuarios();
            setUsuarios(dados);
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível carregar a lista de usuários.');
        } finally {
            if (showLoader) setIsLoading(false);
        }
    };

    useFocusEffect(useCallback(() => { carregarUsuarios(); }, []));

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await carregarUsuarios(false);
        setRefreshing(false);
    }, []);

    const handleSalvarUsuario = async ({ username, password }: { username: string, password?: string }) => {
        const trimmedUsername = username.trim();

        // Se estiver editando e uma nova senha foi digitada, pede a confirmação do admin
        if (usuarioEditando && password) {
            setUsuarioParaEditar(usuarioEditando);
            setNovaSenhaTemp(password);
            setIsPromptVisible(true); // Abre o modal de senha
            return;
        }

        setIsSaving(true);
        try {
            if (!usuarioEditando) {
                const usuarioExistente = await buscarUsuarioPorUsernameSQLite(trimmedUsername);
                if (usuarioExistente) {
                    Alert.alert("Erro", "Este nome de usuário já existe. Por favor, escolha outro.");
                    setIsSaving(false);
                    return;
                }
            }
            
            const passwordHash = CryptoJS.SHA256(password!).toString();
            const usuarioParaSalvar: Usuario = {
                username: trimmedUsername,
                passwordHash: passwordHash,
            };

            await adicionarOuAtualizarUsuario(usuarioParaSalvar);
            await carregarUsuarios(false);
            setMostrarFormulario(false);
            setUsuarioEditando(null);
        } catch (error) {
            Alert.alert('Erro ao Salvar', 'Não foi possível salvar o usuário.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmarExclusao = (usuario: Usuario) => {
        if (usuarios.length <= 1) {
            Alert.alert("Ação não permitida", "Não é possível excluir o único usuário do sistema.");
            return;
        }
        if (usuario.username.toLowerCase() === loggedInUsername?.toLowerCase()) {
            Alert.alert("Ação não permitida", "Você não pode excluir o seu próprio usuário.");
            return;
        }
        setUsuarioParaExcluir(usuario);
        setIsPromptVisible(true);
    };

    const handlePasswordSubmit = async (password: string) => {
        if (!password || !loggedInUsername) {
            setIsPromptVisible(false);
            return;
        }

        setIsVerifyingPassword(true);
        try {
            const adminUser = await buscarUsuarioPorUsernameSQLite(loggedInUsername);
            if (!adminUser) throw new Error("Usuário admin não encontrado.");

            const passwordHashDigitado = CryptoJS.SHA256(password).toString();
            if (passwordHashDigitado !== adminUser.passwordHash) {
                Alert.alert("Senha Incorreta", "A senha digitada não confere. A operação foi cancelada.");
                setIsPromptVisible(false);
                return;
            }

            // Se a senha estiver correta, decide qual ação tomar
            if (usuarioParaExcluir) {
                await excluirUsuario(usuarioParaExcluir.username);
                Alert.alert("Sucesso", `Usuário "${usuarioParaExcluir.username}" excluído.`);
            } else if (usuarioParaEditar) {
                const hashNovaSenha = CryptoJS.SHA256(novaSenhaTemp).toString();
                const usuarioAtualizado = { ...usuarioParaEditar, passwordHash: hashNovaSenha };
                await adicionarOuAtualizarUsuario(usuarioAtualizado);
                Alert.alert("Sucesso", `Senha do usuário "${usuarioParaEditar.username}" alterada.`);
            }
            
            setIsPromptVisible(false);
            await carregarUsuarios(false);
            setMostrarFormulario(false);

        } catch (error) {
            Alert.alert("Erro de Verificação", "Ocorreu um erro ao verificar a senha.");
            setIsPromptVisible(false);
        } finally {
            setIsVerifyingPassword(false);
            setUsuarioParaExcluir(null);
            setUsuarioParaEditar(null);
            setNovaSenhaTemp('');
        }
    };

    const usuariosFiltrados = usuarios.filter(u => 
        u.username.toLowerCase().includes(termoBusca.toLowerCase())
    );

    const renderItemUsuario = ({ item }: { item: Usuario }) => (
        <View style={styles.card}>
            <MaterialCommunityIcons name="account-circle-outline" size={32} color="#E0E0FF" />
            <Text style={styles.cardTitle}>{item.username}</Text>
            <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => { setUsuarioEditando(item); setMostrarFormulario(true); }} style={styles.actionButton}>
                    <MaterialCommunityIcons name="pencil-outline" size={24} color="#FFC107" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleConfirmarExclusao(item)} style={styles.actionButton}>
                    <MaterialCommunityIcons name="delete-outline" size={24} color="#F44336" />
                </TouchableOpacity>
            </View>
        </View>
    );

    if (isLoading) {
        return (
            <ImageBackground source={require('../../assets/images/fundo.jpg')} style={styles.background} blurRadius={2}>
                <View style={styles.overlay} />
                <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#FFFFFF" /></View>
            </ImageBackground>
        );
    }

    const modalMessage = usuarioParaExcluir 
        ? `Para excluir o usuário "${usuarioParaExcluir.username}", digite a sua senha de administrador.`
        : `Para alterar a senha de "${usuarioParaEditar?.username}", digite a sua senha de administrador.`;

    return (
        <ImageBackground source={require('../../assets/images/fundo.jpg')} style={styles.background} blurRadius={2}>
            <View style={styles.overlay} />
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.headerContainer}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Gerenciar Usuários</Text>
                </View>

                {mostrarFormulario ? (
                    <FormularioUsuario
                        usuarioEditando={usuarioEditando}
                        onSave={handleSalvarUsuario}
                        onCancel={() => { setMostrarFormulario(false); setUsuarioEditando(null); }}
                        isSaving={isSaving}
                    />
                ) : (
                    <>
                        <View style={styles.buscaContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Pesquisar usuário..."
                                value={termoBusca}
                                onChangeText={setTermoBusca}
                                placeholderTextColor="#A9A9A9"
                            />
                        </View>
                        <FlatList
                            data={usuariosFiltrados}
                            keyExtractor={(item) => item.username}
                            renderItem={renderItemUsuario}
                            ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>Nenhum usuário encontrado.</Text></View>}
                            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />}
                        />
                        <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 20 }]}>
                            <TouchableOpacity style={styles.addButton} onPress={() => { setUsuarioEditando(null); setMostrarFormulario(true); }}>
                                <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
                                <Text style={styles.addButtonText}>Novo Usuário</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}

                <PasswordPromptModal
                    visible={isPromptVisible}
                    onClose={() => setIsPromptVisible(false)}
                    onSubmit={handlePasswordSubmit}
                    title="Confirmar Ação"
                    message={modalMessage}
                    isSubmitting={isVerifyingPassword}
                />
            </SafeAreaView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: { flex: 1 },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(25, 10, 50, 0.65)' },
    safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10 },
    backButton: { padding: 8 },
    title: { fontSize: 26, fontFamily: 'Roboto-Bold', color: '#FFFFFF', textAlign: 'center', flex: 1, marginRight: 40 },
    buscaContainer: { paddingHorizontal: 16, paddingBottom: 10 },
    emptyContainer: { alignItems: 'center', marginTop: '40%' },
    emptyText: { fontSize: 18, fontFamily: 'Roboto-Regular', color: 'rgba(255,255,255,0.7)' },
    card: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 12, padding: 15, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
    cardTitle: { flex: 1, fontSize: 18, fontFamily: 'Roboto-Bold', color: '#FFFFFF', marginLeft: 15 },
    cardActions: { flexDirection: 'row' },
    actionButton: { padding: 8, marginLeft: 10 },
    footer: {
        paddingTop: 20,
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(25, 10, 50, 0.85)'
    },
    addButton: { backgroundColor: '#4CAF50', flexDirection: 'row', paddingVertical: 15, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
    addButtonText: { color: 'white', fontSize: 17, fontFamily: 'Roboto-Bold', marginLeft: 10 },
    formScrollContainer: {
        padding: 20,
    },
    formTitle: { fontSize: 22, fontFamily: 'Roboto-Bold', color: '#FFFFFF', marginBottom: 20, textAlign: 'center' },
    input: { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: 15, fontSize: 16, fontFamily: 'Roboto-Regular', color: '#FFFFFF', marginBottom: 15 },
    disabledInput: { backgroundColor: 'rgba(0,0,0,0.15)', color: '#999' },
    formActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    formButton: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
    cancelButton: { backgroundColor: '#555', marginRight: 10 },
    saveButton: { backgroundColor: '#4CAF50' },
    disabledButton: { opacity: 0.6 },
    formButtonText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Roboto-Bold', },
});