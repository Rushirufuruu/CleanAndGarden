// Importamos Express y CORS: herramientas para crear la API y permitir llamadas desde el front
import express from 'express'
import cors from 'cors'
// Importamos la instancia única de Prisma para hablar con la base de datos
import { prisma } from './lib/prisma'
// Bcrypt para hashear contraseñas de forma segura (libre de dependencias nativas con "bcryptjs")
import bcrypt from 'bcryptjs'

// Importamos crypto para generar tokens seguros.
import crypto from "crypto";
// Importamos el transporter de nodemailer para enviar correos electrónicos
import nodemailer from "nodemailer";

// Importamos tipos de Request y Response de Express para tipar mejor las funciones
import { Request, Response } from "express";

// Creamos la app de Express (hay que pensarlo como el "router" principal de la API)
const app = express()
// Habilita CORS: permite que el front pueda llamar a la api
app.use(cors())
// Habilita parseo de json en el body de las requests
app.use(express.json())

// Helper para serializar BigInt en JSON (Prisma puede devolver BigInt y JSON.stringify falla)
// Técnico: JSON.stringify no soporta BigInt; convertimos BigInt -> Number de forma segura.
// Común: esto evita errores raros cuando mandamos datos muy grandes al front.
function toJSONSafe<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_k, v) => (typeof v === 'bigint' ? Number(v) : v))
  )
}

// Endpoint de salud/diagnóstico simple para comprobar conexión a la BD
// Ejecuta un SELECT 1 y, si responde, la conexión está OK.
app.get('/health', async (_req, res) => {
  const r = await prisma.$queryRawUnsafe('SELECT 1 as ok') // Consulta cruda mínima
  res.json({ db: 'ok', r }) // Respondemos con el resultado por simpleza
})

// Listar usuarios desde la tabla `usuario` (Soporta paginación y orden básico)
// Usa prisma.usuario.findMany con take/skip/orderBy dinámicos.
app.get('/usuario', async (req, res) => {
  try {
    // Parámetros de consulta opcionales: ?take=10&skip=0&orderBy=campo&order=asc|desc
    // Coaccionamos a número y validamos strings.
    const take = Number(req.query.take ?? 10)
    const skip = Number(req.query.skip ?? 0)
    const orderByField = typeof req.query.orderBy === 'string' ? req.query.orderBy : undefined
    const order: 'asc' | 'desc' = req.query.order === 'desc' ? 'desc' : 'asc'

    // Consulta a Prisma: busca en la tabla `usuario` con los parámetros dados
    // orderBy se arma dinámicamente cuando se pide
    const usuarios = await prisma.usuario.findMany({
      take,
      skip,
      orderBy: orderByField ? { [orderByField]: order } as any : undefined,
    })

    // Devolvemos la lista asegurando compatibilidad JSON (BigInt -> Number)
    res.json(toJSONSafe(usuarios))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No existe la tabla usuario o error en query' })
  }
})
app.get('/regiones', async (_req, res) => {
  try {
    const regiones = await prisma.region.findMany({
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });

    res.json(toJSONSafe(regiones)); // 👈 convierte BigInt a Number
  } catch (err: any) {
    console.error("❌ Error en /regiones:", err);
    res.status(500).json({ error: err.message ?? 'Error al obtener regiones' });
  }
});

// Listar comunas de una región específica
app.get('/regiones/:id/comunas', async (req, res) => {
  try {
    const regionId = Number(req.params.id);
    if (isNaN(regionId)) {
      return res.status(400).json({ error: 'ID de región inválido' });
    }

    const comunas = await prisma.comuna.findMany({
      where: { region_id: regionId },
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' }
    });

    res.json(toJSONSafe(comunas)); // 👈 convierte BigInt a Number
  } catch (err: any) {
    console.error("❌ Error al obtener comunas:", err);
    res.status(500).json({ error: err.message ?? 'Error al obtener comunas' });
  }
});


// Registrar un nuevo usuario
// - Valida inputs mínimos
// - Verifica que el email no exista
// - Hashea la contraseña con bcryptjs (12 rondas)
// - Crea el registro en la tabla `usuario`
// Registrar un nuevo usuario
app.post('/usuario', async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      email,
      password,
      confpassword,
      telefono,
      direccion, // texto: calle
      comunaId,  // ID de la comuna seleccionada en el front
      terminos,
    } = req.body ?? {}

    // ===== Validaciones =====
    if (!nombre || typeof nombre !== 'string') {
      return res.status(400).json({ error: 'El nombre es requerido' })
    }
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'El email es requerido' })
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Formato de email inválido' })
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' })
    }
    if (password !== confpassword) {
      return res.status(400).json({ error: 'Las contraseñas no coinciden' })
    }
    if (terminos !== true) {
      return res.status(400).json({ error: 'Debes aceptar los términos y condiciones' })
    }

    // Verificar si el email ya existe
    const existing = await prisma.usuario.findUnique({ where: { email } })
    if (existing) {
      return res.status(409).json({ error: 'El email ya está registrado' })
    }

    // ===== Crear usuario (inactivo) =====
    const contrasena_hash = await bcrypt.hash(password, 12)
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre,
        apellido: apellido || null,
        email,
        telefono: telefono || null,
        contrasena_hash,
        activo: false, // 👈 se crea inactivo hasta confirmar
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        telefono: true,
        activo: true,
        
      },
    })

    // ===== Crear dirección (opcional) =====
    if (direccion && comunaId) {
      await prisma.direccion.create({
        data: {
          calle: direccion,
          usuario: { connect: { id: nuevoUsuario.id } },
          comuna: { connect: { id: Number(comunaId) } },
        },
      })
    }

    // ===== Generar token de confirmación =====
    const token = crypto.randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 60 * 60 * 1000) // expira en 1 hora

    await prisma.confirm_token.create({
      data: { userId: nuevoUsuario.id, token, expiresAt: expires },
    })

    // ===== Enviar correo de confirmación =====
    const confirmLink = `${process.env.FRONTEND_URL}/confirm-email?token=${token}`

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: nuevoUsuario.email,
      subject: "Confirma tu cuenta",
      html: `<p>Bienvenido ${nuevoUsuario.nombre} ${nuevoUsuario.apellido}!</p>
             <p>Gracias por registrarte en Clean & Garden. Haz clic en el botón para activar tu cuenta:</p>
             <a href="${confirmLink}">${confirmLink}</a>`,
    })

    console.log("✅ Correo de confirmación enviado a:", nuevoUsuario.email);
    return res.status(201).json({ message: "Usuario creado, revisa tu correo para confirmar la cuenta" })

  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ error: 'Error al registrar usuario' })
  }
})

//-------------------------------------------------------------------------------------
// Confirmar email
app.get("/confirm-email/:token", async (req, res) => {
  try {
    const { token } = req.params

    const confirm = await prisma.confirm_token.findUnique({ where: { token } })

    if (!confirm || confirm.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: "Token inválido o expirado" })
    }

    // Activar usuario
    await prisma.usuario.update({
      where: { id: Number(confirm.userId) }, // 👈 userId correcto
      data: { activo: true },
    })

    // Eliminar token usado
    await prisma.confirm_token.delete({ where: { id: confirm.id } })

    return res.json({ success: true, message: "✅ Cuenta activada correctamente" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: "Error al confirmar cuenta" })
  }
})

//----------------------------------------------------------------------------------

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    // Buscar usuario
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Comparar contraseña
    const passwordMatch = await bcrypt.compare(password, usuario.contrasena_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // Verificar si el usuario confirmó el correo
    if (!usuario.activo) {
      return res.status(403).json({ error: 'Debes confirmar tu cuenta antes de iniciar sesión. Revisa tu correo 📩' });
    }

    // Si todo bien → devolver login exitoso
   return res.status(200).json({ 
      message: '✅ Login exitoso', 
      user: toJSONSafe(usuario) 
    })

  } catch (e) {
    console.error("Error en /login:", e)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

app.post("/change-password", async (req, res) => {
  try {
    const { email, password, newPassword, confirmPassword } = req.body ?? {};

    // Validar campos
    if (!email || !password || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Las contraseñas nuevas no coinciden" });
    }

    // Buscar usuario
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Comparar contraseña actual
    const isMatch = await bcrypt.compare(password, usuario.contrasena_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "La contraseña actual es incorrecta" });
    }

    // Hashear nueva contraseña
    const saltRounds = 12;
    const newHash = await bcrypt.hash(newPassword, saltRounds);
    

    // Actualizar en BD
    await prisma.usuario.update({
      where: { email },
      data: { contrasena_hash: newHash },
    });

   

    return res.status(200).json({ message: "✅ Contraseña actualizada correctamente" });
  } catch (err) {
    console.error("Error en /change-password:", err);
    return res.status(500).json({ error: "Error al cambiar la contraseña" });
  }
});

//----------------------------


app.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Buscar usuario (si existe)
     const user = await prisma.usuario.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Generar token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // expira en 1 hora

    // Guardar token en la tabla reset_token
    await prisma.reset_token.create({
      data: { userId: user.id, token, expiresAt: expires },
    });

    // Configuración de correo
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Recuperación de contraseña",
      html: `<p>Haz click en el siguiente enlace para recuperar tu contraseña:</p>
             <a href="${resetLink}">${resetLink}</a>`,
    });

    res.json({ message: "Correo de recuperación enviado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    const reset = await prisma.reset_token.findUnique({ where: { token } });

    if (!reset || reset.expiresAt < new Date()) {
      return res.status(400).json({ message: "Token inválido o expirado" });
    }

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.usuario.update({
      where: { id: reset.userId },
      data: { contrasena_hash: hashedPassword },
    });

    // Eliminar token usado
    await prisma.reset_token.delete({ where: { id: reset.id } });

    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

















// Leemos el puerto desde las variables de entorno; si no, usamos 3001 por defecto
// Convierte a Number y arranca el servidor
const port = Number(process.env.PORT ?? 3001)
app.listen(port, () => console.log(`🚀 API backend listening on port ${port}`))

