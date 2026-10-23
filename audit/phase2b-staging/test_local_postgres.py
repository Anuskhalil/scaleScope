"""Local vanilla PostgreSQL smoke test only. No remote credentials or connections."""
import hashlib
import csv
import sys
import json
import subprocess
import time
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
name = "scalescope-baseline-test-" + uuid.uuid4().hex[:10]
logs = []
def command(args, data=None, required=True):
    result = subprocess.run(args, input=data, capture_output=True, text=True, encoding="utf-8", timeout=180)
    logs.append({"command": args, "exit_code": result.returncode, "stdout": result.stdout, "stderr": result.stderr})
    if required and result.returncode:
        raise RuntimeError(result.stderr[-5000:] or result.stdout[-5000:])
    return result

bootstrap = """
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE SCHEMA storage;
CREATE SCHEMA extensions;
CREATE EXTENSION "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION pg_stat_statements WITH SCHEMA extensions;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT 'authenticated'::text $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb $$;
CREATE TABLE storage.buckets (
 id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
);
CREATE TABLE storage.objects (
 id uuid PRIMARY KEY, bucket_id text, name text, owner uuid, owner_id text, metadata jsonb
);
CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE
 AS $$ SELECT (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
CREATE PUBLICATION supabase_realtime;
"""
events = json.loads(Path(r"D:\CodexHome\attachments\8d29355a-e712-4b90-b2f5-d30af7e58ac4\Pasted text.txt").read_text(encoding="utf-8-sig"))
with Path(r"D:\Users\AnusD\Downloads\staging-dependencies.csv.csv").open(encoding="utf-8-sig", newline="") as stream:
    event_metadata = json.loads(next(csv.DictReader(stream))["baseline_dependencies"])["event_triggers"]
for event in events:
    metadata = next(e for e in event_metadata if e["name"] == event["trigger_name"])
    bootstrap += event["definition"].rstrip().rstrip(";") + ";\n"
    tags = " WHEN TAG IN (" + ", ".join("'" + t.replace("'", "''") + "'" for t in metadata["tags"]) + ")" if metadata["tags"] else ""
    bootstrap += f'CREATE EVENT TRIGGER "{event["trigger_name"]}" ON {metadata["event"]}{tags} EXECUTE FUNCTION extensions."{event["function_name"]}"();\n'
apply_mode = "--apply" in sys.argv
diagnostic = "--diagnostic" in sys.argv or apply_mode
sql_path = HERE / ("03_BASELINE_APPLY_STAGING_ONLY.sql" if apply_mode else "02_BASELINE_DIAGNOSTIC_STAGING_ONLY.sql" if diagnostic else "01_BASELINE_REHEARSAL_STAGING_ONLY.sql")
original = sql_path.read_text(encoding="utf-8")
# Vanilla PostgreSQL does not ship Supabase Vault; skip ONLY its availability guard.
if diagnostic:
    before, payload, after = original.split("$commands$")
    statements = json.loads(payload)
    skipped = [s for s in statements if s.startswith("DO $extension$") and "supabase_vault" in s]
    assert len(skipped) == 1
    original = before + "$commands$" + json.dumps([s for s in statements if s not in skipped]) + "$commands$" + after
lines = original.splitlines()
skipped = [line for line in lines if line.startswith("DO $extension$") and "supabase_vault" in line]
assert len(skipped) == (0 if diagnostic else 1)
sql = "\n".join(line for line in lines if line not in skipped)
status = "FAIL"
try:
    command(["docker","run","--rm","-d","--name",name,"--network","none",
             "-e","POSTGRES_HOST_AUTH_METHOD=trust","postgres:17.6",
             "-c","wal_level=logical"])
    for _ in range(60):
        ready = subprocess.run(["docker","exec",name,"pg_isready","-U","postgres"],capture_output=True,timeout=10)
        if ready.returncode == 0:
            break
        time.sleep(1)
    else:
        raise RuntimeError("Local PostgreSQL did not start")
    base = ["docker","exec","-i",name,"psql","-X","-U","postgres","-v","ON_ERROR_STOP=1"]
    command(base, bootstrap)
    result = command(base, sql)
    assert ("STAGING_BASELINE_APPLIED" if apply_mode else "BASELINE_REHEARSAL_PASS_ROLLED_BACK") in result.stdout
    clean = command(base+["-At"],"SELECT count(*) FROM pg_tables WHERE schemaname='public'; SELECT count(*) FROM storage.buckets;")
    assert clean.stdout.split() == (["43","5"] if apply_mode else ["0","0"]), clean.stdout
    if apply_mode:
        command(base, (HERE/"04_BASELINE_POST_APPLY_READ_ONLY.sql").read_text(encoding="utf-8"))
        repeated = command(base, sql, required=False)
        assert repeated.returncode != 0 and "public schema is not empty" in repeated.stderr
        preserved = command(base+["-At"], "SELECT count(*) FROM pg_tables WHERE schemaname='public'; SELECT count(*) FROM storage.buckets;")
        assert preserved.stdout.split() == ["43","5"]
    status = "PASS"
finally:
    command(["docker","stop",name], required=False)
    report = {
        "status":status,"source_sha256":hashlib.sha256(sql_path.read_bytes()).hexdigest(),
        "environment":"Disposable network-disabled PostgreSQL 17.6 with six supplied event triggers; no ports published",
        "limitations":[
            "Auth and Storage are minimal local stubs, not managed Supabase internals.",
            "Supabase Vault extension guard omitted locally; retained in delivered SQL.",
            "postgres is a local superuser, so hosted ownership permissions are not reproduced.",
            "No hosted SQL Editor query rewriting, API, RLS behavior or provider integration tested."
        ],"logs":logs
    }
    (HERE/("local-postgres-apply-results.json" if apply_mode else "local-postgres-diagnostic-results.json" if diagnostic else "local-postgres-rehearsal-results.json")).write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({k:report[k] for k in ("status","environment","limitations")},indent=2))
