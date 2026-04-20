@AGENTS.md

# IronLog — Project Context

Social fitness-tracking app. Users design **routines** (templates), then run **sessions** (actual workouts) made of **session_exercises** and **sets**. A social layer via `follows` exposes sessions/sets of followed users.

## 🛠️ Stack (actual, not aspirational)

- **Language**: TypeScript `^5`
- **Framework**: Next.js `16.2.4` (App Router, React `19.2.4`, Turbopack)
- **Backend / Auth / DB**: Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/postcss`, no `tailwind.config.*` — theme lives in [app/globals.css](app/globals.css) inside `@theme {}`)
- **Data mutations**: Next.js **Server Actions** (`"use server"`) + `revalidatePath`. No React Query, no tRPC, no custom API routes.
- **Forms**: `useActionState` + `useFormStatus` from `react` / `react-dom`
- **Testing**: **Vitest** + `@testing-library/react` + `jsdom`. No Jest, no MSW.
- **Linting**: ESLint (`eslint-config-next`, flat config in [eslint.config.mjs](eslint.config.mjs))
- **Package manager**: `npm`

> ⚠️ **Do not introduce** shadcn/ui, React Query, Jest, MSW, Prettier, or `/api` routes unless explicitly asked. They're not in this project.

## 📂 Actual project structure

```
.
├── app/
│   ├── layout.tsx                 # root, fonts + metadata
│   ├── page.tsx                   # public landing
│   ├── globals.css                # Tailwind v4 @theme tokens, aurora/grain, hairline util
│   ├── (auth)/                    # route group — unauthenticated pages
│   │   ├── layout.tsx
│   │   ├── actions.ts             # signIn/signUp/signOut/reset/updatePassword/google
│   │   ├── login/ register/ forgot-password/ update-password/
│   ├── (app)/                     # route group — authenticated shell
│   │   ├── layout.tsx             # redirects to /login if no session, renders header + AppNav
│   │   ├── _components/app-nav.tsx
│   │   ├── dashboard/
│   │   └── rutinas/
│   │       ├── page.tsx           # list + create form
│   │       ├── actions.ts         # create/delete routine, add/remove routine_exercise
│   │       ├── _components/create-routine-form.tsx
│   │       └── [id]/
│   │           ├── page.tsx       # detail + exercise list
│   │           └── _components/   # add-exercise-form, remove-exercise-button, delete-routine-button
│   └── auth/callback/             # Supabase OAuth / email-link callback
├── components/
│   ├── brand/logo.tsx
│   └── ui/                        # field, submit-button, google-button, logout-button, separator
├── lib/supabase/
│   ├── client.ts                  # createBrowserClient (client components)
│   ├── server.ts                  # createServerClient (RSC / server actions) — async, awaits cookies()
│   └── middleware.ts              # session-refresh helper used by proxy.ts
├── proxy.ts                       # Next 16 proxy (replaces middleware.ts) — refreshes Supabase session
├── supabase/migrations/           # SQL migrations (source of truth for schema)
├── tests/                         # vitest (actions.test.ts, middleware.test.ts, components/)
├── next.config.ts
├── postcss.config.mjs
├── vitest.config.mts
└── tsconfig.json
```

## 🗄️ Database (see [supabase/migrations/20260420134655_initial_schema.sql](supabase/migrations/20260420134655_initial_schema.sql))

Tables: `profiles`, `follows`, `exercises` (global catalog, seeded), `routines`, `routine_exercises`, `sessions`, `session_exercises`, `sets`.

Key design decisions:
- **`user_id` is denormalized** down to `routine_exercises`, `session_exercises`, and `sets` so RLS never joins. `BEFORE INSERT` triggers fill it from the parent — **do not set `user_id` manually** on insert; it'll be overwritten (you *can* pass it, but rely on the trigger).
- `sets` also denormalize `exercise_id` from `session_exercises` via trigger.
- RLS is enabled on every table and all `auth.uid()` calls are wrapped in `(SELECT auth.uid())` for per-statement caching. Client queries can omit `.eq("user_id", uid)` — RLS handles it.
- `exercise_type` enum = `strength | cardio | isometric | bodyweight`. Target fields and PR metric branch on this:
  - `strength` → `weight_kg`
  - `bodyweight` → `reps`
  - `isometric` → `duration_seconds`
  - `cardio` → `distance_meters`
- `routine_exercises` has `UNIQUE (routine_id, order_index)` — compute `max + 1` before insert.
- `sets.is_pr` is recomputed by a `BEFORE INSERT` trigger; don't set it manually. Previous PRs of the same `(user, exercise)` get demoted.
- `handle_new_user()` trigger auto-creates a `profiles` row on `auth.users` insert, retrying on username collisions.

## 🔐 Auth flow

- Supabase SSR cookies. Session refresh happens in [proxy.ts](proxy.ts) via [lib/supabase/middleware.ts](lib/supabase/middleware.ts).
- `(app)/layout.tsx` calls `supabase.auth.getUser()` and redirects to `/login` if absent. Pages inside `(app)` can assume an authenticated user.
- OAuth/magic-link return to `/auth/callback?next=...`.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` are the required env vars.

## ⚙️ Commands

- `npm run dev` — dev server
- `npm run build` / `npm run start`
- `npm run lint`
- `npm run test` (vitest run) / `npm run test:watch`

No `format` script — formatting is whatever the editor enforces.

## 🎨 Design system

Dark, editorial, Apple-grade. Tokens defined in [app/globals.css](app/globals.css):
- Neutrals: `ink-50 … ink-950`
- Brand accent (green): `mineral-50 … mineral-700` — use for primary CTA accents, eyebrows, focus rings
- Danger / warm accent: `ember-400`, `ember-500` — destructive actions, errors
- Fonts: `font-display` (serif, Instrument) for hero/headlines, `font-sans` (Geist) for body, `font-mono` (Geist Mono) for eyebrows/labels — typically `font-mono text-[10-11px] uppercase tracking-[0.22em]`.
- Utilities: `.hairline` (1px subtle border), `.aurora` (animated backdrop), `.grid-texture`.
- Radii: prefer `rounded-2xl` for cards, `rounded-[14px]` for inputs/buttons, `rounded-full` for pills.

Reuse [components/ui/field.tsx](components/ui/field.tsx) and [components/ui/submit-button.tsx](components/ui/submit-button.tsx) for forms — they handle floating labels, pending state, and the themed look.

## 🧩 Conventions

- **Route groups**: `(auth)` for logged-out, `(app)` for logged-in. Co-locate components in `_components/` inside the route segment.
- **Server Components by default**; only add `"use client"` when you need hooks / interactivity.
- **Server Actions** live in an `actions.ts` next to the page that uses them. Signature for `useActionState`-driven forms:
  ```ts
  type ActionState = { error?: string; success?: string } | undefined;
  export const someAction = async (_prev: ActionState, formData: FormData): Promise<ActionState> => { … }
  ```
  For imperative/button-only actions, accept `formData: FormData` directly.
- **Dynamic route params are promises** in Next 16: `params: Promise<{ id: string }>` → `const { id } = await params`.
- **Arrow functions everywhere**, annotate return types (`React.ReactElement`, `Promise<…>`).
- **Destructure props**, avoid `any`, prefer `unknown` + narrowing.
- **Import order**: react → next → third-party → `@/…` local.
- **Copy is in Spanish** (the product UI). Error / success strings are user-facing Spanish.
- **No comments unless non-obvious.** Never add “what the code does” comments.

## 🧪 Testing

- Vitest config in [vitest.config.mts](vitest.config.mts), setup in [tests/setup.ts](tests/setup.ts).
- Tests live under `tests/` (not co-located). Examples exist for server actions and the proxy.
- Mock Supabase with `vi.mock("@/lib/supabase/server", …)` — see [tests/actions.test.ts](tests/actions.test.ts) as the reference pattern.

## 🚫 Don'ts

- Don't bypass RLS by adding `user_id` filters redundantly — RLS already enforces ownership.
- Don't write to `user_id` on `routine_exercises` / `session_exercises` / `sets` expecting it to stick; the trigger overrides it from the parent.
- Don't add `tailwind.config.ts` — Tailwind v4 reads tokens from `@theme` in CSS.
- Don't create `/api/…` routes for things Server Actions can do.
- Don't install shadcn/ui / React Query / Jest unless the user explicitly asks.
