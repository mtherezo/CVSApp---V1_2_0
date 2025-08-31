// src/services/notificationService.ts
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buscarVendasComVencimentoHojeSQLite } from '../database/sqlite';

const NOTIFICATION_TASK_NAME = 'VENCIMENTO_NOTIFICATION_TASK';
const NOTIFICATION_STATUS_KEY = '@notificationStatus';

// 1. Define o que a tarefa em segundo plano vai fazer
TaskManager.defineTask(NOTIFICATION_TASK_NAME, async () => {
  try {
    console.log("TAREFA EM SEGUNDO PLANO: A verificar vencimentos...");
    const vendasComVencimento = await buscarVendasComVencimentoHojeSQLite();

    if (vendasComVencimento.length > 0) {
      
      let notificationBody = '';
      const totalVendas = vendasComVencimento.length;

      if (totalVendas === 1) {
        // Se for apenas uma venda, a mensagem é específica.
        const nomeCliente = vendasComVencimento[0].clienteNome;
        notificationBody = `Lembrete: A parcela de ${nomeCliente} vence amanhã.`;
      } else {
        // LÓGICA ATUALIZADA PARA MOSTRAR ATÉ 3 NOMES
        const todosNomes = vendasComVencimento.map(v => v.clienteNome);
        let nomesExibidos = '';

        if (totalVendas <= 3) {
          // Se houver 2 ou 3 vencimentos, mostra todos os nomes.
          nomesExibidos = todosNomes.join(', ');
        } else {
          // Se houver mais de 3, mostra os 3 primeiros e um sinal de '+'
          nomesExibidos = `${todosNomes.slice(0, 3).join(', ')} +`;
        }
        
        notificationBody = `Você tem ${totalVendas} vencimentos para amanhã (${nomesExibidos}). Toque para ver os detalhes.`;
      }
      
      // Agenda a notificação para aparecer
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Lembrete de Vencimentos!',
          body: notificationBody,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { screen: 'Todasvendas' }, 
        },
        trigger: null,
      });
      console.log(`TAREFA: Notificação agendada para ${vendasComVencimento.length} venda(s).`);
    } else {
      console.log("TAREFA: Nenhuma venda com vencimento para amanhã.");
    }
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("TAREFA: Erro ao executar a tarefa de notificação.", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// 2. Funções para registar e cancelar a tarefa (sem alterações)
export async function registerBackgroundTask() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Permissão para notificações não concedida!');
      await AsyncStorage.setItem(NOTIFICATION_STATUS_KEY, 'disabled');
      return false;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(NOTIFICATION_TASK_NAME);
    if (isRegistered) {
      console.log("Tarefa de notificação já está registada.");
      await AsyncStorage.setItem(NOTIFICATION_STATUS_KEY, 'enabled');
      return true;
    }

    await BackgroundFetch.registerTaskAsync(NOTIFICATION_TASK_NAME, {
      minimumInterval: 60 * 60 * 12, // A cada 12 horas
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log("Tarefa de notificação registada com sucesso!");
    await AsyncStorage.setItem(NOTIFICATION_STATUS_KEY, 'enabled');
    return true;
  } catch (error) {
    console.error("Erro ao registar a tarefa de background:", error);
    await AsyncStorage.setItem(NOTIFICATION_STATUS_KEY, 'disabled');
    return false;
  }
}

export async function unregisterBackgroundTask() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(NOTIFICATION_TASK_NAME);
  if (isRegistered) {
    await BackgroundFetch.unregisterTaskAsync(NOTIFICATION_TASK_NAME);
    console.log("Tarefa de notificação cancelada.");
  }
  await AsyncStorage.setItem(NOTIFICATION_STATUS_KEY, 'disabled');
}

export const getNotificationStatus = async (): Promise<'enabled' | 'disabled'> => {
  const status = await AsyncStorage.getItem(NOTIFICATION_STATUS_KEY);
  const isRegistered = await TaskManager.isTaskRegisteredAsync(NOTIFICATION_TASK_NAME);
  if (isRegistered) return 'enabled';
  return (status as 'enabled' | 'disabled') || 'disabled';
};





{/*import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buscarVendasComVencimentoHojeSQLite } from '../database/sqlite';

const NOTIFICATION_TASK_NAME = 'VENCIMENTO_NOTIFICATION_TASK';
const NOTIFICATION_STATUS_KEY = '@notificationStatus';

// 1. Define o que a tarefa em segundo plano vai fazer
TaskManager.defineTask(NOTIFICATION_TASK_NAME, async () => {
  try {
    console.log("TAREFA EM SEGUNDO PLANO: Verificando vendas com vencimentos...");
    const vendasComVencimento = await buscarVendasComVencimentoHojeSQLite();

    if (vendasComVencimento.length > 0) {
      const totalVendas = vendasComVencimento.length;
      const plural = totalVendas > 1 ? 's' : '';
      
      // Agenda a notificação para aparecer imediatamente
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Lembrete de Vencimentos!',
          body: `Você tem ${totalVendas} venda${plural} com vencimento hoje. Toque para ver os detalhes.`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { screen: 'Todasvendas' }, // Para onde levar o utilizador ao tocar
        },
        trigger: null,
      });
      console.log(`TAREFA: Notificação agendada para ${totalVendas} venda(s).`);
    } else {
      console.log("TAREFA: Nenhuma venda com vencimento hoje.");
    }
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("TAREFA: Erro ao executar a tarefa de notificação.", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// 2. Função para registar e agendar a tarefa
export async function registerBackgroundTask() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Permissão para notificações não concedida!');
      return;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(NOTIFICATION_TASK_NAME);
    if (isRegistered) {
      console.log("Tarefa de notificação já está registada.");
      return;
    }

    await BackgroundFetch.registerTaskAsync(NOTIFICATION_TASK_NAME, {
      minimumInterval: 60 * 60 * 12, // 12 horas em segundos
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log("Tarefa de notificação registada com sucesso!");
    await AsyncStorage.setItem(NOTIFICATION_STATUS_KEY, 'enabled');
  } catch (error) {
    console.error("Erro ao registar a tarefa de background:", error);
  }
}


// Cancela a tarefa em segundo plano.
 
export async function unregisterBackgroundTask() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(NOTIFICATION_TASK_NAME);
  if (isRegistered) {
    await BackgroundFetch.unregisterTaskAsync(NOTIFICATION_TASK_NAME);
    console.log("Tarefa de notificação cancelada.");
    await AsyncStorage.setItem(NOTIFICATION_STATUS_KEY, 'disabled');
  }
}

// Verifica o status do armazenamento
export const getNotificationStatus = async (): Promise<'enabled' | 'disabled'> => {
  const status = await AsyncStorage.getItem(NOTIFICATION_STATUS_KEY);
  return (status as 'enabled' | 'disabled') || 'disabled';
};
*/}