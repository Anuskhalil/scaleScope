"""Offline CSV/catalog reconciliation only. Never connects to a database."""
import csv
import json
import re
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(r"D:\Users\AnusD\Downloads")
out = {}
for number in range(1, 13):
    suffix = "" if number == 1 else f" ({number - 1})"
    path = SOURCE / f"Supabase Snippet Untitled query{suffix}.csv"
    raw = path.read_bytes()
    with path.open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))
    for row in rows:
        if "details" in row:
            row["details"] = json.loads(row["details"])
    out[f"Q{number:02}"] = {"file": path.name, "rows": len(rows),
                           "sha256": hashlib.sha256(raw).hexdigest(), "data": rows}

relations = {r["details"]["name"]: r["details"] for r in out["Q01"]["data"]
             if r["section"] == "relation" and r["details"]["schema"] == "public"}
functions = {r["function_name"]: r for r in out["Q08"]["data"]
             if r["schema_name"] == "public"}
local_tables, local_functions, comparisons = set(), set(), []
def body(text):
    match = re.search(r"\bAS\s+(\$[\w]*\$)(.*?)\1", text, re.I | re.S)
    if not match:
        return None
    return re.sub(r"\s+", " ", re.sub(r"--[^\n]*", "", match[2])).strip().lower()
for path in sorted(ROOT.glob("*.sql")):
    text = path.read_text(encoding="utf-8-sig")
    tables = re.findall(r"create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(\w+)", text, re.I)
    fnames = re.findall(r"create\s+or\s+replace\s+function\s+public\.(\w+)", text, re.I)
    local_tables.update(tables)
    local_functions.update(fnames)
    comparison = {"file": path.name, "tables": {t: t in relations for t in tables}, "functions": []}
    for name in fnames:
        segment = re.split(r"create\s+or\s+replace\s+function\s+public\." + name + r"\b", text, flags=re.I)[1]
        local_body = body(segment)
        live = functions.get(name)
        comparison["functions"].append({
            "name": name, "live_exists": live is not None,
            "body_whitespace_normalized_equal": bool(live and local_body and local_body == body(live["definition"]))
        })
    comparisons.append(comparison)

# Definition contents omitted from derived report to avoid copying possible
# hard-coded literals; original user-supplied Q08 remains the source evidence.
out["Q08"]["data"] = [{"schema_name": r["schema_name"], "function_name": r["function_name"],
                       "arguments": r["arguments"], "definition": "See original Q08 CSV"}
                      for r in out["Q08"]["data"]]
out["repository_comparison"] = comparisons
out["live_tables_without_local_create_table"] = sorted(set(relations) - local_tables)
out["live_public_functions_without_local_definition"] = sorted(set(functions) - local_functions)
(ROOT / "audit/phase2b-proposal/INVENTORY_RECONCILIATION.json").write_text(
    json.dumps(out, indent=2), encoding="utf-8")
print(json.dumps(comparisons, indent=2))
print("Offline inventory written. No SQL executed.")
