# Documentacion para Frontend

Backend de gestion de usuarios con Firebase Auth, perfiles locales en MongoDB, roles y sectores.

Base URL backend:

```txt
http://localhost:3000
```

Base path usuarios:

```txt
/api/user
```

## Resumen

El login ya no se hace contra el backend. El frontend debe autenticar al usuario con Firebase Auth y enviar el ID token de Firebase en cada request al backend.

### Regla para el equipo de Front

- Usar Firebase Google Sign-In para iniciar sesión.
- No registrar usuarios vía formulario en el backend.
- El backend crea o enlaza el perfil local en MongoDB automáticamente cuando recibe un `idToken` válido.
- Solo los usuarios ya autorizados como `administrador` en la base de datos tienen acceso administrativo; no se otorga admin a cualquiera que inicie sesión con Google.
- El frontend debe manejar el error `403` con mensaje: "Tu cuenta aun no fue asignada por un administrador".

```js
const token = await firebaseUser.getIdToken()

fetch("http://localhost:3000/api/user/me", {
  headers: {
    Authorization: `Bearer ${token}`
  }
})
```

Todas las rutas de `/api/user` requieren:

```http
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

## Modelo de Usuario

```ts
type User = {
  _id: string
  firebaseUid: string
  name: string
  lastName: string
  email: string
  role: "administrador" | "encargado"
  sector: string
  permissions: {
    canCreateTasks: boolean
    canDeleteTasks: boolean
    canAssignRoles: boolean
  }
  createdAt: string
  updatedAt: string
  __v?: number
}
```

Notas:

- `firebaseUid` debe coincidir con el `uid` del usuario en Firebase Auth.
- `sector` define que informacion puede ver un usuario no administrador.
- `administrador` tiene acceso global.
- `encargado` ve datos de su propio sector.
- No existe `password` en backend. Las contrasenas las maneja Firebase.

## Reglas de Acceso

| Rol | Puede ver datos | Puede crear usuarios | Puede editar usuarios | Puede borrar usuarios |
| --- | --- | --- | --- | --- |
| administrador | Todos los usuarios y todos los recursos | Si | Todos los campos | Si |
| encargado | Solo su dashboard y su propio perfil | No | Solo su perfil basico | No |

Notas:
- Los encargados no pueden ver usuarios de otros encargados.
- Los encargados no pueden listar ni editar datos de otros sectores.
- El backend devuelve a un encargado solo su perfil actual en `/api/user`.

Campos que puede editar un usuario no administrador sobre si mismo:

```ts
name
lastName
email
```

Campos reservados para administrador:

```ts
role
sector
permissions
firebaseUid
```

## Flujo Recomendado de Frontend

1. Usuario inicia sesion con Firebase Auth.
2. Frontend obtiene `idToken` con `firebaseUser.getIdToken()`.
3. Frontend llama `GET /api/user/me`.
4. Si responde `200`, guardar perfil local en estado global.
5. Mostrar solo el menu principal y el sector del usuario cuando `user.role === "encargado"`.
6. Si el usuario es `administrador`, habilitar vistas de gestion completa.
7. En cada request privada, enviar `Authorization: Bearer <idToken>`.

> Para los encargados, el front debe renderizar un dashboard limitado; no mostrar opciones de gestion de usuarios o datos de otros sectores.

Ejemplo de helper:

```js
export async function authFetch(url, options = {}) {
  const token = await auth.currentUser.getIdToken()

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers
    }
  })
}
```

## Endpoints

## 1. Obtener Perfil Actual

```http
GET /api/user/me
```

Devuelve el perfil local asociado al usuario autenticado en Firebase.

### Permisos

Cualquier usuario autenticado con perfil creado en MongoDB.

### Request

```http
GET /api/user/me
Authorization: Bearer <firebase-id-token>
```

### Response 200

```json
{
  "_id": "665...",
  "firebaseUid": "firebase_uid",
  "name": "admin",
  "lastName": "principal",
  "email": "admin@example.com",
  "role": "administrador",
  "sector": "general",
  "permissions": {
    "canCreateTasks": true,
    "canDeleteTasks": true,
    "canAssignRoles": true
  },
  "createdAt": "2026-06-03T00:00:00.000Z",
  "updatedAt": "2026-06-03T00:00:00.000Z"
}
```

### Errores

```json
{ "message": "Acceso con token invalido" }
```

Status: `401`

```json
{ "message": "Acceso al token invalido" }
```

Status: `401`

```json
{ "message": "El usuario no tiene perfil asignado" }
```

Status: `403`

### Uso en UI

- Usar este endpoint despues del login.
- Si devuelve `403`, el usuario existe en Firebase pero no fue habilitado en el sistema.
- En ese caso mostrar una pantalla tipo: "Tu cuenta aun no fue asignada por un administrador".

## 2. Listar Usuarios

```http
GET /api/user
```

### Permisos

- `administrador`: recibe todos los usuarios.
- `encargado`: recibe usuarios de su mismo `sector`.

### Request

```http
GET /api/user
Authorization: Bearer <firebase-id-token>
```

### Response 200

```json
[
  {
    "_id": "665...",
    "firebaseUid": "firebase_uid",
    "name": "juan",
    "lastName": "perez",
    "email": "juan@example.com",
    "role": "encargado",
    "sector": "cordoba",
    "permissions": {
      "canCreateTasks": true,
      "canDeleteTasks": false,
      "canAssignRoles": false
    },
    "createdAt": "2026-06-03T00:00:00.000Z",
    "updatedAt": "2026-06-03T00:00:00.000Z"
  }
]
```

### Uso en UI

- Vista admin: tabla completa de usuarios, filtros por `sector` y `role`.
- Vista encargado: lista limitada al sector del usuario.
- Mostrar estado vacio si el array viene vacio.

## 3. Obtener Usuario por ID

```http
GET /api/user/:id
```

### Permisos

- `administrador`: puede ver cualquier usuario.
- `encargado`: puede ver usuarios de su mismo `sector`.

### Request

```http
GET /api/user/665...
Authorization: Bearer <firebase-id-token>
```

### Response 200

```json
{
  "_id": "665...",
  "firebaseUid": "firebase_uid",
  "name": "juan",
  "lastName": "perez",
  "email": "juan@example.com",
  "role": "encargado",
  "sector": "cordoba",
  "permissions": {
    "canCreateTasks": true,
    "canDeleteTasks": false,
    "canAssignRoles": false
  },
  "createdAt": "2026-06-03T00:00:00.000Z",
  "updatedAt": "2026-06-03T00:00:00.000Z"
}
```

### Errores

```json
{ "message": "El usuario no existe" }
```

Status: `404`

```json
{ "message": "Acceso denegado" }
```

Status: `403`

## 4. Crear Usuario

```http
POST /api/user
```

Crea el perfil local en MongoDB para un usuario que ya existe en Firebase Auth.

### Permisos

Solo `administrador`.

### Request

```http
POST /api/user
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

Body:

```json
{
  "firebaseUid": "uid_del_usuario_en_firebase",
  "name": "Juan",
  "lastName": "Perez",
  "email": "juan@example.com",
  "role": "encargado",
  "sector": "cordoba",
  "permissions": {
    "canCreateTasks": true,
    "canDeleteTasks": false,
    "canAssignRoles": false
  }
}
```

### Campos Requeridos

```txt
firebaseUid
name
lastName
email
role
sector
```

`permissions` es opcional. Si no se envia, usa defaults:

```json
{
  "canCreateTasks": true,
  "canDeleteTasks": false,
  "canAssignRoles": false
}
```

### Response 201

```json
{
  "message": "Usuario creado exitosamente",
  "data": {
    "_id": "665...",
    "firebaseUid": "uid_del_usuario_en_firebase",
    "name": "juan",
    "lastName": "perez",
    "email": "juan@example.com",
    "role": "encargado",
    "sector": "cordoba",
    "permissions": {
      "canCreateTasks": true,
      "canDeleteTasks": false,
      "canAssignRoles": false
    },
    "createdAt": "2026-06-03T00:00:00.000Z",
    "updatedAt": "2026-06-03T00:00:00.000Z"
  }
}
```

### Errores

```json
{ "message": "Acceso denegado" }
```

Status: `403`

```json
{ "message": "Usuario con email juan@example.com ya existe." }
```

Status: `400`

```json
{ "message": "El usuario de Firebase ya tiene perfil." }
```

Status: `400`

Errores de validacion de Mongoose tambien llegan como:

```json
{ "message": "mensaje de validacion" }
```

Status usual: `500` actualmente, salvo errores custom.

### Uso en UI

- El admin primero debe crear el usuario en Firebase Auth o tener su UID.
- Luego crea el perfil local desde esta ruta.
- No pedir password en este formulario del backend.
- Si el frontend tambien administra Firebase Auth, crear primero el usuario en Firebase y despues llamar este endpoint.

## 5. Actualizar Usuario

```http
PATCH /api/user/:id
```

### Permisos

- `administrador`: puede editar cualquier usuario y cualquier campo permitido por el modelo.
- `encargado`: solo puede editar su propio usuario y solo `name`, `lastName`, `email`.

### Request Admin

```http
PATCH /api/user/665...
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

Body ejemplo:

```json
{
  "role": "administrador",
  "sector": "general",
  "permissions": {
    "canCreateTasks": true,
    "canDeleteTasks": true,
    "canAssignRoles": true
  }
}
```

### Request Usuario Comun

```json
{
  "name": "Juan",
  "lastName": "Perez",
  "email": "juan.nuevo@example.com"
}
```

### Response 200

```json
{
  "message": "Usuario actualizado exitosamente",
  "data": {
    "_id": "665...",
    "firebaseUid": "firebase_uid",
    "name": "juan",
    "lastName": "perez",
    "email": "juan.nuevo@example.com",
    "role": "encargado",
    "sector": "cordoba",
    "permissions": {
      "canCreateTasks": true,
      "canDeleteTasks": false,
      "canAssignRoles": false
    },
    "createdAt": "2026-06-03T00:00:00.000Z",
    "updatedAt": "2026-06-03T00:00:00.000Z"
  }
}
```

### Errores

```json
{ "message": "Solo el administrador puede modificar rol, sector o permisos" }
```

Status: `403`

```json
{ "message": "Acceso denegado" }
```

Status: `403`

```json
{ "message": "El usuario no existe" }
```

Status: `404`

### Uso en UI

- Para admin, mostrar controles de `role`, `sector` y `permissions`.
- Para encargado, ocultar esos controles y permitir solo datos personales.
- Si el backend responde `403`, refrescar `/api/user/me` por si cambiaron permisos.

## 6. Eliminar Usuario

```http
DELETE /api/user/:id
```

Elimina el perfil local en MongoDB. No elimina automaticamente el usuario en Firebase Auth.

### Permisos

Solo `administrador`.

### Request

```http
DELETE /api/user/665...
Authorization: Bearer <firebase-id-token>
```

### Response 200

```json
{
  "message": "Usuario eliminado exitosamente"
}
```

### Errores

```json
{ "message": "Acceso denegado" }
```

Status: `403`

```json
{ "message": "El usuario no existe" }
```

Status: `404`

### Uso en UI

- Pedir confirmacion antes de borrar.
- Luego quitar el usuario de la tabla local.
- Si tambien se quiere borrar el usuario de Firebase Auth, hace falta agregar un endpoint backend especifico.

## 7. Logout

```http
POST /api/user/logout
```

El backend no maneja sesiones. El logout real se hace en Firebase Auth desde el frontend.

### Request

```http
POST /api/user/logout
Authorization: Bearer <firebase-id-token>
```

### Response 200

```json
{
  "message": "Sesion cerrada en el cliente"
}
```

### Uso en UI

```js
await signOut(auth)
```

Despues limpiar estado local y redirigir a login.

## Manejo de Errores

Todas las respuestas de error usan esta forma:

```json
{
  "message": "Texto del error"
}
```

### Tabla de Status

| Status | Significado | Accion frontend |
| --- | --- | --- |
| 400 | Datos invalidos o duplicados | Mostrar mensaje debajo del formulario |
| 401 | Token faltante, vencido o invalido | Forzar logout o pedir re-login |
| 403 | Sin permisos o sin perfil local | Mostrar pantalla de acceso denegado |
| 404 | Recurso no encontrado | Mostrar estado "no encontrado" |
| 500 | Error inesperado | Mostrar alerta generica y registrar error |

### Mensajes Frecuentes

```json
{ "message": "Acceso con token invalido" }
```

Enviar al login o renovar token.

```json
{ "message": "Acceso al token invalido" }
```

Token mal formado, vencido o de otro proyecto Firebase.

```json
{ "message": "El usuario no tiene perfil asignado" }
```

El usuario existe en Firebase Auth, pero no existe en MongoDB. Mostrar una vista de espera/aprobacion.

```json
{ "message": "Acceso denegado" }
```

El usuario esta autenticado, pero no tiene permisos para esa accion.

## Control de Vistas

Usar el perfil de `/api/user/me` como fuente de verdad para la UI.

Ejemplo:

```js
const isAdmin = currentUser.role === "administrador"
const canDeleteTasks = isAdmin || currentUser.permissions.canDeleteTasks
```

Recomendaciones:

- No mostrar acciones admin si `role !== "administrador"`.
- No mostrar selector de sector a usuarios no admin.
- Filtrar vistas por `sector` en frontend solo para experiencia; la seguridad real debe quedar en backend.
- Ante `403`, no insistir con la misma accion. Mostrar mensaje y refrescar permisos.

## Sectores

`sector` es un string normalizado en minusculas por el backend.

Ejemplos:

```txt
cordoba
entre_rios
general
```

Para formularios y tareas futuros, la regla esperada sera:

```txt
administrador -> puede ver todo
encargado -> solo ve registros donde registro.sector === user.sector
```

## Formularios y PDFs

Todavia no existen endpoints implementados para tareas/formularios/PDFs en este backend.

La estructura recomendada para cuando se agreguen:

```ts
type FormRecord = {
  _id: string
  title: string
  description?: string
  sector: string
  status: "pendiente" | "en_proceso" | "finalizado"
  createdBy: string
  assignedTo?: string
  files: Array<{
    name: string
    url: string
    storagePath?: string
    contentType?: string
    size?: number
  }>
  createdAt: string
  updatedAt: string
}
```

Para PDFs, lo recomendado es:

- Subir archivos a Firebase Storage.
- Guardar en backend/base de datos solo metadata: `name`, `url`, `storagePath`, `size`, `contentType`.
- Asociar cada formulario/tarea a un `sector`.
- Aplicar la misma regla de permisos por rol y sector.

## Checklist Frontend

- Configurar Firebase Auth.
- Implementar login con Firebase.
- Obtener token con `getIdToken()`.
- Crear helper centralizado para requests con `Authorization`.
- Llamar `/api/user/me` al iniciar la app.
- Guardar perfil local en estado global.
- Renderizar rutas segun `role`, `sector` y `permissions`.
- Manejar `401` con logout/re-login.
- Manejar `403` con pantalla de acceso denegado o cuenta pendiente.
- No enviar passwords al backend.
- No guardar service account ni claves admin en frontend.
