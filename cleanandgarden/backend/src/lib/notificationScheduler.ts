import { prisma } from './prisma';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo();

/**
 * Envía notificaciones push de recordatorio para citas próximas
 * @param horasAntes - Número de horas antes de la cita (24 o 2)
 */
export async function enviarRecordatoriosCitas(horasAntes: number): Promise<void> {
  try {
    console.log(`🔔 Buscando citas en ${horasAntes} horas...`);

    const ahora = new Date();
    const tiempoObjetivo = new Date(ahora.getTime() + horasAntes * 60 * 60 * 1000);

    // Rango de búsqueda: ±15 minutos del tiempo objetivo
    const margenMinutos = 15;
    const desde = new Date(tiempoObjetivo.getTime() - margenMinutos * 60 * 1000);
    const hasta = new Date(tiempoObjetivo.getTime() + margenMinutos * 60 * 1000);

    console.log(`📅 Buscando citas entre ${desde.toISOString()} y ${hasta.toISOString()}`);

    // Buscar citas confirmadas o pendientes en el rango de tiempo
    const citas = await prisma.cita.findMany({
      where: {
        fecha_hora: {
          gte: desde,
          lte: hasta,
        },
        estado: {
          in: ['confirmada', 'pendiente'],
        },
      },
      include: {
        usuario_cita_cliente_idTousuario: {
          select: {
            id: true,
            email: true,
            nombre: true,
          },
        },
        servicio: {
          select: {
            nombre: true,
          },
        },
        jardin: {
          select: {
            nombre: true,
          },
        },
      },
    });

    if (citas.length === 0) {
      console.log(`✅ No hay citas en ${horasAntes} horas`);
      return;
    }

    console.log(`📋 Encontradas ${citas.length} citas`);

    // Para cada cita, buscar los tokens del cliente
    for (const cita of citas) {
      const cliente = cita.usuario_cita_cliente_idTousuario;
      
      // Obtener tokens del dispositivo del cliente
      const dispositivos = await prisma.dispositivo.findMany({
        where: {
          usuario_id: cliente.id,
        },
      });

      if (dispositivos.length === 0) {
        console.log(`⚠️ Cliente ${cliente.email} no tiene tokens registrados`);
        continue;
      }

      // Preparar tokens válidos
      const pushTokens = dispositivos
        .map(d => d.token_push)
        .filter(token => Expo.isExpoPushToken(token));

      if (pushTokens.length === 0) {
        console.log(`⚠️ Cliente ${cliente.email} no tiene tokens válidos`);
        continue;
      }

      // Formatear fecha de la cita
      const fechaCita = new Date(cita.fecha_hora);
      const fechaFormateada = fechaCita.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const horaFormateada = fechaCita.toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
      });

      // Crear mensajes de notificación
      const messages: ExpoPushMessage[] = pushTokens.map(token => ({
        to: token,
        sound: 'default',
        title: `Recordatorio: Cita en ${horasAntes}h`,
        body: `${cita.servicio.nombre} - ${fechaFormateada} a las ${horaFormateada}`,
        data: {
          tipo: 'recordatorio',
          citaId: cita.id.toString(),
          horasAntes,
        },
        priority: 'high',
      }));

      // Enviar notificaciones en chunks
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          console.log(`✅ Notificaciones enviadas a ${cliente.nombre}:`, ticketChunk);
        } catch (error) {
          console.error(`❌ Error enviando notificación a ${cliente.email}:`, error);
        }
      }
    }

    console.log(`✅ Proceso de recordatorios de ${horasAntes}h completado`);
  } catch (error) {
    console.error(`❌ Error en enviarRecordatoriosCitas(${horasAntes}):`, error);
    throw error;
  }
}

/**
 * Envía notificación de recordatorio 24 horas antes
 */
export async function enviarRecordatorios24Horas(): Promise<void> {
  return enviarRecordatoriosCitas(24);
}

/**
 * Envía notificación de recordatorio 2 horas antes
 */
export async function enviarRecordatorios2Horas(): Promise<void> {
  return enviarRecordatoriosCitas(2);
}
