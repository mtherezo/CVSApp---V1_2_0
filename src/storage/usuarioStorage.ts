import * as SecureStore from "expo-secure-store";

// Chave única para armazenar a lista de usuários no SecureStore.
const USER_KEY = "user_data";

/**
 * Salva uma lista completa de usuários, substituindo qualquer lista existente.
 * @param usuarios O array de usuários a ser salvo.
 * @returns Uma Promise que resolve para 'true' se os dados forem salvos com sucesso, e 'false' caso contrário.
 */
export async function salvarTodosUsuarios(usuarios: any[]): Promise<boolean> {
  try {
    // Converte o array de usuários para uma string JSON.
    const dados = JSON.stringify(usuarios);
    // Salva a string no SecureStore.
    await SecureStore.setItemAsync(USER_KEY, dados);
    return true; // Sucesso
  } catch (error) {
    // Exibe um erro no console se algo der errado.
    console.error("Erro ao salvar todos os usuários:", error);
    return false; // Falha
  }
}

/**
 * Obtém todos os usuários salvos no armazenamento seguro.
 * @returns Uma Promise que resolve para um array de usuários. Retorna um array vazio se não houver usuários ou em caso de erro.
 */
export async function obterTodosUsuarios(): Promise<any[]> {
  try {
    // Tenta obter os dados do SecureStore.
    const dados = await SecureStore.getItemAsync(USER_KEY);

    // Se não houver dados, retorna um array vazio.
    if (!dados) {
      return [];
    }

    // Analisa a string JSON para obter a lista de usuários.
    return JSON.parse(dados);
  } catch (error) {
    // Exibe um erro no console se algo der errado.
    console.error("Erro ao obter todos os usuários:", error);
    // Retorna um array vazio para garantir que a aplicação não quebre.
    return [];
  }
}


/**
 * Exclui um usuário da lista com base no seu nome de usuário.
 * @param username O nome do usuário a ser excluído.
 * @returns Uma Promise que resolve para 'true' se a exclusão for bem-sucedida, e 'false' caso contrário.
 */
export async function excluirUsuario(username: string): Promise<boolean> {
  try {
    // Obtém a lista atual de usuários.
    const usuariosAtuais = await obterTodosUsuarios();

    // Se não houver usuários, não há nada a excluir.
    if (usuariosAtuais.length === 0) {
      return false;
    }

    // Filtra a lista, mantendo apenas os usuários cujo username é diferente do fornecido.
    const novaLista = usuariosAtuais.filter((u: any) => u.username !== username);

    // Salva a nova lista (sem o usuário excluído) de volta no SecureStore.
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(novaLista));
    
    return true; // Sucesso
  } catch (error) {
    // Exibe um erro no console se algo der errado.
    console.error("Erro ao excluir usuário:", error);
    return false; // Falha
  }
}
