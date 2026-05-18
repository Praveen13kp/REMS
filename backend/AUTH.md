
# Authentication — better-auth

This project uses [better-auth](https://www.better-auth.com) for authentication. All auth endpoints are mounted at `/api/auth/*`.

## Setup

Ensure your `.env` has the required variables:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/Relms"
BETTER_AUTH_SECRET="<64-char-hex-string>"
BETTER_AUTH_URL="http://localhost:4000"
FRONTEND_URL="http://localhost:5173"

# Optional — leave empty to disable Google sign-in
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

## Google OAuth (optional, invite-only)

Google sign-in is opt-in via env vars. When configured it operates in
**invite-only** mode — `disableSignUp: true` rejects any Google identity
whose email isn't already in our `User` table. New users must come in
through the normal company signup or via an admin invite first.

### Setup

1. Go to https://console.cloud.google.com → APIs & Services → Credentials
2. Create an OAuth 2.0 Client ID (type **Web application**)
3. **Authorized JavaScript origins**: `http://localhost:5173`
4. **Authorized redirect URIs**: `http://localhost:4000/api/auth/callback/google`
5. Copy the Client ID + Secret into `backend/.env`:

   ```env
   GOOGLE_CLIENT_ID="123456-xxx.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxx"
   ```

6. Restart the backend. You should NOT see the
   `GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — Google sign-in disabled`
   warning anymore.

### Frontend flow

`Login.jsx` calls `POST /api/auth/sign-in/social` with
`{ provider: "google", callbackURL, errorCallbackURL }`. Better-auth
returns a redirect URL pointing at Google's consent screen. After consent
Google calls back to `/api/auth/callback/google`; if the email matches an
existing user, better-auth signs them in and redirects to `callbackURL`.
If the email is unknown, better-auth redirects to `errorCallbackURL`
(`/login?error=google`) which surfaces an "ask your admin for an invite"
toast.

### Account linking

`account.accountLinking.enabled: true` with `trustedProviders: ["google"]`
means a user who signed up via email/password can later sign in via
Google with the same email and the two identities get linked
automatically (no duplicate user row).

## Endpoints

### Sign up

```powershell
curl -X POST http://localhost:4000/api/auth/sign-up/email `
  -H "Content-Type: application/json" `
  -d '{"name":"Your Name","email":"you@example.com","password":"YourPass1"}'
```

**Response** (200):
```json
{
  "token": "...",
  "user": {
    "id": "...",
    "name": "Your Name",
    "email": "you@example.com",
    "emailVerified": false,
    "role": "OWNER",
    "isActive": true
  }
}
```

### Sign in

```powershell
curl -X POST http://localhost:4000/api/auth/sign-in/email `
  -H "Content-Type: application/json" `
  -c cookies.txt `
  -d '{"email":"you@example.com","password":"YourPass1"}'
```

**Response** (200):
```json
{
  "redirect": false,
  "token": "...",
  "user": { ... }
}
```

### Get session (validate token)

Use the cookie from sign-in:

```powershell
curl http://localhost:4000/api/auth/get-session -b cookies.txt
```

**Response** (200):
```json
{
  "user": { ... },
  "session": { ... }
}
```

### Sign out

```powershell
curl -X POST http://localhost:4000/api/auth/sign-out -b cookies.txt
```

**Response** (200): `{ "success": true }`

## Error responses

All errors follow the standard envelope:

```json
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Not authenticated"
  }
}
```

## Testing with Postman

1. Send `POST /api/auth/sign-up/email` with JSON body
2. The response sets a session cookie automatically
3. Use the cookie for subsequent requests

## Notes

- Email verification is disabled for MVP (will be enabled in S1)
- Password must be at least 8 characters
- Session token is stored in an HTTP-only cookie named `relms.session_token`
- The `role` field is set server-side (cannot be set during sign-up)

## Company Registration (S1-BE-A-01)

### Register Company & Owner

```powershell
curl -X POST http://localhost:4000/api/company/register `
  -H "Content-Type: application/json" `
  -d '{"companyName":"Test Co","companyType":"BROKERAGE","city":"Pune","ownerName":"John","ownerEmail":"john@test.com","ownerPhone":"9999999999","password":"Passw0rd!"}'
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "company": { "id": "...", "name": "Test Co", ... },
    "user": { "id": "...", "email": "john@test.com", "role": "OWNER", ... }
  }
}
```

### Get Current Company

```powershell
curl http://localhost:4000/api/company/me -b cookies.txt
```

## User Management (S1-BE-A-02)

### Invite User

```powershell
curl -X POST http://localhost:4000/api/users/invite `
  -H "Content-Type: application/json" `
  -b cookies.txt `
  -d '{"email":"teammate@example.com","role":"AGENT","name":"Teammate Name"}'
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "teammate@example.com",
    "role": "AGENT",
    "expiresAt": "...",
    "inviteLink": "http://localhost:5173/accept-invite?token=..."
  }
}
```

### Get Invite Info (public)

```powershell
curl http://localhost:4000/api/users/invite/{token}
```

### Accept Invite

```powershell
curl -X POST http://localhost:4000/api/users/invite/{token}/accept `
  -H "Content-Type: application/json" `
  -d '{"name":"New User","password":"NewPass1"}'
```

### List Users (OWNER/ADMIN/MANAGER)

```powershell
curl "http://localhost:4000/api/users?page=1&pageSize=20" -b cookies.txt
```

**Response** (200):
```json
{
  "success": true,
  "data": [
    { "id": "...", "name": "Owner", "email": "owner@test.com", "role": "OWNER", "status": "ACTIVE", ... },
    { "id": "...", "email": "pending@test.com", "role": "AGENT", "status": "PENDING", ... }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 2, "totalPages": 1 }
}
```

### Update User Role/Status (OWNER/ADMIN only)

```powershell
curl -X PATCH http://localhost:4000/api/users/{userId} `
  -H "Content-Type: application/json" `
  -b cookies.txt `
  -d '{"role":"MANAGER","isActive":true}'
```

### Get Current User

```powershell
curl http://localhost:4000/api/users/me -b cookies.txt
```
