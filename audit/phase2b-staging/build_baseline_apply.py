"""Prepare staging apply from the user-confirmed successful diagnostic script."""
import hashlib
import json
from pathlib import Path
HERE = Path(__file__).resolve().parent
source = HERE / "02_BASELINE_DIAGNOSTIC_STAGING_ONLY.sql"
text = source.read_text(encoding="utf-8")
old = "ROLLBACK;\nVALUES ('BASELINE_REHEARSAL_PASS_ROLLED_BACK');"
assert text.count(old) == 1
text = text.replace("-- Never replace ROLLBACK with COMMIT.",
    "-- APPROVED STAGING BASELINE APPLY: commits empty application schema and bucket configuration.\n"
    "-- Existing legacy RPC risks remain. No real users, files, or production application connections.")
text = text.replace(old, "COMMIT;\nVALUES ('STAGING_BASELINE_APPLIED');")
text = text.replace("Send the full error including DETAIL. Do not commit.",
                    "Transaction failed. Send full DETAIL; do not run individual statements.")
out = HERE / "03_BASELINE_APPLY_STAGING_ONLY.sql"
out.write_text(text, encoding="utf-8")
(HERE / "baseline-apply-manifest.json").write_text(json.dumps({
    "target": "sopklyxvzmungxwgboqs",
    "rehearsal_result": "User reported BASELINE_REHEARSAL_PASS_ROLLED_BACK",
    "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
    "apply_sha256": hashlib.sha256(out.read_bytes()).hexdigest(),
    "executed_on_hosted_database_by_assistant": False,
    "behavior": "Single transaction; abort on nonempty public schema or failed check. Not idempotent.",
    "security": "Legacy grants preserved for baseline parity, not production-safe hardening."
}, indent=2)+"\n", encoding="utf-8")
print(out)
