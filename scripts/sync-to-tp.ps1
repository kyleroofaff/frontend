# One-way sync: this repo (frontend) -> sibling folder tp\client (thp monorepo).
# Run from repo root:  powershell -ExecutionPolicy Bypass -File ./scripts/sync-to-tp.ps1
# Then: cd ..\tp && git add client && git commit -m "sync client from frontend" && git push

$ErrorActionPreference = "Stop"
$src = Join-Path $PSScriptRoot ".." | Resolve-Path
$dest = Join-Path $src "..\tp\client" | Resolve-Path -ErrorAction SilentlyContinue
if (-not $dest) {
  Write-Error "Expected Desktop\tp\client when frontend is Desktop\frontend. Adjust paths in script."
  exit 1
}

Write-Host "Syncing $src -> $dest (excluding node_modules, dist, .git, .cursor)..."
& robocopy $src $dest /MIR /XD node_modules dist .git .cursor /NFL /NDL /NJH /NJS /NP
$code = $LASTEXITCODE
if ($code -ge 8) { exit 1 }
Write-Host "Done. Next: cd ..\tp\client; npm install; npm run build; then commit + push thp repo."
exit 0
