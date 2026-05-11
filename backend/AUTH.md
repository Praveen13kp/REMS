# Authentication — better-auth

This project uses [better-auth](https://www.better-auth.com) for authentication. All auth endpoints are mounted at `/api/auth/*`.

## Setup

Ensure your `.env` has the required variables:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/Relms"
BETTER_AUTH_SECRET="<64-char-hex-string>"
BETTER_AUTH_URL="http://localhost:4000"
FRONTEND_URL="http://localhost:5173"
```

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
