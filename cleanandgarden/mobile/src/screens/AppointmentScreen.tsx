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

export default function AppointmentScreen() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);

        //Obtener usuario autenticado
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        const userEmail = userData?.user?.email;

        if (!userEmail) {
          Alert.alert("Error", "No se encontró el usuario autenticado.");
          return;
        }

        //Buscar el ID del usuario en la tabla "usuario"
        const { data: usuario, error: usuarioError } = await supabase
          .from("usuario")
          .select("id")
          .eq("email", userEmail)
          .single();

        if (usuarioError) throw usuarioError;

        //Obtener las citas del cliente autenticado
        const { data, error } = await supabase
          .from("cita")
          .select(`
            id,
            fecha_hora,
            estado,
            precio_aplicado,
            notas_cliente,
            nombre_servicio_snapshot,
            servicio (
              nombre,
              precio_clp
            )
          `)
          .eq("cliente_id", usuario.id)
          .order("fecha_hora", { ascending: true });

        if (error) throw error;

        setAppointments(data || []);
      } catch (err: any) {
        console.error("Error al cargar citas:", err.message);
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
        {/* Encabezado */}
        <View style={styles.header}>
          <Text style={styles.title}>Tus horas agendadas</Text>
          <Text style={styles.subtitle}>
            Consulta tus servicios programados fácilmente.
          </Text>
        </View>

        {/* Contenido */}
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
    backgroundColor: "#fefaf2", // mismo color del fondo
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
