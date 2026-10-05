# Technical Requirements Document (TRD)

**Project:** POS System Backend
**Version:** 1.0
**Status:** Draft
**Last updated:** 2026-10-05

## 1. Overview

NestJS REST API backed by MongoDB via Mongoose. This document describes the
architecture, module boundaries, authentication, transaction handling, API
contract, and operational concerns. Product intent lives in `PRD.md`.

## 2. Technology Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js 20+ |
| Framework | NestJS 11 |
| Language | TypeScript 5 |
| Database | MongoDB 7 (Mongoose 9) |
| Auth | JWT access + refresh, bcrypt password hashing |
| Validation | class-validator + class-transformer |
| Docs | Swagger (`@nestjs/swagger`) at `/docs` |
| File storage | MongoDB GridFS |
| Receipt | PDFKit (PDF), nodemailer (email) |
| Rate limiting | `@nestjs/throttler` |
| Cache | `@nestjs/cache-manager` (in-memory) |
| Logging | winston via nest-winston |
| Container | Docker + docker-compose |

## 3. Architecture

```
Client
  |
  v
NestJS (REST)
  |-- Global: ValidationPipe, TransformInterceptor, GlobalExceptionFilter
  |-- Global: AuditLogInterceptor
  |-- Guards: JwtAuthGuard, RolesGuard (per controller/route)
  |
  v
Modules -> Services -> Mongoose Models
  |
  v
MongoDB
```

### 3.1 Module boundaries

| Module | Responsibility | Status |
|--------|----------------|--------|
| AuthModule | register, login, refresh | Implemented |
| UsersModule | user CRUD, role and outlet assignment | Implemented, guarded ADMIN |
| ProductModule | product CRUD, search, category populate | Implemented |
| CategoryModule | category CRUD | Implemented |
| OutletModule | outlet CRUD, tenancy context | Implemented |
| SaleModule | cart->transaction, payment, receipt payload | Implemented (no PDF/email) |
| StockModule | stock-in/out, movement history | Implemented |
| ReportModule | daily/monthly/best-seller/revenue | Implemented |
| DashboardModule | aggregate KPIs | Implemented |
| FilesModule | GridFS upload/download/delete | Implemented, guarded |
| AuditLogsModule | request audit trail | Implemented |

### 3.2 Conventions

- One module per domain, each with `*.module.ts`, `*.controller.ts`,
  `*.service.ts`, `schemas/`, `dto/`.
- DTOs validated with class-validator; `ValidationPipe` is global with
  `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.
- Responses wrapped by `TransformInterceptor`:
  `{ success, statusCode, data }`.
- Errors wrapped by `GlovalExceptionFilter`:
  `{ success: false, statusCode, message }`.

## 4. Authentication and Authorization

### 4.1 Token strategy

- **Access token**: short-lived (~1h), signed with `JWT_ACCESS_SECRET`,
  sent as `Authorization: Bearer <token>`.
- **Refresh token**: long-lived (~7d), signed with `JWT_REFRESH_SECRET`,
  exchanged at `POST /auth/refresh` for a new token pair.
- Payload: `{ sub, email, role, outletId }`.
- **Rotation**: the user stores `refreshTokenHash` (bcrypt). Login writes it,
  refresh verifies against it and rotates, logout clears it. A reused or stale
  refresh token is rejected with `401`.
- **Rate limiting**: `ThrottlerGuard` is global (100 req/min); `/auth/*`
  endpoints are limited to 5 req/min.

### 4.2 Guards

- `JwtAuthGuard` verifies the access token and attaches `request.user`.
- `RolesGuard` reads the `@Roles(...)` metadata and compares against
  `request.user.role`.
- Apply guards at controller level; data-scoping (outlet) is service-level.

### 4.3 Role matrix

| Endpoint group | Cashier | Admin |
|----------------|:-------:|:-----:|
| POST /auth/login, /auth/refresh | yes | yes |
| GET /product, GET /product/:id | yes | yes |
| POST/PATCH/DELETE /product, /category | no | yes |
| POST /sale, GET /sale/:id | yes | yes |
| GET /sale (all, by outlet/date) | no | yes |
| /stock write, /stock/history | no | yes |
| /report/* | no | yes |
| /users/* | no | yes |
| /outlet/* | no | yes |

## 5. Data Access and Transactions

- Mongoose models per collection (see `DATABASE.md`).
- **Sale save is transactional.** Use a MongoDB session:
  1. Validate every cart line against current stock.
  2. Insert `Sale` and `SaleItem`s.
  3. Decrement stock with `$inc` guarded by a `stock >= qty` condition.
  4. Insert one `StockMovement` per line item.
  5. Commit. Abort and roll back on any failure.
- Stock oversell is prevented by a conditional update; if `matchedCount` is 0,
  abort with `409 Conflict`.
- Reads for reports use aggregation pipelines with `$match` on `outletId` and
  date range, then `$group`.

## 6. API Contract (target)

Base path `/`. All protected routes require Bearer token. Response envelope as
in section 3.2.

### Auth
| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | /auth/register | public | Create cashier account |
| POST | /auth/login | public | Issue access + refresh tokens |
| POST | /auth/refresh | public | Rotate token pair |
| POST | /auth/logout | auth | Revoke active refresh token |

### Product and Category
| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | /product | auth | List with pagination |
| GET | /product/search | auth | Search by keyword |
| GET | /product/:id | auth | Detail |
| POST | /product | Admin | Create |
| PATCH | /product/:id | Admin | Update |
| DELETE | /product/:id | Admin | Soft delete |
| GET/POST/PATCH/DELETE | /category | Admin | Category CRUD |

### Sale
| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | /sale | auth | Save transaction |
| GET | /sale/:id | auth | Detail |
| GET | /sale | Admin | List by outlet/date |
| GET | /sale/:id/receipt | auth | Printable receipt payload |
| GET | /sale/:id/receipt.pdf | auth | Receipt PDF |
| POST | /sale/:id/receipt/email | auth | Email receipt |
| POST | /sale/:id/void | Admin | Void sale, restore stock |
| POST | /sale/:id/refund | Admin | Refund sale, restore stock |

### Stock
| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | /stock/in | Admin | Record stock-in |
| POST | /stock/out | Admin | Record stock-out |
| GET | /stock/history | Admin | Movement history |
| GET | /stock/level | Admin | Current stock |

### Report and Dashboard
| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | /report/daily | Admin | Daily sales |
| GET | /report/monthly | Admin | Monthly sales |
| GET | /report/best-sellers | Admin | Ranked products |
| GET | /report/revenue | Admin | Revenue over range |
| GET | /dashboard | auth | KPI summary |

## 7. Multi-Outlet Tenancy

- `outletId` is a required field on Product (stock level), StockMovement, Sale,
  and User.
- Requests carry the active `outletId` from the token for Cashier; Admin may
  override via query param.
- Every service query includes `outletId` in its filter. This is the trust
  boundary: never trust a client-supplied `outletId` for a Cashier.

## 8. Validation and Error Handling

- Invalid input -> `400` via global `ValidationPipe`.
- Missing/invalid token -> `401`.
- Insufficient role -> `403`.
- Missing resource -> `404`.
- Stock conflict or duplicate key -> `409`.
- Unhandled -> `500`, message hidden in production.

## 9. Configuration and Environment

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | Mongo connection string (required) |
| `PORT` | HTTP port, default 3000 |
| `JWT_ACCESS_SECRET` | Access token secret |
| `JWT_ACCESS_TOKEN` | Access token secret alias used by current code |
| `JWT_REFRESH_SECRET` | Refresh token secret |

Unify access-secret naming during Phase 1 (see `ROADMAP.md`).

## 10. Non-Functional Requirements

- **Security:** bcrypt hashing, no secret logging, guards on all non-public
  routes, refresh-token rotation on refresh.
- **Performance:** indexes per `DATABASE.md`; cache product catalog with
  invalidation on write.
- **Observability:** audit log per request (method, url, status, latency, user).
- **Reliability:** sale path is atomic; no partial stock updates.
- **Testing:** unit tests for services and one e2e test for the sale flow.

## 11. Testing Strategy

- Unit: stock decrement boundary, role guard, cart total computation.
- E2E: login -> create product -> create sale -> assert stock decreased.
- Command: `npm run test`, `npm run test:e2e`.
