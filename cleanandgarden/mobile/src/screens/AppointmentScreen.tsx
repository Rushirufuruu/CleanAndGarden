import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  AppState,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function AppointmentScreen() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  // Filtros
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [fechaFiltro, setFechaFiltro] = useState("todas");
  const [fechaPersonalizada, setFechaPersonalizada] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Modales de desplegables
  const [showEstadoModal, setShowEstadoModal] = useState(false);
  const [showFechaModal, setShowFechaModal] = useState(false);

  // Modal de detalles de cita
  const [selectedCita, setSelectedCita] = useState<any>(null);
  const [showDetalleModal, setShowDetalleModal] = useState(false);

  // Para detectar cuando la app vuelve del background
  const appState = useRef(AppState.currentState);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        
        const email = await AsyncStorage.getItem("userEmail");
        const storedRole = await AsyncStorage.getItem("userRole");
        setRole(storedRole);
        setUserEmail(email);

        if (!email) {
          Alert.alert("Error", "No se pudo obtener la sesión.");
          return;
        }

        let url = storedRole === "admin" 
          ? `${API_URL}/citas/all`
          : `${API_URL}/citas/${encodeURIComponent(email)}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Error al obtener citas");

        const data = await res.json();
        setAppointments(data);
        setFiltered(data);
      } catch (err: any) {
        Alert.alert("Error", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);


  // Listener para eventos de notificaciones (refrescar automáticamente)
  useEffect(() => {
    const handleRefresh = async () => {
      console.log('🔔 Evento recibido: Refrescando citas...');
      setRefreshing(true);
      
      try {
        const email = await AsyncStorage.getItem("userEmail");
        const storedRole = await AsyncStorage.getItem("userRole");

        if (!email) return;

        let url = storedRole === "admin" 
          ? `${API_URL}/citas/all`
          : `${API_URL}/citas/${encodeURIComponent(email)}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Error al obtener citas");

        const data = await res.json();
        setAppointments(data);
        setFiltered(data);
        
        // ❌ NO sincronizar aquí para evitar loop infinito
        // if (storedRole !== "admin" && email) {
        //   await sincronizarNotificaciones(email);
        // }
        
        console.log(`✅ Citas refrescadas: ${data.length}`);
      } catch (err: any) {
        console.error("Error al refrescar:", err.message);
      } finally {
        setRefreshing(false);
      }
    };

  }, []);

  // �🔍 Aplicar filtros
  useEffect(() => {
    let temp = [...appointments];

    // Filtro por estado
    if (estadoFiltro !== "todos") {
      temp = temp.filter((c) => c.estado === estadoFiltro);
    }

    // Filtro fecha
    const hoy = new Date();

    if (fechaFiltro === "hoy") {
      temp = temp.filter((c) => {
        const fecha = new Date(c.fecha_hora);
        return (
          fecha.getFullYear() === hoy.getFullYear() &&
          fecha.getMonth() === hoy.getMonth() &&
          fecha.getDate() === hoy.getDate()
        );
      });
    }

    if (fechaFiltro === "7dias") {
      const hace7 = new Date();
      hace7.setDate(hace7.getDate() - 7);

      temp = temp.filter(
        (c) => new Date(c.fecha_hora) >= hace7 && new Date(c.fecha_hora) <= hoy
      );
    }

    if (fechaFiltro === "mes") {
      temp = temp.filter((c) => {
        const fecha = new Date(c.fecha_hora);
        return (
          fecha.getMonth() === hoy.getMonth() &&
          fecha.getFullYear() === hoy.getFullYear()
        );
      });
    }

    if (fechaFiltro === "personalizada" && fechaPersonalizada) {
      temp = temp.filter((c) => {
        const fecha = new Date(c.fecha_hora);
        return (
          fecha.getFullYear() === fechaPersonalizada.getFullYear() &&
          fecha.getMonth() === fechaPersonalizada.getMonth() &&
          fecha.getDate() === fechaPersonalizada.getDate()
        );
      });
    }

    setFiltered(temp);
  }, [estadoFiltro, fechaFiltro, fechaPersonalizada, appointments]);

  const renderAppointment = ({ item }: any) => {
    const nombreServicio =
      item.nombre_servicio_snapshot || item.servicio?.nombre || "Servicio";

    const fecha = new Date(item.fecha_hora);
    const fechaLocal = fecha.toLocaleDateString("es-CL");
    const horaLocal = fecha.toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.8}
        onPress={() => {
          setSelectedCita(item);
          setShowDetalleModal(true);
        }}
      >
        <View style={styles.row}>
          <Ionicons name="leaf-outline" size={24} color="#2E5430" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.servicio}>{nombreServicio}</Text>
            <Text style={styles.fecha}>
              {fechaLocal} — {horaLocal}
            </Text>
          </View>

          <Text style={[styles.estado, estadoColor(item.estado)]}>
            {item.estado}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const estadoColor = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return { color: "#EAB308" };
      case "confirmada":
        return { color: "#2563EB" };
      case "realizada":
        return { color: "#16A34A" };
      case "cancelada":
        return { color: "#DC2626" };
      default:
        return { color: "#374151" };
    }
  };

  const handleCancelarCita = async (citaId: number) => {
    Alert.alert(
      "Cancelar Cita",
      "¿Estás seguro de que deseas cancelar esta cita?",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Sí, cancelar",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/cita/${citaId}/cancelar`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
              });

              if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.error || "Error al cancelar la cita";
                
                // Mensaje específico para error de plazo
                if (errorMessage.includes("Plazo de cancelación expirado")) {
                  Alert.alert(
                    "❌ No se puede cancelar", 
                    "El plazo para cancelar esta cita ha expirado.\n\nLas citas solo pueden cancelarse hasta las 12:00 del día anterior."
                  );
                } else {
                  Alert.alert("❌ Error", errorMessage);
                }
                return;
              }

              Alert.alert("✅ Éxito", "La cita ha sido cancelada correctamente");
              
              // Actualizar la lista local
              const updatedAppointments = appointments.map((cita) =>
                cita.id === citaId ? { ...cita, estado: "cancelada" } : cita
              );
              setAppointments(updatedAppointments);
              
              // Actualizar la cita seleccionada en el modal
              if (selectedCita && selectedCita.id === citaId) {
                setSelectedCita({ ...selectedCita, estado: "cancelada" });
              }
              
              setShowDetalleModal(false);
            } catch (error: any) {
              Alert.alert("❌ Error", error.message || "No se pudo cancelar la cita");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* 🔽 FILTROS FIJOS */}
      <View style={styles.filtersContainer}>
        
        {/* Filtro ESTADO */}
        <TouchableOpacity
          style={styles.filterBox}
          onPress={() => setShowEstadoModal(true)}
        >
          <Text style={styles.filterLabel}>Estado</Text>
          <View style={styles.filterValueRow}>
            <Text style={styles.filterValue}>{estadoFiltro}</Text>
            <Ionicons name="chevron-down" size={16} color="#2E5430" />
          </View>
        </TouchableOpacity>

        {/* Filtro FECHAS */}
        <TouchableOpacity
            style={styles.filterBox}
            onPress={() => setShowFechaModal(true)}
          >
            <Text style={styles.filterLabel}>Fecha</Text>
            <View style={styles.filterValueRow}>
              <Text style={styles.filterValue}>{fechaFiltro}</Text>
              <Ionicons name="chevron-down" size={16} color="#2E5430" />
            </View>
          </TouchableOpacity>

        </View>

      {/* LISTA DE CITAS */}
      <View style={styles.listContainer}>
        {loading ? (
          <ActivityIndicator color="#2E5430" size="large" style={{ marginTop: 50 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.noResults}>
            <Ionicons name="calendar-outline" size={60} color="#94A3B8" />
            <Text style={{ color: "#6B7280", marginTop: 10 }}>
              No hay citas registradas.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderAppointment}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={async () => {
                  console.log('🔄 Pull to refresh activado');
                  setRefreshing(true);
                  
                  try {
                    const email = await AsyncStorage.getItem("userEmail");
                    const storedRole = await AsyncStorage.getItem("userRole");

                    if (!email) return;

                    let url = storedRole === "admin" 
                      ? `${API_URL}/citas/all`
                      : `${API_URL}/citas/${encodeURIComponent(email)}`;

                    const res = await fetch(url);
                    if (!res.ok) throw new Error("Error al obtener citas");

                    const data = await res.json();
                    setAppointments(data);
                    setFiltered(data);
                    
                    console.log(`✅ Citas refrescadas manualmente: ${data.length}`);
                  } catch (err: any) {
                    console.error("Error al refrescar:", err.message);
                  } finally {
                    setRefreshing(false);
                  }
                }}
                colors={['#2E5430']}
                tintColor="#2E5430"
              />
            }
          />
        )}
      </View>

      {/* MODALES */}
      {/* Modal Filtro de Estado */}
      <Modal
        visible={showEstadoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEstadoModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEstadoModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecciona Estado</Text>
            {["todos", "pendiente", "confirmada", "realizada", "cancelada"].map((estado) => (
              <TouchableOpacity
                key={estado}
                style={[
                  styles.modalOption,
                  estadoFiltro === estado && styles.modalOptionSelected
                ]}
                onPress={() => {
                  setEstadoFiltro(estado);
                  setShowEstadoModal(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  estadoFiltro === estado && styles.modalOptionTextSelected
                ]}>
                  {estado}
                </Text>
                {estadoFiltro === estado && (
                  <Ionicons name="checkmark" size={20} color="#2E5430" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Filtro de Fecha */}
      <Modal
        visible={showFechaModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFechaModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFechaModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecciona Rango de Fecha</Text>
            {["todas", "hoy", "7dias", "mes", "personalizada"].map((rango) => (
              <TouchableOpacity
                key={rango}
                style={[
                  styles.modalOption,
                  fechaFiltro === rango && styles.modalOptionSelected
                ]}
                onPress={() => {
                  setFechaFiltro(rango);
                  setShowFechaModal(false);
                  if (rango === "personalizada") {
                    setTimeout(() => setShowDatePicker(true), 300);
                  }
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  fechaFiltro === rango && styles.modalOptionTextSelected
                ]}>
                  {rango === "7dias" ? "Últimos 7 días" : rango}
                </Text>
                {fechaFiltro === rango && (
                  <Ionicons name="checkmark" size={20} color="#2E5430" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={fechaPersonalizada || new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setFechaPersonalizada(date);
          }}
        />
      )}

        {/* Modal de Detalles de Cita */}
        <Modal
          visible={showDetalleModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDetalleModal(false)}
        >
          <View style={styles.detalleModalOverlay}>
            <View style={styles.detalleModalContent}>
              {/* Header */}
              <View style={styles.detalleHeader}>
                <Text style={styles.detalleTitle}>Detalles de la Cita</Text>
                <TouchableOpacity onPress={() => setShowDetalleModal(false)}>
                  <Ionicons name="close" size={28} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {selectedCita && (
                <View style={styles.detalleBody}>
                  {/* Servicio */}
                  <View style={styles.detalleRow}>
                    <Ionicons name="leaf" size={24} color="#2E5430" />
                    <View style={styles.detalleInfo}>
                      <Text style={styles.detalleLabel}>Servicio</Text>
                      <Text style={styles.detalleValue}>
                        {selectedCita.nombre_servicio_snapshot || selectedCita.servicio?.nombre || "Sin especificar"}
                      </Text>
                    </View>
                  </View>

                  {/* Fecha y Hora */}
                  <View style={styles.detalleRow}>
                    <Ionicons name="calendar" size={24} color="#2E5430" />
                    <View style={styles.detalleInfo}>
                      <Text style={styles.detalleLabel}>Fecha y Hora</Text>
                      <Text style={styles.detalleValue}>
                        {new Date(selectedCita.fecha_hora).toLocaleDateString("es-CL", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </Text>
                      <Text style={styles.detalleValue}>
                        {new Date(selectedCita.fecha_hora).toLocaleTimeString("es-CL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  </View>

                  {/* Estado */}
                  <View style={styles.detalleRow}>
                    <Ionicons name="information-circle" size={24} color="#2E5430" />
                    <View style={styles.detalleInfo}>
                      <Text style={styles.detalleLabel}>Estado</Text>
                      <View style={[styles.estadoBadge, estadoBadgeColor(selectedCita.estado)]}>
                        <Text style={styles.estadoBadgeText}>{selectedCita.estado}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Precio */}
                  {(selectedCita.precio_aplicado || selectedCita.servicio?.precio_clp) && (
                    <View style={styles.detalleRow}>
                      <Ionicons name="cash" size={24} color="#2E5430" />
                      <View style={styles.detalleInfo}>
                        <Text style={styles.detalleLabel}>Precio</Text>
                        <Text style={styles.detallePrecio}>
                          ${parseFloat(selectedCita.precio_aplicado || selectedCita.servicio?.precio_clp).toLocaleString("es-CL")} CLP
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Cliente (solo para admin) */}
                  {role === "admin" && selectedCita.cliente && (
                    <View style={styles.detalleRow}>
                      <Ionicons name="person" size={24} color="#2E5430" />
                      <View style={styles.detalleInfo}>
                        <Text style={styles.detalleLabel}>Cliente</Text>
                        <Text style={styles.detalleValue}>
                          {selectedCita.cliente.nombre} {selectedCita.cliente.apellido}
                        </Text>
                        <Text style={styles.detalleSubValue}>{selectedCita.cliente.email}</Text>
                      </View>
                    </View>
                  )}

                  {/* Notas del Cliente */}
                  {selectedCita.notas_cliente && (
                    <View style={styles.detalleRow}>
                      <Ionicons name="chatbox-ellipses" size={24} color="#2E5430" />
                      <View style={styles.detalleInfo}>
                        <Text style={styles.detalleLabel}>Notas del Cliente</Text>
                        <Text style={styles.detalleValue}>{selectedCita.notas_cliente}</Text>
                      </View>
                    </View>
                  )}
                  
                </View>
              )}

              {/* Botones de Acción */}
              <View style={styles.detalleButtons}>
                {/* Botón Cancelar - Solo si no está cancelada o realizada */}
                {selectedCita && 
                 selectedCita.estado !== "cancelada" && 
                 selectedCita.estado !== "realizada" && (
                  <TouchableOpacity
                    style={styles.detalleCancelarButton}
                    onPress={() => handleCancelarCita(selectedCita.id)}
                  >
                    <Ionicons name="close-circle-outline" size={20} color="#fff" />
                    <Text style={styles.detalleCancelarButtonText}>Cancelar Cita</Text>
                  </TouchableOpacity>
                )}

                {/* Botón Cerrar */}
                <TouchableOpacity
                  style={styles.detalleCloseButton}
                  onPress={() => setShowDetalleModal(false)}
                >
                  <Text style={styles.detalleCloseButtonText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

    </SafeAreaView>
  );
}

const estadoBadgeColor = (estado: string) => {
  switch (estado) {
    case "pendiente":
      return { backgroundColor: "#FEF3C7", borderColor: "#EAB308" };
    case "confirmada":
      return { backgroundColor: "#DBEAFE", borderColor: "#2563EB" };
    case "realizada":
      return { backgroundColor: "#D1FAE5", borderColor: "#16A34A" };
    case "cancelada":
      return { backgroundColor: "#FEE2E2", borderColor: "#DC2626" };
    default:
      return { backgroundColor: "#F3F4F6", borderColor: "#9CA3AF" };
  }
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fefaf2" },
  container: { flex: 1, backgroundColor: "#fefaf2" },

  /* === FILTROS FIJOS === */
  filtersContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fefaf2",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterBox: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginRight: 10,
    elevation: 3,
  },
  filterLabel: { color: "#6B7280", fontSize: 12 },
  filterValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterValue: { fontSize: 16, fontWeight: "600", color: "#2E5430" },

  /* === CONTENEDOR DE LISTA === */
  listContainer: {
    flex: 1,
    backgroundColor: "#fefaf2",
  },

  /* === MODALES === */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "80%",
    maxHeight: "70%",
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2E5430",
    marginBottom: 16,
    textAlign: "center",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#f9fafb",
  },
  modalOptionSelected: {
    backgroundColor: "#e8f5e9",
    borderWidth: 1,
    borderColor: "#2E5430",
  },
  modalOptionText: {
    fontSize: 16,
    color: "#374151",
    textTransform: "capitalize",
  },
  modalOptionTextSelected: {
    fontWeight: "600",
    color: "#2E5430",
  },

  /* LISTA */
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
  },
  row: { flexDirection: "row", alignItems: "center" },
  servicio: { fontSize: 16, fontWeight: "600", color: "#2E5430" },
  fecha: { fontSize: 13, color: "#6B7280" },
  estado: { fontWeight: "bold", textTransform: "capitalize" },
  noResults: { alignItems: "center", marginTop: 50 },

  /* === MODAL DE DETALLES === */
  detalleModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  detalleModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    maxHeight: "90%",
  },
  detalleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  detalleTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2E5430",
  },
  detalleBody: {
    marginBottom: 20,
  },
  detalleRow: {
    flexDirection: "row",
    marginBottom: 20,
    alignItems: "flex-start",
  },
  detalleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  detalleLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  detalleValue: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
  detalleSubValue: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  detallePrecio: {
    fontSize: 20,
    color: "#2E5430",
    fontWeight: "bold",
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  estadoBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  detalleButtons: {
    gap: 10,
  },
  detalleCancelarButton: {
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  detalleCancelarButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  detalleCloseButton: {
    backgroundColor: "#2E5430",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  detalleCloseButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

