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
import { supabase } from "../lib/supabase";

const API_URL = "https://believable-victory-production.up.railway.app";

export default function HomeScreen({ navigation }: any) {
  const [servicios, setServicios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("Usuario");

  // Obtener información del usuario autenticado
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          console.error("❌ Error al obtener usuario:", error);
          return;
        }

        const email = user.email;
        console.log("✅ Usuario autenticado:", email);

        if (!email) {
          return;
        }

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
          "https://believable-victory-production.up.railway.app/servicios"
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

              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => Alert.alert("Perfil", "Funcionalidad próximamente")}
              >
                <Ionicons name="person-circle-outline" size={42} color="#2E5430" />
              </TouchableOpacity>
            </View>

            <View style={styles.headerBottom}>
              <Ionicons name="leaf-outline" size={18} color="#2E5430" />
              <Text style={styles.subtitle}>
                Cuidamos tus espacios verdes con dedicación y profesionalismo.
              </Text>
            </View>
          </View>

          {/* SERVICIOS */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nuestros servicios</Text>
              <TouchableOpacity onPress={() => Alert.alert("Próximamente")}>
                <Text style={styles.verMas}>Ver todos</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator color="#2E5430" size="large" />
            ) : (
              <FlatList
                data={servicios}
                keyExtractor={(item) => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={styles.card}>
                    {item.imagenUrl ? (
                      <Image
                        source={{ uri: item.imagenUrl }}
                        style={styles.cardImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Ionicons name="leaf-outline" size={40} color="#2E5430" />
                      </View>
                    )}
                    <Text style={styles.cardTitle}>{item.nombre}</Text>
                    <Text style={styles.cardDesc} numberOfLines={2}>
                      {item.descripcion}
                    </Text>
                    <Text style={styles.cardPrice}>
                      {item.precio?.toLocaleString("es-CL")} CLP
                    </Text>
                  </View>
                )}
              />
            )}
          </View>

          {/* CTA */}
          <View style={styles.ctaContainer}>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => Alert.alert("Agendar", "Funcionalidad próximamente")}
            >
              <Text style={styles.ctaText}>Agenda tu servicio ahora</Text>
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

});
