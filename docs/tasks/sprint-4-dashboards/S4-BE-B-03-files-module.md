# S4-BE-B-03 — Files module (uploads + library)

> **Updated 2026-05-12:** Verified against `leadpro-realty/src/pages/Files.jsx`. Spec aligns well. Confirmed UI needs:
> - **Storage quota** — UI renders `usage.storageUsed` GB / `usage.storageLimit` GB. Spec has no quota endpoint. **Add `GET /api/files/usage` returning `{ used, limit, unit: "GB" }`.** For MVP, compute `used = SUM(sizeBytes) / 1e9` per company, `limit` hardcoded from plan (e.g. 10 GB for Pro). Mark `// TODO(prod): plan-based`.
> - **Uploader profile** — `data.users.find(x => x.id === f.uploadedBy)` is used (lines 52, 58). `GET /` should include `uploader: { id, name, avatar? }` in each row to avoid the client doing a separate user lookup.
> - **Folder counts on `/folders`** — already in spec, kept.
> - Leadpro UI shows file `type` (pdf/image/excel/doc) — derive from `mimeType` in API response as a small helper or let FE map. Either is fine; document choice.
> - **No preview endpoint** in leadpro UI — only Eye/Download/Trash2 actions and Eye just toasts. FE will use `/download` for both preview (inline images via Content-Type) and download. Spec already covers download; no extra endpoint needed.

**Owner:** BE-B
**Branch:** `be/file/S4-BE-B-03-module`
**Estimated:** 0.5 day
**Blocks:** S4-FE-B-03
**Blocked by:** S0-BE-A-03, S0-BE-A-04

## Goal

Tenant-scoped file library: brochures, agreements, marketing collateral. MVP stores files on local disk under `backend/uploads/<companyId>/...`; swap-in S3 later.

## Schema additions (`backend/prisma/schema.prisma`)

```prisma
model File {
  id          String   @id @default(cuid())
  companyId   String
  uploaderId  String
  folder      String   @default("general")  // simple string folder for MVP, no nested tree
  name        String
  mimeType    String
  sizeBytes   Int
  storageKey  String   // path on disk relative to UPLOAD_ROOT
  leadId      String?  // optional — files attached to a lead
  createdAt   DateTime @default(now())

  uploader    User     @relation(fields: [uploaderId], references: [id])
  @@index([companyId, folder, createdAt])
  @@index([leadId])
}
```

Migration: `files_init`.

## Endpoints under `/api/files`

- `GET /?folder=&search=&leadId=&page=&pageSize=` — list, newest first
- `GET /folders` — `[{ name, count }]` — distinct folders + counts
- `POST /` — `multipart/form-data` (`file`, `folder?`, `leadId?`). Use `multer` (memory or disk storage); enforce 10 MB max for MVP; allow common mime types (PDF, images, docs, sheets).
- `GET /:id/download` — streams the file with `Content-Disposition: attachment; filename="..."`
- `DELETE /:id` — author or OWNER/ADMIN only. Deletes DB row + disk file.

## Config

- `UPLOAD_ROOT` env var, default `./uploads`. Add to `.env.example`.
- Gitignore `backend/uploads/`.
- Validate mime/size in middleware, return `413` on too-large with the limit in the error envelope.

## Acceptance criteria

- [ ] Migration applies
- [ ] Upload → row created, file on disk under `<UPLOAD_ROOT>/<companyId>/...`
- [ ] List + folder counts work
- [ ] Download streams correctly with proper headers
- [ ] Delete removes row AND disk file
- [ ] 13 MB upload returns clean 413
- [ ] AGENT can upload + see/delete only own files; OWNER/ADMIN can delete any
- [ ] curl examples in the PR

## AI prompt template

> I'm on task S4-BE-B-03. Read the tenantPrisma helper from S0-BE-A-03 and error envelope conventions. Add the File model, multer-backed upload, list/download/delete endpoints. Use disk storage scoped per company. Keep mime validation simple — allow-list common types.

## Notes for reviewer

- Don't ship S3 — disk is fine for MVP; mark a `TODO(prod)` where storageKey is built so the swap is mechanical.
- Stream downloads — don't `fs.readFile` into memory.
- Scrub filenames on upload (path traversal). Save under a generated `storageKey`, keep original `name` as a display label.
