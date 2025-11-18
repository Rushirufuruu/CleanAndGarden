import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

export async function registerForPushNotifications() {
  console.log("🔔 registerForPushNotifications() llamado");

  if (!Device.isDevice) {
    console.log("❌ No es un dispositivo físico");
    return null;
  }

  console.log("🔑 Solicitando permisos de notificación...");

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  console.log("📌 Estado de permisos:", finalStatus);

  if (finalStatus !== "granted") {
    console.log("❌ Permisos no otorgados");
    return null;
  }

  let token = null;

  try {
    console.log("📨 Obteniendo token de Expo...");

    // En Expo Go iOS / Android → SIN projectId
    // En builds nativos luego podemos pasar el projectId
    const response = await Notifications.getExpoPushTokenAsync();
    token = response.data;
  } catch (e) {
    console.log("❌ ERROR OBTENIENDO TOKEN:", e);
  }

  console.log("✅ TOKEN PUSH:", token);
  return token;
}
