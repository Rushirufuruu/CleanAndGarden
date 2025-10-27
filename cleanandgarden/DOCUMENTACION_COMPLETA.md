# 📚 DOCUMENTACIÓN COMPLETA - CLEAN & GARDEN

**Última actualización:** Octubre 15, 2025

---

## 📋 ÍNDICE
1. [Descripción General](#descripción-general)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Base de Datos (Prisma Schema)](#base-de-datos-prisma-schema)
5. [Backend - Express](#backend---express)
6. [Frontend - Next.js](#frontend---nextjs)
7. [Autenticación](#autenticación)
8. [Endpoints de la API](#endpoints-de-la-api)
9. [Variables de Entorno](#variables-de-entorno)
10. [Cómo Ejecutar el Proyecto](#cómo-ejecutar-el-proyecto)
11. [Flujos de Negocio](#flujos-de-negocio)
12. [Problemas Conocidos y Soluciones](#problemas-conocidos-y-soluciones)

---

## 📖 Descripción General

**Clean & Garden** es una plataforma integral para la gestión de servicios de jardinería y limpieza. 

### Actores principales:
- **Clientes:** Contratan servicios de limpieza y jardinería
- **Técnicos:** Realizan los trabajos en jardines
- **Administradores:** Gestionan usuarios, servicios y pagos

### Funcionalidades principales:
- ✅ Gestión de usuarios con autenticación JWT
- ✅ Reserva y confirmación de citas
- ✅ Gestión de pagos (Flow, transferencias)
- ✅ Sistema de mensajería en tiempo real
- ✅ Portafolio de trabajos realizados
- ✅ Disponibilidad de técnicos

---

## 🗂️ Estructura del Proyecto

```
cleanandgarden/
├── backend/                          # API Express + Prisma
│   ├── src/
│   │   ├── server.ts                 # Punto de entrada principal
│   │   └── lib/
│   │       ├── prisma.ts             # Instancia única de Prisma
│   │       ├── mailer.ts             # Configuración de Nodemailer
│   │       ├── middleware.ts         # Middlewares reutilizables
│   │       ├── server.ts             # Utilidades del servidor
│   │       └── utils.ts              # Funciones utilitarias
│   ├── prisma/
│   │   └── schema.prisma             # Definición de modelo de datos
│   ├── generated/prisma/             # Tipos autogenerados (NO editar)
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md (vacío)
│
├── web/                              # Frontend Next.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── layout.tsx            # Layout global
│   │   │   ├── globals.css           # Estilos globales
│   │   │   ├── login/page.tsx        # Página de login
│   │   │   ├── register/page.tsx     # Página de registro
│   │   │   ├── profile/page.tsx      # Perfil de usuario
│   │   │   ├── chat/page.tsx         # Chat en tiempo real
│   │   │   ├── mensajes/             # Sistema de mensajería
│   │   │   ├── portfolio/            # Portafolio de trabajos
│   │   │   ├── our-services/         # Servicios disponibles
│   │   │   ├── about-us/             # Página de nosotros
│   │   │   ├── confirm-email/        # Confirmación de email
│   │   │   ├── forgot-password/      # Recuperación de contraseña
│   │   │   ├── reset-password/       # Reset de contraseña
│   │   │   └── change-password/      # Cambio de contraseña
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── chat-message.tsx
│   │   │   ├── realtime-chat.tsx
│   │   │   └── ui/                   # Componentes UI reutilizables
│   │   ├── hooks/
│   │   │   ├── use-chat-scroll.tsx
│   │   │   └── use-realtime-chat.tsx
│   │   └── lib/
│   │       ├── client.ts             # Cliente HTTP para API
│   │       ├── server.ts             # Funciones servidor (RSC)
│   │       ├── middleware.ts         # Middlewares de seguridad
│   │       └── utils.ts              # Utilidades generales
│   ├── public/images/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js            # Configuración de Tailwind
│   ├── postcss.config.mjs
│   ├── components.json               # Shadcn config
│   └── README.md
│
└── mobile/                           # App móvil (En desarrollo)
    └── README.md
```

---

## 🔧 Stack Tecnológico

### Backend
| Tecnología | Versión | Propósito |
|-----------|---------|----------|
| **Node.js** | LTS | Runtime JavaScript |
| **Express** | ^5.1.0 | Framework web |
| **Prisma** | ^6.16.2 | ORM para PostgreSQL |
| **TypeScript** | ^5.9.2 | Type-safety |
| **PostgreSQL** | - | Base de datos |
| **bcryptjs** | ^3.0.2 | Hash de contraseñas |
| **jsonwebtoken** | ^9.0.2 | Tokens JWT |
| **nodemailer** | ^7.0.6 | Envío de emails |
| **CORS** | ^2.8.5 | Cross-origin requests |
| **Cookie-parser** | ^1.4.7 | Parseo de cookies |

### Frontend
| Tecnología | Versión | Propósito |
|-----------|---------|----------|
| **Next.js** | ^15.5.3 | Framework React |
| **React** | ^19.1.1 | Biblioteca UI |
| **TypeScript** | ^5 | Type-safety |
| **Tailwind CSS** | ^4.1.13 | Utility-first CSS |
| **DaisyUI** | ^5.1.13 | Componentes UI |
| **Shadcn/ui** | - | Componentes accesibles |
| **Supabase** | ^2.75.0 | Auth y storage opcional |
| **SweetAlert2** | ^11.26.1 | Alertas estilizadas |
| **React Icons** | ^5.5.0 | Iconos |
| **Lucide React** | ^0.545.0 | Más iconos |

---

## 🗄️ Base de Datos (Prisma Schema)

### Modelos principales:

#### 👤 `usuario`
Tabla central del sistema - representa a clientes y técnicos.
```typescript
model usuario {
  id                          BigInt    @id @default(autoincrement())
  nombre                      String    @db.VarChar(100)
  email                       String    @unique @db.VarChar(150)
  telefono                    String?   @db.VarChar(20)
  contrasena_hash             String
  activo                      Boolean   @default(false)  // Debe confirmar email
  fecha_creacion              DateTime  @default(now())
  fecha_actualizacion         DateTime  @default(now())
  apellido                    String?
  rol_id                      BigInt    // Relación a rol
  
  // Relaciones
  rol                         rol
  cita_cita_cliente_idTousuario      cita[]
  cita_cita_tecnico_idTousuario      cita[]
  // ... más relaciones
}
```

#### 🎭 `rol`
Define roles del sistema: admin, cliente, técnico, etc.
```typescript
model rol {
  id      BigInt    @id @default(autoincrement())
  codigo  String    @unique @db.VarChar(20)  // "admin", "cliente", "tecnico"
  nombre  String    @db.VarChar(50)
  usuario usuario[]
}
```

#### 📅 `cita`
Reservas de servicios - relaciona cliente, técnico y servicio.
```typescript
model cita {
  id                BigInt       @id @default(autoincrement())
  cliente_id        BigInt       // Usuario cliente
  jardin_id         BigInt       // Ubicación del trabajo
  servicio_id       BigInt       // Qué servicio se contrata
  tecnico_id        BigInt?      // Técnico asignado
  fecha_hora        DateTime     @db.Timestamptz(6)
  duracion_minutos  Int
  estado            estado_cita  @default(pendiente)  // pendiente|confirmada|cancelada|realizada
  precio_aplicado   Decimal?     @db.Decimal(12, 2)
  notas_cliente     String?
  notas_internas    String?
  cancelada_en      DateTime?
  cancelada_por_usuario_id BigInt?
  // ... más campos
}

enum estado_cita {
  pendiente
  confirmada
  cancelada
  realizada
}
```

#### 🏡 `jardin`
Propiedades de clientes donde se realizan los trabajos.
```typescript
model jardin {
  id                  BigInt     @id @default(autoincrement())
  cliente_id          BigInt
  nombre              String     @db.VarChar(100)
  area_m2             Decimal?   @db.Decimal(10, 2)
  tipo_suelo          String?    @db.VarChar(50)
  descripcion         String?
  imagen_principal_id BigInt?
  activo              Boolean    @default(true)
  direccion_id        BigInt?
  fecha_creacion      DateTime   @default(now())
  fecha_actualizacion DateTime   @default(now())
  
  // Relaciones
  usuario             usuario    @relation(fields: [cliente_id], references: [id])
  direccion           direccion?
  imagen              imagen?
}
```

#### 💰 `pago`
Gestión de pagos de citas.
```typescript
model pago {
  id                   BigInt       @id @default(autoincrement())
  cita_id              BigInt
  usuario_id           BigInt       // Quien paga
  metodo               metodo_pago  // flow | transferencia
  estado               estado_pago  @default(pendiente)  // pendiente|aprobado|rechazado
  monto_clp            Decimal      @db.Decimal(12, 2)
  flow_order_id        String?
  flow_token           String?
  flow_status          String?
  validado_por_usuario_id BigInt?   // Admin que validó
  validado_en          DateTime?
  creado_en            DateTime     @default(now())
  actualizado_en       DateTime     @default(now())
  
  // Relaciones
  cita                 cita
  usuario_pago_usuario_idTousuario usuario
  usuario_pago_validado_por_usuario_idTousuario usuario?
  pago_evento          pago_evento[]
}

enum estado_pago {
  pendiente
  aprobado
  rechazado
  fallido
  anulado
}

enum metodo_pago {
  flow
  transferencia
}
```

#### 💬 `conversacion` y `mensaje`
Sistema de mensajería.
```typescript
model conversacion {
  id                        BigInt @id @default(autoincrement())
  tipo                      String @db.VarChar(20)  // "privada", "grupal"
  contexto_id               BigInt?  // ID de cita si es relacionada
  fecha_creacion            DateTime @default(now())
  
  // Relaciones
  mensaje                   mensaje[]
  participante_conversacion participante_conversacion[]
}

model mensaje {
  id                BigInt       @id @default(autoincrement())
  conversacion_id   BigInt
  remitente_id      BigInt
  cuerpo            String?
  adjunto_imagen_id BigInt?
  creado_en         DateTime     @default(now())
  editado_en        DateTime?
  eliminado_en      DateTime?
  
  // Relaciones
  conversacion      conversacion
  usuario           usuario
  imagen            imagen?
  mensaje_leido     mensaje_leido[]
}
```

#### 🏷️ `servicio`
Servicios disponibles del negocio.
```typescript
model servicio {
  id                  BigInt   @id @default(autoincrement())
  nombre              String   @unique @db.VarChar(100)
  descripcion         String?
  duracion_minutos    Int?
  precio_clp          Decimal? @db.Decimal(12, 2)
  imagen_id           BigInt?
  activo              Boolean  @default(true)
  fecha_creacion      DateTime @default(now())
  
  // Relaciones
  cita                cita[]
  imagen              imagen?
}
```

#### 🖼️ `portafolio_item`
Trabajos completados para mostrar en portafolio.
```typescript
model portafolio_item {
  id                  BigInt              @id @default(autoincrement())
  titulo              String              @db.VarChar(150)
  descripcion         String?
  imagen_principal_id BigInt?
  publicado           Boolean             @default(false)
  publicado_en        DateTime?
  creado_en           DateTime            @default(now())
  actualizado_en      DateTime            @default(now())
  visita_origen_id    BigInt?  // Vinculado a una visita/cita
  
  // Relaciones
  portafolio_imagen   portafolio_imagen[]
  imagen              imagen?
  visita              visita?
}
```

#### 🔗 Otras relaciones importantes:
- `visita`: Detalles de trabajos realizados (fotos, productos usados)
- `disponibilidad`: Horarios disponibles de técnicos
- `confirm_token`: Tokens para confirmación de email
- `reset_token`: Tokens para recuperación de contraseña
- `imagen`: Almacenamiento de URLs de imágenes
- `notificacion`: Notificaciones push
- `producto` y `visita_producto`: Insumos usados en trabajos

---

## 🔌 Backend - Express

### Ubicación: `backend/src/server.ts`

### Configuración inicial:
```typescript
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { prisma } from './lib/prisma'
import bcrypt from 'bcryptjs'
import nodemailer from "nodemailer"
import jwt from "jsonwebtoken"

const app = express()

// CORS configurado para localhost:3000
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}))

app.use(express.json())
app.use(cookieParser())
```

### Middleware de Autenticación:
```typescript
function authMiddleware(req: Request, res: Response, next: any) {
  const token = req.cookies?.token
  if (!token) {
    return res.status(401).json({ error: "No autorizado. Token no encontrado." })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!)
    (req as any).user = decoded
    next()
  } catch (err) {
    return res.status(403).json({ error: "Token inválido o expirado" })
  }
}
```

### Helper de serialización:
```typescript
function toJSONSafe<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_k, v) => (typeof v === 'bigint' ? Number(v) : v))
  )
}
```
Este helper convierte `BigInt` a `Number` para poder enviar al cliente (JSON no soporta BigInt).

---

## 🎨 Frontend - Next.js

### Configuración:
- **Framework:** Next.js 15.5.3
- **UI Framework:** DaisyUI + Shadcn/ui + Tailwind CSS
- **Fuente:** Poppins (Google Fonts)
- **Tema:** Light mode

### Rutas principales:
- `/` - Landing page
- `/login` - Iniciar sesión
- `/register` - Registrarse
- `/profile` - Perfil de usuario
- `/chat` - Chat en tiempo real
- `/mensajes` - Sistema de mensajería
- `/portfolio` - Portafolio de trabajos
- `/our-services` - Servicios disponibles
- `/about-us` - Información del negocio
- `/confirm-email` - Confirmación de email
- `/forgot-password` - Solicitar reset de contraseña
- `/reset-password` - Reset de contraseña
- `/change-password` - Cambiar contraseña (usuario autenticado)

### Estructura de componentes:
```
components/
├── Navbar.tsx                    # Barra de navegación global
├── chat-message.tsx              # Componente de mensaje en chat
├── realtime-chat.tsx             # Chat en tiempo real
└── ui/                           # Componentes reutilizables
    ├── button.tsx
    └── input.tsx
```

---

## 🔐 Autenticación

### Flujo de Registro:
1. Usuario ingresa email, nombre, apellido, teléfono, contraseña
2. Backend genera token de confirmación con expiry
3. Se envía email con link de confirmación
4. Usuario hace clic en link
5. Se valida token y usuario queda activo
6. Se genera JWT y se guarda en cookie

### Flujo de Login:
1. Usuario ingresa email y contraseña
2. Backend verifica credenciales con bcrypt
3. Si es válido, genera JWT
4. JWT se guarda en cookie con flag `httpOnly`
5. Frontend queda autenticado

### Flujo de Recuperación de Contraseña:
1. Usuario ingresa email en `/forgot-password`
2. Backend genera token con expiry 1 hora
3. Se envía email con link `/reset-password?token=...`
4. Usuario ingresa nueva contraseña
5. Se valida token y se actualiza contraseña

### Cambio de Contraseña (Autenticado):
1. Usuario en `/change-password` ingresa contraseña actual
2. Se verifica contraseña actual
3. Si es válida, se actualiza a la nueva

---

## 📡 Endpoints de la API

### Salud de la API
```
GET /health
```
Respuesta: `{ db: 'ok' }`

### Usuarios
```
GET /usuario                    # Listar usuarios (con paginación)
GET /usuario/:id                # Obtener usuario por ID
POST /register                  # Registrarse
POST /login                     # Iniciar sesión
GET /profile                    # Perfil del usuario autenticado (protegido)
GET /logout                     # Cerrar sesión
POST /forgot-password           # Solicitar reset
POST /reset-password            # Cambiar contraseña con token
POST /change-password           # Cambiar contraseña autenticado
GET /confirm-email              # Confirmar email con token
```

### Citas
```
GET /cita                       # Listar citas
POST /cita                      # Crear cita
GET /cita/:id                   # Obtener cita
PUT /cita/:id                   # Actualizar cita
DELETE /cita/:id                # Cancelar cita
```

### Servicios
```
GET /servicio                   # Listar servicios
POST /servicio                  # Crear servicio
GET /servicio/:id               # Obtener servicio
PUT /servicio/:id               # Actualizar servicio
DELETE /servicio/:id            # Eliminar servicio
```

### Pagos
```
GET /pago                       # Listar pagos
POST /pago                      # Crear pago
GET /pago/:id                   # Obtener pago
PUT /pago/:id                   # Actualizar pago (validar/rechazar)
```

### Mensajes
```
GET /conversacion               # Listar conversaciones
POST /conversacion              # Crear conversación
POST /mensaje                   # Enviar mensaje
GET /mensaje/:conversacionId    # Obtener mensajes de conversación
```

### Jardines
```
GET /jardin                     # Listar jardines
POST /jardin                    # Crear jardín
GET /jardin/:id                 # Obtener jardín
PUT /jardin/:id                 # Actualizar jardín
DELETE /jardin/:id              # Eliminar jardín
```

### Portafolio
```
GET /portafolio                 # Listar items portafolio
POST /portafolio                # Crear item portafolio
GET /portafolio/:id             # Obtener item portafolio
PUT /portafolio/:id             # Actualizar item portafolio
DELETE /portafolio/:id          # Eliminar item portafolio
```

---

## 🔐 Variables de Entorno

### Backend `.env`
```bash
# Base de datos
DATABASE_URL="postgresql://user:password@localhost:5432/cleanandgarden"
DATABASE_URL_DIRECT="postgresql://user:password@localhost:5432/cleanandgarden"

# JWT
JWT_SECRET="tu-secreto-super-seguro-change-me"

# Email
EMAIL_USER="tu-email@gmail.com"
EMAIL_PASS="tu-app-password-de-gmail"

# Frontend URL
FRONTEND_URL="http://localhost:3000"

# Puerto
PORT=5000
```

### Web `.env.local`
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

---

## 🚀 Cómo Ejecutar el Proyecto

### Prerequisitos:
- Node.js 18+
- PostgreSQL 13+
- Git

### 1. Clonar el repositorio
```bash
git clone https://github.com/asapHallvaror/CleanAndGarden.git
cd CleanAndGarden
```

### 2. Configurar Backend
```bash
cd backend

# Instalar dependencias
npm install

# Crear archivo .env
cat > .env << EOF
DATABASE_URL="postgresql://user:password@localhost:5432/cleanandgarden"
DATABASE_URL_DIRECT="postgresql://user:password@localhost:5432/cleanandgarden"
JWT_SECRET="secreto-cambiar-en-produccion"
EMAIL_USER="tu-email@gmail.com"
EMAIL_PASS="tu-app-password"
FRONTEND_URL="http://localhost:3000"
PORT=5000
EOF

# Ejecutar migraciones de Prisma
npx prisma migrate dev

# (Opcional) Ver base de datos en Prisma Studio
npm run prisma:studio

# Iniciar servidor (con hot reload)
npm run dev
```

### 3. Configurar Frontend
```bash
cd ../web

# Instalar dependencias
npm install

# Crear archivo .env.local
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
EOF

# Iniciar servidor Next.js
npm run dev
```

### 4. Acceder a la aplicación
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Prisma Studio: http://localhost:5555

---

## 💼 Flujos de Negocio

### 1. Flujo de Registro y Confirmación
```
Cliente ingresa a /register
    ↓
Backend valida email único
    ↓
Genera contraseña hasheada + token confirmación
    ↓
Envía email con link confirmación
    ↓
Cliente hace clic en link
    ↓
Backend valida token y activa usuario
    ↓
Redirige a login para autenticarse
```

### 2. Flujo de Booking (Reservar Cita)
```
Cliente autenticado en /chat o booking
    ↓
Selecciona jardín, servicio, fecha y hora
    ↓
Backend verifica disponibilidad del técnico
    ↓
Crea cita con estado "pendiente"
    ↓
Envía notificación a técnico
    ↓
Técnico acepta o rechaza
    ↓
Si acepta, estado cambia a "confirmada"
    ↓
Cliente puede ver cita confirmada
```

### 3. Flujo de Pago
```
Cliente en cita confirmada elige método de pago
    ↓
Si es Flow: 
  - Backend integra con pasarela Flow
  - Cliente es redirigido a Flow
  - Flow notifica al backend cuando está pagado
  
Si es Transferencia:
  - Cliente sube comprobante
  - Admin valida la transferencia
  - Marca pago como aprobado
    ↓
Estado cita cambia a "realizada" cuando técnico termina
```

### 4. Flujo de Visita y Portafolio
```
Técnico comienza cita
    ↓
Durante la visita toma fotos y usa productos
    ↓
Registra la visita con detalles
    ↓
Puede crear item de portafolio con las fotos
    ↓
Publica en portafolio (visible para clientes)
```

---

## 🐛 Problemas Conocidos y Soluciones

### Problema 1: Error TS2322 - Falta `rol_id` al crear usuario
**Causa:** La relación entre `usuario` y `rol` es obligatoria (1:1).
**Solución:** Siempre incluir `rol_id` al crear usuario:
```typescript
await prisma.usuario.create({
  data: {
    nombre,
    email,
    rol_id: 1,  // 👈 OBLIGATORIO
    // ... otros campos
  }
})
```

### Problema 2: Error SSL "self-signed certificate in certificate chain"
**Causa:** NodeJS no acepta certificados SSL auto-firmados de Gmail.
**Solución:** Agregar configuración TLS a Nodemailer:
```typescript
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,  // 👈 PERMITE CERTIFICADOS AUTO-FIRMADOS
  },
})
```

### Problema 3: JWT expirado pero usuario sigue intentando acceder
**Causa:** El token en cookie expiró.
**Solución:** Implementar middleware que redirija a login si token es inválido:
```typescript
if (!token || !verifyToken(token)) {
  return res.status(401).json({ error: "Sesión expirada" })
}
```

### Problema 4: BigInt no se serializa a JSON
**Causa:** JSON.stringify no soporta BigInt nativamente.
**Solución:** Usar la función `toJSONSafe`:
```typescript
res.json(toJSONSafe(usuarios))  // Convierte BigInt → Number
```

### Problema 5: CORS error - Frontend no puede llamar a API
**Causa:** CORS no está configurado correctamente.
**Solución:** Verificar que `origin` en CORS coincida:
```typescript
app.use(cors({
  origin: "http://localhost:3000",  // 👈 DEBE SER URL EXACTA DEL FRONTEND
  credentials: true,
}))
```

---

## 📊 Cambios Recientes (15 Oct 2025)

### Correciones de TypeScript
1. ✅ Agregado `rol_id: 1` al crear usuario (Línea 461)
2. ✅ Reemplazado `usuario_rol` por `rol` en queries (Líneas 1305-1324)
3. ✅ Agregada configuración TLS en Nodemailer en 3 ubicaciones

### Dependencias Críticas
- Asegurar que `@prisma/client` versión 6.16.2+ está instalada
- Asegurar que tipos de TypeScript estén actualizados

---

## 🔄 Flujo de Actualización de Código

Cuando otros compañeros hagan cambios:

1. **Pull changes:**
   ```bash
   git pull origin main
   ```

2. **Si se modificó schema.prisma:**
   ```bash
   cd backend
   npm install  # En caso de nuevas dependencias
   npx prisma migrate dev
   npx prisma generate
   ```

3. **Si hay nuevas variables .env:**
   ```bash
   # Actualizar .env con nuevas claves
   ```

4. **Reiniciar servicios:**
   ```bash
   # Terminal 1: Backend
   cd backend
   npm run dev

   # Terminal 2: Frontend
   cd web
   npm run dev
   ```

---

## 📞 Contacto y Preguntas

Para más información sobre partes específicas del código, consulta:
- `backend/src/server.ts` - Todos los endpoints
- `backend/prisma/schema.prisma` - Estructura de datos
- `web/src/app/` - Páginas del frontend

---

**Última actualización:** 15 de Octubre de 2025
**Versión del Proyecto:** 1.0.0
**Estado:** En desarrollo

