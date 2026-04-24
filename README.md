# IronLog

> **Lift. Log. Level up.**  
> Social fitness tracker for strength training — plan routines, log workouts in real time, analyze your progress, and share your journey.

---

## Mockups

### Desktop

<!-- Añade aquí las capturas de escritorio. Ejemplo:
![Dashboard desktop](docs/mockups/desktop-dashboard.png)
![Entrenar desktop](docs/mockups/desktop-entrenar.png)
![Progreso desktop](docs/mockups/desktop-progreso.png)
-->

| Dashboard | Entrenar | Progreso |
|:---------:|:--------:|:--------:|
| _próximamente_ | _próximamente_ | _próximamente_ |

### Móvil

<!-- Añade aquí las capturas de móvil. Ejemplo:
<p align="center">
  <img src="docs/mockups/mobile-dashboard.png" width="200" />
  <img src="docs/mockups/mobile-entrenar.png" width="200" />
  <img src="docs/mockups/mobile-progreso.png" width="200" />
  <img src="docs/mockups/mobile-profile.png" width="200" />
</p>
-->

<p align="center">
  <em>Mockups de móvil — próximamente</em>
</p>

---

## Características

- **Rutinas** — Diseña plantillas de entrenamiento y asígnalas a días de la semana.
- **Sesiones en vivo** — Inicia un entrenamiento desde una rutina, añade ejercicios sobre la marcha y registra series en tiempo real.
- **Tipos de ejercicio** — Soporte para fuerza (peso × reps), peso corporal, isométrico (tiempo) y cardio (distancia).
- **PRs automáticos** — Detección y ranking automático de récords personales por ejercicio; los anteriores se degradan al superarlos.
- **Progreso y analítica** — Dashboard con volumen semanal, heatmap de actividad, distribución muscular, curvas de progreso por ejercicio y feed de PRs.
- **Social** — Seguir usuarios, solicitudes de seguimiento para perfiles privados, feed de actividad de seguidos.
- **Perfiles** — Bio, estadísticas, control de privacidad, historial de sesiones público/privado.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack) |
| Lenguaje | TypeScript 5 |
| UI | React 19, Tailwind CSS v4 |
| Backend / Auth / DB | [Supabase](https://supabase.com) (PostgreSQL + RLS + Auth) |
| Mutaciones | Next.js Server Actions (`"use server"`) |
| Formularios | `useActionState` + `useFormStatus` (React 19) |
| Testing | Vitest + Testing Library + jsdom |
| Linting | ESLint 9 (`eslint-config-next`) |
| Gestor de paquetes | npm |

> No se usa shadcn/ui, React Query, tRPC, Jest, MSW ni rutas `/api`.

---

## Estructura del proyecto

```
.
├── app/
│   ├── layout.tsx                  # Root — fuentes + metadatos
│   ├── page.tsx                    # Landing pública
│   ├── globals.css                 # @theme Tailwind v4, aurora, grain, hairline
│   ├── (auth)/                     # Páginas sin autenticar
│   │   ├── actions.ts              # signIn / signUp / signOut / OAuth / reset
│   │   └── login/ register/ forgot-password/ update-password/
│   ├── (app)/                      # Shell autenticado
│   │   ├── layout.tsx              # Redirige a /login si no hay sesión
│   │   ├── dashboard/              # Resumen personalizado
│   │   ├── entrenar/               # Hub de entrenamientos y sesión en vivo
│   │   │   └── [sessionId]/        # Editor de sesión activa
│   │   │       └── historial/[sessionId]/  # Detalle / edición de sesión pasada
│   │   ├── rutinas/                # Biblioteca de rutinas
│   │   │   └── [id]/               # Detalle de rutina
│   │   ├── progreso/               # Analítica y PRs
│   │   ├── profile/                # Perfil propio + solicitudes
│   │   └── u/[username]/           # Perfil público de otro usuario
│   └── auth/callback/              # OAuth / magic-link callback
├── components/
│   ├── brand/logo.tsx
│   └── ui/                         # field, submit-button, google-button, separator…
├── lib/supabase/
│   ├── client.ts                   # createBrowserClient
│   ├── server.ts                   # createServerClient (RSC / Server Actions)
│   └── middleware.ts               # Refresco de sesión
├── proxy.ts                        # Proxy Next 16 — reemplaza middleware.ts
├── supabase/migrations/            # Migraciones SQL (fuente de verdad del esquema)
└── tests/                          # Vitest
```

---

## Base de datos

Tablas principales gestionadas por Supabase + RLS:

| Tabla | Propósito |
|-------|-----------|
| `profiles` | Metadatos de usuario (sincronizado con `auth.users` por trigger) |
| `exercises` | Catálogo global de ejercicios (seed incluido) |
| `routines` | Plantillas de entrenamiento por usuario |
| `routine_exercises` | Ejercicios de una plantilla (con índice de orden) |
| `sessions` | Sesiones reales (`active` / `completed` / `discarded`) |
| `session_exercises` | Ejercicios de una sesión |
| `sets` | Series individuales con reps, peso, tiempo o distancia |
| `follows` | Grafo social (`pending` / `accepted`) |

**Decisiones de diseño clave:**

- `user_id` está denormalizado en `routine_exercises`, `session_exercises` y `sets` mediante triggers — no lo escribas manualmente en inserciones.
- `sets.is_pr` es calculado por un trigger `BEFORE INSERT`; no lo establezcas tú.
- RLS en todas las tablas — las consultas del cliente no necesitan `.eq("user_id", uid)`.

---

## Diseño

Oscuro, editorial, estilo Apple. Todos los tokens viven en `app/globals.css` dentro de `@theme {}`.

| Token | Uso |
|-------|-----|
| `ink-50 … ink-950` | Escala de neutrales (blanco sucio → casi negro) |
| `mineral-50 … mineral-700` | Acento verde — CTAs, focus rings, eyebrows |
| `ember-400 / ember-500` | Acento rojo cálido — acciones destructivas, errores |
| `font-display` | Serif (Instrument) — titulares |
| `font-sans` | Sans (Geist) — cuerpo |
| `font-mono` | Mono (Geist Mono) — etiquetas `10–11px uppercase tracking-widest` |

Utilidades especiales: `.aurora` (fondo animado), `.grid-texture`, `.hairline` (borde 1 px sutil).

---

## Primeros pasos

### Requisitos previos

- Node.js ≥ 18
- Una cuenta y proyecto en [Supabase](https://supabase.com)

### Instalación

```bash
git clone https://github.com/tu-usuario/ironlog.git
cd ironlog
npm install
```

### Variables de entorno

Crea un archivo `.env.local` en la raíz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Migraciones

Aplica las migraciones a tu proyecto Supabase:

```bash
supabase db push
# o desde el dashboard de Supabase, ejecuta los archivos en supabase/migrations/ en orden
```

### Servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

---

## Comandos

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (Turbopack) |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | Ejecutar ESLint |
| `npm run test` | Ejecutar tests (Vitest) |
| `npm run test:watch` | Tests en modo watch |

---

## Tests

```bash
npm run test
```

Los tests viven en `tests/`. El patrón de referencia para mockear Supabase está en `tests/actions.test.ts`.

---

## Despliegue

La forma más sencilla es [Vercel](https://vercel.com):

1. Importa el repositorio en Vercel.
2. Añade las variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`).
3. Despliega — Vercel detecta Next.js automáticamente.

Cualquier plataforma compatible con Node.js y el output de `next build` también funciona (Railway, Render, etc.).

---

## Licencia

MIT
