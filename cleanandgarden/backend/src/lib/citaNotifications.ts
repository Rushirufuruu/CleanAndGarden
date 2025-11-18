import { prisma } from './prisma';
import { Expo } from 'expo-server-sdk';

const expo = new Expo();

/**
 * Envía notificación push a un cliente
 */
async function enviarNotificacionCliente(
  clienteId: bigint,
  title: string,
  body: string,
  data: any
): Promise<void> {
  try {
    const dispositivos = await prisma.dispositivo.findMany({
      where: { usuario_id: clienteId }
    });

    if (dispositivos.length === 0) {
      console.log(`⚠️ Cliente ${clienteId} no tiene tokens registrados`);
      return;
    }

    const pushTokens = dispositivos
      .map(d => d.token_push)
      .filter(token => Expo.isExpoPushToken(token));

    if (pushTokens.length === 0) {
      console.log(`⚠️ Cliente ${clienteId} no tiene tokens válidos`);
      return;
    }

    const messages = pushTokens.map(token => ({
      to: token,
      sound: 'default' as const,
      title,
      body,
      data,
      priority: 'high' as const,
    }));

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
    
    console.log(`✅ Notificación enviada al cliente ${clienteId}: ${title}`);
  } catch (error) {
    console.error(`❌ Error enviando notificación al cliente ${clienteId}:`, error);
  }
}

/**
 * Formatea fecha y hora para notificaciones
 */
function formatearFechaHora(fecha: Date): { fecha: string; hora: string } {
  return {
    fecha: fecha.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
    hora: fecha.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

/**
 * Notificación cuando se crea una cita
 */
export async function notificarCitaCreada(citaId: bigint): Promise<void> {
  try {
    const cita = await prisma.cita.findUnique({
      where: { id: citaId },
      include: {
        usuario_cita_cliente_idTousuario: true,
        servicio: { select: { nombre: true } },
      }
    });

    if (!cita) return;

    const { fecha, hora } = formatearFechaHora(new Date(cita.fecha_hora));
    
    await enviarNotificacionCliente(
      cita.cliente_id,
      '✅ Cita Confirmada',
      `${cita.servicio.nombre} - ${fecha} a las ${hora}`,
      {
        tipo: 'cita_creada',
        citaId: citaId.toString(),
      }
    );
  } catch (error) {
    console.error('❌ Error en notificarCitaCreada:', error);
  }
}

/**
 * Notificación cuando se cancela una cita
 */
export async function notificarCitaCancelada(citaId: bigint, motivo?: string): Promise<void> {
  try {
    const cita = await prisma.cita.findUnique({
      where: { id: citaId },
      include: {
        usuario_cita_cliente_idTousuario: true,
        servicio: { select: { nombre: true } },
      }
    });

    if (!cita) return;

    const { fecha, hora } = formatearFechaHora(new Date(cita.fecha_hora));
    
    await enviarNotificacionCliente(
      cita.cliente_id,
      '❌ Cita Cancelada',
      `${cita.servicio.nombre} - ${fecha} a las ${hora}`,
      {
        tipo: 'cita_cancelada',
        citaId: citaId.toString(),
        motivo: motivo || 'Sin motivo especificado',
      }
    );
  } catch (error) {
    console.error('❌ Error en notificarCitaCancelada:', error);
  }
}

/**
 * Notificación cuando se confirma una cita
 */
export async function notificarCitaConfirmada(citaId: bigint): Promise<void> {
  try {
    const cita = await prisma.cita.findUnique({
      where: { id: citaId },
      include: {
        usuario_cita_cliente_idTousuario: true,
        servicio: { select: { nombre: true } },
      }
    });

    if (!cita) return;

    const { fecha, hora } = formatearFechaHora(new Date(cita.fecha_hora));
    
    await enviarNotificacionCliente(
      cita.cliente_id,
      '✅ Cita Confirmada',
      `${cita.servicio.nombre} - ${fecha} a las ${hora}`,
      {
        tipo: 'cita_confirmada',
        citaId: citaId.toString(),
      }
    );
  } catch (error) {
    console.error('❌ Error en notificarCitaConfirmada:', error);
  }
}

/**
 * Notificación cuando cambia el estado de una cita
 */
export async function notificarCambioCita(citaId: bigint, estadoAnterior: string, estadoNuevo: string): Promise<void> {
  try {
    // Evitar notificar si no hay cambio real
    if (estadoAnterior === estadoNuevo) return;

    const cita = await prisma.cita.findUnique({
      where: { id: citaId },
      include: {
        usuario_cita_cliente_idTousuario: true,
        servicio: { select: { nombre: true } },
      }
    });

    if (!cita) return;

    const { fecha, hora } = formatearFechaHora(new Date(cita.fecha_hora));
    let title = '';
    let emoji = '📋';

    switch (estadoNuevo) {
      case 'confirmada':
        title = '✅ Cita Confirmada';
        emoji = '✅';
        break;
      case 'cancelada':
        title = '❌ Cita Cancelada';
        emoji = '❌';
        break;
      case 'realizada':
        title = '✔️ Cita Completada';
        emoji = '✔️';
        break;
      case 'pendiente':
        title = '⏳ Cita Pendiente';
        emoji = '⏳';
        break;
      default:
        title = `${emoji} Cambio en tu Cita`;
    }

    await enviarNotificacionCliente(
      cita.cliente_id,
      title,
      `${cita.servicio.nombre} - ${fecha} a las ${hora}`,
      {
        tipo: 'cita_actualizada',
        citaId: citaId.toString(),
        estadoAnterior,
        estadoNuevo,
      }
    );
  } catch (error) {
    console.error('❌ Error en notificarCambioCita:', error);
  }
}

/**
 * Notificación cuando se aprueba un pago
 */
export async function notificarPagoAprobado(pagoId: bigint): Promise<void> {
  try {
    const pago = await prisma.pago.findUnique({
      where: { id: pagoId },
      include: {
        cita: {
          include: {
            servicio: { select: { nombre: true } },
          }
        },
      }
    });

    if (!pago || !pago.cita) return;

    await enviarNotificacionCliente(
      pago.usuario_id,
      '💳 Pago Aprobado',
      `Tu pago de $${pago.monto_clp} para ${pago.cita.servicio.nombre} ha sido aprobado`,
      {
        tipo: 'pago_aprobado',
        pagoId: pagoId.toString(),
        citaId: pago.cita_id.toString(),
        monto: pago.monto_clp?.toString(),
      }
    );
  } catch (error) {
    console.error('❌ Error en notificarPagoAprobado:', error);
  }
}

/**
 * Notificación cuando se rechaza un pago
 */
export async function notificarPagoRechazado(pagoId: bigint): Promise<void> {
  try {
    const pago = await prisma.pago.findUnique({
      where: { id: pagoId },
      include: {
        cita: {
          include: {
            servicio: { select: { nombre: true } },
          }
        },
      }
    });

    if (!pago || !pago.cita) return;

    await enviarNotificacionCliente(
      pago.usuario_id,
      '❌ Pago Rechazado',
      `Tu pago de $${pago.monto_clp} para ${pago.cita.servicio.nombre} no pudo ser procesado`,
      {
        tipo: 'pago_rechazado',
        pagoId: pagoId.toString(),
        citaId: pago.cita_id.toString(),
        monto: pago.monto_clp?.toString(),
      }
    );
  } catch (error) {
    console.error('❌ Error en notificarPagoRechazado:', error);
  }
}

/**
 * Notificación cuando cambia el estado de un pago
 */
export async function notificarCambioPago(pagoId: bigint, estadoAnterior: string, estadoNuevo: string): Promise<void> {
  try {
    if (estadoAnterior === estadoNuevo) return;

    if (estadoNuevo === 'aprobado') {
      await notificarPagoAprobado(pagoId);
    } else if (estadoNuevo === 'rechazado') {
      await notificarPagoRechazado(pagoId);
    }
  } catch (error) {
    console.error('❌ Error en notificarCambioPago:', error);
  }
}
