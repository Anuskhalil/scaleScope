"""Build a rollback-only staging baseline from user-exported catalogs. No DB access."""
import csv
import hashlib
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = Path(r"D:\Users\AnusD\Downloads")
def read(path):
    with path.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))
def ident(s):
    return '"' + s.replace('"', '""') + '"'
def lit(s):
    return "'" + str(s).replace("'", "''") + "'"
def obj(schema, name):
    return ident(schema) + "." + ident(name)
def truth(s):
    return s is True or s == "true"
def arr(s):
    if isinstance(s, list):
        return s
    assert s.startswith("{") and s.endswith("}"), s
    return next(csv.reader([s[1:-1]])) if s != "{}" else []

q = {}
sources = []
for n in range(1, 13):
    p = SOURCE / f"Supabase Snippet Untitled query ({n+11}).csv"
    q[n] = read(p)
    for r in q[n]:
        if "details" in r:
            r["details"] = json.loads(r["details"])
    sources.append({"file": p.name, "sha256": hashlib.sha256(p.read_bytes()).hexdigest()})
deps = {}
for env in ("production", "staging"):
    p = SOURCE / f"{env}-dependencies.csv.csv"
    deps[env] = json.loads(read(p)[0]["baseline_dependencies"])
    sources.append({"file": p.name, "sha256": hashlib.sha256(p.read_bytes()).hexdigest()})
prod, stage = deps["production"], deps["staging"]
assert prod["extensions"] == stage["extensions"], "Review extensions before generation"
for key in ("public_sequences", "public_nondefault_collations", "public_inheritance"):
    assert not prod[key], f"Unsupported catalog structure: {key}"
assert all(t["kind"] == "e" for t in prod["public_custom_types"])

tables = [r["details"] for r in q[1] if r["section"] == "relation" and r["details"]["schema"] == "public"]
assert len(tables) == 43 and all(t["kind"] == "r" and t["owner"] == "postgres" for t in tables)
assert all(t["persistence"] == "p" and not t["is_partition"] and not t["options"] for t in prod["public_table_properties"])
assert all(t["replica_identity"] in ("d", "f", "n") for t in prod["public_table_properties"])
functions = [f for f in q[8] if f["schema_name"] == "public"]
metadata = {(f["function_name"], f["identity_arguments"]): f for f in q[7] if f["schema_name"] == "public"}
constraints = [r["details"] for r in q[3] if r["section"] == "constraint" and r["details"]["schema"] == "public"]
indexes = [r["details"] for r in q[3] if r["section"] == "index" and r["details"]["schema"] == "public"]
assert all(c["type"] in ("p", "u", "f", "c") for c in constraints)
assert all(i["valid"] and i["ready"] for i in indexes)
assert not any(r["section"] == "column_acl" and r["details"]["schema"] == "public" for r in q[6])
policies = [r for r in q[4] if r["schemaname"] in ("public", "storage")]
assert len(policies) == len(q[4])
triggers = [r for r in q[9] if r["function_schema"] == "public"]
assert len(functions) == 23 and len(triggers) == 21

sql = [
"-- STAGING BASELINE REHEARSAL ONLY. Never run on production.",
"-- Verify Dashboard URL: /project/sopklyxvzmungxwgboqs/sql/",
"-- This deliberately ends in ROLLBACK. Do not replace it with COMMIT.",
"-- Includes legacy unsafe privileges ONLY inside the uncommitted rehearsal.",
"BEGIN;",
"SET LOCAL search_path = public, extensions, pg_catalog;",
"SET LOCAL lock_timeout = '5s';",
"SET LOCAL statement_timeout = '120s';",
"""DO $preflight$
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Run as postgres in the isolated staging SQL Editor';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f'))
     OR EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                WHERE n.nspname='public')
     OR EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
                WHERE n.nspname='public')
  THEN
    RAISE EXCEPTION 'STOP: public schema is not empty. Wrong target or baseline already applied.';
  END IF;
  IF EXISTS (SELECT 1 FROM storage.buckets)
     OR EXISTS (SELECT 1 FROM pg_policies WHERE schemaname IN ('public','storage')) THEN
    RAISE EXCEPTION 'STOP: staging buckets/policies are not empty';
  END IF;
  IF to_regprocedure('auth.uid()') IS NULL
     OR to_regprocedure('auth.role()') IS NULL
     OR to_regprocedure('extensions.uuid_generate_v4()') IS NULL
     OR to_regclass('auth.users') IS NULL THEN
    RAISE EXCEPTION 'Required managed Auth/extension dependencies are missing';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='auth.users'::regclass
             AND tgname='on_auth_user_created' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Unexpected pre-existing signup trigger';
  END IF;
END
$preflight$;"""
]
def add(s):
    sql.append(s.rstrip().rstrip(";") + ";")
# No managed extension installation is needed: exact versions/schema already match.
for e in prod["extensions"]:
    add("DO $extension$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname="
        +lit(e["name"])+" AND e.extversion="+lit(e["version"])+" AND n.nspname="+lit(e["schema"])
        +") THEN RAISE EXCEPTION 'Extension baseline changed'; END IF; END $extension$")
enums = {}
for r in q[3]:
    if r["section"] == "enum":
        d = r["details"]
        enums.setdefault(d["type"], []).append(d)
for name, values in sorted(enums.items()):
    add(f"CREATE TYPE {obj('public',name)} AS ENUM (" + ", ".join(lit(v["label"]) for v in sorted(values,key=lambda x:x["order"])) + ")")
for table in sorted(tables, key=lambda t:t["name"]):
    name = table["name"]
    cols = sorted((c for c in q[2] if c["schema_name"]=="public" and c["relation_name"]==name),key=lambda c:int(c["ordinal_position"]))
    parts = []
    for c in cols:
        assert not c["identity_kind"] and not c["generated_kind"]
        part = ident(c["column_name"]) + " " + c["data_type"]
        default = c["default_or_generation_expression"]
        if default not in ("", "null"):
            part += " DEFAULT " + default
        if truth(c["not_null"]):
            part += " NOT NULL"
        parts.append(part)
    add(f"CREATE TABLE {obj('public',name)} (\n  " + ",\n  ".join(parts) + "\n)")
    if table["rls"]:
        add(f"ALTER TABLE {obj('public',name)} ENABLE ROW LEVEL SECURITY")
    if table["force_rls"]:
        add(f"ALTER TABLE {obj('public',name)} FORCE ROW LEVEL SECURITY")
# Preserve existing source, including known deferred/broken legacy references.
# Disabling body validation does NOT certify these routines work.
add("SET LOCAL check_function_bodies = false")
for f in functions:
    assert metadata[(f["function_name"],f["arguments"])]["owner"] == "postgres"
    add(f["definition"])
add("SET LOCAL check_function_bodies = true")
for c in sorted(constraints,key=lambda c:(c["type"]=="f",c["table"],c["name"])):
    definition = c["definition"]
    if not c["validated"] and "NOT VALID" not in definition:
        definition += " NOT VALID"
    add(f"ALTER TABLE {obj('public',c['table'])} ADD CONSTRAINT {ident(c['name'])} {definition}")
owned = {c["index"] for c in prod["constraint_indexes"]}
standalone = 0
for i in indexes:
    # pg_get_indexdef emits the index identifier in this fixed prefix.
    m = re.match(r'CREATE (?:UNIQUE )?INDEX ("(?:[^"]|"")*"|[^ ]+) ON ',i["definition"])
    assert m, i["definition"]
    name = m[1]
    if name.startswith('"'):
        name = name[1:-1].replace('""','"')
    if name not in owned:
        add(i["definition"])
        standalone += 1
privileges = {"a":"INSERT","r":"SELECT","w":"UPDATE","d":"DELETE","D":"TRUNCATE",
              "x":"REFERENCES","t":"TRIGGER","m":"MAINTAIN","X":"EXECUTE"}
def grants(target, acl):
    add(f"REVOKE ALL PRIVILEGES ON {target} FROM PUBLIC, anon, authenticated, service_role")
    for entry in acl:
        m = re.fullmatch(r'([a-z_]*|postgres)=([arwdDxtmX*]+)/postgres',entry)
        assert m, "Unexpected ACL; review manually: " + entry
        role, chars = m.groups()
        if role == "postgres":
            continue
        assert role in ("", "anon", "authenticated", "service_role"), role
        recipient = ident(role) if role else "PUBLIC"
        for code, star in re.findall(r'([arwdDxtmX])(\*?)',chars):
            add(f"GRANT {privileges[code]} ON {target} TO {recipient}" + (" WITH GRANT OPTION" if star else ""))
for row in q[6]:
    if row["section"]=="relation_acl" and row["details"]["schema"]=="public":
        d = row["details"]
        assert d["acl"] is not None
        grants("TABLE "+obj("public",d["relation"]),d["acl"])
for f in functions:
    meta = metadata[(f["function_name"],f["arguments"])]
    assert meta["prokind"]=="f"
    grants("FUNCTION "+obj("public",f["function_name"])+"("+f["arguments"]+")",arr(meta["acl"]))
for p in policies:
    roles = ", ".join("PUBLIC" if r=="public" else ident(r) for r in arr(p["roles"]))
    stmt = f"CREATE POLICY {ident(p['policyname'])} ON {obj(p['schemaname'],p['tablename'])} AS {p['permissive']} FOR {p['cmd']} TO {roles}"
    if p["using_expression"] not in ("","null"):
        stmt += " USING ("+p["using_expression"]+")"
    if p["with_check"] not in ("","null"):
        stmt += " WITH CHECK ("+p["with_check"]+")"
    add(stmt)
for t in triggers:
    assert t["table_schema"] in ("public","auth")
    add(t["definition"])
    # CREATE TRIGGER already produces origin-enabled mode. ALTER requires ownership,
    # which the SQL Editor role does not have on managed auth.users.
    if t["enabled_mode"] != "O":
        assert t["table_schema"] == "public", "Managed trigger mode needs separate review"
        mode = {"D":"DISABLE","R":"ENABLE REPLICA","A":"ENABLE ALWAYS"}[t["enabled_mode"]]
        add(f"ALTER TABLE {obj(t['table_schema'],t['table_name'])} {mode} TRIGGER {ident(t['trigger_name'])}")
for e in prod["event_triggers"]:
    if e["function_schema"] == "public":
        assert e["owner"] == "postgres"
        tags = " WHEN TAG IN ("+", ".join(lit(t) for t in e["tags"])+")" if e["tags"] else ""
        add(f"CREATE EVENT TRIGGER {ident(e['name'])} ON {e['event']}{tags} EXECUTE FUNCTION {obj('public',e['function'])}()")
        mode = {"O":"ENABLE","D":"DISABLE","R":"ENABLE REPLICA","A":"ENABLE ALWAYS"}[e["enabled"]]
        add(f"ALTER EVENT TRIGGER {ident(e['name'])} {mode}")
for t in prod["public_table_properties"]:
    if t["replica_identity"] != "d":
        add(f"ALTER TABLE {obj('public',t['table'])} REPLICA IDENTITY "+{"f":"FULL","n":"NOTHING"}[t["replica_identity"]])
# Reproduce application membership only. Never create/replace managed publications.
for p in prod["public_publication_tables"]:
    assert p["pubname"] in {x["name"] for x in stage["publications"]}
    assert p["rowfilter"] is None
    cols = ", ".join(ident(c) for c in p["attnames"])
    add(f"ALTER PUBLICATION {ident(p['pubname'])} ADD TABLE {obj('public',p['tablename'])} ({cols})")
for b in q[10]:
    assert b["public"]=="false"
    size = b["file_size_limit"] if b["file_size_limit"] not in ("","null") else "NULL"
    mime = json.loads(b["allowed_mime_types"]) if b["allowed_mime_types"] not in ("","null") else None
    types = "ARRAY["+ ", ".join(lit(t) for t in mime)+"]::text[]" if mime else "NULL"
    add("INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES ("
        +lit(b["id"])+", "+lit(b["name"])+", false, "+size+", "+types+")")
add("""DO $postflight$
DECLARE v_table record; v_has_rows boolean;
BEGIN
  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r') <> 43 THEN
    RAISE EXCEPTION 'Public table count mismatch';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity) THEN
    RAISE EXCEPTION 'Public table without RLS';
  END IF;
  IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.prokind='f') <> 23 THEN
    RAISE EXCEPTION 'Public function count mismatch';
  END IF;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname IN ('public','storage')) <> 117 THEN
    RAISE EXCEPTION 'Policy count mismatch';
  END IF;
  IF (SELECT count(*) FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid
      JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND NOT t.tgisinternal) <> 21 THEN
    RAISE EXCEPTION 'Application trigger count mismatch';
  END IF;
  IF (SELECT count(*) FROM storage.buckets) <> 5
     OR EXISTS (SELECT 1 FROM storage.buckets WHERE public) THEN
    RAISE EXCEPTION 'Private bucket configuration mismatch';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger
                 WHERE tgrelid='auth.users'::regclass
                   AND tgname='on_auth_user_created'
                   AND tgenabled='O' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Signup trigger missing or not origin-enabled';
  END IF;
  FOR v_table IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I)',v_table.tablename) INTO v_has_rows;
    IF v_has_rows THEN RAISE EXCEPTION 'Unexpected application data'; END IF;
  END LOOP;
END
$postflight$""")
add("ROLLBACK")
add("VALUES ('BASELINE_REHEARSAL_PASS_ROLLED_BACK')")
text = "\n\n".join(sql) + "\n"
assert not re.search(r"(?im)^COMMIT\s*;",text)
out = HERE / "01_BASELINE_REHEARSAL_STAGING_ONLY.sql"
out.write_text(text, encoding="utf-8")
manifest = {
    "status":"PREPARED_NOT_EXECUTED", "target":"sopklyxvzmungxwgboqs",
    "production_version":prod["server_version"],"staging_version":stage["server_version"],
    "sources":sources,"rehearsal_sha256":hashlib.sha256(out.read_bytes()).hexdigest(),
    "counts":{"tables":len(tables),"columns":sum(c["schema_name"]=="public" for c in q[2]),
              "functions":len(functions),"constraints":len(constraints),
              "standalone_indexes":standalone,"policies":len(policies),"triggers":len(triggers)},
    "limits":[
        "Rollback-only SQL; not an applied migration or completed Phase A.",
        "Default ACLs, schema grants and managed platform objects are not overwritten; inspect parity separately.",
        "Known unsafe legacy RPC grants reproduced only inside rollback transaction; no approved persistent baseline yet.",
        "Function body creation is not a functional test; legacy broken references intentionally preserved.",
        "Managed publication supabase_realtime_messages_publication exists only on production; not cloned.",
        "No production records or Storage objects copied. Five bucket config rows only, rolled back.",
        "Dashboard target identity requires manual URL check; SQL preflight independently refuses nonempty public schema."
    ]
}
(HERE/"baseline-preparation-manifest.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"status":manifest["status"],"counts":manifest["counts"],"sql_bytes":len(text.encode()),"file":str(out)},indent=2))
