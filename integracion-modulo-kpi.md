# Integración del Módulo KPI al Proyecto Existente
### Documento técnico para el equipo de desarrollo

---

## Qué se quiere lograr

El objetivo es incorporar al proyecto actual un módulo de gestión y seguimiento de KPIs operativos para los sectores de la organización. Este módulo permite a cada encargado de sector registrar mensualmente los indicadores de su equipo de agentes, y al administrador tener visibilidad total sobre todos los sectores.

El módulo contempla cuatro áreas de indicadores por sector: **despacho**, **embargo**, **liquidaciones** y una evaluación **subjetiva** de cada agente. Los valores se cargan mes a mes y quedan almacenados en la base de datos para poder consultarlos históricamente.

Las funcionalidades principales que se integran son:

- **Carga de datos:** el encargado ingresa los valores numéricos o cualitativos de cada KPI para cada agente de su sector en el mes activo.
- **Sección "Tareas empleados" dentro del sidebar:** vista resumida con estadísticas agregadas, comparativas y gráficos del sector.
- **Reporte grupal:** visualización consolidada del desempeño del sector en un período.
- **Reporte individual:** detalle del desempeño de un agente específico a lo largo del tiempo.
- **Configuración:** panel exclusivo para el administrador que permite agregar, editar o eliminar KPIs de cada área sin tocar código.

La visibilidad de los datos está restringida por sector. Un encargado solo puede ver y cargar datos del sector al que pertenece su cuenta. El administrador tiene acceso completo a todos los sectores. Esta restricción no se maneja en el frontend con condiciones visuales solamente, sino que el backend filtra los datos desde la consulta a MongoDB según el `role` y `sector` del usuario autenticado, garantizando que nunca se expongan datos de otros sectores por error.

El módulo no tiene sistema de login propio. Usa la sesión que el usuario ya inició en el proyecto principal mediante Firebase Auth y Google. Al ingresar a cualquier ruta del módulo, si la sesión no está activa es redirigido al login existente. Si la sesión está activa pero el perfil no tiene `sector` asignado, se lo deriva al estado `pending-profile` que ya existe en el flujo actual.

---

## Contexto

El módulo KPI fue desarrollado como un archivo HTML standalone con su propio sistema de autenticación hardcodeado. Al integrarlo al proyecto principal, ese sistema de login **se elimina por completo** y se reemplaza por el sistema existente basado en Firebase Auth + el modelo `User` de MongoDB. La autorización (qué puede ver cada usuario) se resuelve usando los campos `role` y `sector` que ya existen en el modelo de usuario.

Una buena noticia: el backend ya tiene casi todo lo necesario. El modelo `User` ya tiene `role` y `sector`. El middleware `verifyTokenMiddleware` ya verifica tokens Firebase. El patrón de `request()` en el frontend ya adjunta el token en cada llamada. **Lo que hay que hacer es extender lo existente, no reemplazarlo.**

---

## PARTE BACK — Express + MongoDB

### 1. El modelo User ya está listo

El modelo existente en `src/models/userModel.js` ya tiene los campos necesarios para el módulo KPI:

- `role`: enum `['administrador', 'encargado']` — controla qué puede ver y hacer cada usuario.
- `sector`: String — determina qué datos KPI le corresponden al encargado.

**No se necesitan cambios en el modelo de usuario.**

Lo que sí hay que verificar es que al crear usuarios via `POST /api/user/` se carguen correctamente el `sector` y el `role`. El script `seedAdminUser.js` puede servir de referencia para crear los usuarios encargados de cada sector.

---

### 2. El middleware ya existe, solo hay que reutilizarlo

`verifyTokenMiddleware` ya hace exactamente lo que el módulo KPI necesita: valida el token Firebase, busca o crea el usuario en MongoDB y deja el perfil completo en `req.user`.

Todas las rutas nuevas del módulo KPI deben usar este middleware tal como ya se usa en `userRoutes.js`. No hay que crear uno nuevo.

---

### 3. Nuevas colecciones MongoDB para los datos KPI

Se necesitan tres colecciones nuevas, independientes de `users`:

**`kpi_configs`** — configuración de áreas y KPIs por sector (antes estaba hardcodeada en el HTML)

```js
// src/models/kpiConfigModel.js
const mongoose = require('mongoose');

const kpiConfigSchema = new mongoose.Schema({
  sector: { type: String, required: true, unique: true, lowercase: true, trim: true },
  areas: {
    despacho:      { label: String, color: String, kpis: [String] },
    embargo:       { label: String, color: String, kpis: [String] },
    liquidaciones: { label: String, color: String, kpis: [String] },
    subjetivo:     { label: String, color: String, kpis: [String] }
  }
}, { timestamps: true });

module.exports = mongoose.model('KpiConfig', kpiConfigSchema);
```

**`kpi_records`** — datos cargados por agente y mes

```js
// src/models/kpiRecordModel.js
const mongoose = require('mongoose');

const kpiRecordSchema = new mongoose.Schema({
  sector:        { type: String, required: true, lowercase: true, trim: true },
  agente:        { type: String, required: true, uppercase: true, trim: true },
  mes:           { type: String, required: true }, // formato "YYYY-MM"
  despacho:      [Number],
  embargo:       [Number],
  liquidaciones: [Number],
  subjetivo:     [String]  // valores: "S" | "E" | "N" | "D"
}, { timestamps: true });

// Evita duplicados: un agente solo tiene un registro por sector y mes
kpiRecordSchema.index({ sector: 1, agente: 1, mes: 1 }, { unique: true });

module.exports = mongoose.model('KpiRecord', kpiRecordSchema);
```

**`agentes`** — lista de agentes por sector

```js
// src/models/agenteModel.js
const mongoose = require('mongoose');

const agenteSchema = new mongoose.Schema({
  sector:  { type: String, required: true, lowercase: true, trim: true },
  codigo:  { type: String, required: true, uppercase: true, trim: true }, // ej: "MRIERA"
  nombre:  { type: String, required: true },
  legajo:  String
}, { timestamps: true });

module.exports = mongoose.model('Agente', agenteSchema);
```

---

### 4. Nuevas rutas KPI con filtro por sector

Siguiendo la misma estructura del proyecto (routes → controllers → services), agregar:

```
src/routes/kpiRoutes.js
src/controllers/kpiController.js
src/services/kpiService.js
```

La lógica central de autorización en `kpiService.js`:

```js
// src/services/kpiService.js
const KpiRecord = require('../models/kpiRecordModel');
const KpiConfig = require('../models/kpiConfigModel');
const Agente    = require('../models/agenteModel');

// El administrador puede ver cualquier sector; el encargado solo el suyo.
function getSectorFilter(user, sectorParam) {
  if (user.role === 'administrador') {
    return sectorParam ? { sector: sectorParam } : {};
  }
  return { sector: user.sector };
}

async function getConfig(user, sectorParam) {
  return KpiConfig.findOne(getSectorFilter(user, sectorParam));
}

async function getAgentes(user, sectorParam) {
  return Agente.find(getSectorFilter(user, sectorParam));
}

async function getRecords(user, query) {
  const filter = getSectorFilter(user, query.sector);
  if (query.mes)    filter.mes = query.mes;
  if (query.agente) filter.agente = query.agente;
  return KpiRecord.find(filter);
}

async function saveRecord(user, body) {
  // El encargado no puede guardar datos en otro sector
  const sector = user.role === 'administrador' ? body.sector : user.sector;
  const { agente, mes, despacho, embargo, liquidaciones, subjetivo } = body;

  return KpiRecord.findOneAndUpdate(
    { sector, agente, mes },
    { sector, agente, mes, despacho, embargo, liquidaciones, subjetivo },
    { upsert: true, new: true, runValidators: true }
  );
}

async function updateConfig(user, body) {
  if (user.role !== 'administrador') throw { status: 403, message: 'Sin permisos' };
  return KpiConfig.findOneAndUpdate(
    { sector: body.sector },
    { areas: body.areas },
    { upsert: true, new: true }
  );
}

module.exports = { getConfig, getAgentes, getRecords, saveRecord, updateConfig };
```

Las rutas en `kpiRoutes.js` usan el mismo `verifyTokenMiddleware` y el `requireAdmin` ya existentes:

```js
// src/routes/kpiRoutes.js
const express = require('express');
const router  = express.Router();
const verifyTokenMiddleware = require('../middlewares/verifyTokenMiddleware');
const { requireAdmin }      = require('../middlewares/verifyTokenMiddleware'); // o desde donde esté
const kpiController         = require('../controllers/kpiController');

router.use(verifyTokenMiddleware); // todas las rutas KPI requieren sesión

router.get('/config',      kpiController.getConfig);
router.get('/agentes',     kpiController.getAgentes);
router.get('/records',     kpiController.getRecords);
router.post('/records',    kpiController.saveRecord);
router.put('/config',      requireAdmin, kpiController.updateConfig);

module.exports = router;
```

Registrar el router en `index.js` junto al de usuarios:

```js
const kpiRoutes = require('./src/routes/kpiRoutes');
app.use('/api/kpi', kpiRoutes);
```

---

### 5. Popular las colecciones iniciales

Los datos que hoy están hardcodeados en el HTML (lista de KPIs por área, lista de agentes) deben migrarse a MongoDB. Conviene crear un script similar al `seedAdminUser.js` existente:

```
src/scripts/seedKpiData.js   ← carga kpi_configs y agentes iniciales
```

---

## PARTE FRONT — React + Vite

### 1. El AuthContext ya tiene lo que se necesita

El `AuthContext` existente ya expone `user` con el perfil completo del backend, que incluye `role` y `sector`. No hay que modificarlo.

En cualquier componente del módulo KPI se puede usar directamente:

```js
const { user } = useContext(AuthContext);
// user.role  → 'administrador' | 'encargado'
// user.sector → 'cordoba' | etc.
```

---

### 2. Extender api.js con las funciones KPI

Siguiendo el mismo patrón del `request()` existente en `src/services/api.js`, agregar al final del archivo las funciones para el módulo KPI. No hace falta crear un archivo separado, el patrón ya está resuelto:

```js
// Agregar en src/services/api.js

const KPI_BASE = `${API_BASE_URL.replace('/user', '')}/kpi`;

// Helper interno reutilizando el request existente pero con base KPI
function kpiRequest(path, options = {}) {
  // Misma lógica que request() pero apuntando a /api/kpi
  return request(path, options, KPI_BASE);
}

// Si request() no acepta base dinámica, simplemente duplicar el wrapper
// o agregar un parámetro opcional. La lógica de token y headers es idéntica.

export function getKpiConfig(sector)       { return kpiRequest(`/config${sector ? `?sector=${sector}` : ''}`); }
export function getKpiAgentes(sector)      { return kpiRequest(`/agentes${sector ? `?sector=${sector}` : ''}`); }
export function getKpiRecords(params)      { return kpiRequest(`/records?${new URLSearchParams(params)}`); }
export function saveKpiRecord(data)        { return kpiRequest('/records', { method: 'POST', body: data }); }
export function updateKpiConfig(sector, areas) { return kpiRequest('/config', { method: 'PUT', body: { sector, areas } }); }
```

---

### 3. Crear el KpiContext

Reemplaza todas las variables globales que estaban en el `<script>` del HTML (`allData`, `KPI_AREAS`, `AGENTES`, `activeMonth`, etc.). Se agrega como un contexto adicional, sin tocar el `AuthContext` existente.

```jsx
// src/context/KpiContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import { getKpiConfig, getKpiAgentes, getKpiRecords, saveKpiRecord } from '../services/api';

export const KpiContext = createContext();

export function KpiProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [config, setConfig]           = useState(null);
  const [agentes, setAgentes]         = useState([]);
  const [records, setRecords]         = useState([]);
  const [activeMonth, setActiveMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!user) return;
    const sector = user.role === 'administrador' ? undefined : user.sector;

    Promise.all([
      getKpiConfig(sector),
      getKpiAgentes(sector),
      getKpiRecords({ sector })
    ])
      .then(([cfg, ags, recs]) => {
        setConfig(cfg);
        setAgentes(ags);
        setRecords(recs);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  async function handleSaveRecord(data) {
    const saved = await saveKpiRecord({
      ...data,
      sector: user.role === 'administrador' ? data.sector : user.sector
    });
    setRecords(prev => {
      const idx = prev.findIndex(r => r.agente === saved.agente && r.mes === saved.mes);
      return idx >= 0 ? prev.map((r, i) => i === idx ? saved : r) : [...prev, saved];
    });
  }

  return (
    <KpiContext.Provider value={{
      config, agentes, records,
      activeMonth, setActiveMonth,
      saveRecord: handleSaveRecord,
      loading, error
    }}>
      {children}
    </KpiContext.Provider>
  );
}
```

---

### 4. Eliminar del HTML original

Al convertir el HTML a componentes React, remover completamente:

- El bloque `#login-screen` y su HTML
- Las funciones `doLogin()`, `doLogout()`, `checkAuth()`
- El array `USERS` con credenciales hardcodeadas
- Todo uso de `sessionStorage` para guardar sesión
- La llamada `initApp()` que inicializaba con datos locales

---

### 5. Rutas KPI dentro del router existente

El módulo KPI se monta como subrutas dentro del router actual. Usa el mismo `ProtectedRoute` existente y agrega solo el `KpiProvider` como wrapper adicional:

```jsx
// En App.jsx, dentro de <Routes>, agregar:
import { KpiProvider } from './context/KpiContext';

// Ruta raíz del módulo KPI — hereda la protección del ProtectedRoute existente
<Route path="/kpi" element={
  <ProtectedRoute>        {/* el mismo que ya existe */}
    <KpiProvider>
      <KpiLayout />       {/* Sidebar + Topbar del módulo */}
    </KpiProvider>
  </ProtectedRoute>
}>
  <Route index                element={<DashboardKpiPage />} />
  <Route path="carga"         element={<CargaPage />} />
  <Route path="grupal"        element={<ReporteGrupalPage />} />
  <Route path="individual"    element={<ReporteIndividualPage />} />
  <Route path="configuracion" element={<ConfigPage />} />
</Route>
```

La protección por rol específica (solo administrador en `/kpi/configuracion`) se puede manejar dentro del propio componente `ConfigPage` con una redirección:

```jsx
// pages/kpi/ConfigPage.jsx
const { user } = useContext(AuthContext);
if (user?.role !== 'administrador') return <Navigate to="/kpi" />;
```

---

### 6. Sidebar del módulo KPI

El menú interno del módulo lee `user.role` del `AuthContext` existente para mostrar u ocultar la opción de configuración:

```jsx
// components/kpi/KpiSidebar.jsx
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

export function KpiSidebar() {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'administrador';

  return (
    <aside id="sidebar">
      <NavLink to="/kpi"              label="Dashboard" />
      <NavLink to="/kpi/carga"        label="Carga de datos" />
      <NavLink to="/kpi/grupal"       label="Reporte grupal" />
      <NavLink to="/kpi/individual"   label="Reporte individual" />
      {isAdmin && (
        <NavLink to="/kpi/configuracion" label="Configuración" />
      )}
      <div className="sidebar-footer">
        <span>{user?.name} {user?.lastName}</span>
        <span>{isAdmin ? 'Administrador' : `Sector ${user?.sector}`}</span>
      </div>
    </aside>
  );
}
```

---

## Flujo completo post-integración

```
Usuario abre la app
       ↓
ProtectedRoute verifica profileStatus (ya existente)
       ↓
Si está "ready" → onAuthStateChanged ya corrió → user tiene role y sector
       ↓
Navega a /kpi → KpiProvider hace 3 llamadas a /api/kpi/*
(el backend filtra por sector automáticamente según req.user)
       ↓
Encargado → ve y carga solo datos de su sector
Administrador → puede ver cualquier sector y acceder a /kpi/configuracion
```

---

## Checklist de implementación

### Backend
- [ ] Crear `src/models/kpiConfigModel.js`
- [ ] Crear `src/models/kpiRecordModel.js`
- [ ] Crear `src/models/agenteModel.js`
- [ ] Crear `src/services/kpiService.js`
- [ ] Crear `src/controllers/kpiController.js`
- [ ] Crear `src/routes/kpiRoutes.js`
- [ ] Registrar `kpiRoutes` en `index.js` bajo `/api/kpi`
- [ ] Crear `src/scripts/seedKpiData.js` con la config y agentes iniciales
- [ ] Verificar que los usuarios encargados en DB tengan `sector` cargado

### Frontend
- [ ] Agregar funciones KPI al final de `src/services/api.js`
- [ ] Crear `src/context/KpiContext.jsx`
- [ ] Eliminar bloque de login/auth del `index.html` original
- [ ] Convertir las vistas del HTML en páginas React bajo `src/pages/kpi/`
- [ ] Crear `src/components/kpi/KpiSidebar.jsx` y `KpiLayout.jsx`
- [ ] Agregar subrutas `/kpi/*` en `App.jsx` usando el `ProtectedRoute` existente
- [ ] Agregar `KpiProvider` como wrapper de las rutas KPI
