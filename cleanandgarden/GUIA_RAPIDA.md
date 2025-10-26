# ⚡ GUÍA RÁPIDA DE REFERENCIA - CLEAN & GARDEN

**Acceso rápido a información crítica**

---

## 📍 URLs Importantes

| Servicio | URL | Puerto |
|----------|-----|--------|
| Frontend (Next.js) | http://localhost:3000 | 3000 |
| Backend (Express) | http://localhost:5000 | 5000 |
| Prisma Studio | http://localhost:5555 | 5555 |
| Base de datos | postgresql://localhost:5432 | 5432 |

---

## 🗝️ Variables de Entorno Críticas

### Backend
```bash
DATABASE_URL              # Conexión PostgreSQL
JWT_SECRET               # Clave para tokens JWT
EMAIL_USER               # Email para enviar correos
EMAIL_PASS               # App Password de Gmail
FRONTEND_URL             # URL del frontend
PORT                     # Puerto del servidor (default: 5000)
```

### Frontend
```bash
NEXT_PUBLIC_API_URL      # URL del backend (debe ser accesible desde navegador)
```

---

## 🚀 Comandos Principales

### Backend
```bash
cd backend

npm install              # Instalar dependencias
npm run dev             # Iniciar servidor con hot reload
npm run build           # Compilar TypeScript
npm start               # Ejecutar versión compilada
npm run prisma:studio   # Abrir Prisma Studio
npm run prisma:gen      # Regenerar cliente Prisma
npm run prisma:pull     # Sincronizar schema con BD
```

### Frontend
```bash
cd web

npm install              # Instalar dependencias
npm run dev             # Iniciar Next.js
npm run build           # Compilar para producción
npm start               # Ejecutar versión compilada
npm run lint            # Verificar código
```

---

## 📋 Stack Tecnológico Resumido

### Backend: Express + Prisma + PostgreSQL
- **Node.js** con TypeScript
- **Prisma ORM** para manejo de BD
- **PostgreSQL** como base de datos
- **JWT** para autenticación
- **bcryptjs** para hashing de contraseñas
- **Nodemailer** para emails

### Frontend: Next.js + React + Tailwind
- **Next.js 15** con App Router
- **React 19** para UI
- **Tailwind CSS + DaisyUI** para estilos
- **TypeScript** para type-safety
- **Supabase** (opcional) para auth/storage

---

## 🗄️ Modelos de Datos Clave

### Tabla Central
```
usuario (id, nombre, email, rol_id, ...)
  ├── rol (1:1)
  ├── cita (1:N) como cliente/técnico
  ├── jardin (1:N)
  └── mensaje (1:N)
```

### Flujo de Negocio
```
cita (cliente, servicio, técnico, jardin)
  ├── estado: pendiente → confirmada → realizada → cancelada
  ├── pago (1:1) 
  ├── visita (1:1) - detalles del trabajo
  └── evento_cita (1:N) - historial de eventos
```

---

## 🔐 Autenticación en 30 segundos

1. **Registro:** POST `/register` → Email confirmación → Usuario inactivo
2. **Confirmación:** GET `/confirm-email?token=xxx` → Usuario activo
3. **Login:** POST `/login` → JWT en cookie → Autenticado
4. **Protección:** Middleware valida JWT en cada request
5. **Logout:** GET `/logout` → Limpiar cookie

**Token JWT se guarda en cookie con `httpOnly=true`**

---

## 🐛 Errores Frecuentes y Soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| `ESOCKET: self-signed certificate` | SSL cert inválido | Usar `tls: { rejectUnauthorized: false }` en Nodemailer |
| `TS2322: rol is missing` | Falta `rol_id` en create usuario | Agregar `rol_id: 1` (ajustar ID según datos) |
| `CORS error` | Backend no permite origen | Verificar `origin` en CORS = URL del frontend |
| `BigInt is not serializable` | JSON.stringify falla con BigInt | Usar función `toJSONSafe()` |
| `Token expired` | JWT expiró | User debe volver a login, o implementar refresh token |

---

## 📂 Dónde Encontrar Cosas

| Necesito... | Ubicación |
|-----------|-----------|
| Endpoints de la API | `backend/src/server.ts` líneas 1-1342 |
| Estructura de BD | `backend/prisma/schema.prisma` |
| Configuración Prisma | `backend/src/lib/prisma.ts` |
| Email config | `backend/src/lib/mailer.ts` |
| Landing page | `web/src/app/page.tsx` |
| Layout global | `web/src/app/layout.tsx` |
| Página de login | `web/src/app/login/page.tsx` |
| Chat | `web/src/app/chat/page.tsx` |
| Componentes UI | `web/src/components/` |
| Hooks personalizados | `web/src/hooks/` |

---

## 🎯 Flujos Típicos del Desarrollador

### Agregar nuevo endpoint
1. Abre `backend/src/server.ts`
2. Agrega `app.get/post/put/delete('/ruta', handler)`
3. En handler: usa `prisma.<modelo>.findMany/findUnique/create/update/delete`
4. Retorna con `res.json(toJSONSafe(resultado))`
5. Reinicia servidor

### Agregar nuevo campo a usuario
1. Edita `backend/prisma/schema.prisma`
2. Agrega campo al modelo `usuario`
3. Corre `npx prisma migrate dev --name <nombre_cambio>`
4. Tipos TypeScript se regeneran automáticamente
5. Usa en código: `usuario.nuevocampo`

### Crear nueva página en Next.js
1. Crea carpeta en `web/src/app/<ruta>/`
2. Crea `page.tsx` dentro
3. Exporta componente React por defecto
4. URL disponible en http://localhost:3000/<ruta>

### Autenticar una ruta
1. En backend: usa `authMiddleware` antes del handler
2. En frontend: verifica token en cookie en componente
3. Si no hay token, redirige a `/login`

---

## 🔗 Relaciones de Base de Datos Comunes

### Usuario puede ser:
- **Cliente**: Crea citas, paga, tiene jardines
- **Técnico**: Realiza citas, reporta visitas
- **Admin**: Gestiona todo

### Una Cita tiene:
- 1 Cliente (usuario)
- 1 Técnico (usuario) - puede ser NULL
- 1 Servicio
- 1 Jardín
- 1 Pago (opcional)
- 1 Visita (después de completarla)
- N Eventos de auditoría

### Un Pago puede:
- Ser Flow (pasarela integrada)
- Ser Transferencia (manual, requiere validación)
- Estar pendiente, aprobado o rechazado

---

## 💡 Tips Pro

1. **Siempre usar `toJSONSafe()`** cuando devuelves datos de Prisma
2. **Las cookies deben ser `httpOnly`** para seguridad
3. **Verificar token en cada request protegido**
4. **Usar `.env` para secretos, NUNCA en código**
5. **Regenerar tipos de Prisma** después de editar schema
6. **Usar `onDelete: Cascade` para relaciones que deben eliminarse juntas**
7. **BigInt para IDs grandes, Number para cantidades**

---

## 🚨 Checklist Antes de Hacer Push

- [ ] Código compila sin errores (`npm run build`)
- [ ] No hay warnings de TypeScript
- [ ] Variables de entorno están en `.env` (no en código)
- [ ] Pruebas manuales en `/health` endpoint
- [ ] Cookies se guardan correctamente
- [ ] Emails se envían exitosamente
- [ ] Funciona en http://localhost:3000

---

## 📊 Diagrama de Arquitectura

```
┌─────────────────────────────────────┐
│   Frontend (Next.js 3000)           │
│  ┌──────────────────────────────┐   │
│  │ Páginas:                      │   │
│  │ - Landing                     │   │
│  │ - Auth (register/login)       │   │
│  │ - Chat                        │   │
│  │ - Profile                     │   │
│  └──────────────────────────────┘   │
└────────────┬────────────────────────┘
             │ HTTP/REST
             │ (Axios/Fetch)
             ↓
┌─────────────────────────────────────┐
│   Backend (Express 5000)            │
│  ┌──────────────────────────────┐   │
│  │ Endpoints:                    │   │
│  │ - /usuario                    │   │
│  │ - /cita                       │   │
│  │ - /pago                       │   │
│  │ - /mensaje                    │   │
│  └──────────────────────────────┘   │
│          ↓                           │
│  ┌──────────────────────────────┐   │
│  │ Prisma ORM                    │   │
│  └──────────────────────────────┘   │
└────────────┬────────────────────────┘
             │ SQL
             ↓
┌─────────────────────────────────────┐
│   PostgreSQL 5432                   │
│  ┌──────────────────────────────┐   │
│  │ Tablas:                       │   │
│  │ - usuario                     │   │
│  │ - rol                         │   │
│  │ - cita                        │   │
│  │ - pago                        │   │
│  │ - mensaje                     │   │
│  │ - ... más 15+ tablas          │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## 🎓 Para Aprender Más

| Tema | Recurso |
|------|---------|
| Express | https://expressjs.com/es/ |
| Prisma | https://www.prisma.io/docs/ |
| Next.js | https://nextjs.org/docs |
| TypeScript | https://www.typescriptlang.org/ |
| PostgreSQL | https://www.postgresql.org/docs/ |
| JWT | https://jwt.io/ |
| bcrypt | https://github.com/kelektiv/node.bcrypt.js |

---

**Versión:** 1.0  
**Última actualización:** 15 de Octubre 2025

