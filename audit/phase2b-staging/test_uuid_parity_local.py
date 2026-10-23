"""Actual local PostgreSQL test of the narrow UUID correction; no remote access."""
import csv, hashlib, json, subprocess, time, uuid
from pathlib import Path
HERE=Path(__file__).resolve().parent
SQL=(HERE/"06_UUID_DEFAULT_PARITY_STAGING_ONLY.sql").read_text(encoding="utf-8")
name="scalescope-uuid-test-"+uuid.uuid4().hex[:10]
with Path(r"D:\Users\AnusD\Downloads\production.csv").open(encoding="utf-8-sig",newline="") as f:
    rows=list(csv.DictReader(f))
targets=[r["table_name"] for r in rows if r["qualified_default"]=="gen_random_uuid()"]
assert len(targets)==35 and all(t.replace("_","").isalpha() for t in targets)
logs=[]
def run(args, data=None, required=True):
    r=subprocess.run(args,input=data,capture_output=True,text=True,encoding="utf-8",timeout=120)
    logs.append({"command":args,"exit_code":r.returncode,"stdout":r.stdout,"stderr":r.stderr})
    if required and r.returncode:
        raise RuntimeError(r.stderr)
    return r
base=["docker","exec","-i",name,"psql","-X","-U","postgres","-v","ON_ERROR_STOP=1"]
status="FAIL"
try:
    run(["docker","run","--rm","-d","--name",name,"--network","none",
         "-e","POSTGRES_HOST_AUTH_METHOD=trust","postgres:17.6"])
    for _ in range(60):
        if subprocess.run(["docker","exec",name,"pg_isready","-U","postgres"],capture_output=True).returncode==0:
            break
        time.sleep(1)
    bootstrap='CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions; CREATE EXTENSION "uuid-ossp" WITH SCHEMA extensions;'
    for t in targets:
        bootstrap+=f'CREATE TABLE public."{t}" (id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid()); INSERT INTO public."{t}" DEFAULT VALUES;'
    bootstrap+='CREATE TABLE public.user_auth_tracking(id uuid DEFAULT extensions.uuid_generate_v4());'
    run(base,bootstrap)
    snapshot=" UNION ALL ".join(f"SELECT '{t}' AS tbl,id::text FROM public.\"{t}\"" for t in targets)+" ORDER BY tbl;"
    before=run(base+["-At"],snapshot).stdout
    run(base,SQL)
    assert run(base+["-At"],snapshot).stdout==before
    binding="""SET search_path=pg_catalog; SELECT count(*) FROM pg_attrdef ad JOIN pg_class c ON c.oid=ad.adrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND pg_get_expr(ad.adbin,ad.adrelid)='gen_random_uuid()';"""
    assert run(base+["-At"],binding).stdout.strip().endswith("35")
    rejected=run(base,SQL,required=False)
    assert rejected.returncode!=0 and "Wrong target or already corrected" in rejected.stderr
    assert run(base+["-At"],snapshot).stdout==before
    # Restore extension defaults locally, introduce drift, verify atomic refusal.
    restore="".join(f'ALTER TABLE public."{t}" ALTER COLUMN id SET DEFAULT extensions.gen_random_uuid();' for t in targets)
    run(base,restore+f'ALTER TABLE public."{targets[-1]}" ALTER COLUMN id DROP DEFAULT;')
    refused=run(base,SQL,required=False)
    assert refused.returncode!=0 and "unexpected default" in refused.stderr
    assert run(base+["-At"],binding).stdout.strip().endswith("0")
    assert run(base+["-At"],snapshot).stdout==before
    status="PASS"
finally:
    run(["docker","stop",name],required=False)
    report={"status":status,"sql_sha256":hashlib.sha256(SQL.encode()).hexdigest(),
      "checks":["35 corrected bindings","existing UUID values unchanged","already-corrected baseline refused","unexpected default refused with no partial correction"],
      "limits":["Vanilla PostgreSQL 17.6 with synthetic tables; not hosted Supabase","No production or staging database connection"],
      "logs":logs}
    (HERE/"uuid-parity-local-test-results.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({k:report[k] for k in ("status","checks","limits")},indent=2))
