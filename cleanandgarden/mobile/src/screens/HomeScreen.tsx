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
import { supabase } from "../lib/supabase";
import { StatusBar } from "expo-status-bar";

export default function HomeScreen({ navigation }: any) {
  const [servicios, setServicios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServicios = async () => {
      try {
        setLoading(true);

        const { data: serviciosData, error: serviciosError } = await supabase
          .from("servicio")
          .select("id, nombre, descripcion, precio_clp, imagen_id")
          .eq("activo", true)
          .limit(5);

        if (serviciosError) throw serviciosError;

        if (!serviciosData || serviciosData.length === 0) {
          setServicios([]);
          return;
        }

        const imageIds = serviciosData
          .map((s) => s.imagen_id)
          .filter((id) => id !== null);

        if (imageIds.length > 0) {
          const { data: imagenesData, error: imagenesError } = await supabase
            .from("imagen")
            .select("id, url_publica")
            .in("id", imageIds);

          if (imagenesError) throw imagenesError;

          const serviciosConImagenes = serviciosData.map((servicio) => ({
            ...servicio,
            imagen: imagenesData?.find((img) => img.id === servicio.imagen_id),
          }));

          setServicios(serviciosConImagenes);
        } else {
          setServicios(serviciosData);
        }
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
          <View style={styles.header}>
            <Text style={styles.title}>Bienvenido a Clean & Garden</Text>
            <Text style={styles.subtitle}>
              Cuida tus espacios verdes con nuestros servicios profesionales.
            </Text>
          </View>

          {/* BOTÓN DE PERFIL */}
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => Alert.alert("Perfil", "Funcionalidad próximamente")}
            >
              <Ionicons name="person-circle-outline" size={30} color="#2E5430" />
            </TouchableOpacity>
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
                    {item.imagen?.url_publica ? (
                      <Image
                        source={{ uri: item.imagen.url_publica }}
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
                       {item.precio_clp?.toLocaleString("es-CL")} CLP
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
    backgroundColor: "#fefaf2", // mismo color del fondo
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
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    height: 65,
    paddingBottom: 8,
    elevation: 10,
  },
  tabButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 12,
    color: "#2E5430",
    fontWeight: "600",
    marginTop: 4,
  },
});
