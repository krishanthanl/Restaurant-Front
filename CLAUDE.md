# Front-end (React + Vite)

React 19, TypeScript 5.9, Vite 7, MUI 7, Axios, React Router 7, Vitest + Testing Library (jsdom). No state library — pages hold state with hooks and call feature API objects.

## Structure

```text
src/
  features/<feature>/
    api/<feature>Api.ts          object of async functions over apiClient
    types/<feature>Types.ts      response + input types (mirror backend DTOs, camelCase)
    validation/<feature>Validation.ts (+ .test.ts)   UX-only field checks returning Partial<Record<field, message>>
    components/                  dialogs, chips, forms
    pages/<Name>Page.tsx (+ .test.tsx)
  components/      shared: PageHeader, ContentState (LoadingState/ErrorState/EmptyState), FeedbackSnackbar
  layouts/AppLayout.tsx          navigation
  services/apiClient.ts          Axios instance, bearer token, single shared refresh, ApiProblem type
  App.tsx                        all routes
```

Small features (`access-control`) may be flat; prefer the full layout for new modules.

Reference slices: `areas` is the simplest list + dialog + activate/deactivate page; `kitchens` is the same shape plus the hardening below (in-flight guard, reload after a failed status change, an API contract test) — copy `kitchens` for new configuration pages. Menu setup pages live under `/menu/*` (`items`, `categories`, `kitchens`).

## Conventions

- All HTTP goes through `apiClient` (base URL `VITE_API_BASE_URL`, default `/api`). Never create another Axios instance or call `fetch`.
- Pass `AbortSignal` through list loads; tests assert on it.
- Updates/status changes send the entity's `rowVersion` back; a stale one yields 409 with a server message to show.
- Display backend `ProblemDetails` (`title`/`detail`, plus `traceId` for 500s) — the backend message is authoritative.
- Gate UI with `useAuth().hasPermission(Permissions.xxx)` and protect routes with `<PermissionRoute permission=...>`. This is UX only; the backend enforces.
- Never compute authoritative money totals client-side; display server values.
- Backend enums arrive as ints; the frontend maps them with arrays indexed by value (see `tableTypes` / `tableStatuses` in `tableTypes.ts`), so order must match the C# enum.
- Tokens live in tab-scoped `sessionStorage` via `tokenStore`; never touch the refresh cookie.
- Prevent duplicate submissions with both a `saving` state (disables buttons, MUI `loading`) **and** a `useRef` in-flight guard checked at the top of the handler: the disabled state only applies after a re-render, so a fast double click can otherwise send two requests (see `KitchenManagementPage`).
- After a failed status change, show the server message and `reload()` the list so a retry uses the current `rowVersion` and counts. A failed form save keeps the dialog open with the user's input.
- Show server errors through `getApiErrorMessage` + `FeedbackSnackbar`; load failures use `ErrorState` with a Retry button.

## Tests

`vi.mock` the feature API module and `useAuth`, render the page, drive it with `userEvent`, query by accessible role/name (tables have `aria-label`s). See `features/areas/pages/AreaManagementPage.test.tsx` and, for pages using `useParams`/`useNavigate`, `features/menu/pages/MenuItemFormPage.test.tsx` (wraps in `MemoryRouter`).

- MUI `Select` needs `labelId` on the `Select` and a matching `id` on its `InputLabel`, otherwise it has no accessible name and `getByRole('combobox', { name })` can't find it.
- `vite.config.ts` sets `testTimeout: 20_000`: userEvent-heavy MUI tests exceed Vitest's 5s default when the suite runs in parallel on this machine. Don't lower it or "fix" timeouts by deleting tests.
- userEvent refuses to click a disabled MUI button (`pointer-events: none`). To test a double-submit guard, fire both clicks in one `act(() => { button.click(); button.click(); })` so no re-render happens in between; this fails without the ref guard.
- API modules get a contract test by `vi.spyOn(apiClient, 'get' | 'post' | 'put')` and asserting URL, params and body (`rowVersion`, empty strings sent as `null`) — see `features/kitchens/api/kitchenApi.test.ts`.
- Run tools via `node_modules/.bin/...` if `npx`/`npm` fails (on this machine `npx` currently dies with `MODULE_NOT_FOUND` in the global npm install).

## Commands

```powershell
npm run dev      # http://localhost:5173, proxies /api to VITE_API_PROXY_TARGET
npm test
npm run build    # tsc -b && vite build → build/
npm run lint
```

`build/` and `dist/` are generated; don't edit. Deployed via Azure Static Web Apps workflows in `.github/workflows/`.
