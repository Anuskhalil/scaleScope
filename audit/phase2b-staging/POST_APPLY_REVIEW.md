# Post-Apply Phase A Review
Status: partial parity confirmed; STOP before Phase B.
Sources: new staging Q01-Q12; archived older production inventory; saved applied SQL.
Latest production CSV files (12)-(23) are no longer present in Downloads.
The earlier comparison recorded Q01-05,Q07,Q09-12 identical between those production exports and the archive.
Q06 and Q08 had differences; do not claim a fresh direct production connection.

## Confirmed
Q03 constraints/indexes/enums, Q04 policies, Q05 effective relation/column grants,
Q09 triggers, Q10 buckets, Q11 history-column discovery, Q12 legacy/dependency metadata
match the archived production snapshot exactly.
All 23 public function definitions match applied baseline statements after CRLF normalization.
All 14 raw function ACL differences are array ordering only; privileges match.
No database mutation was executed during this comparison.

## Differences
Q01: seven production realtime daily partitions are absent in staging (managed objects).
Q02: 49 ordinal positions differ, consistent with rebuilt tables lacking dropped-column slots.
35 defaults deparse as extensions.gen_random_uuid() in staging vs gen_random_uuid() in production.
The builder used public,extensions,pg_catalog search_path: this may bind the extension function instead of the builtin.
Do NOT call this merely formatting. Run 05_UUID_DEFAULT_BINDING_READ_ONLY.sql in both projects to compare under identical search_path.
Q06: observed differences concern managed Storage ACL/schema ACL, Realtime default ACL, and role/membership metadata.
These are not proof of new browser access: Q05 effective grants match, but hosted security testing remains pending.
Q08 managed definitions cannot be certified against deleted latest CSV source; public functions match retained applied SQL.
Q11 matching history columns does not prove migration ledger contents or parity.

## Next
Compare qualified UUID defaults, prepare only necessary staging correction after confirmation.
Do not change production or managed schemas.
Synthetic Auth users and API/RLS/Storage behavioral tests still pending.
No Phase A completion, Phase B approval, public verification badge, or production readiness claimed.
