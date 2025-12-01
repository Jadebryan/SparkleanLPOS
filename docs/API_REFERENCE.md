# LaundryPOS REST API Reference

This document captures the REST endpoints exposed by the LaundryPOS backend that powers both the Admin (web) and Staff (mobile) applications. Share it with client engineers or integrators who need to interact programmatically with the platform.

---

## 1. Base Information

| Item | Value |
| --- | --- |
| Base URL (production) | `https://<your-domain>/api` |
| Base URL (local) | `http://localhost:5000/api` (HTTPS available on `5443` when certificates are configured) |
| Media Types | Requests and responses use `application/json` unless stated otherwise. |
| Time zone | All timestamps are stored in UTC and returned as ISO-8601 strings. |

Always include the following headers unless explicitly noted:

```
Content-Type: application/json
Accept: application/json
Authorization: Bearer <JWT token>
```

---

## 2. Authentication & Authorization

LaundryPOS uses stateless JWT bearer tokens and role-based access control (RBAC).

1. **Login** to obtain a token:
   - `POST /api/auth/login`
   - Body: `{ "email": "admin@demo.com", "password": "Secret123" }` *(either email or username is accepted; reCAPTCHA tokens are optionally enforced for admins via env flags)*
   - Response payload:
     ```json
     {
       "success": true,
       "message": "Login successful",
       "data": {
         "id": "6646f0...",
         "email": "admin@demo.com",
         "username": "admin",
         "role": "admin",
         "stationId": "BR-001",
         "token": "<jwt>"
       }
     }
     ```
2. Use `Authorization: Bearer <token>` for every protected request. Tokens expire based on `JWT_EXPIRE` (defaults to 7 days).
3. **Roles & Permissions**
   - Built-in roles: `admin`, `staff`.
   - Fine-grained permissions (e.g., `orders:create`, `customers:read`) are enforced via the RBAC middleware defined in `server/middleware/rbac.js`.
   - Admins can inspect/configure permissions via `/api/rbac`.

### Auth endpoints

| Method | Path | Description | Body |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Create a user account. Intended for bootstrap or admin-only flows. | `{ email, username, password, role? }` |
| `POST` | `/auth/login` | Obtain JWT as detailed above. | `{ email? , username?, password, recaptchaToken? }` |
| `POST` | `/auth/logout` | Invalidate current session (audit only; JWT remains stateless). | none |
| `POST` | `/auth/forgot-password` | Trigger email OTP. | `{ email }` |
| `POST` | `/auth/verify-reset-code` | Validate OTP. | `{ email, code }` |
| `POST` | `/auth/reset-password` | Finish reset using OTP. | `{ email, code, newPassword }` |
| `GET` | `/auth/me` | Return current user profile. | – |
| `PUT` | `/auth/me` | Update profile (`email`, `username`, `location`). | partial object |
| `PUT` | `/auth/change-password` | Change password while logged in. | `{ currentPassword, newPassword }` |
| `POST` | `/auth/send-verification-code` | Send email verification OTP. | – |
| `POST` | `/auth/verify-email-code` | Verify OTP. | `{ code }` |
| `GET` | `/auth/profile/:userId` | Admin fetch of arbitrary user. | – |
| `GET` | `/auth/users` | Admin list of every user. | query: `role`, `status` (see controller for exact filters). |
| `PUT` | `/auth/deactivate/:userId` | Admin deactivate account. | – |
| `PUT` | `/auth/activate/:userId` | Admin reactivate. | – |

**Tip:** Error responses follow a consistent structure:

```json
{
  "success": false,
  "message": "Human readable reason",
  "errors": ["Optional array of validation messages"],
  "data": "Optional contextual payload"
}
```

---

## 3. Platform-wide Conventions

- **Pagination & Filtering**: Most list endpoints accept ad-hoc query params rather than page/limit. The major ones support `search`, `sortBy`, `showArchived`, and resource-specific filters such as `payment`.
- **Soft Deletes / Archiving**: Instead of destructive deletes, resources expose `/archive` and `/unarchive` toggles guarded by dedicated permissions.
- **Station scoping**: Staff accounts are scoped by `stationId`. Controllers enforce that staff only read or mutate data belonging to their station.
- **Audit logging**: Every critical write passes through `auditLogger`. No extra client work is required, but expect additional metadata (user agent, IP) to be recorded server-side.
- **Rate limiting** (see `middleware/rateLimiter.js`):
  - General API: 100 requests / 15 min per IP in production (5K in development).
  - Auth endpoints: 5 requests / 15 min (50 in dev), successful logins do not count toward the limit.
  - Password reset & sensitive: 3 requests / hour in production.
  - Uploads: 20 requests / 15 min in production.
  - `Retry-After` and `RateLimit-*` headers are attached automatically.

---

## 4. Resource Reference

The tables below are organized by logical domain. All paths are relative to `/api`.

### 4.1 Orders

Core data model: `OrderModel` with fields `id`, `date`, `customer`, `customerPhone`, `items[]`, `discountId`, `payment` (`Paid | Unpaid | Partial`), `paid`, `balance`, `pickupDate`, `notes`, `isDraft`, `isArchived`, `stationId`, etc.

| Method | Path | Description | Query / Body | Permissions |
| --- | --- | --- | --- | --- |
| `GET` | `/orders` | List orders. Supports drafts/archive filters. | Query: `search`, `payment`, `showArchived=true|false`, `showDrafts=true|false`. | `orders:read` |
| `GET` | `/orders/:id` | Fetch by human-readable order ID (e.g., `#ORD-2024-001`). | – | `orders:read` |
| `POST` | `/orders` | Create live order (also converts draft). | Body: `{ customer, customerPhone?, items:[{service,quantity,amount,status?,discount?}], discountId?, paid?, pickupDate?, notes?, payment?, draftId?, stationId?, skipCustomerCreation? }`. | `orders:create` |
| `POST` | `/orders/draft` | Save or update draft order. | Same payload as create but maintain `isDraft=true`. | `orders:create` |
| `PUT` | `/orders/:id` | Update order content or payment. | Partial order object. | `orders:update` |
| `PUT` | `/orders/:id/archive` | Archive order. | – | `orders:archive` |
| `PUT` | `/orders/:id/unarchive` | Unarchive. | – | `orders:unarchive` |
| `PUT` | `/orders/:id/mark-completed` | Convert draft to completed order. | Body: `{ paymentStatus?, paid?, notes? }`. | `orders:update` |
| `PUT` | `/orders/:id/schedule-deletion` | Flag draft for auto purge. | Body: `{ scheduledDeleteAt }`. | `orders:update` |
| `DELETE` | `/orders/:id` | Permanent delete (rare). | – | `orders:delete` |
| `POST` | `/orders/:id/send-email` | Email an invoice using configured SMTP. | Body: `{ toEmail?, cc?, subject?, notes? }`. | `orders:read` |
| `POST` | `/orders/:id/lock` | Acquire edit lock (2PL). | Body: `{ expiresInMs? }`. | `orders:update` |
| `DELETE` | `/orders/:id/lock` | Release edit lock. | – | `orders:update` |
| `GET` | `/orders/:id/lock` | Inspect lock owner and expiry. | – | `orders:read` |

**Validation notes**
- At least one `items` entry is required with `service`, `quantity`, and `amount`.
- Discounts are cross-checked for activity windows and max usage.
- Staff are auto-scoped to their station (`stationId`), but admins may pass a target station in body.

### 4.2 Customers

Fields: `name`, `email`, `phone`, `notes`, `totalOrders`, `totalSpent`, `isArchived`, `stationId`.

| Method | Path | Description | Query / Body | Permissions |
| --- | --- | --- | --- | --- |
| `GET` | `/customers` | List customers with search & sorting. | Query: `search`, `sortBy` (`name-asc|name-desc|orders-asc|orders-desc|spent-asc|spent-desc`), `showArchived`. | `customers:read` |
| `GET` | `/customers/:id` | Get single customer. | – | `customers:read` |
| `POST` | `/customers` | Create. | `{ name, phone, email?, notes?, stationId? }`. | `customers:create` |
| `PUT` | `/customers/:id` | Update. | Partial fields. | `customers:update` |
| `PUT` | `/customers/:id/archive` | Archive. | – | `customers:archive` |
| `PUT` | `/customers/:id/unarchive` | Unarchive. | – | `customers:unarchive` |
| `DELETE` | `/customers/:id` | Hard delete (admin). | – | `customers:delete` |

Staff cannot view/update customers outside their assigned station.

### 4.3 Services

Fields: `name`, `category (Washing|Dry Cleaning|Ironing|Special)`, `price`, `unit (item|kg|flat)`, `isActive`, `isPopular`, `isArchived`.

| Method | Path | Description | Body | Permissions |
| --- | --- | --- | --- | --- |
| `GET` | `/services` | List. Supports query `includeArchived=true`. | – | `services:read` |
| `GET` | `/services/:id` | Get service. | – | `services:read` |
| `POST` | `/services` | Create. | `{ name, category, price, unit, description?, isPopular? }` | `services:create` |
| `PUT` | `/services/:id` | Update. | Partial. | `services:update` |
| `PUT` | `/services/:id/archive` | Toggle archive true. | – | `services:archive` |
| `PUT` | `/services/:id/unarchive` | Toggle archive false. | – | `services:unarchive` |

### 4.4 Discounts

Fields: `code`, `name`, `type (percentage|fixed)`, `value`, `maxUsage`, `usageCount`, `isActive`, validity window.

Endpoints mirror the service pattern plus `PUT /discounts/:id/reset-usage` to zero `usageCount`.

### 4.5 Employees

Fields include personal info, role, assigned station, account status. Endpoints:

| Method | Path | Description |
| --- | --- | --- |
| `GET /employees` | list (query: `search`, `role`, `status`, `stationId`). |
| `GET /employees/:id` | details. |
| `GET /employees/:id/performance` | aggregated stats, used in dashboards. |
| `POST /employees` | create; body includes `fullName`, `email`, `phone`, `role`, `stationId`, `salary`, etc. |
| `PUT /employees/:id` | update. |
| `PUT /employees/:id/toggle-account` | enable/disable login. |
| `PUT /employees/:id/archive` / `unarchive` | manage archive state. |

Permissions: `employees:read|create|update|archive|unarchive`.

### 4.6 Expenses

Supports a full approval workflow.

| Method | Path | Notes |
| --- | --- | --- |
| `GET /expenses` | Query params: `search`, `status (pending|approved|rejected)`, `category`, `period`, `showArchived`. |
| `GET /expenses/:id` | Single expense. |
| `POST /expenses` | Create expense request `{ title, amount, category, receiptUrl?, notes? }`. |
| `PUT /expenses/:id` | Update general fields while pending. |
| `PUT /expenses/:id/approve` | Approver-only action (body may include `{ remarks }`). |
| `PUT /expenses/:id/reject` | Provide reason. |
| `PUT /expenses/:id/feedback` | Finance feedback. |
| `PUT /expenses/:id/receipt` | Attach receipt metadata / URL. |
| `PUT /expenses/:id/appeal` | Submit appeal details. |
| `PUT /expenses/:id/archive` / `unarchive` | Archive toggles. |

Permissions: `expenses:*` granular.

### 4.7 Stations

| Method | Path | Description |
| --- | --- | --- |
| `GET /stations/public` | Public branch list, unauthenticated (used by landing page). |
| `GET /stations` | Authenticated list (supports `search`, `status`). |
| `GET /stations/:id` | Details. |
| `POST /stations` | Create branch. |
| `PUT /stations/:id` | Update. |
| `PUT /stations/:id/archive` / `unarchive` | Toggle. |
| `DELETE /stations/:id` | Hard delete (use sparingly). |

### 4.8 Dashboard & Reports

- `GET /dashboard/stats` — Provides aggregated sales, order volume, top services, etc.
- Reports (all `POST /reports/...`) accept a common payload:
  ```json
  {
    "dateRange": { "from": "2024-01-01", "to": "2024-01-31" },
    "stations": ["BR-001"],   // optional filter
    "format": "json|pdf|excel",
    "groupBy": "day|week|month", // when applicable
    "status": "all|pending|paid|completed"
  }
  ```
- Supported endpoints:
  - `/reports/orders`
  - `/reports/revenue`
  - `/reports/customers`
  - `/reports/expenses`
  - `/reports/services`
  - `/reports/employee`
  - `/reports/sales-per-branch`
  - `/reports/cashflow-per-branch`

### 4.9 Notifications

| Method | Path | Description |
| --- | --- | --- |
| `GET /notifications/stream` | **Server-Sent Events** stream. Keep-alive connection pushes notifications. No auth required during development (rate limit skip) but should be behind auth proxy in production. |
| `GET /notifications` | Paginated list of notifications for the current user. |
| `PUT /notifications/:notificationId/read` | Mark single notification as read. |
| `PUT /notifications/read-all` | Bulk mark all as read. |

Payload structure:
```json
{
  "_id": "6650...",
  "type": "system|order|customer",
  "title": "New Order",
  "message": "Order #ORD-2024-105 created",
  "resourceId": "65f3...",
  "read": false,
  "createdAt": "2024-05-24T08:00:00.000Z"
}
```

### 4.10 RBAC & Users

| Method | Path | Description |
| --- | --- | --- |
| `POST /rbac/emergency-recover-admin` | Bootstrap endpoint to restore an admin role (guard with infra-level auth like IP allow list). |
| `GET /rbac/resources` | Returns list of resources/actions manageable via RBAC. |
| `GET /rbac/me` | Returns current user's permissions map. |
| `GET /rbac` | Admin view of all role permission sets. |
| `GET /rbac/:role` | Inspect specific role. |
| `PUT /rbac/:role` | Update permission set. Body: `{ permissions: { resource: { action: true|false } } }`. |
| `PUT /rbac/:role/reset` | Reset role to defaults. |
| `POST /rbac/initialize` | Re-seed default roles/permissions. |

### 4.11 System Settings

Currently exposes inactivity/auto-logout policy:

| Method | Path | Description |
| --- | --- | --- |
| `GET /system-settings/inactivity` | Returns `{ timeoutMinutes, warningMinutes, enforceForRole }`. |
| `PUT /system-settings/inactivity` | Update body: `{ timeoutMinutes, warningMinutes, enabled }`. |

### 4.12 Backups

| Method | Path | Description |
| --- | --- | --- |
| `POST /backups` | Trigger manual backup. Returns metadata plus download link. |
| `GET /backups` | List available backups (name, createdAt, size). |
| `GET /backups/stats` | Summary of total backups and storage used. |
| `POST /backups/:backupName/restore` | Restore environment from backup. |
| `DELETE /backups/:backupName` | Remove backup file. |
| `POST /backups/cleanup` | Run cleanup rules (retention policy). |

### 4.13 Uploads

| Method | Path | Body |
| --- | --- | --- |
| `POST /upload/image` | `{ "image": "data:image/png;base64,...", "fileName?": "optional" }` |
| `POST /upload/images` | `{ "images": ["data:image/png;base64,..."], "baseFileName?": "batch_name" }` |

Response: `{ success: true, url(s): [...] }`.

### 4.14 Audit Logs

| Method | Path | Description |
| --- | --- | --- |
| `GET /audit-logs` | Query params: `search`, `resource`, `action`, `userId`, `dateFrom`, `dateTo`, `page`, `limit`. Returns paginated audit entries with metadata (user, IP, userAgent, payload). |
| `GET /audit-logs/stats` | Aggregated counts per action/resource. |
| `GET /audit-logs/:id` | View one log entry. |

### 4.15 Reports & Notifications (Email/SMS)

- Email: `POST /orders/:id/send-email` uses configured SMTP or Gmail App Password (`emailService`). Configure via `.env` as described inside `server/index.js`.
- SMS test endpoint (for diagnostics only): `GET /test-sms?phone=+63...&message=Hello`.

### 4.16 Support / Feedback

| Method | Path | Description |
| --- | --- | --- |
| `POST /support/feedback` | Send a feature/issue report to the product team. Body: `{ title, description, feedbackType?, reporterEmail?, reporterPhone?, recipientEmail?, recipientPhone?, submittedAt? }`. Returns message ID when email dispatch succeeds. |

### 4.17 Notifications & Lock Utilities

Already covered above for notifications. Lock endpoints live under `/orders/:id/lock`.

### 4.18 System Health

| Method | Path | Description |
| --- | --- | --- |
| `GET /health` | Returns server uptime, memory usage, DB connectivity status, version, environment. Useful for Kubernetes probes. |

---

## 5. Sample Workflows

### 5.1 Create Order from Staff App

1. `POST /auth/login` (staff credentials) → store JWT.
2. `GET /customers?search=Jane` to fetch or check duplicates.
3. `POST /orders/draft` with incomplete data for autosave.
4. `POST /orders/:draftId/lock` to claim editing rights across devices.
5. `PUT /orders/:draftId` or `POST /orders` to finalize. Include `draftId` field to auto-link and mark the draft completed.
6. `DELETE /orders/:draftId/lock` when the modal closes.

### 5.2 Generate Monthly Revenue Report (Admin)

```bash
curl -X POST https://laundrypos.example.com/api/reports/revenue \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "dateRange": { "from": "2024-05-01", "to": "2024-05-31" },
    "stations": ["QC-Main", "Makati"],
    "format": "json",
    "groupBy": "week"
  }'
```

Successful responses wrap the payload inside `{ success: true, data: {...} }`. When `format` is `excel` or `pdf`, the route returns a binary buffer; clients should set `Accept: application/octet-stream` and handle the `Content-Disposition` filename from the response headers.

### 5.3 Submit Feedback

```bash
curl -X POST https://laundrypos.example.com/api/support/feedback \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Thermal printer misalignment",
    "description": "Receipts print off the paper edge for EPSON TM-T82.",
    "feedbackType": "bug",
    "reporterEmail": "ops@store.com",
    "reporterPhone": "+63-900-000-0000"
  }'
```

---

## 6. Error Handling & Troubleshooting

| Status | Meaning | Typical Cause |
| --- | --- | --- |
| `400` | Validation error | Missing required fields (`customer`, `items`, etc.). |
| `401` | Authentication required or token invalid/expired. | Token missing/expired, JWT secret misconfiguration. |
| `403` | Permission denied. | Role lacks `resource:action` pair or staff accessing other stations. |
| `404` | Resource not found. | Wrong `id` or already deleted. |
| `409` | Conflict. | Duplicate customers (phone/email), existing locks, reused discount. |
| `422` | Business rule violation. | Discount window invalid, lock held by another user. |
| `429` | Rate limit exceeded. | Respect `Retry-After`. |
| `500` | Internal server error. | Check server logs (`server/logs`). |

**Debug tips**
- Enable verbose server logs via environment variable `LOG_LEVEL=debug`.
- SSE / long-polling endpoints (`/notifications/stream`) may be blocked by corporate proxies; ensure CORS `allowedOrigins` includes your clients.
- Upload failures usually mean large payloads (`express.json` is capped at 10 MB) or missing Cloudinary credentials.

---

## 7. Configuration Checklist

Before hitting production, confirm:

1. `.env` includes `JWT_SECRET`, DB credentials, `ALLOWED_ORIGINS`, Cloudinary keys, optional Gmail/SMTP credentials, SMS provider tokens, and `RECAPTCHA_*` settings.
2. `ENABLE_AUTO_BACKUP` toggles automated daily backups at 2 AM with cleanup at 3 AM (see `server/index.js`).
3. SSL certificates placed in `server/certs/` and `ENABLE_HTTPS=true` in `.env` when deploying behind HTTPS.
4. RBAC baseline executed once via `POST /api/rbac/initialize`.

---

## 8. Changelog & Maintenance

Keep this file updated whenever backend routes, required fields, or permissions change:

| Date | Change |
| --- | --- |
| 2025-11-26 | Initial comprehensive draft based on `server/routes` and controller logic. |

For questions, contact the backend maintainer listed in `server/README.md` (or refer to repository owner).

---

Happy building! If you notice discrepancies between this document and actual controller behavior, file an issue referencing the route and include reproduction steps.

