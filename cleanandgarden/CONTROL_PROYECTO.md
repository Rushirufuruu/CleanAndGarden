# 🎛️ GUÍA DE CONTROL DEL PROYECTO - CLEAN & GARDEN

**Para mantener control total sobre el proyecto**

---

## 📊 Dashboard de Estado

### Verificar que todo funciona correctamente

#### 1️⃣ Terminal 1 - Backend
```bash
cd backend
npm run dev
```
Debe ver: `✅ Server running on http://localhost:5000`

#### 2️⃣ Terminal 2 - Frontend
```bash
cd web
npm run dev
```
Debe ver: `✅ Ready in 2.5s`

#### 3️⃣ Verificar conexión
```bash
curl http://localhost:5000/health
```
Respuesta: `{"db":"ok"}`

---

## 🔍 Inspeccionar Cambios

### Que otros compañeros hayan hecho

```bash
# Ver estado actual de git
git status

# Ver últimos commits
git log --oneline -10

# Ver qué archivos cambiaron
git diff --name-only

# Ver qué cambios específicos se hicieron
git diff

# Ver cambios en un archivo específico
git diff backend/src/server.ts

# Ver quién hizo qué en cada línea
git blame backend/src/server.ts
```

---

## 📝 Hacer Cambios de Forma Segura

### Flujo recomendado:

#### 1. Crear rama para tu trabajo
```bash
# Ver ramas disponibles
git branch -a

# Crear y cambiar a nueva rama
git checkout -b feature/tu-feature-aqui

# O desde main, traer cambios primero
git checkout main
git pull origin main
git checkout -b feature/tu-feature-aqui
```

#### 2. Hacer cambios locales
```bash
# Editar archivos...

# Ver qué cambió
git status
git diff

# (Opcional) Ver cambios en archivo específico
git diff backend/src/server.ts
```

#### 3. Verificar que compila sin errores

**Backend:**
```bash
cd backend
npm run build
```

**Frontend:**
```bash
cd web
npm run build
```

#### 4. Hacer commit
```bash
# Ver cambios a commitear
git diff --staged

# Agregar cambios
git add .

# Commit con mensaje descriptivo
git commit -m "feat: agregar endpoint para listar jardines"

# Ver commits
git log --oneline -5
```

#### 5. Hacer push
```bash
git push origin feature/tu-feature-aqui
```

#### 6. Hacer Pull Request en GitHub
- Ve a https://github.com/asapHallvaror/CleanAndGarden
- GitHub mostrará un botón "Compare & pull request"
- Describe qué hiciste
- Espera revisión

---

## 🚨 Resolver Conflictos

Si alguien hizo cambios al mismo archivo:

```bash
# Actualizar main
git fetch origin
git merge origin/main

# Git mostrará conflictos
# Edita los archivos con conflictos (búsca <<<<< ===== >>>>>)
# Resuelve los conflictos manualmente

# Agregar cambios resueltos
git add .

# Completar merge
git commit -m "Resolver conflictos con main"
git push origin tu-rama
```

---

## 🗄️ Controlar Base de Datos

### Ver esquema actual
```bash
cd backend
npm run prisma:studio
```
Se abre http://localhost:5555 con interfaz visual

### Ver todas las tablas en terminal
```bash
cd backend

# Abrir PostgreSQL directamente
psql postgresql://user:password@localhost:5432/cleanandgarden

# Ver tablas
\dt

# Ver estructura de tabla
\d usuario

# Salir
\q
```

### Hacer migración (cambiar schema)

```bash
cd backend

# 1. Editar backend/prisma/schema.prisma

# 2. Crear migración
npx prisma migrate dev --name "descripcion-del-cambio"

# 3. Regenerar tipos TypeScript
npx prisma generate

# 4. Hacer commit
git add .
git commit -m "feat: agregar campo nuevo_campo a usuario"
```

---

## 🔐 Manejar Variables de Entorno

### Backend `.env` - NUNCA commitear esto
```bash
# Tener .env SOLO localmente
# NUNCA hacer git add .env

# Si alguien lo commitea accidentalmente:
git rm --cached backend/.env
git commit -m "Remove .env file"

# Luego agregar a .gitignore si no está:
echo ".env" >> backend/.gitignore
git add backend/.gitignore
git commit -m "Add .env to gitignore"
```

### Ver variables de entorno necesarias
```bash
# Backend
cat backend/.env

# Frontend
cat web/.env.local
```

---

## 📚 Monitorear Cambios de Compañeros

### Notificaciones de cambios
```bash
# Ver cambios en main
git log origin/main --oneline -10

# Ver qué cambió hoy
git log --since="1 day ago" --oneline

# Ver cambios por persona
git log --author="nombre-compañero" --oneline

# Ver cambios en archivo específico
git log backend/src/server.ts --oneline -5
```

### Mantener tu rama actualizada
```bash
# Fetch últimos cambios
git fetch origin

# Traer cambios de main a tu rama
git merge origin/main

# Si hay conflictos, resolverlos (ver sección anterior)
```

---

## ✅ Checklist Diario

- [ ] `git status` - ¿hay cambios sin guardar?
- [ ] `git pull origin main` - ¿hay cambios de otros?
- [ ] `npm run dev` (backend) - ¿compila?
- [ ] `npm run dev` (frontend) - ¿compila?
- [ ] `curl http://localhost:5000/health` - ¿BD conectada?

---

## 🐛 Debugging

### Backend no inicia
```bash
cd backend

# 1. Verificar errores de TypeScript
npm run build

# 2. Verificar BD conectada
curl http://localhost:5000/health

# 3. Ver logs detallados
DEBUG=* npm run dev

# 4. Revisar archivo .env
cat .env | grep DATABASE_URL
```

### Frontend no inicia
```bash
cd web

# 1. Limpiar cache Next.js
rm -rf .next

# 2. Reinstalar dependencias
rm -rf node_modules
npm install

# 3. Iniciar de nuevo
npm run dev
```

### Problema: "Cannot find module"
```bash
cd backend

# 1. Regenerar tipos Prisma
npx prisma generate

# 2. Reinstalar dependencias
rm -rf node_modules
npm install

# 3. Reiniciar servidor
npm run dev
```

---

## 📊 Monitorear Performance

### Backend requests
```bash
# Ver requests en tiempo real (Linux/Mac)
tail -f backend-logs.txt | grep "POST\|GET\|PUT\|DELETE"

# Windows: abrir una segunda terminal en backend
npm run dev  # Ya muestra logs
```

### Base de datos
```bash
# Ver queries lentes
# En PostgreSQL
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

---

## 🔄 Actualizar Dependencias

### Backend
```bash
cd backend

# Ver qué dependencias tienen actualizaciones
npm outdated

# Actualizar dependencias menores
npm update

# Actualizar a versiones mayores (MÁS RIESGOSO)
npm upgrade

# Luego testear
npm run build
npm run dev
```

### Frontend
```bash
cd web

# Ver qué dependencias tienen actualizaciones
npm outdated

# Actualizar dependencias menores
npm update

# Testear
npm run build
npm run dev
```

---

## 🎯 Distribuir Tareas

### Evitar conflictos

#### Si trabajas en Backend:
- ✅ Trabaja en rama `feature/backend-xxx`
- ✅ No toqued `web/`
- ✅ Communica en Discord qué endpoints cambias

#### Si trabajas en Frontend:
- ✅ Trabaja en rama `feature/frontend-xxx`
- ✅ No toques `backend/src/`
- ✅ Comunica qué endpoints necesitas

#### Si trabajas en BD:
- ✅ Trabaja en rama `feature/db-xxx`
- ✅ Usa `npx prisma migrate dev`
- ✅ COMUNICA cambios a todo el equipo

---

## 📤 Deployment (Cuando esté listo)

### Variables de entorno producción
```bash
# Backend producción
DATABASE_URL=postgresql://prod-user:prod-pass@prod-host/dbname
JWT_SECRET=tu-secreto-muy-largo-y-seguro
EMAIL_USER=info@cleanandgarden.cl
EMAIL_PASS=password-produccion
FRONTEND_URL=https://cleanandgarden.cl
NODE_ENV=production
```

### Compilar para producción
```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd web
npm run build
npm start
```

---

## 📞 Matriz de Responsabilidades

| Componente | Responsable | Rama |
|-----------|------------|------|
| Backend API | ? | `feature/backend-*` |
| Frontend Pages | ? | `feature/frontend-*` |
| Base de Datos | ? | `feature/db-*` |
| Deployments | ? | main |
| DevOps/Infra | ? | - |

**TODO: Asignar responsables**

---

## 🎓 Comandos Git Avanzados

```bash
# Ver cambios detallados
git diff --color

# Ver cambios de un commit específico
git show abc123

# Ver historial de un archivo
git log -p backend/src/server.ts

# Revertir un commit
git revert abc123

# Resetear cambios locales (CUIDADO)
git reset --hard origin/main

# Ver qué branches existen
git branch -a

# Eliminar rama local
git branch -d nombre-rama

# Eliminar rama remota
git push origin --delete nombre-rama

# Ver tags
git tag

# Crear tag para versión
git tag v1.0.0
git push origin v1.0.0
```

---

## 📋 Checklist de Seguridad

- [ ] `.env` NUNCA está commiteado
- [ ] Secretos NUNCA están en código
- [ ] No hay `TODO` de secretos en código
- [ ] Contraseñas NUNCA en commit
- [ ] Tokens NUNCA en código
- [ ] SQL injection evitado (usamos Prisma)
- [ ] CORS configurado solo para dominios autorizados

---

## 🚀 Quick Fixes

### "El backend se colgó"
```bash
# Forzar parada
Ctrl+C en terminal

# Limpiar puerto
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :5000
kill -9 <PID>
```

### "Perdí mis cambios"
```bash
# Ver commits recientes
git reflog

# Recuperar commit
git cherry-pick abc123
```

### "Quiero empezar de cero"
```bash
# Crear rama nueva desde main
git checkout main
git pull origin main
git checkout -b feature/fresh-start

# Esto te da un punto limpio de partida
```

---

## 📞 Línea de Comunicación

**Discord/Slack/Telegram:**
- Backend changes → #backend
- Frontend changes → #frontend
- Database changes → #database
- Issues/Bugs → #bugs

**Antes de mergear a main:**
- Avisa en el canal correspondiente
- Espera aprobación de líder técnico
- Asegúrate que CI/CD pase

---

## 🎯 Métricas de Salud del Proyecto

Revisar diariamente:

```bash
# 1. Commits recientes
git log --oneline -5

# 2. Branches activas
git branch -a | wc -l

# 3. Pull requests abiertos
# (Ver en GitHub)

# 4. Issues abiertos
# (Ver en GitHub)

# 5. Cobertura de tests
# (Configurar en futuro)

# 6. Build status
# (Configurar CI/CD)
```

---

**Última actualización:** 15 de Octubre 2025  
**Mantén este documento actualizado** 📝

