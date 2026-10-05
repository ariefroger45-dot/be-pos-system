# Roadmap and Gap Analysis

**Project:** POS System Backend
**Last updated:** 2026-10-05

This document maps the feature diagram against the codebase and tracks delivery
status. Product intent is in `PRD.md`, design in `TRD.md`, data model in
`DATABASE.md`.

## 1. Gap Analysis (Diagram vs Code)

| Feature (diagram) | Status | Notes |
|-------------------|--------|-------|
| Login Admin/Cashier | Done | Login, register, and refresh token; JwtModule wired |
| Dashboard POS | Done | `GET /dashboard` |
| Transaksi Penjualan | Done | `SaleModule`: cart, total, payment, atomic stock, receipt payload |
| Cari Produk | Done | `GET /product`, `GET /product/search` |
| Manajemen Produk: Tambah/Edit/Hapus | Done | Product CRUD, guard Admin |
| Kategori Produk | Done | `CategoryModule` CRUD; `Product.category` populated |
| Manajemen Stok: Masuk/Keluar/Riwayat | Done | `StockModule`: `/stock/in`, `/out`, `/history`, `/level` |
| Laporan Harian/Bulanan/Terlaris/Pendapatan | Done | `ReportModule` aggregations |
| Manajemen Pengguna: Admin/Kasir | Done | User CRUD, guard Admin, `outletId`/`isActive` |

## 2. Defects

| ID | Severity | Resolved | Fix |
|----|----------|:--------:|-----|
| BUG-1 | Critical | yes | `JwtModule` registered; `JwtService` injected; secret name unified to `JWT_ACCESS_SECRET` |
| BUG-2 | Critical | yes | Removed throwing stub; logic moved from typo `canActive` to `canActivate` |
| BUG-3 | High | yes | `RegisterDto.password` uses `@IsNotEmpty` |
| BUG-4 | High | yes | Roles aligned to `ADMIN`/`CASHIER` across schema, payload, product |
| BUG-5 | High | yes | Users controller guarded with `JwtAuthGuard` + `RolesGuard` |
| BUG-6 | High | yes | `FilesModule` registered; file routes guarded |
| BUG-7 | Medium | yes | Cache key unified to `all_product_active` |
| BUG-8 | Medium | yes | `getCategories` calls the service; `findAllWithCategory` executes query |
| BUG-9 | Low | yes | Stray `build()` removed; `void bootstrap()` |
| BUG-10 | Medium | yes | Dead `common/guards/auth.guard.ts` deleted; all routes use `JwtAuthGuard` |

Additional fix found during stabilization: `UsersService.findByEmail` ignored the
`+passwordHash` select, so login could never compare passwords. Fixed.

## 3. Status by Phase

### Phase 0 - Stabilize: Done

All defects resolved, secret naming unified, guard coverage applied.

### Phase 1 - Data model and tenancy: Done

- `OutletModule` and collection.
- `outletId` on `User`, `ProductStock`, `StockMovement`, `Sale`, `SaleItem`.
- `CategoryModule` with CRUD; product `category` ref works.
- Product fields `sku`, `cost`, `unit`, `isActive`.
- Stock split into `ProductStock` per outlet.
- `DATABASE.md` notes updated.

### Phase 2 - Sales: Done

- `SaleModule`: cart to transaction, payment methods (cash/QRIS/card/transfer),
  change computation.
- Stock decrement on save; `409` on insufficient stock.
- `StockMovement` of type `SALE` per line item.
- Receipt: payload, PDF (`/receipt.pdf`), and email (`/receipt/email`). Email is
  skipped with a warning when SMTP is not configured.
- Void and refund (`/void`, `/refund`) restore stock and mark the sale status.

### Phase 3 - Stock management: Done

- Stock-in, stock-out, history, current level, filters by product/outlet/type/
  date range.

### Phase 4 - Reports and dashboard: Done

- Daily, monthly, best-sellers, revenue reports; dashboard summary.
- Aggregation pipelines and indexes.

### Phase 5 - Hardening: Done (E2E/CI partial)

- Refresh-token endpoint, rotation, and logout revocation: done.
- Rate limiting on auth (`@nestjs/throttler`): done.
- Sale void/refund: done.
- E2E test and CI: not done.

## 4. Remaining Work

| Item | Notes |
|------|-------|
| E2E test | login -> product -> sale -> assert stock decreased |
| CI | lint, build, test on push |
| Refresh grace window | Rotation invalidates the previous refresh token immediately |
| SMTP configuration | Set `SMTP_*` env to enable receipt email |

## 5. Definition of Done (per phase)

- Code compiles (`npm run build`) and lints clean (`npm run lint`).
- Unit test on the phase's core logic.
- `docs/` updated if the API, data model, or behavior changed.
- Swagger reflects new endpoints.
