# 📊 RESUMEN EJECUTIVO - CLEAN & GARDEN

**Una página con lo esencial que necesitas saber**

---

## 🎯 ¿QUÉ ES CLEAN & GARDEN?

Plataforma web para gestionar servicios de **limpieza y jardinería**.

**Actores:**
- 👤 Clientes: Reservan y pagan servicios
- 👨‍🔧 Técnicos: Ejecutan los trabajos
- 👨‍💼 Administrador: Gestiona todo

---

## 🏗️ ARQUITECTURA EN 30 SEGUNDOS

```
┌──────────────────────────┐
│  FRONTEND (Next.js)      │ http://localhost:3000
│  - React 19              │
│  - Tailwind + DaisyUI    │
└──────────────┬───────────┘
               │ HTTP/REST
               ↓
┌──────────────────────────┐
│  BACKEND (Express)       │ http://localhost:5000
│  - Node.js + TypeScript  │
│  - 30+ endpoints         │
└──────────────┬───────────┘
               │ SQL
               ↓
┌──────────────────────────┐
│  PostgreSQL              │ localhost:5432
│  - 20+ tablas            │
└──────────────────────────┘
```

---

## 🗄️ DATOS PRINCIPALES

### Tabla `usuario` (Clientes y Técnicos)
```
id, nombre, email, telefono, rol_id, activo, fecha_creacion
```

### Tabla `cita` (Reservas)
```
id, cliente_id, tecnico_id, servicio_id, jardin_id, 
fecha_hora, estado (pendiente|confirmada|realizada|cancelada)
```

### Tabla `pago` (Transacciones)
```
id, cita_id, monto_clp, metodo (flow|transferencia), 
estado (pendiente|aprobado|rechazado)
```

---

## 🔐 FLUJO DE AUTENTICACIÓN

```
1. Usuario en /register
   ↓
2. Backend genera token confirmación + envía email
   ↓
3. Usuario abre link de confirmación
   ↓
4. Usuario activo, puede hacer login en /login
   ↓
5. Backend genera JWT válido por 1 hora
   ↓
6. JWT guardado en cookie httpOnly
   ↓
7. Usuario autenticado en toda la app
```

---

## 📡 ENDPOINTS CLAVE

### Usuarios
- `POST /register` - Registrarse
- `POST /login` - Iniciar sesión
- `GET /profile` - Perfil (protegido)
- `POST /forgot-password` - Reset contraseña

### Citas
- `GET /cita` - Listar citas
- `POST /cita` - Crear cita
- `PUT /cita/:id` - Actualizar cita

### Pagos
- `GET /pago` - Listar pagos
- `POST /pago` - Crear pago
- `PUT /pago/:id/validate` - Validar pago (admin)

### Mensajes
- `POST /conversacion` - Nueva conversación
- `POST /mensaje` - Enviar mensaje
- `GET /mensaje/:conversacionId` - Ver mensajes

---

## 🚀 CÓMO EJECUTAR

### Terminal 1: Backend
```bash
cd backend
npm install
npm run dev
# Debe mostrar: ✅ Server running on http://localhost:5000
```

### Terminal 2: Frontend
```bash
cd web
npm install
npm run dev
# Debe mostrar: ✅ Ready in Xs
```

### Terminal 3: Test
```bash
curl http://localhost:5000/health
# Respuesta: {"db":"ok"}
```

---

## 📋 VARIABLES DE ENTORNO

### Backend `.env`
```
DATABASE_URL=postgresql://...
JWT_SECRET=tu-secreto-aqui
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-app-password
FRONTEND_URL=http://localhost:3000
```

### Frontend `.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 🐛 ERRORES COMUNES

| Error | Solución |
|-------|----------|
| `ESOCKET: self-signed certificate` | Agregar `tls: { rejectUnauthorized: false }` en Nodemailer |
| `TS2322: rol is missing` | Incluir `rol_id: 1` al crear usuario |
| `CORS error` | Verificar que `origin` en CORS = URL del frontend |
| `BigInt is not serializable` | Usar función `toJSONSafe()` |

---

## 📁 ESTRUCTURA ARCHIVOS IMPORTANTES

```
backend/
├── src/server.ts           ← TODOS LOS ENDPOINTS (1342 líneas)
├── src/lib/
│   ├── prisma.ts          ← Conexión BD
│   └── mailer.ts          ← Email
└── prisma/schema.prisma   ← DEFINICIÓN BD

web/
├── src/app/page.tsx       ← Landing page
├── src/app/login/         ← Auth
├── src/app/chat/          ← Mensajería
└── src/components/        ← Componentes reutilizables
```

---

## 🔧 COMANDOS MÁS USADOS

### Backend
```bash
npm run dev              # Iniciar servidor
npm run build            # Compilar
npm run prisma:studio   # Ver BD gráficamente
npm run prisma:gen      # Regenerar tipos
```

### Frontend
```bash
npm run dev              # Iniciar servidor
npm run build            # Compilar
npm run lint             # Verificar código
```

### Git
```bash
git checkout -b feature/xxx    # Crear rama
git add .                       # Preparar cambios
git commit -m "mensaje"        # Guardar cambios
git push origin feature/xxx    # Subir cambios
```

---

## 📱 PÁGINAS DEL FRONTEND

- `/` - Landing page
- `/login` - Iniciar sesión
- `/register` - Registrarse
- `/profile` - Perfil de usuario
- `/chat` - Chat en tiempo real
- `/mensajes` - Sistema de mensajería
- `/portfolio` - Portafolio de trabajos
- `/our-services` - Servicios disponibles
- `/about-us` - Información del negocio

---

## 🎯 RESPONSABILIDADES DEL EQUIPO

| Componente | Responsable | Contacto |
|-----------|------------|----------|
| Backend | ? | ? |
| Frontend | ? | ? |
| Base Datos | ? | ? |
| DevOps | ? | ? |

**TODO: Asignar responsables**

---

## ✅ CHECKLIST DIARIO

Antes de empezar a trabajar:

- [ ] `git pull origin main` - Actualizar código
- [ ] `npm run dev` (backend) - ¿Inicia sin errores?
- [ ] `npm run dev` (frontend) - ¿Inicia sin errores?
- [ ] `curl http://localhost:5000/health` - ¿BD conectada?

---

## 📚 DOCUMENTACIÓN DISPONIBLE

- **README.md** (este archivo) - Overview general
- **GUIA_RAPIDA.md** - Referencia rápida
- **DOCUMENTACION_COMPLETA.md** - Guía exhaustiva
- **ENDPOINTS_API.md** - Referencia de endpoints
- **CONTROL_PROYECTO.md** - Git workflow y control

---

## 🔍 ¿DÓNDE ENCONTRAR X?

| Necesito... | Busca en... |
|-----------|-----------|
| Endpoint específico | ENDPOINTS_API.md |
| Error específico | DOCUMENTACION_COMPLETA.md |
| Cómo hacer cambios | CONTROL_PROYECTO.md |
| Comandos rápidos | GUIA_RAPIDA.md |
| Vista general | Este archivo |

---

## 🚨 EN EMERGENCIAS

### Backend no inicia
```bash
cd backend
npm run build  # Ver errores de compilación
curl http://localhost:5000/health  # Probar conexión BD
```

### Frontend no inicia
```bash
cd web
rm -rf .next node_modules  # Limpiar cache
npm install
npm run dev
```

### BD desconectada
```bash
# Verificar .env tiene DATABASE_URL correcta
cat backend/.env | grep DATABASE_URL

# Probar conexión
psql <DATABASE_URL>
```

---

## 💡 TIPS PRO

1. **Usar `toJSONSafe()`** cuando devuelvas datos de Prisma
2. **Las cookies deben ser `httpOnly`** para seguridad
3. **NUNCA commitear `.env`**
4. **NUNCA subir secretos en código**
5. **Crear rama para cada feature**
6. **No mergear directamente a main**
7. **Verificar que compila antes de push**

---

## 🎓 STACK RESUMIDO

| Capa | Tecnología | Versión |
|-----|-----------|---------|
| Frontend | Next.js | 15.5.3 |
| UI | React + Tailwind | 19.1.1 + 4.1.13 |
| Backend | Express | 5.1.0 |
| ORM | Prisma | 6.16.2 |
| DB | PostgreSQL | 13+ |
| Auth | JWT + bcryptjs | 9.0.2 + 3.0.2 |
| Email | Nodemailer | 7.0.6 |

---

## 🎬 PRÓXIMOS PASOS

1. Lee **GUIA_RAPIDA.md** (5 minutos)
2. Lee **DOCUMENTACION_COMPLETA.md** (30 minutos)
3. Ejecuta `npm run dev` en ambos directorios
4. Prueba `/health` endpoint
5. Explora el código en `backend/src/server.ts`
6. Abre `frontend/src/app/page.tsx` para ver componentes
7. Cuando estés listo, crea tu primer Pull Request

---

## 📞 CONTACTO

- **Discord/Slack:** #general
- **Tech Lead:** ?
- **Email:** ?

---

**¡Bienvenido! 🚀**

Cualquier pregunta, consulta la documentación o pregunta al Tech Lead.

**Última actualización:** 15 de Octubre 2025

