import { Server as WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { prisma } from './prisma';

export class ChatWebSocket {
	wss: WebSocketServer;

	constructor(server: any) {
		this.wss = new WebSocketServer({ server, path: '/ws' });

		this.wss.on('connection', (ws, req: IncomingMessage) => {
			console.log('🔌 Cliente WebSocket conectado');

			ws.on('message', async (data) => {
				try {
					const msg = JSON.parse(data.toString());
					// Solo procesar mensajes tipo 'join' para suscripción, no para crear mensajes
					if (msg.tipo === 'join' && msg.conversacionId) {
						// El cliente se une a una conversación, no se crea mensaje ni se hace broadcast
						// Puedes agregar lógica de suscripción si lo necesitas
						return;
					}
					// Si se recibe otro tipo, ignorar o manejar según sea necesario
				} catch (err) {
					console.error('Error al procesar mensaje WebSocket:', err);
					ws.send(JSON.stringify({ tipo: 'error', error: 'Error interno WebSocket' }));
				}
			});

			ws.on('close', () => {
				console.log('🔌 Cliente WebSocket desconectado');
			});
		});
	}

	broadcast(data: string) {
		this.wss.clients.forEach((client) => {
			if (client.readyState === 1) {
				client.send(data);
			}
		});
	}
}
