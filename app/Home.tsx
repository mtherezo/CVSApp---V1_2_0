import { useLocalSearchParams, useRouter, Href } from "expo-router";
import {
  ImageBackground,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  SafeAreaView,
  ScrollView,
  Alert,
  StatusBar
} from "react-native";
import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const navButtons: { title: string; icon: IconName; path: Href }[] = [
  { title: 'Gerenciar Clientes', icon: 'account-group-outline', path: '/Clientes' as Href },
  { title: 'Vendas por Cliente', icon: 'account-cash-outline', path: '/Vendasporclientes' as Href },
  { title: 'Pesquisar Vendas', icon: 'magnify', path: '/Pesquisarvendascliente' as Href },
  { title: 'Histórico de Vendas', icon: 'history', path: '/Todasvendas' as Href },
  { title: 'Relatórios', icon: 'file-chart-outline', path: '/Gerarrelatorios' as Href },
];

const adminButton: { title: string; icon: IconName; path: Href } =
  { title: 'Gerenciar Usuários', icon: 'account-cog-outline', path: '/Cadastrousuario' as Href };

const ADMIN_USERNAME = "stherezo";

export default function home() {
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

  const navigateTo = (path: Href) => {
    router.push(path);
  };

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
            <Text style={styles.title}>Bem-vinda de volta,</Text>
            <Text style={styles.usernameText}>{displayName}!</Text>
          </View>

          <View style={styles.buttonGrid}>
            {navButtons.map((button) => (
              <TouchableOpacity key={button.title} style={styles.gridButton} onPress={() => navigateTo(button.path)}>
                <MaterialCommunityIcons name={button.icon} size={36} color="#FFFFFF" />
                <Text style={styles.gridButtonText}>{button.title}</Text>
              </TouchableOpacity>
            ))}

            {loggedInUsername === ADMIN_USERNAME.toLowerCase()
              ? (
                <TouchableOpacity style={styles.gridButton} onPress={() => navigateTo(adminButton.path)}>
                  <MaterialCommunityIcons name={adminButton.icon} size={36} color="#FFFFFF" />
                  <Text style={styles.gridButtonText}>{adminButton.title}</Text>
                </TouchableOpacity>
              )
              : null}
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={20} color="#FFDDC5" />
            <Text style={styles.logoutButtonText}>Sair</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(25, 10, 50, 0.65)',
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '300',
    color: "#E0E0FF",
    textAlign: "center",
  },
  usernameText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: "#FFFFFF",
    textAlign: "center",
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    width: '48%',
    aspectRatio: 1,
    marginBottom: '4%',
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
});
