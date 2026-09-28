# DA content sync (aemdemos/foundation-usta → aman-kumar24-dev/usta-foundation-site)

Mirrors the Document Authoring content of one repo into another, then previews it.

```sh
npm run da:sync                       # backup destination → mirror → bulk preview (aem.page)
npm run da:sync -- --dry-run          # list what would be copied, write nothing
npm run da:sync -- --folders=/en/home/news,/nav.html   # only these paths
npm run da:sync -- --no-preview       # copy only
npm run da:sync -- --source=org/repo --destination=org/repo
```

In AEM Coder, just ask "sync content from aemdemos" — the DA / Admin API credentials are
injected there. Elsewhere, set `DA_TOKEN` (an IMS access token with read on the source and write
on the destination) in the environment — never commit it or paste it into chat.

## Behaviour

- **Mirror, no deletes:** every source file (HTML pages, JSON sheets, PDFs, media) is written to the
  same path in the destination, overwriting it. Files that exist only in the destination are kept.
  Destination edits made since the last sync **are overwritten** — check with `--dry-run` first.
- **Backup first:** every destination file in scope is saved to
  `migration-work/da-sync/backups/<timestamp>/` (git-ignored) before anything is written.
  Restore a file with `curl -X POST -F "data=@<backup file>;type=text/html"
  "https://admin.da.live/source/<org>/<repo>/<path>"`.
- **Preview:** one AEM Admin API bulk preview job for the copied paths
  (`/en/home.html` → `/en/home`, `/index.html` → `/`). Nothing is published to aem.live.
- **Why not DA's copy API:** `POST admin.da.live/copy/...` rejects cross-org copies
  ("Destination must be in the same org as the source"), so the tool does GET + POST per file.
- Page images keep pointing at `content.da.live/aemdemos/foundation-usta/...` (as authored in the
  source); they are not duplicated.

`da-sync.mjs` is dependency-free (fetch/FormData/Blob) so it can be reused in a hosted function.
