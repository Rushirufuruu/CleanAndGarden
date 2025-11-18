# 🔄 Sistema de Actualización Automática de Datos

## 🎯 Cómo Funciona

La app ahora se actualiza automáticamente para mostrar los cambios más recientes de las citas, sin necesidad de que el usuario cierre y abra la app.

---

## 📱 Métodos de Actualización

### 1. **Pull to Refresh** (Deslizar hacia abajo) 👆
```
Usuario desliza hacia abajo en la lista de citas
   ↓
Se muestra el indicador de carga
   ↓
Se obtienen citas del backend
   ↓
Se sincronizan notificaciones
   ↓
Se actualiza la interfaz
   ↓
✅ Datos actualizados
```

**Cuándo usar:**
- Cuando quieres refrescar manualmente
- Para verificar si hay cambios

---

### 2. **Actualización por Notificación** 🔔
```
Llega notificación (cita cancelada, nueva, etc.)
   ↓
Sistema detecta la notificación
   ↓
Emite evento de refresh
   ↓
AppointmentScreen escucha el evento
   ↓
Refresca los datos automáticamente
   ↓
✅ Interfaz actualizada sin intervención
```

**Cuándo ocurre:**
- Al recibir cualquier notificación de cambio de cita
- Automático, sin acción del usuario

---

### 3. **Navegación desde Notificación** 👉
```
Usuario toca una notificación
   ↓
App abre (o vuelve a primer plano)
   ↓
Navega a pantalla de Citas
   ↓
Emite evento de refresh
   ↓
Carga datos frescos del backend
   ↓
✅ Usuario ve datos actualizados
```

**Cuándo ocurre:**
- Al tocar una notificación push
- La app navega automáticamente a Citas

---

### 4. **Volver del Background** 🔄
```
App está en segundo plano
   ↓
Usuario vuelve a abrir la app
   ↓
AppState detecta el cambio
   ↓
Sincroniza con el backend
   ↓
Actualiza notificaciones programadas
   ↓
✅ Datos sincronizados
```

**Cuándo ocurre:**
- Al volver a la app después de estar en segundo plano
- Automático

---

## 🧩 Arquitectura del Sistema

### Componentes

#### 1. **EventEmitter** (`eventEmitter.ts`)
Sistema de eventos para comunicación entre componentes:

```typescript
// Eventos disponibles
REFRESH_APPOINTMENTS    // Refrescar lista de citas
APPOINTMENT_CANCELLED   // Cita cancelada
APPOINTMENT_UPDATED     // Cita actualizada
APPOINTMENT_CREATED     // Cita nueva
NOTIFICATION_RECEIVED   // Notificación recibida
```

#### 2. **App.tsx** (Coordinador Global)
- Escucha notificaciones
- Emite eventos de refresh
- Navega a pantallas correspondientes

#### 3. **AppointmentScreen.tsx** (Vista de Citas)
- Escucha eventos de refresh
- Actualiza datos cuando recibe eventos
- Implementa Pull-to-Refresh
- Sincroniza notificaciones

---

## 📊 Flujo Completo de Actualización

### Ejemplo: Cita cancelada desde la web

```
┌─────────────────────────────────────────────────────────┐
│ 1. Usuario cancela cita desde la web                    │
│    Estado en BD: "pendiente" → "cancelada"              │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Usuario abre/vuelve a la app móvil                   │
│    AppState detecta: background → active                │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Sincronización automática                            │
│    - Obtiene citas del backend                          │
│    - Detecta cita cancelada                             │
│    - Cancela notificaciones programadas                 │
│    - Envía notificación: "Cita Cancelada"               │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Notificación recibida                                │
│    App.tsx escucha la notificación                      │
│    Emite: emitRefreshAppointments()                     │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 5. AppointmentScreen recibe el evento                   │
│    - Muestra indicador de carga                         │
│    - Obtiene datos frescos                              │
│    - Actualiza estado local                             │
│    - Re-renderiza la interfaz                           │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ ✅ Usuario ve la cita con estado "cancelada"            │
│    Sin necesidad de cerrar/abrir la app                 │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 Indicadores Visuales

### Pull-to-Refresh
```tsx
// Indicador de carga circular verde
<RefreshControl
  refreshing={refreshing}
  colors={['#2E5430']}  // Android
  tintColor="#2E5430"   // iOS
/>
```

**Usuario ve:**
- Indicador de carga girando
- Texto "Cargando..." (opcional)
- Se oculta automáticamente al terminar

---

## 🧪 Cómo Probar

### Prueba 1: Pull to Refresh
1. Abre la app y ve a Citas
2. Desliza hacia abajo en la lista
3. Verás el indicador de carga
4. Datos se actualizan

**Log esperado:**
```
🔄 Pull to refresh activado
🔔 Evento recibido: Refrescando citas...
✅ Citas refrescadas: 5
```

### Prueba 2: Actualización por Notificación
1. Cancela una cita desde la web
2. Vuelve a la app móvil (o abre)
3. Recibirás notificación "Cita Cancelada"
4. Los datos se actualizan automáticamente

**Log esperado:**
```
👀 App volvió a primer plano, sincronizando...
🗑️ Cancelando notificaciones de cita 123 (estado: cancelada)
🔔 Notificación de cancelación enviada para cita 123
📩 Notificación recibida: {...}
🔔 Evento recibido: Refrescando citas...
✅ Citas refrescadas: 4
```

### Prueba 3: Navegación desde Notificación
1. Recibe una notificación
2. Toca la notificación
3. App abre en pantalla de Citas
4. Datos actualizados

**Log esperado:**
```
👆 Usuario tocó la notificación: {...}
🔔 Evento recibido: Refrescando citas...
✅ Citas refrescadas: 5
```

---

## 🔧 Configuración

### Personalizar Tiempo de Actualización

En `App.tsx`, ajustar el delay:

```typescript
// Delay antes de refrescar (milisegundos)
setTimeout(() => {
  emitRefreshAppointments();
}, 1000); // 1 segundo
```

### Deshabilitar Auto-Refresh

En `AppointmentScreen.tsx`, comentar el useEffect:

```typescript
// useEffect(() => {
//   const handleRefresh = async () => { ... };
//   appEvents.on(EVENTS.REFRESH_APPOINTMENTS, handleRefresh);
//   ...
// }, []);
```

---

## 📊 Ventajas del Sistema

✅ **Experiencia fluida** - Sin necesidad de cerrar/abrir app
✅ **Datos siempre actualizados** - Múltiples puntos de sincronización
✅ **UX moderna** - Pull-to-refresh como apps comerciales
✅ **Feedback visual** - Usuario sabe cuándo se está actualizando
✅ **Eficiente** - Solo actualiza cuando es necesario
✅ **Escalable** - Fácil agregar más eventos

---

## 🔮 Mejoras Futuras

- [ ] **Optimistic Updates** - Actualizar UI antes de confirmar con servidor
- [ ] **Caché inteligente** - Evitar llamadas innecesarias al backend
- [ ] **Animaciones** - Transiciones suaves al actualizar items
- [ ] **Notificación en pantalla** - Toast/Snackbar al actualizar
- [ ] **Refresh automático periódico** - Cada X minutos en foreground
- [ ] **WebSocket** - Actualización en tiempo real verdadero

---

## 📝 Resumen

Tu app ahora tiene **3 formas de actualizar datos**:

1. **Manual** - Pull-to-refresh (usuario desliza hacia abajo)
2. **Automático** - Al recibir notificaciones
3. **Por navegación** - Al tocar notificaciones

Todo funciona **sin intervención del usuario**, manteniendo la app siempre sincronizada con el backend. 🎉
