---
name: frontend-feature
description: Add or extend a React feature module (types, API client, validation, components, pages, routes, navigation, tests) in the restaurant front-end following the existing feature-folder pattern. Use when building UI for a backend module such as Orders, Kitchen display, Billing or Payments, or adding pages/dialogs to an existing feature.
---

# Front-end feature module

Reference implementation: `src/features/areas/` (list page + form dialog + status filter) and `src/features/tables/pages/TableDashboardPage.tsx` with `src/features/dining-sessions/` (operational workflow dialogs). Read them before writing code.

## Steps

1. **Types** `src/features/<feature>/types/<feature>Types.ts`
   - Mirror backend response DTOs exactly (camelCase, `string` GUIDs, ISO date strings, `rowVersion: string`).
   - Separate `<Entity>Input` type for forms. Enum ints mapped via `as const` arrays in C# enum order.
2. **API** `src/features/<feature>/api/<feature>Api.ts`
   - `export const <feature>Api = { async getX(..., signal?: AbortSignal) {...}, ... }` using `apiClient` only.
   - Send `rowVersion` on updates/status changes. Never send restaurant IDs or computed totals.
3. **Validation** `validation/<feature>Validation.ts` returning `Partial<Record<keyof Input, string>>`; limits must match the backend's. Add `<feature>Validation.test.ts`.
4. **Components/pages**
   - Use MUI. Reuse `PageHeader`, `LoadingState`/`ErrorState`/`EmptyState` (from `ContentState.tsx`) and `FeedbackSnackbar` from `src/components/`.
   - Load lists in `useEffect` with an `AbortController`; abort on cleanup.
   - Surface backend `ProblemDetails` messages; don't replace them with generic text.
   - Hide/disable actions with `useAuth().hasPermission(Permissions.x)`.
   - Keep business rules (state transitions, totals) out of components — the API decides; the UI reflects allowed actions.
   - Give tables/regions an `aria-label` so tests can query by role.
   - Waiter/kitchen screens: minimize clicks and make touch targets large (AGENTS.md §9).
5. **Routing** in `src/App.tsx` inside `<ProtectedRoute>/<AppLayout>`; wrap permission-gated routes in `<PermissionRoute permission={Permissions.x}>`. Add the nav entry in `src/layouts/AppLayout.tsx`.
6. **Tests** `pages/<Name>Page.test.tsx`: `vi.mock` the feature API and `../../authentication/useAuth`, `vi.resetAllMocks()` in `beforeEach`, `cleanup` in `afterEach`, interact with `userEvent.setup()`, assert API calls and rendered results. Cover permission-hidden actions and backend error display.
7. Run `npm test`, `npm run build`, `npm run lint` from `front-end/`.

## Don't

- Add Redux, React Query, form libraries, date libraries or a second HTTP client without the user agreeing.
- Edit `build/` or `dist/`.
- Store tokens anywhere but `tokenStore`.
