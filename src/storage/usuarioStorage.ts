// src/storage/usuarioStorage.ts
import * as SecureStore from 'expo-secure-store';
import { Usuario } from '../types'; // ✨ Importa o tipo 'Usuario'

// Chave única e padronizada para armazenar os dados do usuário.
const USER_KEY = "user_data_v2";

/**
 * Obtém todos os usuários salvos no armazenamento seguro.
 * @returns Uma Promise que resolve para um array de Usuários. Retorna um array vazio se não houver usuários ou em caso de erro.
 */
export async function obterTodosUsuarios(): Promise<Usuario[]> {
  try {
    const dados = await SecureStore.getItemAsync(USER_KEY);
    // ✨ Usa o tipo Usuario[] para garantir a segurança dos dados.
    return dados ? JSON.parse(dados) : [];
  } catch (error) {
    console.error("Erro ao obter todos os usuários:", error);
    return [];
  }
}

/**
 * Salva uma lista completa de usuários, substituindo qualquer lista existente.
 * Usado principalmente para inicialização ou restauração.
 * @param usuarios O array de Usuários a ser salvo.
 * @returns Uma Promise que resolve para 'true' em caso de sucesso. Lança um erro em caso de falha.
 */
export async function salvarTodosUsuarios(usuarios: Usuario[]): Promise<boolean> {
  try {
    const dados = JSON.stringify(usuarios);
    await SecureStore.setItemAsync(USER_KEY, dados);
    return true;
  } catch (error) {
    console.error("Erro ao salvar todos os usuários:", error);
    throw new Error("Não foi possível salvar os dados dos usuários.");
  }
}

/**
 * ✨ NOVA FUNÇÃO: Adiciona um novo usuário ou atualiza um existente.
 * Esta é uma forma mais segura e eficiente de gerenciar usuários individualmente.
 * @param usuario O objeto de usuário a ser adicionado ou atualizado.
 * @returns Uma Promise que resolve para 'true' em caso de sucesso. Lança um erro em caso de falha.
 */
export async function adicionarOuAtualizarUsuario(usuario: Usuario): Promise<boolean> {
    try {
        const usuariosAtuais = await obterTodosUsuarios();
        
        // Verifica se o usuário já existe na lista
        const indexExistente = usuariosAtuais.findIndex(u => u.username.toLowerCase() === usuario.username.toLowerCase());

        if (indexExistente >= 0) {
            // Se existe, atualiza os dados do usuário naquela posição.
            usuariosAtuais[indexExistente] = usuario;
        } else {
            // Se não existe, adiciona o novo usuário à lista.
            usuariosAtuais.push(usuario);
        }

        // Salva a lista atualizada de volta no SecureStore.
        await salvarTodosUsuarios(usuariosAtuais);
        return true;

    } catch (error) {
        console.error(`Erro ao adicionar/atualizar o usuário ${usuario.username}:`, error);
        throw new Error("Não foi possível salvar o usuário.");
    }
}


/**
 * Exclui um usuário da lista com base no seu nome de usuário.
 * @param username O nome do usuário a ser excluído (case-insensitive).
 * @returns Uma Promise que resolve para 'true' em caso de sucesso. Lança um erro em caso de falha.
 */
export async function excluirUsuario(username: string): Promise<boolean> {
  try {
    const usuariosAtuais = await obterTodosUsuarios();
    
    // Filtra a lista, garantindo que a comparação seja case-insensitive.
    const novaLista = usuariosAtuais.filter(
      u => u.username.toLowerCase() !== username.toLowerCase()
    );

    // Verifica se algum usuário foi de fato removido
    if (novaLista.length === usuariosAtuais.length) {
        console.warn(`Tentativa de excluir um usuário não existente: ${username}`);
        return false; // Retorna false se o usuário não foi encontrado
    }

    await salvarTodosUsuarios(novaLista);
    return true;
  } catch (error) {
    console.error(`Erro ao excluir o usuário ${username}:`, error);
    throw new Error("Não foi possível excluir o usuário.");
  }
}