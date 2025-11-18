import express from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const router = express.Router();

router.post("/push-token", async (req, res) => {
  try {
    const { userId, token, platform } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ error: "userId y token son requeridos" });
    }

    // upsert por token único
    const dispositivo = await prisma.dispositivo.upsert({
      where: { token_push: token },
      update: {
        usuario_id: userId,
        plataforma: platform,
        ultima_vez_visto: new Date(),
      },
      create: {
        usuario_id: userId,
        plataforma: platform,
        token_push: token,
        ultima_vez_visto: new Date(),
      },
    });

    return res.json({ ok: true, dispositivo });
  } catch (e) {
    console.error("Error guardando token push:", e);
    return res.status(500).json({ error: "Error interno" });
  }
});

export default router;
