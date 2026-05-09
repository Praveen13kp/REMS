# S0-FE-A-01 — API client, auth store, route guards

**Owner:** FE-A
**Branch:** `fe/foundation/S0-FE-A-01-api-client`
**Estimated:** 1 day
**Blocks:** every authenticated FE page
**Blocked by:** S0-BE-A-02 (better-auth endpoints exist)

## Goal

Wire up the frontend's HTTP client, auth state, and route protection so every subsequent page can just declare what data it needs.

## Files to read first

- `frontend/src/App.jsx`
- `frontend/src/main.jsx`
- `frontend/src/pages/auth/Login.jsx`
- `frontend/src/pages/auth/Signup.jsx`
- `frontend/src/hooks/useAuth.js`
- `frontend/src/layouts/AuthLayout.jsx`, `DashboardLayout.jsx`, `MainLayout.jsx`
- `backend/AUTH.md` (from S0-BE-A-02) for the actual auth endpoints
- `docs/CONTRIBUTING.md` § 2 Frontend conventions

## Steps

### 1. API client — `frontend/src/lib/api.js`

```js
// Pseudo-spec
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
  withCredentials: true, // critical: better-auth uses cookies
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const payload = err.response?.data?.error ?? { message: err.message };
    return Promise.reject(payload);
  }
);

export { api };
```

Add a `frontend/.env.example` with `VITE_API_URL=http://localhost:4000/api`.

### 2. Auth store — `frontend/src/stores/authStore.js`

Use zustand. Shape:

```js
{
  user: null | { id, name, email, role, companyId },
  status: "idle" | "loading" | "authenticated" | "unauthenticated",
  fetchSession: async () => void,
  signIn: async ({ email, password }) => void,  // calls /auth/sign-in/email
  signUp: async ({ name, email, password }) => void, // calls /auth/sign-up/email
  signOut: async () => void,
}
```

`fetchSession` calls `GET /auth/get-session`. Run it on app boot from `App.jsx`.

### 3. Route guards — `frontend/src/components/common/ProtectedRoute.jsx`

```jsx
// While status === "loading", show a centered spinner
// If "unauthenticated", redirect to /login with `?from=<pathname>`
// Else render <Outlet />
```

Mirror `RoleRoute` that takes `allowedRoles={["OWNER","ADMIN"]}` and 403s otherwise.

### 4. App.jsx route tree

Replace the current minimal routes with:

```jsx
<Routes>
  <Route element={<AuthLayout />}>
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
  </Route>

  <Route element={<ProtectedRoute />}>
    <Route element={<DashboardLayout />}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/leads" element={<Leads />} />
      <Route path="/projects" element={<Projects />} />
      <Route path="/team" element={<Team />} />
    </Route>
    {/* Onboarding routes added in S1-FE-A-01 */}
  </Route>

  <Route path="/" element={<Navigate to="/dashboard" replace />} />
  <Route path="*" element={<Navigate to="/dashboard" replace />} />
</Routes>
```

### 5. Refactor existing Login.jsx and Signup.jsx

- Replace any custom fetch with `authStore.signIn` / `authStore.signUp`
- On success, navigate to `/dashboard`
- Show errors via `sonner` toast (already installed)
- Keep the existing UI (don't redesign)

### 6. Replace `useAuth` hook

If `useAuth.js` is just a stub, delete it and have components use `useAuthStore` directly.

### 7. Manual test

- Backend running, FE running
- Sign up a new user → cookie set → redirect to /dashboard
- Refresh page → still authenticated (session restored via `fetchSession`)
- Log out → redirected to /login
- Visit `/leads` while logged out → redirected to `/login?from=/leads`

## Acceptance criteria

- [ ] `lib/api.js` exports a configured axios instance with `withCredentials: true`
- [ ] `frontend/.env.example` checked in
- [ ] `stores/authStore.js` implements full lifecycle including session restore
- [ ] `ProtectedRoute` and `RoleRoute` components work
- [ ] `App.jsx` routes for auth, protected dashboard area, and 404 fallback
- [ ] Login & Signup pages call the auth store, not raw fetch
- [ ] All four manual test cases pass

## AI prompt template

> I'm on task S0-FE-A-01. Read `docs/tasks/sprint-0-foundation/S0-FE-A-01-api-client-auth-store.md`, the current `frontend/src/App.jsx`, `frontend/src/pages/auth/{Login,Signup}.jsx`, layouts, and `backend/AUTH.md`. Propose the file list and shape before writing. Use zustand (already installed) and axios. The backend uses better-auth so cookies must be enabled (`withCredentials: true`). Show me the auth store's full type/shape first; I'll approve before you write the components.

## Notes for reviewer

- `withCredentials: true` is non-negotiable — without it, no cookies, no session
- Make sure CORS on the backend (`app.js`) has `credentials: true` AND the origin is `http://localhost:5173`
- After this PR, every other FE page can assume `useAuthStore().user` is populated
