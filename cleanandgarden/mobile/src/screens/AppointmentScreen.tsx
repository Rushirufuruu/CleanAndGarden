import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function AppointmentScreen() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);

        // Obtener info de usuario
        const email = await AsyncStorage.getItem("userEmail");
        const storedRole = await AsyncStorage.getItem("userRole");
        setRole(storedRole);

        console.log("📧 Email:", email);
        console.log("👤 Rol:", storedRole);

        if (!email) {
          Alert.alert("Error", "No se pudo obtener la sesión. Inicia sesión nuevamente.");
          return;
        }

        let url = "";

        if (storedRole === "admin") {
          url = `${API_URL}/citas/all`; // 🔸 Endpoint para admins
        } else {
          url = `${API_URL}/citas/${encodeURIComponent(email)}`; // 🔸 Endpoint cliente
        }

        console.log("🌐 URL completa:", url);

        const res = await fetch(url);
        
        console.log("📡 Status:", res.status);
        console.log("📡 OK:", res.ok);

        if (!res.ok) {
          const errorText = await res.text();
          console.error("❌ Error del servidor:", errorText);
          throw new Error("Error al obtener citas");
        }

        const data = await res.json();
        console.log("✅ Citas obtenidas:", data.length);
        setAppointments(data);
      } catch (err: any) {
        console.error("❌ Error al cargar citas:", err);
        Alert.alert("Error", err.message || "No se pudieron cargar las citas.");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  const renderAppointment = ({ item }: any) => {
    const nombreServicio =
      item.nombre_servicio_snapshot || item.servicio?.nombre || "Servicio";
    const precio = item.precio_aplicado || item.servicio?.precio_clp || null;
    const fecha = new Date(item.fecha_hora);
    const fechaLocal = fecha.toLocaleDateString("es-CL");
    const horaLocal = fecha.toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.8}>
        <View style={styles.row}>
          <Ionicons name="leaf-outline" size={24} color="#2E5430" />
          <View style={{ flex: 1 }}>
            <Text style={styles.servicio}>{nombreServicio}</Text>
            <Text style={styles.fecha}>
              {fechaLocal} — {horaLocal}
            </Text>
          </View>
          <Text
            style={[
              styles.estado,
              item.estado === "realizada" && { color: "#16A34A" },
              item.estado === "pendiente" && { color: "#EAB308" },
              item.estado === "confirmada" && { color: "#2563EB" },
              item.estado === "cancelada" && { color: "#DC2626" },
            ]}
          >
            {item.estado}
          </Text>
        </View>

        {role === "admin" && item.cliente && (
          <Text style={styles.adminCliente}>
            Cliente: {item.cliente.nombre || item.cliente.email}
          </Text>
        )}

        {precio && (
          <Text style={styles.precio}>
            {parseFloat(precio).toLocaleString("es-CL")} CLP
          </Text>
        )}

        {item.notas_cliente && (
          <Text style={styles.notas}>{item.notas_cliente}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {role === "admin" ? "Todas las citas" : "Tus citas agendadas"}
          </Text>
          <Text style={styles.subtitle}>
            {role === "admin"
              ? "Visualiza todas las citas registradas."
              : "Consulta tus servicios programados fácilmente."}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#2E5430" size="large" style={{ marginTop: 50 }} />
        ) : appointments.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 50 }}>
            <Ionicons name="calendar-outline" size={60} color="#94A3B8" />
            <Text style={{ color: "#6B7280", marginTop: 10 }}>
              No hay citas registradas.
            </Text>
          </View>
        ) : (
          <FlatList
            data={appointments}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderAppointment}
            contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 16 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fefaf2",
  },
  container: {
    flex: 1,
    backgroundColor: "#fefaf2",
    paddingTop: 10,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2E5430",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#374151",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  servicio: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2E5430",
  },
  fecha: {
    fontSize: 13,
    color: "#6B7280",
  },
  estado: {
    fontSize: 13,
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  precio: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 28,
  },
  notas: {
    marginTop: 4,
    color: "#374151",
    fontSize: 13,
    marginLeft: 28,
  },
  adminCliente: {
    marginLeft: 28,
    fontSize: 13,
    color: "#2E5430",
    fontWeight: "500",
  },
});
