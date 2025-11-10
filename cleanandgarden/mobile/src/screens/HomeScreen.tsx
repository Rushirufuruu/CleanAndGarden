import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";

const formatDate = (isoDate: string) => {
  const date = new Date(isoDate);
  const fecha = date.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const hora = date.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${fecha} — ${hora}`;
};

// URL del backend (localhost en desarrollo, Railway en producción)
const API_URL = process.env.EXPO_PUBLIC_API_URL;



export default function HomeScreen({ navigation }: any) {
  const [servicios, setServicios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("Usuario");

  // Obtener información del usuario autenticado
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        // Obtener el email guardado en AsyncStorage
        const email = await AsyncStorage.getItem("userEmail");
        
        if (!email) {
          console.error("❌ No hay email guardado");
          return;
        }

        console.log("✅ Email del usuario:", email);

        // Buscar información adicional del usuario en el backend usando el email
        const response = await fetch(`${API_URL}/usuario/info/email/${encodeURIComponent(email)}`);
        
        if (response.ok) {
          const userData = await response.json();
          if (userData.nombre) {
            setUserName(userData.nombre);
            console.log("✅ Nombre del usuario:", userData.nombre);
          }
        } else {
          console.log("⚠️ No se pudo obtener info del backend, usando email");
          // Si no hay endpoint, usar el email como nombre
          const nombre = email.split('@')[0];
          setUserName(nombre.charAt(0).toUpperCase() + nombre.slice(1));
        }
      } catch (err) {
        console.error("Error al obtener info del usuario:", err);
        // Fallback: usar "Usuario"
      }
    };

    fetchUserInfo();
  }, []);

  useEffect(() => {
    const fetchServicios = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `${API_URL}/servicios`
        );
        if (!response.ok) throw new Error("Error al obtener los servicios");

        const data = await response.json();
        setServicios(data);
      } catch (err: any) {
        Alert.alert("Error", err?.message || "No se pudieron cargar los servicios");
      } finally {
        setLoading(false);
      }
    };

    fetchServicios();
  }, []);

  const [nextAppointment, setNextAppointment] = useState<any>(null);

  useEffect(() => {
    const fetchNextAppointment = async () => {
      try {
        // Obtener el email desde AsyncStorage
        const email = await AsyncStorage.getItem("userEmail");
        if (!email) return;

        const res = await fetch(`${API_URL}/citas/${encodeURIComponent(email)}`);
        if (!res.ok) throw new Error("No se pudo obtener las citas");

        const citas = await res.json();

        // Filtrar solo futuras y tomar la más próxima
        const ahora = new Date();
        const futuras = citas.filter(
          (c: any) =>
            new Date(c.fecha_hora) > ahora &&
            ["pendiente", "confirmada"].includes(c.estado)
        );

        if (futuras.length > 0) {
          setNextAppointment(futuras[0]); // la más próxima por orden ascendente
        } else {
          setNextAppointment(null);
        }
      } catch (err) {
        console.error("Error al cargar próxima cita:", err);
      }
    };

    fetchNextAppointment();
  }, []);

  const [tips] = useState([
    {
      id: 1,
      title: "Riega temprano",
      description: "El riego a primera hora del día reduce la evaporación y ayuda a que las plantas aprovechen mejor el agua.",
      icon: "water-outline",
    },
    {
      id: 2,
      title: "Corta el pasto con regularidad",
      description: "Mantener una altura uniforme evita que las raíces se debiliten y mejora la oxigenación del suelo.",
      icon: "leaf-outline",
    },
    {
      id: 3,
      title: "Usa abono natural",
      description: "Composta restos de frutas, verduras y hojas secas: tendrás un fertilizante natural sin costo.",
      icon: "flower-outline",
    },
    {
      id: 4,
      title: "Cuida tus herramientas",
      description: "Limpia y seca tus herramientas después de usarlas para evitar la oxidación y prolongar su vida útil.",
      icon: "construct-outline",
    },
  ]);



  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" backgroundColor="#fefaf2" />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={{ paddingBottom: 90 }}>
          {/* HEADER */}
          <View style={styles.headerContainer}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.greeting}>Hola, {userName}</Text>
                <Text style={styles.title}>Bienvenido a Clean & Garden</Text>
              </View>
            </View>

            <View style={styles.headerBottom}>
              <Ionicons name="leaf-outline" size={18} color="#2E5430" />
              <Text style={styles.subtitle}>
                Cuidamos tus espacios verdes con dedicación y profesionalismo.
              </Text>
            </View>
          </View>

          {/* SERVICIOS DESTACADOS */}
          <View style={styles.servicesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nuestros servicios</Text>
              <TouchableOpacity
                onPress={() => Alert.alert("Próximamente", "Sección de catálogo en desarrollo")}
              >
                <Text style={styles.verMas}>Ver todos</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator color="#2E5430" size="large" />
            ) : servicios.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="leaf-outline" size={48} color="#94A3B8" />
                <Text style={styles.emptyText}>No hay servicios disponibles por ahora.</Text>
              </View>
            ) : (
              <FlatList
                data={servicios}
                keyExtractor={(item) => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.servicesList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.serviceCard}
                    onPress={() =>
                      Alert.alert(item.nombre, "Visualización detallada próximamente.")
                    }
                  >
                    {/* Imagen o placeholder */}
                    {item.imagenUrl ? (
                      <Image
                        source={{ uri: item.imagenUrl }}
                        style={styles.serviceImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Ionicons name="leaf-outline" size={42} color="#2E5430" />
                      </View>
                    )}

                    {/* Información */}
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceName} numberOfLines={1}>
                        {item.nombre}
                      </Text>
                      <Text style={styles.servicePrice}>
                        {item.precio?.toLocaleString("es-CL")} CLP
                      </Text>
                      <Text style={styles.serviceDesc} numberOfLines={2}>
                        {item.descripcion || "Servicio especializado para tu jardín."}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>

          {/* PRÓXIMA CITA */}
          <View style={styles.nextAppointmentSection}>
            <Text style={styles.sectionTitle}>Tu próxima cita</Text>

            {loading ? (
              <ActivityIndicator color="#2E5430" size="large" />
            ) : nextAppointment ? (
              <View style={styles.appointmentCard}>
                <View style={styles.appointmentRow}>
                  <Ionicons name="calendar-outline" size={22} color="#2E5430" />
                  <Text style={styles.appointmentService}>
                    {nextAppointment.nombre_servicio_snapshot || "Servicio agendado"}
                  </Text>
                </View>

                <Text style={styles.appointmentDate}>
                  {formatDate(nextAppointment.fecha_hora)}
                </Text>

                {nextAppointment.precio_aplicado && (
                  <Text style={styles.appointmentPrice}>
                    {nextAppointment.precio_aplicado.toLocaleString("es-CL")} CLP
                  </Text>
                )}

                <View style={styles.appointmentStatus}>
                  <Ionicons
                    name={
                      nextAppointment.estado === "confirmada"
                        ? "checkmark-circle-outline"
                        : "time-outline"
                    }
                    size={18}
                    color={
                      nextAppointment.estado === "confirmada" ? "#16A34A" : "#EAB308"
                    }
                  />
                  <Text style={styles.appointmentStatusText}>
                    {nextAppointment.estado}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={48} color="#94A3B8" />
                <Text style={styles.emptyText}>No tienes citas próximas.</Text>
              </View>
            )}
          </View>

          {/* SECCIÓN DE TIPS */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Consejos y Tips</Text>
            </View>

            <FlatList
              data={tips}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.tipCard}>
                  <Ionicons name={item.icon as any} size={30} color="#2E5430" style={{ marginBottom: 8 }} />
                  <Text style={styles.tipTitle}>{item.title}</Text>
                  <Text style={styles.tipText}>{item.description}</Text>
                </View>
              )}
            />
          </View>

          {/* SECCIÓN ABOUT */}
          <View style={styles.aboutSection}>
            <Text style={styles.aboutTitle}>Sobre Clean & Garden</Text>

            <Text style={styles.aboutText}>
              En <Text style={{ fontWeight: "700" }}>Clean & Garden</Text> nos
              especializamos en el mantenimiento de jardines y áreas verdes. Nuestro
              equipo está comprometido con ofrecer un servicio profesional, confiable y
              respetuoso con el medio ambiente.
            </Text>

            <Text style={styles.aboutText}>
              Desde la limpieza general hasta el cuidado detallado de plantas y pastos,
              buscamos transformar cada espacio exterior en un lugar más saludable,
              limpio y agradable para ti y tu familia.
            </Text>

            <View style={styles.aboutIconsRow}>
              <View style={styles.aboutIconItem}>
                <Ionicons name="leaf-outline" size={26} color="#2E5430" />
                <Text style={styles.aboutIconText}>Sustentable</Text>
              </View>

              <View style={styles.aboutIconItem}>
                <Ionicons name="people-outline" size={26} color="#2E5430" />
                <Text style={styles.aboutIconText}>Cercano</Text>
              </View>

              <View style={styles.aboutIconItem}>
                <Ionicons name="shield-checkmark-outline" size={26} color="#2E5430" />
                <Text style={styles.aboutIconText}>Confiable</Text>
              </View>
            </View>
          </View>

          {/* SECCIÓN DE CONTACTO */}
          <View style={styles.contactSection}>
            <Text style={styles.contactTitle}>Contáctanos</Text>
            <Text style={styles.contactSubtitle}>
              Si tienes dudas o necesitas más información, ¡estamos para ayudarte!
            </Text>

            <View style={styles.contactItem}>
              <Ionicons name="logo-whatsapp" size={22} color="#2E5430" />
              <Text style={styles.contactText}>+56 9 8765 4321</Text>
            </View>

            <View style={styles.contactItem}>
              <Ionicons name="mail-outline" size={22} color="#2E5430" />
              <Text style={styles.contactText}>contacto@cleanandgarden.cl</Text>
            </View>

            <View style={styles.contactItem}>
              <Ionicons name="location-outline" size={22} color="#2E5430" />
              <Text style={styles.contactText}>Santiago, Chile</Text>
            </View>

            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => Alert.alert("Próximamente", "Integración con WhatsApp Web")}
            >
              <Ionicons name="chatbubbles-outline" size={18} color="#fff" />
              <Text style={styles.contactButtonText}>Enviar mensaje</Text>
            </TouchableOpacity>
          </View>



          
        </ScrollView>
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
  },
  header: {
    padding: 20,
    marginTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2E5430",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 20,
  },
  headerButtons: {
    position: "absolute",
    top: 40,
    right: 20,
  },
  iconButton: {
    backgroundColor: "#fff",
    borderRadius: 50,
    padding: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2E5430",
  },
  verMas: {
    color: "#2E5430",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    marginRight: 14,
    width: 180,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  cardImage: {
    width: "100%",
    height: 100,
    borderRadius: 10,
    marginBottom: 8,
  },
  imagePlaceholder: {
    width: "100%",
    height: 100,
    borderRadius: 10,
    backgroundColor: "#e5ede5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2E5430",
  },
  cardDesc: {
    fontSize: 13,
    color: "#6B7280",
    marginVertical: 4,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2E5430",
  },
  ctaContainer: {
    padding: 20,
    marginTop: 20,
    alignItems: "center",
  },
  ctaButton: {
    backgroundColor: "#2E5430",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  ctaText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  headerContainer: {
  backgroundColor: "#fefaf2",
  paddingTop: 30,
  paddingHorizontal: 20,
  paddingBottom: 10,
},

headerTop: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

greeting: {
  fontSize: 18,
  fontWeight: "500",
  color: "#374151",
  marginBottom: 2,
},

profileButton: {
  backgroundColor: "#fff",
  borderRadius: 50,
  padding: 4,
  shadowColor: "#000",
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},

headerBottom: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 10,
},

servicesSection: {
  marginTop: 20,
  paddingHorizontal: 20,
},

servicesList: {
  paddingVertical: 6,
},

serviceCard: {
  backgroundColor: "#fff",
  borderRadius: 16,
  marginRight: 16,
  width: 200,
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 4,
  elevation: 3,
  overflow: "hidden",
},

serviceImage: {
  width: "100%",
  height: 120,
},

serviceInfo: {
  padding: 10,
},

serviceName: {
  fontSize: 16,
  fontWeight: "600",
  color: "#2E5430",
  marginBottom: 2,
},

servicePrice: {
  fontSize: 14,
  fontWeight: "500",
  color: "#16A34A",
  marginBottom: 4,
},

serviceDesc: {
  fontSize: 12,
  color: "#6B7280",
  lineHeight: 16,
},

emptyContainer: {
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 40,
},

emptyText: {
  color: "#6B7280",
  fontSize: 14,
  marginTop: 10,
},

nextAppointmentSection: {
  marginTop: 30,
  paddingHorizontal: 20,
},

appointmentCard: {
  backgroundColor: "#fff",
  borderRadius: 14,
  padding: 16,
  marginTop: 10,
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 4,
  elevation: 3,
},

appointmentRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 6,
},

appointmentService: {
  fontSize: 16,
  fontWeight: "600",
  color: "#2E5430",
  marginLeft: 8,
},

appointmentDate: {
  fontSize: 14,
  color: "#374151",
  marginBottom: 4,
},

appointmentPrice: {
  fontSize: 14,
  fontWeight: "600",
  color: "#16A34A",
  marginBottom: 8,
},

appointmentStatus: {
  flexDirection: "row",
  alignItems: "center",
},

appointmentStatusText: {
  marginLeft: 6,
  color: "#374151",
  fontSize: 13,
  textTransform: "capitalize",
},

tipCard: {
  backgroundColor: "#fff",
  borderRadius: 12,
  padding: 16,
  marginRight: 14,
  width: 220,
  shadowColor: "#000",
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},
tipTitle: {
  fontSize: 15,
  fontWeight: "600",
  color: "#2E5430",
  marginBottom: 4,
},
tipText: {
  fontSize: 13,
  color: "#374151",
  lineHeight: 18,
},

aboutSection: {
  backgroundColor: "#fff",
  marginHorizontal: 20,
  marginTop: 20,
  borderRadius: 12,
  padding: 20,
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 2,
},
aboutTitle: {
  fontSize: 20,
  fontWeight: "bold",
  color: "#2E5430",
  marginBottom: 12,
},
aboutText: {
  fontSize: 14,
  color: "#374151",
  lineHeight: 20,
  marginBottom: 10,
},
aboutIconsRow: {
  flexDirection: "row",
  justifyContent: "space-around",
  marginTop: 10,
},
aboutIconItem: {
  alignItems: "center",
},
aboutIconText: {
  marginTop: 4,
  fontSize: 12,
  color: "#2E5430",
  fontWeight: "500",
},
contactSection: {
  backgroundColor: "#fff",
  marginHorizontal: 20,
  marginTop: 20,
  borderRadius: 12,
  padding: 20,
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 2,
},
contactTitle: {
  fontSize: 20,
  fontWeight: "bold",
  color: "#2E5430",
  marginBottom: 6,
},
contactSubtitle: {
  fontSize: 14,
  color: "#374151",
  marginBottom: 16,
  lineHeight: 20,
},
contactItem: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 10,
},
contactText: {
  fontSize: 14,
  color: "#374151",
  marginLeft: 10,
},
contactButton: {
  flexDirection: "row",
  backgroundColor: "#2E5430",
  borderRadius: 8,
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 10,
  marginTop: 12,
},
contactButtonText: {
  color: "#fff",
  fontWeight: "600",
  marginLeft: 6,
},


});
