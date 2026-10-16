# Distribution LombokResilience

All commands are PowerShell. Policy: releases happen only through tags and the shared workflow (ADR-011, ADR-020); never publish manually from a local folder.

## 1. First upload (bootstrap)

```powershell
$Org='codinglombok'; $Repo='LombokResilience'
$Desc="Small resilience primitives with explicit time: EWMA latency tracking, circuit breaker, exponential backoff with jitter, and health-aware candidate ranking. Part of the Lombok Ecosystem."
gh repo create "$Org/$Repo" --public --description $Desc --source . --remote origin
gh repo edit "$Org/$Repo" --add-topic lombok-ecosystem --add-topic level-l0
git add -A ; git commit -m "feat: $Repo v0.1.0" ; git push -u origin main
```

The online repository is the release source. Make sure `git ls-files` does not list `docs/*architecture*` or `docs/*masterplan*`.

## 2. Regular release flow

Commit feat/fix to main, open a release-please PR, merge it, tag `v<semver>`, and the release workflow reads the version from the tag. Prerequisite: ecosystem TD-P0-08 (the `codinglombok/.github` repository with reusable workflows) is done.

## 3. Publishing per registry

| Registry | Name | Manifest | Check before release |
|---|---|---|---|
| npm | `lombokresilience` | `typescript/package.json` | `npm pack --dry-run` |
| PyPI | `lombokresilience` | `python/pyproject.toml` | `python -m build` then `twine check dist/*` |
| Go | `github.com/codinglombok/lombokresilience/go` | `go/go.mod` | `go vet ./...` and `go test ./...`; release by tag `go/v0.1.0` |

Rust, PHP: no ports yet.

## 4. Server/VPS, Docker, shared hosting

Not applicable: a library without a service process.

## 5. Local

```powershell
node --test typescript/test/vectors.test.ts
python -m pytest python/tests
cd go ; go test ./...
```

## 6. Verification

`lombok doctor docs` (not available yet, TD-P0-08). Meanwhile: run both vector runners and check the vector hash in SPEC section 1.
