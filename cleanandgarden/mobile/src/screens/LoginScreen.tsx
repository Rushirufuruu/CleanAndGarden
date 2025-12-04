import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { inicializarPushNotifications } from "../services/pushNotificationService";
import { connectGlobalWebSocket } from "../services/globalWebSocket";

// URL del backend (localhost en desarrollo, Railway en producción)
const API_URL = process.env.EXPO_PUBLIC_API_URL;



export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Ingresa un correo electrónico válido");
      return;
    }
    if (!password) {
      Alert.alert("Error", "Ingresa la contraseña");
      return;
    }

    setLoading(true);

    try {
      console.log("🔐 Iniciando sesión con backend...");
      console.log("📡 API_URL:", API_URL);
      console.log("📡 URL completa:", `${API_URL}/login`);
      
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al iniciar sesión");
      }

      console.log("✅ Respuesta del backend:", data);

      // Guardar el email del usuario en AsyncStorage para usarlo en otras pantallas
      await AsyncStorage.setItem("userEmail", email.trim());
      
      if (data.user) {
        await AsyncStorage.setItem("userName", data.user.nombre || "Usuario");
        await AsyncStorage.setItem("userId", data.user.id?.toString() || "");
        await AsyncStorage.setItem("userRole", data.user.rol || "cliente"); // 🔸 Guardar rol
        
      }

      // Si el backend devuelve redirectTo, mostramos advertencia
      if (data.redirectTo === "profile") {
        Alert.alert(
          "Atención",
          data.warning || "Completa tu perfil antes de continuar."
        );
      } else {
        Alert.alert("✅ Éxito", data.message || "Inicio de sesión exitoso");
      }

      // Inicializar push notifications después del login
      inicializarPushNotifications(email.trim()).catch(err => {
        console.error('⚠️ Error al registrar push token:', err);
      });

      // Conectar WebSocket global para recibir mensajes en tiempo real
      if (data.user?.id) {
        console.log('🔌 Conectando WebSocket global para usuario:', data.user.id);
        connectGlobalWebSocket(data.user.id);
      }

      // Redirigir al Home/Tabs
      navigation.reset({
        index: 0,
        routes: [{ name: "Tabs" }],
      });
    } catch (error: any) {
      console.error("❌ Error en login:", error);
      Alert.alert("Error", error.message || "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <Text style={styles.title}>Clean & Garden</Text>
          <Text style={styles.subtitle}>Iniciar sesión</Text>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="correo@ejemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
            />
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                textContentType="password"
              />
              {password.length > 0 && (
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={22}
                    color="#374151"
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Botón Ingresar */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Ingresar</Text>
            )}
          </TouchableOpacity>

          {/* Olvidaste tu contraseña */}
          <TouchableOpacity
            style={styles.forgotPasswordContainer}
            onPress={() => Linking.openURL('https://clean-and-garden-plum.vercel.app/forgot-password')}
          >
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          {/* Registro */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>¿No tienes una cuenta? </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://clean-and-garden-plum.vercel.app/register')}
            >
              <Text style={styles.registerLink}>Regístrate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fefaf2" },
  scrollContainer: { flexGrow: 1, justifyContent: "center", padding: 20 },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#2E5430",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
    marginBottom: 24,
  },
  inputContainer: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  passwordInput: { flex: 1, padding: 12, fontSize: 16 },
  eyeButton: { padding: 12 },
  button: {
    backgroundColor: "#2E5430",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  forgotPasswordContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: "#2E5430",
    fontSize: 14,
    fontWeight: "500",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerText: { color: "#6B7280", fontSize: 14 },
  registerLink: { color: "#2E5430", fontSize: 14, fontWeight: "600" },
});
