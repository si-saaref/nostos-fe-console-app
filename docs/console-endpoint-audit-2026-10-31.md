# Console endpoint contract audit — 2026-10-31

Compared all ten console operations in `notes/Postman/nostos-api.postman_collection.json`
with the current local backend `GET http://localhost:4040/docs-json`, frontend request
hooks, wire mappers, UI consumers, and MSW-backed tests. This is a contract/code audit;
mutating endpoints were exercised with MSW, without creating households or sending invites.

Postman SHA-256: `8e736467908a798812587a53010c5246d0b93142f468603dc391d4849d3d8496`.

All paths below start with `/api/v1/console`. Cookie transport uses `withCredentials`;
the authenticating cookie is `household.sid`. Success payloads use `{ success, data,
message? }`; list pagination is in `meta.pagination`. HTTP error bodies expose
`error.code`, `message`, `status_code`, `timestamp`, `path`, and optional field `details`.

| Operation | Request | Response consumed | Audit result |
|---|---|---|---|
| POST `/auth/signin` | `{ email }` | `data.email` | Matched; confirmation now uses the server-normalized address. |
| GET `/auth/signin/{token}` | Path token, no body | `data.email`; browser receives session cookie | Matched; no automatic token-exchange retry. |
| GET `/auth/me` | No body | `data.id`, `email`, `role` (`OPERATOR`) | Matched. |
| POST `/auth/logout` | No body | Success destroys session; response data is empty | Matched request; fixed failure handling so only 401 also counts as signed out. Other failures preserve local auth and allow retry. |
| POST `/households` | `household_name`, `admin_email`, `admin_first_name`, `admin_last_name`, optional `notes` | `household_id`, `admin_id`, `admin_email`, nullable `invite_sent_at` | Fixed deprecated `admin_name` writer; separate name inputs, validation, and server-field error mapping. |
| GET `/households` | `page`, `limit`, optional `search`, `sort_by`, `sort_order`, optional `status` | `data[]`: `id`, `name`, `status`, `created_at`, nullable `deletion_scheduled_for`, nullable `admin_name`/`admin_email`, `member_count`; `meta.pagination`: `page`, `limit`, `total`, `total_pages` | Matched; request failure is now distinct from an empty register. |
| GET `/households/{id}` | Path id, no body | `data.household`, nullable `admin`, `members[]` | Matched all wire fields and nullability. These responses still use derived display `name`, not split-name fields. |
| POST `/households/{id}/delete` | `{ confirmation: "DELETE" }` | `household_id`, `status`, `deletion_requested_at`, `scheduled_deletion_date` | Matched. |
| POST `/households/{id}/restore` | Path id, no body | `household_id`, `status` | Matched; expired-grace backend errors remain visible. |
| POST `/households/{id}/admin/resend-invite` | Path id, no body | `admin_email`, `new_expiry` | Matched; cooldown and invalid-state errors remain visible. |

List query constraints match: page ≥1, limit 1–100 (UI 25/50/100), sorts
`created_at | name | admin_name | admin_email | member_count`, order `ASC | DESC`,
status `ACTIVE | DELETION_PENDING`. An unfiltered status is omitted.

Create constraints: household name 1–100, email ≤254, each name 1–50, notes ≤1000.
Removed the undocumented ASCII-only household-name restriction; the submission regression
covers `José Family` and a curly-apostrophe, hyphenated admin surname.
The backend retains `admin_name` as a deprecated compatibility alternative. New admins
write both structured names; detail and list display-name contracts are unchanged.

`GET /dashboard/metrics` is absent from both sources. Removed the unsupported hook,
sample figures, and sample-based deletion guidance. Dashboard keeps common tasks and
an unavailable-metrics notice. Tests now assert that it makes no metrics request.

Verification covers request mapping, response mapping, validation errors, null admin and
invite-delivery states, list errors/retry, normalized signin confirmation, and logout
401/429/server/network handling. A live end-to-end mutation test was not performed.
