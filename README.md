# HOUSEKER Backend API

Node.js + Express + MongoDB (Mongoose) backend for the HOUSEKER property-service
platform. Built phase by phase per the developer handoff spec.

## Phase 1 — Foundation (complete)

- **Auth**: admin/team email + password login, JWT access/refresh tokens, refresh
  rotation, logout, self-service change-password, forgot/reset password, `/me`.
- **RBAC**: 9 roles and a module/action permission matrix (`src/constants/roles.js`),
  enforced on the backend via `requirePermission` middleware. Frontend role checks
  are never trusted.
- **Data model**: all 13 collections from spec §9 — User, TeamMember, Service,
  Property, Document, Enquiry, Case, FieldReport, Project, Message, Payment,
  Notification, ActivityLog (+ Counter for human-readable IDs).
- **File storage**: pluggable storage service (local-disk driver) that serves files
  only through short-lived HMAC-signed URLs (`/api/files/:key`).
- **Audit log**: `logActivity()` helper writing to `ActivityLog`; wired into auth events.

## Getting started

```bash
cp .env.example .env      # adjust secrets / Mongo URI
npm install
npm run seed              # creates the Super Admin from SEED_ADMIN_* in .env
npm run dev               # start API on http://localhost:5000
```

Default seeded login: `admin@houseker.com` / `Admin@12345` (change in `.env`).

## Key endpoints (Phase 1)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | liveness |
| POST | `/api/auth/login` | `{ email, password }` → tokens + member |
| POST | `/api/auth/refresh` | `{ refreshToken }` |
| POST | `/api/auth/logout` | auth required |
| GET | `/api/auth/me` | auth required |
| POST | `/api/auth/change-password` | auth required |
| POST | `/api/auth/forgot-password` | returns reset token in dev |
| POST | `/api/auth/reset-password` | `{ token, newPassword }` |
| GET | `/api/session` | auth required — actor + permissions |
| GET | `/api/files/:key?expires=&signature=` | signed file access |

## Layout

```
src/
  config/      env + db connection
  constants/   roles & permission matrix, status enums
  models/      Mongoose schemas (spec §9)
  middleware/  auth, rbac, error handling
  controllers/ auth
  routes/      auth, files, index
  services/    storage (signed URLs), auditLog
  seed/        super admin bootstrap
```
