# 🔔 Configuración de Push Notifications con Expo

## 📦 Paquetes a instalar

### 1. **Backend** (en `d:\capstone\cyg\CleanAndGarden\cleanandgarden\backend`)

```powershell
cd backend
npm install expo-server-sdk
```

### 2. **Mobile** (en `d:\capstone\cyg\CleanAndGarden\cleanandgarden\mobile`)

```powershell
cd mobile
npm install expo-device expo-constants
```

**NOTA**: `expo-notifications` ya debería estar instalado. Si no:
```powershell
npm install expo-notifications
```

## ⚙️ Configuración de app.json

Abre `mobile/app.json` y asegúrate de tener esta configuración:

```json
{
  "expo": {
    "name": "Clean & Garden",
    "slug": "cleanandgarden",
    "version": "1.0.0",
    "extra": {
      "eas": {
        "projectId": "TU_PROJECT_ID_AQUI"
      }
    },
    "android": {
      "package": "com.cleanandgarden.app",
      "permissions": [
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE",
        "NOTIFICATIONS"
      ]
    },
    "ios": {
      "bundleIdentifier": "com.cleanandgarden.app",
      "supportsTabletOnly": false
    },
    "notification": {
      "icon": "./assets/icon.png",
      "color": "#2E5430",
      "androidMode": "default",
      "androidCollapsedTitle": "{{unread_count}} nuevas notificaciones"
    }
  }
}
```

## 🔑 Obtener Project ID de Expo

1. Abre terminal en la carpeta `mobile`:
```powershell
cd mobile
npx expo login
```

2. Crea o vincula el proyecto:
```powershell
npx eas init
```

3. El comando te dará un `projectId`. Cópialo y pégalo en `app.json` en:
```json
"extra": {
  "eas": {
    "projectId": "PEGA_EL_ID_AQUI"
  }
}
```

## 🚀 Reiniciar el backend

Una vez instalado `expo-server-sdk`:

```powershell
cd backend
npm run dev
```

## 📱 Probar en la app móvil

1. **Limpia la caché**:
```powershell
cd mobile
npx expo start -c
```

2. **Inicia sesión** en la app móvil

3. Revisa los logs - deberías ver:
```
🔔 Inicializando push notifications...
✅ Token de Expo Push obtenido: ExponentPushToken[...]
📤 Registrando token en backend...
✅ Token registrado exitosamente en el backend
```

## 🧪 Enviar notificación de prueba

Una vez que el usuario haya iniciado sesión, puedes probar enviando una notificación desde Postman o similar:

```http
POST http://localhost:3001/push-notifications/test
Content-Type: application/json

{
  "email": "usuario@example.com",
  "title": "🧪 Prueba de Push",
  "body": "Si ves esto, las push notifications funcionan!",
  "data": {
    "tipo": "test"
  }
}
```

## ✅ Verificar que todo funciona

### Logs en mobile (después de login):
```
🔔 Inicializando push notifications...
✅ Token de Expo Push obtenido: ExponentPushToken[xxxxxx]
📤 Registrando token en backend...
✅ Token registrado exitosamente en el backend
```

### Logs en backend:
```
✅ Nuevo token registrado para usuario: usuario@example.com
```

### Base de datos:
Revisa la tabla `dispositivo` - debería tener un registro con el token del usuario.

## 🔧 Troubleshooting

### "Cannot find module 'expo-server-sdk'"
- Asegúrate de haber instalado el paquete en el **backend**:
  ```powershell
  cd backend
  npm install expo-server-sdk
  ```

### "Cannot find module 'expo-device'"
- Instala en **mobile**:
  ```powershell
  cd mobile
  npm install expo-device expo-constants
  ```

### "Push notifications only work on devices"
- Las push notifications **NO funcionan en simuladores/emuladores**
- Debes probar en un **dispositivo físico**
- O crear un development build: `eas build --profile development --platform android`

### Token no llega al backend
- Verifica que `API_URL` en mobile apunte al backend correcto
- Revisa los logs de la consola para ver errores
- Asegúrate que el backend esté corriendo

## 📝 Próximos pasos

Después de verificar que todo funciona:

1. ✅ Integrar envío de push cuando se cancela una cita
2. ✅ Crear scheduler para recordatorios 24h y 2h antes
3. ✅ Enviar push cuando se confirma una cita
4. ✅ Notificar cuando se crea una nueva cita desde web

---

**¿Problemas?** Revisa los logs tanto en mobile como en backend para identificar el error específico.
