# Standard Effort Meta Grid Smoke Result

## Purpose

This document records the manual browser smoke result for the Phase 16-B
Standard Effort Meta coefficient grid compact UI update.

This smoke records only user-observed UI behavior. It does not record
passwords, password hashes, cookies, session secrets, service role keys,
private env values, or DB credentials.

## Scope

Included:

- Standard Effort Meta `기능항목/계수` grid compact layout.
- 1366 x 768 and 1920 x 1080 viewport checks.
- Page-level horizontal scroll check.
- Grid-internal horizontal scroll fallback.
- Left descriptive column readability.
- Solution header and coefficient input alignment.
- WFM column accessibility.
- Coefficient save/restore regression.
- Base effort save regression.
- Permission/read-only regression.

Excluded:

- Standard Effort calculation logic changes.
- Standard Effort Meta save payload changes.
- DB schema changes.
- API changes.
- Auth/permission policy changes.

## Smoke Result

Overall result: `PASS`

| Check | Result | Evidence |
| --- | --- | --- |
| 1366 x 768 viewport | `PASS` | User confirmed the compact grid remained usable on a small desktop viewport. |
| 1920 x 1080 viewport | `PASS` | User confirmed the grid layout looked stable on a large desktop viewport. |
| Page-level horizontal scroll | `PASS` | User confirmed the full page did not create horizontal scroll. |
| Grid-internal horizontal scroll | `PASS` | User confirmed the coefficient grid provided internal horizontal scroll on the smaller viewport. |
| `구분` column readability | `PASS` | User confirmed the column remained readable after width adjustment. |
| `기능항목` column readability | `PASS` | User confirmed item names remained readable. |
| `옵션` column readability | `PASS` | User confirmed option text remained readable. |
| Solution header alignment | `PASS` | User confirmed solution headers are centered over coefficient inputs. |
| Coefficient input alignment | `PASS` | User confirmed coefficient input values are centered. |
| WFM column accessibility | `PASS` | User confirmed WFM column is accessible. |
| Sticky header | `PASS` | User confirmed the header remains sticky. |
| Coefficient edit/save/restore | `PASS` | User confirmed coefficient value edit, save, and restore. |
| Base effort save regression | `PASS` | User confirmed no base effort save regression. |
| Permission/read-only regression | `PASS` | User confirmed permission and read-only policy remained intact. |

## UI Policy Confirmed

- `구분` column is compact but readable.
- `기능항목` and `옵션` columns remain wider than `구분`.
- Solution coefficient columns are compact to improve WFM access.
- Solution headers and coefficient inputs are centered.
- Grid-level overflow is allowed as fallback.
- Page-level horizontal scroll is avoided.

## Regression Notes

- Coefficient save behavior remains unchanged.
- Base effort save behavior remains unchanged.
- Permission/read-only policy remains unchanged.
- Calculation logic remains unchanged.
- Save payload shape remains unchanged.

## Closure

Decision: `PASS`

Phase 16-B compact grid UI is acceptable for representative reporting and
operations management. Keep any further layout changes in a separate UI polish
phase unless a production usability issue appears.
