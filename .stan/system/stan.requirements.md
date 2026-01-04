# Project Requirements — @karmaniverous/smoz

When updated: 2026-01-04T00:00:00Z

This file is an index for project requirements.

- The full, historical requirements document is preserved verbatim at:
  - `.stan/system/requirements/stan.requirements.full.md`
- New and evolving requirements are captured as addenda under:
  - `.stan/system/requirements/*.md`

Authoritative interpretation

- The “full” document remains authoritative for all pre-existing requirements.
- Addenda are authoritative for their topics and may refine or supersede older statements in the full document where explicitly noted.

Active addenda (authoritative)

- `.stan/system/requirements/context-resolvers.md`
  - Runtime `httpContext` propagation for HTTP handlers
  - Hybrid per-event-type context resolvers (HTTP: per-httpContext; non-HTTP: single resolver)
  - Serverless/OpenAPI route surface parity (context path prefixing + event fragment merge)
  - Runtime httpContext detection by path prefix only
  - Reserved first path segments: `my`, `private`

Notes

- This index exists to keep diagnostics-friendly listings and avoid monolithic edits in a single large file.
- Do not duplicate durable requirements in `.stan/system/stan.project.md` (assistant policy only).
