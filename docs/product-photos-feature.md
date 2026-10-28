# Product Photos

## Overview

Users can attach product photos to a fin record to identify purchases later.
The editor shows an optional 商品照片 section below the receipt section.
Product photos do not trigger receipt analysis or change financial fields.

## Design Decisions

1. Each record supports six photos. Each photo must contain data and be 5 MiB or smaller.
2. The server accepts JPEG, PNG, and WebP files. It checks the declared MIME type and file signature.
3. Users must convert HEIC photos before uploading them. The application does not resize or convert images.
4. Photos belong to a record. The first version does not link photos to individual line items.
5. The parent record controls ownership. The photo table does not duplicate the user ID.
6. Each upload receives an independent file. Removing one photo cannot break another record's photo.
7. Photo changes apply only to the selected scheduled occurrence, including during an all-future update.

## Implementation Details

### Editor

`ProductPhotos.tsx` provides multiple selection, thumbnails, pending removal, and a full-size viewer.
The shared `ImageViewer.tsx` uses a native modal dialog for focus management and keyboard access.
Escape closes the viewer without closing the record editor.
The gallery follows the editor's mobile layout and dark mode.
Each thumbnail has a small circular remove icon inset from its top-right border.
The transparent button retains a 44-pixel touch target around the icon.

The editor keeps selected files and removed photo IDs in local form state.
Save commits these changes. Cancel discards them after the unsaved-change warning.
The editor preserves selections when a save fails.
Save and create another resets the gallery with the form.
The editor releases preview object URLs when selections change or the gallery unmounts.

Existing records load photo metadata before users can change or save the gallery.
A failed load shows a retry button and disables saving until the record loads.

### Database

`fin_photos` stores one row per photo.

| Column | Type | Purpose |
| --- | --- | --- |
| `photo_id` | INTEGER PRIMARY KEY | Identifies the photo. |
| `fin_id` | TEXT NOT NULL | References `fin.fin_id` with `ON DELETE CASCADE`. |
| `storage_key` | TEXT NOT NULL UNIQUE | Stores a descriptive filename with a UUID suffix. |
| `original_name` | TEXT | Stores up to 255 characters from the original filename. |
| `mime_type` | TEXT NOT NULL | Stores the validated image MIME type. |
| `size_bytes` | INTEGER NOT NULL | Stores the uploaded file size. |
| `sort_order` | INTEGER NOT NULL | Preserves selection order. |
| `uploaded_at` | TEXT NOT NULL | Stores the upload time in ISO 8601 UTC format. |

The `(fin_id, sort_order, photo_id)` index supports ordered gallery queries.
Database connections explicitly enable SQLite foreign keys.
API responses omit storage keys and filesystem paths.

### API contract

1. `POST /api/fin/create` accepts existing JSON requests and multipart requests.
2. `PATCH /api/fin/update` accepts existing JSON requests and multipart requests.
3. Multipart requests store transaction JSON in `data` and append files under repeated `photos` fields.
4. Update JSON can include `removedPhotoIds: number[]`. Each ID must belong to the selected record.
5. For scheduled updates, `scope` belongs inside transaction JSON, including multipart requests.
6. Create, update, and detail responses include a `photos` array with display metadata.
7. `GET /api/fin-photos/{photoId}` joins the parent record and checks the authenticated user's ownership.

Image responses use `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`.
The server returns 404 for inaccessible photos and missing files.
The server limits create and update request bodies to 40 MiB while reading them.
File validation errors return 400. Requests above the body limit return 413.

### Save and cleanup

The server stages validated image files before it changes the record.
A synchronous SQLite transaction saves record fields, line items, schedules, and photo metadata.
The transaction checks the combined photo count and removed photo IDs before changing the record.
Concurrent requests cannot bypass the six-photo limit.
If staging or the transaction fails, the server removes staged files and preserves the previous record.
Receipt storage retains its existing optional behavior after the record transaction succeeds.

After a successful save, the server deletes files for removed photos.
Record deletion collects photo storage keys before cascade deletion and removes their files after commit.
Scoped scheduled deletion collects photos for all affected occurrences.

Failed file deletion does not reverse a committed save.
Successful saves and deletions retry orphan cleanup for unreferenced files older than 24 hours.
This delay protects files that another request can still be saving.
Cleanup also handles files left by interrupted staging operations.

### Storage and deployment

The storage directory is `uploads/product-photos` beside the configured SQLite database.
The default directory is `db/uploads/product-photos`.
Docker uses `/app/db/uploads/product-photos` in the existing persistent database volume.
The server generates filenames and never uses upload filenames to resolve filesystem paths.

New photos use `{YYYYMMDD}_{merchant}_{amount}_{uuid}.{ext}`.
The date, merchant, and amount follow the receipt filename convention through a shared formatter.
The formatter uses the UTC record date, a sanitized lowercase merchant, and the original amount with two decimal places.
Merchant names contain at most 30 characters. Missing or unsupported merchant names become `unknown`.
For example: `20261027_costco_129.99_550e8400-e29b-41d4-a716-446655440000.jpg`.
The UUID suffix keeps multiple photos and identical uploads independent.
Photo-only updates use the existing record metadata when fields are omitted.
Existing filenames remain stable when users later edit record fields.
The application continues to serve and delete older UUID-only filenames.
This filename change requires no additional SQL migration or file renaming.
The formatter falls back to a UUID-only filename when the date or amount is unavailable.

Run `yarn db:migrate:photos` before using this feature locally.
The command applies `drizzle/0004_add_fin_photos.sql` and creates the upload directory.
The migration is additive and safe to repeat.
Docker runs the same migration before starting Next.js.
The targeted command avoids the repository's incomplete historical Drizzle migration journal.

To apply the SQL patch directly from the server checkout, run:

```bash
sqlite3 /path/to/finance.db < drizzle/0004_add_fin_photos.sql
```

The SQL patch creates the table and index. The application creates the upload directory when it stores a photo.

Backups must include the SQLite database and the complete `uploads` directory.
Restoring only SQLite does not restore photo files.

### Verification

Run `yarn test:photos` to test actual route handlers against an isolated SQLite database.
The tests cover limits, ownership, rollback, concurrent updates, scoped schedules, migration repetition, and file cleanup.
The tests do not change the development database.

## Known Limitations / Future Work

1. The first version does not support HEIC, captions, manual reordering, or links to individual line items.
2. The browser loads original images. A future version can generate smaller thumbnails for larger galleries.
3. Orphan cleanup runs on successful saves and deletions. An idle application does not retry file cleanup.
4. Database transactions cannot include filesystem operations. Process interruptions can leave temporary orphan files until cleanup runs.
