// PasswordPromptModal.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface PasswordPromptModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (password: string) => void;
    title: string;
    message: string;
    isSubmitting: boolean;
}

export default function PasswordPromptModal({ visible, onClose, onSubmit, title, message, isSubmitting }: PasswordPromptModalProps) {
    const [password, setPassword] = useState('');

    const handleSubmit = () => {
        onSubmit(password);
        setPassword(''); // Limpa a senha após o envio
    };

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{title}</Text>
                    <Text style={styles.modalMessage}>{message}</Text>
                    
                    <View style={styles.inputContainer}>
                        <MaterialCommunityIcons name="lock-outline" size={22} color="#A9A9A9" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Digite sua senha"
                            placeholderTextColor="#A9A9A9"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                            onSubmitEditing={handleSubmit}
                        />
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose} disabled={isSubmitting}>
                            <Text style={styles.buttonText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, styles.confirmButton, isSubmitting && { opacity: 0.7 }]} onPress={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting 
                                ? <ActivityIndicator color="#FFFFFF" /> 
                                : <Text style={styles.buttonText}>Confirmar</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', backgroundColor: '#2c1d4f', borderRadius: 16, padding: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', marginBottom: 10 },
    modalMessage: { fontSize: 16, color: '#E0E0FF', textAlign: 'center', marginBottom: 20 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.25)', borderRadius: 12, marginBottom: 25 },
    inputIcon: { paddingHorizontal: 15 },
    input: { flex: 1, paddingVertical: 14, paddingRight: 15, fontSize: 16, color: '#FFFFFF' },
    buttonContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    button: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
    cancelButton: { backgroundColor: '#555', marginRight: 10 },
    confirmButton: { backgroundColor: '#F44336' },
    buttonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});