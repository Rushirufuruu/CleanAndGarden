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

declare global {
  // eslint-disable-next-line no-var
  var chatWebSocketInstance: import('./lib/websocket').ChatWebSocket | undefined;
}

// Creamos la app de Express (hay que pensarlo como el "router" principal de la API)


const app = express();

// ==========================================
// CONFIGURACIÓN CORS (Railway + Vercel + Local)
// ==========================================
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:19006",
  "exp://127.0.0.1:19000",
];

app.use(
  cors({
    origin: function (origin, callback) {
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

// Helper para serializar BigInt en JSON (Prisma puede devolver BigInt y JSON.stringify falla)
// Técnico: JSON.stringify no soporta BigInt; convertimos BigInt -> Number de forma segura.
// Común: esto evita errores raros cuando mandamos datos muy grandes al front.
function toJSONSafe<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_k, v) => (typeof v === 'bigint' ? Number(v) : v))
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
        rol: { select: { codigo: true } },
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

//--------------------------------------------------------------------
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
app.get("/admin/disponibilidad-mensual", verifyAdmin, async (req, res) => {
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
      const now = new Date();
      const firstLocal = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastLocal = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      rangoDesde = toPgDateLocal(firstLocal);
      rangoHasta = toPgDateLocal(lastLocal);
    }

    const filtro: any = {
      fecha: { gte: new Date(rangoDesde), lte: new Date(rangoHasta) },
      activo: true,
    };
    if (usuarioId) filtro.tecnico_id = BigInt(String(usuarioId));

    // 🔹 Horarios activos
    const disponibilidad = await prisma.disponibilidad_mensual.findMany({
      where: filtro,
      orderBy: [{ fecha: "asc" }, { hora_inicio: "asc" }],
      include: { usuario: { select: { id: true, nombre: true, apellido: true, rol: true } } },
    });

    // 🔹 Excepciones dentro del mismo rango (globales o del técnico)
    const excepcionFiltro: any = {
      OR: [
        { fecha: { gte: new Date(rangoDesde), lte: new Date(rangoHasta) } },
        { desde: { lte: new Date(rangoHasta) }, hasta: { gte: new Date(rangoDesde) } },
      ],
    };
    if (usuarioId) {
      excepcionFiltro.OR.push({ tecnico_id: BigInt(String(usuarioId)) });
    }

    const excepciones = await prisma.disponibilidad_excepcion.findMany({
      where: excepcionFiltro,
      select: {
        id: true,
        tipo: true,
        motivo: true,
        descripcion: true,
        fecha: true,
        desde: true,
        hasta: true,
        tecnico_id: true,
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            rol: { select: { codigo: true, nombre: true } },
          },
        },
      },
      orderBy: [{ fecha: "asc" }, { desde: "asc" }],
    });


    res.json({
      data: toJSONSafe(disponibilidad),
      excepciones: toJSONSafe(excepciones),
    });
  } catch (err) {
    console.error("❌ Error al listar disponibilidad mensual:", err);
    res.status(500).json({ error: "Error al listar disponibilidad mensual" });
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
      if (userRol === 'cliente' && !['admin', 'jardinero'].includes(rol as string)) {
        return res.status(403).json({ error: 'No tienes permiso para buscar este tipo de usuarios' });
      }
      whereClause.rol = {
        codigo: rol as string
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