/**
 * Servicio de Push Notifications
 * Maneja el registro de tokens y envío de notificaciones push usando Expo
 */

import { prisma } from './prisma.js';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

const expo = new Expo();

/**
 * Registra o actualiza el token de push de un dispositivo
 * @param email - Email del usuario
 * @param pushToken - Token de Expo Push
 * @param platform - Plataforma (ios/android)
 */
export async function registrarTokenPush(
  email: string,
  pushToken: string,
  platform: string
): Promise<void> {
  try {
    // Validar que el token sea válido para Expo
    if (!Expo.isExpoPushToken(pushToken)) {
      throw new Error('Token de push inválido');
    }

    // Buscar el usuario por email
    const usuario = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar si el token ya existe
    const dispositivoExistente = await prisma.dispositivo.findUnique({
      where: { token_push: pushToken },
    });

    if (dispositivoExistente) {
      // Actualizar última vez visto
      await prisma.dispositivo.update({
        where: { token_push: pushToken },
        data: {
          ultima_vez_visto: new Date(),
          plataforma: platform,
        },
      });
      console.log('✅ Token actualizado para usuario:', email);
    } else {
      // Crear nuevo registro
      await prisma.dispositivo.create({
        data: {
          usuario_id: usuario.id,
          token_push: pushToken,
          plataforma: platform,
          ultima_vez_visto: new Date(),
        },
      });
      console.log('✅ Nuevo token registrado para usuario:', email);
    }
  } catch (error) {
    console.error('❌ Error al registrar token de push:', error);
    throw error;
  }
}

/**
 * Elimina el token de push de un usuario
 * @param email - Email del usuario
 */
export async function eliminarTokenPush(email: string): Promise<void> {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    await prisma.dispositivo.deleteMany({
      where: { usuario_id: usuario.id },
    });

    console.log('✅ Tokens eliminados para usuario:', email);
  } catch (error) {
    console.error('❌ Error al eliminar tokens:', error);
    throw error;
  }
}

/**
 * Envía una notificación push a un usuario
 * @param email - Email del usuario
 * @param title - Título de la notificación
 * @param body - Cuerpo de la notificación
 * @param data - Datos adicionales
 */
export async function enviarNotificacionPush(
  email: string,
  title: string,
  body: string,
  data?: any
): Promise<void> {
  try {
    // Obtener dispositivos del usuario
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: { dispositivo: true },
    });

    if (!usuario || usuario.dispositivo.length === 0) {
      console.log('⚠️ Usuario no tiene dispositivos registrados:', email);
      return;
    }

    // Preparar mensajes
    const messages: ExpoPushMessage[] = [];
    
    for (const dispositivo of usuario.dispositivo) {
      if (!Expo.isExpoPushToken(dispositivo.token_push)) {
        console.warn(`Token inválido para dispositivo ${dispositivo.id}`);
        continue;
      }

      messages.push({
        to: dispositivo.token_push,
        sound: 'default',
        title: title,
        body: body,
        data: data || {},
        priority: 'high',
      });
    }

    if (messages.length === 0) {
      console.log('⚠️ No hay mensajes válidos para enviar');
      return;
    }

    // Enviar en chunks (Expo recomienda chunks de 100)
    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('❌ Error al enviar chunk:', error);
      }
    }

    // Log de resultados
    tickets.forEach((ticket, index) => {
      if (ticket.status === 'error') {
        console.error(`❌ Error en notificación ${index}:`, ticket.message);
      } else {
        console.log(`✅ Notificación ${index} enviada exitosamente`);
      }
    });

    console.log(`✅ ${tickets.length} notificaciones push enviadas a ${email}`);
  } catch (error) {
    console.error('❌ Error al enviar notificación push:', error);
    throw error;
  }
}

/**
 * Envía notificaciones push a múltiples usuarios
 * @param emails - Array de emails
 * @param title - Título de la notificación
 * @param body - Cuerpo de la notificación
 * @param data - Datos adicionales
 */
export async function enviarNotificacionPushMasiva(
  emails: string[],
  title: string,
  body: string,
  data?: any
): Promise<void> {
  console.log(`📤 Enviando notificaciones push a ${emails.length} usuarios...`);
  
  const promesas = emails.map(email => 
    enviarNotificacionPush(email, title, body, data).catch(error => {
      console.error(`Error al enviar a ${email}:`, error);
    })
  );

  await Promise.all(promesas);
  console.log('✅ Envío masivo completado');
}
