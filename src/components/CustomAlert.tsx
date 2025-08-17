// src/components/CustomAlert.tsx
import React from "react";
import { Modal, View, TouchableOpacity, StyleSheet } from "react-native";
import { StyledText as Text } from './StyledText';
interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  onClose,
  onConfirm,
  confirmText = "OK",      // valor padrão
  cancelText = "Cancelar", // valor padrão
}) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttonRow}>
            {onConfirm && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.buttonText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={onConfirm || onClose}
            >
              <Text style={styles.buttonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    width: "80%",
    backgroundColor: "#494747f1",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "Roboto-Bold",
    color: "#fff",
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    fontFamily: "Roboto-Regular",
    color: "#ccc",
    textAlign: "center",
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  button: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#444",
  },
  confirmButton: {
    backgroundColor: "#e53935",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Roboto-Bold",
  },
});

export default CustomAlert;
