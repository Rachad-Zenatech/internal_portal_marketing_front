# Marketing Portal Frontend Rules

Lean rules for this enterprise template project.

<!-- project-structure:start -->
## Project Structure

```text
src/
  assets/                   # Images and icons
  components/               # Reusable UI, one folder per feature
    AppShell/               # Layout chrome: sidebar, top bar, navigation, notifications
    common/                 # Shared by several pages: error boundary, loading screen, route guards
    dashboard/              # Charts, KPI cards and filters used by the dashboard, budget and event pages
    imports/                # Spreadsheet upload widgets (drop zone, preview, history) used by the import pages
    native/                 # Mobile-only components
    ui/                     # shadcn/ui primitives (button, dialog, ...); don't put feature code here
  hooks/                    # Custom React hooks
  lib/                      # App-wide helpers: auth context, env, storage, utils
  pages/                    # One folder per feature/route group
    Auth/                   # Login and pending-access screens
    Budgets/                # Budget tracker, approved budgets, expenses, reconciliation and budget uploads
    Configurations/         # Users, roles and permission settings
    Events/                 # Events list and event workspace: budget, travel (Navan), staff, funnel and performance
    Home/                   # Mobile (Expo) home screen
    Initiatives/            # Initiatives list, detail, costs, results/performance and demos (plus the mobile list)
    Logs/                   # Audit and system logs
    MarketingDashboard/     # Marketing dashboard (/dashboard)
    PaidAds/                # Paid ads: campaigns, ad results, platform sync status and uploads
    SocialMedia/            # Social media page
  services/                 # API calls: apiClient + one <feature>Service.ts per backend area
  types/                    # TypeScript types, one file per feature
  utils/                    # Pure helper functions
  App.native.tsx            # Mobile (Expo) entry and navigation
  App.tsx                   # Web routes (lazy-loaded pages)
  main.tsx                  # Web entry: providers and router
```

### Where new code goes

* **New page:** `src/pages/<Feature>/`. Pages that belong together share a folder; a `.native.tsx` variant sits next to its web file.
* **Components:** used by one feature go in `src/components/<Feature>/`; used by several go in `src/components/common/`. `src/components/ui/` is only for shadcn primitives.
* **New API calls** go in `src/services/<feature>Service.ts` through `apiClient`, not `fetch` inside components (some older pages still do this; move those calls when you touch them). Types go in `src/types/<feature>.ts`.
* **Don't add loose files** to `src/pages/` or `src/components/`.
* **When you move a file,** update every import to it (and the imports inside it), then run `npm run build` (`tsc -b && vite build`).
<!-- project-structure:end -->

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
