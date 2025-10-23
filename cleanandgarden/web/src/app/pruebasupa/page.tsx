"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function HomePage() {
  useEffect(() => {
    async function testConnection() {
      const { data, error } = await supabase.from("usuario").select("*").limit(1);
      if (error) console.error("❌ Error de conexión:", error);
      else console.log("✅ Conexión exitosa:", data);
    }
    testConnection();
  }, []);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Prueba de conexión Supabase</h1>
      <p>Abre la consola del navegador (F12) para ver el resultado.</p>
    </main>
  );
}
