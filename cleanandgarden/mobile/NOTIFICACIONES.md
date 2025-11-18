# 📱 Sistema de Notificaciones Push

## ⚠️ Importante: Limitaciones de Expo Go

**A partir de Expo SDK 53**, las notificaciones **remotas/push** ya no funcionan en Expo Go. Sin embargo:

- ✅ **Notificaciones locales SÍ funcionan** (que es lo que usamos)
- ✅ Las notificaciones programadas funcionan correctamente
- ⚠️ Verás un warning en consola, pero es solo informativo
- 🚀 Para producción, necesitarás un **development build** o **standalone app**

### Para Testing en Expo Go
Las notificaciones locales deberían funcionar normalmente. El warning que ves es sobre notificaciones remotas (Firebase), no las locales.

### Para Producción
Necesitarás crear un build:
```bash
# Android APK
eas build --platform android --profile preview

# iOS
eas build --platform ios --profile preview
```

## 📦 Instalación

Para habilitar las notificaciones, primero instala el paquete necesario:

```bash
npm install expo-notifications
```

Luego, reinicia el servidor de Expo limpiando la caché:

```bash
npx expo start -c
```

## ✨ Funcionalidades Implementadas

### 🔔 Notificaciones Automáticas
Cuando un usuario tiene citas pendientes o confirmadas, el sistema automáticamente programa notificaciones:

- **24 horas antes**: "📅 Recordatorio de Cita - Mañana tienes programado: [Servicio]"
- **2 horas antes**: "⏰ Tu cita es pronto - En 2 horas: [Servicio]"

### 🎯 Características

1. **Programación Inteligente**
   - Solo se programan notificaciones para citas futuras
   - Las notificaciones pasadas no se programan
   - Se evitan duplicados al reprogramar

2. **Gestión Automática**
   - Al cancelar una cita, las notificaciones se cancelan automáticamente
   - Al cargar las citas, se actualizan las notificaciones pendientes
   - Los usuarios admin no reciben notificaciones (solo gestionan)

3. **Permisos**
   - Solicita permisos al usuario la primera vez
   - Funciona en Android e iOS
   - Notificaciones locales (no requiere servidor push)

## 📂 Archivos Modificados

### Nuevos Archivos
- `src/services/notificationService.ts` - Servicio completo de notificaciones

### Archivos Actualizados
- `App.tsx` - Listeners de notificaciones globales
- `src/screens/AppointmentScreen.tsx` - Integración con el listado de citas
- `app.json` - Permisos de Android e iOS

## 🔧 Configuración

### Android
Los permisos ya están configurados en `app.json`:
```json
"permissions": [
  "RECEIVE_BOOT_COMPLETED",
  "VIBRATE",
  "NOTIFICATIONS"
]
```

### iOS
Background modes configurados en `app.json`:
```json
"infoPlist": {
  "UIBackgroundModes": ["remote-notification"]
}
```

## 🧪 Testing

### Probar Notificaciones Manualmente

Puedes agregar un botón de prueba temporal en cualquier pantalla:

```tsx
import { programarNotificacionesCita } from "../services/notificationService";

// En algún botón:
<Button 
  title="Probar Notificación" 
  onPress={() => {
    const fechaPrueba = new Date();
    fechaPrueba.setSeconds(fechaPrueba.getSeconds() + 10); // En 10 segundos
    programarNotificacionesCita(999, fechaPrueba, "Servicio de Prueba");
  }}
/>
```

### Ver Notificaciones Programadas

```tsx
import { obtenerNotificacionesProgramadas } from "../services/notificationService";

// Ver en consola
obtenerNotificacionesProgramadas();
```

## 📱 Comportamiento por Plataforma

### Android
- Las notificaciones se muestran en la barra de estado
- Sonido y vibración configurables
- Canal específico para "Recordatorios de Citas"

### iOS
- Las notificaciones aparecen como banners
- Se integran con el Centro de Notificaciones
- Respetan la configuración de "No Molestar" del usuario

## 🐛 Debugging

### Verificar si Notificaciones Funcionan

Agrega este código temporal en `AppointmentScreen.tsx` para probar:

```tsx
import { obtenerNotificacionesProgramadas } from "../services/notificationService";

// En un useEffect o botón:
useEffect(() => {
  const verificar = async () => {
    const notifs = await obtenerNotificacionesProgramadas();
    console.log('📋 Notificaciones programadas:', notifs.length);
    notifs.forEach(n => {
      console.log(`  - ${n.identifier}: ${n.content.title}`);
    });
  };
  verificar();
}, [appointments]);
```

### Solución de Problemas

**Si las notificaciones no funcionan:**

1. **Verificar permisos**: La app debe solicitar permisos al iniciar
2. **Revisar consola**: Los logs muestran si las notificaciones se programaron
   - `✅ Notificación programada para 24h antes` = Éxito
   - `⚠️ Notificaciones no disponibles` = Problema con Expo Go
3. **Probar en dispositivo físico**: Las notificaciones pueden no funcionar perfectamente en emuladores
4. **Verificar fecha/hora**: Las notificaciones solo se programan para citas futuras
5. **Development Build**: Si Expo Go no funciona, crea un development build

### Warning de Expo Go

Si ves este warning:
```
WARN `expo-notifications` functionality is not fully supported in Expo Go
```

**Es normal.** El warning se refiere a notificaciones **remotas/push** (Firebase). Las notificaciones **locales/programadas** que usamos deberían funcionar bien.

### Testing en Development Build

Para testing completo, crea un development build:

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login
eas login

# Configurar proyecto
eas build:configure

# Build para Android (development)
eas build --platform android --profile development

# Instalar en tu dispositivo
# (descarga el APK y lo instalas manualmente)
```

## 🚀 Próximas Mejoras (Opcional)

- [ ] Notificaciones push remotas (Firebase Cloud Messaging)
- [ ] Permitir al usuario configurar los tiempos de recordatorio
- [ ] Botones de acción en notificaciones (Cancelar, Ver Detalles)
- [ ] Historial de notificaciones enviadas
- [ ] Notificación cuando el jardinero está en camino
