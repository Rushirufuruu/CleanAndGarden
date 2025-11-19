# Sistema de Chat en Tiempo Real - Mobile App

## ✅ Implementación Completada

Se ha implementado un sistema de chat en tiempo real para la aplicación móvil con las siguientes características:

### 🎯 Características

1. **Mensajería en Tiempo Real**
   - Conexión WebSocket para mensajes instantáneos
   - Sincronización automática con el backend
   - Reconexión automática en caso de pérdida de conexión
   - Indicador de estado de conexión

2. **Gestión de Conversaciones**
   - Lista de conversaciones con último mensaje
   - Contador de mensajes no leídos
   - Búsqueda de usuarios para iniciar conversación
   - Avatar y preview del último mensaje

3. **Notificaciones Push**
   - Notificaciones locales cuando llega un mensaje (app en background)
   - Integración con el sistema de notificaciones existente
   - Canal de notificaciones configurado para Android

4. **Manejo del Ciclo de Vida**
   - Desconexión automática cuando la app va al background
   - Reconexión automática cuando vuelve al foreground
   - Persistencia de contadores con AsyncStorage

### 📁 Archivos Creados

```
mobile/src/
├── hooks/
│   └── useChatRealtime.ts          # Hook para WebSocket y mensajes
├── screens/
│   ├── ChatScreen.tsx              # Pantalla de conversación
│   └── ConversationsScreen.tsx     # Lista de conversaciones
└── navigation/
    └── MainTabs.tsx                # Actualizado con tab de Mensajes
```

### 🔧 Dependencias Necesarias

Asegúrate de tener instaladas las siguientes dependencias:

```bash
# Si no las tienes, instalar:
npm install @react-native-async-storage/async-storage
npm install expo-notifications
```

### 🚀 Uso

1. **Acceder a Mensajes**
   - Abre la app y ve a la tab "Mensajes" en la barra inferior

2. **Iniciar una Conversación**
   - Toca el botón "+" en la esquina inferior derecha
   - Busca y selecciona un usuario
   - Comienza a chatear

3. **Ver Mensajes**
   - Los mensajes aparecen en tiempo real
   - Los mensajes propios aparecen en verde a la derecha
   - Los mensajes del otro usuario aparecen en blanco a la izquierda
   - El estado de conexión se muestra en el header

### 🎨 Características de UI

- **Diseño WhatsApp-like**
  - Burbujas de chat diferenciadas por color
  - Timestamps en cada mensaje
  - Scroll automático al enviar
  - Teclado optimizado con KeyboardAvoidingView

- **Indicadores Visuales**
  - Dot verde/gris para estado de conexión
  - Badge con contador de mensajes no leídos
  - Loading states durante la carga
  - Empty states informativos

### 🔄 Flujo de Datos

```
Usuario escribe mensaje
       ↓
Envío al backend (HTTP POST)
       ↓
Backend guarda en DB + envía vía WebSocket
       ↓
Todos los clientes conectados reciben el mensaje
       ↓
Actualización de UI en tiempo real
```

### 📱 Notificaciones

- **App en Foreground**: Mensaje aparece directamente en el chat
- **App en Background**: Notificación local + actualización cuando vuelva
- **App Cerrada**: Notificación push del backend (ya configurado)

### 🛠️ Configuración Requerida

1. **Variables de Entorno**
   ```env
   EXPO_PUBLIC_API_URL=https://tu-backend.railway.app
   ```

2. **Backend**
   - El WebSocket debe estar funcionando en `/ws`
   - El endpoint de conversaciones en `/conversaciones`
   - El endpoint de mensajes en `/conversaciones/:id/mensajes`

### 🐛 Troubleshooting

**WebSocket no conecta:**
- Verifica que `EXPO_PUBLIC_API_URL` esté configurada
- Asegúrate que el backend esté desplegado y funcionando
- Revisa los logs en consola

**Notificaciones no aparecen:**
- Solo funcionan en dispositivos físicos
- Verifica permisos de notificaciones
- Revisa la configuración del canal en Android

**Mensajes no se sincronizan:**
- Verifica la conexión a internet
- Revisa el estado de conexión en el header
- Intenta cerrar y volver a abrir la conversación

### ✨ Mejoras Futuras Posibles

- [ ] Indicador de "escribiendo..."
- [ ] Confirmación de lectura (check azul)
- [ ] Envío de imágenes
- [ ] Mensajes de voz
- [ ] Búsqueda dentro de conversaciones
- [ ] Archivado de conversaciones
- [ ] Tema oscuro

### 📝 Notas de Desarrollo

- El sistema usa React Navigation (no Expo Router)
- Compatible con iOS y Android
- Optimizado para reconexión en redes inestables
- Manejo de errores con try-catch en todas las operaciones de red
