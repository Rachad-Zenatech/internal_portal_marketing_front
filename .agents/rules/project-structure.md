---
trigger: model_decision
description: Project directory layout and code organization.
---

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
