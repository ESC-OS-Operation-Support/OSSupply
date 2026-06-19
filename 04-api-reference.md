# API Reference

All routes return JSON. Auth is via HTTP-only cookie named `token`.
`[A]` = admin only, `[AS]` = admin or staff, `[auth]` = any authenticated user.

## Auth — `/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /auth/google | none | Redirect to Google OAuth |
| GET | /auth/google/callback | none | Exchange code → set JWT cookie → redirect to FRONTEND_URL/dashboard |
| POST | /auth/logout | none | Clear cookie |
| GET | /auth/me | none | Returns current user or `{ user: null }` |

## Users — `/users`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /users | [A] | List all users. Query: `?role=user\|staff\|admin` |
| GET | /users/:id | [A] or self | Get user by ID |
| PATCH | /users/:id/role | [A] | Update role. Body: `{ role }` |

## Items — `/items`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /items | [auth] | List active items. Query: `?category=` |
| GET | /items/:id | [auth] | Item detail (includes available_quantity and repair_quantity) |
| POST | /items | [AS] | **Create new item type.** Body: `{ name, description?, category?, image_r2_key?, total_quantity }` |
| PATCH | /items/:id | [AS] | Update item metadata. Adjusts available_quantity by delta if total_quantity changes |
| DELETE | /items/:id | [A] | Deactivate item. Blocked if active borrows exist |

### Stock Management — `/items/:id/stock`
All stock routes are [AS] (admin or staff only).

| Method | Path | Body | Description |
|---|---|---|---|
| GET | /items/:id/stock/logs | — | Full audit log of stock changes for this item |
| POST | /items/:id/stock/add | `{ quantity, note? }` | **Restock** — new units arrived. Increases total_quantity and available_quantity |
| POST | /items/:id/stock/remove | `{ quantity, note? }` | **Remove** — units disposed or lost. Blocked if quantity > available |
| POST | /items/:id/stock/repair | `{ quantity, note }` | **Send to repair** — units broken. note is required. Blocked if quantity > available |
| POST | /items/:id/stock/restore | `{ quantity, note? }` | **Restore from repair** — units fixed. Blocked if quantity > repair_quantity |

**Note on "add new item" vs "restock":**
- `POST /items` — creates a brand new item type (e.g. "Projector") that didn't exist before
- `POST /items/:id/stock/add` — adds more units of an item that already exists (e.g. bought 5 more chairs)

## Projects — `/projects`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /projects | [auth] | List projects. User sees own only; admin/staff see all |
| GET | /projects/:id | [auth] | Project detail + members array |
| POST | /projects | [auth] | Create project. Body: `{ name, description?, purpose, start_date, end_date }`. Owner auto-added as leader |
| PATCH | /projects/:id | owner or [A] | Update project |
| DELETE | /projects/:id | owner or [A] | Delete project. Blocked if any borrow requests exist |
| POST | /projects/:id/members | owner or [A] | Add member. Body: `{ user_id, role? }` |
| DELETE | /projects/:id/members/:userId | owner or [A] | Remove member. Owner cannot be removed |

## Borrow Requests — `/requests`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /requests | [auth] | List requests. User: own only. Query: `?status=` |
| GET | /requests/:id | [auth] | Request detail + items array |
| POST | /requests | [auth] | Create draft. Body: `{ project_id, requested_pickup_datetime, requested_return_datetime }` |
| POST | /requests/:id/items | [auth] | Add item to draft. Body: `{ item_id, quantity_requested }`. Returns warnings if over stock |
| DELETE | /requests/:id/items/:itemId | [auth] | Remove item from draft |
| POST | /requests/:id/submit | owner | Submit draft → pending. Notifies all admins/staff |
| PATCH | /requests/:id/cancel | owner or [A] | Cancel request (draft/pending/approved only). Restores stock if was approved |
| PATCH | /requests/:id/process | [AS] | Start processing. Body: `{ items[]{item_id, quantity_approved}, confirmed_pickup_datetime?, admin_note? }`. Decrements stock. Admin can optionally change pickup date |
| PATCH | /requests/:id/items/:itemId/tick | [AS] | Toggle `is_prepared` on an item (only in processing status) |
| PATCH | /requests/:id/ready | [AS] | Mark as ready for pickup. Blocked if any approved item is not ticked. Sets 7-day auto-cancel window |
| PATCH | /requests/:id/reject | [AS] | Reject pending request. Body: `{ admin_note }` |
| PATCH | /requests/:id/pickup | user or [AS] | Confirm pickup (ready_for_pickup → in_lend). Both user and admin/staff can trigger |
| GET | /requests/:id/returns | [auth] | List return submissions for this request |
| POST | /requests/:id/returns | owner | Submit return. Body: `{ photo_r2_key, note? }`. Valid from: picked_up, overdue, return_rejected |

## Returns — `/returns`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /returns | [AS] | List all return submissions. Query: `?status=pending\|confirmed\|rejected` |
| GET | /returns/:id | [auth] | Return submission detail + photo_url |
| PATCH | /returns/:id/confirm | [AS] | Confirm return → restores stock + completes request. Notifies user |
| PATCH | /returns/:id/reject | [AS] | Reject return. Body: `{ admin_note }`. Sets request → return_rejected. User must resubmit |

## Upload — `/upload`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /upload/presign | [auth] | Get an R2 key + upload path. Returns `{ r2Key, uploadPath }` |
| PUT | /upload/photo/:key | [auth] | Upload image binary to R2. Max 10 MB. Content-Type must be image/* |
| GET | /upload/photo/:key | [auth] | Serve photo from R2 (proxy) |

## Notifications — `/notifications`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /notifications | [auth] | Paginated inbox. Query: `?page=&limit=`. Returns unread count |
| PATCH | /notifications/:id/read | [auth] | Mark one as read |
| PATCH | /notifications/read-all | [auth] | Mark all as read |

## Standard error responses
```json
{ "error": "message" }
```
Status codes: `400` bad input, `401` not logged in, `403` forbidden, `404` not found, `409` conflict, `500` server error.

## Warnings (not errors)
Some endpoints return a `warnings` array alongside normal data:
- `POST /requests/:id/items` — warns if `quantity_requested > available_quantity`
- `PATCH /requests/:id/approve` — warns if any `quantity_approved > available_quantity`

These are informational. The operation still succeeds.
