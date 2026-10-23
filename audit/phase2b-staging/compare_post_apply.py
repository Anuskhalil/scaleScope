"""Compare supplied post-apply catalogs offline. Never connects to a database."""
import csv, json, hashlib
from collections import Counter
from pathlib import Path
HERE=Path(__file__).resolve().parent
SOURCE=Path(r"D:\Users\AnusD\Downloads")
def read(path):
    with path.open(encoding="utf-8-sig", newline="") as f:
        rows=list(csv.DictReader(f))
    for row in rows:
        for key,value in row.items():
            if key in ("details","execute_privileges","allowed_mime_types") and value not in ("","null"):
                row[key]=json.loads(value)
    return rows
def canonical(row):
    return json.dumps(row,sort_keys=True,ensure_ascii=True)
archive_path=HERE.parent/"phase2b-proposal"/"INVENTORY_RECONCILIATION.json"
archive=json.loads(archive_path.read_text(encoding="utf-8"))
report={"status":"REVIEW_REQUIRED","production_ref":"gqkjvxcyetesvqmjkuus",
        "staging_ref":"sopklyxvzmungxwgboqs","source":"User-supplied labeled snapshots; no independent database connection",
        "queries":[]}
for n in range(1,13):
    p=SOURCE/f"Supabase Snippet Untitled query ({n+11}).csv"
    s=SOURCE/f"staging-after-Q0{n}.csv.csv"
    sr=read(s)
    origin="latest_production_csv"
    if p.exists():
        pr=read(p)
    else:
        origin="older_archived_production_snapshot_NOT_latest"
        pr=archive.get(f"Q{n:02}",{}).get("data",[])
        for row in pr:
            for key,value in row.items():
                if key in ("execute_privileges","allowed_mime_types") and isinstance(value,str) and value not in ("","null"):
                    row[key]=json.loads(value)
    pc,sc=Counter(map(canonical,pr)),Counter(map(canonical,sr))
    delta=lambda a,b:[json.loads(k) for k,v in (a-b).items() for _ in range(v)]
    item={"query":f"Q{n:02}","production_rows":len(pr),"staging_rows":len(sr),
          "production_origin":origin,
          "sources":[{"file":str(f),"sha256":hashlib.sha256(f.read_bytes()).hexdigest()} for f in (p if p.exists() else archive_path,s)],
          "production_only":delta(pc,sc),"staging_only":delta(sc,pc)}
    report["queries"].append(item)
(HERE/"post-apply-catalog-diff.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
for q in report["queries"]:
    print(q["query"],q["production_rows"],q["staging_rows"],"diff",len(q["production_only"]),len(q["staging_only"]))
    for side in ("production_only","staging_only"):
        for r in q[side][:8]:
            d=r.get("details",r)
            print(side,{k:v for k,v in d.items() if k in ("schema","schema_name","name","relation","table","function_name","column_name","relation_name","section","role","type","policyname")})
