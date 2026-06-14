# Estructura del Backend

## Tecnologías y librerías usadas

- Node.js
- Express 5
- MongoDB como base de datos
- Mongoose para el modelado y acceso a MongoDB
- Firebase Admin para validar tokens de autenticación y obtener datos de usuario
- dotenv para cargar variables de entorno

## Organización general del proyecto

El backend está organizado en `src/` con una separación clara de responsabilidades:

- `src/config/`
  - `config.js`: carga variables de entorno con `dotenv` y define valores como `PORT`, `MONGODB_URI` y credenciales de Firebase.
  - `db.js`: conecta con MongoDB usando Mongoose.
  - `firebase.js`: inicializa Firebase Admin con credenciales ya sea desde un archivo de servicio o variables de entorno.

- `src/routes/`
  - `userRoutes.js`: define las rutas relativas a usuarios, todas protegidas por autenticación.

- `src/controllers/`
  - `userController.js`: gestiona las respuestas HTTP y usa los servicios de usuario.

- `src/services/`
  - `authService.js`: contiene la lógica de sincronización entre Firebase y el modelo de usuario en la base de datos.
  - `userService.js`: contiene la lógica de negocio para crear, leer, actualizar y eliminar usuarios.

- `src/models/`
  - `userModel.js`: define el esquema de usuario de MongoDB con Mongoose.

- `src/middlewares/`
  - `verifyTokenMiddleware.js`: verifica tokens de Firebase y aplica reglas de autorización.

- `src/helpers/`
  - `checkExist.js`: helper para validar existencia o no existencia de documentos en MongoDB.

- `src/utils/`
  - `errorHandler.js`: maneja errores genéricos y responde con un estado HTTP apropiado.

- `src/scripts/`
  - `seedAdminUser.js`: script de utilidad para crear o actualizar un usuario administrador a partir de variables de entorno.

- `index.js`
  - punto de entrada general del servidor.

## Flujo principal del servidor

1. `index.js` arranca el servidor Express.
2. Carga middleware para parsear JSON y `urlencoded`.
3. Configura cabeceras CORS para `http://localhost:5173`.
4. Conecta con MongoDB mediante `connectDB()`.
5. Registra el router de usuario en `/api/user`.
6. Escucha en el puerto definido en `PORT`.

## Sistema de autenticación con Firebase Admin

- La aplicación usa Firebase Admin para validar tokens de cliente.
- `src/config/firebase.js` inicializa `firebase-admin` con:
  - credenciales de servicio cargadas desde `FIREBASE_SERVICE_ACCOUNT_PATH`, o
  - credenciales individuales `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
- `src/middlewares/verifyTokenMiddleware.js` hace lo siguiente:
  - lee el encabezado `Authorization`.
  - valida que exista y comience con `Bearer `.
  - extrae el token y usa `firebaseAuth.verifyIdToken(token)`.
  - toma el token verificado y llama a `findOrCreateUserFromToken(decodedToken)`.
  - guarda el usuario resultante en `req.user` y los datos de Firebase en `req.auth`.

- `findOrCreateUserFromToken` en `src/services/authService.js`:
  - requiere que el token contenga `uid`, `email` y `name`.
  - intenta buscar un usuario en la colección `users` usando `firebaseUid` o `email`.
  - si encuentra un usuario sin `firebaseUid`, lo actualiza con el UID de Firebase.
  - si no existe, crea un nuevo usuario con datos mínimos y permisos predeterminados.

## Modelos de MongoDB existentes

### `src/models/userModel.js`

El proyecto define un único modelo de MongoDB:

- `User` con campos:
  - `firebaseUid`: String, requerido, único. Identifica al usuario en Firebase.
  - `name`: String, requerido, lowercase, trim, 2-40 caracteres.
  - `lastName`: String, requerido, lowercase, trim, 2-40 caracteres.
  - `email`: String, requerido, único, lowercase, trim, validación de formato.
  - `role`: String, enum [`administrador`, `encargado`], default `encargado`.
  - `sector`: String, requerido, lowercase, trim.
  - `permissions`: objeto con booleans:
    - `canCreateTasks`: default `true`
    - `canDeleteTasks`: default `false`
    - `canAssignRoles`: default `false`

- El esquema también usa `timestamps: true`, por lo que Mongo guarda `createdAt` y `updatedAt`.

## Endpoints definidos y su comportamiento

Todas las rutas están bajo el prefijo `/api/user`.

### `GET /api/user/me`
- Retorna los datos del usuario autenticado.
- Usa `getCurrentUser` en el controlador.

### `POST /api/user/`
- Crea un nuevo usuario.
- Requiere rol de `administrador`.
- Usa `createUserService` para validar que no exista email ni `firebaseUid` duplicado.
- Responde con mensaje de éxito y el usuario creado.

### `POST /api/user/logout`
- No invalida nada en el servidor: solo devuelve un mensaje de cierre de sesión para el cliente.
- Está protegida por autenticación.

### `GET /api/user/`
- Lista usuarios.
- Si el usuario es `administrador`, devuelve todos los usuarios.
- Si no, devuelve solo el propio usuario autenticado.

### `GET /api/user/:id`
- Trae un usuario por su `_id` de MongoDB.
- Si el usuario no es `administrador`, solo permite ver su propio recurso.

### `PATCH /api/user/:id`
- Actualiza datos de usuario.
- Si el usuario es `administrador`, puede modificar cualquier campo permitido por Mongoose.
- Si el usuario es `encargado`, solo puede actualizar `name`, `lastName` y `email` de su propio perfil.
- Requiere `requireAdminOrSelf`.

### `DELETE /api/user/:id`
- Elimina un usuario.
- Requiere rol de `administrador`.

## Middlewares relevantes

### `verifyTokenMiddleware`
- Control principal de autenticación.
- Valida el token Firebase y añade `req.user`.
- Bloquea accesos sin token o con token inválido.

### `requireAdmin`
- Valida que el usuario autenticado tenga `role === "administrador"`.
- Usa para rutas sensibles como crear y eliminar usuarios.

### `requireAdminOrSelf`
- Permite la operación si el usuario es administrador o si el recurso solicitado corresponde al mismo usuario autenticado.
- Protege la edición de perfiles.

### `requirePermission(permission)`
- Está definida en el middleware pero no parece usarse actualmente en rutas.
- Permite verificar permisos explícitos dentro del objeto `permissions` del usuario.

## Qué resuelve cada parte

- `index.js`: arranca la app, habilita CORS y monta las rutas.
- `src/config/`: gestiona configuración y conexiones externas.
- `src/routes/`: expone la API REST de usuarios.
- `src/controllers/`: transforma las solicitudes HTTP en llamadas a servicios.
- `src/services/`: implementa la lógica de negocio y las reglas de permisos.
- `src/models/`: define el esquema de datos persistidos en MongoDB.
- `src/middlewares/`: centraliza autenticación y autorización.
- `src/utils/errorHandler.js`: unifica la respuesta ante errores.
- `src/scripts/seedAdminUser.js`: utilidad para asegurar que exista un administrador inicial.

## Balance final

El backend es un servicio REST sencillo centrado en la gestión de usuarios y su autorización mediante Firebase. Usa Firebase Admin para validar identidad, MongoDB para almacenar perfiles, y Express para exponer la API. La separación en rutas, controladores, servicios, modelos y middlewares mantiene el código organizado y facilita agregar más recursos y reglas en el futuro.
