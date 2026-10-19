# Marketing Portal Frontend Rules

Lean rules for this enterprise template project.

## Stack

- React 19, TypeScript, Vite, Tailwind CSS v4, shadcn UI, React Query v5.
- API calls go through `src/services/apiClient.ts`; no hardcoded base URLs elsewhere.
- Shared API/domain types live in `src/types/*`; services and hooks do not export them.

## Frontend Architecture

- Put reusable backend shapes in `src/types`; use `import type`.
- Keep one-off prop types beside their component.
- Prefer shadcn components from `src/components/ui`.
- Services are API wrappers only, grouped by domain: `apiClient.ts`, `queryKeys.ts`, `errorReporting.ts`.
- Hooks handle React Query orchestration; keep components thin.
- Use theme tokens and shadcn variants for dark mode.
- Use `<ProtectedRoute>` with `navigationCode` or `permissionCode` to enforce RBAC.

## Backend Alignment

- Keep explicit request/response schemas aligned with frontend `src/types`.
- Uploads accept multipart form data and return stable IDs/metadata.

## Checks

- Run `npm run build` after TypeScript or component changes.
- Run `npm run lint` after broad/shared changes.

### Server-Sent Events (SSE) & Real-Time Event Streaming
* **"Wait for Event" Model Only (Mandatory):**
  * **NEVER** use polling loops (`check -> sleep -> check`) or database polling heartbeats inside SSE streaming endpoints.
  * **NEVER** query the database repeatedly inside SSE stream generators.
  * **Always** use `await event_queue.get()` (or `asyncio.wait_for(q.get(), timeout=30.0)` for lightweight ping) to suspend the coroutine at the event loop level with zero CPU/DB overhead until a published event arrives.

---

## 4. Architecture: Universal Web + Mobile App (Expo + Vite) — chosen

The Marketing portal uses **Option 2**: one frontend repo (`internal_portal_marketing_front`) serves the web app (Vite) and the Android/iOS app (Expo / React Native), following the CEO Dashboard pattern.

* **Web**: React 19 + Vite + Tailwind v4 + shadcn on `:5180` (`npm run dev`).
* **Mobile**: Expo Metro on `:8091`; entry `index.js` → `src/App.native.tsx`; screens are `*.native.tsx` and use `@/components/native`.
* **Shared code** (`src/services`, `src/types`, `src/lib`) must run on both: use `appStorage` (`src/lib/storage.ts`) and `getEnv`/`getApiBaseUrl` (`src/lib/env.ts`), never `localStorage`, `sessionStorage`, `import.meta.env` or `window` directly.
* **Ports**: backend `:8010`, web `:5180`, Metro `:8091`, local Postgres `:3009` (`marketing_portal_dev`).
* `npm run android` starts the emulator and sets `adb reverse` for 8091/8010/5180.
