# 📡 REFERENCIA COMPLETA DE ENDPOINTS - CLEAN & GARDEN

**Última actualización:** 15 de Octubre 2025

---

## 🔑 Convenciones

- `[protegido]` = Requiere token JWT válido en cookie
- `BigInt` en respuestas se convierte a `Number`
- Todas las respuestas con éxito retornan status 200
- Errores retornan 400, 401, 403, 404, 500

---

## 🏥 Health Check

### GET `/health`
Verifica conexión a la base de datos.

**Respuesta:**
```json
{
  "db": "ok"
}
```

---

## 👤 Usuarios

### GET `/usuario`
Listar usuarios con paginación y búsqueda.

**Query Parameters:**
- `take`: Cantidad de registros (default: 10)
- `skip`: Cantidad de registros a saltar (default: 0)
- `orderBy`: Campo para ordenar (default: 'id')
- `order`: 'asc' | 'desc' (default: 'asc')
- `search`: Buscar por nombre, apellido o email

**Respuesta (200):**
```json
[
  {
    "id": 1,
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "juan@example.com",
    "telefono": "+56912345678",
    "rol": {
      "codigo": "cliente",
      "nombre": "Cliente"
    }
  }
]
```

---

### POST `/register`
Registrar nuevo usuario.

**Body:**
```json
{
  "nombre": "string",
  "apellido": "string",
  "email": "string (único)",
  "telefono": "string",
  "password": "string (minimo 8 caracteres)"
}
```

**Respuesta (200):**
```json
{
  "message": "Usuario creado. Verifica tu email para activar la cuenta",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "activo": false
  }
}
```

**Errores:**
- `409`: Email ya existe
- `400`: Email ya tiene cuenta pendiente de confirmación
- `400`: Validación de campos fallida

---

### POST `/login`
Iniciar sesión.

**Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Respuesta (200):**
```json
{
  "message": "Sesión iniciada",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "nombre": "Juan"
  }
}
```

**Cookie enviada:**
- `token`: JWT válido por 1 hora

**Errores:**
- `401`: Usuario no encontrado
- `401`: Contraseña incorrecta
- `403`: Cuenta no confirmada

---

### GET `/confirm-email`
Confirmar email mediante token.

**Query Parameters:**
- `token`: Token recibido en email

**Respuesta (200):**
```json
{
  "message": "Email confirmado. Puedes iniciar sesión"
}
```

**Errores:**
- `400`: Token inválido o expirado
- `404`: Usuario no encontrado

---

### GET `/profile`
Obtener perfil del usuario autenticado.

**Headers:**
```
Cookie: token=<jwt_token>
```

**Respuesta (200):**
```json
{
  "id": 1,
  "nombre": "Juan",
  "apellido": "Pérez",
  "email": "juan@example.com",
  "telefono": "+56912345678",
  "rol": {
    "codigo": "cliente",
    "nombre": "Cliente"
  },
  "fecha_creacion": "2025-10-15T10:00:00Z"
}
```

**Errores:**
- `401`: No autenticado
- `403`: Token expirado

---

### POST `/forgot-password`
Solicitar reset de contraseña.

**Body:**
```json
{
  "email": "string"
}
```

**Respuesta (200):**
```json
{
  "message": "Se envió email con instrucciones para resetear contraseña"
}
```

**Errores:**
- `404`: Email no encontrado

---

### POST `/reset-password`
Cambiar contraseña con token.

**Body:**
```json
{
  "token": "string",
  "newPassword": "string (minimo 8 caracteres)"
}
```

**Respuesta (200):**
```json
{
  "message": "Contraseña actualizada"
}
```

**Errores:**
- `400`: Token inválido o expirado
- `400`: Contraseña muy corta

---

### POST `/change-password`
Cambiar contraseña siendo autenticado.

**Headers:**
```
Cookie: token=<jwt_token>
```

**Body:**
```json
{
  "currentPassword": "string",
  "newPassword": "string (minimo 8 caracteres)"
}
```

**Respuesta (200):**
```json
{
  "message": "Contraseña cambiada"
}
```

**Errores:**
- `401`: No autenticado
- `401`: Contraseña actual incorrecta
- `400`: Nueva contraseña muy corta

---

### GET `/logout`
Cerrar sesión.

**Headers:**
```
Cookie: token=<jwt_token>
```

**Respuesta (200):**
```json
{
  "message": "Sesión cerrada"
}
```

---

## 📅 Citas

### GET `/cita`
Listar citas.

**Query Parameters:**
- `estado`: 'pendiente' | 'confirmada' | 'cancelada' | 'realizada'
- `cliente_id`: Filtrar por cliente
- `tecnico_id`: Filtrar por técnico
- `desde`: Fecha inicio (ISO 8601)
- `hasta`: Fecha fin (ISO 8601)

**Respuesta (200):**
```json
[
  {
    "id": 1,
    "cliente_id": 2,
    "tecnico_id": 3,
    "servicio_id": 5,
    "jardin_id": 1,
    "fecha_hora": "2025-10-20T10:00:00Z",
    "duracion_minutos": 60,
    "estado": "confirmada",
    "precio_aplicado": 50000,
    "notas_cliente": "Por favor traer equipo para poda"
  }
]
```

---

### POST `/cita`
Crear cita.

**Body:**
```json
{
  "cliente_id": 2,
  "servicio_id": 5,
  "jardin_id": 1,
  "fecha_hora": "2025-10-20T10:00:00Z",
  "duracion_minutos": 60,
  "notas_cliente": "string (opcional)"
}
```

**Respuesta (200):**
```json
{
  "id": 1,
  "estado": "pendiente",
  "mensaje": "Cita creada. El técnico debe confirmarla"
}
```

**Errores:**
- `404`: Servicio no encontrado
- `404`: Jardín no encontrado
- `400`: Fecha pasada

---

### GET `/cita/:id`
Obtener detalles de una cita.

**Respuesta (200):**
```json
{
  "id": 1,
  "cliente": {
    "id": 2,
    "nombre": "Juan"
  },
  "tecnico": {
    "id": 3,
    "nombre": "Pedro"
  },
  "servicio": {
    "id": 5,
    "nombre": "Poda de árboles"
  },
  "estado": "confirmada",
  "precio_aplicado": 50000,
  "fecha_creacion": "2025-10-15T10:00:00Z"
}
```

---

### PUT `/cita/:id`
Actualizar cita.

**Body (cualquier combinación):**
```json
{
  "estado": "confirmada",
  "tecnico_id": 3,
  "precio_aplicado": 55000,
  "notas_internas": "Llevar materiales especiales"
}
```

**Respuesta (200):**
```json
{
  "message": "Cita actualizada"
}
```

---

### DELETE `/cita/:id`
Cancelar cita.

**Body:**
```json
{
  "motivo_cancelacion": "string",
  "notas": "string (opcional)"
}
```

**Respuesta (200):**
```json
{
  "message": "Cita cancelada"
}
```

---

## 🛠️ Servicios

### GET `/servicio`
Listar servicios disponibles.

**Query Parameters:**
- `activo`: true | false
- `ordenar`: 'nombre' | 'precio'

**Respuesta (200):**
```json
[
  {
    "id": 5,
    "nombre": "Poda de árboles",
    "descripcion": "Poda profesional y sanitaria",
    "duracion_minutos": 60,
    "precio_clp": 50000,
    "activo": true,
    "imagen_id": 10
  }
]
```

---

### POST `/servicio` `[protegido]`
Crear nuevo servicio. (Admin only)

**Body:**
```json
{
  "nombre": "Nuevo servicio",
  "descripcion": "string",
  "duracion_minutos": 90,
  "precio_clp": 75000,
  "imagen_id": 10
}
```

**Respuesta (200):**
```json
{
  "id": 6,
  "message": "Servicio creado"
}
```

---

### PUT `/servicio/:id` `[protegido]`
Actualizar servicio.

**Body (cualquier combinación):**
```json
{
  "nombre": "Poda premium",
  "precio_clp": 65000,
  "activo": false
}
```

**Respuesta (200):**
```json
{
  "message": "Servicio actualizado"
}
```

---

## 💰 Pagos

### GET `/pago`
Listar pagos.

**Query Parameters:**
- `estado`: 'pendiente' | 'aprobado' | 'rechazado'
- `metodo`: 'flow' | 'transferencia'
- `usuario_id`: Filtrar por usuario

**Respuesta (200):**
```json
[
  {
    "id": 1,
    "cita_id": 5,
    "usuario_id": 2,
    "metodo": "flow",
    "estado": "aprobado",
    "monto_clp": 50000,
    "flow_order_id": "123456",
    "validado_en": "2025-10-15T15:30:00Z"
  }
]
```

---

### POST `/pago`
Crear pago.

**Body:**
```json
{
  "cita_id": 5,
  "metodo": "flow",
  "monto_clp": 50000
}
```

**Respuesta (200):**
```json
{
  "id": 1,
  "estado": "pendiente",
  "flow_url": "https://sandbox.flow.cl/app/web/pay.php?token=xxx"
}
```

---

### PUT `/pago/:id/validate` `[protegido]`
Validar pago (admin). Para pagos por transferencia.

**Body:**
```json
{
  "estado": "aprobado"
}
```

**Respuesta (200):**
```json
{
  "message": "Pago validado"
}
```

---

## 💬 Mensajes

### GET `/conversacion`
Listar conversaciones.

**Query Parameters:**
- `usuario_id`: Mis conversaciones

**Respuesta (200):**
```json
[
  {
    "id": 1,
    "tipo": "privada",
    "contexto_id": null,
    "participantes": [
      { "id": 2, "nombre": "Juan" },
      { "id": 3, "nombre": "Pedro" }
    ],
    "ultimo_mensaje": "Hola, ¿cómo estás?",
    "fecha_creacion": "2025-10-10T10:00:00Z"
  }
]
```

---

### POST `/conversacion`
Crear conversación.

**Body:**
```json
{
  "tipo": "privada",
  "participantes": [2, 3],
  "contexto_id": null
}
```

**Respuesta (200):**
```json
{
  "id": 1,
  "message": "Conversación creada"
}
```

---

### POST `/mensaje`
Enviar mensaje.

**Body:**
```json
{
  "conversacion_id": 1,
  "cuerpo": "Hola, ¿cómo estás?"
}
```

**Respuesta (200):**
```json
{
  "id": 1,
  "creado_en": "2025-10-15T10:05:00Z"
}
```

---

### GET `/mensaje/:conversacionId`
Obtener mensajes de una conversación.

**Query Parameters:**
- `take`: Cantidad (default: 20)
- `skip`: Offset (default: 0)

**Respuesta (200):**
```json
[
  {
    "id": 5,
    "remitente": {
      "id": 2,
      "nombre": "Juan"
    },
    "cuerpo": "¿Cómo estás?",
    "creado_en": "2025-10-15T10:05:00Z",
    "leido_por": [3]
  }
]
```

---

## 🏡 Jardines

### GET `/jardin`
Listar jardines.

**Query Parameters:**
- `cliente_id`: Jardines de un cliente
- `activo`: true | false

**Respuesta (200):**
```json
[
  {
    "id": 1,
    "cliente_id": 2,
    "nombre": "Jardín trasero",
    "area_m2": 250,
    "tipo_suelo": "arenoso",
    "descripcion": "Tiene árboles frutales",
    "activo": true,
    "direccion_id": 5
  }
]
```

---

### POST `/jardin`
Crear jardín.

**Body:**
```json
{
  "cliente_id": 2,
  "nombre": "Patio frontal",
  "area_m2": 150,
  "tipo_suelo": "arcilloso",
  "descripcion": "Tiene rosales",
  "direccion_id": 5
}
```

**Respuesta (200):**
```json
{
  "id": 2,
  "message": "Jardín creado"
}
```

---

## 🖼️ Portafolio

### GET `/portafolio`
Listar items de portafolio (públicos).

**Query Parameters:**
- `publicado`: true (default)
- `tecnicos_id`: Filtrar por técnico

**Respuesta (200):**
```json
[
  {
    "id": 1,
    "titulo": "Diseño de jardín moderno",
    "descripcion": "Antes y después del proyecto",
    "imagen_principal": {
      "id": 10,
      "url": "https://..."
    },
    "publicado_en": "2025-10-10T12:00:00Z"
  }
]
```

---

### POST `/portafolio` `[protegido]`
Crear item de portafolio.

**Body:**
```json
{
  "titulo": "Nuevo proyecto",
  "descripcion": "Descripción del trabajo",
  "imagen_principal_id": 10,
  "visita_origen_id": 5
}
```

**Respuesta (200):**
```json
{
  "id": 2,
  "message": "Item creado"
}
```

---

### PUT `/portafolio/:id` `[protegido]`
Actualizar portafolio.

**Body:**
```json
{
  "titulo": "Título actualizado",
  "publicado": true
}
```

**Respuesta (200):**
```json
{
  "message": "Item actualizado"
}
```

---

## 🔄 Webhook Flow (Pagos)

### POST `/webhook/flow`
Recibe notificaciones de Flow cuando se completa un pago.

**Body enviado por Flow:**
```json
{
  "token": "flow_token_xxx",
  "order_id": "123456"
}
```

**Respuesta (200):**
```json
{
  "status": "ok"
}
```

---

## ⚠️ Códigos de Error Comunes

| Código | Significado |
|--------|-------------|
| 200 | OK - Solicitud exitosa |
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - No autenticado o token expirado |
| 403 | Forbidden - Sin permisos suficientes |
| 404 | Not Found - Recurso no encontrado |
| 409 | Conflict - Violación de restricción única (ej: email duplicado) |
| 500 | Internal Server Error - Error en el servidor |

---

## 🧪 Ejemplos cURL

### Health Check
```bash
curl -X GET http://localhost:5000/health
```

### Registrarse
```bash
curl -X POST http://localhost:5000/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "juan@example.com",
    "telefono": "+56912345678",
    "password": "MiPassword123"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "juan@example.com",
    "password": "MiPassword123"
  }'
```

### Get Profile (con cookie)
```bash
curl -X GET http://localhost:5000/profile \
  -b cookies.txt
```

### Listar servicios
```bash
curl -X GET "http://localhost:5000/servicio?ordenar=precio"
```

---

## 🔐 Autenticación en Endpoints

Para usar endpoints `[protegido]`, debes:

1. Hacer login exitoso
2. Guardar la cookie `token` enviada en la respuesta
3. Incluir la cookie en cada request subsecuente

**Frontend (JavaScript):**
```javascript
// Login automáticamente incluye cookie
fetch('http://localhost:5000/login', {
  method: 'POST',
  credentials: 'include',  // 👈 IMPORTANTE
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
})

// Requests posteriores también incluyen cookie
fetch('http://localhost:5000/profile', {
  credentials: 'include'  // 👈 IMPORTANTE
})
```

---

**Versión:** 1.0  
**Última actualización:** 15 de Octubre 2025

