# Faculty Storage — Frontend Brief

> **Note to AI:** Do not choose any colors, fonts, or visual theme. Those will be provided separately. Build with neutral/placeholder styles only.

---

## 1. What This App Is

A web app for Chulalongkorn University faculty staff and students to borrow physical equipment from the faculty storage room. Users log in with their Chula Google account, browse available equipment, attach items to a project, and submit a borrow request. Staff/admins review and prepare the items, then the user picks them up and later submits a photo when returning.

**Login restriction:** Only `@chula.ac.th` and `@student.chula.ac.th` Google accounts can log in.

---

## 2. User Roles

| Role | Who | What they can do |
|------|-----|-----------------|
| `user` | Students / faculty | Browse items, manage own projects, submit/cancel requests, submit returns |
| `staff` | Storage staff | Everything `user` can do + manage inventory (create/edit items, stock actions), view all requests and returns |
| `admin` | Administrators | Everything `staff` can do + approve/reject requests, confirm returns, manage user roles |

**Role is stored in the JWT cookie.** Read it from `GET /auth/me` on app load.

---

## 3. Authentication Flow

- **Login:** Redirect to `GET /auth/google` (no frontend form, pure redirect)
- **Callback:** Backend handles `GET /auth/google/callback`, sets an HTTP-only `token` cookie, then redirects to `{FRONTEND_URL}/dashboard`
- **Error cases:** Backend redirects to `{FRONTEND_URL}/login?error={type}` with these types:
  - `oauth_cancelled`
  - `token_exchange_failed`
  - `profile_fetch_failed`
  - `unauthorized_domain`
- **Current user:** `GET /auth/me` → `{ user: User | null }` (no auth header needed — reads cookie automatically)
- **Logout:** `POST /auth/logout` → clears cookie → redirect to login page

---

## 4. Data Types

### User
```
id: string
email: string
name: string
avatar_url: string | null
role: "user" | "staff" | "admin"
is_active: number           // 1 = active, 0 = deactivated
created_at: string
```

### Item (equipment)
```
id: string
name: string
description: string | null
category: string | null
image_r2_key: string | null   // display via GET /upload/photo/{image_r2_key}
total_quantity: number
available_quantity: number
repair_quantity: number
is_active: number             // 1 = shown, 0 = hidden/deleted
created_at: string
updated_at: string
```

### Project
```
id: string
name: string
description: string | null
purpose: string
start_date: string            // ISO date (YYYY-MM-DD)
end_date: string
owner_id: string
created_at: string
updated_at: string
// When fetched: also includes owner_name: string
```

### ProjectMember
```
id: string
project_id: string
user_id: string
role: "leader" | "member"
joined_at: string
// When fetched: also includes name, email, avatar_url
```

### BorrowRequest
```
id: string
project_id: string
requester_id: string
status: RequestStatus         // see status list below
requested_pickup_datetime: string
confirmed_pickup_datetime: string | null
requested_return_datetime: string
pickup_timeout_at: string | null   // 7 days after ready_for_pickup; auto-cancel if missed
admin_note: string | null
processing_by: string | null
picked_up_confirmed_by: string | null
submitted_at: string | null
processing_started_at: string | null
ready_at: string | null
picked_up_at: string | null
cancelled_at: string | null
completed_at: string | null
created_at: string
updated_at: string
```

### BorrowRequestItem (items inside a request)
```
id: string
borrow_request_id: string
item_id: string
quantity_requested: number
quantity_approved: number | null    // set by admin at processing step
is_prepared: number                 // 0 = not yet ticked by staff, 1 = prepared
created_at: string
updated_at: string
// When fetched with request: also includes item_name, category, available_quantity
```

### ReturnSubmission
```
id: string
borrow_request_id: string
submitted_by: string
photo_r2_key: string
note: string | null
status: "pending" | "confirmed" | "rejected"
admin_note: string | null
submitted_at: string
reviewed_at: string | null
reviewed_by: string | null
// When fetched: also includes submitted_by_name, photo_url (string | null)
```

### Notification
```
id: string
user_id: string
title: string
body: string
type: NotificationType        // see list below
reference_id: string | null   // usually a request ID
is_read: number               // 0 = unread, 1 = read
created_at: string
```

### ItemStockLog
```
id: string
item_id: string
action: "add" | "remove" | "send_to_repair" | "restore_from_repair"
quantity: number
note: string | null
performed_by: string
created_at: string
// When fetched: also includes performed_by_name
```

---

## 5. Request Status Values

| Status | Meaning |
|--------|---------|
| `draft` | User is still adding items |
| `pending` | Submitted, waiting for admin review |
| `processing` | Admin approved and is preparing items |
| `ready_for_pickup` | All items ticked as prepared; user must pick up within 7 days |
| `in_lend` | User has picked up items |
| `overdue` | Return date has passed (was `in_lend`) |
| `returned` | User submitted return photo, pending admin confirmation |
| `completed` | Admin confirmed return; done |
| `rejected` | Admin rejected the pending request |
| `cancelled` | User or system cancelled the request |

**Status flow:**
```
draft → pending → processing → ready_for_pickup → in_lend → returned → completed
                                                          ↘ overdue ↗
```
**Cancellable statuses:** `draft`, `pending`, `processing`, `ready_for_pickup`

---

## 6. Notification Types

| Type | Sent to | Trigger |
|------|---------|---------|
| `new_request` | All admins/staff | User submits a request |
| `request_processing` | Requester | Admin starts processing |
| `request_ready` | Requester | Items ready for pickup |
| `request_rejected` | Requester | Admin rejects request |
| `request_cancelled` | Requester | Request cancelled |
| `pickup_timeout_cancelled` | Requester | Auto-cancelled after 7-day pickup window |
| `return_overdue` | Requester | Return date passed |
| `return_submitted` | All admins/staff | User submits return photo |
| `return_rejected` | Requester | Admin rejected return photo, must resubmit |
| `return_completed` | Requester | Admin confirms return |

---

## 7. Pages & Views

### Public / Unauthenticated
- **`/login`** — Single "Login with Google" button that navigates to `GET /auth/google`. Show error message if `?error=` param is present.

### All Authenticated Users
- **`/dashboard`** — Landing after login. Show user's active requests summary and recent notifications.
- **`/items`** — Browse all active items. Filter by category. Show `available_quantity`. Clicking an item opens item detail.
- **`/items/:id`** — Item detail. Shows name, description, category, image, total/available/repair quantities.
- **`/projects`** — User's projects (or all projects for admin/staff). Create new project button.
- **`/projects/:id`** — Project detail. Show info, date range, member list. Borrow requests linked to this project.
- **`/projects/new`** — Create project form (`name`, `description`, `purpose`, `start_date`, `end_date`).
- **`/projects/:id/edit`** — Edit project form (same fields, only owner or admin).
- **`/requests`** — User's borrow requests (or all for admin/staff). Filter by status. Each row shows status badge.
- **`/requests/new`** — Start a new borrow request. Choose a project, set pickup date, set return date.
- **`/requests/:id`** — Request detail. Shows status, items, quantities, timestamps. Shows available actions based on current status and role (see Section 8).
- **`/notifications`** — Paginated notification inbox. Mark as read. Unread count badge in nav.

### Admin / Staff Only
- **`/admin/items`** — Full item management. Create, edit, deactivate items. Stock management actions.
- **`/admin/items/:id/stock`** — Stock logs for an item + actions: add, remove, send to repair, restore from repair.
- **`/admin/users`** — List all users. Filter by role. Change role of a user.
- **`/admin/returns`** — List all return submissions. Filter by status. Confirm or reject.

---

## 8. Actions Per Status (Request Detail Page)

Show/hide action buttons based on `request.status` and the current user's role.

### User actions (own request)
| Current Status | Action | Endpoint |
|---------------|--------|----------|
| `draft` | Add item | `POST /requests/:id/items` |
| `draft` | Remove item | `DELETE /requests/:id/items/:itemId` |
| `draft` | Submit | `POST /requests/:id/submit` |
| `draft`, `pending`, `processing`, `ready_for_pickup` | Cancel | `PATCH /requests/:id/cancel` |
| `ready_for_pickup` | Confirm pickup | `PATCH /requests/:id/pickup` |
| `in_lend`, `overdue` | Submit return (with photo) | `POST /requests/:id/returns` |

### Admin/Staff actions
| Current Status | Action | Endpoint |
|---------------|--------|----------|
| `pending` | Process (approve items + quantities) | `PATCH /requests/:id/process` |
| `pending` | Reject | `PATCH /requests/:id/reject` |
| `processing` | Tick/untick each item as prepared | `PATCH /requests/:id/items/:itemId/tick` |
| `processing` | Mark ready for pickup | `PATCH /requests/:id/ready` |
| `ready_for_pickup` | Confirm pickup on behalf of user | `PATCH /requests/:id/pickup` |

### Admin/Staff actions on returns (on the return submission, not the request)
| Return Status | Action | Endpoint |
|--------------|--------|----------|
| `pending` | Confirm return | `PATCH /returns/:id/confirm` |
| `pending` | Reject return (user must resubmit) | `PATCH /returns/:id/reject` |

---

## 9. Photo Upload Flow (Return Submission)

Uploading a return photo is a two-step process:

1. `POST /upload/presign` → get `{ r2Key, uploadPath }`
2. `PUT /upload/photo/{r2Key}` with binary image body (`Content-Type: image/*`, max 10 MB)
3. Use the `r2Key` in the return submission body: `POST /requests/:id/returns` with `{ photo_r2_key: r2Key, note?: string }`

To display a photo from a `photo_r2_key`: call `GET /upload/photo/{photo_r2_key}`.

---

## 10. API Reference

All requests use cookie-based auth (automatic). No Authorization header needed.

### Auth
| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/auth/google` | None | — | Redirect |
| GET | `/auth/google/callback` | None | — | Redirect |
| POST | `/auth/logout` | Any | — | `{ success: true }` |
| GET | `/auth/me` | None | — | `{ user: User \| null }` |

### Users (Admin only, except self)
| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/users` | Admin | `?role=` | `{ users: User[] }` |
| GET | `/users/:id` | Admin or self | — | `{ user: User }` |
| PATCH | `/users/:id/role` | Admin | `{ role }` | `{ success: true, role }` |
| PATCH | `/users/:id/status` | Admin | `{ is_active: boolean }` | `{ success: true, is_active }` |

### Items
| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/items` | Any | `?category=` | `{ items: Item[] }` |
| GET | `/items/:id` | Any | — | `{ item: Item }` |
| POST | `/items` | Admin/Staff | `{ name, description?, category?, image_r2_key?, total_quantity }` | `{ item: Item }` |
| PATCH | `/items/:id` | Admin/Staff | `{ name?, description?, category?, image_r2_key?, total_quantity? }` | `{ item: Item }` |
| DELETE | `/items/:id` | Admin | — | `{ success: true }` |
| GET | `/items/:id/stock/logs` | Admin/Staff | — | `{ logs: ItemStockLog[] }` |
| POST | `/items/:id/stock/add` | Admin/Staff | `{ quantity, note? }` | `{ item: Item }` |
| POST | `/items/:id/stock/remove` | Admin/Staff | `{ quantity, note? }` | `{ item: Item }` |
| POST | `/items/:id/stock/repair` | Admin/Staff | `{ quantity, note (required) }` | `{ item: Item }` |
| POST | `/items/:id/stock/restore` | Admin/Staff | `{ quantity, note? }` | `{ item: Item }` |

### Projects
| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/projects` | Any | — | `{ projects: (Project & { owner_name })[] }` |
| GET | `/projects/:id` | Any | — | `{ project, members }` |
| POST | `/projects` | Any | `{ name, description?, purpose, start_date, end_date }` | `{ project: Project }` |
| PATCH | `/projects/:id` | Owner/Admin | `{ name?, description?, purpose?, start_date?, end_date? }` | `{ project: Project }` |
| DELETE | `/projects/:id` | Owner/Admin | — | `{ success: true }` |
| POST | `/projects/:id/members` | Owner/Admin | `{ user_id, role? }` | `{ member }` |
| DELETE | `/projects/:id/members/:userId` | Owner/Admin | — | `{ success: true }` |

### Borrow Requests
| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/requests` | Any | `?status=` | `{ requests: BorrowRequest[] }` |
| GET | `/requests/:id` | Any | — | `{ request, items }` |
| POST | `/requests` | Any | `{ project_id, requested_pickup_datetime, requested_return_datetime }` | `{ request }` |
| POST | `/requests/:id/items` | Any | `{ item_id, quantity_requested }` | `{ request_item, warnings[] }` |
| DELETE | `/requests/:id/items/:itemId` | Any | — | `{ success: true }` |
| POST | `/requests/:id/submit` | Any | — | `{ request }` |
| PATCH | `/requests/:id/cancel` | Any | — | `{ success: true }` |
| PATCH | `/requests/:id/reject` | Admin/Staff | `{ admin_note }` | `{ request }` |
| PATCH | `/requests/:id/process` | Admin/Staff | `{ items: [{ item_id, quantity_approved }], confirmed_pickup_datetime?, admin_note? }` | `{ request, items, warnings[] }` |
| PATCH | `/requests/:id/items/:itemId/tick` | Admin/Staff | — | `{ request_item }` |
| PATCH | `/requests/:id/ready` | Admin/Staff | — | `{ request }` |
| PATCH | `/requests/:id/pickup` | Any | — | `{ request }` |
| GET | `/requests/:id/returns` | Any | — | `{ returns: ReturnSubmission[] }` |
| POST | `/requests/:id/returns` | Any | `{ photo_r2_key, note? }` | `{ return }` |

### Returns
| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/returns` | Admin/Staff | `?status=` | `{ returns }` |
| GET | `/returns/:id` | Owner/Admin/Staff | — | `{ return (with photo_url) }` |
| PATCH | `/returns/:id/confirm` | Admin/Staff | — | `{ return }` |
| PATCH | `/returns/:id/reject` | Admin/Staff | `{ admin_note }` | `{ return }` |

### Notifications
| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/notifications` | Any | `?page=&limit=` | `{ notifications, pagination: { page, limit, total, unread } }` |
| PATCH | `/notifications/:id/read` | Any | — | `{ success: true }` |
| PATCH | `/notifications/read-all` | Any | — | `{ success: true }` |

### Upload
| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/upload/presign` | Any | `?type=item` (Admin/Staff only) | `{ r2Key, uploadPath }` |
| PUT | `/upload/photo/*` | Any | Binary image | `{ r2Key, success: true }` |
| GET | `/upload/photo/*` | Any | — | Binary image |

---

## 11. Business Rules the Frontend Must Enforce

1. **Draft items:** A user can only add/remove items when the request is in `draft` status.
2. **Quantity warning:** When adding an item, if the server returns `warnings[]`, display them (item may still be added).
3. **Pickup window:** Once `ready_for_pickup`, show `pickup_timeout_at` as a deadline countdown. After that date, the system auto-cancels.
4. **Return requires photo:** The return flow must upload a photo first, then submit using the returned `r2Key`.
5. **Process step:** Admin sets `quantity_approved` per item (can be less than requested, can be 0). Admin then ticks each item. Cannot mark ready until all items with `quantity_approved > 0` have `is_prepared = 1`.
6. **Cannot delete project** if it has any borrow requests (backend will reject; show user-friendly message).
7. **Cannot deactivate item** if it is part of an active borrow (backend will reject; show user-friendly message).
8. **Overdue requests:** Users can still submit a return even if `overdue`.
9. **Project date range:** Pickup and return dates must fall within the project's `start_date` → `end_date`. The backend enforces this but the frontend should guide the user.
10. **Role change:** Admin cannot demote themselves (display warning or disable).
11. **Return rejected:** When a return's `status = "rejected"`, the user must submit a new return. Show the `admin_note` explaining why. The borrow request goes back to `in_lend`.
12. **User deactivation:** Admin cannot deactivate their own account. Deactivated users (`is_active = 0`) cannot log in.

---

## 12. AI Build Prompt

Use the prompt below when starting a new AI-assisted frontend build session. Copy it verbatim and append your chosen theme/stack after the `---` line.

---

```
You are building a frontend web app for the "Faculty Storage" borrowing system at Chulalongkorn University.

The backend is a REST API deployed on Cloudflare Workers. All auth is cookie-based (HTTP-only); never send Authorization headers. The backend base URL will be provided via an environment variable (e.g. VITE_API_URL or NEXT_PUBLIC_API_URL).

Read the FRONTEND_BRIEF.md file in this repository for the complete specification. It contains:
- All data types with exact field names
- All API endpoints with request/response shapes
- All request status values and their transitions
- Every page that needs to be built
- Which actions appear on each page for each role
- Business rules the UI must enforce

Do not guess any field names, status strings, or endpoint paths — use only what is documented in FRONTEND_BRIEF.md.

Do not choose any colors, fonts, border radii, or visual theme. Use neutral placeholder styles. The theme will be provided separately.

Start by:
1. Confirming the tech stack (ask if not already specified)
2. Setting up the project scaffold with routing and API client
3. Implementing auth (login page, /auth/me on load, protected routes)
4. Building pages in this order: items list → project list/create → request create/detail → admin panels → notifications

Ask clarifying questions rather than making assumptions.
```

---

*End of brief. Theme and tech stack TBD.*
