# 💬 ANÁLISIS: QUÉ FALTA EN EL SISTEMA DE CHAT

**Fecha de análisis:** 17 de Octubre 2025  
**Estado:** Identificación de tareas pendientes

---

## 🎯 RESUMEN EJECUTIVO

El sistema de chat tiene:
- ✅ Endpoints REST básicos en backend
- ✅ Interfaz de usuario en frontend (parcial)
- ❌ **FALTA: Conexión en tiempo real (WebSocket/SSE)**
- ❌ **FALTA: Persistencia de mensajes en BD**
- ❌ **FALTA: Notificaciones en tiempo real**
- ❌ **FALTA: Integración front-back**

---

## 📋 ESTADO ACTUAL DEL CHAT

### Backend (Express) - PARCIAL ✅❌

#### Endpoints Existentes:
```typescript
✅ GET  /conversaciones              - Listar conversaciones del usuario
✅ GET  /conversaciones/:id/mensajes - Obtener mensajes de una conversación
✅ POST /conversaciones              - Crear conversación con otro usuario
✅ POST /mensajes                    - Enviar mensaje
✅ GET  /usuarios/buscar             - Buscar usuarios para chatear
```

#### Problemas:
- ❌ No hay **WebSocket** para mensajes en tiempo real
- ❌ No hay **Server-Sent Events (SSE)** para notificaciones
- ❌ No hay endpoint para **eliminar/editar mensajes**
- ❌ No hay endpoint para **marcar como leído**
- ❌ No hay **autenticación de Socket**
- ❌ No hay **validación de mensajes vacíos**

---

### Frontend (Next.js) - INCOMPLETO ❌

#### Componentes Existentes:
```
web/src/app/chat/page.tsx              ✅ Página de chat (UI básica)
web/src/components/realtime-chat.tsx   ⚠️  Componente realtime (pero no conectado)
web/src/components/chat-message.tsx    ✅ Componente individual de mensaje
web/src/hooks/use-realtime-chat.tsx    ❌ Hook incompleto (necesita WebSocket)
web/src/hooks/use-chat-scroll.tsx      ✅ Hook para scroll
```

#### Problemas:
- ❌ El hook `useRealtimeChat` no está conectado a WebSocket real
- ❌ No hay conexión con endpoints REST del backend
- ❌ No carga mensajes anteriores de BD
- ❌ No hay persistencia de conversaciones
- ❌ No hay notificaciones visuales
- ❌ No hay indicador de "escribiendo..."
- ❌ No hay estados de entrega (enviado, leído)
- ❌ No hay integración con Supabase Realtime

---

## 📦 MÓDULOS QUE NECESITAS IMPLEMENTAR

### 1️⃣ **WebSocket Server** (Backend)
**Archivo a crear:** `backend/src/lib/websocket.ts`

**Responsabilidades:**
- Mantener conexiones de usuarios
- Propagar mensajes en tiempo real
- Manejar desconexiones
- Autenticar conexiones con JWT
- Notificar cuando usuario está escribiendo

**Pseudocódigo:**
```typescript
// backend/src/lib/websocket.ts
import WebSocket from 'ws';

class ChatServer {
  private ws: WebSocket.Server;
  private connections = new Map(); // userId -> Set<WebSocket>
  
  start(port: number) { }
  authenticate(token: string) { }
  broadcastMessage(conversationId, message) { }
  notifyTyping(conversationId, userId) { }
  notifyMessageRead(conversationId, messageId) { }
}
```

---

### 2️⃣ **WebSocket Integration en Express** (Backend)
**Archivo a modificar:** `backend/src/server.ts`

**Cambios necesarios:**
- Integrar WebSocket server con Express
- Manejar autenticación de conexiones
- Emitir eventos cuando se envíe mensaje
- Persistir mensajes en BD

**Pseudocódigo:**
```typescript
// En server.ts
import { ChatServer } from './lib/websocket';

const chatServer = new ChatServer();

// Cuando se envía un mensaje
app.post('/mensajes', authMiddleware, async (req, res) => {
  // Crear mensaje en BD
  const mensaje = await prisma.mensaje.create(...);
  
  // Emitir por WebSocket
  chatServer.broadcastMessage(conversacionId, mensaje);
  
  res.json(mensaje);
});

// Iniciar WebSocket server
const wsServer = chatServer.start(5001); // O mismo puerto con upgrade
```

---

### 3️⃣ **Hook de Chat con WebSocket** (Frontend)
**Archivo a crear/actualizar:** `web/src/hooks/use-chat-websocket.tsx`

**Responsabilidades:**
- Conectar a WebSocket
- Sincronizar mensajes
- Manejar reconexión automática
- Enviar y recibir mensajes
- Indicador de escribiendo

**Pseudocódigo:**
```typescript
// web/src/hooks/use-chat-websocket.tsx
import { useEffect, useState, useCallback } from 'react';

export function useChatWebSocket(conversationId: string) {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:5001?token=${token}`);
    
    ws.onopen = () => setIsConnected(true);
    ws.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data);
      if (type === 'message') {
        setMessages(prev => [...prev, data]);
      }
    };
    
    return () => ws.close();
  }, [conversationId]);
  
  const sendMessage = useCallback((text: string) => {
    ws.send(JSON.stringify({
      type: 'message',
      conversationId,
      text
    }));
  }, []);
  
  return { messages, sendMessage, isConnected, isTyping };
}
```

---

### 4️⃣ **Componente de Chat Conectado** (Frontend)
**Archivo a actualizar:** `web/src/components/realtime-chat.tsx`

**Cambios necesarios:**
- Usar el nuevo hook `useChatWebSocket`
- Cargar mensajes iniciales de la API
- Mostrar estado de conexión
- Indicador de escribiendo
- Estados de entrega

**Pseudocódigo:**
```tsx
// web/src/components/realtime-chat.tsx
export function RealtimeChat({ conversationId, username }) {
  const { messages, sendMessage, isConnected } = useChatWebSocket(conversationId);
  const [initialMessages, setInitialMessages] = useState([]);
  
  // Cargar mensajes del historial
  useEffect(() => {
    fetch(`/api/conversaciones/${conversationId}/mensajes`)
      .then(r => r.json())
      .then(setInitialMessages);
  }, [conversationId]);
  
  return (
    <div>
      <ConnectionStatus connected={isConnected} />
      <MessageList messages={[...initialMessages, ...messages]} />
      <MessageInput onSend={sendMessage} />
    </div>
  );
}
```

---

### 5️⃣ **Página de Chat Actualizada** (Frontend)
**Archivo a actualizar:** `web/src/app/chat/page.tsx`

**Cambios necesarios:**
- Listar conversaciones existentes
- Permitir crear nueva conversación
- Seleccionar conversación para chatear
- Mostrar chat en tiempo real

**Pseudocódigo:**
```tsx
// web/src/app/chat/page.tsx
export default function ChatPage() {
  const [conversaciones, setConversaciones] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  
  useEffect(() => {
    // Cargar conversaciones
    fetch('/api/conversaciones')
      .then(r => r.json())
      .then(setConversaciones);
  }, []);
  
  return (
    <div className="grid grid-cols-3 gap-4">
      <ConversationsList 
        conversaciones={conversaciones}
        onSelect={setSelectedConv}
      />
      {selectedConv && (
        <RealtimeChat 
          conversationId={selectedConv.id}
          username={user.nombre}
        />
      )}
    </div>
  );
}
```

---

### 6️⃣ **Mensajería en BD** (Backend)
**Archivo a modificar:** `backend/prisma/schema.prisma`

**Cambios necesarios:** (Ya existe pero necesita verificación)

```prisma
model conversacion {
  id                        BigInt @id @default(autoincrement())
  tipo                      String @db.VarChar(20)
  contexto_id               BigInt?
  fecha_creacion            DateTime @default(now())
  
  mensaje                   mensaje[]
  participante_conversacion participante_conversacion[]
}

model mensaje {
  id                BigInt        @id @default(autoincrement())
  conversacion_id   BigInt
  remitente_id      BigInt
  cuerpo            String?
  creado_en         DateTime      @default(now())
  editado_en        DateTime?
  eliminado_en      DateTime?
  
  conversacion      conversacion  @relation(fields: [conversacion_id])
  usuario           usuario       @relation(fields: [remitente_id])
  mensaje_leido     mensaje_leido[]
}

model mensaje_leido {
  id         BigInt @id @default(autoincrement())
  mensaje_id BigInt @unique
  usuario_id BigInt @unique
  leido_en   DateTime @default(now())
  
  mensaje    mensaje @relation(fields: [mensaje_id])
  usuario    usuario @relation(fields: [usuario_id])
}
```

---

## 🛠️ PLAN DE IMPLEMENTACIÓN

### Fase 1: WebSocket Básico (1-2 días)
```
1. Crear servidor WebSocket
2. Integrar con Express
3. Autenticación de socket
4. Emitir/recibir mensajes simples
```

### Fase 2: Frontend WebSocket (1-2 días)
```
1. Crear hook useChatWebSocket
2. Conectar componentes
3. Cargar historial de mensajes
4. Sincronizar en tiempo real
```

### Fase 3: Funcionalidades Avanzadas (2-3 días)
```
1. Indicador de escribiendo
2. Marcar como leído
3. Editar/eliminar mensajes
4. Notificaciones desktop
5. Archivos adjuntos
```

### Fase 4: Pulido y Optimización (1-2 días)
```
1. Reconexión automática
2. Caché de mensajes
3. Paginación de mensajes antiguos
4. Tests
```

---

## 📊 TABLA DE MÓDULOS NECESARIOS

| # | Módulo | Ubicación | Estado | Prioridad | Tipo |
|---|--------|-----------|--------|-----------|------|
| 1 | WebSocket Server | `backend/src/lib/websocket.ts` | ❌ CREAR | P0 | Backend |
| 2 | WebSocket Integration | `backend/src/server.ts` | ⚠️ MODIFICAR | P0 | Backend |
| 3 | Chat Hook | `web/src/hooks/use-chat-websocket.tsx` | ❌ CREAR | P0 | Frontend |
| 4 | Chat Component | `web/src/components/realtime-chat.tsx` | ⚠️ ACTUALIZAR | P0 | Frontend |
| 5 | Chat Page | `web/src/app/chat/page.tsx` | ⚠️ ACTUALIZAR | P0 | Frontend |
| 6 | Typing Indicator | `web/src/components/typing-indicator.tsx` | ❌ CREAR | P1 | Frontend |
| 7 | Connection Status | `web/src/components/connection-status.tsx` | ❌ CREAR | P1 | Frontend |
| 8 | Message Actions | `web/src/components/message-actions.tsx` | ❌ CREAR | P1 | Frontend |
| 9 | Endpoints Edit/Delete | `backend/src/server.ts` | ❌ AGREGAR | P1 | Backend |
| 10 | Notification Service | `backend/src/lib/notifications.ts` | ❌ CREAR | P2 | Backend |

---

## 📝 ENDPOINTS QUE FALTAN AGREGAR

### Endpoints Requeridos

```typescript
// Marcar mensajes como leído
PUT /mensajes/:id/marcar-leido

// Editar mensaje
PUT /mensajes/:id
Request: { cuerpo: string }

// Eliminar mensaje
DELETE /mensajes/:id

// Obtener conversación específica
GET /conversaciones/:id

// Actualizar conversación
PUT /conversaciones/:id

// Eliminar conversación
DELETE /conversaciones/:id

// Enviar archivo en chat
POST /mensajes/archivo

// Buscar mensajes
GET /conversaciones/:id/buscar?q=texto

// Notificaciones no leídas
GET /notificaciones/no-leidas
```

---

## 🚀 ORDEN DE TRABAJO RECOMENDADO

### SEMANA 1
**Lunes-Martes:**
- [ ] Crear WebSocket server en backend
- [ ] Integrar con Express
- [ ] Tests básicos de conexión

**Miércoles-Jueves:**
- [ ] Crear hook `useChatWebSocket` en frontend
- [ ] Conectar componentes con real-time
- [ ] Cargar historial de mensajes

**Viernes:**
- [ ] Testing end-to-end
- [ ] Debugging y fixes
- [ ] Documentación

### SEMANA 2
**Lunes-Martes:**
- [ ] Indicador de escribiendo
- [ ] Estados de entrega
- [ ] Marcar como leído

**Miércoles-Jueves:**
- [ ] Editar/eliminar mensajes
- [ ] Notificaciones desktop
- [ ] Reconexión automática

**Viernes:**
- [ ] Optimización
- [ ] Performance testing
- [ ] Deploy a staging

---

## 🔐 CONSIDERACIONES DE SEGURIDAD

### JWT en WebSocket
```typescript
// Verificar token al conectar
ws.on('connection', (socket) => {
  const token = socket.handshake.auth.token;
  const decoded = jwt.verify(token, JWT_SECRET);
  socket.userId = decoded.id;
});
```

### Autorización
```typescript
// Verificar que usuario es participante de conversación
const isParticipant = await prisma.participante_conversacion.findFirst({
  where: {
    conversacion_id: conversacionId,
    usuario_id: userId
  }
});

if (!isParticipant) {
  throw new Error('No autorizado');
}
```

### Validación de mensajes
```typescript
// Sanitizar entrada
const mensaje = DOMPurify.sanitize(input);

// Limitar largo
if (mensaje.length > 5000) {
  throw new Error('Mensaje muy largo');
}

// Rate limiting
if (messagesInLastMinute > 30) {
  throw new Error('Demasiados mensajes');
}
```

---

## 📚 RECURSOS Y DEPENDENCIAS

### Backend
```json
{
  "ws": "^8.14.0",
  "socket.io": "^4.7.0"
}
```

### Frontend
```json
{
  "socket.io-client": "^4.7.0"
}
```

### Alternativas
- **Socket.io**: Más fácil, incluye fallbacks
- **ws**: Más ligero, control total
- **Supabase Realtime**: Si quieres serverless

---

## 📋 CHECKLIST FINAL

Cuando hayas terminado, verifica:

- [ ] WebSocket conecta exitosamente
- [ ] Mensajes se envían en tiempo real
- [ ] Mensajes se persisten en BD
- [ ] Historial carga correctamente
- [ ] Múltiples usuarios ven mensajes
- [ ] Desconexión/reconexión maneja bien
- [ ] Sin memory leaks
- [ ] Seguridad verificada
- [ ] Tests pasando
- [ ] Documentación actualizada

---

**Resumen:** Necesitas implementar un sistema de WebSocket para mensaje en tiempo real, conectar frontend y backend, y agregar endpoints faltantes.

