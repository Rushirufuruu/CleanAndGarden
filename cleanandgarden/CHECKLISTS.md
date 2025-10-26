# ✅ CHECKLISTS Y VERIFICACIONES - CLEAN & GARDEN

**Listas de control para asegurar que todo está correcto**

---

## 🎯 Checklist de Onboarding (Primer Día)

Para que un nuevo desarrollador se integre al proyecto:

### Día 1 - Setup Inicial (2 horas)
- [ ] Git clone del repositorio
- [ ] Leer RESUMEN_EJECUTIVO.md (10 min)
- [ ] Leer GUIA_RAPIDA.md (10 min)
- [ ] Instalar Node.js 18+
- [ ] Instalar PostgreSQL 13+
- [ ] Instalar VSCode extensions necesarias

### Backend Setup (30 min)
- [ ] `cd backend`
- [ ] `npm install`
- [ ] Crear archivo `.env` (copiar template)
- [ ] Llenar variables de entorno
- [ ] `npx prisma generate`
- [ ] `npm run build` (sin errores)
- [ ] `npm run dev` (inicia exitosamente)
- [ ] `curl http://localhost:5000/health` (responde ok)

### Frontend Setup (30 min)
- [ ] `cd web`
- [ ] `npm install`
- [ ] Crear archivo `.env.local` (copiar template)
- [ ] Llenar variables de entorno
- [ ] `npm run build` (sin errores)
- [ ] `npm run dev` (inicia exitosamente)
- [ ] Abrir http://localhost:3000 en navegador

### Verificación (30 min)
- [ ] Backend compilado sin warnings
- [ ] Frontend compilado sin warnings
- [ ] Ambos servidores corriendo sin errores
- [ ] `/health` endpoint responde
- [ ] Landing page carga correctamente
- [ ] Puedo hacer login
- [ ] He leído DOCUMENTACION_COMPLETA.md

---

## 🛡️ Checklist de Seguridad

### Antes de cada Push

- [ ] `.env` NO está commiteado (ver en `git status`)
- [ ] Secretos NO están en código (buscar "TODO", "FIXME", "TEMP")
- [ ] No hay contraseñas en commits (git log --all -S password)
- [ ] No hay API keys expuestas
- [ ] JWT_SECRET no es la clave por defecto
- [ ] EMAIL_PASS no es contraseña real (debe ser app password)
- [ ] Database credentials son de dev/test, no production
- [ ] CORS `origin` es específico, no "*"

### Base de Datos

- [ ] Contraseñas nunca en plain text (siempre bcryptjs)
- [ ] Tokens siempre con expiry
- [ ] Foreign keys con onDelete policy correcto
- [ ] Índices en búsquedas frecuentes
- [ ] Sin inyección SQL (siempre usar Prisma, nunca raw queries)

### Código

- [ ] No hay `console.log` en producción (solo console.error)
- [ ] Errores sensibles no se muestran al cliente
- [ ] Validación en servidor, no solo cliente
- [ ] Rate limiting en endpoints sensibles
- [ ] Headers de seguridad configurados

---

## 📝 Checklist de Calidad de Código

### Antes de hacer Pull Request

- [ ] Código compila sin errores
- [ ] Código compila sin warnings
- [ ] TypeScript tipos correctos (sin `any`)
- [ ] Funciones documentadas con comentarios
- [ ] Variables y funciones con nombres claros
- [ ] Sin código duplicado (DRY)
- [ ] Sin TODO/FIXME sin contexto
- [ ] Sin console.log en producción
- [ ] Sin archivos innecesarios incluidos
- [ ] Cambios testados manualmente

### Tests (Cuando tengamos testing)
- [ ] Unit tests pasan
- [ ] Integration tests pasan
- [ ] Coverage > 80%
- [ ] E2E tests pasan (si existen)

---

## 🚀 Checklist de Performance

### Revisión semanal

#### Backend
- [ ] Endpoints responden en < 200ms
- [ ] Queries no tienen N+1 problem
- [ ] Indexes en tablas grandes
- [ ] Paginación implementada (take/skip)
- [ ] Caching estratégico

#### Frontend
- [ ] Lighthouse score > 90
- [ ] Time to interactive < 3s
- [ ] First contentful paint < 1.5s
- [ ] Imágenes optimizadas
- [ ] Bundles no superan 1MB
- [ ] Sin memory leaks
- [ ] SSR optimizado

#### Base de Datos
- [ ] Backups diarios
- [ ] Replicación funcionando
- [ ] Conexiones pooling configurado
- [ ] Índices optimizados
- [ ] Vacuum y ANALYZE ejecutado

---

## 🐛 Checklist de Debugging

Cuando algo no funciona:

### "El servidor no inicia"
- [ ] ¿Hay errores de compilación? (`npm run build`)
- [ ] ¿Puerto 5000 está libre? (`lsof -i :5000`)
- [ ] ¿DATABASE_URL es correcta en .env?
- [ ] ¿PostgreSQL está corriendo?
- [ ] ¿Dependencias están instaladas? (`npm install`)
- [ ] ¿Node.js es versión correcta? (`node -v`)

### "No puedo conectarme a BD"
- [ ] ¿PostgreSQL está corriendo?
- [ ] ¿Database existe?
- [ ] ¿Usuario/password correcto?
- [ ] ¿Host es correcto?
- [ ] ¿Puerto es 5432?
- [ ] `psql <DATABASE_URL>` funciona?
- [ ] ¿Firewall bloquea?

### "Error de TypeScript"
- [ ] ¿Errores de tipos están claros?
- [ ] ¿Prisma generó correctamente? (`npx prisma generate`)
- [ ] ¿Dependencias de tipos instaladas? (`@types/...`)
- [ ] ¿tsconfig.json es correcto?

### "Frontend no se renderiza"
- [ ] ¿API está corriendo?
- [ ] ¿CORS está configurado?
- [ ] ¿URL de API es correcta en .env?
- [ ] ¿Response tiene formato correcto?
- [ ] ¿Errores en console del navegador?
- [ ] ¿Cookies se guardan?

---

## 📊 Checklist de Release/Deployment

### Antes de IR A PRODUCCIÓN

#### 1. Testing Completo
- [ ] Todos los tests pasan
- [ ] Ningún console.log
- [ ] Ningún FIXME/TODO
- [ ] Funcionalidades principales testeadas manualmente

#### 2. Seguridad
- [ ] No hay secretos en código
- [ ] .env NO commitead
- [ ] JWT_SECRET es único y seguro
- [ ] Database password es seguro
- [ ] CORS configurado correctamente
- [ ] HTTPS habilitado

#### 3. Performance
- [ ] Lighthouse score > 85
- [ ] API responde rápido
- [ ] Database optimizado
- [ ] Images comprimidas

#### 4. Database
- [ ] Migrations ejecutadas
- [ ] Backup creado
- [ ] Schema verificado
- [ ] Datos de test limpiados

#### 5. Documentación
- [ ] README.md actualizado
- [ ] CHANGELOG.md actualizado
- [ ] API docs actualizadas
- [ ] Deploy guide claro

#### 6. Monitoreo
- [ ] Error logging configurado
- [ ] Performance monitoring activo
- [ ] Alertas configuradas
- [ ] Runbook escrito

#### 7. Rollback
- [ ] Plan de rollback claro
- [ ] Backup disponible
- [ ] Versión anterior disponible
- [ ] Procedimiento testeado

---

## 🔄 Checklist de Code Review

Para revisar un Pull Request de compañero:

### Cambios Funcionales
- [ ] ¿El código hace lo que promete?
- [ ] ¿Se cubrieron todos los casos?
- [ ] ¿Se manejaron errores?
- [ ] ¿Hay edge cases?

### Calidad
- [ ] ¿Código es legible?
- [ ] ¿Nombres son claros?
- [ ] ¿Está documentado?
- [ ] ¿Sigue convenciones del proyecto?

### Seguridad
- [ ] ¿Sin secretos expuestos?
- [ ] ¿Validación en servidor?
- [ ] ¿Sin inyección SQL?
- [ ] ¿Autenticación correcta?

### Performance
- [ ] ¿Query optimization?
- [ ] ¿Sin N+1 problems?
- [ ] ¿Caché estratégico?
- [ ] ¿Sin memory leaks?

### Tests
- [ ] ¿Se escribieron tests?
- [ ] ¿Tests pasan?
- [ ] ¿Coverage adecuado?

---

## 📋 Checklist Diario

### Mañana (Inicio de turno)

- [ ] `git pull origin main` - Traer cambios
- [ ] `npm install` (si hay cambios en package.json)
- [ ] `npm run build` - ¿Compila?
- [ ] `npm run dev` - ¿Inicia?
- [ ] `curl http://localhost:5000/health` - ¿BD conectada?
- [ ] Revisar Slack/Discord - ¿Hay issues?

### Tarde (Antes de desconectarse)

- [ ] Todos mis cambios commiteados
- [ ] Nada en `git status` sin guardar
- [ ] Pull Request creado si terminé feature
- [ ] Backend corre sin errores
- [ ] Frontend corre sin errores
- [ ] Archivo CAMBIOS.md actualizado con lo que hice

### Viernes (Antes de desconectarse)

- [ ] Todo mergeado a main
- [ ] Ningún PR pendiente
- [ ] Documentación actualizada
- [ ] CHANGELOG.md actualizado
- [ ] Version bump si corresponde
- [ ] Backup de datos creado

---

## 🎯 Checklist de Feature Completada

Cuando terminas una feature:

### Desarrollo
- [ ] Feature implementada
- [ ] Tests escritos
- [ ] Código refactorizado
- [ ] Performance optimizado

### Documentación
- [ ] DOCUMENTACION_COMPLETA.md actualizado
- [ ] ENDPOINTS_API.md actualizado (si es backend)
- [ ] README.md actualizado
- [ ] Comentarios en código complejos

### Testing Manual
- [ ] Caso happy path funciona
- [ ] Casos edge manejados
- [ ] Errores manejo adecuado
- [ ] Mobile responsivo (si frontend)

### Code Review
- [ ] PR creado
- [ ] 1+ reviewers asignados
- [ ] Feedback incorporado
- [ ] Mergeado a main

### Verificación Final
- [ ] Main aún compila
- [ ] Otros devs pueden usar feature
- [ ] Feature está en CHANGELOG
- [ ] Issue/ticket cerrado

---

## 🗂️ Checklist Semanal (Tech Lead)

**El Tech Lead debe verificar:**

### Código
- [ ] Ningún archivo de backup (.bak, .old)
- [ ] Ningún código comentado sin razón
- [ ] Ningún archivo sin usar
- [ ] Principios SOLID respetados
- [ ] DRY (Don't Repeat Yourself) aplicado

### Seguridad
- [ ] Dependencias actualizadas
- [ ] `npm audit` sin vulnerabilidades críticas
- [ ] Secretos bien guardados
- [ ] Acceso a producción limitado

### Performance
- [ ] Queries optimizadas
- [ ] Bundle size OK
- [ ] Lighthouse score aceptable
- [ ] No hay memory leaks

### Infraestructura
- [ ] Backups funcionando
- [ ] Logs disponibles
- [ ] Monitoreo activo
- [ ] Alertas configuradas

### Team
- [ ] Todos en GUIA_RAPIDA.md
- [ ] Documentación actualizada
- [ ] No hay bloqueadores
- [ ] Comunicación fluida

---

## 📅 Checklist Mensual (Project Manager)

**Revisar estado general:**

### Releases
- [ ] Versión versionada correctamente
- [ ] CHANGELOG.md completo
- [ ] Release notes claras
- [ ] Deploy exitoso

### Backlog
- [ ] Features priorizadas
- [ ] Bugs conocidos documentados
- [ ] Deuda técnica identificada
- [ ] Next sprint planificado

### Team
- [ ] Retrospectiva completada
- [ ] Problemas identificados
- [ ] Mejoras planificadas
- [ ] Capacitación si necesaria

### Usuarios
- [ ] Feedback recolectado
- [ ] Issues reportados
- [ ] Performance OK
- [ ] Uptime > 99%

---

## ⚠️ Checklist de Emergencia

Si algo se rompió en PRODUCCIÓN:

### INMEDIATO (5 min)
- [ ] ¿Se afecta funcionalidad crítica?
- [ ] ¿Afecta a muchos usuarios?
- [ ] Notificar al equipo en Slack
- [ ] Iniciar war room (junta urgente)

### DIAGNÓSTICO (15 min)
- [ ] ¿Cuál es el error exacto?
- [ ] ¿Desde cuándo ocurre?
- [ ] ¿Afecta a todos o algunos?
- [ ] Ver logs de error

### SOLUCIÓN (30 min)
- [ ] Opción 1: Hotfix en main
- [ ] Opción 2: Rollback a versión anterior
- [ ] Opción 3: Feature flag OFF

### VERIFICACIÓN (10 min)
- [ ] Error solucionado
- [ ] Usuarios notificados
- [ ] Status page actualizado
- [ ] Post-mortem programado

### POST-INCIDENT (1 día)
- [ ] Post-mortem reunión
- [ ] Root cause identificada
- [ ] Prevención implementada
- [ ] Documentación actualizada

---

## 🎓 Checklist de Capacitación Técnica

Antes de que alguien toque producción:

- [ ] Entiende Git workflow
- [ ] Entiende estructura del proyecto
- [ ] Entiende cómo hacer cambios seguramente
- [ ] Ha leído toda la documentación
- [ ] Ha hecho primer PR exitosamente
- [ ] Ha revieweado código de compañero
- [ ] Entiende los flujos de negocio
- [ ] Puede debuggear problemas comunes
- [ ] Sabe cómo deployar
- [ ] Sabe cómo hacer rollback

---

**Última actualización:** 15 de Octubre 2025

