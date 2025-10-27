# 📚 ÍNDICE GENERAL DE DOCUMENTACIÓN - CLEAN & GARDEN

**Tu guía completa del proyecto. Actualizado: 15 de Octubre 2025**

---

## 🎯 Empieza por aquí

Eres nuevo en el proyecto? Sigue este orden:

1. **[GUIA_RAPIDA.md](./GUIA_RAPIDA.md)** ⚡ (5 min)
   - URLs importantes
   - Comandos principales
   - Errores frecuentes
   - Tips pro

2. **[DOCUMENTACION_COMPLETA.md](./DOCUMENTACION_COMPLETA.md)** 📖 (30 min)
   - Descripción completa del proyecto
   - Stack tecnológico
   - Base de datos explicada
   - Flujos de negocio
   - Cómo ejecutar

3. **[ENDPOINTS_API.md](./ENDPOINTS_API.md)** 📡 (20 min)
   - Todos los endpoints
   - Ejemplos de requests/responses
   - Códigos de error
   - cURL examples

4. **[CONTROL_PROYECTO.md](./CONTROL_PROYECTO.md)** 🎛️ (15 min)
   - Cómo controlar cambios
   - Cómo hacer cambios seguramente
   - Git workflow
   - Debugging

---

## 📂 Documentación por Tema

### 🏗️ Arquitectura y Stack
- **Archivo:** [DOCUMENTACION_COMPLETA.md#stack-tecnológico](./DOCUMENTACION_COMPLETA.md#-stack-tecnológico)
- **Incluye:** Backend, Frontend, Base de datos

### 🗄️ Base de Datos
- **Archivo:** [DOCUMENTACION_COMPLETA.md#base-de-datos-prisma-schema](./DOCUMENTACION_COMPLETA.md#-base-de-datos-prisma-schema)
- **Incluye:** 20+ tablas, relaciones, enums

### 🔌 Backend Express
- **Archivo:** [DOCUMENTACION_COMPLETA.md#backend---express](./DOCUMENTACION_COMPLETA.md#-backend---express)
- **Incluye:** Rutas, middlewares, configuración

### 🎨 Frontend Next.js
- **Archivo:** [DOCUMENTACION_COMPLETA.md#frontend---nextjs](./DOCUMENTACION_COMPLETA.md#-frontend---nextjs)
- **Incluye:** Rutas, componentes, hooks

### 🔐 Autenticación
- **Archivo:** [DOCUMENTACION_COMPLETA.md#-autenticación](./DOCUMENTACION_COMPLETA.md#-autenticación)
- **Incluye:** JWT, registro, login, recovery

### 📡 API Endpoints
- **Archivo:** [ENDPOINTS_API.md](./ENDPOINTS_API.md)
- **Incluye:** GET, POST, PUT, DELETE con ejemplos

### 💼 Flujos de Negocio
- **Archivo:** [DOCUMENTACION_COMPLETA.md#-flujos-de-negocio](./DOCUMENTACION_COMPLETA.md#-flujos-de-negocio)
- **Incluye:** Registro, Booking, Pagos, Portafolio

### 🐛 Problemas Conocidos
- **Archivo:** [DOCUMENTACION_COMPLETA.md#-problemas-conocidos-y-soluciones](./DOCUMENTACION_COMPLETA.md#-problemas-conocidos-y-soluciones)
- **Incluye:** Soluciones a errores frecuentes

### 🎛️ Control del Proyecto
- **Archivo:** [CONTROL_PROYECTO.md](./CONTROL_PROYECTO.md)
- **Incluye:** Git workflow, debugging, deployment

---

## 🗺️ Navegación por Carpeta

### Backend
```
backend/
├── src/
│   ├── server.ts              ← Todos los endpoints aquí
│   └── lib/
│       ├── prisma.ts          ← Conexión BD
│       ├── mailer.ts          ← Email
│       └── utils.ts           ← Helpers
├── prisma/
│   └── schema.prisma          ← Definición BD
└── package.json               ← Dependencias
```

**Ver documentación:** [DOCUMENTACION_COMPLETA.md#-backend---express](./DOCUMENTACION_COMPLETA.md#-backend---express)

### Frontend
```
web/
├── src/
│   ├── app/
│   │   ├── page.tsx           ← Landing page
│   │   ├── layout.tsx         ← Layout global
│   │   ├── login/             ← Auth pages
│   │   ├── profile/           ← User pages
│   │   ├── chat/              ← Mensajería
│   │   └── ... más pages
│   ├── components/
│   │   ├── Navbar.tsx
│   │   └── ui/                ← Componentes reutilizables
│   ├── hooks/
│   │   ├── use-chat-scroll.tsx
│   │   └── use-realtime-chat.tsx
│   └── lib/
│       ├── client.ts          ← HTTP client
│       └── utils.ts           ← Helpers
├── package.json
└── tailwind.config.js
```

**Ver documentación:** [DOCUMENTACION_COMPLETA.md#-frontend---nextjs](./DOCUMENTACION_COMPLETA.md#-frontend---nextjs)

### Base de Datos
Modelos principales:
- `usuario` - Clientes y técnicos
- `rol` - Roles del sistema
- `cita` - Reservas de servicios
- `pago` - Pagos de citas
- `jardin` - Propiedades de clientes
- `servicio` - Servicios disponibles
- `mensaje` - Mensajería

**Ver documentación:** [DOCUMENTACION_COMPLETA.md#-base-de-datos-prisma-schema](./DOCUMENTACION_COMPLETA.md#-base-de-datos-prisma-schema)

---

## 🚀 Inicio Rápido

### Opción 1: Seguir tutorial completo
```
1. Lee: GUIA_RAPIDA.md (5 min)
2. Lee: DOCUMENTACION_COMPLETA.md (30 min)
3. Ejecuta: npm run dev (ambos)
4. Prueba: curl http://localhost:5000/health
```

### Opción 2: Solo necesito un endpoint
```
1. Abre: ENDPOINTS_API.md
2. Busca el endpoint que necesitas
3. Copia el ejemplo cURL
4. Adapta a tu caso
```

### Opción 3: Necesito hacer cambios de código
```
1. Lee: CONTROL_PROYECTO.md (15 min)
2. Crea una rama: git checkout -b feature/algo
3. Haz cambios
4. Verifica: npm run build
5. Push y Pull Request
```

---

## 💡 Respuestas Rápidas

### "¿Dónde está el endpoint X?"
→ [ENDPOINTS_API.md](./ENDPOINTS_API.md)

### "¿Cómo autenticar?"
→ [DOCUMENTACION_COMPLETA.md#-autenticación](./DOCUMENTACION_COMPLETA.md#-autenticación)

### "¿Cómo está estructurada la BD?"
→ [DOCUMENTACION_COMPLETA.md#-base-de-datos-prisma-schema](./DOCUMENTACION_COMPLETA.md#-base-de-datos-prisma-schema)

### "¿Cómo hago cambios sin romper nada?"
→ [CONTROL_PROYECTO.md](./CONTROL_PROYECTO.md)

### "¿Qué error es este?"
→ [DOCUMENTACION_COMPLETA.md#-problemas-conocidos-y-soluciones](./DOCUMENTACION_COMPLETA.md#-problemas-conocidos-y-soluciones)

### "¿Cómo ejecuto el proyecto?"
→ [DOCUMENTACION_COMPLETA.md#-cómo-ejecutar-el-proyecto](./DOCUMENTACION_COMPLETA.md#-cómo-ejecutar-el-proyecto)

### "¿Cuáles son los comandos?"
→ [GUIA_RAPIDA.md#-comandos-principales](./GUIA_RAPIDA.md#-comandos-principales)

---

## 👥 Información del Equipo

| Rol | Persona | Responsabilidad |
|-----|---------|-----------------|
| Product Owner | ? | Visión del proyecto |
| Tech Lead | ? | Decisiones técnicas |
| Backend Dev | ? | API Express |
| Frontend Dev | ? | Next.js / React |
| DevOps | ? | Infraestructura |

**TODO: Completar matriz de responsabilidades**

---

## 🔍 Buscar en Documentación

### Por palabra clave

| Palabra | Archivo | Línea |
|---------|---------|-------|
| JWT | DOCUMENTACION_COMPLETA.md | Línea ~150 |
| Prisma | DOCUMENTACION_COMPLETA.md | Línea ~200 |
| Docker | - | No tenemos |
| CORS | DOCUMENTACION_COMPLETA.md | Línea ~280 |
| Email | DOCUMENTACION_COMPLETA.md | Línea ~260 |
| Flow (Pagos) | DOCUMENTACION_COMPLETA.md | Línea ~350 |
| Portafolio | ENDPOINTS_API.md | Línea ~600 |
| Chat | ENDPOINTS_API.md | Línea ~400 |

---

## 📊 Estadísticas del Proyecto

| Métrica | Valor |
|---------|-------|
| Versión | 1.0.0 |
| Lenguajes | TypeScript, JavaScript |
| Backend | Express 5.1.0 |
| Frontend | Next.js 15.5.3 |
| Base de Datos | PostgreSQL |
| Tablas | 20+ |
| Endpoints | 30+ |
| Páginas | 15+ |
| Componentes | 20+ |

---

## 🔄 Cambios Recientes

### 15 de Octubre 2025
✅ Corregidos errores de TypeScript:
- Falta de `rol_id` al crear usuario
- Relación incorrecta `usuario_rol` → `rol`
- Certificados SSL en Nodemailer

✅ Documentación completa creada:
- DOCUMENTACION_COMPLETA.md
- GUIA_RAPIDA.md
- ENDPOINTS_API.md
- CONTROL_PROYECTO.md
- README.md (este archivo)

---

## 🎓 Recursos Externos

### Documentación oficial
- [Express.js](https://expressjs.com/es/)
- [Prisma ORM](https://www.prisma.io/docs/)
- [Next.js](https://nextjs.org/docs)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [JWT.io](https://jwt.io/)

### Tutoriales útiles
- TypeScript + Express: https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html
- Next.js desde cero: https://nextjs.org/learn
- Prisma + PostgreSQL: https://www.prisma.io/docs/getting-started
- REST API Best Practices: https://restfulapi.net/

---

## 📞 Soporte

¿Problemas?

1. Primero: Busca en [DOCUMENTACION_COMPLETA.md#-problemas-conocidos-y-soluciones](./DOCUMENTACION_COMPLETA.md#-problemas-conocidos-y-soluciones)
2. Luego: Pregunta en el canal #bugs del Discord/Slack
3. Final: Contacta al Tech Lead

---

## ✅ Checklist de Onboarding

Si eres nuevo en el proyecto:

- [ ] Leí GUIA_RAPIDA.md
- [ ] Leí DOCUMENTACION_COMPLETA.md
- [ ] Clonué el repo: `git clone ...`
- [ ] Instalé dependencias backend: `npm install`
- [ ] Instalé dependencias frontend: `npm install`
- [ ] Creé `.env` en backend
- [ ] Creé `.env.local` en frontend
- [ ] Backend compila: `npm run build`
- [ ] Frontend compila: `npm run build`
- [ ] Backend inicia: `npm run dev` ✅ http://localhost:5000
- [ ] Frontend inicia: `npm run dev` ✅ http://localhost:3000
- [ ] `/health` devuelve ok: ✅
- [ ] Entiendo estructura del proyecto
- [ ] Entiendo flujos de autenticación
- [ ] Entiendo cómo hacer cambios seguramente
- [ ] Creé una rama de feature: `git checkout -b feature/...`

---

## 🚀 Próximos Pasos

1. **Entender la arquitectura** (completo)
2. **Ejecutar el proyecto** (completo)
3. **Hacer un cambio pequeño** (test)
4. **Hacer un Pull Request** (validar workflow)
5. **Integración contínua** (setup CI/CD)
6. **Testing** (unit + integration tests)
7. **Deployment** (staging → production)

---

## 📝 Mantenimiento de Documentación

Esta documentación debe actualizarse cuando:

- [ ] Agregues nuevo endpoint → Actualiza ENDPOINTS_API.md
- [ ] Cambies estructura BD → Actualiza DOCUMENTACION_COMPLETA.md
- [ ] Encuentres bug recurrente → Agrega a "Problemas Conocidos"
- [ ] Agregues nueva página → Actualiza GUIA_RAPIDA.md
- [ ] Cambies flujo de trabajo → Actualiza CONTROL_PROYECTO.md

**Responsable:** Tech Lead

---

## 📄 Versionado de Documentación

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 15/10/2025 | Documentación inicial completa |

---

**Bienvenido al equipo Clean & Garden! 🌱**

Si tienes preguntas, consulta la documentación. Si la respuesta no está, **agrega a la documentación** para que el próximo desarrollador no tenga que pasar por lo mismo.

💚 Happy coding!

