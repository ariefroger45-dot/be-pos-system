# Product Requirements Document (PRD)

**Project:** POS System Backend
**Version:** 1.0
**Status:** Draft
**Last updated:** 2026-10-05

## 1. Overview

POS System is a web-based point-of-sale backend for retail outlets. It lets
cashiers process sales and lets administrators manage products, stock, users,
and reports. The system supports multiple outlets under a single deployment.

This document defines **what** the product must do. Technical design lives in
`TRD.md`; data model lives in `DATABASE.md`; delivery phases live in
`ROADMAP.md`.

## 2. Goals

- Record sales transactions reliably, including automatic stock deduction.
- Give admins full control over products, stock, outlets, and users.
- Provide daily, monthly, best-selling-product, and revenue reports.
- Enforce role-based access for Admin and Cashier.
- Support multiple outlets with isolated inventory per outlet.

## 3. Non-Goals (v1)

- No offline mode or local sync.
- No customer-facing loyalty or membership program.
- No supplier purchase-order workflow.
- No accounting, tax filing, or e-invoice integration.
- No multi-currency. Single currency.

## 4. Roles

| Role | Description | Primary capabilities |
|------|-------------|----------------------|
| Admin | Store owner/manager | Manage products, categories, stock, users, outlets; view all reports; process sales |
| Cashier | Front-desk operator | Process sales, view product catalog, view own transactions |

Role is stored on the user record. Authorization is enforced per endpoint.

## 5. Functional Requirements

### 5.1 Authentication (`Auth`)

- **FR-AUTH-1** A user logs in with email and password.
- **FR-AUTH-2** The system returns a short-lived access token and a long-lived
  refresh token on success.
- **FR-AUTH-3** Admin creates Cashier and Admin accounts.
- **FR-AUTH-4** Protected endpoints reject requests without a valid access token.
- **FR-AUTH-5** A client exchanges a valid refresh token for a new access token.
- **FR-AUTH-6** A user may be deactivated; deactivated users cannot log in.

### 5.2 Dashboard (`Dashboard POS`)

- **FR-DASH-1** Dashboard shows today's sales total, transaction count, and
  low-stock product count for the active outlet.
- **FR-DASH-2** Dashboard shows a short recent-transactions list.

### 5.3 Sales Transaction (`Transaksi Penjualan`)

Flow: search product -> add to cart -> compute total -> choose payment method
-> save transaction -> auto-update stock -> print/send receipt.

- **FR-SALE-1** Cashier searches products by name/SKU within the active outlet.
- **FR-SALE-2** Cashier adds products with quantity to a cart.
- **FR-SALE-3** The system computes line totals, subtotal, discount, and grand
  total.
- **FR-SALE-4** Cashier selects a payment method: cash, QRIS, card, or bank
  transfer.
- **FR-SALE-5** For cash payments the system computes change from amount paid.
- **FR-SALE-6** Saving a transaction deducts stock atomically per line item and
  fails the whole transaction if any item is short on stock.
- **FR-SALE-7** The system records a stock movement of type `SALE` per line item.
- **FR-SALE-8** The system generates a receipt (PDF or printable payload) and can
  send it to a customer email.
- **FR-SALE-9** A saved transaction is immutable except for void/refund handled
  in a later phase.

### 5.4 Product Management (`Manajemen Produk`)

- **FR-PROD-1** Admin adds a product with title, SKU, price, cost, unit, and
  optional category and image.
- **FR-PROD-2** Admin edits a product.
- **FR-PROD-3** Admin deletes (soft delete recommended) a product.
- **FR-PROD-4** Admin manages categories (create, edit, delete).
- **FR-PROD-5** Any authenticated user lists and searches products.
- **FR-PROD-6** Product list supports pagination.

### 5.5 Stock Management (`Manajemen Stok`)

- **FR-STOCK-1** Admin records stock-in (received goods) with quantity and note.
- **FR-STOCK-2** Admin records stock-out (damage, loss, adjustment) with reason.
- **FR-STOCK-3** Sales automatically create stock-out movements.
- **FR-STOCK-4** Admin views stock movement history filtered by product, outlet,
  type, and date range.
- **FR-STOCK-5** Current stock per outlet equals the sum of movements.

### 5.6 Reports (`Laporan`)

- **FR-REP-1** Daily report: sales total and count per day.
- **FR-REP-2** Monthly report: sales total and count per month.
- **FR-REP-3** Best-selling products ranked by quantity and revenue.
- **FR-REP-4** Revenue report over a date range, grouped by day/outlet.
- **FR-REP-5** Reports filter by outlet and date range; admin only.

### 5.7 User Management (`Manajemen Pengguna`)

- **FR-USER-1** Admin lists users with pagination.
- **FR-USER-2** Admin creates a user and assigns a role and outlet.
- **FR-USER-3** Admin edits user profile, role, and outlet.
- **FR-USER-4** Admin deletes or deactivates a user.
- **FR-USER-5** Passwords are stored only as bcrypt hashes and never returned by
  the API.

## 6. Outlet Model (Multi-Outlet)

- One deployment serves many outlets.
- Every product stock level, stock movement, sale, and user belongs to an outlet.
- Admin can operate across outlets; Cashier is scoped to one outlet.
- Reports can be aggregated per outlet or across all outlets.

## 7. Key User Flows

### 7.1 Cashier sale

1. Cashier logs in.
2. Cashier searches product.
3. Cashier adds item and quantity to cart.
4. System computes total.
5. Cashier selects payment method and enters amount paid (cash).
6. System saves transaction and deducts stock atomically.
7. System returns transaction id and receipt.

### 7.2 Admin stock-in

1. Admin logs in.
2. Admin selects product and outlet.
3. Admin enters quantity and note.
4. System records `STOCK_IN` movement and increases stock.

## 8. Success Metrics

- Zero stock oversell: no transaction succeeds with insufficient stock.
- Sale save latency under 500 ms at p95 for a 20-line cart.
- Report generation under 2 s for a 1-year range.
- 100% of protected endpoints reject unauthenticated and unauthorized requests.

## 9. Assumptions and Constraints

- Backend is NestJS + MongoDB (Mongoose), served over REST + JSON.
- Clients are out of scope of this repo; the API contract in `TRD.md` and the
  Swagger docs at `/docs` are authoritative.
- Currency and locale are configured per deployment.
