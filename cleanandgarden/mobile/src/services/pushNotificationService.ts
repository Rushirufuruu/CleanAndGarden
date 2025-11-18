import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

/**
 * Obtiene el token de Expo Push Notifications
 */
export async function obtenerExpoPushToken(): Promise<string | null> {
  try {
    // Solo funciona en dispositivos físicos
    if (!Device.isDevice) {
      console.warn('⚠️ Push notifications solo funcionan en dispositivos físicos');
      return null;
    }

    // Solicitar permisos
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('❌ Permisos de notificación denegados');
      return null;
    }

    // Obtener el token de Expo Push
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    
    console.log('✅ Token de Expo Push obtenido:', token);
    
    // Configurar canal para Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Notificaciones de Citas',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2E5430',
        sound: 'default',
      });
    }

    return token;
  } catch (error) {
    console.error('❌ Error al obtener token de push:', error);
    return null;
  }
}

/**
 * Registra el token de push en el backend
 */
export async function registrarTokenEnBackend(
  userEmail: string,
  pushToken: string
): Promise<boolean> {
  try {
    console.log('📤 Enviando token al backend...');
    console.log('Email:', userEmail);
    console.log('Token:', pushToken);
    console.log('Platform:', Platform.OS);

    const response = await fetch(`${API_URL}/api/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userEmail,
        pushToken: pushToken,
        platform: Platform.OS,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Error del servidor:', errorData);
      return false;
    }

    const data = await response.json();
    console.log('✅ Token registrado exitosamente:', data);
    return true;
  } catch (error) {
    console.error('❌ Error al registrar token:', error);
    return false;
  }
}

/**
 * Función principal para inicializar push notifications después del login
 */
export async function inicializarPushNotifications(userEmail: string): Promise<void> {
  try {
    console.log('🔔 Inicializando push notifications para:', userEmail);
    
    const token = await obtenerExpoPushToken();
    
    if (!token) {
      console.log('⚠️ No se pudo obtener el token de push');
      return;
    }

    await registrarTokenEnBackend(userEmail, token);
  } catch (error) {
    console.error('❌ Error en inicializarPushNotifications:', error);
  }
}

/**
 * Elimina el token del backend (para logout)
 */
export async function eliminarTokenDelBackend(userEmail: string): Promise<void> {
  try {
    await fetch(`${API_URL}/api/push-token/${userEmail}`, {
      method: 'DELETE',
    });
    console.log('✅ Token eliminado del backend');
  } catch (error) {
    console.error('❌ Error al eliminar token:', error);
  }
}
