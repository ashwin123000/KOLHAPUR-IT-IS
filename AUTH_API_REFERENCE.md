# 📡 Auth API Quick Reference

**Base URL**: `http://localhost:8000`

---

## 1️⃣ Health Check
Check if the service is running.

```bash
GET /health
```

**Response**:
```json
{
  "status": "ok",
  "service": "AI Hiring OS",
  "version": "2.0.0",
  "environment": "development"
}
```

---

## 2️⃣ Register (Create Account)
Create a new user account.

```bash
POST /auth/register
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe"
}
```

**Request Rules**:
- `email`: Valid email format, must be unique
- `password`: Min 8 characters
- `full_name`: Any string, max 100 chars

**Success Response (201)**:
```json
{
  "message": "Account created successfully",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com",
    "full_name": "John Doe",
    "role": "candidate",
    "is_verified": false,
    "created_at": "2024-04-23T10:30:00Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:

**409 Conflict** — Email already registered:
```json
{
  "detail": "Email already registered"
}
```

**422 Unprocessable Entity** — Invalid data:
```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "password"],
      "msg": "Password must be at least 8 characters"
    }
  ]
}
```

---

## 3️⃣ Login
Login with email and password.

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200)**:
```json
{
  "message": "Login successful",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com",
    "full_name": "John Doe",
    "role": "candidate",
    "is_verified": false,
    "created_at": "2024-04-23T10:30:00Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:

**401 Unauthorized** — Invalid email or password:
```json
{
  "detail": "Invalid email or password"
}
```

**404 Not Found** — Email doesn't exist:
```json
{
  "detail": "User not found"
}
```

---

## 4️⃣ Get Current User Profile
Get the authenticated user's profile.

```bash
GET /auth/me
Authorization: Bearer {access_token}
```

**Headers**:
- `Authorization: Bearer YOUR_ACCESS_TOKEN` (required)

**Success Response (200)**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john@example.com",
  "full_name": "John Doe",
  "role": "candidate",
  "is_verified": false,
  "created_at": "2024-04-23T10:30:00Z"
}
```

**Error Responses**:

**401 Unauthorized** — Token missing or invalid:
```json
{
  "detail": "Invalid authentication credentials"
}
```

**403 Forbidden** — Token expired:
```json
{
  "detail": "Token has expired"
}
```

---

## 5️⃣ Refresh Access Token
Get a new access token using the refresh token.

```bash
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:

**401 Unauthorized** — Invalid or expired refresh token:
```json
{
  "detail": "Invalid or expired refresh token"
}
```

---

## 6️⃣ Logout
Invalidate the refresh token.

```bash
POST /auth/logout
Authorization: Bearer {access_token}
```

**Success Response (204)**:
```
(empty response body)
```

**Error Responses**:

**401 Unauthorized** — Token invalid:
```json
{
  "detail": "Invalid authentication credentials"
}
```

---

## 🧪 Testing Examples (PowerShell)

### Register a User
```powershell
$response = curl -X POST http://localhost:8000/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","password":"SecurePass123!","full_name":"Test User"}'

$json = $response | ConvertFrom-Json
$accessToken = $json.access_token
$refreshToken = $json.refresh_token

Write-Host "✅ Registered: test@example.com"
Write-Host "Access Token: $accessToken"
Write-Host "Refresh Token: $refreshToken"
```

### Login
```powershell
$response = curl -X POST http://localhost:8000/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","password":"SecurePass123!"}'

$json = $response | ConvertFrom-Json
$token = $json.access_token
Write-Host "✅ Logged in successfully"
Write-Host "Token: $token"
```

### Get User Profile
```powershell
$token = "YOUR_ACCESS_TOKEN"

curl -X GET http://localhost:8000/auth/me `
  -H "Authorization: Bearer $token"
```

### Refresh Token
```powershell
$refreshToken = "YOUR_REFRESH_TOKEN"

curl -X POST http://localhost:8000/auth/refresh `
  -H "Content-Type: application/json" `
  -d "{`"refresh_token`":`"$refreshToken`"}"
```

### Logout
```powershell
$token = "YOUR_ACCESS_TOKEN"

curl -X POST http://localhost:8000/auth/logout `
  -H "Authorization: Bearer $token"

Write-Host "✅ Logged out successfully"
```

---

## 🔐 Token Details

### Access Token
- **Lifespan**: 15 minutes
- **Use**: Request headers as `Authorization: Bearer {token}`
- **Purpose**: Authenticate API requests
- **Payload**: `{sub, role, type, exp, iat}`

### Refresh Token
- **Lifespan**: 7 days
- **Use**: POST body to `/auth/refresh` endpoint
- **Purpose**: Obtain new access token
- **Payload**: `{sub, type, exp, iat}`

---

## 👥 User Roles

After login, check the `role` field:

| Role | Default | Permissions |
|------|---------|-------------|
| `candidate` | ✅ Default | Upload resume, apply to jobs, take VM tests, use chatbot |
| `recruiter` | ❌ Admin-only | Post jobs, view applications, run interviews |
| `admin` | ❌ Admin-only | Manage users, view analytics, configure system |

---

## 🛠️ Using with Postman

1. Open Postman
2. Create collection: "AI Hiring OS"
3. Import endpoints:

```json
{
  "info": {
    "name": "AI Hiring OS Auth API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Register",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"email\":\"test@example.com\",\"password\":\"SecurePass123!\",\"full_name\":\"Test User\"}"
        },
        "url": {
          "raw": "http://localhost:8000/auth/register",
          "protocol": "http",
          "host": ["localhost"],
          "port": "8000",
          "path": ["auth", "register"]
        }
      }
    }
  ]
}
```

---

## 🔍 Common Issues

| Issue | Solution |
|-------|----------|
| `"Invalid authentication credentials"` | Token is invalid, expired, or missing |
| `"Email already registered"` | Use a different email address |
| `"Token has expired"` | Use the refresh token to get a new access token |
| `Connection refused` | Backend not running on port 8000 |
| `Invalid JSON` | Check Content-Type header is `application/json` |

---

**Ready to test? Start with Step 2 in PHASE_1_GETTING_STARTED.md** ✅
