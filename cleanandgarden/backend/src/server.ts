// Configurar variables de entorno ANTES de cualquier otra importación
import 'dotenv/config'

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

import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";

// Creamos la app de Express (hay que pensarlo como el "router" principal de la API)
const app = express()
// Habilita CORS: permite que el front pueda llamar a la api
app.use(cors({
  origin: "http://localhost:3000", // 👈 dirección exacta de tu frontend
  credentials: true,               // 👈 habilita envío de cookies
}));

app.use(express.json());
app.use(cookieParser());

// Middleware que protege rutas privadas (como /profile)
function authMiddleware(req: Request, res: Response, next: any) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: "No autorizado. Token no encontrado." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    // Guardamos los datos decodificados en req.user
    (req as any).user = decoded;
    next();
  } catch (err) {
    console.error("❌ Token inválido o expirado:", err);
    return res.status(403).json({ error: "Token inválido o expirado" });
  }
}

// Helper para serializar BigInt en JSON (Prisma puede devolver BigInt y JSON.stringify falla)
// Técnico: JSON.stringify no soporta BigInt; convertimos BigInt -> Number de forma segura.
// Común: esto evita errores raros cuando mandamos datos muy grandes al front.
function toJSONSafe<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_k, v) => (typeof v === 'bigint' ? Number(v) : v))
  )
}

// ==========================================
// 🔐 JWT CONFIG
// ==========================================
const JWT_SECRET = process.env.JWT_SECRET || "clave_por_defecto";

// Genera un token (expira en 1 hora)
function generateToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

// Verifica el token
function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
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

// Obtener items del portafolio publicados
app.get('/portfolio', async (req, res) => {
  try {
    const portfolioItems = await prisma.portafolio_item.findMany({
      where: { 
        publicado: true 
      },
      select: {
        id: true,
        titulo: true,
        descripcion: true,
        publicado_en: true,
        imagen: {
          select: {
            url_publica: true,
            clave_storage: true
          }
        },
        visita: {
          select: {
            cita: {
              select: {
                cliente_id: true,
                jardin_id: true,
                servicio: {
                  select: {
                    nombre: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { 
        publicado_en: 'desc' 
      }
    });

    // Transformar los datos para el frontend
    const portfolioFormatted = portfolioItems.map(item => ({
      id: Number(item.id),
      titulo: item.titulo,
      descripcion: item.descripcion || '',
      imagenUrl: item.imagen?.url_publica || '/images/placeholder-portfolio.jpg',
      fecha: item.publicado_en?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      servicio: item.visita?.cita?.servicio?.nombre || 'Servicio general'
    }));

    res.json(toJSONSafe(portfolioFormatted));
  } catch (err: any) {
    console.error("❌ Error al obtener portfolio:", err);
    res.status(500).json({ error: err.message ?? 'Error al obtener portfolio' });
  }
});

// Obtener trabajo específico del portfolio por ID
app.get('/portfolio/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const portfolioId = Number(id);

    if (isNaN(portfolioId)) {
      return res.status(400).json({ error: 'ID de trabajo inválido' });
    }

    const portfolioItem = await prisma.portafolio_item.findUnique({
      where: { 
        id: portfolioId,
        publicado: true 
      },
      select: {
        id: true,
        titulo: true,
        descripcion: true,
        publicado_en: true,
        creado_en: true,
        imagen: {
          select: {
            url_publica: true,
            clave_storage: true
          }
        },
        portafolio_imagen: {
          select: {
            imagen: {
              select: {
                url_publica: true
              }
            }
          }
        },
        visita: {
          select: {
            resumen: true,
            inicio: true,
            fin: true,
            cita: {
              select: {
                cliente_id: true,
                jardin_id: true,
                precio_aplicado: true,
                servicio: {
                  select: {
                    nombre: true,
                    duracion_minutos: true
                  }
                },
                usuario_cita_cliente_idTousuario: {
                  select: {
                    nombre: true,
                    email: true
                  }
                },
                jardin: {
                  select: {
                    direccion: {
                      select: {
                        calle: true,
                        comuna: {
                          select: {
                            nombre: true,
                            region: {
                              select: {
                                nombre: true
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!portfolioItem) {
      return res.status(404).json({ error: 'Trabajo no encontrado' });
    }

    // Calcular duración si hay fechas de inicio y fin
    let duracionTexto = null;
    if (portfolioItem.visita?.inicio && portfolioItem.visita?.fin) {
      const duracion = new Date(portfolioItem.visita.fin).getTime() - new Date(portfolioItem.visita.inicio).getTime();
      const horas = Math.floor(duracion / (1000 * 60 * 60));
      const minutos = Math.floor((duracion % (1000 * 60 * 60)) / (1000 * 60));
      duracionTexto = `${horas}h ${minutos}min`;
    }

    // Formatear datos para el frontend
    const trabajoDetalle = {
      id: Number(portfolioItem.id),
      titulo: portfolioItem.titulo,
      descripcion: portfolioItem.descripcion || 'Proyecto realizado con dedicación y profesionalismo.',
      imagenUrl: portfolioItem.imagen?.url_publica || '/images/placeholder-portfolio.jpg',
      fecha: portfolioItem.publicado_en?.toISOString().split('T')[0] || portfolioItem.creado_en.toISOString().split('T')[0],
      servicio: portfolioItem.visita?.cita?.servicio?.nombre || 'Servicio general',
      cliente: portfolioItem.visita?.cita?.usuario_cita_cliente_idTousuario?.nombre || null,
      ubicacion: portfolioItem.visita?.cita?.jardin?.direccion ? 
        `${portfolioItem.visita.cita.jardin.direccion.comuna?.nombre}, ${portfolioItem.visita.cita.jardin.direccion.comuna?.region?.nombre}` : null,
      duracion: duracionTexto,
      precio: portfolioItem.visita?.cita?.precio_aplicado ? Number(portfolioItem.visita.cita.precio_aplicado) : null,
      galeria: portfolioItem.portafolio_imagen?.map(img => img.imagen.url_publica).filter(Boolean) || [],
      // Agregar testimonial si hay resumen de la visita
      testimonial: portfolioItem.visita?.resumen ? {
        texto: portfolioItem.visita.resumen,
        autor: portfolioItem.visita.cita?.usuario_cita_cliente_idTousuario?.nombre || 'Cliente satisfecho'
      } : null
    };

    res.json(toJSONSafe(trabajoDetalle));
  } catch (err: any) {
    console.error("❌ Error al obtener trabajo del portfolio:", err);
    res.status(500).json({ error: err.message ?? 'Error al obtener trabajo' });
  }
});

// Obtener servicios activos
app.get('/servicios', async (req, res) => {
  try {
    const servicios = await prisma.servicio.findMany({
      where: { 
        activo: true 
      },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        duracion_minutos: true,
        precio_clp: true,
        imagen: {
          select: {
            url_publica: true,
            clave_storage: true
          }
        }
      },
      orderBy: { 
        nombre: 'asc' 
      }
    });

    // Transformar los datos para el frontend
    const serviciosFormatted = servicios.map(servicio => ({
      id: String(servicio.id),
      title: servicio.nombre,
      description: servicio.descripcion || 'Servicio profesional de calidad.',
      imageUrl: servicio.imagen?.url_publica || '/images/placeholder-service.jpg',
      duracion: servicio.duracion_minutos || 0,
      precio: servicio.precio_clp ? Number(servicio.precio_clp) : null
    }));

    res.json(toJSONSafe(serviciosFormatted));
  } catch (err: any) {
    console.error("❌ Error al obtener servicios:", err);
    res.status(500).json({ error: err.message ?? 'Error al obtener servicios' });
  }
});

// Obtener todos los servicios para admin (incluye inactivos)
app.get('/admin/servicios', async (req, res) => {
  try {
    const servicios = await prisma.servicio.findMany({
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        duracion_minutos: true,
        precio_clp: true,
        activo: true,
        fecha_creacion: true,
        fecha_actualizacion: true,
        imagen: {
          select: {
            url_publica: true,
            clave_storage: true
          }
        }
      },
      orderBy: { 
        nombre: 'asc' 
      }
    });

    // Formatear datos para el admin
    const serviciosFormatted = servicios.map(servicio => ({
      id: Number(servicio.id),
      nombre: servicio.nombre,
      descripcion: servicio.descripcion || '',
      duracion: servicio.duracion_minutos || 0,
      precio: servicio.precio_clp ? Number(servicio.precio_clp) : 0,
      activo: servicio.activo,
      fechaCreacion: servicio.fecha_creacion,
      fechaActualizacion: servicio.fecha_actualizacion,
      imagenUrl: servicio.imagen?.url_publica || null
    }));

    res.json(toJSONSafe(serviciosFormatted));
  } catch (err: any) {
    console.error("❌ Error al obtener servicios admin:", err);
    res.status(500).json({ error: err.message ?? 'Error al obtener servicios' });
  }
});

// Crear nuevo servicio (admin)
app.post('/admin/servicios', async (req, res) => {
  try {
    const { nombre, descripcion, duracion_minutos, precio_clp, imagen_url, activo } = req.body;

    // Validaciones básicas
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ error: 'El nombre del servicio es requerido' });
    }

    if (!duracion_minutos || duracion_minutos <= 0) {
      return res.status(400).json({ error: 'La duración debe ser mayor a 0' });
    }

    if (!precio_clp || precio_clp <= 0) {
      return res.status(400).json({ error: 'El precio debe ser mayor a 0' });
    }

    // Verificar si ya existe un servicio con el mismo nombre
    const servicioExistente = await prisma.servicio.findUnique({
      where: { nombre: nombre.trim() }
    });

    if (servicioExistente) {
      return res.status(400).json({ error: 'Ya existe un servicio con ese nombre' });
    }

    // Crear el servicio
    let imagen_id = null;
    
    // Si hay URL de imagen, crear registro en tabla imagen
    if (imagen_url) {
      const nuevaImagen = await prisma.imagen.create({
        data: {
          tipo: 'servicio',
          clave_storage: `servicios/${Date.now()}-${nombre.trim().replace(/\s+/g, '-')}`,
          url_publica: imagen_url,
          tipo_contenido: 'image/jpeg' // Asumimos JPEG por defecto
        }
      });
      imagen_id = nuevaImagen.id;
    }

    const nuevoServicio = await prisma.servicio.create({
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        duracion_minutos: parseInt(duracion_minutos),
        precio_clp: parseFloat(precio_clp),
        imagen_id: imagen_id, // Asociar imagen si existe
        activo: activo !== false // por defecto true
      }
    });

    console.log("✅ Servicio creado:", nuevoServicio.nombre);

    res.status(201).json({
      message: 'Servicio creado exitosamente',
      servicio: {
        id: Number(nuevoServicio.id),
        nombre: nuevoServicio.nombre,
        descripcion: nuevoServicio.descripcion,
        duracion: nuevoServicio.duracion_minutos,
        precio: Number(nuevoServicio.precio_clp),
        activo: nuevoServicio.activo
      }
    });

  } catch (err: any) {
    console.error("❌ Error al crear servicio:", err);
    res.status(500).json({ error: err.message ?? 'Error al crear el servicio' });
  }
});

// Registrar un nuevo usuario
// - Valida inputs mínimos
// - Verifica que el email no exista
// - Hashea la contraseña con bcryptjs (12 rondas)
// - Crea el registro en la tabla `usuario`
// Registrar un nuevo usuario
app.post("/usuario", async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      email,
      password,
      confpassword,
      telefono,
      direccion,
      comunaId,
      terminos,
    } = req.body ?? {};

    // ===== Validaciones básicas =====
    if (!nombre?.trim()) return res.status(400).json({ error: "El nombre es requerido" });
    if (!apellido?.trim()) return res.status(400).json({ error: "El apellido es requerido" });
    if (!email?.trim()) return res.status(400).json({ error: "El email es requerido" });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: "Formato de email inválido" });

    if (!password?.trim() || password.length < 8)
      return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });

    if (password !== confpassword)
      return res.status(400).json({ error: "Las contraseñas no coinciden" });

    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({
        error:
          "La contraseña debe tener al menos 8 caracteres, incluir una mayúscula, una minúscula, un número y un carácter especial.",
      });
    }

    const telefonoRegex = /^\+569\d{8}$/;
    if (!telefono || !telefonoRegex.test(telefono))
      return res.status(400).json({ error: "Número de teléfono no válido (+569XXXXXXXX)" });

    if (!direccion?.trim()) return res.status(400).json({ error: "La dirección es requerida" });

    if (!comunaId || isNaN(Number(comunaId)))
      return res.status(400).json({ error: "La comuna seleccionada no es válida" });

    if (terminos !== true)
      return res.status(400).json({ error: "Debes aceptar los términos y condiciones" });

    // ===== Verificar si el email ya existe =====
    const existing = await prisma.usuario.findUnique({ where: { email } });

    // 🟩 NUEVO BLOQUE: manejar usuario inactivo con token expirado
    if (existing) {
      if (existing.activo) {
        // Usuario activo → no se puede registrar otra vez
        return res.status(409).json({ error: "El email ya está registrado" });
      } else {
        // Usuario inactivo → revisar si el token expiró
        const tokenData = await prisma.confirm_token.findFirst({
          where: { userId: existing.id },
        });

        // Si no hay token o el token expiró → eliminar usuario, token y dirección
        if (!tokenData || tokenData.expiresAt < new Date()) {
          await prisma.confirm_token.deleteMany({ where: { userId: existing.id } });
          await prisma.direccion.deleteMany({ where: { usuario_id: existing.id } });
          await prisma.usuario.delete({ where: { id: existing.id } });
          console.log(`🗑️ Usuario inactivo eliminado: ${existing.email}`);
        } else {
          // Token aún válido → impedir registro duplicado
          return res
            .status(409)
            .json({ error: "Ya existe una cuenta pendiente de activación." });
        }
      }
    }
    // 🟩 FIN BLOQUE NUEVO

    // ===== Crear usuario (inactivo) =====
    const contrasena_hash = await bcrypt.hash(password, 12);
    
    // Buscar el rol de cliente por defecto
    const rolCliente = await prisma.rol.findFirst({
      where: { codigo: 'cliente' }
    });
    
    if (!rolCliente) {
      return res.status(500).json({ error: 'Rol de cliente no encontrado en la base de datos' });
    }

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre,
        apellido,
        email,
        telefono,
        contrasena_hash,
        rol_id: rolCliente.id, 
        activo: false, 
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        telefono: true,
        activo: true,
      },
    });

    // ===== Crear dirección =====
    await prisma.direccion.create({
      data: {
        calle: direccion,
        usuario: { connect: { id: nuevoUsuario.id } },
        comuna: { connect: { id: Number(comunaId) } },
      },
    });

    // ===== Generar token de confirmación =====
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 15 * 60 * 1000); // expira en 15 minutos

    await prisma.confirm_token.create({
      data: { userId: nuevoUsuario.id, token, expiresAt: expires },
    });

    // ✅ Responder primero
    res.status(201).json({
      message: "Usuario creado, revisa tu correo para confirmar la cuenta",
    });

    // 🚀 Enviar correo en segundo plano
    setImmediate(async () => {
      try {
        const confirmLink = `${process.env.FRONTEND_URL}/confirm-email?token=${token}`;
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: nuevoUsuario.email,
          subject: "Confirma tu cuenta",
          html: `
            <p>Bienvenido ${nuevoUsuario.nombre} ${nuevoUsuario.apellido}!</p>
            <p>Gracias por registrarte en <b>Clean & Garden</b>. Haz clic en el siguiente enlace para activar tu cuenta:</p>
            <p>${confirmLink}</p>
          `,
        });

        console.log("✅ Correo de confirmación enviado a:", nuevoUsuario.email);
      } catch (err) {
        console.error("⚠️ Error al enviar correo de confirmación:", err);
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error al registrar usuario" });
  }
});


//-------------------------------------------------------------------------------------
// Confirmar email
app.get("/confirm-email/:token", async (req, res) => {
  try {
    const { token } = req.params

    // Validar que el token no esté vacío
    if (!token || token.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: "Token requerido" 
      })
    }

    console.log("🔍 Buscando token:", token)

    // Buscar el token en la base de datos
    const confirm = await prisma.confirm_token.findUnique({ 
      where: { token },
      include: {
        usuario: {
          select: { id: true, email: true, activo: true }
        }
      }
    })

    console.log("📄 Token encontrado:", confirm ? "Sí" : "No")

    if (!confirm) {
      return res.status(400).json({ 
        success: false, 
        message: "Token no encontrado" 
      })
    }

    // Verificar si el token ha expirado
    const now = new Date()
    if (confirm.expiresAt < now) {
      console.log("⏰ Token expirado:", confirm.expiresAt, "vs", now)
      return res.status(400).json({ 
        success: false, 
        message: "Token expirado" 
      })
    }

    // Verificar si el usuario ya está activo
    if (confirm.usuario.activo) {
      return res.status(400).json({ 
        success: false, 
        message: "La cuenta ya está activada" 
      })
    }

    console.log("✅ Activando usuario ID:", confirm.userId)

    // Activar usuario - usar BigInt directamente sin conversión
    await prisma.usuario.update({
      where: { id: confirm.userId },
      data: { activo: true },
    })

    // Eliminar token usado
    await prisma.confirm_token.delete({ where: { id: confirm.id } })

    console.log("🎉 Usuario activado exitosamente:", confirm.usuario.email)

    return res.json({ 
      success: true, 
      message: "✅ Cuenta activada correctamente" 
    })
  } catch (err: any) {
    console.error("❌ Error al confirmar cuenta:", err)
    res.status(500).json({ 
      success: false, 
      message: "Error interno del servidor al confirmar cuenta",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    })
  }
})

//----------------------------------------------------------------------------------

// =======================================
// 🔐 LOGIN (autenticación con JWT seguro)
// =======================================
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

    const passwordMatch = await bcrypt.compare(password, usuario.contrasena_hash);
    if (!passwordMatch) return res.status(401).json({ error: "Contraseña incorrecta" });

    if (!usuario.activo)
      return res.status(403).json({ error: "Debes confirmar tu cuenta antes de iniciar sesión." });

    // ✅ Generar token JWT
    const token = generateToken({
      id: Number(usuario.id), // 👈 conversión segura
      nombre: usuario.nombre,
      email: usuario.email,
    });

    // ✅ Enviar cookie segura
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,      // 👈 en desarrollo debe ser false
      sameSite: "lax",
      maxAge: 60 * 60 * 1000,
    });


    // ✅ Respuesta al frontend
    res.status(200).json({
      message: "✅ Login exitoso",
      user: toJSONSafe({
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
      }),
    });
  } catch (e) {
    console.error("Error en /login:", e);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

//------------------------------------------------------------------------------------------
app.put("/change-password", authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body ?? {};
    const userId = (req as any).user.id; // ID obtenido del token JWT

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    // Validar nueva contraseña segura
    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
    if (!strongPasswordRegex.test(newPassword)) {
      return res.status(400).json({
        error:
          "La nueva contraseña debe tener al menos 8 caracteres, incluir una mayúscula, una minúscula, un número y un carácter especial.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Las contraseñas nuevas no coinciden" });
    }

    // Buscar usuario por ID
    const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

    // Comparar contraseña actual
    const isMatch = await bcrypt.compare(oldPassword, usuario.contrasena_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "La contraseña actual es incorrecta" });
    }

    // Hashear nueva contraseña y guardar
    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.usuario.update({
      where: { id: userId },
      data: { contrasena_hash: newHash },
    });

    // Opcional: invalidar token anterior (obliga a iniciar sesión de nuevo)
    res.clearCookie("token");

    return res.status(200).json({ message: "✅ Contraseña actualizada correctamente" });
  } catch (err) {
    console.error("Error en /change-password:", err);
    return res.status(500).json({ error: "Error al cambiar la contraseña" });
  }
});

//-------------------------------------------------------------------------------------------------


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
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
    // Guardar token en la tabla reset_token
    await prisma.reset_token.create({
      data: { userId: user.id, token, expiresAt: expires },
    });

    // Verificar variables de entorno
    console.log("🔍 EMAIL_USER:", process.env.EMAIL_USER ? "✅ Configurado" : "❌ Falta");
    console.log("🔍 EMAIL_PASS:", process.env.EMAIL_PASS ? "✅ Configurado" : "❌ Falta");
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(500).json({ 
        error: "Configuración de email incompleta",
        details: "EMAIL_USER o EMAIL_PASS no están configurados"
      });
    }

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
    console.error("❌ Error en forgot-password:", error);
    
    // Más detalles del error
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    
    res.status(500).json({ 
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido"
    });
  }
});
//---------------------------------------------------------------------------------
app.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    // ===== Validar campos =====
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Faltan datos requeridos" });
    }

    // ✅ Validar complejidad de la contraseña
    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;

    if (!strongPasswordRegex.test(newPassword)) {
      return res.status(400).json({
        message:
          "La contraseña debe tener al menos 8 caracteres, incluir una mayúscula, una minúscula, un número y un carácter especial.",
      });
    }

    // ===== Buscar token =====
    const reset = await prisma.reset_token.findUnique({ where: { token } });

    if (!reset || reset.expiresAt < new Date()) {
      return res.status(400).json({ message: "Token inválido o expirado" });
    }

    // ===== Hashear nueva contraseña =====
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.usuario.update({
      where: { id: reset.userId },
      data: { contrasena_hash: hashedPassword },
    });

    // ===== Eliminar token usado =====
    await prisma.reset_token.delete({ where: { id: reset.id } });

    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ==========================================

// =======================================
// 🚪 LOGOUT
// =======================================
app.post("/logout", (_req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  res.json({ message: "Sesión cerrada correctamente" });
});
// =======================================
// 🧍 PERFIL (ruta protegida con token)
// =======================================
// Endpoint protegido: solo accesible si el usuario tiene cookie JWT válida
app.get("/profile", authMiddleware, async (req, res) => {
  try {
    const userData = (req as any).user;

    const usuario = await prisma.usuario.findUnique({
      where: { id: BigInt(userData.id) },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        telefono: true,
        direccion: {
          select: {
            id: true,
            calle: true,
            comuna: {
              select: {
                nombre: true,
                region: {
                  select: { nombre: true },
                },
              },
            },
          },
        },
      },
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({
      message: "Perfil obtenido correctamente ✅",
      user: toJSONSafe(usuario),
    });

  } catch (err) {
    console.error("Error en /profile:", err);
    res.status(500).json({ error: "Error al obtener perfil" });
  }
});

app.put("/profile", authMiddleware, async (req, res) => {
  try {
    const userData = (req as any).user;
    const { nombre, apellido, telefono, direcciones } = req.body;

    // ✅ Actualizar datos básicos del usuario
    await prisma.usuario.update({
      where: { id: BigInt(userData.id) },
      data: { nombre, apellido, telefono },
    });

    if (Array.isArray(direcciones)) {
      for (const dir of direcciones) {
        // 🗑️ Si el usuario marcó una dirección para eliminar
        if (dir._delete && dir.id) {
          await prisma.direccion.delete({ where: { id: BigInt(dir.id) } });
          continue;
        }

        // 🆕 Si no tiene id, se crea una nueva
        if (!dir.id) {
          const comuna = await prisma.comuna.findFirst({
            where: { nombre: dir.comuna },
            include: { region: true },
          });
          if (!comuna) continue;

          await prisma.direccion.create({
            data: {
              calle: dir.calle,
              usuario_id: BigInt(userData.id),
              comuna_id: comuna.id,
            },
          });
        } else {
          // ✏️ Si tiene id, se actualiza
          await prisma.direccion.update({
            where: { id: BigInt(dir.id) },
            data: {
              calle: dir.calle,
            },
          });
        }
      }
    }

    res.json({ message: "Perfil actualizado correctamente ✅" });
  } catch (err) {
    console.error("Error en PUT /profile:", err);
    res.status(500).json({ error: "Error al actualizar perfil" });
  }
});











// Verificar variables de entorno al inicio
console.log("🔧 Verificando configuración...");
console.log("📧 EMAIL_USER:", process.env.EMAIL_USER ? "✅ Configurado" : "❌ Falta");
console.log("🔑 EMAIL_PASS:", process.env.EMAIL_PASS ? "✅ Configurado" : "❌ Falta");
console.log("🌐 FRONTEND_URL:", process.env.FRONTEND_URL || "❌ Falta");
console.log("💾 DATABASE_URL:", process.env.DATABASE_URL ? "✅ Configurado" : "❌ Falta");

// Leemos el puerto desde las variables de entorno; si no, usamos 3001 por defecto
// Convierte a Number y arranca el servidor
const port = Number(process.env.PORT ?? 3001)
app.listen(port, () => console.log(`🚀 API backend listening on port ${port}`))

// 🧹 Limpieza automática de tokens expirados (confirmación + recuperación)
setInterval(async () => {
  try {
    const now = new Date();

    const deletedConfirm = await prisma.confirm_token.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    const deletedReset = await prisma.reset_token.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    const total = deletedConfirm.count + deletedReset.count;
    if (total > 0) {
      console.log(
        `🧹 Tokens expirados eliminados: ${total} (confirm: ${deletedConfirm.count}, reset: ${deletedReset.count})`
      );
    }
  } catch (err) {
    console.error("⚠️ Error limpiando tokens expirados:", err);
  }
}, 5 * 60 * 1000); // cada 5 minutos



