# Auth via httpOnly Cookie Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate admin authentication from a JWT stored in `localStorage` (read by JS, sent via `Authorization` header) to a JWT stored in an `httpOnly` cookie set by the server, closing the XSS attack surface where any injected script could read `cris_token` and steal a session.

**Architecture:** The login endpoint sets the JWT in a `Set-Cookie: cris_session=...; HttpOnly` response instead of returning it in the JSON body. The Express auth middleware reads the JWT from `req.cookies.cris_session` (via `cookie-parser`) instead of the `Authorization` header. The axios client sends `withCredentials: true` so the browser attaches the cookie automatically; the manual `Authorization` header injection is removed. Because JS can no longer read the cookie, the client keeps a separate non-sensitive flag (`localStorage['cris_authed'] = '1'`, no token inside) purely to decide instantly whether to render the admin shell or redirect to `/admin/login` — the real security boundary stays server-side: every API call is validated against the httpOnly cookie, and any 401 response clears the flag and redirects. A new `POST /api/logout` endpoint clears the cookie (JS cannot delete an httpOnly cookie itself).

**Tech Stack:** Express 5, `cookie-parser` (new dependency), `jsonwebtoken`, React Router `RequireAuth`, Axios.

---

## File Structure

| File | Responsibility |
|---|---|
| `server/src/app.ts` | Wires `cookie-parser`; tightens CORS to `CLIENT_URL` + `credentials: true` |
| `server/src/config/env.ts` | Adds `CLIENT_URL` env var |
| `server/src/modules/auth/auth.controller.ts` | `login` sets the cookie instead of returning the token; new `logout` clears it |
| `server/src/modules/auth/auth.routes.ts` | Adds `POST /logout` route |
| `server/src/middleware/auth.ts` | Reads JWT from `req.cookies.cris_session` instead of `Authorization` header |
| `server/src/middleware/auth.test.ts` | New unit test for the middleware reading the cookie |
| `client/src/api/client.ts` | `withCredentials: true`; removes the `Authorization` interceptor; 401 handler clears the flag |
| `client/src/api/queries.ts` | `login()` return type drops `token`; new `logout()` function |
| `client/src/pages/AdminLoginPage.tsx` | Sets `cris_authed` flag instead of storing the token |
| `client/src/App.tsx` | `RequireAuth` checks the flag instead of the token |
| `client/src/components/AdminLayout.tsx` | `logout()` calls `POST /api/logout`, then clears the flag |
| `server/.env.example`, `client/.env.example` | Document `CLIENT_URL` |

---

## Task 1: Add `cookie-parser` and `CLIENT_URL` to the server

**Files:**
- Modify: `server/package.json`
- Modify: `server/src/config/env.ts`
- Modify: `server/src/app.ts`
- Modify: `server/.env.example`
- Modify: `server/.env` (local dev value)

- [ ] **Step 1: Install the dependency**

Run: `cd server && npm install cookie-parser && npm install -D @types/cookie-parser`

Expected: `cookie-parser` added to `dependencies` and `@types/cookie-parser` added to `devDependencies` in `server/package.json`.

- [ ] **Step 2: Add `CLIENT_URL` to the env schema**

In `server/src/config/env.ts`, add the field to `envSchema` (after `ADMIN_PASSWORD`, before `UPLOAD_MAX_FILE_SIZE_MB`):

```typescript
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  UPLOAD_MAX_FILE_SIZE_MB: z.coerce.number().default(5),
```

- [ ] **Step 3: Document `CLIENT_URL` in `server/.env.example`**

Add this line after `ADMIN_PASSWORD=changeme123`:

```
CLIENT_URL=http://localhost:5173
```

- [ ] **Step 4: Set `CLIENT_URL` in the local `server/.env`**

Add the same line (`CLIENT_URL=http://localhost:5173`) to `server/.env` so local dev keeps working — without it, `CORS` will reject the Vite dev server origin once Step 6 lands.

- [ ] **Step 5: Wire `cookie-parser` into the app**

In `server/src/app.ts`, add the import near the other middleware imports:

```typescript
import cookieParser from 'cookie-parser';
```

Then add `app.use(cookieParser());` right after `app.use(express.urlencoded({ extended: true }));`:

```typescript
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'tiny'));
```

- [ ] **Step 6: Tighten CORS**

In `server/src/app.ts`, replace:

```typescript
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  })
);
```

with:

```typescript
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  })
);
```

- [ ] **Step 7: Verify the server still boots**

Run: `cd server && npm run dev`
Expected: server starts on port 4000 with no "Invalid environment variables" error. Stop it with Ctrl+C once you see the ready log.

- [ ] **Step 8: Commit**

```bash
git add server/package.json server/package-lock.json server/src/config/env.ts server/src/app.ts server/.env.example
git commit -m "feat(server): adicionar cookie-parser e CLIENT_URL para suportar cookie httpOnly"
```

(Do not commit `server/.env` — it's gitignored local config.)

---

## Task 2: Login sets the httpOnly cookie; add logout endpoint

**Files:**
- Modify: `server/src/modules/auth/auth.controller.ts`
- Modify: `server/src/modules/auth/auth.routes.ts`

- [ ] **Step 1: Add a cookie options constant and update `login` in `auth.controller.ts`**

Replace the full contents of `server/src/modules/auth/auth.controller.ts` with:

```typescript
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from './auth.service';
import { sendSuccess } from '../../utils/responses';
import { env } from '../../config/env';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const SESSION_COOKIE_NAME = 'cris_session';

const sessionCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 2 * 60 * 60 * 1000, // 2h, matches the JWT expiry in auth.service.ts
  path: '/'
};

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data.email, data.password);
    res.cookie(SESSION_COOKIE_NAME, result.token, sessionCookieOptions);
    return sendSuccess(res, { user: result.user });
  } catch (error) {
    return next(error);
  }
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  return sendSuccess(res, { ok: true });
}
```

- [ ] **Step 2: Add the logout route**

Replace the contents of `server/src/modules/auth/auth.routes.ts` with:

```typescript
import { Router } from 'express';
import * as controller from './auth.controller';

export const authRoutes = Router();

authRoutes.post('/login', controller.login);
authRoutes.post('/logout', controller.logout);
```

- [ ] **Step 3: Manually verify login sets the cookie**

Run: `cd server && npm run dev`, then in another terminal:

```bash
curl -i -X POST http://localhost:4000/api/login -H "Content-Type: application/json" -d "{\"email\":\"admin@fernanda.com.br\",\"password\":\"<your ADMIN_PASSWORD from server/.env>\"}"
```

Expected: response headers include a line starting with `Set-Cookie: cris_session=...; Max-Age=7200; Path=/; HttpOnly; SameSite=Lax` (no `Secure` since `NODE_ENV=development`), and the JSON body is `{"success":true,"data":{"user":{...}}}` with **no `token` field**.

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/auth/auth.controller.ts server/src/modules/auth/auth.routes.ts
git commit -m "feat(server): login seta cookie httpOnly em vez de devolver o token; adiciona POST /logout"
```

---

## Task 3: Auth middleware reads the cookie

**Files:**
- Modify: `server/src/middleware/auth.ts`
- Create: `server/src/middleware/auth.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/src/middleware/auth.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { requireAuth } from './auth';

function makeRes() {
  return {} as any;
}

describe('requireAuth', () => {
  it('calls next with the decoded payload when the cookie has a valid token', () => {
    const token = jwt.sign({ id: '1', email: 'a@b.com', role: 'admin' }, env.JWT_SECRET, { expiresIn: '2h' });
    const req = { cookies: { cris_session: token } } as any;
    const next = vi.fn();

    requireAuth(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toMatchObject({ id: '1', email: 'a@b.com', role: 'admin' });
  });

  it('calls next with a 401 error when there is no cookie', () => {
    const req = { cookies: {} } as any;
    const next = vi.fn();

    requireAuth(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it('calls next with a 401 error when the cookie token is invalid', () => {
    const req = { cookies: { cris_session: 'not-a-real-token' } } as any;
    const next = vi.fn();

    requireAuth(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd server && npx vitest run src/middleware/auth.test.ts`
Expected: FAIL — `requireAuth` still reads `req.headers.authorization`, so `req.cookies` is ignored and the first test fails (`next` called with a 401 error instead of no args).

- [ ] **Step 3: Update the middleware to read the cookie**

Replace the contents of `server/src/middleware/auth.ts` with:

```typescript
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from '../utils/errors';
import { SESSION_COOKIE_NAME } from '../modules/auth/auth.controller';

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) {
    return next(new HttpError(401, 'Unauthorized'));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as Express.UserPayload;
    req.user = payload;
    return next();
  } catch (error) {
    return next(new HttpError(401, 'Invalid token'));
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd server && npx vitest run src/middleware/auth.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/middleware/auth.ts server/src/middleware/auth.test.ts
git commit -m "refactor(auth-middleware): ler JWT do cookie httpOnly em vez do header Authorization"
```

---

## Task 4: Client — stop reading/sending the token manually

**Files:**
- Modify: `client/src/api/client.ts`
- Modify: `client/src/api/queries.ts`

- [ ] **Step 1: Update the axios instance**

In `client/src/api/client.ts`, replace:

```typescript
export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
  headers: {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cris_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

with:

```typescript
export const AUTH_FLAG_KEY = 'cris_authed';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  }
});
```

- [ ] **Step 2: Update the 401 handler to clear the flag instead of the token**

In the same file, in the response interceptor, replace:

```typescript
    if (error.response?.status === 401 && !window.location.pathname.includes('/admin/login')) {
      localStorage.removeItem('cris_token');
      window.location.href = '/admin/login';
      return Promise.reject(new Error('Sessao expirada. Faca login novamente.'));
    }
```

with:

```typescript
    if (error.response?.status === 401 && !window.location.pathname.includes('/admin/login')) {
      localStorage.removeItem(AUTH_FLAG_KEY);
      window.location.href = '/admin/login';
      return Promise.reject(new Error('Sessao expirada. Faca login novamente.'));
    }
```

- [ ] **Step 3: Update `login()` return type and add `logout()` in `queries.ts`**

In `client/src/api/queries.ts`, find:

```typescript
export const login = async (email: string, password: string): Promise<{ token: string; user: User }> => {
  const { data } = await api.post('/login', { email, password });
  return data.data;
};
```

Replace with:

```typescript
export const login = async (email: string, password: string): Promise<{ user: User }> => {
  const { data } = await api.post('/login', { email, password });
  return data.data;
};

export const logout = async (): Promise<void> => {
  await api.post('/logout');
};
```

- [ ] **Step 4: Commit**

```bash
git add client/src/api/client.ts client/src/api/queries.ts
git commit -m "refactor(client-api): enviar cookie httpOnly via withCredentials em vez de header Authorization manual"
```

---

## Task 5: Client — login, route guard, and logout use the flag

**Files:**
- Modify: `client/src/pages/AdminLoginPage.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/AdminLayout.tsx`

- [ ] **Step 1: `AdminLoginPage.tsx` sets the flag instead of the token**

In `client/src/pages/AdminLoginPage.tsx`, replace:

```typescript
import { login } from '../api/queries';
```

with:

```typescript
import { login } from '../api/queries';
import { AUTH_FLAG_KEY } from '../api/client';
```

Then replace:

```typescript
      const result = await login(form.email, form.password);
      localStorage.setItem('cris_token', result.token);
      navigate('/admin');
```

with:

```typescript
      await login(form.email, form.password);
      localStorage.setItem(AUTH_FLAG_KEY, '1');
      navigate('/admin');
```

- [ ] **Step 2: `App.tsx` `RequireAuth` checks the flag**

In `client/src/App.tsx`, replace:

```typescript
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
```

with:

```typescript
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AUTH_FLAG_KEY } from './api/client';
```

Then replace:

```typescript
function RequireAuth({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('cris_token');
  if (!token) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
```

with:

```typescript
function RequireAuth({ children }: { children: ReactNode }) {
  const authed = localStorage.getItem(AUTH_FLAG_KEY);
  if (!authed) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 3: `AdminLayout.tsx` logout calls the server and clears the flag**

In `client/src/components/AdminLayout.tsx`, find the import block near the top and add:

```typescript
import { logout as logoutRequest } from '../api/queries';
import { AUTH_FLAG_KEY } from '../api/client';
```

Then replace:

```typescript
  const logout = () => {
    localStorage.removeItem('cris_token');
    navigate('/admin/login');
  };
```

with:

```typescript
  const logout = async () => {
    try {
      await logoutRequest();
    } finally {
      localStorage.removeItem(AUTH_FLAG_KEY);
      navigate('/admin/login');
    }
  };
```

- [ ] **Step 4: Typecheck**

Run: `cd client && npx tsc -b --noEmit`
Expected: no new errors (any pre-existing errors unrelated to these files are fine).

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/AdminLoginPage.tsx client/src/App.tsx client/src/components/AdminLayout.tsx
git commit -m "refactor(client-auth): login/logout/RequireAuth usam flag cris_authed em vez do token"
```

---

## Task 6: Document `CLIENT_URL` for the client build and end-to-end verification

**Files:**
- Modify: `client/.env.example`

- [ ] **Step 1: Add a comment cross-referencing the server env var**

In `client/.env.example`, after the `VITE_PUBLIC_URL` line, add:

```
# CLIENT_URL no server/.env precisa apontar para a origem deste app
# (ex.: http://localhost:5173 em dev, https://crisjageneski.com.br em produção)
# para o cookie httpOnly de sessão funcionar com CORS.
```

- [ ] **Step 2: Manual end-to-end verification**

Run both servers: `cd server && npm run dev` (terminal 1), `cd client && npm run dev` (terminal 2).

In the browser at `http://localhost:5173/admin/login`:
1. Open DevTools → Application → Cookies. Confirm no `cris_session` cookie exists yet and `localStorage` has no `cris_authed`/`cris_token`.
2. Log in with the `ADMIN_EMAIL`/`ADMIN_PASSWORD` from `server/.env`.
3. Confirm you land on `/admin` and DevTools shows a `cris_session` cookie marked `HttpOnly` (and `localStorage.cris_authed === '1'`).
4. Refresh the page on `/admin/pages` — confirm it stays logged in (no redirect to `/admin/login`).
5. Click "Sair" in the sidebar. Confirm `cris_session` cookie disappears from DevTools, `cris_authed` is removed from `localStorage`, and you land on `/admin/login`.
6. Try navigating directly to `/admin/pages` while logged out — confirm it redirects to `/admin/login`.

- [ ] **Step 3: Commit**

```bash
git add client/.env.example
git commit -m "docs(env): documentar CLIENT_URL necessário para o cookie httpOnly de sessão"
```

---

## Self-Review Notes

- **Spec coverage:** httpOnly cookie on login (Task 2), middleware reading cookie (Task 3), CORS lockdown (Task 1), logout endpoint (Task 2), client flag-based routing (Tasks 4-5), env documentation (Tasks 1 and 6) — all covered.
- **Type consistency:** `SESSION_COOKIE_NAME` and `AUTH_FLAG_KEY` are each defined once (in `auth.controller.ts` and `client.ts` respectively) and imported everywhere else they're used — no duplicated string literals across tasks.
- **Out of scope (confirmed with user during brainstorming):** token refresh/rotation, a `/api/me` endpoint, and any change to the 2h JWT expiry are not part of this plan.
