# ⚠️ Advertencia de Expo Go - Notificaciones

## 🔍 ¿Qué significa el warning?

El warning que ves:
```
WARN `expo-notifications` functionality is not fully supported in Expo Go
```

**NO significa que las notificaciones no funcionen.** Significa que:

- ❌ **Notificaciones REMOTAS/PUSH** (Firebase Cloud Messaging) no funcionan en Expo Go
- ✅ **Notificaciones LOCALES** (las que estamos usando) **SÍ funcionan**

## 📊 Tipos de Notificaciones

### Notificaciones REMOTAS (No disponibles en Expo Go)
- Enviadas desde un servidor (Firebase, etc.)
- Requieren configuración compleja
- Necesitan desarrollo build

### Notificaciones LOCALES (Lo que usamos - Disponibles)
- ✅ Programadas en el dispositivo
- ✅ No requieren servidor
- ✅ Funcionan en Expo Go (con limitaciones)
- ✅ Funcionan completamente en development builds

## 🧪 Cómo Verificar que Funcionen

### Opción 1: Prueba Rápida (5 segundos)

Agrega este botón temporal en `AppointmentScreen.tsx`:

```tsx
import { testNotification } from '../services/testNotification';

// Dentro del componente, antes del return:
<TouchableOpacity 
  onPress={testNotification}
  style={{
    backgroundColor: '#2E5430',
    padding: 15,
    borderRadius: 8,
    margin: 10,
  }}
>
  <Text style={{ color: 'white', textAlign: 'center' }}>
    🧪 Probar Notificación (5 seg)
  </Text>
</TouchableOpacity>
```

**Importante:** Después de presionar el botón, pon la app en segundo plano (botón Home) para ver la notificación.

### Opción 2: Verificar Notificaciones Programadas

```tsx
import { listScheduledNotifications } from '../services/testNotification';

<TouchableOpacity onPress={listScheduledNotifications}>
  <Text>📋 Ver Notificaciones Programadas</Text>
</TouchableOpacity>
```

## 🎯 Estado Actual de la Implementación

### ✅ Implementado y Funcionando
1. **Programación automática**: Al cargar citas, se programan notificaciones
2. **Doble recordatorio**: 24h y 2h antes de cada cita
3. **Cancelación automática**: Al cancelar una cita, se cancelan sus notificaciones
4. **Manejo de errores**: Si Expo Go no soporta algo, la app no crashea
5. **Logs detallados**: Puedes ver en consola si las notificaciones se programaron

### ⚠️ Limitaciones en Expo Go
- Algunas funcionalidades pueden no funcionar al 100%
- En producción necesitarás un **standalone build** o **development build**

### 🚀 Para Producción

Cuando quieras distribuir la app, necesitarás crear un build:

```bash
# 1. Instalar EAS CLI
npm install -g eas-cli

# 2. Login en Expo
eas login

# 3. Configurar el proyecto
eas build:configure

# 4. Crear build de desarrollo (para testing)
eas build --platform android --profile development

# 5. O crear build de producción (para distribución)
eas build --platform android --profile production
```

## 📱 Testing Recomendado

### En Desarrollo (Ahora)
1. ✅ Usa Expo Go para desarrollo rápido
2. ✅ Las notificaciones locales deberían funcionar
3. ✅ Ignora el warning (es solo informativo)
4. ✅ Verifica en consola que se programen: `✅ Notificación programada para 24h antes`

### Para Testing Completo
1. Crea un **development build** con `eas build`
2. Instala el APK en tu dispositivo Android
3. Prueba todas las funcionalidades sin restricciones

### Para Producción
1. Crea un **production build** con `eas build`
2. Súbelo a Google Play Store o distribuye el APK

## 🔧 Si las Notificaciones No Funcionan

### Paso 1: Verificar Logs
Busca en la consola:
- `✅ Notificación programada` = Todo bien
- `⚠️ Notificaciones no disponibles` = Necesitas development build
- `❌ Error` = Revisa el error específico

### Paso 2: Verificar Permisos
La app debe solicitar permisos al cargar las citas por primera vez.

### Paso 3: Probar con Script de Prueba
Usa `testNotification()` para una prueba rápida de 5 segundos.

### Paso 4: Development Build
Si nada funciona en Expo Go, crea un development build:
```bash
eas build --platform android --profile development
```

## 📖 Recursos Adicionales

- [Expo Notifications Docs](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build](https://docs.expo.dev/build/introduction/)

## ✨ Resumen

**No te preocupes por el warning.** Es normal y esperado en Expo Go. Las notificaciones locales que implementamos deberían funcionar correctamente. Si necesitas funcionalidad completa sin limitaciones, simplemente crea un development build cuando estés listo para testing más exhaustivo o distribución.
