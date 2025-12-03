import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { disconnectGlobalWebSocket } from "../services/globalWebSocket";
import { eliminarTokenDelBackend } from "../services/pushNotificationService";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function ProfileScreen({ navigation }: any) {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editVisible, setEditVisible] = useState(false);
  const [editData, setEditData] = useState({ telefono: "", direccion: "" });
  const [saving, setSaving] = useState(false);

  // Cargar información del usuario
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const email = await AsyncStorage.getItem("userEmail");

        if (!email) {
          Alert.alert("Sesión expirada", "Vuelve a iniciar sesión.");
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
          return;
        }

        const res = await fetch(`${API_URL}/usuario/info/email/${encodeURIComponent(email)}`);
        if (!res.ok) throw new Error("Error al obtener información del usuario");

        const data = await res.json();
        setUserData(data);

        setEditData({
          telefono: data.telefono || "",
          direccion:
            data.direccion?.[0]?.calle
              ? `${data.direccion[0].calle}${data.direccion[0].comuna ? `, ${data.direccion[0].comuna.nombre}, ${data.direccion[0].comuna.region.nombre}` : ''}`
              : "",
        });
      } catch (err: any) {
        console.error("❌ Error al cargar perfil:", err);
        Alert.alert("Error", err.message || "No se pudo cargar el perfil.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Cerrar sesión
  const handleLogout = async () => {
    Alert.alert("Cerrar sesión", "¿Seguro que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sí, salir",
        onPress: async () => {
          try {
            // Obtener email antes de limpiar AsyncStorage
            const userEmail = await AsyncStorage.getItem("userEmail");
            
            // Eliminar push token del backend
            if (userEmail) {
              await eliminarTokenDelBackend(userEmail);
            }
            
            // Desconectar WebSocket global
            disconnectGlobalWebSocket();
            
            // Limpiar datos locales
            await AsyncStorage.removeItem("userEmail");
            await AsyncStorage.removeItem("userId");
            await AsyncStorage.removeItem("userName");
            await AsyncStorage.removeItem("userRole");
            await AsyncStorage.removeItem("mensajesNoLeidos");
            
            // Navegar al login
            navigation.reset({ index: 0, routes: [{ name: "Login" }] });
          } catch (error) {
            console.error('Error al cerrar sesión:', error);
            // Aún así navegar al login
            navigation.reset({ index: 0, routes: [{ name: "Login" }] });
          }
        },
      },
    ]);
  };

  // Guardar cambios
  const handleSaveChanges = async () => {
    if (!userData?.id) return;

    try {
      setSaving(true);

      const response = await fetch(`${API_URL}/usuario/${userData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefono: editData.telefono.trim(),
          direccion: editData.direccion.trim(),
        }),
      });

      if (!response.ok) throw new Error("No se pudieron guardar los cambios");

      Alert.alert("✅ Éxito", "Tu perfil se ha actualizado correctamente.");
      setEditVisible(false);

      // Refrescar datos
      const updatedUser = await response.json();
      setUserData(updatedUser);
    } catch (err: any) {
      console.error("Error al guardar:", err);
      Alert.alert("Error", err.message || "Error al guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Ionicons name="person-circle-outline" size={100} color="#2E5430" />
          <Text style={styles.name}>
            {userData?.nombre
              ? `${userData.nombre} ${userData.apellido || ""}`
              : "Usuario"}
          </Text>
          <Text style={styles.email}>{userData?.email || "—"}</Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#2E5430" size="large" style={{ marginTop: 30 }} />
        ) : (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Información de contacto</Text>

            <View style={styles.infoItem}>
              <Ionicons name="call-outline" size={22} color="#2E5430" />
              <Text style={styles.infoText}>{userData?.telefono || "Sin teléfono"}</Text>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="home-outline" size={22} color="#2E5430" />
              <Text style={styles.infoText}>
                {userData?.direccion?.[0]?.calle
                  ? `${userData.direccion[0].calle}${userData.direccion[0].comuna ? `, ${userData.direccion[0].comuna.nombre}, ${userData.direccion[0].comuna.region.nombre}` : ''}`
                  : "Sin dirección registrada"}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="briefcase-outline" size={22} color="#2E5430" />
              <Text style={styles.infoText}>
                {userData?.rol || "Cliente"}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditVisible(true)}
            >
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.editButtonText}>Editar perfil</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>Clean & Garden © 2025</Text>
      </ScrollView>

      {/* MODAL DE EDICIÓN */}
      <Modal
        visible={editVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setEditVisible(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Editar perfil</Text>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Teléfono</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editData.telefono}
                    onChangeText={(text) =>
                      setEditData((prev) => ({ ...prev, telefono: text }))
                    }
                    placeholder="+56 9 1234 5678"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Dirección</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.direccion}
                onChangeText={(text) =>
                  setEditData((prev) => ({ ...prev, direccion: text }))
                }
                placeholder="Comuna, Región"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#ccc" }]}
                onPress={() => setEditVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#2E5430" }]}
                onPress={handleSaveChanges}
                disabled={saving}
              >
                <Text style={styles.modalButtonText}>
                  {saving ? "Guardando..." : "Guardar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fefaf2" },
  container: { alignItems: "center", padding: 20 },
  header: { alignItems: "center", marginTop: 20, marginBottom: 30 },
  name: { fontSize: 22, fontWeight: "700", color: "#2E5430", marginTop: 10 },
  email: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  infoSection: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 30,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#2E5430", marginBottom: 16 },
  infoItem: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  infoText: { marginLeft: 12, fontSize: 14, color: "#374151" },
  editButton: {
    flexDirection: "row",
    backgroundColor: "#2E5430",
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  editButtonText: { color: "#fff", fontWeight: "600", fontSize: 15, marginLeft: 6 },
  logoutButton: {
    flexDirection: "row",
    backgroundColor: "#2E5430",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  logoutText: { color: "#fff", fontWeight: "600", fontSize: 16, marginLeft: 6 },
  footerText: { marginTop: 20, fontSize: 12, color: "#94A3B8" },

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2E5430",
    textAlign: "center",
    marginBottom: 20,
  },
  modalField: { marginBottom: 14 },
  modalLabel: { fontSize: 14, color: "#374151", marginBottom: 6 },
  modalInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 6,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});
