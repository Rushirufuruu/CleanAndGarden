import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  //Detectar sesión activa
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        console.log("Usuario ya autenticado:", session.user.email);
        navigation.reset({
          index: 0,
          routes: [{ name: "Tabs" }], //Redirigir a Tabs
        });
      }
    };

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session && event === "SIGNED_IN") {
          console.log("Inicio de sesión detectado:", session.user.email);
          navigation.reset({
            index: 0,
            routes: [{ name: "Tabs" }], //Redirigir a Tabs
          });
        } else if (event === "SIGNED_OUT") {
          console.log("Sesión cerrada");
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  //Iniciar sesión manualmente
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      Alert.alert("✅ Éxito", "Inicio de sesión exitoso");
      navigation.reset({
        index: 0,
        routes: [{ name: "Tabs" }], //Redirigir a Tabs también
      });
    } catch (error: any) {
      Alert.alert("❌ Error", error.message || "No se pudo iniciar sesión");
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

          {/* Forgot Password */}
          <TouchableOpacity
            onPress={() => Alert.alert("Función próximamente")}
            style={styles.forgotPassword}
          >
            <Text style={styles.forgotPasswordText}>
              ¿Olvidaste tu contraseña?
            </Text>
          </TouchableOpacity>

          {/* Login Button */}
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

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>¿No tienes una cuenta? </Text>
            <TouchableOpacity
              onPress={() => Alert.alert("Registro próximamente")}
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
  container: {
    flex: 1,
    backgroundColor: "#fefaf2",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
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
  inputContainer: {
    marginBottom: 16,
  },
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
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eyeButton: {
    padding: 12,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: "#2E5430",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#2E5430",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerText: {
    color: "#6B7280",
    fontSize: 14,
  },
  registerLink: {
    color: "#2E5430",
    fontSize: 14,
    fontWeight: "600",
  },
});
