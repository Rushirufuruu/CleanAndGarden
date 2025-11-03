import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

// ✅ URL de tu backend Railway
const API_URL = "https://believable-victory-production.up.railway.app";

export default function AppointmentScreen({ route }: any) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);

        // Obtener email del usuario autenticado
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user || !user.email) {
          console.error("❌ Error al obtener usuario:", userError);
          Alert.alert("Error", "No se pudo obtener la sesión. Por favor, inicia sesión nuevamente.");
          return;
        }

        const email = user.email;
        console.log(`🔄 Fetching appointments for: ${email}`);
        
        // Add timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        // Usar el endpoint público con el email del usuario
        const url = `${API_URL}/citas/${encodeURIComponent(email)}`;
        console.log(`📡 Requesting: ${url}`);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        
        console.log(`📡 Response status: ${response.status}`);
        console.log(`📡 Response Content-Type: ${response.headers.get('content-type')}`);

        // Check if response is actually JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const textResponse = await response.text();
          console.error("❌ Response is not JSON:", textResponse.substring(0, 300));
          throw new Error(
            `El servidor no está respondiendo correctamente.\n\n` +
            `Por favor, verifica que el backend esté desplegado en Railway.\n\n` +
            `Status: ${response.status}`
          );
        }

        const data = await response.json();
        console.log(`✅ Data received: ${data.length} citas`);

        if (!response.ok) {
          throw new Error(data.error || `Error del servidor: ${response.status}`);
        }

        setAppointments(data);
      } catch (err: any) {
        console.error("❌ Error al cargar citas:", err);
        
        let errorMessage = "No se pudieron cargar las citas.";
        
        if (err.name === 'AbortError') {
          errorMessage = "La solicitud tardó demasiado tiempo. Verifica tu conexión a internet.";
        } else if (err.message && err.message.includes('Network request failed')) {
          errorMessage = "Error de red. Verifica que estés conectado a internet.";
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        Alert.alert("Error al cargar citas", errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  const renderAppointment = ({ item }: any) => {
    const nombreServicio =
      item.nombre_servicio_snapshot ||
      item.servicio?.nombre ||
      "Servicio";
    const precio = item.precio_aplicado || item.servicio?.precio_clp || null;
    const fecha = new Date(item.fecha_hora);
    const fechaLocal = fecha.toLocaleDateString("es-CL");
    const horaLocal = fecha.toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <View style={styles.card}>
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

        {precio && (
          <Text style={styles.precio}>
            {parseFloat(precio).toLocaleString("es-CL")} CLP
          </Text>
        )}
        {item.notas_cliente && (
          <Text style={styles.notas}>{item.notas_cliente}</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Tus horas agendadas</Text>
          <Text style={styles.subtitle}>
            Consulta tus servicios programados fácilmente.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#2E5430" size="large" style={{ marginTop: 50 }} />
        ) : appointments.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 50 }}>
            <Ionicons name="calendar-outline" size={60} color="#94A3B8" />
            <Text style={{ color: "#6B7280", marginTop: 10 }}>
              No tienes citas agendadas por ahora.
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
});
