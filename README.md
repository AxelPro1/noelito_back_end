# Backend - Sistema de Sorteos

Backend en Node.js + Express + MongoDB para gestionar el registro de participantes de un sorteo,
la verificación de depósitos y el sorteo aleatorio del ganador.

## Instalación

```bash
npm install
cp .env.example .env
# edita .env con tus datos (MONGO_URI, JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD, etc.)
npm run seed:admin   # crea el primer usuario administrador
npm run dev          # o: npm start
```

## Estructura

```
config/       -> conexión a la base de datos
controllers/  -> lógica de negocio
middleware/   -> auth (JWT), subida de archivos (multer), manejo de errores
models/       -> esquemas de Mongoose (Participant, Admin, Winner, Prize, RaffleRound, Counter)
routes/       -> definición de endpoints
utils/        -> helpers (token, selección aleatoria, seed de admin)
uploads/      -> comprobantes de pago subidos por los usuarios
```

## Flujo del sorteo

1. El usuario llena el formulario público (nombre, celular, comprobante) → `POST /api/participants/register`.
   - El número de celular es único: si ya existe, la API responde `409 Conflict` y no se crea el registro.
   - Cada registro recibe un `ticketNumber` autoincremental.
   - Queda en estado `pendiente` hasta que el admin lo revise.
2. El administrador entra al panel, revisa el comprobante y **aprueba o rechaza** el depósito.
3. Solo los participantes con estado `aprobado` y que nunca hayan ganado son elegibles para el sorteo.
4. El administrador abre el módulo de Sorteo e **inicia una ronda** (`POST /api/admin/winner/round/start`).
   La ronda sortea siempre en el mismo orden: **3er lugar → 2do lugar → 1er lugar**.
5. Por cada nivel, el admin presiona **Girar** → `POST /api/admin/winner/draw`. El backend elige el
   ganador con `crypto.randomBytes` (aleatoriedad criptográficamente segura) entre los elegibles y lo
   graba de inmediato; el frontend solo anima la revelación del ticket dígito por dígito con lo que
   el servidor ya confirmó — nunca decide ni valida nada del lado del cliente.
6. Al confirmarse el 1er lugar, la ronda pasa a `finalizado` automáticamente y se arma la pantalla de
   "Ganadores del Sorteo" con los 3 niveles.
7. El historial de ganadores (de todas las rondas/eventos) queda registrado y es consultable en
   cualquier momento vía `GET /api/admin/winner`.

## Endpoints principales

### Públicos (formulario de usuario)

| Método | Ruta                              | Descripción                                                                                        |
| ------ | --------------------------------- | -------------------------------------------------------------------------------------------------- |
| POST   | `/api/participants/register`      | Registra un participante (multipart/form-data: `fullName`, `accountName`, `phone`, `paymentProof`) |
| GET    | `/api/participants/status/:phone` | Consulta el estado de una inscripción                                                              |

### Autenticación admin

| Método | Ruta              | Descripción                                           |
| ------ | ----------------- | ----------------------------------------------------- |
| POST   | `/api/auth/login` | Login (`username`, `password`) → devuelve `token` JWT |
| GET    | `/api/auth/me`    | Perfil del admin autenticado                          |

### Panel de administración (requiere `Authorization: Bearer <token>`)

| Método | Ruta                                  | Descripción                                                          |
| ------ | ------------------------------------- | -------------------------------------------------------------------- |
| GET    | `/api/admin/stats`                    | Totales para el dashboard (pendientes, aprobados, rechazados)        |
| GET    | `/api/admin/participants`             | Lista/filtra depósitos (`?status=`, `?search=`, `?page=`, `?limit=`) |
| GET    | `/api/admin/participants/:id`         | Detalle de un participante                                           |
| PATCH  | `/api/admin/participants/:id/approve` | Aprueba el depósito                                                  |
| PATCH  | `/api/admin/participants/:id/reject`  | Rechaza el depósito (`{ "reason": "..." }`)                          |
| DELETE | `/api/admin/participants/:id`         | Elimina un registro (solo `superadmin`)                              |

### Premios configurables (requiere `Authorization: Bearer <token>`)

| Método | Ruta                      | Descripción                                                                                                |
| ------ | ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| GET    | `/api/admin/prizes`       | Lista los 3 premios (1°, 2°, 3°). Los crea con valores por defecto (Bs. 15.000/7.000/3.000) la primera vez |
| PUT    | `/api/admin/prizes/:rank` | Edita `label`/`amount`/`medalEmoji` del premio de rango `1`, `2` o `3`                                     |

### Módulo de sorteo por niveles (solo visible para el admin)

| Método | Ruta                              | Descripción                                                                                  |
| ------ | --------------------------------- | -------------------------------------------------------------------------------------------- |
| POST   | `/api/admin/winner/round/start`   | Inicia una ronda nueva (o retoma la que esté `en_progreso`)                                  |
| GET    | `/api/admin/winner/round/current` | Ronda activa: ganadores parciales y qué rango falta (`nextRank`)                             |
| GET    | `/api/admin/winner/round/:id`     | Resumen de una ronda puntual (para la pantalla final)                                        |
| POST   | `/api/admin/winner/draw`          | 🎲 Sortea el **siguiente** nivel pendiente de la ronda activa (3°→2°→1°)                     |
| GET    | `/api/admin/winner`               | Historial completo de ganadores, todas las rondas                                            |
| DELETE | `/api/admin/winner/:id`           | Deshace un sorteo — libera el ticket y reabre la ronda si estaba cerrada (solo `superadmin`) |

El orden de sorteo (3er → 2do → 1er lugar) es fijo por diseño: el endpoint `draw` calcula
automáticamente cuál es el siguiente rango pendiente de la ronda, así que el frontend nunca
necesita indicar qué nivel está sorteando.

## Módulo visual del sorteo (React, "Girar / Detener / Limpiar" por casilla)

La interfaz vive en el frontend (`sorteonoelito`, ruta `/admin/sorteo`), no en este backend.
Este backend solo expone la API; el panel visual completo (premios editables, 6 casillas
independientes por dígito, pantalla final de ganadores) se implementa en el repo del frontend.

- **Girar**: en la primera casilla del nivel actual, dispara `POST /api/admin/winner/draw` una
  única vez; el servidor ya elige y graba al ganador real antes de que arranque cualquier
  animación. Las casillas siguientes del mismo ticket solo animan lo que el servidor ya confirmó.
- **Detener**: congela la casilla activa en el dígito real del ticket ganador — nunca en un valor
  generado por el navegador.
- **Limpiar**: reinicia el marcador a `000000` y avanza al siguiente nivel de premio (2do, luego 1ro).
- **Regla obligatoria**: el nombre de la cuenta del depositante (`accountName`, usado solo para
  conciliar el comprobante de pago en Depósitos) nunca se muestra en el módulo de sorteo.
- Pensado para verse **solo dentro del área de administrador autenticado**; nunca se enlaza desde
  el formulario público de inscripción.

## Notas de seguridad implementadas

- Contraseñas de admin hasheadas con `bcrypt`.
- Autenticación por JWT en todas las rutas del panel y del sorteo.
- Índice único de MongoDB en `phone` + validación explícita en el controlador: **imposible duplicar un número**.
- `helmet` + `cors` configurados.
- `express-rate-limit` en el endpoint de registro público para mitigar spam/bots.
- Solo se aceptan imágenes o PDF como comprobante, con límite de tamaño configurable.
- Selección del ganador con `crypto.randomBytes` en vez de `Math.random` (mejor entropía/auditabilidad).
- Índice único `(round, rank)` en `Winner`: imposible sortear dos veces el mismo nivel de premio dentro de una misma ronda, incluso ante doble clic o carrera de red.
- # Bloqueo permanente por ticket (`Participant.isWinner`): un ticket que ya ganó no puede volver a ser elegible, ni en la misma ronda ni en rondas futuras.

# noelito_back_end

back_end sorteos noelito

04f141dfea1961808791a7f87e169406a2214ed2
