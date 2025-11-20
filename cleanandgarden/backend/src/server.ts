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

// Integrar WebSocket con Express
import { createServer } from 'http';
import { ChatWebSocket } from './lib/websocket';

// Importación de librería webpay
import { WebpayPlus, Options, Environment } from "transbank-sdk";

// Importar funciones de recordatorios de citas
import { enviarRecordatorios24Horas, enviarRecordatorios2Horas } from './lib/notificationScheduler';
import cron from 'node-cron';

// Importar sistema de notificaciones de citas y pagos
import { 
  notificarCitaCreada, 
  notificarCitaCancelada, 
  notificarCambioCita,
  notificarCambioPago 
} from './lib/citaNotifications';

// Importar funciones de push notifications
import { enviarNotificacionPush } from './lib/pushNotification';



declare global {
  // eslint-disable-next-line no-var
  var chatWebSocketInstance: import('./lib/websocket').ChatWebSocket | undefined;
}

// Creamos la app de Express (hay que pensarlo como el "router" principal de la API)


const app = express();

// ==========================================
// CONFIGURACIÓN CORS (Railway + Vercel + Local + Mobile)
// ==========================================
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:19006",
  "exp://127.0.0.1:19000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Mobile apps (React Native/Expo) often don't send an origin header
      if (!origin) return callback(null, true);

      // Permite localhost, Expo y cualquier dominio *.vercel.app
      const isLocalOrExpo = allowedOrigins.includes(origin);
      const isVercelDomain = /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin);

      if (isLocalOrExpo || isVercelDomain) {
        callback(null, true);
      } else {
        console.warn(`CORS bloqueado para origen no permitido: ${origin}`);
        callback(new Error("No autorizado por CORS"));
      }
    },
    credentials: true,
  })
);





app.use(express.json());
app.use(cookieParser());

// ==========================================
//  WEBPAY - SANDBOX CONFIG (SDK v6.1.0)
// ==========================================

const webpayTx = new WebpayPlus.Transaction(
  new Options(
    process.env.WEBPAY_COMMERCE || "597055555532",
    process.env.WEBPAY_API_KEY || "579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C",
    Environment.Integration
  )
);



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
    console.error(" Token inválido o expirado:", err);
    return res.status(403).json({ error: "Token inválido o expirado" });
  }
}

// Helper para serializar BigInt y Decimal en JSON (Prisma puede devolver BigInt y Decimal)
// Técnico: JSON.stringify no soporta BigInt ni Decimal; convertimos a Number de forma segura.
// Común: esto evita errores raros cuando mandamos datos numéricos al front.
function toJSONSafe<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_k, v) => {
      if (typeof v === 'bigint') return Number(v);
      // Convertir Decimal de Prisma a number
      if (v && typeof v === 'object' && v.constructor && v.constructor.name === 'Decimal') {
        return Number(v.toString());
      }
      return v;
    })
  )
}

// ==========================================
//  JWT CONFIG
// ==========================================
const JWT_SECRET = process.env.JWT_SECRET || "clave_por_defecto";

// Genera un token (expira en 1 hora)
function generateToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
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

   
    res.json(toJSONSafe(regiones)); // convierte BigInt a Number
  } catch (err: any) {
    console.error("Error en /regiones:", err);
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

    res.json(toJSONSafe(comunas)); // convierte BigInt a Number
  } catch (err: any) {
    console.error(" Error al obtener comunas:", err);
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
    console.error(" Error al obtener portfolio:", err);
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
    console.error(" Error al obtener trabajo del portfolio:", err);
    res.status(500).json({ error: err.message ?? 'Error al obtener trabajo' });
  }
});

// Obtener todos los trabajos del portafolio para admin (incluye borradores)
app.get('/admin/portfolio', async (req, res) => {
  try {
    const portfolioItems = await prisma.portafolio_item.findMany({
      select: {
        id: true,
        titulo: true,
        descripcion: true,
        publicado: true,
        publicado_en: true,
        creado_en: true,
        actualizado_en: true,
        imagen: {
          select: {
            url_publica: true,
            clave_storage: true
          }
        }
      },
      orderBy: { 
        creado_en: 'desc' 
      }
    });

    // Formatear datos para el admin
    const portfolioFormatted = portfolioItems.map(item => ({
      id: Number(item.id),
      titulo: item.titulo,
      descripcion: item.descripcion || '',
      publicado: item.publicado,
      imagenUrl: item.imagen?.url_publica || '/images/placeholder-portfolio.jpg',
      fechaCreacion: item.creado_en,
      fechaActualizacion: item.actualizado_en
    }));

    res.json(toJSONSafe(portfolioFormatted));
  } catch (err: any) {
    console.error(" Error al obtener portfolio admin:", err);
    res.status(500).json({ error: err.message ?? 'Error al obtener portfolio' });
  }
});

// Crear nuevo trabajo del portafolio (admin)
app.post('/admin/portfolio', async (req, res) => {
  try {
    const { titulo, descripcion, publicado, imagen_url } = req.body;

    // Validaciones básicas
    if (!titulo || titulo.trim() === '') {
      return res.status(400).json({ error: 'El título es requerido' });
    }

    if (!descripcion || descripcion.trim() === '') {
      return res.status(400).json({ error: 'La descripción es requerida' });
    }

    // Crear el trabajo del portafolio
    let imagen_id = null;
    
    // Si hay URL de imagen, crear registro en tabla imagen
    if (imagen_url) {
      const nuevaImagen = await prisma.imagen.create({
        data: {
          tipo: 'portafolio',
          clave_storage: `portfolio/${Date.now()}-${titulo.trim().replace(/\s+/g, '-')}`,
          url_publica: imagen_url,
          tipo_contenido: 'image/jpeg'
        }
      });
      imagen_id = nuevaImagen.id;
    }

    const nuevoTrabajo = await prisma.portafolio_item.create({
      data: {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        imagen_principal_id: imagen_id,
        publicado: publicado === true,
        publicado_en: publicado === true ? new Date() : null
      },
      include: {
        imagen: true
      }
    });

    console.log("Trabajo del portafolio creado:", nuevoTrabajo.titulo);

    res.status(201).json({
      message: 'Trabajo creado exitosamente',
      trabajo: {
        id: Number(nuevoTrabajo.id),
        titulo: nuevoTrabajo.titulo,
        descripcion: nuevoTrabajo.descripcion,
        publicado: nuevoTrabajo.publicado,
        imagenUrl: nuevoTrabajo.imagen?.url_publica || null
      }
    });

  } catch (err: any) {
    console.error(" Error al crear trabajo del portafolio:", err);
    res.status(500).json({ error: err.message ?? 'Error al crear el trabajo' });
  }
});

// Actualizar trabajo del portafolio (admin)
app.put('/admin/portfolio/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, publicado, imagen_url } = req.body;

    const portfolioId = parseInt(id);
    if (isNaN(portfolioId)) {
      return res.status(400).json({ error: 'ID de trabajo inválido' });
    }

    // Validaciones básicas
    if (!titulo || titulo.trim() === '') {
      return res.status(400).json({ error: 'El título es requerido' });
    }

    if (!descripcion || descripcion.trim() === '') {
      return res.status(400).json({ error: 'La descripción es requerida' });
    }

    // Verificar que el trabajo exista
    const trabajoExistente = await prisma.portafolio_item.findUnique({
      where: { id: portfolioId },
      include: { imagen: true }
    });

    if (!trabajoExistente) {
      return res.status(404).json({ error: 'Trabajo no encontrado' });
    }

    // Manejar imagen
    let imagen_id = trabajoExistente.imagen_principal_id;
    
    // Si hay nueva URL de imagen, actualizar o crear registro
    if (imagen_url && imagen_url !== trabajoExistente.imagen?.url_publica) {
      // Si ya tenía una imagen, actualizarla
      if (trabajoExistente.imagen_principal_id) {
        await prisma.imagen.update({
          where: { id: trabajoExistente.imagen_principal_id },
          data: {
            url_publica: imagen_url,
            clave_storage: `portfolio/${Date.now()}-${titulo.trim().replace(/\s+/g, '-')}`,
          }
        });
      } else {
        // Si no tenía imagen, crear una nueva
        const nuevaImagen = await prisma.imagen.create({
          data: {
            tipo: 'portafolio',
            clave_storage: `portfolio/${Date.now()}-${titulo.trim().replace(/\s+/g, '-')}`,
            url_publica: imagen_url,
            tipo_contenido: 'image/jpeg'
          }
        });
        imagen_id = nuevaImagen.id;
      }
    } else if (!imagen_url && trabajoExistente.imagen_principal_id) {
      // Si se eliminó la imagen, eliminar el registro
      await prisma.imagen.delete({
        where: { id: trabajoExistente.imagen_principal_id }
      });
      imagen_id = null;
    }

    // Actualizar el trabajo
    const trabajoActualizado = await prisma.portafolio_item.update({
      where: { id: portfolioId },
      data: {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        imagen_principal_id: imagen_id,
        publicado: publicado === true,
        publicado_en: publicado === true ? new Date() : null,
        actualizado_en: new Date()
      },
      include: { imagen: true }
    });

    console.log("Trabajo actualizado:", trabajoActualizado.titulo);

    res.json({
      message: 'Trabajo actualizado exitosamente',
      trabajo: {
        id: Number(trabajoActualizado.id),
        titulo: trabajoActualizado.titulo,
        descripcion: trabajoActualizado.descripcion,
        publicado: trabajoActualizado.publicado,
        imagenUrl: trabajoActualizado.imagen?.url_publica || null
      }
    });

  } catch (err: any) {
    console.error("Error al actualizar trabajo:", err);
    res.status(500).json({ error: err.message ?? 'Error al actualizar el trabajo' });
  }
});

// Publicar/Despublicar trabajo del portafolio (admin)
app.patch('/admin/portfolio/:id/toggle-publish', async (req, res) => {
  try {
    const { id } = req.params;

    const portfolioId = parseInt(id);
    if (isNaN(portfolioId)) {
      return res.status(400).json({ error: 'ID de trabajo inválido' });
    }

    // Verificar que el trabajo exista
    const trabajoExistente = await prisma.portafolio_item.findUnique({
      where: { id: portfolioId }
    });

    if (!trabajoExistente) {
      return res.status(404).json({ error: 'Trabajo no encontrado' });
    }

    // Alternar el estado de publicación
    const nuevoEstado = !trabajoExistente.publicado;
    
    const trabajoActualizado = await prisma.portafolio_item.update({
      where: { id: portfolioId },
      data: {
        publicado: nuevoEstado,
        publicado_en: nuevoEstado ? new Date() : null,
        actualizado_en: new Date()
      }
    });

    console.log(`Trabajo ${nuevoEstado ? 'publicado' : 'despublicado'}:`, trabajoActualizado.titulo);

    res.json({
      message: `Trabajo ${nuevoEstado ? 'publicado' : 'despublicado'} exitosamente`,
      trabajo: {
        id: Number(trabajoActualizado.id),
        titulo: trabajoActualizado.titulo,
        publicado: trabajoActualizado.publicado
      }
    });

  } catch (err: any) {
    console.error("Error al cambiar estado de publicación:", err);
    res.status(500).json({ error: err.message ?? 'Error al cambiar estado de publicación' });
  }
});

//falta el eliminar  portafolio

// Obtener servicios activos
app.get('/servicios', async (req, res) => {
  const servicios = await prisma.servicio.findMany({
    where: { activo: true },
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      duracion_minutos: true,
      precio_clp: true,
      imagen: { select: { url_publica: true } }
    }
  });

  const serviciosFormatted = servicios.map(s => ({
    id: Number(s.id),
    nombre: s.nombre,
    descripcion: s.descripcion,
    duracion: s.duracion_minutos || 0, 
    precio: s.precio_clp ? Number(s.precio_clp) : 0, 
    imagenUrl: s.imagen?.url_publica || null, 
    activo: true
  }));

  res.json(toJSONSafe(serviciosFormatted));
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
    console.error(" Error al obtener servicios admin:", err);
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

    console.log("Servicio creado:", nuevoServicio.nombre);

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
    console.error(" Error al crear servicio:", err);
    res.status(500).json({ error: err.message ?? 'Error al crear el servicio' });
  }
});

// Eliminar servicio (admin)
app.delete('/admin/servicios/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validar que el ID sea un número válido
    const servicioId = parseInt(id);
    if (isNaN(servicioId)) {
      return res.status(400).json({ error: 'ID de servicio inválido' });
    }

    // Verificar que el servicio exista
    const servicioExistente = await prisma.servicio.findUnique({
      where: { id: servicioId },
      include: { imagen: true }
    });

    if (!servicioExistente) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    // Si el servicio tiene imagen asociada, también eliminarla
    if (servicioExistente.imagen_id) {
      await prisma.imagen.delete({
        where: { id: servicioExistente.imagen_id }
      });
    }

    // Eliminar el servicio
    await prisma.servicio.delete({
      where: { id: servicioId }
    });

    console.log(` Servicio eliminado: ${servicioExistente.nombre} (ID: ${servicioId})`);

    res.json({
      message: 'Servicio eliminado exitosamente',
      servicio: {
        id: servicioId,
        nombre: servicioExistente.nombre
      }
    });

  } catch (err: any) {
    console.error("Error al eliminar servicio:", err);
    res.status(500).json({ error: err.message ?? 'Error al eliminar el servicio' });
  }
});

// Actualizar servicio (admin)
app.put('/admin/servicios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, duracion_minutos, precio_clp, imagen_url, activo } = req.body;

    // Validar que el ID sea un número válido
    const servicioId = parseInt(id);
    if (isNaN(servicioId)) {
      return res.status(400).json({ error: 'ID de servicio inválido' });
    }

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

    // Verificar que el servicio exista
    const servicioExistente = await prisma.servicio.findUnique({
      where: { id: servicioId },
      include: { imagen: true }
    });

    if (!servicioExistente) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    // Verificar si ya existe otro servicio con el mismo nombre (excluyendo el actual)
    const servicioConMismoNombre = await prisma.servicio.findFirst({
      where: { 
        nombre: nombre.trim(),
        id: { not: servicioId }
      }
    });

    if (servicioConMismoNombre) {
      return res.status(400).json({ error: 'Ya existe otro servicio con ese nombre' });
    }

    // Manejar imagen
    let imagen_id = servicioExistente.imagen_id;
    
    // Si hay nueva URL de imagen, actualizar o crear registro
    if (imagen_url && imagen_url !== servicioExistente.imagen?.url_publica) {
      // Si ya tenía una imagen, actualizarla
      if (servicioExistente.imagen_id) {
        await prisma.imagen.update({
          where: { id: servicioExistente.imagen_id },
          data: {
            url_publica: imagen_url,
            clave_storage: `servicios/${Date.now()}-${nombre.trim().replace(/\s+/g, '-')}`,
          }
        });
      } else {
        // Si no tenía imagen, crear una nueva
        const nuevaImagen = await prisma.imagen.create({
          data: {
            tipo: 'servicio',
            clave_storage: `servicios/${Date.now()}-${nombre.trim().replace(/\s+/g, '-')}`,
            url_publica: imagen_url,
            tipo_contenido: 'image/jpeg'
          }
        });
        imagen_id = nuevaImagen.id;
      }
    } else if (!imagen_url && servicioExistente.imagen_id) {
      // Si se eliminó la imagen, eliminar el registro
      await prisma.imagen.delete({
        where: { id: servicioExistente.imagen_id }
      });
      imagen_id = null;
    }

    // Actualizar el servicio
    const servicioActualizado = await prisma.servicio.update({
      where: { id: servicioId },
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        duracion_minutos: parseInt(duracion_minutos),
        precio_clp: parseFloat(precio_clp),
        imagen_id: imagen_id,
        activo: activo !== false // por defecto true
      },
      include: { imagen: true }
    });

    console.log("Servicio actualizado:", servicioActualizado.nombre);

    res.json({
      message: 'Servicio actualizado exitosamente',
      servicio: {
        id: Number(servicioActualizado.id),
        nombre: servicioActualizado.nombre,
        descripcion: servicioActualizado.descripcion,
        duracion: servicioActualizado.duracion_minutos,
        precio: Number(servicioActualizado.precio_clp),
        activo: servicioActualizado.activo,
        imagenUrl: servicioActualizado.imagen?.url_publica || null
      }
    });

  } catch (err: any) {
    console.error("Error al actualizar servicio:", err);
    res.status(500).json({ error: err.message ?? 'Error al actualizar el servicio' });
  }
});

// Registrar un nuevo usuario
// - Valida inputs mínimos
// - Verifica que el email no exista
// - Hashea la contraseña con bcryptjs (12 rondas)
// - Crea el registro en la tabla `usuario`
// Registrar un nuevo usuario
// -------------------------------------------------------------------------------------
// REGISTRO DE CLIENTE (con rol automático)
// -------------------------------------------------------------------------------------
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

    // ===== Validaciones =====
    if (!nombre?.trim()) return res.status(400).json({ error: "El nombre es requerido" });
    if (!apellido?.trim()) return res.status(400).json({ error: "El apellido es requerido" });
    if (!email?.trim()) return res.status(400).json({ error: "El email es requerido" });
    if (!password?.trim() || password.length < 8)
      return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
    if (password !== confpassword)
      return res.status(400).json({ error: "Las contraseñas no coinciden" });
    if (!telefono?.match(/^\+569\d{8}$/))
      return res.status(400).json({ error: "Número de teléfono no válido (+569XXXXXXXX)" });
    if (!direccion?.trim()) return res.status(400).json({ error: "La dirección es requerida" });
    if (!comunaId || isNaN(Number(comunaId)))
      return res.status(400).json({ error: "La comuna seleccionada no es válida" });
    if (terminos !== true)
      return res.status(400).json({ error: "Debes aceptar los términos y condiciones" });

    // ===== Verificar si el email ya existe =====
    const existing = await prisma.usuario.findUnique({ where: { email } });

    if (existing) {
      if (existing.activo) {
        return res.status(409).json({ error: "El email ya está registrado" });
      } else {
        const tokenData = await prisma.confirm_token.findFirst({
          where: { userId: existing.id },
        });
        if (!tokenData || tokenData.expiresAt < new Date()) {
          await prisma.confirm_token.deleteMany({ where: { userId: existing.id } });
          await prisma.direccion.deleteMany({ where: { usuario_id: existing.id } });
          await prisma.usuario.delete({ where: { id: existing.id } });
        } else {
          return res.status(409).json({
            error: "Ya existe una cuenta pendiente de activación.",
          });
        }
      }
    }

    // ===== Buscar rol 'cliente' =====
    const rolCliente = await prisma.rol.findUnique({
      where: { codigo: "cliente" },
    });

    if (!rolCliente)
      return res.status(500).json({ error: "No existe el rol 'cliente' en la base de datos" });

    // ===== Crear usuario (inactivo) con rol cliente =====
    const contrasena_hash = await bcrypt.hash(password, 12);
    
    // (Ya se buscó el rol 'cliente' arriba con findUnique)

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre,
        apellido,
        email,
        telefono,
        contrasena_hash,
        activo: false,
        rol: { connect: { id: rolCliente.id } }, // asigna rol cliente
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        telefono: true,
        activo: true,
        rol: { select: { codigo: true, nombre: true } },
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
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
    await prisma.confirm_token.create({
      data: { userId: nuevoUsuario.id, token, expiresAt: expires },
    });

    res.status(201).json({
      message: "Usuario creado. Revisa tu correo para confirmar la cuenta.",
    });

    // ===== Enviar correo de confirmación =====
    setImmediate(async () => {
      try {
        const confirmLink = `${process.env.FRONTEND_URL}/confirm-email?token=${token}`;
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: nuevoUsuario.email,
          subject: "Confirma tu cuenta en Clean & Garden",
          html: `
            <p>Hola ${nuevoUsuario.nombre},</p>
            <p>Gracias por registrarte en <b>Clean & Garden</b>.</p>
            <p>Haz clic en el siguiente enlace para confirmar tu cuenta:</p>
            <p><a href="${confirmLink}">${confirmLink}</a></p>
          `,
        });

        console.log("Correo enviado a:", nuevoUsuario.email);
      } catch (err) {
        console.error("Error al enviar correo:", err);
      }
    });
  } catch (err) {
    console.error("Error en /usuario:", err);
    return res.status(500).json({ error: "Error al registrar usuario" });
  }
});

//-------------------------------------------------------------------------------------
// Función para enviar correo de confirmación de reserva
async function enviarCorreoConfirmacionReserva(citaId: bigint) {
  try {
    // Obtener datos completos de la cita con todas las relaciones
    const cita = await prisma.cita.findUnique({
      where: { id: citaId },
      include: {
        servicio: { select: { id: true, nombre: true } },
        jardin: { select: { id: true, nombre: true } },
        usuario_cita_cliente_idTousuario: { select: { id: true, nombre: true, apellido: true, email: true } },
        usuario_cita_tecnico_idTousuario: { select: { id: true, nombre: true, apellido: true } },
      },
    }) as any;

    if (!cita || !cita.usuario_cita_cliente_idTousuario?.email) {
      console.error("No se pudo obtener datos de la cita o email del cliente");
      return;
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Formatear fecha y hora
    const fechaHora = new Date(cita.fecha_hora).toLocaleString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fefaf2; padding: 20px;">
        <div style="background: #2E5430; color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🌿 Clean & Garden</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Tu cita ha sido confirmada</p>
        </div>

        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #2E5430; margin-top: 0;">¡Hola ${cita.usuario_cita_cliente_idTousuario.nombre}!</h2>

          <p style="color: #666; line-height: 1.6;">
            Tu cita ha sido <strong>reservada exitosamente</strong>. Aquí tienes todos los detalles:
          </p>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2E5430;">
            <h3 style="margin-top: 0; color: #2E5430;">📅 Detalles de tu cita</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #2E5430;">Servicio:</td>
                <td style="padding: 8px 0;">${cita.servicio?.nombre || 'Servicio'}</td>
              </tr>
              <tr style="background: #f0f0f0;">
                <td style="padding: 8px 0; font-weight: bold; color: #2E5430;">Fecha y Hora:</td>
                <td style="padding: 8px 0;">${fechaHora}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #2E5430;">Jardín:</td>
                <td style="padding: 8px 0;">${cita.jardin?.nombre || 'Tu jardín'}</td>
              </tr>
              <tr style="background: #f0f0f0;">
                <td style="padding: 8px 0; font-weight: bold; color: #2E5430;">Técnico:</td>
                <td style="padding: 8px 0;">${cita.usuario_cita_tecnico_idTousuario ? `${cita.usuario_cita_tecnico_idTousuario.nombre} ${cita.usuario_cita_tecnico_idTousuario.apellido}` : 'Por asignar'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #2E5430;">Duración:</td>
                <td style="padding: 8px 0;">${cita.duracion_minutos} minutos</td>
              </tr>
              <tr style="background: #f0f0f0;">
                <td style="padding: 8px 0; font-weight: bold; color: #2E5430;">Precio:</td>
                <td style="padding: 8px 0; font-weight: bold;">$${cita.precio_aplicado ? Number(cita.precio_aplicado).toLocaleString('es-CL') : 'A convenir'} CLP</td>
              </tr>
              ${cita.notas_cliente ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #2E5430;">Notas:</td>
                <td style="padding: 8px 0;">${cita.notas_cliente}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
            <h4 style="margin-top: 0; color: #2e7d32;">✅ Próximos pasos</h4>
            <ul style="color: #2e7d32; margin: 10px 0; padding-left: 20px;">
              <li>Recibirás un recordatorio 24 horas antes del servicio</li>
              <li>El técnico llegará puntualmente a la hora acordada</li>
              <li>El pago se realiza después de completado el servicio</li>
              <li>Puedes cancelar o modificar hasta 24 horas antes</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #666; margin-bottom: 20px;">
              ¿Necesitas modificar tu cita o tienes alguna pregunta?
            </p>
            <a href="${process.env.FRONTEND_URL}/agendamientos"
               style="background: #2E5430; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Ver mis citas
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

          <div style="text-align: center; color: #999; font-size: 12px;">
            <p>📧 Contacto: contacto@cleanandgarden.cl</p>
            <p>📱 WhatsApp: +56 9 1234 5678</p>
            <p>🏢 Santiago, Chile</p>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Clean & Garden" <${process.env.EMAIL_USER}>`,
      to: cita.usuario_cita_cliente_idTousuario.email,
      subject: `✅ Tu cita ha sido confirmada - ${fechaHora}`,
      html,
    });

    console.log("📧 Correo de confirmación de reserva enviado a:", cita.usuario_cita_cliente_idTousuario.email);
  } catch (err) {
    console.error("❌ Error al enviar correo de confirmación de reserva:", err);
  }
}

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

    console.log("Buscando token:", token)

    // Buscar el token en la base de datos
    const confirm = await prisma.confirm_token.findUnique({ 
      where: { token },
      include: {
        usuario: {
          select: { id: true, email: true, activo: true }
        }
      }
    })

    console.log("Token encontrado:", confirm ? "Sí" : "No")

    if (!confirm) {
      return res.status(400).json({ 
        success: false, 
        message: "Token no encontrado" 
      })
    }

    // Verificar si el token ha expirado
    const now = new Date()
    if (confirm.expiresAt < now) {
      console.log("Token expirado:", confirm.expiresAt, "vs", now)
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

    console.log("Activando usuario ID:", confirm.userId)

    // Activar usuario - usar BigInt directamente sin conversión
    await prisma.usuario.update({
      where: { id: confirm.userId },
      data: { activo: true },
    })

    // Eliminar token usado
    await prisma.confirm_token.delete({ where: { id: confirm.id } })

    console.log("Usuario activado exitosamente:", confirm.usuario.email)

    return res.json({ 
      success: true, 
      message: "Cuenta activada correctamente" 
    })
  } catch (err: any) {
    console.error("Error al confirmar cuenta:", err)
    res.status(500).json({ 
      success: false, 
      message: "Error interno del servidor al confirmar cuenta",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    })
  }
})

//----------------------------------------------------------------------------------


// =======================================
// LOGIN (maneja perfil incompleto y mantiene sesión activa)
// =======================================
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    // Buscar usuario
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: {
        rol: { select: { codigo: true, nombre: true } },
        direccion: {
          include: { comuna: { include: { region: true } } },
        },
      },
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Comparar contraseña
    const passwordMatch = await bcrypt.compare(password, usuario.contrasena_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    // Verificar activación
    if (!usuario.activo) {
      return res.status(403).json({
        error: "Debes confirmar tu cuenta antes de iniciar sesión.",
      });
    }

    // Generar token JWT
    const token = generateToken({
      id: Number(usuario.id),
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol.codigo,
    });

    // Guardar cookie LOCAL
    //res.cookie("token", token, {
    //  httpOnly: true,
    //  secure: false, // cambia a true en producción
    //  sameSite: "lax",
    //  maxAge:  24 * 60 * 60 * 1000, // 24 horas
    //});

    // Guardar cookie PARA PRODUCCION
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",  // exige HTTPS
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000
    });
    console.log('entorno',process.env.NODE_ENV)

    // Detectar si faltan datos obligatorios
    const faltanDatos =
      !usuario.nombre?.trim() ||
      !usuario.apellido?.trim() ||
      !usuario.telefono?.trim() ||
      usuario.direccion.length === 0;

    // Si fue creado por admin o tiene datos incompletos → redirigir a /profile
    if (faltanDatos) {
      return res.status(200).json({
        warning:
          "Tu perfil está incompleto. Por favor, completa tu teléfono y dirección antes de continuar.",
        redirectTo: "profile",
        user: {
          id: Number(usuario.id),
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol.codigo,
        },
      });
    }

    // Login normal
    res.status(200).json({
      message: "Login exitoso",
      user: {
        id: Number(usuario.id),
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol.codigo,
        telefono: usuario.telefono || null,
      },
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

    return res.status(200).json({ message: "Contraseña actualizada correctamente" });
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
    console.log("EMAIL_USER:", process.env.EMAIL_USER ? "✅ Configurado" : "❌ Falta");
    console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "✅ Configurado" : "❌ Falta");
    
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
      tls: {
        rejectUnauthorized: false,
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
    console.error("Error en forgot-password:", error);
    
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

    // Validar complejidad de la contraseña
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
// LOGOUT
// =======================================
app.post("/logout", (_req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
  });
  res.json({ message: "Sesión cerrada correctamente" });
});

// =======================================
// PERFIL (ruta protegida con token)
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
        rol: { select: { codigo: true,disponibilidad_servicio: true } },
        direccion: {
          select: {
            id: true,
            calle: true,
            comuna: {
              select: {
                nombre: true,
                region: { select: { nombre: true } },
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

// =======================================
// ACTUALIZAR PERFIL (valida teléfono si jardinero)
// =======================================
app.put("/profile", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = BigInt((req as any).user.id);
    const { nombre, apellido, telefono, direcciones } = req.body;

    // Validar datos mínimos
    if (!nombre || !apellido || !telefono) {
      return res.status(400).json({ error: "Faltan datos obligatorios." });
    }

    // Actualizar datos básicos
    await prisma.usuario.update({
      where: { id: userId },
      data: { nombre, apellido, telefono },
    });

    // Si hay direcciones en el body
    if (Array.isArray(direcciones)) {
      for (const dir of direcciones) {
        if (dir._delete && dir.id) {
          // 🗑️ Eliminar
          await prisma.direccion.delete({
            where: { id: BigInt(dir.id) },
          });
        } else if (dir._new) {
          // ➕ Crear
          const comuna = await prisma.comuna.findFirst({
            where: { nombre: dir.comuna },
            select: { id: true },
          });

          if (comuna) {
            await prisma.direccion.create({
              data: {
                calle: dir.calle,
                usuario_id: userId,
                comuna_id: comuna.id,
              },
            });
          }
        } else if (dir.id) {
          // ✏️ Actualizar dirección existente
          const comuna = await prisma.comuna.findFirst({
            where: { nombre: dir.comuna },
            select: { id: true },
          });

          if (comuna) {
            await prisma.direccion.update({
              where: { id: BigInt(dir.id) },
              data: {
                calle: dir.calle,
                comuna_id: comuna.id,
              },
            });
          }
        }
      }
    }

    const userUpdated = await prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        direccion: {
          include: {
            comuna: { include: { region: true } },
          },
        },
      },
    });

    res.json(
      toJSONSafe({
        message: "Perfil actualizado correctamente.",
        user: userUpdated,
      })
    );

  } catch (err: any) {
    console.error("❌ Error al actualizar perfil:", err);
    res.status(500).json({
      error: err.message || "Error interno al actualizar perfil.",
    });
  }
});

// Crear dirección para el usuario autenticado
app.post("/direcciones", authMiddleware, async (req, res) => {
  try {
    const userData = (req as any).user;
    const { calle, comuna_id } = req.body;

    if (!calle || !calle.trim()) {
      return res.status(400).json({ error: 'La calle es obligatoria' });
    }
    if (!comuna_id) {
      return res.status(400).json({ error: 'La comuna es obligatoria' });
    }

    const direccion = await prisma.direccion.create({
      data: {
        calle: calle.trim(),
        comuna_id: BigInt(comuna_id),
        usuario_id: BigInt(userData.id)
      }
    });

    res.status(201).json({ message: "Dirección creada correctamente", direccion: toJSONSafe(direccion) });
  } catch (err: any) {
    console.error("Error al crear dirección:", err);
    res.status(500).json({ error: "Error interno al crear dirección" });
  }
});

// Listar direcciones del usuario autenticado
app.get("/direcciones", authMiddleware, async (req, res) => {
  try {
    const userData = (req as any).user;
    const direcciones = await prisma.direccion.findMany({
      where: { usuario_id: BigInt(userData.id) },
      select: { 
        id: true, 
        calle: true,
        comuna: {
          select: {
            nombre: true,
            region: { select: { nombre: true } }
          }
        }
      },
      orderBy: { calle: 'asc' }
    });

    res.json({ direcciones: toJSONSafe(direcciones) });
  } catch (err) {
    console.error('Error al obtener direcciones del usuario:', err);
    res.status(500).json({ error: 'Error al obtener direcciones' });
  }
});

// Listar jardines del usuario autenticado
app.get("/jardines", authMiddleware, async (req, res) => {
  try {
    const userData = (req as any).user;
    const jardines = await prisma.jardin.findMany({
      where: { cliente_id: BigInt(userData.id) },
      select: { 
        id: true, 
        nombre: true, 
        area_m2: true,
        tipo_suelo: true,
        descripcion: true,
        direccion_id: true,
        direccion: {
          select: {
            calle: true,
            comuna: {
              select: {
                nombre: true,
                region: { select: { nombre: true } }
              }
            }
          }
        },
        imagen: { select: { url_publica: true } }
      },
      orderBy: { nombre: 'asc' }
    });

    res.json({ jardines: toJSONSafe(jardines) });
  } catch (err) {
    console.error('Error al obtener jardines del usuario:', err);
    res.status(500).json({ error: 'Error al obtener jardines' });
  }
});

// Crear jardín para el usuario autenticado (desde UI cliente)
app.post("/jardines", authMiddleware, async (req, res) => {
  try {
    const userData = (req as any).user;
    const { nombre, area_m2, tipo_suelo, descripcion, direccion_id, imagen_url } = req.body;

    const errors: Record<string, string> = {};
    if (!nombre || !nombre.trim()) errors.nombre = "El nombre del jardín es obligatorio";
    if (!area_m2 || isNaN(parseFloat(area_m2)) || parseFloat(area_m2) <= 0)
      errors.area_m2 = "El área (m²) debe ser un número mayor a 0";
    if (!tipo_suelo || !tipo_suelo.trim()) errors.tipo_suelo = "El tipo de suelo es obligatorio";
    if (!descripcion || !descripcion.trim()) errors.descripcion = "La descripción es obligatoria";
    if (!direccion_id) errors.direccion_id = "La dirección es obligatoria";

    if (Object.keys(errors).length > 0) return res.status(400).json({ errors });

    // Crear imagen si se proporciona URL
    let imagen_principal_id = null;
    if (imagen_url) {
      const nuevaImagen = await prisma.imagen.create({
        data: {
          usuario_propietario_id: BigInt(userData.id),
          tipo: 'jardin',
          clave_storage: `gardens/${Date.now()}-${nombre.trim().replace(/\s+/g, '-')}`,
          url_publica: imagen_url,
          tipo_contenido: 'image/jpeg' // Asumimos JPEG por defecto
        }
      });
      imagen_principal_id = nuevaImagen.id;
    }

    const dataAny: any = {
      cliente_id: BigInt(userData.id),
      nombre: nombre.trim(),
      area_m2: parseFloat(area_m2),
      tipo_suelo: tipo_suelo.trim(),
      descripcion: descripcion.trim(),
      direccion_id: BigInt(direccion_id),
      activo: true,
    };
    if (imagen_principal_id) dataAny.imagen_principal_id = imagen_principal_id;

    const jardin = await prisma.jardin.create({ data: dataAny });

    res.status(201).json({ message: "Jardín creado correctamente", jardin: toJSONSafe(jardin) });
  } catch (err: any) {
    console.error("Error al crear jardín (cliente):", err);
    res.status(500).json({ error: "Error interno al crear jardín" });
  }
});

// Actualizar jardín del usuario autenticado
app.put("/jardines/:id", authMiddleware, async (req, res) => {
  try {
    const userData = (req as any).user;
    const { id } = req.params;
    const { nombre, area_m2, tipo_suelo, descripcion, direccion_id, imagen_url } = req.body;

    // Verificar que el jardín pertenece al usuario
    const jardin = await prisma.jardin.findFirst({
      where: { id: BigInt(id), cliente_id: BigInt(userData.id) }
    });
    if (!jardin) {
      return res.status(404).json({ error: 'Jardín no encontrado' });
    }

    const errors: Record<string, string> = {};
    if (!nombre || !nombre.trim()) errors.nombre = "El nombre del jardín es obligatorio";
    if (!area_m2 || isNaN(parseFloat(area_m2)) || parseFloat(area_m2) <= 0)
      errors.area_m2 = "El área (m²) debe ser un número mayor a 0";
    if (!tipo_suelo || !tipo_suelo.trim()) errors.tipo_suelo = "El tipo de suelo es obligatorio";
    if (!descripcion || !descripcion.trim()) errors.descripcion = "La descripción es obligatoria";
    if (!direccion_id) errors.direccion_id = "La dirección es obligatoria";

    if (Object.keys(errors).length > 0) return res.status(400).json({ errors });

    // Crear imagen si se proporciona URL nueva
    let imagen_principal_id = jardin.imagen_principal_id;
    if (imagen_url) {
      const nuevaImagen = await prisma.imagen.create({
        data: {
          usuario_propietario_id: BigInt(userData.id),
          tipo: 'jardin',
          clave_storage: `gardens/${Date.now()}-${nombre.trim().replace(/\s+/g, '-')}`,
          url_publica: imagen_url,
          tipo_contenido: 'image/jpeg'
        }
      });
      imagen_principal_id = nuevaImagen.id;
    }

    const updatedJardin = await prisma.jardin.update({
      where: { id: BigInt(id) },
      data: {
        nombre: nombre.trim(),
        area_m2: parseFloat(area_m2),
        tipo_suelo: tipo_suelo.trim(),
        descripcion: descripcion.trim(),
        direccion_id: BigInt(direccion_id),
        imagen_principal_id: imagen_principal_id,
        fecha_actualizacion: new Date()
      }
    });

    res.json({ message: "Jardín actualizado correctamente", jardin: toJSONSafe(updatedJardin) });
  } catch (err: any) {
    console.error("Error al actualizar jardín:", err);
    res.status(500).json({ error: "Error interno al actualizar jardín" });
  }
});

app.delete("/jardines/:id", authMiddleware, async (req, res) => {
  try {
    const userData = (req as any).user;
    const { id } = req.params;

    // Verificar que el jardín pertenece al usuario
    const jardin = await prisma.jardin.findFirst({
      where: { id: BigInt(id), cliente_id: BigInt(userData.id) }
    });
    if (!jardin) {
      return res.status(404).json({ error: 'Jardín no encontrado' });
    }

    // Verificar si el jardín tiene alguna cita (en cualquier estado)
    const totalCitas = await prisma.cita.count({
      where: { jardin_id: BigInt(id) }
    });

    if (totalCitas > 0) {
      return res.status(400).json({ error: 'No se puede eliminar el jardín porque tiene citas asociadas. Solo se pueden eliminar jardines que nunca hayan sido utilizados en agendamientos.' });
    }

    // Eliminar el jardín (ya no hay citas que eliminar)

    // Eliminar el jardín
    await prisma.jardin.delete({
      where: { id: BigInt(id) }
    });

    res.json({ message: "Jardín eliminado correctamente" });
  } catch (err: any) {
    console.error("Error al eliminar jardín:", err);
    res.status(500).json({ error: "Error interno al eliminar jardín" });
  }
});



//-----------------------------------------------------------------------------------------------------------------------------------------------------------

// =======================================
// PANEL ADMIN — Gestión de usuarios 
// =======================================

// Middleware: solo Admin puede acceder
async function verifyAdmin(req: Request, res: Response, next: any) {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ error: "No autorizado (sin token)" });

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const user = await prisma.usuario.findUnique({
      where: { id: BigInt(decoded.id) },
      include: { rol: true },
    });

    if (!user || user.rol.codigo !== "admin") {
      return res.status(403).json({ error: "Solo los administradores pueden acceder" });
    }

    (req as any).user = user;
    next();
  } catch (err) {
    console.error("Error en verifyAdmin:", err);
    return res.status(403).json({ error: "Acceso denegado" });
  }
}

//listar usuario
app.get("/admin/usuarios", verifyAdmin, async (_req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        telefono: true,
        activo: true,
        rol: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
      },
      orderBy: { id: "asc" },
    });

    // Asegurar que BigInt no rompa JSON
    const usuariosSafe = JSON.parse(
      JSON.stringify(usuarios, (_k, v) => (typeof v === "bigint" ? Number(v) : v))
    );

    res.json(usuariosSafe);
  } catch (err: any) {
    console.error("Error al listar usuarios:", err.message);
    res.status(500).json({ error: "Error al listar usuarios" });
  }
});



// Activar / desactivar usuario
app.put("/admin/usuarios/:id/estado", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    await prisma.usuario.update({
      where: { id: BigInt(id) },
      data: { activo },
    });

    res.json({ message: `Usuario ${activo ? "activado" : "desactivado"} correctamente ✅` });
  } catch (err: any) {
    console.error("Error al actualizar estado:", err.message);
    res.status(500).json({ error: "Error al actualizar estado" });
  }
});


// Eliminar usuario
app.delete("/admin/usuarios/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.usuario.delete({ where: { id: BigInt(id) } });
    res.json({ message: "Usuario eliminado correctamente 🗑️" });
  } catch (err: any) {
    console.error("❌ Error al eliminar usuario:", err.message);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});


// Editar usuario (con validaciones completas)
app.put("/admin/usuarios/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, telefono, rolCodigo } = req.body;

    // Validar que quien edita sea admin
    const admin = (req as any).user;
    if (!admin || admin.rol?.codigo !== "admin") {
      return res.status(403).json({ error: "No autorizado: solo administradores." });
    }

    // Validaciones de campos obligatorios
    if (!nombre?.trim()) return res.status(400).json({ error: "El nombre es obligatorio." });
    if (!apellido?.trim()) return res.status(400).json({ error: "El apellido es obligatorio." });
    if (!email?.trim()) return res.status(400).json({ error: "El correo electrónico es obligatorio." });
    if (!telefono?.trim())
      return res.status(400).json({ error: "El teléfono es obligatorio (+569XXXXXXXX)." });

    // Validar formato de teléfono chileno
    if (!telefono.match(/^\+569\d{8}$/)) {
      return res.status(400).json({
        error: "El teléfono debe tener formato válido: +569XXXXXXXX",
      });
    }

    // Validar formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Correo electrónico no válido." });
    }

    // Verificar que el usuario exista
    const user = await prisma.usuario.findUnique({ where: { id: BigInt(id) } });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado." });

    // Verificar duplicado de email (si cambió)
    if (email !== user.email) {
      const existing = await prisma.usuario.findUnique({ where: { email } });
      if (existing)
        return res.status(409).json({ error: "El correo electrónico ya está registrado." });
    }

    // Validar que tenga rol válido
    if (!rolCodigo?.trim()) {
      return res.status(400).json({ error: "Debe seleccionar un rol para el usuario." });
    }

    const rol = await prisma.rol.findUnique({ where: { codigo: rolCodigo } });
    if (!rol) {
      return res.status(400).json({ error: `El rol '${rolCodigo}' no existe en el sistema.` });
    }

    // Actualizar usuario
    const usuarioActualizado = await prisma.usuario.update({
      where: { id: BigInt(id) },
      data: {
        nombre,
        apellido,
        email,
        telefono,
        rol: { connect: { id: rol.id } },
        fecha_actualizacion: new Date(),
      },
      include: { rol: true },
    });

    const safeUser = JSON.parse(
      JSON.stringify(usuarioActualizado, (_k, v) => (typeof v === "bigint" ? Number(v) : v))
    );

    res.json({
      message: "Usuario actualizado correctamente.",
      usuario: safeUser,
    });
  } catch (err: any) {
    console.error("Error al editar usuario:", err.message);
    res.status(500).json({ error: "Error al editar usuario." });
  }
});

// =======================================

// =======================================
// PANEL ADMIN — Gestión de Roles
// =======================================

// Crear nuevo rol
app.post("/admin/roles", verifyAdmin, async (req, res) => {
  try {
    const { codigo, nombre } = req.body;

    // Validaciones
    if (!codigo?.trim() || !nombre?.trim()) {
      return res.status(400).json({ error: "Debe ingresar código y nombre del rol." });
    }

    // Verificar duplicado
    const existe = await prisma.rol.findUnique({ where: { codigo } });
    if (existe) {
      return res.status(400).json({ error: "Ese código de rol ya existe." });
    }

    // Crear rol
    const nuevoRol = await prisma.rol.create({
      data: { codigo: codigo.trim(), nombre: nombre.trim() },
    });

    // Evitar BigInt en JSON
    const safeRol = JSON.parse(
      JSON.stringify(nuevoRol, (_k, v) => (typeof v === "bigint" ? Number(v) : v))
    );

    res.json({ message: "Rol creado correctamente", rol: safeRol });
  } catch (err: any) {
    console.error("Error al crear rol:", err.message);
    res.status(500).json({ error: "Error al crear rol." });
  }
});

// ✅ Listar todos los roles (con disponibilidad de servicio)
// Listar roles con cantidad de usuarios asociados
app.get("/admin/roles", verifyAdmin, async (_req, res) => {
  try {
    const roles = await prisma.rol.findMany({
      select: {
        id: true,
        codigo: true,
        nombre: true,
        disponibilidad_servicio: true, // 👈 nuevo campo visible en frontend
        _count: { select: { usuario: true } },
      },
      orderBy: { id: "asc" },
    });

    res.json(
      JSON.parse(
        JSON.stringify(roles, (_k, v) => (typeof v === "bigint" ? Number(v) : v))
      )
    );
  } catch (err: any) {
    console.error("Error al listar roles:", err.message);
    res.status(500).json({ error: "Error al listar roles." });
  }
});


// ✅ Eliminar rol
// Eliminar rol
app.delete("/admin/roles/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar el rol
    const rol = await prisma.rol.findUnique({ where: { id: BigInt(id) } });
    if (!rol) {
      return res.status(404).json({ error: "Rol no encontrado." });
    }

    // Evitar eliminar el rol admin
    if (rol.codigo === "admin") {
      return res.status(400).json({ error: "No se puede eliminar el rol administrador." });
    }

    // Verificar si hay usuarios asignados
    const usuariosAsociados = await prisma.usuario.findMany({
      where: { rol_id: BigInt(id) },
      select: { id: true },
    });

    if (usuariosAsociados.length > 0) {
      return res.status(400).json({
        error: "No se puede eliminar el rol porque está asignado a uno o más usuarios.",
      });
    }

    // Eliminar rol
    await prisma.rol.delete({ where: { id: BigInt(id) } });

    res.json({ message: "Rol eliminado correctamente." });
  } catch (err: any) {
    console.error("Error al eliminar rol:", err.message);
    res.status(500).json({ error: "Error al eliminar rol." });
  }
});

// Actualizar rol
app.put("/admin/roles/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, nombre } = req.body;

    if (!codigo?.trim() || !nombre?.trim()) {
      return res.status(400).json({ error: "Debe ingresar código y nombre del rol." });
    }

    const rol = await prisma.rol.findUnique({ where: { id: BigInt(id) } });
    if (!rol) return res.status(404).json({ error: "Rol no encontrado." });

    if (rol.codigo === "admin" && codigo !== "admin") {
      return res.status(400).json({ error: "No se puede modificar el código del rol administrador." });
    }

    // Verificar si el nuevo código ya existe en otro rol
    const duplicado = await prisma.rol.findFirst({
      where: { codigo, NOT: { id: BigInt(id) } },
    });
    if (duplicado) {
      return res.status(400).json({ error: "Ya existe otro rol con ese código." });
    }

    const rolActualizado = await prisma.rol.update({
      where: { id: BigInt(id) },
      data: { codigo: codigo.trim(), nombre: nombre.trim() },
    });

    const safeRol = JSON.parse(
      JSON.stringify(rolActualizado, (_k, v) => (typeof v === "bigint" ? Number(v) : v))
    );

    res.json({ message: "Rol actualizado correctamente", rol: safeRol });
  } catch (err: any) {
    console.error("Error al actualizar rol:", err.message);
    res.status(500).json({ error: "Error al actualizar rol." });
  }
});


// ✅ Actualizar el campo disponibilidad_servicio (true/false)
app.put("/admin/roles/:id/disponibilidad", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { disponibilidad_servicio } = req.body;

    if (typeof disponibilidad_servicio !== "boolean") {
      return res.status(400).json({
        error: "El campo 'disponibilidad_servicio' debe ser booleano (true o false).",
      });
    }

    const rol = await prisma.rol.findUnique({ where: { id: BigInt(id) } });
    if (!rol) return res.status(404).json({ error: "Rol no encontrado." });

    // 🔒 BLOQUEO: estos roles nunca pueden tener disponibilidad
    const rolesBloqueados = ["admin", "cliente"];
    if (rolesBloqueados.includes(rol.codigo)) {
      if (disponibilidad_servicio === true) {
        return res.status(400).json({
          error: `El rol '${rol.codigo}' no puede tener disponibilidad de servicio.`,
        });
      }
      // Fuerza a false aunque intenten manipular
      const actualizado = await prisma.rol.update({
        where: { id: BigInt(id) },
        data: { disponibilidad_servicio: false },
      });
      return res.json({
        message: `✅ Rol '${rol.nombre}' queda con disponibilidad_servicio = false`,
        rol: JSON.parse(JSON.stringify(actualizado, (_, v) => (typeof v === "bigint" ? Number(v) : v))),
      });
    }

    // ✅ Para el resto de roles, permite cambiar libremente
    const actualizado = await prisma.rol.update({
      where: { id: BigInt(id) },
      data: { disponibilidad_servicio },
    });

    res.json({
      message: `✅ Rol '${rol.nombre}' actualizado: disponibilidad_servicio = ${disponibilidad_servicio}`,
      rol: JSON.parse(JSON.stringify(actualizado, (_, v) => (typeof v === "bigint" ? Number(v) : v))),
    });
  } catch (err: any) {
    console.error("❌ Error al actualizar disponibilidad_servicio:", err);
    res.status(500).json({ error: "Error al actualizar disponibilidad del rol." });
  }
});




// =======================================
// =======================================
// Crear cuenta de Usuario (Admin, Jardinero, Técnico, etc.)
// =======================================
app.post("/admin/registro-usuario", authMiddleware, async (req, res) => {
  try {
    const userData = (req as any).user;
    const { nombre, apellido, email, tipo } = req.body ?? {};

    // Solo admin puede crear
    const admin = await prisma.usuario.findUnique({
      where: { id: BigInt(userData.id) },
      include: { rol: true },
    });

    if (!admin || admin.rol?.codigo !== "admin") {
      return res.status(403).json({ error: "No autorizado: solo administradores." });
    }

    // Validaciones
    if (!nombre?.trim()) return res.status(400).json({ error: "El nombre es obligatorio." });
    if (!apellido?.trim()) return res.status(400).json({ error: "El apellido es obligatorio." });
    if (!email?.trim()) return res.status(400).json({ error: "El correo electrónico es obligatorio." });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: "Correo electrónico no válido." });

    // Verificar duplicado
    const existing = await prisma.usuario.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "El correo ya está registrado." });

    // Buscar rol dinámicamente
    const rol = await prisma.rol.findUnique({ where: { codigo: tipo } });
    if (!rol) {
      return res.status(400).json({ error: `El rol '${tipo}' no existe en la base de datos.` });
    }

    const rolNombre = rol.nombre || rol.codigo;

    // Generar contraseña automática
    const base = email.substring(0, 3);
    const password = `${base}1234`;
    const contrasena_hash = await bcrypt.hash(password, 12);

    // Crear usuario inactivo
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre,
        apellido,
        email,
        contrasena_hash,
        activo: false,
        rol: { connect: { id: rol.id } },
      },
    });

    // Crear token de confirmación
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    await prisma.confirm_token.create({
      data: { userId: nuevoUsuario.id, token, expiresAt: expires },
    });

    // Enviar correo de confirmación
    const transporter = nodemailer.createTransport({
      service: "gmail",
      pool: true,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const confirmLink = `${process.env.FRONTEND_URL}/admin/confirmar-usuario?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; color:#333;">
        <h2 style="color:#2E5430;">¡Bienvenido a Clean & Garden, ${nombre}!</h2>
        <p>Tu cuenta de <b>${rolNombre}</b> ha sido creada por el administrador.</p>
        <p>Para activarla, haz clic en el siguiente botón:</p>
        <p><a href="${confirmLink}" style="background:#2E5430;color:white;padding:10px 15px;border-radius:5px;text-decoration:none;">Confirmar Cuenta</a></p>
        <p><b>Importante:</b> el enlace expirará en 15 minutos.</p>
        <p>🌿 Una vez confirmes, recibirás tus credenciales para iniciar sesión.</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Clean & Garden" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Confirma tu cuenta de ${rolNombre}`,
      html,
    });

    res.status(201).json({
      message: `${rolNombre} creado. Se envió correo de confirmación.`,
    });
  } catch (err: any) {
    console.error("Error al crear usuario:", err);
    res.status(500).json({ error: "Error al crear usuario", details: err.message });
  }
});


// =======================================
// Confirmar cuenta de usuario (Admin o Jardinero)
// =======================================
app.get("/admin/confirmar-usuario/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const confirm = await prisma.confirm_token.findUnique({
      where: { token },
      include: { usuario: { include: { rol: true } } },
    });

    if (!confirm) return res.status(400).json({ error: "Token inválido o no encontrado." });
    if (confirm.expiresAt < new Date()) {
      await prisma.confirm_token.delete({ where: { id: confirm.id } });
      return res.status(400).json({ error: "El token ha expirado." });
    }

    const user = await prisma.usuario.update({
      where: { id: confirm.userId },
      data: { activo: true },
      include: { rol: true },
    });

    await prisma.confirm_token.delete({ where: { id: confirm.id } });

    // Enviar correo con credenciales
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const html = `
      <div style="font-family: Arial, sans-serif; color:#333;">
        <h2 style="color:#2E5430;">¡Tu cuenta ya está activa, ${user.nombre}!</h2>
        <p>Puedes iniciar sesión con las siguientes credenciales:</p>
        <ul>
          <li><b>Correo:</b> ${user.email}</li>
          <li><b>Contraseña temporal:</b> ${user.email.substring(0,3)}1234</li>
        </ul>
        <p>Cambia tu contraseña al iniciar sesión.</p>
        ${
          user.rol.codigo === "jardinero"
            ? "<p>Recuerda agregar tu teléfono en <b>Mi Perfil</b>.</p>"
            : ""
        }
        <p>Bienvenido al equipo de Clean & Garden.</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Clean & Garden" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `Tu cuenta de ${user.rol.nombre} está activa`,
      html,
    });

    res.json({ message: "Cuenta confirmada y activada correctamente" });
  } catch (err: any) {
    console.error("Error al confirmar usuario:", err);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// =======================================
// PANEL ADMIN — Gestión de Insumos (Productos)
// =======================================

app.get("/admin/insumos", verifyAdmin, async (_req, res) => {
  try {
    const insumos = await prisma.producto.findMany({
      orderBy: { fecha_creacion: "desc" },
    });

    // Convertimos BigInt → Number para evitar errores en JSON
    res.json(JSON.parse(JSON.stringify(insumos, (_, v) => (typeof v === "bigint" ? Number(v) : v))));
  } catch (err: any) {
    console.error("Error al listar insumos:", err);
    res.status(500).json({ error: "Error al listar insumos" });
  }
});

// Crear insumo (el estado se define automáticamente según el stock)
app.post("/admin/insumos", verifyAdmin, async (req, res) => {
  try {
    const { nombre, descripcion, precio_unitario, stock_actual } = req.body;

    if (!nombre?.trim()) {
      return res.status(400).json({ error: "El nombre del insumo es obligatorio" });
    }

    const existente = await prisma.producto.findUnique({ where: { nombre } });
    if (existente) {
      return res.status(409).json({ error: "Ya existe un insumo con ese nombre" });
    }

    const nuevo = await prisma.producto.create({
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        precio_unitario: precio_unitario ? parseFloat(precio_unitario) : 0,
        stock_actual: stock_actual ? parseInt(stock_actual) : 0,
        activo: Number(stock_actual) > 0, // Se define automáticamente
      },
    });

    res.status(201).json({
      message: "Insumo creado correctamente",
      insumo: JSON.parse(JSON.stringify(nuevo, (_, v) => (typeof v === "bigint" ? Number(v) : v))),
    });
  } catch (err: any) {
    console.error("Error al crear insumo:", err.message);
    res.status(500).json({ error: "Error al crear insumo" });
  }
});

// Actualizar insumo (estado cambia automáticamente si cambia el stock)
app.put("/admin/insumos/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio_unitario, stock_actual } = req.body;

    const insumo = await prisma.producto.findUnique({ where: { id: BigInt(id) } });
    if (!insumo) return res.status(404).json({ error: "Insumo no encontrado" });

    // Aseguramos que siempre sea un número válido (>= 0)
    const nuevoStock =
      stock_actual !== undefined && stock_actual !== null
        ? Number(stock_actual)
        : Number(insumo.stock_actual) || 0;

    const actualizado = await prisma.producto.update({
      where: { id: BigInt(id) },
      data: {
        nombre: nombre?.trim() || insumo.nombre,
        descripcion: descripcion?.trim() || insumo.descripcion,
        precio_unitario: precio_unitario ? parseFloat(precio_unitario) : insumo.precio_unitario,
        stock_actual: nuevoStock,
        activo: Number(nuevoStock) > 0, // TypeScript ya no reclama
        fecha_actualizacion: new Date(),
      },
    });


    res.json({
      message: "Insumo actualizado correctamente",
      insumo: JSON.parse(JSON.stringify(actualizado, (_, v) => (typeof v === "bigint" ? Number(v) : v))),
    });
  } catch (err: any) {
    console.error("Error al actualizar insumo:", err.message);
    res.status(500).json({ error: "Error al actualizar insumo" });
  }
});

// Eliminar insumo
app.delete("/admin/insumos/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const insumo = await prisma.producto.findUnique({ where: { id: BigInt(id) } });
    if (!insumo) return res.status(404).json({ error: "Insumo no encontrado" });

    await prisma.producto.delete({ where: { id: BigInt(id) } });

    res.json({ message: "Insumo eliminado correctamente" });
  } catch (err: any) {
    console.error("Error al eliminar insumo:", err.message);
    res.status(500).json({ error: "Error al eliminar insumo" });
  }
});

// =======================================
// PANEL ADMIN — Gestión de Direcciones y Jardines
// =======================================

// Listar todas las direcciones con cliente y jardines asociados
app.get("/admin/direcciones", verifyAdmin, async (_req, res) => {
  try {
    const direcciones = await prisma.direccion.findMany({
      include: {
        usuario: {
          select: { id: true, nombre: true, apellido: true, email: true },
        },
        comuna: {
          include: { region: true },
        },
        jardin: {
          select: {
            id: true,
            nombre: true,
            activo: true,
            area_m2: true,
            tipo_suelo: true,
            descripcion: true,
            fecha_creacion: true,
            fecha_actualizacion: true,
          },
        },
      },
      orderBy: { id: "asc" },
    });

    res.json(toJSONSafe(direcciones));
  } catch (err: any) {
    console.error("Error al listar direcciones:", err);
    res.status(500).json({ error: "Error al listar direcciones" });
  }
});

// Crear jardín (con validaciones completas)
app.post("/admin/jardines", verifyAdmin, async (req, res) => {
  try {
    const { cliente_id, direccion_id, nombre, area_m2, tipo_suelo, descripcion } = req.body;

    // Validaciones
    const errors: Record<string, string> = {};

    if (!cliente_id) errors.cliente_id = "El cliente es obligatorio";
    if (!direccion_id) errors.direccion_id = "La dirección es obligatoria";
    if (!nombre || !nombre.trim()) errors.nombre = "El nombre del jardín es obligatorio";
    if (!area_m2 || isNaN(parseFloat(area_m2)) || parseFloat(area_m2) <= 0)
      errors.area_m2 = "El área (m²) debe ser un número mayor a 0";
    if (!tipo_suelo || !tipo_suelo.trim())
      errors.tipo_suelo = "El tipo de suelo es obligatorio";
    if (!descripcion || !descripcion.trim())
      errors.descripcion = "La descripción es obligatoria";

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    const jardin = await prisma.jardin.create({
      data: {
        cliente_id: BigInt(cliente_id),
        direccion_id: BigInt(direccion_id),
        nombre: nombre.trim(),
        area_m2: parseFloat(area_m2),
        tipo_suelo: tipo_suelo.trim(),
        descripcion: descripcion.trim(),
        activo: true,
      },
    });

    res.status(201).json({
      message: "Jardín creado correctamente",
      jardin: toJSONSafe(jardin),
    });
  } catch (err: any) {
    console.error("Error al crear jardín:", err.message);
    res.status(500).json({ error: "Error al crear jardín" });
  }
});

// Editar jardín (con validaciones completas)
app.put("/admin/jardines/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, area_m2, tipo_suelo, descripcion } = req.body;

    // Validaciones
    const errors: Record<string, string> = {};
    if (!nombre || !nombre.trim()) errors.nombre = "El nombre del jardín es obligatorio";
    if (!area_m2 || isNaN(parseFloat(area_m2)) || parseFloat(area_m2) <= 0)
      errors.area_m2 = "El área (m²) debe ser un número mayor a 0";
    if (!tipo_suelo || !tipo_suelo.trim())
      errors.tipo_suelo = "El tipo de suelo es obligatorio";
    if (!descripcion || !descripcion.trim())
      errors.descripcion = "La descripción es obligatoria";

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    const jardin = await prisma.jardin.findUnique({ where: { id: BigInt(id) } });
    if (!jardin) return res.status(404).json({ error: "Jardín no encontrado" });

    const actualizado = await prisma.jardin.update({
      where: { id: BigInt(id) },
      data: {
        nombre: nombre.trim(),
        area_m2: parseFloat(area_m2),
        tipo_suelo: tipo_suelo.trim(),
        descripcion: descripcion.trim(),
        fecha_actualizacion: new Date(),
      },
    });

    res.json({
      message: "Jardín actualizado correctamente",
      jardin: toJSONSafe(actualizado),
    });
  } catch (err: any) {
    console.error("Error al editar jardín:", err);
    res.status(500).json({ error: "Error al editar jardín" });
  }
});


// Activar / Desactivar jardín
app.put("/admin/jardines/:id/estado", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const jardin = await prisma.jardin.findUnique({ where: { id: BigInt(id) } });
    if (!jardin) return res.status(404).json({ error: "Jardín no encontrado" });

    const actualizado = await prisma.jardin.update({
      where: { id: BigInt(id) },
      data: { activo: !jardin.activo },
    });

    res.json({
      message: `Jardín ${actualizado.activo ? "activado" : "desactivado"} correctamente ✅`,
      jardin: toJSONSafe(actualizado),
    });
  } catch (err: any) {
    console.error("Error al cambiar estado:", err);
    res.status(500).json({ error: "Error al cambiar estado" });
  }
});

// Eliminar jardín
app.delete("/admin/jardines/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const jardin = await prisma.jardin.findUnique({ where: { id: BigInt(id) } });
    if (!jardin) return res.status(404).json({ error: "Jardín no encontrado" });

    await prisma.jardin.delete({ where: { id: BigInt(id) } });

    res.json({ message: "Jardín eliminado correctamente" });
  } catch (err: any) {
    console.error("Error al eliminar jardín:", err);
    res.status(500).json({ error: "Error al eliminar jardín" });
  }
});


// =======================================
// 🗓️ PANEL ADMIN — Gestión de Disponibilidad mensual
// =======================================

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
dayjs.extend(isSameOrBefore);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Santiago");
// ✅ Convierte una fecha en formato YYYY-MM-DD a Date local (sin UTC shift)
function toLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0); // 👈 12:00 local evita desfases por zona horaria
}

// ✅ Convierte una fecha (Date o string) al formato YYYY-MM-DD (PostgreSQL-friendly)
function toPgDateLocal(date: Date | string): string {
  const d = dayjs(date).tz("America/Santiago");
  return d.format("YYYY-MM-DD");
}


// =======================================
// 👷‍♂️ Listar usuarios con disponibilidad de servicio activa
// =======================================
app.get("/admin/disponibilidad/usuarios", verifyAdmin, async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: {
        rol: {
          disponibilidad_servicio: true, // 👈 filtra por roles que tengan este flag
        },
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        rol: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            disponibilidad_servicio: true,
          },
        },
      },
      orderBy: { nombre: "asc" },
    });

    // ✅ Convierte BigInt → Number antes de enviar (para evitar error de serialización)
    res.json(
      JSON.parse(
        JSON.stringify(usuarios, (_, v) => (typeof v === "bigint" ? Number(v) : v))
      )
    );
  } catch (err) {
    console.error("❌ Error al listar usuarios con disponibilidad:", err);
    res.status(500).json({ error: "Error al listar usuarios con disponibilidad" });
  }
});



//  POST generar disponibilidad mensual
const fetch = globalThis.fetch;


// =======================================
// 🗓️ PANEL ADMIN — Generar disponibilidad mensual (versión final)
// =======================================


app.post("/admin/disponibilidad-mensual/generar", verifyAdmin, async (req, res) => {
  try {
    const { periodo, jornada, reglas, trabajadores, cuposPorSlot, modo } = req.body;
    const tz = "America/Santiago";

    if (!periodo?.desde || !periodo?.hasta) {
      return res.status(400).json({ error: "Faltan fechas de inicio o fin." });
    }

    const desde = dayjs.tz(`${periodo.desde}T00:00:00`, tz);
    const hasta = dayjs.tz(`${periodo.hasta}T00:00:00`, tz);
    const hoy = dayjs.tz(new Date(), tz).startOf("day");

    if (desde.isBefore(hoy)) {
      return res
        .status(400)
        .json({ error: "No se pueden crear horarios con fechas anteriores a hoy." });
    }

    const diasActivos = reglas?.diasSemana ?? [1, 2, 3, 4, 5]; // lunes a viernes
    const duracionMin = reglas?.duracionMin ?? 60;
    const descansoMin = reglas?.descansoMin ?? 30;
    const horaInicioBase = jornada.horaInicio;
    const horaFinBase = jornada.horaFin;

    // === 🧮 Generar horarios ===
    const diasGenerados: any[] = [];

    for (
      let actual = desde.clone();
      actual.isSameOrBefore(hasta, "day");
      actual = actual.add(1, "day")
    ) {
      const dow = actual.day(); // 0=Dom, 1=Lun, 2=Mar, ...
      const fechaStr = actual.tz(tz).format("YYYY-MM-DD");

      // ✅ Solo crear en días seleccionados por el admin
      if (!diasActivos.includes(dow)) continue;

      // ✅ Generar horarios para cada trabajador
      for (const tId of trabajadores) {
        const inicio = dayjs.tz(`${fechaStr}T${horaInicioBase}:00`, tz);
        const fin = dayjs.tz(`${fechaStr}T${horaFinBase}:00`, tz);
        let actualInicio = inicio.clone();

        while (actualInicio.isBefore(fin)) {
          const actualFin = actualInicio.add(duracionMin, "minute");
          if (actualFin.isAfter(fin)) break;

          diasGenerados.push({
            tecnico_id: Number(tId),
            fecha: actual.toDate(),
            hora_inicio: actualInicio.toDate(),
            hora_fin: actualFin.toDate(),
            cupos_totales: cuposPorSlot ?? 1,
            cupos_ocupados: 0,
          });

          actualInicio = actualFin.add(descansoMin, "minute");
        }
      }
    }

    // === Vista previa ===
    if (modo === "preview") {
      return res.json({
        data: diasGenerados,
        message: `Vista previa generada: ${diasGenerados.length} slots.`,
      });
    }

    // === Reemplazo (borra horarios del mes si corresponde) ===
    if (modo === "replace") {
      await prisma.disponibilidad_mensual.deleteMany({
        where: {
          fecha: {
            gte: new Date(desde.year(), desde.month(), 1),
            lte: new Date(desde.year(), desde.month() + 1, 0, 23, 59, 59),
          },
        },
      });
    }

    // === Guardar evitando duplicados ===
    const existentes = await prisma.disponibilidad_mensual.findMany({
      where: {
        OR: diasGenerados.map((d) => ({
          tecnico_id: BigInt(d.tecnico_id),
          fecha: d.fecha,
          hora_inicio: d.hora_inicio,
        })),
      },
      select: { tecnico_id: true, fecha: true, hora_inicio: true },
    });

    const existentesSet = new Set(
      existentes.map(
        (x) =>
          `${String(x.tecnico_id)}|${dayjs(x.fecha).format("YYYY-MM-DD")}|${dayjs(
            x.hora_inicio
          ).format("HH:mm")}`
      )
    );

    const nuevos = diasGenerados.filter(
      (d) =>
        !existentesSet.has(
          `${String(d.tecnico_id)}|${dayjs(d.fecha).format("YYYY-MM-DD")}|${dayjs(
            d.hora_inicio
          ).format("HH:mm")}`
        )
    );

    const result =
      nuevos.length > 0
        ? await prisma.disponibilidad_mensual.createMany({ data: nuevos })
        : { count: 0 };

    res.json({
      message: `✅ Se generaron ${result.count} horarios.`,
    });
  } catch (err) {
    console.error("❌ Error al generar disponibilidad:", err);
    res.status(500).json({ error: "Error interno al generar disponibilidad" });
  }
});





// listar en calendario disponibilidad mensual
// ===========================================
// LISTAR DISPONIBILIDAD MENSUAL (ADMIN)
// ===========================================
app.get("/admin/disponibilidad-mensual", verifyAdmin, async (req, res) => {
  try {
    const mesParam = req.query.mes;
    const usuarioId = req.query.usuarioId?.toString();

    let inicio: Date;
    let fin: Date;

    // ==========================
    // MANEJO DE MES: YYYY-MM
    // ==========================
    if (typeof mesParam === "string" && /^\d{4}-\d{2}$/.test(mesParam)) {
      const [year, month] = mesParam.split("-").map(Number);
      inicio = new Date(year, month - 1, 1, 0, 0, 0);
      fin = new Date(year, month, 1, 0, 0, 0);
    } else {
      // Mes actual por defecto
      const now = new Date();
      inicio = new Date(now.getFullYear(), now.getMonth(), 1);
      fin = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    // ==========================
    // 1) TRAER SLOTS DEL MES
    // ==========================
    const filtroSlots: any = {
      fecha: { gte: inicio, lt: fin },
      activo: true,
    };

    if (usuarioId) filtroSlots.tecnico_id = BigInt(usuarioId);

    const slots = await prisma.disponibilidad_mensual.findMany({
      where: filtroSlots,
      orderBy: [
        { fecha: "asc" },
        { hora_inicio: "asc" }
      ],
      include: {
        usuario: { select: { id: true, nombre: true, apellido: true, rol: true } }
      }
    });

    console.log("ADMIN - Slots encontrados:", slots.length);

    // ==========================
    // 2) TRAER TODAS LAS CITAS DEL MES
    // ==========================
    const citasMes = await prisma.cita.findMany({
      where: {
        fecha_hora: { gte: inicio, lt: fin },
        estado: { in: ["pendiente", "confirmada", "realizada"] },
      },
      include: {
        jardin: true,
        servicio: true,
        usuario_cita_cliente_idTousuario: true,
      },
      orderBy: {
        fecha_hora: "asc"
      }
    });

    // ==========================
    // 3) INDEXAR CITAS POR FECHA/HORA EXACTA
    // ==========================
    const citasPorInicio: Record<string, any[]> = {};

    citasMes.forEach((cita) => {
      const key = new Date(cita.fecha_hora).toISOString();
      if (!citasPorInicio[key]) citasPorInicio[key] = [];
      citasPorInicio[key].push(cita);
    });

    // ==========================
    // 4) RELACIONAR SLOTS + CITAS
    // ==========================
    const slotsConCitas = slots.map((slot) => {
      const key = slot.hora_inicio.toISOString();
      return {
        ...slot,
        citas: citasPorInicio[key] ?? [],
      };
    });

    // ==========================
    // 5) TRAER EXCEPCIONES DEL MES
    // ==========================
    const excepcionFiltro: any = {
      OR: [
        {
          fecha: { gte: inicio, lt: fin }
        },
        {
          desde: { lte: fin },
          hasta: { gte: inicio }
        }
      ]
    };

    if (usuarioId) excepcionFiltro.tecnico_id = BigInt(usuarioId);

    const excepciones = await prisma.disponibilidad_excepcion.findMany({
      where: excepcionFiltro,
      orderBy: [{ fecha: "asc" }, { desde: "asc" }],
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            rol: { select: { codigo: true, nombre: true } },
          },
        },
      },
    });

    // ==========================
    // RESPUESTA FINAL
    // ==========================
    return res.json({
      data: toJSONSafe(slotsConCitas),
      excepciones: toJSONSafe(excepciones),
    });

  } catch (err) {
    console.error("❌ Error en /admin/disponibilidad-mensual:", err);
    return res.status(500).json({ error: "Error interno al listar disponibilidad mensual" });
  }
});



// PUBLIC: listar disponibilidad mensual (solo slots activos) -> usado por frontend para reservar
app.get("/disponibilidad-mensual", async (req, res) => {
  try {
    const { mes, usuarioId, desde, hasta } = req.query;
    let rangoDesde: string;
    let rangoHasta: string;

    if (mes) {
      const [y, m] = String(mes).split("-").map(Number);
      const firstLocal = new Date(y, m - 1, 1);
      const lastLocal = new Date(y, m, 0);
      rangoDesde = toPgDateLocal(firstLocal);
      rangoHasta = toPgDateLocal(lastLocal);
    } else if (desde && hasta) {
      rangoDesde = toPgDateLocal(desde as string);
      rangoHasta = toPgDateLocal(hasta as string);
    } else {
      // Solo mostrar fechas futuras, no los próximos 3 meses
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      rangoDesde = toPgDateLocal(today);
      // Mostrar los próximos 30 días
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 30);
      rangoHasta = toPgDateLocal(futureDate);
    }

    const filtro: any = {
      fecha: { gte: new Date(rangoDesde), lte: new Date(rangoHasta) },
      activo: true,
    };
    if (usuarioId) filtro.tecnico_id = BigInt(String(usuarioId));

    // 🔹 Obtener slots activos
    const disponibilidad = await prisma.disponibilidad_mensual.findMany({
      where: filtro,
      orderBy: [{ fecha: "asc" }, { hora_inicio: "asc" }],
      include: {
        usuario: { select: { id: true, nombre: true, apellido: true, rol: true } }
      },
    });

    console.log('PUBLIC ENDPOINT - Filtro:', filtro);
    console.log('PUBLIC ENDPOINT - Slots encontrados:', disponibilidad.length);
    disponibilidad.forEach(slot => {
      console.log(`PUBLIC - ${slot.fecha} ${slot.hora_inicio} - ${slot.activo}`);
    });

    // 🔹 OPTIMIZACIÓN: Obtener TODAS las citas de una vez en lugar de consultas individuales
    const citasMap = new Map();
    if (disponibilidad.length > 0) {
      const tecnicoIds = [...new Set(disponibilidad.map(slot => slot.tecnico_id))];
      const fechasSlots = disponibilidad.map(slot => ({
        tecnico_id: slot.tecnico_id,
        hora_inicio: slot.hora_inicio,
        hora_fin: slot.hora_fin
      }));

      // Una sola consulta para obtener todas las citas relevantes
      const todasLasCitas = await prisma.cita.findMany({
        where: {
          tecnico_id: { in: tecnicoIds },
          OR: fechasSlots.map(slot => ({
            tecnico_id: slot.tecnico_id,
            fecha_hora: {
              gte: slot.hora_inicio,
              lt: slot.hora_fin
            }
          })),
          estado: { in: ['pendiente', 'confirmada'] }
        },
        include: {
          jardin: { select: { id: true, nombre: true } },
          servicio: { select: { id: true, nombre: true, precio_clp: true } },
          usuario_cita_cliente_idTousuario: { select: { id: true, nombre: true, apellido: true } }
        },
        orderBy: { fecha_creacion: 'asc' }
      });

      // Organizar citas por slot (clave más simple: tecnico_id + fecha_hora)
      todasLasCitas.forEach(cita => {
        const key = `${cita.tecnico_id}-${cita.fecha_hora.toISOString()}`;
        if (!citasMap.has(key)) {
          citasMap.set(key, []);
        }
        citasMap.get(key).push(cita);
      });
    }

    // 🔹 OPTIMIZACIÓN: Obtener TODAS las excepciones de una vez
    const excepcionesMap = new Map();
    if (disponibilidad.length > 0) {
      const tecnicoIds = [...new Set(disponibilidad.map(slot => slot.tecnico_id))];

      const todasLasExcepciones = await prisma.disponibilidad_excepcion.findMany({
        where: {
          OR: [
            // Excepciones específicas por fecha y técnico global
            {
              fecha: { gte: new Date(rangoDesde), lte: new Date(rangoHasta) },
              tecnico_id: null
            },
            // Excepciones específicas por fecha y técnicos específicos
            {
              fecha: { gte: new Date(rangoDesde), lte: new Date(rangoHasta) },
              tecnico_id: { in: tecnicoIds }
            },
            // Excepciones por rango y técnico global
            {
              desde: { lte: new Date(rangoHasta) },
              hasta: { gte: new Date(rangoDesde) },
              tecnico_id: null
            },
            // Excepciones por rango y técnicos específicos
            {
              desde: { lte: new Date(rangoHasta) },
              hasta: { gte: new Date(rangoDesde) },
              tecnico_id: { in: tecnicoIds }
            }
          ]
        }
      });

      // Organizar excepciones por slot de manera más simple
      todasLasExcepciones.forEach((exc: any) => {
        // Crear clave basada en técnico y fecha/rango
        let key: string;
        if (exc.fecha) {
          key = `${exc.tecnico_id || 'global'}-fecha-${exc.fecha.toISOString().split('T')[0]}`;
        } else if (exc.desde && exc.hasta) {
          key = `${exc.tecnico_id || 'global'}-rango-${exc.desde.toISOString().split('T')[0]}-${exc.hasta.toISOString().split('T')[0]}`;
        } else {
          return; // Skip excepciones malformadas
        }

        if (!excepcionesMap.has(key)) {
          excepcionesMap.set(key, []);
        }
        excepcionesMap.get(key).push(exc);
      });
    }

    // 🔹 Filtrar slots considerando excepciones (sin consultas adicionales)
    const slotsFiltrados = disponibilidad.filter(slot => {
      const fechaSlotStr = slot.fecha.toISOString().split('T')[0];
      let tieneExcepcionBloqueante = false;

      // Verificar excepciones específicas por fecha
      const keyFechaGlobal = `null-fecha-${fechaSlotStr}`;
      const keyFechaTecnico = `${slot.tecnico_id}-fecha-${fechaSlotStr}`;

      if (excepcionesMap.has(keyFechaGlobal)) {
        const excepciones = excepcionesMap.get(keyFechaGlobal);
        if (excepciones.some((exc: any) => exc.tipo === 'no_disponible' || exc.tipo === 'bloqueo')) {
          tieneExcepcionBloqueante = true;
        }
      }

      if (excepcionesMap.has(keyFechaTecnico)) {
        const excepciones = excepcionesMap.get(keyFechaTecnico);
        if (excepciones.some((exc: any) => exc.tipo === 'no_disponible' || exc.tipo === 'bloqueo')) {
          tieneExcepcionBloqueante = true;
        }
      }

      // Verificar excepciones por rango
      excepcionesMap.forEach((excepciones, key) => {
        if (key.includes('-rango-')) {
          const parts = key.split('-rango-');
          const tecnicoPart = parts[0];
          const rangoPart = parts[1];

          // Verificar si esta excepción aplica a este técnico
          const aplicaATecnico = tecnicoPart === 'null' || tecnicoPart === slot.tecnico_id.toString();

          if (aplicaATecnico) {
            const [desdeStr, hastaStr] = rangoPart.split('-');
            const desde = new Date(desdeStr);
            const hasta = new Date(hastaStr);

            // Verificar si la fecha del slot está dentro del rango
            if (slot.fecha >= desde && slot.fecha <= hasta) {
              if (excepciones.some((exc: any) => exc.tipo === 'no_disponible' || exc.tipo === 'bloqueo')) {
                tieneExcepcionBloqueante = true;
              }
            }
          }
        }
      });

      return !tieneExcepcionBloqueante;
    });

    console.log('PUBLIC ENDPOINT - Slots después de filtrar excepciones:', slotsFiltrados.length);

    // 🔹 Asignar citas a cada slot filtrado
    const disponibilidadConCitas = slotsFiltrados.map(slot => {
      const key = `${slot.tecnico_id}-${slot.hora_inicio.toISOString()}`;
      const citas = citasMap.get(key) || [];

      return {
        ...slot,
        citas: citas
      };
    });

    res.json({ data: toJSONSafe(disponibilidadConCitas) });
  } catch (err) {
    console.error("❌ Error al listar disponibilidad pública:", err);
    res.status(500).json({ error: "Error al listar disponibilidad" });
  }
});


// PUBLIC: listar disponibilidad mensual (solo slots activos) -> usado por frontend para reservar
app.get("/disponibilidad-mensual", async (req, res) => {
  try {
    const { mes, usuarioId, desde, hasta } = req.query;
    let rangoDesde: string;
    let rangoHasta: string;

    if (mes) {
      const [y, m] = String(mes).split("-").map(Number);
      const firstLocal = new Date(y, m - 1, 1);
      const lastLocal = new Date(y, m, 0);
      rangoDesde = toPgDateLocal(firstLocal);
      rangoHasta = toPgDateLocal(lastLocal);
    } else if (desde && hasta) {
      rangoDesde = toPgDateLocal(desde as string);
      rangoHasta = toPgDateLocal(hasta as string);
    } else {
      // Solo mostrar fechas futuras, no los próximos 3 meses
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      rangoDesde = toPgDateLocal(today);
      // Mostrar los próximos 30 días
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 30);
      rangoHasta = toPgDateLocal(futureDate);
    }

    const filtro: any = {
      fecha: { gte: new Date(rangoDesde), lte: new Date(rangoHasta) },
      activo: true,
    };
    if (usuarioId) filtro.tecnico_id = BigInt(String(usuarioId));

    // 🔹 Obtener slots activos
    const disponibilidad = await prisma.disponibilidad_mensual.findMany({
      where: filtro,
      orderBy: [{ fecha: "asc" }, { hora_inicio: "asc" }],
      include: {
        usuario: { select: { id: true, nombre: true, apellido: true, rol: true } }
      },
    });

    console.log('PUBLIC ENDPOINT - Filtro:', filtro);
    console.log('PUBLIC ENDPOINT - Slots encontrados:', disponibilidad.length);
    disponibilidad.forEach(slot => {
      console.log(`PUBLIC - ${slot.fecha} ${slot.hora_inicio} - ${slot.activo}`);
    });

    // 🔹 OPTIMIZACIÓN: Obtener TODAS las citas de una vez en lugar de consultas individuales
    const citasMap = new Map();
    if (disponibilidad.length > 0) {
      const tecnicoIds = [...new Set(disponibilidad.map(slot => slot.tecnico_id))];
      const fechasSlots = disponibilidad.map(slot => ({
        tecnico_id: slot.tecnico_id,
        hora_inicio: slot.hora_inicio,
        hora_fin: slot.hora_fin
      }));

      // Una sola consulta para obtener todas las citas relevantes
      const todasLasCitas = await prisma.cita.findMany({
        where: {
          tecnico_id: { in: tecnicoIds },
          OR: fechasSlots.map(slot => ({
            tecnico_id: slot.tecnico_id,
            fecha_hora: {
              gte: slot.hora_inicio,
              lt: slot.hora_fin
            }
          })),
          estado: { in: ['pendiente', 'confirmada'] }
        },
        include: {
          jardin: { select: { id: true, nombre: true } },
          servicio: { select: { id: true, nombre: true, precio_clp: true } },
          usuario_cita_cliente_idTousuario: { select: { id: true, nombre: true, apellido: true } }
        },
        orderBy: { fecha_creacion: 'asc' }
      });

      // Organizar citas por slot (clave más simple: tecnico_id + fecha_hora)
      todasLasCitas.forEach(cita => {
        const key = `${cita.tecnico_id}-${cita.fecha_hora.toISOString()}`;
        if (!citasMap.has(key)) {
          citasMap.set(key, []);
        }
        citasMap.get(key).push(cita);
      });
    }

    // 🔹 OPTIMIZACIÓN: Obtener TODAS las excepciones de una vez
    const excepcionesMap = new Map();
    if (disponibilidad.length > 0) {
      const tecnicoIds = [...new Set(disponibilidad.map(slot => slot.tecnico_id))];

      const todasLasExcepciones = await prisma.disponibilidad_excepcion.findMany({
        where: {
          OR: [
            // Excepciones específicas por fecha y técnico global
            {
              fecha: { gte: new Date(rangoDesde), lte: new Date(rangoHasta) },
              tecnico_id: null
            },
            // Excepciones específicas por fecha y técnicos específicos
            {
              fecha: { gte: new Date(rangoDesde), lte: new Date(rangoHasta) },
              tecnico_id: { in: tecnicoIds }
            },
            // Excepciones por rango y técnico global
            {
              desde: { lte: new Date(rangoHasta) },
              hasta: { gte: new Date(rangoDesde) },
              tecnico_id: null
            },
            // Excepciones por rango y técnicos específicos
            {
              desde: { lte: new Date(rangoHasta) },
              hasta: { gte: new Date(rangoDesde) },
              tecnico_id: { in: tecnicoIds }
            }
          ]
        }
      });

      // Organizar excepciones por slot de manera más simple
      todasLasExcepciones.forEach((exc: any) => {
        // Crear clave basada en técnico y fecha/rango
        let key: string;
        if (exc.fecha) {
          key = `${exc.tecnico_id || 'global'}-fecha-${exc.fecha.toISOString().split('T')[0]}`;
        } else if (exc.desde && exc.hasta) {
          key = `${exc.tecnico_id || 'global'}-rango-${exc.desde.toISOString().split('T')[0]}-${exc.hasta.toISOString().split('T')[0]}`;
        } else {
          return; // Skip excepciones malformadas
        }

        if (!excepcionesMap.has(key)) {
          excepcionesMap.set(key, []);
        }
        excepcionesMap.get(key).push(exc);
      });
    }

    // 🔹 Filtrar slots considerando excepciones (sin consultas adicionales)
    const slotsFiltrados = disponibilidad.filter(slot => {
      const fechaSlotStr = slot.fecha.toISOString().split('T')[0];
      let tieneExcepcionBloqueante = false;

      // Verificar excepciones específicas por fecha
      const keyFechaGlobal = `null-fecha-${fechaSlotStr}`;
      const keyFechaTecnico = `${slot.tecnico_id}-fecha-${fechaSlotStr}`;

      if (excepcionesMap.has(keyFechaGlobal)) {
        const excepciones = excepcionesMap.get(keyFechaGlobal);
        if (excepciones.some((exc: any) => exc.tipo === 'no_disponible' || exc.tipo === 'bloqueo')) {
          tieneExcepcionBloqueante = true;
        }
      }

      if (excepcionesMap.has(keyFechaTecnico)) {
        const excepciones = excepcionesMap.get(keyFechaTecnico);
        if (excepciones.some((exc: any) => exc.tipo === 'no_disponible' || exc.tipo === 'bloqueo')) {
          tieneExcepcionBloqueante = true;
        }
      }

      // Verificar excepciones por rango
      excepcionesMap.forEach((excepciones, key) => {
        if (key.includes('-rango-')) {
          const parts = key.split('-rango-');
          const tecnicoPart = parts[0];
          const rangoPart = parts[1];

          // Verificar si esta excepción aplica a este técnico
          const aplicaATecnico = tecnicoPart === 'null' || tecnicoPart === slot.tecnico_id.toString();

          if (aplicaATecnico) {
            const [desdeStr, hastaStr] = rangoPart.split('-');
            const desde = new Date(desdeStr);
            const hasta = new Date(hastaStr);

            // Verificar si la fecha del slot está dentro del rango
            if (slot.fecha >= desde && slot.fecha <= hasta) {
              if (excepciones.some((exc: any) => exc.tipo === 'no_disponible' || exc.tipo === 'bloqueo')) {
                tieneExcepcionBloqueante = true;
              }
            }
          }
        }
      });

      return !tieneExcepcionBloqueante;
    });

    console.log('PUBLIC ENDPOINT - Slots después de filtrar excepciones:', slotsFiltrados.length);

    // 🔹 Asignar citas a cada slot filtrado
    const disponibilidadConCitas = slotsFiltrados.map(slot => {
      const key = `${slot.tecnico_id}-${slot.hora_inicio.toISOString()}`;
      const citas = citasMap.get(key) || [];

      return {
        ...slot,
        citas: citas
      };
    });

    res.json({ data: toJSONSafe(disponibilidadConCitas) });
  } catch (err) {
    console.error("❌ Error al listar disponibilidad pública:", err);
    res.status(500).json({ error: "Error al listar disponibilidad" });
  }
});




//  eliminar mes actual 
app.delete("/admin/disponibilidad-mensual/eliminar-mes", verifyAdmin, async (req, res) => {
  const { mes } = req.query as { mes: string };
  if (!mes) return res.status(400).json({ error: "Falta parámetro mes" });

  const [year, month] = mes.split("-").map(Number);
  const desde = new Date(year, month - 1, 1);
  const hasta = new Date(year, month, 0, 23, 59, 59);

  try {
    const eliminados = await prisma.disponibilidad_mensual.deleteMany({
      where: { fecha: { gte: desde, lte: hasta } },
    });

    return res.json({ message: `Se eliminaron ${eliminados.count} horarios` });
  } catch (err) {
    console.error("Error al eliminar mes:", err);
    return res.status(500).json({ error: "Error interno al eliminar el mes" });
  }
});


// ============================================================
// 🛡️ Reservar una cita: operación atómica que verifica y consume un slot
// Request body: { disponibilidad_mensual_id, cliente_id, jardin_id, servicio_id, duracion_minutos?, notas_cliente?, precio_aplicado? }
// Response: 201 + cita creado o 409/400 si no disponible
app.post("/cita/reservar", async (req, res) => {
  try {
    const {
      disponibilidad_mensual_id,
      cliente_id,
      jardin_id,
      servicio_id,
      duracion_minutos,
      notas_cliente,
      precio_aplicado,
    } = req.body;

    if (!disponibilidad_mensual_id || !cliente_id || !jardin_id || !servicio_id) {
      return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }

    // Ejecutamos la reserva en una transacción para evitar condiciones de carrera
    const result = await prisma.$transaction(async (tx) => {
      // Buscar slot y validar
      const slot = await tx.disponibilidad_mensual.findUnique({ where: { id: BigInt(disponibilidad_mensual_id) } });
      if (!slot || !slot.activo) {
        throw { status: 400, message: "Slot no existe o no está activo" };
      }
      if ((slot.cupos_ocupados ?? 0) >= (slot.cupos_totales ?? 1)) {
        throw { status: 409, message: "Slot ya está lleno" };
      }

      // Incrementar cupos_ocupados
      await tx.disponibilidad_mensual.update({ where: { id: slot.id }, data: { cupos_ocupados: { increment: 1 } } });

      // Crear la cita usando la hora del slot (hora_inicio)
      const cita = await tx.cita.create({
        data: {
          cliente_id: BigInt(cliente_id),
          jardin_id: BigInt(jardin_id),
          servicio_id: BigInt(servicio_id),
          tecnico_id: BigInt(slot.tecnico_id),
          fecha_hora: slot.hora_inicio,
          duracion_minutos: duracion_minutos ? Number(duracion_minutos) : 60,
          estado: "confirmada",
          notas_cliente: notas_cliente ?? null,
          precio_aplicado: precio_aplicado !== undefined && precio_aplicado !== null ? Number(precio_aplicado) : undefined,
          nombre_servicio_snapshot: undefined,
        },
      });

      return cita;
    });

    // Enviar correo de confirmación de reserva de forma asíncrona
    setImmediate(() => {
      enviarCorreoConfirmacionReserva(result.id);
    });

    // Enviar notificación push al cliente
    setImmediate(() => {
      notificarCitaCreada(result.id);
    });

    return res.status(201).json({ ok: true, cita: toJSONSafe(result) });
  } catch (err: any) {
    console.error("❌ Error al reservar cita:", err);
    if (err && err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: "Error interno al reservar cita" });
  }
});

// Obtener citas del cliente autenticado
app.get('/citas/mis', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const clienteId = Number(user?.id);
    if (!clienteId) return res.status(400).json({ error: 'Cliente no identificado' });

    const citas = await prisma.cita.findMany({
      where: {
        cliente_id: BigInt(clienteId),
        // incluir todas las citas del historial (quitar filtro de fecha futura)
      },
      include: {
        servicio: { select: { id: true, nombre: true, duracion_minutos: true } },
        jardin: { 
          include: { 
            direccion: { 
              include: { 
                comuna: { 
                  include: { 
                    region: true
                  }
                } 
              } 
            } 
          }
        },
        usuario_cita_cliente_idTousuario: { select: { id: true, nombre: true, apellido: true, email: true, telefono: true } },
        usuario_cita_tecnico_idTousuario: { select: { id: true, nombre: true, apellido: true, email: true, telefono: true } },
        pago: { select: { id: true, metodo: true, estado: true, monto_clp: true, creado_en: true, flow_order_id: true, flow_status: true } },
        // incluir visita y productos para citas completadas
        visita: {
          include: {
            visita_producto: {
              include: {
                producto: { select: { id: true, nombre: true, descripcion: true } }
              }
            }
          }
        }
      },
      orderBy: { fecha_hora: 'desc' } // ordenar por fecha descendente para mostrar más recientes primero
    });

    res.json(toJSONSafe(citas));
  } catch (err) {
    console.error('Error al obtener citas del cliente:', err);
    res.status(500).json({ error: 'Error interno al obtener citas' });
  }
});


// Obtener citas asignadas al jardinero/técnico autenticado
app.get('/citas/jardinero', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tecnicoId = Number(user?.id);
    const userRole = user?.rol?.codigo || user?.rol;

    // Verificar que sea jardinero o técnico
    if (userRole !== 'jardinero' && userRole !== 'tecnico') {
      return res.status(403).json({ error: 'Acceso denegado. Solo para jardineros/técnicos.' });
    }

    if (!tecnicoId) {
      return res.status(400).json({ error: 'Técnico no identificado' });
    }

    // Obtener todas las citas asignadas al técnico (pasadas y futuras)
    const citas = await prisma.cita.findMany({
      where: {
        tecnico_id: BigInt(tecnicoId)
      },
      select: {
        id: true,
        fecha_hora: true,
        duracion_minutos: true,
        estado: true,
        precio_aplicado: true,
        notas_cliente: true,
        motivo_cancelacion: true,
        notas_cancelacion: true,
        cancelada_por_usuario_id: true,
        cancelada_por_rol: true,
        usuario_cita_cancelada_por_usuario_idTousuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        },
        servicio: {
          select: {
            id: true,
            nombre: true,
            duracion_minutos: true
          }
        },
        jardin: {
          select: {
            id: true,
            nombre: true,
            direccion: {
              select: {
                comuna: {
                  select: {
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
        },
        usuario_cita_cliente_idTousuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
            telefono: true
          }
        },
        pago: {
          select: {
            id: true,
            metodo: true,
            estado: true,
            monto_clp: true,
            creado_en: true
          },
          where: {
            estado: 'aprobado'
          }
        },
        visita: {
          select: {
            id: true,
            insumos: true,
            estado: true,
            resumen: true,
            inicio: true,
            fin: true,
            visita_producto: {
              select: {
                cantidad: true,
                producto: {
                  select: {
                    id: true,
                    nombre: true,
                    precio_unitario: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [
        { fecha_hora: 'desc' } // Más recientes primero
      ]
    });

    res.json(toJSONSafe(citas));
  } catch (err) {
    console.error('Error al obtener citas del jardinero:', err);
    res.status(500).json({ error: 'Error interno al obtener citas' });
  }
});

// Cancelar una cita por parte del cliente (o admin). Regla: solo se puede cancelar hasta las 12:00 del día anterior.
app.post('/cita/:id/cancelar', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = Number(user?.id);
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Falta id de cita' });

    const citaId = BigInt(id);

    // Buscar cita
    const cita = await prisma.cita.findUnique({ where: { id: citaId } });
    if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });

    // Solo el cliente que reservó, el jardinero asignado o admin puede cancelar
    const isOwner = Number(cita.cliente_id) === userId;
    const isAssignedTecnico = Number(cita.tecnico_id) === userId;
    const isAdmin = (user?.rol?.codigo === 'admin') || (user?.rol === 'admin');
    if (!isOwner && !isAssignedTecnico && !isAdmin) return res.status(403).json({ error: 'No autorizado para cancelar esta cita' });

    // Verificar estado actual
    if (!['pendiente', 'confirmada'].includes(cita.estado)) {
      return res.status(400).json({ error: 'La cita no está en un estado que permita cancelación' });
    }

    // Regla de tiempo: hasta las 12:00 del día anterior (hora local del servidor)
    const fecha = new Date(cita.fecha_hora);
    const deadline = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() - 1, 12, 0, 0, 0);
    const ahora = new Date();
    if (ahora > deadline && !isAdmin) {
      return res.status(400).json({ error: 'Plazo de cancelación expirado (hasta las 12:00 del día anterior)' });
    }

    // Leer motivo/notas opcionales del body
    const { motivo_cancelacion, notas_cancelacion } = req.body ?? {};

    // Ejecutar en transacción: actualizar estado de la cita, registrar metadatos de cancelación y liberar cupo si existe el slot
    const result = await prisma.$transaction(async (tx) => {
      // Actualizar estado de la cita y metadata
      const updated = await tx.cita.update({
        where: { id: citaId },
        data: {
          estado: 'cancelada',
          cancelada_en: new Date(),
          cancelada_por_usuario_id: userId ? BigInt(userId) : undefined,
          cancelada_por_rol: (user?.rol?.codigo ?? user?.rol) || undefined,
          motivo_cancelacion: motivo_cancelacion ?? undefined,
          notas_cancelacion: notas_cancelacion ?? undefined,
        },
      });

      // Intentar encontrar el slot correspondiente para decrementar cupos_ocupados
      // Construir cláusula where de forma segura (tecnico_id puede ser null)
      const whereClause: any = { hora_inicio: cita.fecha_hora };
      if (cita.tecnico_id !== null && cita.tecnico_id !== undefined) {

    // Iniciar pago con Webpay (Webpay Plus) usando transbank-sdk
    app.post('/pago/init', authMiddleware, async (req: Request, res: Response) => {
      try {
        const user = (req as any).user;
        const userId = Number(user?.id);
        const { cita_id } = req.body ?? {};
        if (!cita_id) return res.status(400).json({ error: 'Falta cita_id' });

        const citaId = BigInt(cita_id);
        const cita = await prisma.cita.findUnique({ where: { id: citaId }, include: { servicio: true } });
        if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });

        // determinar monto
        const monto = Number(cita.precio_aplicado ?? cita.servicio?.precio_clp ?? 0);

        // crear registro de pago pendiente
        const pago = await prisma.pago.create({
          data: {
            cita_id: cita.id,
            usuario_id: BigInt(userId),
            metodo: 'flow',
            estado: 'pendiente',
            monto_clp: monto,
            moneda: 'CLP'
          }
        });

        // Usar transbank-sdk para iniciar la transacción
        let tbk: any;
        try {
          tbk = require('transbank-sdk');
        } catch (e) {
          console.error('Transbank SDK require error', e);
          return res.status(500).json({ error: 'SDK Transbank no disponible en el servidor' });
        }

        const WebpayPlus = tbk.WebpayPlus;
        const commerceCode = process.env.TBK_COMMERCE_CODE ?? '';
        const apiKey = process.env.TBK_API_KEY ?? '';
        const returnUrl = process.env.TBK_RETURN_URL ?? `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/pago/return`;

        const transaction = WebpayPlus.Transaction.buildForIntegration(commerceCode, apiKey);
        const buyOrder = `order_${pago.id}_${Date.now()}`;
        const sessionId = `sess_${userId}_${Date.now()}`;

        const createRes = await transaction.create(buyOrder, sessionId, monto, returnUrl);

        // actualizar pago con metadatos de flujo
        await prisma.pago.update({ where: { id: pago.id }, data: { flow_order_id: buyOrder, flow_token: createRes?.token ?? createRes?.token_ws ?? null, flow_payload: createRes } });

        // Responder con la URL/token para redirigir al cliente a Webpay
        return res.json({ ok: true, pago_id: pago.id, buyOrder, token: createRes?.token ?? createRes?.token_ws ?? null, url: createRes?.url ?? createRes?.url_redirection ?? createRes?.url_ws ?? null, raw: createRes });
      } catch (err: any) {
        console.error('pago init error', err);
        res.status(500).json({ error: err?.message ?? 'Error iniciando pago' });
      }
    });

    // Endpoint para recibir el retorno de Webpay (commit) y actualizar el pago y la cita
    app.post('/pago/return', async (req: Request, res: Response) => {
      try {
        // Webpay suele enviar token_ws en body/query. Aceptamos ambos.
        const token = req.body?.token_ws ?? req.body?.token ?? req.query?.token_ws ?? req.query?.token;
        if (!token) return res.status(400).send('token faltante');

        // inicializar SDK
        let tbk: any;
        try {
          tbk = require('transbank-sdk');
        } catch (e) {
          console.error('Transbank SDK require error', e);
          return res.status(500).send('SDK Transbank no disponible');
        }

        const WebpayPlus = tbk.WebpayPlus;
        const commerceCode = process.env.TBK_COMMERCE_CODE ?? '';
        const apiKey = process.env.TBK_API_KEY ?? '';
        const transaction = WebpayPlus.Transaction.buildForIntegration(commerceCode, apiKey);

        // Commit/obtener resultado
        const commitRes = await transaction.commit(token);

        // Buscar pago por token si existe
        const pago = await prisma.pago.findFirst({ where: { flow_token: token } });

        // Mapear estado
        const aprobado = commitRes && (commitRes?.status === 'AUTHORIZED' || commitRes?.response_code === 0 || commitRes?.type === 'venta');
        const nuevoEstado = aprobado ? 'aprobado' : 'rechazado';

        // Actualizar pago y registrar evento
        if (pago) {
          const estadoAnterior = pago.estado;
          await prisma.$transaction(async (tx) => {
            await tx.pago.update({ where: { id: pago.id }, data: { estado: nuevoEstado, flow_payload: commitRes } });
            await tx.pago_evento.create({ data: { pago_id: pago.id, tipo_evento: 'return', estado_anterior: pago.estado as any, estado_nuevo: nuevoEstado as any, detalle: commitRes } });

            if (aprobado) {
              // marcar cita como confirmada
              await tx.cita.update({ where: { id: pago.cita_id }, data: { estado: 'confirmada' } });
            }
          });

          // Enviar notificación de cambio de estado del pago
          setImmediate(() => {
            notificarCambioPago(pago.id, estadoAnterior, nuevoEstado);
          });
        }

        // Responder con la info de la transacción (Webpay normalmente espera una redirección a la app)
        // Para simplicidad devolvemos JSON con resultado.
        return res.json({ ok: true, aprobado: aprobado, commit: commitRes });
      } catch (err: any) {
        console.error('pago return error', err);
        return res.status(500).json({ error: err?.message ?? 'Error procesando retorno de pago' });
      }
    });
        whereClause.tecnico_id = cita.tecnico_id;
      }

      const slot = await tx.disponibilidad_mensual.findFirst({ where: whereClause });

      if (slot) {
        // Decrementar sin bajar de cero
        const nuevos = Math.max((slot.cupos_ocupados ?? 0) - 1, 0);
        await tx.disponibilidad_mensual.update({ where: { id: slot.id }, data: { cupos_ocupados: nuevos } });
      }

      return updated;
    });

    // Enviar notificación push al cliente sobre la cancelación
    setImmediate(() => {
      notificarCitaCancelada(citaId, motivo_cancelacion);
    });

    res.json({ ok: true, cita: toJSONSafe(result) });
  } catch (err) {
    console.error('Error al cancelar cita:', err);
    res.status(500).json({ error: 'Error interno al cancelar cita' });
  }
});



//  eliminar horario individual
app.delete("/admin/disponibilidad-mensual/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.disponibilidad_mensual.delete({ where: { id: BigInt(id) } });
    res.json({ message: "🗑️ Slot eliminado correctamente" });
  } catch (err) {
    console.error("❌ Error al eliminar slot:", err);
    res.status(500).json({ error: "Error al eliminar slot" });
  }
});


//  modificar horario individual
app.put("/admin/disponibilidad-mensual/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { cupos_totales, hora_inicio, hora_fin } = req.body;

    // construye objeto dinámico solo con los campos enviados
    const data: any = {};
    if (cupos_totales !== undefined) data.cupos_totales = Number(cupos_totales);
    if (hora_inicio) data.hora_inicio = new Date(hora_inicio);
    if (hora_fin) data.hora_fin = new Date(hora_fin);

    const actualizado = await prisma.disponibilidad_mensual.update({
      where: { id: BigInt(id) },
      data,
    });

    res.json({
      message: "✅ Slot actualizado correctamente",
      slot: toJSONSafe(actualizado), // 👈 convierte BigInt a Number antes de enviar
    });
  } catch (err) {
    console.error("❌ Error al actualizar slot:", err);
    res.status(500).json({ error: "Error al actualizar slot." });
  }
});
// =======================================
// 🧭 PANEL ADMIN — Excepciones de Disponibilidad de horarios
// =======================================


dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = "America/Santiago";

// 🧠 Tipos válidos de excepción
const EXCEPTION_TYPES = [
  "dia_completo",
  "feriado_irrenunciable",
  "vacaciones",
  "licencia",
  "permiso",
];

// ==============================
// 📅 Helpers de fecha
// ==============================
function startOfDayCL(d: string | Date): Date {
  const base = typeof d === "string" ? dayjs.tz(`${d}T00:00:00`, TZ) : dayjs(d).tz(TZ);
  return base.startOf("day").toDate();
}

function endOfDayCL(d: string | Date): Date {
  const base = typeof d === "string" ? dayjs.tz(`${d}T00:00:00`, TZ) : dayjs(d).tz(TZ);
  return base.endOf("day").toDate();
}

function listDatesYYYYMMDD(desde: string, hasta: string): string[] {
  const out: string[] = [];
  let cur = dayjs.tz(`${desde}T00:00:00`, TZ);
  const end = dayjs.tz(`${hasta}T00:00:00`, TZ);
  while (cur.isSame(end) || cur.isBefore(end)) {
    out.push(cur.format("YYYY-MM-DD"));
    cur = cur.add(1, "day");
  }
  return out;
}

function buildMotivo(tipo: string, tecnico?: { nombre?: string | null; apellido?: string | null }): string {
  switch (tipo) {
    case "dia_completo":
      return "Día completo: no se trabaja";
    case "feriado_irrenunciable":
      return "Feriado irrenunciable";
    case "vacaciones":
      return `Vacaciones${tecnico ? `: ${tecnico.nombre ?? ""} ${tecnico.apellido ?? ""}` : ""}`.trim();
    case "licencia":
      return `Licencia${tecnico ? `: ${tecnico.nombre ?? ""} ${tecnico.apellido ?? ""}` : ""}`.trim();
    case "permiso":
      return `Permiso${tecnico ? `: ${tecnico.nombre ?? ""} ${tecnico.apellido ?? ""}` : ""}`.trim();
    default:
      return tipo;
  }
}

// ============================================================
// 🧩 ENDPOINT: Listar trabajadores con horarios asignados
// ============================================================
app.get("/admin/trabajadores-con-horarios", verifyAdmin, async (_req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: {
        rol: { disponibilidad_servicio: true },
        disponibilidad_mensual: { some: {} },
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        rol: { select: { codigo: true, nombre: true } },
      },
      orderBy: { nombre: "asc" },
    });

    res.json(
      JSON.parse(JSON.stringify(usuarios, (_, v) => (typeof v === "bigint" ? Number(v) : v)))
    );
  } catch (err) {
    console.error("❌ Error al obtener trabajadores con horarios:", err);
    res.status(500).json({ error: "Error al obtener trabajadores con horarios" });
  }
});


// ============================================================
// 🧩 ENDPOINT: Crear excepciones (por técnico o global)
// ============================================================
app.post("/admin/excepciones", verifyAdmin, async (req, res) => {
  try {
    const { tipo, fecha, rango, tecnico_id, descripcion } = req.body;
    const adminId = (req as any).user?.id ?? null;

    const EXCEPTION_TYPES = [
      "feriado_irrenunciable",
      "dia_completo",
      "vacaciones",
      "licencia",
      "permiso",
    ];

    if (!tipo || !EXCEPTION_TYPES.includes(tipo)) {
      return res.status(400).json({ error: "Tipo de excepción inválido" });
    }

    // =======================================================
    // 🧍 Obtener técnico (si aplica)
    // =======================================================
    let tecnico = null;
    if (tecnico_id) {
      tecnico = await prisma.usuario.findUnique({
        where: { id: BigInt(tecnico_id) },
        select: { nombre: true, apellido: true },
      });
      if (!tecnico)
        return res.status(404).json({ error: "Técnico no encontrado" });
    }

    // =======================================================
    // 🧩 VALIDACIÓN: Evitar duplicados
    // =======================================================
    if (["feriado_irrenunciable", "dia_completo"].includes(tipo)) {
      if (!fecha) {
        return res.status(400).json({ error: "Debe enviar una fecha válida" });
      }

      const fechaCL = dayjs.tz(fecha, TZ).startOf("day").toDate();
      const existe = await prisma.disponibilidad_excepcion.findFirst({
        where: { tipo, fecha: fechaCL },
      });

      if (existe) {
        return res.status(400).json({
          error: `Ya existe una excepción de tipo "${tipo}" en la fecha ${dayjs(
            fechaCL
          ).format("DD/MM/YYYY")}.`,
        });
      }
    } else {
      if (!rango?.desde || !rango?.hasta || !tecnico_id) {
        return res.status(400).json({
          error: "Debe indicar técnico y rango {desde, hasta}",
        });
      }

      const desdeCL = dayjs.tz(rango.desde, TZ).startOf("day").toDate();
      const hastaCL = dayjs.tz(rango.hasta, TZ).startOf("day").toDate();

      if (hastaCL < desdeCL) {
        return res.status(400).json({
          error: "La fecha 'hasta' no puede ser anterior a 'desde'",
        });
      }

      const solapada = await prisma.disponibilidad_excepcion.findFirst({
        where: {
          tipo,
          tecnico_id: BigInt(tecnico_id),
          OR: [
            {
              AND: [
                { desde: { lte: hastaCL } },
                { hasta: { gte: desdeCL } },
              ],
            },
          ],
        },
      });

      if (solapada) {
        return res.status(400).json({
          error: `Ya existe una excepción del tipo "${tipo}" para este técnico que se solapa con el rango ${dayjs(
            desdeCL
          ).format("DD/MM")} → ${dayjs(hastaCL).format("DD/MM")}.`,
        });
      }
    }

    // =======================================================
    // 🚀 Crear excepción (sin exigir horarios activos)
    // =======================================================

    if (["feriado_irrenunciable", "dia_completo"].includes(tipo)) {
      const fechaCL = dayjs.tz(fecha, TZ).startOf("day");
      const excepcion = await prisma.disponibilidad_excepcion.create({
        data: {
          tipo,
          fecha: fechaCL.toDate(),
          disponible: false,
          motivo: buildMotivo(tipo),
          descripcion: descripcion ?? null,
          creado_por: adminId ? BigInt(adminId) : null,
        },
      });

      // Desactivar horarios si existen
      await prisma.disponibilidad_mensual.updateMany({
        where: {
          fecha: {
            gte: fechaCL.toDate(),
            lt: fechaCL.add(1, "day").startOf("day").toDate(),
          },
        },
        data: { activo: false, excepcion_id: excepcion.id },
      });

      return res.json(
        toJSONSafe({
          ok: true,
          message: `✅ Excepción global creada (si existían horarios, fueron desactivados).`,
          excepcion_id: excepcion.id,
        })
      );
    }

    // 🔵 Excepción por técnico
    const desdeCL = dayjs.tz(rango.desde, TZ).startOf("day");
    const hastaCL = dayjs.tz(rango.hasta, TZ).startOf("day");

    const excepcion = await prisma.disponibilidad_excepcion.create({
      data: {
        tipo,
        desde: desdeCL.toDate(),
        hasta: hastaCL.toDate(),
        disponible: false,
        motivo: buildMotivo(tipo, tecnico ?? undefined),
        descripcion: descripcion ?? null,
        tecnico_id: BigInt(tecnico_id),
        creado_por: adminId ? BigInt(adminId) : null,
      },
    });

    await prisma.disponibilidad_mensual.updateMany({
      where: {
        tecnico_id: BigInt(tecnico_id),
        fecha: {
          gte: desdeCL.toDate(),
          lt: hastaCL.add(1, "day").startOf("day").toDate(),
        },
      },
      data: { activo: false, excepcion_id: excepcion.id },
    });

    res.json(
      toJSONSafe({
        ok: true,
        message: `✅ Excepción creada (si existían horarios del técnico, fueron desactivados).`,
        excepcion_id: excepcion.id,
      })
    );
  } catch (err: any) {
    console.error("❌ Error al crear excepción:", err);
    res.status(400).json({
      error:
        err.message ||
        "Error al crear excepción. Si el problema persiste, reinicia el servidor.",
    });
  }
});




// ============================================================
// 🧩 ENDPOINT: Listar excepciones
// ============================================================
app.get("/admin/excepciones", verifyAdmin, async (_req, res) => {
  try {
    const excepciones = await prisma.disponibilidad_excepcion.findMany({
      orderBy: { fecha: "desc" },
      include: {
        usuario_disponibilidad_excepcion_creado_porTousuario: {
          select: { nombre: true, apellido: true },
        },
      },
    });

    res.json({
      data: JSON.parse(JSON.stringify(excepciones, (_, v) => (typeof v === "bigint" ? Number(v) : v))),
    });
  } catch (err) {
    console.error("❌ Error al listar excepciones:", err);
    res.status(500).json({ error: "Error al listar excepciones" });
  }
});



// ============================================================
// 🧩 ENDPOINT: Eliminar excepción
// ============================================================
app.delete("/admin/excepciones/:id", verifyAdmin, async (req, res) => {
  try {
    const id = BigInt(req.params.id);

    // 1️⃣ Buscar la excepción
    const ex = await prisma.disponibilidad_excepcion.findUnique({
      where: { id },
    });
    if (!ex) return res.status(404).json({ error: "Excepción no encontrada" });

    // 2️⃣ Reactivar los horarios afectados por esta excepción
    const filtros: any = { excepcion_id: ex.id };

    // Si tiene técnico (vacaciones/licencia/permiso)
    if (ex.tecnico_id) {
      filtros.tecnico_id = ex.tecnico_id;
    }

    // Si tiene rango
    if (ex.desde && ex.hasta) {
      filtros.fecha = { gte: ex.desde, lte: ex.hasta };
    }
    // Si tiene fecha única (feriado o día completo)
    else if (ex.fecha) {
      filtros.fecha = {
        gte: ex.fecha,
        lt: dayjs(ex.fecha).add(1, "day").toDate(),
      };
    }

    // ✅ Restaurar los horarios
    const restaurados = await prisma.disponibilidad_mensual.updateMany({
      where: filtros,
      data: { activo: true, excepcion_id: null },
    });

    // 3️⃣ Eliminar la excepción
    await prisma.disponibilidad_excepcion.delete({ where: { id } });

    res.json({
      ok: true,
      message: `Excepción eliminada correctamente. ${restaurados.count} horarios reactivados.`,
    });
  } catch (err: any) {
    console.error("❌ Error al eliminar excepción:", err);
    res
      .status(500)
      .json({ error: err.message || "Error al eliminar excepción" });
  }
});


// Eliminar excepciones por grupo (motivo + rango de fechas)
app.post("/admin/excepciones/eliminar-grupo", verifyAdmin, async (req, res) => {
  try {
    const { motivo, desde, hasta } = req.body;
    await prisma.disponibilidad_excepcion.deleteMany({
      where: {
        motivo,
        fecha: {
          gte: startOfDayCL(desde),
          lte: startOfDayCL(dayjs.tz(`${hasta}T00:00:00`, "America/Santiago").add(1, "day").toDate()),
        },
      },
    });
    res.json({ ok: true, message: "Grupo de excepciones eliminado correctamente." });
  } catch (err) {
    console.error("❌ Error al eliminar grupo:", err);
    res.status(500).json({ error: "Error al eliminar grupo de excepciones" });
  }
});


// ======================================================
//  Modificar excepción existente
// =======================================================
app.put("/admin/excepciones/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, fecha, rango, descripcion } = req.body;
    const adminId = (req as any).user?.id ?? null;
    const TZ = "America/Santiago";

    const EXCEPTION_TYPES = [
      "feriado_irrenunciable",
      "dia_completo",
      "vacaciones",
      "licencia",
      "permiso",
    ];

    if (!tipo || !EXCEPTION_TYPES.includes(tipo)) {
      return res.status(400).json({ error: "Tipo de excepción inválido" });
    }

    const actual = await prisma.disponibilidad_excepcion.findUnique({
      where: { id: BigInt(id) },
      select: {
        id: true,
        tipo: true,
        fecha: true,
        desde: true,
        hasta: true,
        tecnico_id: true,
      },
    });
    if (!actual) return res.status(404).json({ error: "Excepción no encontrada" });

    // 1) Reactivar slots que estaban desactivados por esta excepción
    await prisma.disponibilidad_mensual.updateMany({
      where: { excepcion_id: actual.id },
      data: { activo: true, excepcion_id: null },
    });

    // 2) Preparar datos base de actualización
    const updateData: any = {
      tipo,
      descripcion: descripcion ?? null,
      actualizado_por: adminId ? BigInt(adminId) : null,
    };

    // Helper fechas
    const toDay = (d: string) => dayjs.tz(d, TZ).startOf("day");

    // === CASO GLOBAL ===
    if (["feriado_irrenunciable", "dia_completo"].includes(tipo)) {
      if (!fecha) return res.status(400).json({ error: "Debe indicar una fecha válida" });
      const fechaCL = toDay(fecha);

      // 🔒 Duplicado exacto: mismo tipo + misma fecha (excluye el propio id)
      const yaExiste = await prisma.disponibilidad_excepcion.findFirst({
        where: {
          id: { not: BigInt(id) },
          tipo,
          fecha: fechaCL.toDate(),
        },
        select: { id: true },
      });
      if (yaExiste) {
        return res.status(400).json({
          error: `Ya existe una excepción "${tipo}" en la fecha ${fechaCL.format("DD/MM/YYYY")}.`,
        });
      }

      // Al pasar a GLOBAL, aseguramos limpiar campos de rango y técnico
      updateData.fecha = fechaCL.toDate();
      updateData.desde = null;
      updateData.hasta = null;
      updateData.tecnico_id = null;
      updateData.motivo = buildMotivo(tipo);

      await prisma.disponibilidad_excepcion.update({
        where: { id: BigInt(id) },
        data: updateData,
      });

      // Desactivar slots del día (si existen)
      await prisma.disponibilidad_mensual.updateMany({
        where: {
          fecha: {
            gte: fechaCL.toDate(),
            lt: fechaCL.add(1, "day").startOf("day").toDate(),
          },
        },
        data: { activo: false, excepcion_id: BigInt(id) },
      });

      return res.json({ ok: true, message: "Excepción global actualizada correctamente." });
    }

    // === CASO POR TÉCNICO === (vacaciones/licencia/permiso)
    if (!rango?.desde || !rango?.hasta) {
      return res.status(400).json({ error: "Debe indicar rango {desde, hasta}" });
    }
    const desdeCL = toDay(rango.desde);
    const hastaCL = toDay(rango.hasta);
    if (hastaCL.isBefore(desdeCL)) {
      return res.status(400).json({ error: "La fecha 'hasta' no puede ser anterior a 'desde'" });
    }

    // Mantenemos el mismo técnico de la excepción original (tu modal no lo cambia)
    const tecnicoId = actual.tecnico_id;
    if (!tecnicoId) {
      // Si intentan convertir una excepción global previa a "por técnico", no hay técnico asociado.
      // O se prohíbe, o se permite pasando el mismo (como no viene en el body, retornamos error claro):
      return res.status(400).json({
        error: "No hay técnico asociado a esta excepción. Crea una nueva excepción por técnico o edita una que ya tenga técnico.",
      });
    }

    // 🔒 Duplicado exacto: mismo tipo + mismo técnico + mismo rango (excluye el propio id)
    const yaExiste = await prisma.disponibilidad_excepcion.findFirst({
      where: {
        id: { not: BigInt(id) },
        tipo,
        tecnico_id: tecnicoId,
        desde: desdeCL.toDate(),
        hasta: hastaCL.toDate(),
      },
      select: { id: true },
    });
    if (yaExiste) {
      return res.status(400).json({
        error: `Ya existe una excepción "${tipo}" para este técnico con el mismo rango ${desdeCL.format("DD/MM")} → ${hastaCL.format("DD/MM")}.`,
      });
    }

    updateData.fecha = null;
    updateData.desde = desdeCL.toDate();
    updateData.hasta = hastaCL.toDate();
    // mantenemos el técnico original
    updateData.tecnico_id = tecnicoId;
    // motivo consistente
    const tecnicoBasic = await prisma.usuario.findUnique({
      where: { id: tecnicoId },
      select: { nombre: true, apellido: true },
    });
    updateData.motivo = buildMotivo(tipo, tecnicoBasic ?? undefined);

    await prisma.disponibilidad_excepcion.update({
      where: { id: BigInt(id) },
      data: updateData,
    });

    // Desactivar slots afectados (si existen)
    await prisma.disponibilidad_mensual.updateMany({
      where: {
        tecnico_id: tecnicoId,
        fecha: {
          gte: desdeCL.toDate(),
          lt: hastaCL.add(1, "day").startOf("day").toDate(),
        },
      },
      data: { activo: false, excepcion_id: BigInt(id) },
    });

    return res.json({ ok: true, message: "Excepción por técnico actualizada correctamente." });
  } catch (err: any) {
    console.error("❌ Error al modificar excepción:", err);
    return res.status(400).json({
      error: err?.message || "Error al modificar excepción.",
    });
  }
});




//====================================================================================================
// Verificar variables de entorno al inicio
console.log("Verificando configuración...");
console.log("EMAIL_USER:", process.env.EMAIL_USER ? "Configurado" : "Falta");
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "Configurado" : "Falta");
console.log("FRONTEND_URL:", process.env.FRONTEND_URL || "Falta");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Configurado" : "Falta");


// ====================================================================================
// Configuración del puerto dinámico (Railway, Render, etc.)
// ====================================================================================
const PORT = Number(process.env.PORT) || 8080;
const server = createServer(app);
server.listen(PORT, () => {
  console.log(`API backend + WebSocket listening on port ${PORT}`);
});

global.chatWebSocketInstance = new ChatWebSocket(server);

// ====================================================================================
// CRON JOBS: Recordatorios automáticos de citas
// ====================================================================================
console.log('⏰ Configurando cron jobs para recordatorios de citas...');

// Ejecutar cada hora (minuto 0)
cron.schedule('0 * * * *', async () => {
  console.log('⏰ [CRON] Ejecutando verificación de recordatorios...');
  try {
    await enviarRecordatorios24Horas();
    await enviarRecordatorios2Horas();
  } catch (error) {
    console.error('❌ [CRON] Error en recordatorios:', error);
  }
});

console.log('✅ Cron jobs configurados: recordatorios cada hora');

// ====================================================================================
// Limpieza automática de tokens expirados
// ====================================================================================
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
        `Tokens expirados eliminados: ${total} (confirm: ${deletedConfirm.count}, reset: ${deletedReset.count})`
      );
    }
  } catch (err) {
    console.error("Error limpiando tokens expirados:", err);
  }
}, 5 * 60 * 1000); // cada 5 minutos

// ==========================================
// 💬 ENDPOINTS DE CHAT / MENSAJERÍA
// ==========================================

// Obtener todas las conversaciones del usuario logueado
app.get('/conversaciones', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const conversaciones = await prisma.conversacion.findMany({
      where: {
        participante_conversacion: {
          some: {
            usuario_id: BigInt(userId)
          }
        }
      },
      include: {
        participante_conversacion: {
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                email: true,
                rol: { select: { nombre: true } }
              }
            }
          }
        },
        mensaje: {
          where: {
            eliminado_en: null
          },
          orderBy: {
            creado_en: 'desc'
          },
          take: 1,
          select: {
            cuerpo: true,
            creado_en: true,
            remitente_id: true
          }
        }
      },
      orderBy: {
        fecha_creacion: 'desc'
      }
    });

    const conversacionesFormatted = conversaciones.map(conv => {
      // Obtener el otro participante (no el usuario logueado)
      const otroParticipante = conv.participante_conversacion.find(
        p => Number(p.usuario_id) !== Number(userId)
      );

      return {
        id: Number(conv.id),
        tipo: conv.tipo,
        ultimoMensaje: conv.mensaje[0] ? {
          cuerpo: conv.mensaje[0].cuerpo,
          fecha: conv.mensaje[0].creado_en,
          esMio: Number(conv.mensaje[0].remitente_id) === Number(userId)
        } : null,
        otroUsuario: otroParticipante ? {
          id: Number(otroParticipante.usuario.id),
          nombre: otroParticipante.usuario.nombre,
          apellido: otroParticipante.usuario.apellido,
          email: otroParticipante.usuario.email,
          rol: otroParticipante.usuario.rol?.nombre || null
        } : null,
        fechaCreacion: conv.fecha_creacion
      };
    });

    res.json(toJSONSafe(conversacionesFormatted));
  } catch (err) {
    console.error('Error al obtener conversaciones:', err);
    res.status(500).json({ error: 'Error al obtener conversaciones' });
  }
});

// Obtener mensajes de una conversación específica
app.get('/conversaciones/:id/mensajes', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const conversacionId = BigInt(req.params.id);

    // Verificar que el usuario sea participante de la conversación
    const participante = await prisma.participante_conversacion.findFirst({
      where: {
        conversacion_id: conversacionId,
        usuario_id: BigInt(userId)
      }
    });

    if (!participante) {
      return res.status(403).json({ error: 'No tienes acceso a esta conversación' });
    }

    const mensajes = await prisma.mensaje.findMany({
      where: {
        conversacion_id: conversacionId,
        eliminado_en: null
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        }
      },
      orderBy: {
        creado_en: 'asc'
      }
    });

    const mensajesFormatted = mensajes.map(msg => ({
      id: Number(msg.id),
      cuerpo: msg.cuerpo,
      remitenteId: Number(msg.remitente_id),
      remitente: {
        id: Number(msg.usuario.id),
        nombre: msg.usuario.nombre,
        apellido: msg.usuario.apellido
      },
      creadoEn: msg.creado_en,
      editadoEn: msg.editado_en
    }));

    res.json(toJSONSafe(mensajesFormatted));
  } catch (err) {
    console.error('❌ Error al obtener mensajes:', err);
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
});

// Eliminar todos los mensajes de una conversación (limpiar historial)
app.delete('/conversaciones/:id/mensajes', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const conversacionId = BigInt(req.params.id);

    // Verificar que el usuario sea participante de la conversación
    const participante = await prisma.participante_conversacion.findFirst({
      where: {
        conversacion_id: conversacionId,
        usuario_id: BigInt(userId)
      }
    });

    if (!participante) {
      return res.status(403).json({ error: 'No tienes acceso a esta conversación' });
    }

    // Soft delete: marcar mensajes como eliminados
    const result = await prisma.mensaje.updateMany({
      where: {
        conversacion_id: conversacionId,
        eliminado_en: null
      },
      data: {
        eliminado_en: new Date()
      }
    });

    res.json({ 
      ok: true, 
      mensajesEliminados: Number(result.count) 
    });
  } catch (err) {
    console.error('❌ Error al eliminar mensajes:', err);
    res.status(500).json({ error: 'Error al eliminar mensajes' });
  }
});

// Crear o obtener conversación con otro usuario
app.post('/conversaciones', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRol = (req as any).user.rol;
    const { otroUsuarioId } = req.body;

    if (!otroUsuarioId) {
      return res.status(400).json({ error: 'Se requiere otroUsuarioId' });
    }

    // Verificar que el otro usuario existe
    const otroUsuario = await prisma.usuario.findUnique({
      where: { id: BigInt(otroUsuarioId) },
      include: { rol: true }
    });

    if (!otroUsuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Validar permisos de chat
    if (userRol === 'cliente') {
      // Clientes solo pueden chatear con admins o jardineros
      if (!['admin', 'jardinero'].includes(otroUsuario.rol?.codigo)) {
        return res.status(403).json({ error: 'No tienes permiso para iniciar conversación con este usuario' });
      }
    }
    // Admins y jardineros pueden chatear con cualquiera

    // Buscar si ya existe una conversación entre estos dos usuarios
    const conversacionExistente = await prisma.conversacion.findFirst({
      where: {
        tipo: 'directo',
        participante_conversacion: {
          every: {
            OR: [
              { usuario_id: BigInt(userId) },
              { usuario_id: BigInt(otroUsuarioId) }
            ]
          }
        }
      },
      include: {
        participante_conversacion: {
          where: {
            OR: [
              { usuario_id: BigInt(userId) },
              { usuario_id: BigInt(otroUsuarioId) }
            ]
          }
        }
      }
    });

    // Si existe y tiene exactamente 2 participantes (los dos usuarios), devolver esa conversación
    if (conversacionExistente && conversacionExistente.participante_conversacion.length === 2) {
      return res.json({ 
        id: Number(conversacionExistente.id),
        mensaje: 'Conversación ya existe'
      });
    }

    // Crear nueva conversación
    const nuevaConversacion = await prisma.conversacion.create({
      data: {
        tipo: 'directo',
        participante_conversacion: {
          create: [
            {
              usuario_id: BigInt(userId),
              rol_participante: 'miembro'
            },
            {
              usuario_id: BigInt(otroUsuarioId),
              rol_participante: 'miembro'
            }
          ]
        }
      }
    });

    res.json({
      id: Number(nuevaConversacion.id),
      mensaje: 'Conversación creada exitosamente'
    });
  } catch (err) {
    console.error('❌ Error al crear conversación:', err);
    res.status(500).json({ error: 'Error al crear conversación' });
  }
});

// Enviar un mensaje
app.post('/mensajes', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { conversacionId, cuerpo } = req.body;

    if (!conversacionId || !cuerpo) {
      return res.status(400).json({ error: 'Se requiere conversacionId y cuerpo' });
    }

    // Verificar que el usuario sea participante de la conversación
    const participante = await prisma.participante_conversacion.findFirst({
      where: {
        conversacion_id: BigInt(conversacionId),
        usuario_id: BigInt(userId)
      }
    });

    if (!participante) {
      return res.status(403).json({ error: 'No tienes acceso a esta conversación' });
    }

    // Crear el mensaje
    const nuevoMensaje = await prisma.mensaje.create({
      data: {
        conversacion_id: BigInt(conversacionId),
        remitente_id: BigInt(userId),
        cuerpo: cuerpo
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        }
      }
    });

    const mensajeFormatted = {
      id: Number(nuevoMensaje.id),
      cuerpo: nuevoMensaje.cuerpo,
      remitenteId: Number(nuevoMensaje.remitente_id),
      remitente: {
        id: Number(nuevoMensaje.usuario.id),
        nombre: nuevoMensaje.usuario.nombre,
        apellido: nuevoMensaje.usuario.apellido
      },
      creadoEn: nuevoMensaje.creado_en,
      conversacionId: Number(nuevoMensaje.conversacion_id)
    };

    // Broadcast por WebSocket para notificar a los clientes en tiempo real
    if (global.chatWebSocketInstance) {
      global.chatWebSocketInstance.broadcast(
        JSON.stringify({ tipo: 'mensaje', ...mensajeFormatted })
      );
    }

    // Enviar push notification al destinatario
    // Obtener el otro participante de la conversación
    const otrosParticipantes = await prisma.participante_conversacion.findMany({
      where: {
        conversacion_id: BigInt(conversacionId),
        usuario_id: {
          not: BigInt(userId)
        }
      },
      include: {
        usuario: {
          select: {
            email: true,
            nombre: true,
            apellido: true
          }
        }
      }
    });

    // Enviar push notification a cada destinatario
    for (const participante of otrosParticipantes) {
      const nombreRemitente = `${nuevoMensaje.usuario.nombre} ${nuevoMensaje.usuario.apellido}`;
      
      enviarNotificacionPush(
        participante.usuario.email,
        nombreRemitente,
        cuerpo,
        { conversacionId: Number(conversacionId) }
      ).catch(err => {
        console.error('Error enviando push notification:', err);
      });
    }

    res.json(toJSONSafe(mensajeFormatted));
  } catch (err) {
    console.error('❌ Error al enviar mensaje:', err);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
});

// Buscar usuarios para iniciar conversación
app.get('/usuarios/buscar', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRol = (req as any).user.rol;
    const { query, rol } = req.query;

    const whereClause: any = {
      id: {
        not: BigInt(userId) // Excluir al usuario actual
      },
      activo: true
    };

    // Aplicar restricciones de permisos
    if (userRol === 'cliente') {
      // Clientes solo ven admins y jardineros
      whereClause.rol = {
        codigo: { in: ['admin', 'jardinero'] }
      };
    }
    // Admins y jardineros ven a todos

    // Si se especifica un rol, filtrar por él (pero respetando permisos)
    if (rol) {
      const rolStr = String(rol).toLowerCase();
      // permiso: clientes sólo pueden buscar admins y jardineros (aceptamos código o nombre)
      if (userRol === 'cliente' && !['admin', 'jardinero'].includes(rolStr)) {
        return res.status(403).json({ error: 'No tienes permiso para buscar este tipo de usuarios' });
      }
      // Filtrar por código o por nombre del rol (insensible a mayúsculas)
      whereClause.rol = {
        OR: [
          { codigo: { equals: rolStr, mode: 'insensitive' } },
          { nombre: { contains: rolStr, mode: 'insensitive' } }
        ]
      };
    }

    // Si hay búsqueda por texto
    if (query && typeof query === 'string') {
      whereClause.OR = [
        { nombre: { contains: query, mode: 'insensitive' } },
        { apellido: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } }
      ];
    }

    const usuarios = await prisma.usuario.findMany({
      where: whereClause,
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        rol: {
          select: {
            codigo: true,
            nombre: true
          }
        }
      },
      take: 20
    });

    const usuariosFormatted = usuarios.map(u => ({
      id: Number(u.id),
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email,
      rol: u.rol ? u.rol.nombre : null
    }));

    res.json(toJSONSafe(usuariosFormatted));
  } catch (err) {
    console.error('❌ Error al buscar usuarios:', err);
    res.status(500).json({ error: 'Error al buscar usuarios' });
  }
});

// PUBLIC: listar jardineros activos (sin autenticación)
app.get('/public/jardineros', async (_req: Request, res: Response) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: {
        activo: true,
        OR: [
          { rol: { codigo: { equals: 'jardinero', mode: 'insensitive' } } },
          { rol: { nombre: { contains: 'jardinero', mode: 'insensitive' } } }
        ]
      },
      select: { id: true, nombre: true, apellido: true, email: true, rol: { select: { codigo: true, nombre: true } } }
    })

    const usuariosFormatted = usuarios.map(u => ({
      id: Number(u.id),
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email,
      rol: u.rol ? (u.rol.nombre ?? u.rol.codigo) : null
    }))

    res.json(toJSONSafe(usuariosFormatted))
  } catch (err) {
    console.error('❌ Error al listar jardineros públicos:', err)
    res.status(500).json({ error: 'Error al listar jardineros' })
  }
})


app.post("/payments/webpay/create", async (req, res) => {
  try {
    const { buyOrder, sessionId, amount, returnUrl } = req.body;

    const response = await webpayTx.create(
      buyOrder || `order-${Date.now()}`,
      sessionId || `session-${Date.now()}`,
      amount || 1000,
      returnUrl || "http://localhost:3000/webpay/return"
    );

    res.json({
      url: response.url,
      token: response.token,
    });
  } catch (err: any) {
    console.error("[Webpay create]", err);
    res.status(500).json({ error: "Error creando transacción", detail: err.message });
  }
});

app.post("/payments/webpay/commit", async (req, res) => {
  try {
    const { token_ws } = req.body;
    if (!token_ws) return res.status(400).json({ error: "Falta token_ws" });

    const result = await webpayTx.commit(token_ws);

    // Si la transacción fue autorizada, insertar pago en BD y actualizar cita
    if (result.status === 'AUTHORIZED') {
      try {
        // Extraer cita_id del buy_order (formato: cita-{id})
        const buyOrderParts = result.buy_order?.split('-');
        if (buyOrderParts && buyOrderParts[0] === 'cita' && buyOrderParts[1]) {
          const citaId = BigInt(buyOrderParts[1]);

          // Buscar la cita
          const cita = await prisma.cita.findUnique({
            where: { id: citaId },
            select: { id: true, cliente_id: true, estado: true, precio_aplicado: true }
          });

          if (cita) {
            // Insertar el pago
            const pago = await prisma.pago.create({
              data: {
                cita_id: citaId,
                usuario_id: cita.cliente_id,
                metodo: 'webpay', // Método de pago Webpay
                estado: 'aprobado',
                monto_clp: result.amount,
                flow_order_id: result.buy_order,
                flow_token: token_ws,
                flow_status: result.status,
                flow_payload: result
              }
            });

            // Actualizar estado de la cita si estaba pendiente
            if (cita.estado === 'pendiente') {
              await prisma.cita.update({
                where: { id: citaId },
                data: { estado: 'confirmada' }
              });
            }

            console.log(`[Webpay commit] Pago insertado: ${pago.id}, Cita actualizada: ${citaId}`);
          } else {
            console.error(`[Webpay commit] Cita no encontrada: ${citaId}`);
          }
        } else {
          console.error(`[Webpay commit] Formato buy_order inválido: ${result.buy_order}`);
        }
      } catch (dbErr: any) {
        console.error("[Webpay commit] Error en BD:", dbErr);
        // No fallar la respuesta, solo loggear
      }
    }

    res.json(result);
  } catch (err: any) {
    console.error("[Webpay commit]", err);
    res.status(500).json({ error: "Error confirmando transacción", detail: err.message });
  }
});

// Obtener lista de productos/insumos disponibles
app.get("/productos", authMiddleware, async (req, res) => {
  try {
    const productos = await prisma.producto.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        precio_unitario: true,
        stock_actual: true
      },
      orderBy: { nombre: 'asc' }
    });

    res.json({ productos: toJSONSafe(productos) });
  } catch (err: any) {
    console.error("Error obteniendo productos:", err);
    res.status(500).json({ error: "Error interno al obtener productos" });
  }
});

// Completar cita con productos
app.post("/cita/:id/completar", authMiddleware, async (req, res) => {
  try {
    const userData = (req as any).user;
    const { id } = req.params;
    const { productos } = req.body; // Array de { producto_id, cantidad }

    // Verificar que la cita existe y pertenece al técnico
    const cita = await prisma.cita.findFirst({
      where: { 
        id: BigInt(id), 
        tecnico_id: BigInt(userData.id),
        estado: 'confirmada'
      }
    });

    if (!cita) {
      return res.status(404).json({ error: 'Cita no encontrada o no puedes completarla' });
    }

    // Calcular el total de productos y validar stock
    let totalProductos = 0;
    const productosDetalle = [];
    const visitaProductosData = []; // Array para almacenar los datos de visita_producto

    if (productos && Array.isArray(productos)) {
      for (const item of productos) {
        const producto = await prisma.producto.findUnique({
          where: { id: BigInt(item.producto_id) }
        });

        if (!producto || !producto.activo) {
          return res.status(400).json({ error: `Producto ${item.producto_id} no encontrado o inactivo` });
        }

        if (producto.stock_actual !== null && producto.stock_actual < item.cantidad) {
          return res.status(400).json({ error: `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock_actual}` });
        }

        const precioUnitario = producto.precio_unitario ? Number(producto.precio_unitario) : 0;
        const subtotal = precioUnitario * item.cantidad;
        totalProductos += subtotal;

        productosDetalle.push({
          producto_id: item.producto_id,
          nombre: producto.nombre,
          precio_unitario: precioUnitario,
          cantidad: item.cantidad,
          subtotal: subtotal
        });

        // Preparar datos para visita_producto con costo_unitario
        visitaProductosData.push({
          visita_id: 0, // Se actualizará después de crear la visita
          producto_id: BigInt(item.producto_id),
          cantidad: item.cantidad,
          costo_unitario: precioUnitario // Guardar el precio unitario en ese momento
        });
      }
    }

    // Actualizar el precio aplicado de la cita sumando los productos
    const precioBase = cita.precio_aplicado ? parseFloat(cita.precio_aplicado.toString()) : 0;
    const nuevoPrecioTotal = precioBase + totalProductos;

    // Crear o actualizar la visita
    const visitaExistente = await prisma.visita.findFirst({
      where: { cita_id: BigInt(id) }
    });

    let visita;
    if (visitaExistente) {
      // Actualizar visita existente
      visita = await prisma.visita.update({
        where: { id: visitaExistente.id },
        data: {
          estado: 'completada',
          fin: new Date(),
          fecha_actualizacion: new Date()
        }
      });
    } else {
      // Crear nueva visita
      visita = await prisma.visita.create({
        data: {
          cita_id: BigInt(id),
          tecnico_id: BigInt(userData.id),
          estado: 'completada',
          inicio: new Date(cita.fecha_hora),
          fin: new Date(),
          resumen: `Servicio completado con ${productos?.length || 0} productos utilizados`
        }
      });
    }

    // Crear registros en visita_producto
    if (productos && productos.length > 0) {
      // Actualizar el visita_id en todos los registros
      visitaProductosData.forEach(item => {
        item.visita_id = Number(visita.id);
      });

      await prisma.visita_producto.createMany({
        data: visitaProductosData
      });

      // Actualizar stock de productos
      for (const item of productos) {
        await prisma.producto.update({
          where: { id: BigInt(item.producto_id) },
          data: {
            stock_actual: {
              decrement: item.cantidad
            }
          }
        });
      }
    }

    // Actualizar el estado de la cita a 'realizada' y el precio total
    await prisma.cita.update({
      where: { id: BigInt(id) },
      data: {
        estado: 'realizada',
        precio_aplicado: nuevoPrecioTotal,
        fecha_actualizacion: new Date()
      }
    });

    res.json({ 
      message: "Cita completada exitosamente",
      precio_total: nuevoPrecioTotal,
      productos_utilizados: productosDetalle
    });

  } catch (err: any) {
    console.error("Error completando cita:", err);
    res.status(500).json({ error: "Error interno al completar la cita" });
  }
});
// ==========================================
// ==========================================
// OBTENER TODAS LAS CITAS (PARA ADMIN)
// ==========================================
app.get("/citas/all", async (req, res) => {
  try {
    const citas = await prisma.cita.findMany({
      include: {
        servicio: { select: { nombre: true, precio_clp: true } },
        usuario_cita_cliente_idTousuario: {
          select: { id: true, nombre: true, apellido: true, email: true },
        },
      },
      orderBy: { fecha_hora: "asc" },
    });

    const formatted = citas.map((cita) => ({
      id: Number(cita.id),
      fecha_hora: cita.fecha_hora,
      estado: cita.estado,
      precio_aplicado: cita.precio_aplicado ? Number(cita.precio_aplicado) : null,
      notas_cliente: cita.notas_cliente,
      nombre_servicio_snapshot: cita.nombre_servicio_snapshot,
      servicio: cita.servicio
        ? {
            nombre: cita.servicio.nombre,
            precio_clp: Number(cita.servicio.precio_clp),
          }
        : null,
      cliente: cita.usuario_cita_cliente_idTousuario
        ? {
            id: Number(cita.usuario_cita_cliente_idTousuario.id),
            nombre: cita.usuario_cita_cliente_idTousuario.nombre,
            apellido: cita.usuario_cita_cliente_idTousuario.apellido,
            email: cita.usuario_cita_cliente_idTousuario.email,
          }
        : null,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("❌ Error al obtener todas las citas:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// OBTENER CITAS POR EMAIL DEL CLIENTE
// ==========================================
app.get("/citas/:email", async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ error: "Debe proporcionar un correo electrónico" });
    }

    // Buscar usuario por correo
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Buscar citas asociadas al cliente
    const citas = await prisma.cita.findMany({
      where: { cliente_id: BigInt(usuario.id) },
      include: {
        servicio: {
          select: {
            nombre: true,
            precio_clp: true,
          },
        },
      },
      orderBy: { fecha_hora: "asc" },
    });

    // Si no hay citas
    if (!citas || citas.length === 0) {
      return res.status(200).json([]);
    }

    // Formatear resultado para el frontend
    const citasFormatted = citas.map((cita) => ({
      id: Number(cita.id),
      fecha_hora: cita.fecha_hora,
      estado: cita.estado,
      precio_aplicado: cita.precio_aplicado ? Number(cita.precio_aplicado) : null,
      notas_cliente: cita.notas_cliente || null,
      nombre_servicio_snapshot: cita.nombre_servicio_snapshot || null,
      servicio: cita.servicio
        ? {
            nombre: cita.servicio.nombre,
            precio_clp: Number(cita.servicio.precio_clp),
          }
        : null,
    }));

    res.json(citasFormatted);
  } catch (error) {
    console.error("❌ Error en /citas/:email:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ==========================================
// CANCELAR UNA CITA (CAMBIAR ESTADO A CANCELADA)
// ==========================================
app.put("/citas/:id/cancelar", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Debe proporcionar el ID de la cita" });
    }

    // Verificar que la cita existe
    const citaExistente = await prisma.cita.findUnique({
      where: { id: BigInt(id) },
    });

    if (!citaExistente) {
      return res.status(404).json({ error: "Cita no encontrada" });
    }

    // Verificar que la cita no esté ya cancelada o realizada
    if (citaExistente.estado === "cancelada") {
      return res.status(400).json({ error: "La cita ya está cancelada" });
    }

    if (citaExistente.estado === "realizada") {
      return res.status(400).json({ error: "No se puede cancelar una cita ya realizada" });
    }

    // Actualizar el estado a cancelada
    const citaActualizada = await prisma.cita.update({
      where: { id: BigInt(id) },
      data: { estado: "cancelada" },
    });

    console.log(`✅ Cita #${id} cancelada correctamente`);

    // Enviar notificación push al cliente sobre la cancelación
    setImmediate(() => {
      notificarCitaCancelada(BigInt(id));
    });

    res.json({
      success: true,
      message: "Cita cancelada correctamente",
      cita: {
        id: Number(citaActualizada.id),
        estado: citaActualizada.estado,
      },
    });
  } catch (error) {
    console.error("❌ Error al cancelar cita:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ==========================================
// OBTENER INFORMACIÓN DEL USUARIO POR SUPABASE AUTH_ID
// ==========================================
app.get("/usuario/:userId/info", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "Debe proporcionar un ID de usuario" });
    }

    console.log(`👤 Buscando info para usuario ID (Supabase): ${userId}`);

    // Como no existe auth_id, buscar por email que viene en el parámetro
    // O mejor aún, usar el endpoint con email directamente
    return res.status(400).json({ 
      error: "Use el endpoint /usuario/info/email/:email en su lugar" 
    });
  } catch (error) {
    console.error("❌ Error en /usuario/:userId/info:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ==========================================
// OBTENER INFORMACIÓN DEL USUARIO POR EMAIL
// ==========================================
app.get("/usuario/info/email/:email", async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ error: "Debe proporcionar un email" });
    }

    console.log(`👤 Buscando info para usuario email: ${email}`);

    // Buscar usuario por email
    const usuario = await prisma.usuario.findUnique({
      where: { email: decodeURIComponent(email) },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        telefono: true,
        rol: {
          select: {
            nombre: true,
            codigo: true,
          },
        },
      },
    });

    if (!usuario) {
      console.log(`❌ Usuario no encontrado con email: ${email}`);
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    console.log(`✅ Usuario encontrado: ${usuario.nombre} ${usuario.apellido}`);

    // Formatear respuesta
    const userInfo = {
      id: Number(usuario.id),
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      telefono: usuario.telefono,
      rol: usuario.rol ? usuario.rol.nombre : null,
      rolCodigo: usuario.rol ? usuario.rol.codigo : null,
    };

    res.json(userInfo);
  } catch (error) {
    console.error("❌ Error en /usuario/info/email/:email:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ==========================================
// OBTENER CITAS DEL USUARIO AUTENTICADO (ALTERNATIVO)
// ==========================================
app.get("/api/mis-citas", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    console.log("📋 Buscando citas para usuario ID:", userId);

    // Buscar citas asociadas al cliente
    const citas = await prisma.cita.findMany({
      where: { cliente_id: BigInt(userId) },
      include: {
        servicio: {
          select: {
            nombre: true,
            precio_clp: true,
          },
        },
      },
      orderBy: { fecha_hora: "asc" },
    });

    console.log(`✅ Encontradas ${citas.length} citas`);

    // Si no hay citas
    if (!citas || citas.length === 0) {
      return res.status(200).json([]);
    }

    // Formatear resultado para el frontend
    const citasFormatted = citas.map((cita) => ({
      id: Number(cita.id),
      fecha_hora: cita.fecha_hora,
      estado: cita.estado,
      precio_aplicado: cita.precio_aplicado ? Number(cita.precio_aplicado) : null,
      notas_cliente: cita.notas_cliente || null,
      nombre_servicio_snapshot: cita.nombre_servicio_snapshot || null,
      servicio: cita.servicio
        ? {
            nombre: cita.servicio.nombre,
            precio_clp: Number(cita.servicio.precio_clp),
          }
        : null,
    }));

    res.json(citasFormatted);
  } catch (error) {
    console.error("❌ Error en /api/mis-citas:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

//========================================================================
//COMENTARIOS CLIENTE
//========================================================================

//  Crear comentario (con hora local devuelta)


import tz from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(tz);


app.post("/comentarios", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { contenido } = req.body;
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: "No autorizado. Debes iniciar sesión." });
    }

    // 🔒 Solo clientes pueden comentar
    const usuarioDB = await prisma.usuario.findUnique({
      where: { id: BigInt(user.id) },
      select: { nombre: true, apellido: true, rol: { select: { codigo: true } } },
    });

    if (!usuarioDB) return res.status(404).json({ error: "Usuario no encontrado." });

    if (usuarioDB.rol.codigo !== "cliente") {
      return res.status(403).json({ error: "Solo los clientes pueden dejar comentarios." });
    }

    if (!contenido || contenido.trim() === "") {
      return res.status(400).json({ error: "El comentario no puede estar vacío." });
    }

    // Hora local Chile
    const creadoEnLocal = dayjs().tz("America/Santiago");

    const nuevoComentario = await prisma.comentario.create({
      data: {
        usuario_id: BigInt(user.id),
        contenido,
        activo: true,
        creado_en: creadoEnLocal.toDate(),
      },
    });

    const fechaFormateada = creadoEnLocal.format("DD-MM-YYYY");

    const comentarioLocal = {
      ...toJSONSafe(nuevoComentario),
      usuario: usuarioDB,
      fecha: fechaFormateada,
    };

    res.status(201).json({
      message: "Comentario creado correctamente.",
      comentario: comentarioLocal,
    });
  } catch (error) {
    console.error("❌ Error al crear comentario:", error);
    res.status(500).json({ error: "Error interno al crear comentario." });
  }
});




//listar todos los comentarios 

app.get("/comentarios", async (req: Request, res: Response) => {
  try {
    // Solo mostrar comentarios activos
    const comentarios = await prisma.comentario.findMany({
      where: { activo: true },
      orderBy: { creado_en: "desc" },
      include: {
        usuario: {
          select: { nombre: true, apellido: true },
        },
      },
    });

    // Convertimos formato para el frontend
    const data = comentarios.map((c) => ({
      id: Number(c.id),
      usuario_id: Number(c.usuario_id), // 🔥 necesario para el front
      contenido: c.contenido,
      nombre: c.usuario?.nombre || "Usuario",
      apellido: c.usuario?.apellido || "",
      fecha: c.creado_en
        ? new Date(c.creado_en)
            .toLocaleDateString("es-CL", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              timeZone: "America/Santiago",
            })
            .replace(/\//g, "-") // convierte 04/11/2025 → 04-11-2025
        : "",
    }));

    // ✅ Enviamos respuesta segura (sin BigInt)
    res.json(JSON.parse(JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v))));
  } catch (error) {
    console.error("❌ Error al obtener comentarios:", error);
    res.status(500).json({ error: "Error al obtener comentarios" });
  }
});


// ====================
//  EDITAR COMENTARIO (solo el autor puede hacerlo)
// ====================

app.put("/comentarios/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { contenido } = req.body;
    const user = (req as any).user;

    if (!contenido?.trim()) {
      return res.status(400).json({ error: "El comentario no puede estar vacío." });
    }

    const usuarioDB = await prisma.usuario.findUnique({
      where: { id: BigInt(user.id) },
      select: { rol: { select: { codigo: true } } },
    });

    if (!usuarioDB || usuarioDB.rol.codigo !== "cliente") {
      return res.status(403).json({ error: "Solo los clientes pueden editar comentarios." });
    }

    const comentario = await prisma.comentario.findUnique({
      where: { id: BigInt(id) },
    });

    if (!comentario) {
      return res.status(404).json({ error: "Comentario no encontrado." });
    }

    if (comentario.usuario_id !== BigInt(user.id)) {
      return res.status(403).json({ error: "No tienes permiso para modificar este comentario." });
    }

    const actualizado = await prisma.comentario.update({
      where: { id: BigInt(id) },
      data: { contenido },
    });

    res.json({
      message: "Comentario actualizado correctamente ✅",
      comentario: toJSONSafe(actualizado),
    });
  } catch (error) {
    console.error("❌ Error al editar comentario:", error);
    res.status(500).json({ error: "Error al editar comentario." });
  }
});




// ====================
//  ELIMINAR COMENTARIO (solo el autor puede hacerlo)
// ====================

app.delete("/comentarios/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const usuarioDB = await prisma.usuario.findUnique({
      where: { id: BigInt(user.id) },
      select: { rol: { select: { codigo: true } } },
    });

    if (!usuarioDB || usuarioDB.rol.codigo !== "cliente") {
      return res.status(403).json({ error: "Solo los clientes pueden eliminar comentarios." });
    }

    const comentario = await prisma.comentario.findUnique({
      where: { id: BigInt(id) },
    });

    if (!comentario) {
      return res.status(404).json({ error: "Comentario no encontrado." });
    }

    if (comentario.usuario_id !== BigInt(user.id)) {
      return res.status(403).json({ error: "No tienes permiso para eliminar este comentario." });
    }

    await prisma.comentario.delete({
      where: { id: BigInt(id) },
    });

    res.json({ message: "Comentario eliminado correctamente ✅" });
  } catch (error) {
    console.error("❌ Error al eliminar comentario:", error);
    res.status(500).json({ error: "Error al eliminar comentario." });
  }
});


//========================================================================
//GESTION DE COMENTARIOS ADMIN
//========================================================================

// =======================================
// LISTAR COMENTARIOS (PANEL ADMIN)
// =======================================
app.get("/admin/comentarios", verifyAdmin, async (_req, res) => {
  try {
    const comentarios = await prisma.comentario.findMany({
      orderBy: { creado_en: "desc" },
      include: {
        usuario: {
          select: { nombre: true, apellido: true, email: true },
        },
      },
    });

    const comentariosSafe = comentarios.map((c) => ({
      id: Number(c.id),
      usuario_id: Number(c.usuario_id),
      nombre: c.usuario?.nombre || "Usuario",
      apellido: c.usuario?.apellido || "",
      email: c.usuario?.email || "",
      contenido: c.contenido,
      activo: c.activo,
      fecha: c.creado_en
        ? new Date(c.creado_en)
            .toLocaleDateString("es-CL", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              timeZone: "America/Santiago",
            })
            .replace(/\//g, "-")
        : "",
    }));

    res.json(toJSONSafe(comentariosSafe));
  } catch (err: any) {
    console.error("❌ Error al listar comentarios:", err.message);
    res.status(500).json({ error: "Error al listar comentarios" });
  }
});


// =======================================
// CAMBIAR ESTADO DE COMENTARIO
// =======================================
app.put("/admin/comentarios/:id/estado", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    const comentario = await prisma.comentario.findUnique({
      where: { id: BigInt(id) },
    });

    if (!comentario)
      return res.status(404).json({ error: "Comentario no encontrado." });

    const actualizado = await prisma.comentario.update({
      where: { id: BigInt(id) },
      data: { activo },
    });

    res.json({
      message: `Comentario ${activo ? "activado" : "desactivado"} correctamente ✅`,
      comentario: toJSONSafe(actualizado),
    });
  } catch (err: any) {
    console.error("❌ Error al cambiar estado:", err.message);
    res.status(500).json({ error: "Error al cambiar estado del comentario" });
  }
});

// =======================================
// ELIMINAR COMENTARIO (ADMIN)
// =======================================
app.delete("/admin/comentarios/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const comentario = await prisma.comentario.findUnique({
      where: { id: BigInt(id) },
    });

    if (!comentario)
      return res.status(404).json({ error: "Comentario no encontrado." });

    await prisma.comentario.delete({ where: { id: BigInt(id) } });

    res.json({ message: "Comentario eliminado correctamente 🗑️" });
  } catch (err: any) {
    console.error("❌ Error al eliminar comentario:", err.message);
    res.status(500).json({ error: "Error al eliminar comentario" });
  }
});

// =======================================
// 📊 R E P O R T E S   A D M I N
// =======================================

//REPORTE FINANZAS MENSUALES

app.get("/admin/reportes/finanzas", verifyAdmin, async (req, res) => {
  try {
    let { mes } = req.query;

    if (!mes || !/^\d{4}-\d{2}$/.test(String(mes))) {
      return res.status(400).json({ error: "Debe enviar mes en formato YYYY-MM" });
    }

    const [year, month] = String(mes).split("-").map(Number);
    const inicio = new Date(year, month - 1, 1);
    const fin = new Date(year, month, 1);

    // Obtener pagos Webpay del mes
    const pagos = await prisma.pago.findMany({
      where: {
        metodo: "webpay",
        creado_en: { gte: inicio, lt: fin }
      },
      include: {
        cita: {
          include: {
            servicio: { select: { nombre: true } },
            usuario_cita_cliente_idTousuario: {
              select: { nombre: true, apellido: true, email: true }
            }
          }
        }
      },
      orderBy: { creado_en: "asc" }
    });

    const aprobados = pagos.filter(p => p.estado === "aprobado");
    const rechazados = pagos.filter(p => p.estado !== "aprobado");

    const totalRecaudado = aprobados.reduce((sum, p) => sum + Number(p.monto_clp), 0);
    const ticketPromedio = aprobados.length ? Math.round(totalRecaudado / aprobados.length) : 0;
    const maximo = aprobados.length ? Math.max(...aprobados.map(p => Number(p.monto_clp))) : 0;
    const minimo = aprobados.length ? Math.min(...aprobados.map(p => Number(p.monto_clp))) : 0;

    // Agrupación por día
    const diario: any = {};
    for (const pago of aprobados) {
      const fecha = pago.creado_en.toISOString().split("T")[0];
      if (!diario[fecha]) diario[fecha] = { pagos: 0, monto: 0 };
      diario[fecha].pagos++;
      diario[fecha].monto += Number(pago.monto_clp);
    }

    res.json(
      toJSONSafe({
        mes,
        resumen: {
          totalPagos: pagos.length,
          pagosAprobados: aprobados.length,
          pagosRechazados: rechazados.length,
          totalRecaudado,
          ticketPromedio,
          maximo,
          minimo
        },
        porDia: diario,
        detalle: pagos
      })
    );
  } catch (e) {
    console.error("❌ Error reporte financiero:", e);
    res.status(500).json({ error: "Error interno generando reporte financiero" });
  }
});

// EXPORTAR FINANZAS MENSUALES A PDF
import { PDFDocument, StandardFonts, rgb, Color } from "pdf-lib";

app.get("/admin/reportes/finanzas/pdf", verifyAdmin, async (req, res) => {
  try {
    const { mes } = req.query;
    if (!mes) return res.status(400).json({ error: "Mes requerido (YYYY-MM)" });

    const [year, month] = String(mes).split("-").map(Number);
    const inicio = new Date(year, month - 1, 1);
    const fin = new Date(year, month, 1);

    // =============================
    // 1. Obtener pagos
    // =============================
    const pagos = await prisma.pago.findMany({
      where: { metodo: "webpay", creado_en: { gte: inicio, lt: fin } },
      include: {
        cita: {
          include: {
            servicio: true,
            usuario_cita_cliente_idTousuario: true,
          },
        },
      },
      orderBy: { creado_en: "asc" },
    });

    // =============================
    // 2. RESUMEN
    // =============================
    const totalPagos = pagos.length;
    const pagosAprobados = pagos.filter((p) => p.estado === "aprobado").length;
    const pagosRechazados = totalPagos - pagosAprobados;

    const montosAprobados = pagos
      .filter((p) => p.estado === "aprobado")
      .map((p) => Number(p.monto_clp) || 0);

    const totalRecaudado = montosAprobados.reduce((a, b) => a + b, 0);
    const maximo = montosAprobados.length ? Math.max(...montosAprobados) : 0;
    const minimo = montosAprobados.length ? Math.min(...montosAprobados) : 0;
    const ticketPromedio =
      pagosAprobados ? Math.round(totalRecaudado / pagosAprobados) : 0;

    // =============================
    // 3. POR DÍA (TIPADO CORRECTO)
    // =============================
    const porDia: Record<string, { pagos: number; monto: number }> = {};

    pagos.forEach((p) => {
      const fecha = new Date(p.creado_en)
        .toLocaleDateString("es-CL")
        .replace(/\//g, "-");

      if (!porDia[fecha]) porDia[fecha] = { pagos: 0, monto: 0 };
      porDia[fecha].pagos++;
      porDia[fecha].monto += Number(p.monto_clp) || 0;
    });

    // =============================
    // 4. Crear PDF
    // =============================
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Tamaño A4: 595 x 842
    let page = pdfDoc.addPage([595, 842]);
    const margin = 40;
    let y = 800;
    let pageNumber = 1;
    const lineHeight = 16;

    const drawFooter = () => {
      page.drawText(`Página ${pageNumber}`, {
        x: 270,
        y: 20,
        size: 10,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
    };

    const checkPageBreak = () => {
      if (y < 80) {
        drawFooter();
        page = pdfDoc.addPage([595, 842]);
        y = 800;
        pageNumber++;
      }
    };

    const drawText = (
      txt: string,
      size: number = 12,
      color: Color = rgb(0, 0, 0),
      fontStyle = font
    ) => {
      page.drawText(txt, {
        x: margin,
        y,
        size,
        font: fontStyle,
        color,
      });
      y -= lineHeight;
    };

    // =============================
    // 5. HEADER
    // =============================
    drawText("CLEAN & GARDEN", 20, rgb(0, 0.4, 0), bold);
    drawText(`Reporte Financiero Mensual – ${mes}`, 14);

    page.drawLine({
      start: { x: margin, y: y - 6 },
      end: { x: 555, y: y - 6 },
      thickness: 1,
      color: rgb(0, 0.4, 0),
    });

    y -= 30;

    // =============================
    // 6. TABLA RESUMEN
    // =============================
    drawText("Resumen del mes", 14, rgb(0, 0.4, 0), bold);
    y -= 10;

    const resumen = [
      ["Pagos totales", totalPagos],
      ["Pagos aprobados", pagosAprobados],
      ["Pagos rechazados", pagosRechazados],
      ["Total recaudado", `$${totalRecaudado.toLocaleString("es-CL")}`],
      ["Monto promedio", `$${ticketPromedio.toLocaleString("es-CL")}`],
      ["Monto máximo", `$${maximo.toLocaleString("es-CL")}`],
      ["Monto mínimo", `$${minimo.toLocaleString("es-CL")}`],
    ];

    resumen.forEach(([label, val]) => {
      checkPageBreak();
      drawText(`${label}: ${val}`);
    });

    y -= 20;

    // =============================
    // 7. TABLA POR DÍA
    // =============================
    drawText("Recaudación por día", 14, rgb(0, 0.4, 0), bold);
    y -= 10;

    // Header tabla por día
    page.drawRectangle({
      x: margin,
      y: y - 2,
      width: 515,
      height: 18,
      color: rgb(0, 0.5, 0),
    });

    page.drawText("Fecha", { x: margin + 5, y, size: 11, color: rgb(1, 1, 1), font: bold });
    page.drawText("Pagos", { x: margin + 200, y, size: 11, color: rgb(1, 1, 1), font: bold });
    page.drawText("Monto", { x: margin + 300, y, size: 11, color: rgb(1, 1, 1), font: bold });

    y -= 22;

    const diasOrdenados = Object.keys(porDia).sort();

    diasOrdenados.forEach((fecha) => {
      const info = porDia[fecha];
      checkPageBreak();

      page.drawText(fecha, { x: margin + 5, y, size: 10 });
      page.drawText(String(info.pagos), { x: margin + 200, y, size: 10 });
      page.drawText(`$${info.monto.toLocaleString("es-CL")}`, {
        x: margin + 300,
        y,
        size: 10,
      });

      y -= 18;
    });

    y -= 20;

    // =============================
    // 8. DETALLE DE PAGOS (TABLA PRO)
    // =============================
    drawText("Detalle de pagos del mes", 14, rgb(0, 0.4, 0), bold);
    y -= 10;

    const th = {
      fecha: margin + 5,
      cliente: margin + 120,
      servicio: margin + 250,
      estado: margin + 360,
      monto: margin + 440,
    };

    // Encabezado
    page.drawRectangle({
      x: margin,
      y: y - 2,
      width: 515,
      height: 18,
      color: rgb(0, 0.5, 0),
    });

    page.drawText("Fecha", { x: th.fecha, y, size: 11, color: rgb(1, 1, 1), font: bold });
    page.drawText("Cliente", { x: th.cliente, y, size: 11, color: rgb(1, 1, 1), font: bold });
    page.drawText("Servicio", { x: th.servicio, y, size: 11, color: rgb(1, 1, 1), font: bold });
    page.drawText("Estado", { x: th.estado, y, size: 11, color: rgb(1, 1, 1), font: bold });
    page.drawText("Monto", { x: th.monto, y, size: 11, color: rgb(1, 1, 1), font: bold });

    y -= 22;

    pagos.forEach((p) => {
      checkPageBreak();

      const fecha = new Date(p.creado_en)
        .toLocaleString("es-CL", { timeZone: "America/Santiago" });

      const cliente = `${p.cita?.usuario_cita_cliente_idTousuario?.nombre ?? ""} ${p.cita?.usuario_cita_cliente_idTousuario?.apellido ?? ""}`;
      const servicio = p.cita?.servicio?.nombre ?? "-";
      const monto = `$${Number(p.monto_clp).toLocaleString("es-CL")}`;

      page.drawText(fecha, { x: th.fecha, y, size: 10 });
      page.drawText(cliente, { x: th.cliente, y, size: 10 });
      page.drawText(servicio, { x: th.servicio, y, size: 10 });
      page.drawText(p.estado, { x: th.estado, y, size: 10 });
      page.drawText(monto, { x: th.monto, y, size: 10 });

      y -= 18;
    });

    // Footer final
    drawFooter();

    // =============================
    // 9. Enviar PDF
    // =============================
    const pdfBytes = await pdfDoc.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=reporte-financiero-${mes}.pdf`
    );

    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error("❌ Error exportando PDF:", err);
    res.status(500).json({ error: "Error exportando PDF" });
  }
});

// EXPORTAR FINANZAS MENSUALES A EXCEL

import ExcelJS from "exceljs";

app.get("/admin/reportes/finanzas/excel", verifyAdmin, async (req, res) => {
  try {
    const { mes } = req.query;
    if (!mes) return res.status(400).json({ error: "Mes requerido (YYYY-MM)" });

    const [year, month] = String(mes).split("-").map(Number);
    const inicio = new Date(year, month - 1, 1);
    const fin = new Date(year, month, 1);

    const pagos = await prisma.pago.findMany({
      where: { metodo: "webpay", creado_en: { gte: inicio, lt: fin } },
      include: {
        cita: {
          include: {
            servicio: true,
            usuario_cita_cliente_idTousuario: true,
          },
        },
      },
      orderBy: { creado_en: "asc" },
    });

    // ======================
    // CALCULAR RESUMEN
    // ======================
    const totalPagos = pagos.length;
    const pagosAprobados = pagos.filter(p => p.estado === "aprobado").length;
    const pagosRechazados = totalPagos - pagosAprobados;

    const montosAprobados = pagos
      .filter(p => p.estado === "aprobado")
      .map(p => Number(p.monto_clp));

    const totalRecaudado = montosAprobados.reduce((a, b) => a + b, 0);
    const maximo = montosAprobados.length ? Math.max(...montosAprobados) : 0;
    const minimo = montosAprobados.length ? Math.min(...montosAprobados) : 0;
    const ticketPromedio = pagosAprobados ? Math.round(totalRecaudado / pagosAprobados) : 0;

    // ======================
    // AGRUPAR POR DÍA
    // ======================
    const porDia: Record<string, { pagos: number; monto: number }> = {};

    pagos.forEach(p => {
      const fechaKey = new Date(p.creado_en)
        .toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" })
        .replace(/\//g, "-");

      if (!porDia[fechaKey]) {
        porDia[fechaKey] = { pagos: 0, monto: 0 };
      }
      porDia[fechaKey].pagos++;
      porDia[fechaKey].monto += Number(p.monto_clp);
    });

    // ======================
    // CREAR EXCEL
    // ======================
    const wb = new ExcelJS.Workbook();
    wb.creator = "Clean & Garden";
    wb.created = new Date();

    // 🎨 ESTILOS Clean & Garden (compatibles 100% con TS)
    const headerStyle = {
      font: { bold: true, color: { argb: "FFFFFFFF" } },
      fill: {
        type: "pattern" as const,
        pattern: "solid" as const,
        fgColor: { argb: "FF1A6D27" }, // verde oscuro
      },
      alignment: { horizontal: "center" as const },
      border: {
        top: { style: "thin" as const },
        left: { style: "thin" as const },
        bottom: { style: "thin" as const },
        right: { style: "thin" as const },
      },
    };

    const border = {
      top: { style: "thin" as const },
      left: { style: "thin" as const },
      bottom: { style: "thin" as const },
      right: { style: "thin" as const },
    };

    // -----------------------------------------
    // HOJA 1 — RESUMEN
    // -----------------------------------------
    const resumenSheet = wb.addWorksheet("Resumen");

    resumenSheet.columns = [
      { header: "Métrica", key: "metrica", width: 30 },
      { header: "Valor", key: "valor", width: 25 },
    ];

    resumenSheet.addRows([
      ["Pagos Totales", totalPagos],
      ["Pagos Aprobados", pagosAprobados],
      ["Pagos Rechazados", pagosRechazados],
      ["Total Recaudado", `$${totalRecaudado.toLocaleString("es-CL")}`],
      ["Ticket Promedio", `$${ticketPromedio.toLocaleString("es-CL")}`],
      ["Monto Máximo", `$${maximo.toLocaleString("es-CL")}`],
      ["Monto Mínimo", `$${minimo.toLocaleString("es-CL")}`],
    ]);

    resumenSheet.getRow(1).eachCell((c: any) => c.style = { ...headerStyle } as any);

    resumenSheet.eachRow((row: any, idx: any) => {
      if (idx === 1) return;
      row.eachCell((c: any) => c.border = { ...border } as any);
    });

    // -----------------------------------------
    // HOJA 2 — RECAUDACIÓN POR DÍA
    // -----------------------------------------
    const diaSheet = wb.addWorksheet("Recaudación por día");

    diaSheet.columns = [
      { header: "Fecha", key: "fecha", width: 20 },
      { header: "Pagos", key: "pagos", width: 12 },
      { header: "Monto", key: "monto", width: 18 },
    ];

    Object.keys(porDia).forEach(fecha => {
      diaSheet.addRow({
        fecha,
        pagos: porDia[fecha].pagos,
        monto: porDia[fecha].monto,
      });
    });

    diaSheet.getRow(1).eachCell((c: any) => c.style = { ...headerStyle } as any);
    diaSheet.eachRow((row: any, idx: any) => {
      if (idx === 1) return;
      row.eachCell((c: any) => c.border = { ...border } as any);
    });

    // -----------------------------------------
    // HOJA 3 — DETALLE DE PAGOS
    // -----------------------------------------
    const detalleSheet = wb.addWorksheet("Detalle de pagos");

    detalleSheet.columns = [
      { header: "Fecha", key: "fecha", width: 25 },
      { header: "Cliente", key: "cliente", width: 30 },
      { header: "Servicio", key: "servicio", width: 25 },
      { header: "Estado", key: "estado", width: 15 },
      { header: "Monto", key: "monto", width: 15 },
    ];

    pagos.forEach(p => {
      detalleSheet.addRow({
        fecha: new Date(p.creado_en).toLocaleString("es-CL"),
        cliente: `${p.cita?.usuario_cita_cliente_idTousuario?.nombre ?? ""} ${p.cita?.usuario_cita_cliente_idTousuario?.apellido ?? ""}`,
        servicio: p.cita?.servicio?.nombre ?? "-",
        estado: p.estado,
        monto: Number(p.monto_clp),
      });
    });

    detalleSheet.getRow(1).eachCell((c: any) => c.style = { ...headerStyle } as any);
    detalleSheet.eachRow((row: any, idx: any) => {
      if (idx === 1) return;
      row.eachCell((c: any) => c.border = { ...border } as any);
    });

    // -----------------------------------------
    // DESCARGA
    // -----------------------------------------
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=reporte-finanzas-${mes}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await wb.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error("❌ Error exportando Excel finanzas:", err);
    res.status(500).json({ error: "Error exportando Excel" });
  }
});

// =======================================
// NOTIFICACIONES PUSH
// =======================================
app.post("/api/push-token", async (req, res) => {
  try {
    const { email, pushToken, platform } = req.body;

    console.log("📱 Recibiendo push token:");
    console.log("  Email:", email);
    console.log("  Token:", pushToken);
    console.log("  Platform:", platform);

    if (!email || !pushToken) {
      return res.status(400).json({ error: "email y pushToken son requeridos" });
    }

    // Buscar el usuario por email
    const usuario = await prisma.usuario.findUnique({
      where: { email }
    });

    if (!usuario) {
      console.log("❌ Usuario no encontrado:", email);
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    console.log("✅ Usuario encontrado, ID:", usuario.id);

    // upsert por token único
    const dispositivo = await prisma.dispositivo.upsert({
      where: { token_push: pushToken },
      update: {
        usuario_id: usuario.id,
        plataforma: platform,
        ultima_vez_visto: new Date(),
      },
      create: {
        usuario_id: usuario.id,
        plataforma: platform,
        token_push: pushToken,
        ultima_vez_visto: new Date(),
      },
    });

    console.log("✅ Token guardado exitosamente");
    
    // Convertir BigInt a string para JSON
    const dispositivoResponse = {
      ...dispositivo,
      id: dispositivo.id.toString(),
      usuario_id: dispositivo.usuario_id.toString(),
    };
    
    return res.json({ ok: true, dispositivo: dispositivoResponse });
  } catch (e: any) {
    console.error("❌ Error guardando token push:");
    console.error("  Mensaje:", e.message);
    console.error("  Stack:", e.stack);
    return res.status(500).json({ error: "Error interno", details: e.message });
  }
});

// =======================================
// ENDPOINT MANUAL: Enviar recordatorios de citas
// =======================================
app.post("/api/recordatorios/enviar", async (req, res) => {
  try {
    console.log("🔔 Endpoint manual de recordatorios llamado");
    
    await enviarRecordatorios24Horas();
    await enviarRecordatorios2Horas();
    
    res.json({ 
      ok: true, 
      message: "Recordatorios enviados exitosamente" 
    });
  } catch (error: any) {
    console.error("❌ Error enviando recordatorios:", error);
    res.status(500).json({ 
      error: "Error al enviar recordatorios", 
      details: error.message 
    });
  }
});

// =======================================
// ENDPOINT DE PRUEBA: Enviar notificación a un usuario específico
// =======================================
app.post("/api/recordatorios/test", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "email es requerido" });
    }

    console.log("🧪 Enviando notificación de prueba a:", email);

    // Buscar usuario
    const usuario = await prisma.usuario.findUnique({
      where: { email }
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Obtener tokens del usuario
    const dispositivos = await prisma.dispositivo.findMany({
      where: { usuario_id: usuario.id }
    });

    if (dispositivos.length === 0) {
      return res.status(404).json({ 
        error: "Usuario no tiene tokens de push registrados",
        hint: "El usuario debe iniciar sesión en la app móvil primero"
      });
    }

    const { Expo } = await import('expo-server-sdk');
    const expo = new Expo();

    // Filtrar tokens válidos
    const pushTokens = dispositivos
      .map(d => d.token_push)
      .filter(token => Expo.isExpoPushToken(token));

    if (pushTokens.length === 0) {
      return res.status(400).json({ 
        error: "No hay tokens válidos para este usuario" 
      });
    }

    // Crear mensajes de prueba
    const messages = pushTokens.map(token => ({
      to: token,
      sound: 'default' as const,
      title: '🧪 Notificación de Prueba',
      body: `Hola ${usuario.nombre}, esta es una notificación de prueba para verificar que el sistema funciona correctamente.`,
      data: {
        tipo: 'test',
        timestamp: new Date().toISOString(),
      },
      priority: 'high' as const,
    }));

    // Enviar notificaciones
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        console.log("✅ Notificación enviada:", ticketChunk);
      } catch (error) {
        console.error("❌ Error enviando chunk:", error);
      }
    }

    res.json({
      ok: true,
      message: "Notificación de prueba enviada",
      usuario: {
        email: usuario.email,
        nombre: usuario.nombre,
      },
      tokensEnviados: pushTokens.length,
      tickets,
    });
  } catch (error: any) {
    console.error("❌ Error en endpoint de prueba:", error);
    res.status(500).json({ 
      error: "Error interno", 
      details: error.message 
    });
  }
});

//====================================================================================================

// ================================
// 📋 REPORTE OPERACIONAL DE CITAS
// ================================
type EstadoCounts = {
  total: number;
  pendientes: number;
  confirmadas: number;
  realizadas: number;
  canceladas: number;
};

type PorDiaStats = {
  total: number;
  pendientes: number;
  confirmadas: number;
  realizadas: number;
  canceladas: number;
};

type PorTecnicoStats = EstadoCounts & {
  tecnicoId: number | null;
};

type PorServicioStats = EstadoCounts & {
  servicioId: number | null;
  nombreServicio: string;
};

app.get("/admin/reportes/operacional", verifyAdmin, async (req, res) => {
  try {
    const { mes } = req.query;
    if (!mes) {
      return res.status(400).json({ error: "Mes requerido (formato YYYY-MM)" });
    }

    const [year, month] = String(mes).split("-").map(Number);
    if (!year || !month) {
      return res.status(400).json({ error: "Formato de mes inválido" });
    }

    const inicio = new Date(year, month - 1, 1);
    const fin = new Date(year, month, 1);

    // ================================
    // 1) OBTENER CITAS DEL MES
    // ================================
    const citas = await prisma.cita.findMany({
      where: {
        fecha_hora: {
          gte: inicio,
          lt: fin,
        },
      },
      include: {
        servicio: {
          select: { id: true, nombre: true },
        },
        usuario_cita_cliente_idTousuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
        usuario_cita_tecnico_idTousuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
          },
        },
      },
      orderBy: { fecha_hora: "asc" },
    });

    if (!citas.length) {
      return res.json(
        toJSONSafe({
          resumen: {
            totalCitas: 0,
            pendientes: 0,
            confirmadas: 0,
            realizadas: 0,
            canceladas: 0,
            tasaRealizacion: 0,
            tasaCancelacion: 0,
          },
          porDia: [],
          porTecnico: [],
          porServicio: [],
          detalle: [],
        })
      );
    }

    // ================================
    // 2) MAPAS ACUMULADORES
    // ================================
    const resumen: EstadoCounts = {
      total: 0,
      pendientes: 0,
      confirmadas: 0,
      realizadas: 0,
      canceladas: 0,
    };

    const porDia: Record<string, PorDiaStats> = {};
    const porTecnico: Record<string, PorTecnicoStats> = {};
    const porServicio: Record<string, PorServicioStats> = {};

    const bumpEstado = (acc: EstadoCounts, estado: string) => {
      acc.total++;
      const e = estado.toLowerCase();
      if (e === "pendiente") acc.pendientes++;
      else if (e === "confirmada") acc.confirmadas++;
      else if (e === "realizada") acc.realizadas++;
      else if (e === "cancelada") acc.canceladas++;
    };

    // ================================
    // 3) RECORRER CITAS Y ACUMULAR
    // ================================
    for (const c of citas) {
      bumpEstado(resumen, c.estado);

      // POR DÍA
      const fechaKey = new Date(c.fecha_hora)
        .toLocaleDateString("es-CL", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          timeZone: "America/Santiago",
        })
        .replace(/\//g, "-");

      if (!porDia[fechaKey]) {
        porDia[fechaKey] = {
          total: 0,
          pendientes: 0,
          confirmadas: 0,
          realizadas: 0,
          canceladas: 0,
        };
      }
      bumpEstado(porDia[fechaKey], c.estado);

      // POR TÉCNICO
      const tecnico = c.usuario_cita_tecnico_idTousuario;
      const keyTec = tecnico ? String(Number(tecnico.id)) : "sin_tecnico";

      if (!porTecnico[keyTec]) {
        porTecnico[keyTec] = {
          tecnicoId: tecnico ? Number(tecnico.id) : null,
          total: 0,
          pendientes: 0,
          confirmadas: 0,
          realizadas: 0,
          canceladas: 0,
        };
      }
      bumpEstado(porTecnico[keyTec], c.estado);

      // POR SERVICIO
      const servicio = c.servicio;
      const keySrv = servicio ? String(Number(servicio.id)) : "sin_servicio";

      if (!porServicio[keySrv]) {
        porServicio[keySrv] = {
          servicioId: servicio ? Number(servicio.id) : null,
          nombreServicio: servicio?.nombre ?? "Sin servicio",
          total: 0,
          pendientes: 0,
          confirmadas: 0,
          realizadas: 0,
          canceladas: 0,
        };
      }
      bumpEstado(porServicio[keySrv], c.estado);
    }

    // ================================
    // 4) ARMAR RESPUESTAS
    // ================================
    const totalCitas = resumen.total;
    const tasaRealizacion =
      totalCitas > 0 ? +(resumen.realizadas / totalCitas).toFixed(2) : 0;
    const tasaCancelacion =
      totalCitas > 0 ? +(resumen.canceladas / totalCitas).toFixed(2) : 0;

    const porDiaOrdenado = Object.keys(porDia)
      .sort((a, b) => {
        const [da, ma, aa] = a.split("-").map(Number);
        const [db, mb, ab] = b.split("-").map(Number);
        return (
          new Date(aa, ma - 1, da).getTime() -
          new Date(ab, mb - 1, db).getTime()
        );
      })
      .map((fecha) => ({
        fecha,
        ...porDia[fecha],
      }));

    // ================================
    // POR TÉCNICO
    // ================================
    const porTecnicoList = Object.values(porTecnico).map((t) => {
      const tecnico = citas.find((c) =>
        c.usuario_cita_tecnico_idTousuario &&
        Number(c.usuario_cita_tecnico_idTousuario.id) === t.tecnicoId
      )?.usuario_cita_tecnico_idTousuario;

      return {
        tecnicoId: t.tecnicoId,
        nombre: tecnico?.nombre ?? "Sin técnico",
        apellido: tecnico?.apellido ?? "",
        totalCitas: t.total,
        pendientes: t.pendientes,
        confirmadas: t.confirmadas,
        realizadas: t.realizadas,
        canceladas: t.canceladas,
      };
    });

    // ================================
    // POR SERVICIO (CORREGIDO)
    // ================================
    const porServicioList = Object.values(porServicio).map((s) => ({
      servicioId: s.servicioId,
      nombreServicio: s.nombreServicio,
      totalCitas: s.total, // <-- CAMBIO CLAVE
      pendientes: s.pendientes,
      confirmadas: s.confirmadas,
      realizadas: s.realizadas,
      canceladas: s.canceladas,
    }));

    // ================================
    // DETALLE
    // ================================
    const detalle = citas.map((c) => ({
      id: Number(c.id),
      fecha_hora: c.fecha_hora,
      estado: c.estado,
      cliente: c.usuario_cita_cliente_idTousuario
        ? {
            id: Number(c.usuario_cita_cliente_idTousuario.id),
            nombre: c.usuario_cita_cliente_idTousuario.nombre,
            apellido: c.usuario_cita_cliente_idTousuario.apellido,
            email: c.usuario_cita_cliente_idTousuario.email,
          }
        : null,
      servicio: c.servicio
        ? {
            id: Number(c.servicio.id),
            nombre: c.servicio.nombre,
          }
        : null,
      tecnico: c.usuario_cita_tecnico_idTousuario
        ? {
            id: Number(c.usuario_cita_tecnico_idTousuario.id),
            nombre: c.usuario_cita_tecnico_idTousuario.nombre,
            apellido: c.usuario_cita_tecnico_idTousuario.apellido,
          }
        : null,
    }));

    // ================================
    // 6) RESPUESTA FINAL
    // ================================
    return res.json(
      toJSONSafe({
        resumen: {
          totalCitas,
          pendientes: resumen.pendientes,
          confirmadas: resumen.confirmadas,
          realizadas: resumen.realizadas,
          canceladas: resumen.canceladas,
          tasaRealizacion,
          tasaCancelacion,
        },
        porDia: porDiaOrdenado,
        porTecnico: porTecnicoList,
        porServicio: porServicioList,
        detalle,
      })
    );
  } catch (err: any) {
    console.error("❌ Error en /admin/reportes/operacional:", err);
    return res
      .status(500)
      .json({ error: err?.message ?? "Error generando reporte operacional" });
  }
});


// ================================================
//  EXPORTAR REPORTE OPERACIONAL DE CITAS A PDF
// ================================================

app.get("/admin/reportes/operacional/pdf", verifyAdmin, async (req, res) => {
  try {
    const { mes } = req.query;
    if (!mes) {
      return res.status(400).json({ error: "Mes requerido (YYYY-MM)" });
    }

    const [year, month] = String(mes).split("-").map(Number);
    const inicio = new Date(year, month - 1, 1);
    const fin = new Date(year, month, 1);

    // ========================================
    // 1) Obtener Citas del mes
    // ========================================
    const citas = await prisma.cita.findMany({
      where: { fecha_hora: { gte: inicio, lt: fin } },
      include: {
        servicio: true,
        usuario_cita_cliente_idTousuario: true,
        usuario_cita_tecnico_idTousuario: true,
      },
      orderBy: { fecha_hora: "asc" },
    });

    // ========================================
    // 2) Tipos internos (NO se duplican)
    // ========================================
    type EstadoCounts = {
      total: number;
      pendientes: number;
      confirmadas: number;
      realizadas: number;
      canceladas: number;
    };

    const resumen: EstadoCounts = {
      total: 0,
      pendientes: 0,
      confirmadas: 0,
      realizadas: 0,
      canceladas: 0,
    };

    const porDia: Record<string, EstadoCounts> = {};

    const porTecnico: Record<
      string,
      EstadoCounts & { tecnicoId: number | null; nombre: string; apellido: string }
    > = {};

    const porServicio: Record<
      string,
      EstadoCounts & { servicioId: number | null; nombreServicio: string }
    > = {};

    const bump = (obj: EstadoCounts, estado: string): void => {
      obj.total++;
      const e = estado.toLowerCase();
      if (e === "pendiente") obj.pendientes++;
      else if (e === "confirmada") obj.confirmadas++;
      else if (e === "realizada") obj.realizadas++;
      else if (e === "cancelada") obj.canceladas++;
    };

    // ========================================
    // 3) Acumular Datos (si no hay citas → todo queda en 0)
    // ========================================
    for (const c of citas) {
      bump(resumen, c.estado);

      // POR DÍA
      const f = new Date(c.fecha_hora)
        .toLocaleDateString("es-CL")
        .replace(/\//g, "-");

      if (!porDia[f]) {
        porDia[f] = { total: 0, pendientes: 0, confirmadas: 0, realizadas: 0, canceladas: 0 };
      }
      bump(porDia[f], c.estado);

      // POR TÉCNICO
      const tec = c.usuario_cita_tecnico_idTousuario;
      const keyTec = tec ? String(tec.id) : "sin";

      if (!porTecnico[keyTec]) {
        porTecnico[keyTec] = {
          tecnicoId: tec ? Number(tec.id) : null,
          nombre: tec?.nombre ?? "Sin técnico",
          apellido: tec?.apellido ?? "",
          total: 0,
          pendientes: 0,
          confirmadas: 0,
          realizadas: 0,
          canceladas: 0,
        };
      }
      bump(porTecnico[keyTec], c.estado);

      // POR SERVICIO
      const srv = c.servicio;
      const keySrv = srv ? String(srv.id) : "sin_servicio";

      if (!porServicio[keySrv]) {
        porServicio[keySrv] = {
          servicioId: srv ? Number(srv.id) : null,
          nombreServicio: srv?.nombre ?? "Sin servicio",
          total: 0,
          pendientes: 0,
          confirmadas: 0,
          realizadas: 0,
          canceladas: 0,
        };
      }
      bump(porServicio[keySrv], c.estado);
    }

    // ========================================
    // 4) Convertir a listas ordenadas
    // ========================================
    const porDiaList = Object.keys(porDia)
      .sort((a, b) => {
        const [da, ma, aa] = a.split("-").map(Number);
        const [db, mb, ab] = b.split("-").map(Number);
        return new Date(aa, ma - 1, da).getTime() - new Date(ab, mb - 1, db).getTime();
      })
      .map((f) => ({ fecha: f, ...porDia[f] }));

    const porTecnicoList = Object.values(porTecnico);

    const porServicioList = Object.values(porServicio);

    const detalle = citas.map((c) => ({
      fecha: new Date(c.fecha_hora).toLocaleString("es-CL", {
        timeZone: "America/Santiago",
      }),
      cliente: c.usuario_cita_cliente_idTousuario
        ? `${c.usuario_cita_cliente_idTousuario.nombre} ${c.usuario_cita_cliente_idTousuario.apellido}`
        : "-",
      servicio: c.servicio?.nombre ?? "-",
      estado: c.estado,
      tecnico: c.usuario_cita_tecnico_idTousuario
        ? `${c.usuario_cita_tecnico_idTousuario.nombre} ${c.usuario_cita_tecnico_idTousuario.apellido}`
        : "Sin técnico",
    }));

    // ========================================
    // 5) Crear PDF
    // ========================================
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([595, 842]);
    let y = 800;
    const margin = 40;
    const line = 16;

    const verde = rgb(0, 0.4, 0);

    const drawText = (txt: string, size = 12, color = rgb(0, 0, 0), f = font) => {
      page.drawText(txt, { x: margin, y, size, font: f, color });
      y -= line;
    };

    const checkPageBreak = (needed: number = 40) => {
      if (y - needed < 40) {
        page = pdfDoc.addPage([595, 842]);
        y = 800;
      }
    };

    // ========================================
    // HEADER
    // ========================================
    drawText("CLEAN & GARDEN", 20, verde, bold);
    drawText(`Reporte Operacional – ${mes}`, 14, rgb(0.2, 0.2, 0.2));

    page.drawLine({
      start: { x: margin, y: y - 6 },
      end: { x: 555, y: y - 6 },
      thickness: 1,
      color: verde,
    });

    y -= 26;

    // ========================================
    // RESUMEN
    // ========================================
    drawText("Resumen del mes", 14, verde, bold);
    y -= 8;

    drawText(`Citas totales: ${resumen.total}`);
    drawText(`Realizadas: ${resumen.realizadas}`);
    drawText(`Confirmadas: ${resumen.confirmadas}`);
    drawText(`Pendientes: ${resumen.pendientes}`);
    drawText(`Canceladas: ${resumen.canceladas}`);

    y -= 20;

    // ========================================
    // TABLA POR DÍA
    // ========================================
    drawText("Citas por día", 14, verde, bold);
    y -= 10;

    page.drawRectangle({ x: margin, y: y - 2, width: 515, height: 18, color: verde });

    const thDia = {
      fecha: margin + 5,
      total: margin + 120,
      realizadas: margin + 180,
      confirmadas: margin + 260,
      canceladas: margin + 350,
      pendientes: margin + 440,
    };

    const writeHeader = (text: string, x: number) =>
      page.drawText(text, { x, y, size: 11, font: bold, color: rgb(1, 1, 1) });

    writeHeader("Fecha", thDia.fecha);
    writeHeader("Total", thDia.total);
    writeHeader("Realizadas", thDia.realizadas);
    writeHeader("Confirmadas", thDia.confirmadas);
    writeHeader("Canceladas", thDia.canceladas);
    writeHeader("Pendientes", thDia.pendientes);

    y -= 22;

    porDiaList.forEach((d) => {
      checkPageBreak(22);
      page.drawText(d.fecha, { x: thDia.fecha, y, size: 10 });
      page.drawText(String(d.total), { x: thDia.total, y, size: 10 });
      page.drawText(String(d.realizadas), { x: thDia.realizadas, y, size: 10 });
      page.drawText(String(d.confirmadas), { x: thDia.confirmadas, y, size: 10 });
      page.drawText(String(d.canceladas), { x: thDia.canceladas, y, size: 10 });
      page.drawText(String(d.pendientes), { x: thDia.pendientes, y, size: 10 });
      y -= 18;
    });

    y -= 26;

    // ========================================
    // TABLA POR TÉCNICO
    // ========================================
    drawText("Citas por técnico", 14, verde, bold);
    y -= 10;

    page.drawRectangle({ x: margin, y: y - 2, width: 515, height: 18, color: verde });

    const thTec = {
      nombre: margin + 5,
      total: margin + 230,
      realizadas: margin + 290,
      confirmadas: margin + 360,
      canceladas: margin + 440,
      pendientes: margin + 515,
    };

    writeHeader("Técnico", thTec.nombre);
    writeHeader("Total", thTec.total);
    writeHeader("Realizadas", thTec.realizadas);
    writeHeader("Confirmadas", thTec.confirmadas);
    writeHeader("Canceladas", thTec.canceladas);
    writeHeader("Pendientes", thTec.pendientes);

    y -= 22;

    porTecnicoList.forEach((t) => {
      checkPageBreak(22);
      page.drawText(`${t.nombre} ${t.apellido}`, { x: thTec.nombre, y, size: 10 });
      page.drawText(String(t.total), { x: thTec.total, y, size: 10 });
      page.drawText(String(t.realizadas), { x: thTec.realizadas, y, size: 10 });
      page.drawText(String(t.confirmadas), { x: thTec.confirmadas, y, size: 10 });
      page.drawText(String(t.canceladas), { x: thTec.canceladas, y, size: 10 });
      page.drawText(String(t.pendientes), { x: thTec.pendientes, y, size: 10 });
      y -= 18;
    });

    y -= 26;

    // ========================================
    // TABLA POR SERVICIO
    // ========================================
    drawText("Citas por servicio", 14, verde, bold);
    y -= 10;

    page.drawRectangle({ x: margin, y: y - 2, width: 515, height: 18, color: verde });

    const thSrv = {
      nombre: margin + 5,
      total: margin + 230,
      realizadas: margin + 290,
      confirmadas: margin + 360,
      canceladas: margin + 440,
      pendientes: margin + 515,
    };

    writeHeader("Servicio", thSrv.nombre);
    writeHeader("Total", thSrv.total);
    writeHeader("Realizadas", thSrv.realizadas);
    writeHeader("Confirmadas", thSrv.confirmadas);
    writeHeader("Canceladas", thSrv.canceladas);
    writeHeader("Pendientes", thSrv.pendientes);

    y -= 22;

    porServicioList.forEach((s) => {
      checkPageBreak(22);
      page.drawText(s.nombreServicio, { x: thSrv.nombre, y, size: 10 });
      page.drawText(String(s.total), { x: thSrv.total, y, size: 10 });
      page.drawText(String(s.realizadas), { x: thSrv.realizadas, y, size: 10 });
      page.drawText(String(s.confirmadas), { x: thSrv.confirmadas, y, size: 10 });
      page.drawText(String(s.canceladas), { x: thSrv.canceladas, y, size: 10 });
      page.drawText(String(s.pendientes), { x: thSrv.pendientes, y, size: 10 });
      y -= 18;
    });

    y -= 26;

    // ========================================
    // DETALLE DE CITAS (FIX DE SALTO DE PÁGINA)
    // ========================================
    drawText("Detalle de citas del mes", 14, verde, bold);
    y -= 10;

    page.drawRectangle({ x: margin, y: y - 2, width: 515, height: 18, color: verde });

    const thDet = {
      fecha: margin + 5,
      cliente: margin + 130,
      servicio: margin + 260,
      estado: margin + 360,
      tecnico: margin + 440,
    };

    writeHeader("Fecha/Hora", thDet.fecha);
    writeHeader("Cliente", thDet.cliente);
    writeHeader("Servicio", thDet.servicio);
    writeHeader("Estado", thDet.estado);
    writeHeader("Técnico", thDet.tecnico);

    y -= 22;

    detalle.forEach((d) => {
      checkPageBreak(30);
      page.drawText(d.fecha, { x: thDet.fecha, y, size: 9 });
      page.drawText(d.cliente, { x: thDet.cliente, y, size: 9 });
      page.drawText(d.servicio, { x: thDet.servicio, y, size: 9 });
      page.drawText(d.estado, { x: thDet.estado, y, size: 9 });
      page.drawText(d.tecnico, { x: thDet.tecnico, y, size: 9 });
      y -= 18;
    });

    // ========================================
    // ENTREGAR PDF
    // ========================================
    const pdfBytes = await pdfDoc.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=reporte-operacional-${mes}.pdf`
    );

    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error("❌ Error exportando PDF operacional:", err);
    res.status(500).json({ error: "Error exportando PDF operacional" });
  }
});


// ================================================
// 📊 EXPORTAR REPORTE OPERACIONAL A EXCEL (XLSX)
// ================================================

app.get("/admin/reportes/operacional/excel", verifyAdmin, async (req, res) => {
  try {
    const { mes } = req.query;
    if (!mes) return res.status(400).json({ error: "Mes requerido (YYYY-MM)" });

    const [year, month] = String(mes).split("-").map(Number);
    const inicio = new Date(year, month - 1, 1);
    const fin = new Date(year, month, 1);

    // Obtener datos
    const citas = await prisma.cita.findMany({
      where: {
        fecha_hora: { gte: inicio, lt: fin },
      },
      include: {
        servicio: true,
        usuario_cita_cliente_idTousuario: true,
        usuario_cita_tecnico_idTousuario: true,
      },
      orderBy: { fecha_hora: "asc" },
    });

    // ======================
    // CONSTRUCTORES DE TABLAS
    // ======================

    const resumen = {
      total: citas.length,
      pendientes: citas.filter(c => c.estado === "pendiente").length,
      confirmadas: citas.filter(c => c.estado === "confirmada").length,
      realizadas: citas.filter(c => c.estado === "realizada").length,
      canceladas: citas.filter(c => c.estado === "cancelada").length,
    };

    const porDia: Record<string, any> = {};
    const porTecnico: Record<string, any> = {};
    const porServicio: Record<string, any> = {};

    const bump = (obj: any, estado: string) => {
      obj.total++;
      const e = estado.toLowerCase();
      if (e === "pendiente") obj.pendientes++;
      else if (e === "confirmada") obj.confirmadas++;
      else if (e === "realizada") obj.realizadas++;
      else if (e === "cancelada") obj.canceladas++;
    };

    // Agrupar datos
    citas.forEach(c => {
      // Día
      const fechaKey = new Date(c.fecha_hora)
        .toLocaleDateString("es-CL", { timeZone: "America/Santiago" })
        .replace(/\//g, "-");

      if (!porDia[fechaKey]) {
        porDia[fechaKey] = {
          total: 0, pendientes: 0, confirmadas: 0, realizadas: 0, canceladas: 0,
        };
      }
      bump(porDia[fechaKey], c.estado);

      // Técnico
      const tec = c.usuario_cita_tecnico_idTousuario;
      const tecKey = tec ? String(tec.id) : "sin_tecnico";

      if (!porTecnico[tecKey]) {
        porTecnico[tecKey] = {
          tecnicoId: tec ? Number(tec.id) : null,
          nombre: tec?.nombre ?? "Sin técnico",
          apellido: tec?.apellido ?? "",
          total: 0,
          pendientes: 0,
          confirmadas: 0,
          realizadas: 0,
          canceladas: 0,
        };
      }
      bump(porTecnico[tecKey], c.estado);

      // Servicio
      const srv = c.servicio;
      const srvKey = srv ? String(srv.id) : "sin_servicio";

      if (!porServicio[srvKey]) {
        porServicio[srvKey] = {
          servicioId: srv ? Number(srv.id) : null,
          nombreServicio: srv?.nombre ?? "Sin servicio",
          total: 0,
          pendientes: 0,
          confirmadas: 0,
          realizadas: 0,
          canceladas: 0,
        };
      }
      bump(porServicio[srvKey], c.estado);
    });

    // ======================
    // CREAR EXCEL
    // ======================
    const wb = new ExcelJS.Workbook();
    wb.creator = "Clean & Garden";
    wb.created = new Date();

    // 🎨 ESTILOS SEGUROS PARA TYPESCRIPT
    const headerStyle = {
      font: { bold: true, color: { argb: "FFFFFFFF" } },
      fill: {
        type: "pattern" as const,
        pattern: "solid" as const,
        fgColor: { argb: "FF1A6D27" }, // Verde oscuro
      },
      alignment: { horizontal: "center" as const },
      border: {
        top: { style: "thin" as const },
        left: { style: "thin" as const },
        bottom: { style: "thin" as const },
        right: { style: "thin" as const },
      },
    };

    const border = {
      top: { style: "thin" as const },
      left: { style: "thin" as const },
      bottom: { style: "thin" as const },
      right: { style: "thin" as const },
    };

    // ======================
    // HOJA RESUMEN
    // ======================
    const resumenSheet = wb.addWorksheet("Resumen Operacional");

    resumenSheet.columns = [
      { header: "Métrica", key: "metrica", width: 30 },
      { header: "Valor", key: "valor", width: 20 },
    ];

    resumenSheet.addRows([
      ["Total de citas", resumen.total],
      ["Realizadas", resumen.realizadas],
      ["Confirmadas", resumen.confirmadas],
      ["Canceladas", resumen.canceladas],
      ["Pendientes", resumen.pendientes],
    ]);

    resumenSheet.getRow(1).eachCell((cell: any) => {
      cell.style = { ...headerStyle } as any;
    });

    resumenSheet.eachRow((row: any, idx: any) => {
      if (idx === 1) return;
      row.eachCell((cell: any) => {
        cell.border = { ...border } as any;
      });
    });

    // ======================
    // HOJA POR DÍA
    // ======================
    const diaSheet = wb.addWorksheet("Citas por día");

    diaSheet.columns = [
      { header: "Fecha", key: "fecha", width: 15 },
      { header: "Total", key: "total", width: 10 },
      { header: "Realizadas", key: "realizadas", width: 12 },
      { header: "Confirmadas", key: "confirmadas", width: 12 },
      { header: "Canceladas", key: "canceladas", width: 12 },
      { header: "Pendientes", key: "pendientes", width: 12 },
    ];

    Object.keys(porDia).forEach(k => diaSheet.addRow({ fecha: k, ...porDia[k] }));

    diaSheet.getRow(1).eachCell((c: any) => (c.style = { ...headerStyle } as any));
    diaSheet.eachRow((row: any, idx: any) => {
      if (idx === 1) return;
      row.eachCell((c: any) => (c.border = { ...border } as any));
    });

    // ======================
    // HOJA POR TÉCNICO
    // ======================
    const tecSheet = wb.addWorksheet("Citas por técnico");

    tecSheet.columns = [
      { header: "Técnico", key: "tecnico", width: 25 },
      { header: "Total", key: "total", width: 10 },
      { header: "Realizadas", key: "realizadas", width: 12 },
      { header: "Confirmadas", key: "confirmadas", width: 12 },
      { header: "Canceladas", key: "canceladas", width: 12 },
      { header: "Pendientes", key: "pendientes", width: 12 },
    ];

    Object.values(porTecnico).forEach(t =>
      tecSheet.addRow({
        tecnico: `${t.nombre} ${t.apellido}`,
        total: t.total,
        realizadas: t.realizadas,
        confirmadas: t.confirmadas,
        canceladas: t.canceladas,
        pendientes: t.pendientes,
      })
    );

    tecSheet.getRow(1).eachCell((c: any) => (c.style = { ...headerStyle } as any));
    tecSheet.eachRow((row: any, idx: any) => {
      if (idx === 1) return;
      row.eachCell((c: any) => (c.border = { ...border } as any));
    });

    // ======================
    // HOJA POR SERVICIO
    // ======================
    const srvSheet = wb.addWorksheet("Citas por servicio");

    srvSheet.columns = [
      { header: "Servicio", key: "servicio", width: 30 },
      { header: "Total", key: "total", width: 10 },
      { header: "Realizadas", key: "realizadas", width: 12 },
      { header: "Confirmadas", key: "confirmadas", width: 12 },
      { header: "Canceladas", key: "canceladas", width: 12 },
      { header: "Pendientes", key: "pendientes", width: 12 },
    ];

    Object.values(porServicio).forEach(s =>
      srvSheet.addRow({
        servicio: s.nombreServicio,
        total: s.total,
        realizadas: s.realizadas,
        confirmadas: s.confirmadas,
        canceladas: s.canceladas,
        pendientes: s.pendientes,
      })
    );

    srvSheet.getRow(1).eachCell((c: any) => (c.style = { ...headerStyle } as any));
    srvSheet.eachRow((row: any, idx: any) => {
      if (idx === 1) return;
      row.eachCell((c: any) => (c.border = { ...border } as any));
    });

    // ======================
    // HOJA DETALLE
    // ======================
    const detSheet = wb.addWorksheet("Detalle");

    detSheet.columns = [
      { header: "Fecha", key: "fecha", width: 22 },
      { header: "Cliente", key: "cliente", width: 28 },
      { header: "Servicio", key: "servicio", width: 22 },
      { header: "Estado", key: "estado", width: 14 },
      { header: "Técnico", key: "tecnico", width: 25 },
    ];

    citas.forEach(c => {
      detSheet.addRow({
        fecha: new Date(c.fecha_hora).toLocaleString("es-CL"),
        cliente: c.usuario_cita_cliente_idTousuario
          ? `${c.usuario_cita_cliente_idTousuario.nombre} ${c.usuario_cita_cliente_idTousuario.apellido}`
          : "-",
        servicio: c.servicio?.nombre ?? "-",
        estado: c.estado,
        tecnico: c.usuario_cita_tecnico_idTousuario
          ? `${c.usuario_cita_tecnico_idTousuario.nombre} ${c.usuario_cita_tecnico_idTousuario.apellido}`
          : "Sin técnico",
      });
    });

    detSheet.getRow(1).eachCell((c: any) => (c.style = { ...headerStyle } as any));
    detSheet.eachRow((row: any, idx: any) => {
      if (idx === 1) return;
      row.eachCell((c: any) => (c.border = { ...border } as any));
    });

    // ======================
    // DESCARGA
    // ======================
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=reporte-operacional-${mes}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("❌ Error exportando Excel operacional:", err);
    res.status(500).json({ error: "Error exportando Excel operacional" });
  }
});

// ================================================
// 📅 HORARIOS DEL TÉCNICO PARA EL CALENDARIO
// ================================================

app.get("/tecnico/horarios", authMiddleware, async (req, res) => {
  try {
    const tecnicoId = BigInt((req as any).user.id);

    if (
      (req as any).user.rol !== "jardinero" ) {
      return res.status(403).json({ error: "Solo los jardineros pueden ver sus horarios." });
    }

    // =============================================================
    // 1) HORARIOS DEL TÉCNICO (disponibilidad_mensual)
    // =============================================================
    const horarios = await prisma.disponibilidad_mensual.findMany({
      where: { tecnico_id: tecnicoId },
      include: {
        disponibilidad_excepcion: true
      },
      orderBy: [{ fecha: "asc" }, { hora_inicio: "asc" }]
    });

    // =============================================================
    // 2) CITAS DEL TÉCNICO
    // =============================================================
    const citas = await prisma.cita.findMany({
      where: { tecnico_id: tecnicoId },
      include: {
        usuario_cita_cliente_idTousuario: {
          select: { nombre: true, apellido: true }
        }
      }
    });

    // =============================================================
    // 3) EXCEPCIONES del técnico + globales (feriado/día completo)
    // =============================================================
    const excepciones = await prisma.disponibilidad_excepcion.findMany({
      where: {
        OR: [
          { tecnico_id: tecnicoId }, // vacaciones / licencias / permisos
          {
            AND: [
              { tecnico_id: null }, // excepciones globales
              { tipo: { in: ["feriado_irrenunciable", "dia_completo"] } }
            ]
          }
        ]
      },
      orderBy: [
        { fecha: "asc" },
        { desde: "asc" }
      ]
    });

    const eventos: any[] = [];

    // =============================================================
    // A) Convertir HORARIOS en eventos del calendario
    // =============================================================
    for (const h of horarios) {

      const start = h.hora_inicio.toISOString();
      const end = h.hora_fin.toISOString();

      // Verificar si existe cita entre ese rango
      const cita = citas.find(
        c => c.fecha_hora >= h.hora_inicio && c.fecha_hora < h.hora_fin
      );

      let title = "";

      if (h.excepcion_id && h.disponibilidad_excepcion) {
        // evento bloqueado por excepción vinculada al horario
        title = `🔒 ${h.disponibilidad_excepcion.motivo ?? "Bloqueado"}`;
      } 
      else if (cita) {
        // evento de cita
        title = `🟦 Cita: ${cita.usuario_cita_cliente_idTousuario?.nombre ?? ""} ${cita.usuario_cita_cliente_idTousuario?.apellido ?? ""}`;
      } 
      else {
        // horario disponible
        title = `Disponible (${h.cupos_ocupados}/${h.cupos_totales})`;
      }

      eventos.push({
        id: `horario_${h.id}`,
        start,
        end,
        title,
        allDay: false,
        bloqueado: h.excepcion_id !== null,
        className: h.excepcion_id
          ? "bg-red-500 text-white"
          : cita
            ? "bg-blue-600 text-white"
            : "bg-green-600 text-white"
      });
    }

    // =============================================================
    // B) Convertir EXCEPCIONES en eventos independientes
    // =============================================================
    for (const ex of excepciones) {

      // ===========================
      // 1) Excepción de un solo día
      // ===========================
      if (ex.fecha && !ex.desde && !ex.hasta) {
        const date = ex.fecha.toISOString().split("T")[0];

        eventos.push({
          id: `excepcion_${ex.id}`,
          start: date,
          allDay: true,
          title: `🔒 ${ex.motivo ?? ex.tipo ?? "Día bloqueado"}`,
          className: "bg-red-600 text-white"
        });

        continue;
      }

      // ===========================
      // 2) Excepción con rango (vacaciones / licencia / permiso)
      // ===========================
      if (ex.desde && ex.hasta) {
        eventos.push({
          id: `excepcion_${ex.id}`,
          start: ex.desde.toISOString(),
          end: ex.hasta.toISOString(),
          allDay: false,
          title: `🔒 ${ex.motivo ?? ex.tipo ?? "No disponible"}`,
          className: "bg-red-700 text-white"
        });

        continue;
      }
    }

    // =============================================================
    // ENTREGAR EVENTOS AL FRONT
    // =============================================================
    return res.json(
      JSON.parse(JSON.stringify(eventos, (_, v) => (typeof v === "bigint" ? Number(v) : v)))
    );

  } catch (err) {
    console.error("❌ Error en /tecnico/horarios:", err);
    return res.status(500).json({ error: "Error obteniendo horarios del técnico." });
  }
});

//====================================================================================================
// Verificar variables de entorno al inicio
console.log("Verificando configuración...");
console.log("EMAIL_USER:", process.env.EMAIL_USER ? "Configurado" : "Falta");
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "Configurado" : "Falta");
console.log("FRONTEND_URL:", process.env.FRONTEND_URL || "Falta");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Configurado" : "Falta");


//const port = Number(process.env.PORT ?? 3001);
//const server = createServer(app);
//server.listen(port, () => console.log(`🚀 API backend + WebSocket listening on port ${port}`));


//global.chatWebSocketInstance = new ChatWebSocket(server);

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
        `Tokens expirados eliminados: ${total} (confirm: ${deletedConfirm.count}, reset: ${deletedReset.count})`
      );
    }
  } catch (err) {
    console.error("Error limpiando tokens expirados:", err);
  }
}, 5 * 60 * 1000); // cada 5 minutos
