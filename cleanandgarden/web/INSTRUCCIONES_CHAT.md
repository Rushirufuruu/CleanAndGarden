# 💬 Sistema de Chat en Tiempo Real - Instrucciones de Configuración

## ✅ Lo que ya está configurado:

- ✅ Endpoints del backend para conversaciones y mensajes
- ✅ Páginas del frontend:
  - `/mensajes` - Lista de conversaciones
  - `/mensajes/nueva` - Crear nueva conversación
  - `/mensajes/[id]` - Ver conversación específica
- ✅ Botón de "Mensajes" en el Navbar (visible solo para usuarios logueados)
- ✅ Variables de entorno de Supabase configuradas

## 🔧 Lo que DEBES hacer para activar el tiempo real:

### Paso 1: Activar Realtime en Supabase

1. Ve a tu dashboard de Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Database** → **Replication** (en el menú lateral izquierdo)
4. Busca la tabla **`mensaje`**
5. Activa el switch de **Realtime** (debe quedar en verde)
6. Guarda los cambios

### Paso 2: Configurar permisos RLS (Row Level Security)

Supabase requiere que configures las políticas de seguridad para que los usuarios puedan escuchar cambios en tiempo real.

1. Ve a **Database** → **Tables** → selecciona la tabla `mensaje`
2. Ve a la pestaña **Policies**
3. Crea una nueva política:
   - **Policy name**: `Enable read access for conversation participants`
   - **Policy command**: `SELECT`
   - **USING expression**:
   ```sql
   EXISTS (
     SELECT 1 FROM participante_conversacion
     WHERE participante_conversacion.conversacion_id = mensaje.conversacion_id
     AND participante_conversacion.usuario_id = auth.uid()
   )
   ```

⚠️ **NOTA**: Como estás usando JWT del backend (no auth de Supabase), es posible que el RLS no funcione correctamente. En ese caso:

**Opción A**: Deshabilita RLS temporalmente para pruebas:
1. Ve a la tabla `mensaje`
2. Desactiva "Enable Row Level Security (RLS)"

**Opción B**: Configura Supabase Auth para que coincida con tu sistema de autenticación actual.

### Paso 3: Verificar que funciona

1. **Inicia ambos servidores**:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd web
   npm run dev
   ```

2. **Prueba el chat**:
   - Inicia sesión con un usuario
   - Ve a "Mensajes" en el navbar
   - Crea una nueva conversación con otro usuario
   - Abre la conversación en dos navegadores diferentes (o uno normal + uno incógnito)
   - Escribe un mensaje en uno → debería aparecer automáticamente en el otro ⚡

## 🎯 Características del sistema de chat:

### Para usuarios clientes:
- ✅ Ver todas sus conversaciones
- ✅ Buscar usuarios (jardineros/administradores)
- ✅ Iniciar conversaciones con jardineros
- ✅ Enviar y recibir mensajes en tiempo real
- ✅ Ver historial de mensajes

### Para jardineros/administradores:
- ✅ Ver todas sus conversaciones con clientes
- ✅ Responder mensajes en tiempo real
- ✅ Buscar clientes para iniciar conversaciones

## 📊 Base de datos:

El sistema usa tus tablas existentes:
- **`conversacion`**: Almacena las conversaciones
- **`mensaje`**: Almacena los mensajes
- **`participante_conversacion`**: Relaciona usuarios con conversaciones

Los mensajes se guardan permanentemente en PostgreSQL y se sincronizan en tiempo real gracias a Supabase Realtime.

## 🔍 Endpoints disponibles:

### Backend (puerto 3001):
- `GET /conversaciones` - Obtener conversaciones del usuario
- `GET /conversaciones/:id/mensajes` - Obtener mensajes de una conversación
- `POST /conversaciones` - Crear nueva conversación
- `POST /mensajes` - Enviar un mensaje
- `GET /usuarios/buscar` - Buscar usuarios para chat

Todos los endpoints están protegidos con `authMiddleware` (requieren estar logueados).

## 🐛 Troubleshooting:

### Los mensajes no aparecen en tiempo real:
1. Verifica que activaste Realtime en la tabla `mensaje` en Supabase
2. Revisa la consola del navegador en busca de errores
3. Verifica que el backend esté corriendo en el puerto 3001
4. Comprueba que las variables de entorno estén bien configuradas

### Error "No tienes acceso a esta conversación":
1. Asegúrate de que el usuario esté logueado
2. Verifica que el usuario sea participante de la conversación
3. Revisa que las cookies del JWT se estén enviando correctamente

### Los mensajes se duplican:
1. Esto puede pasar si Realtime está enviando el evento y también estás agregando el mensaje localmente
2. El código actual ya maneja esto correctamente

## 🚀 Próximos pasos sugeridos:

- [ ] Agregar notificaciones de mensajes no leídos
- [ ] Agregar indicador de "escribiendo..."
- [ ] Agregar soporte para imágenes en mensajes
- [ ] Agregar paginación para conversaciones con muchos mensajes
- [ ] Agregar búsqueda dentro de conversaciones

---

¿Necesitas ayuda? Revisa los archivos:
- `web/src/app/mensajes/page.tsx` - Lista de conversaciones
- `web/src/app/mensajes/[id]/page.tsx` - Chat individual
- `backend/src/server.ts` - Endpoints del backend (línea ~989)


