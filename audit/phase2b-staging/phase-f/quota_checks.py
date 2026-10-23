import subprocess
from concurrent.futures import ThreadPoolExecutor

def check_quota(psql, run, here):
    assert run(psql+['-At'],"SELECT to_regclass('public.evidence_storage_quotas') IS NOT NULL;").stdout.strip()=='t'
    owner='42fce0f8-b0d3-41a9-b246-2d4a5def266e'
    count=int(run(psql+['-At'],f"SELECT count(*) FROM public.trust_evidence WHERE owner_id='{owner}';").stdout.strip())
    def insert():
        return f"""INSERT INTO public.trust_evidence(owner_id,category,title,claim,object_path,mime_type,byte_size,sha256,passport_private)
        VALUES('{owner}','product','Quota fixture','Synthetic quota test','synthetic/'||gen_random_uuid()::text,'application/pdf',10,repeat('b',64),true);"""
    for _ in range(49-count):
        run(psql,insert())
    def request(_):
        return subprocess.run(psql,input="BEGIN; SET LOCAL ROLE service_role; SET LOCAL statement_timeout='10s'; "+insert()+" SELECT pg_sleep(1); COMMIT;",capture_output=True,text=True,timeout=20)
    with ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(request,[1,2]))
    assert sorted(r.returncode==0 for r in results)==[False,True]
    assert any('Evidence retained-file quota exceeded' in r.stderr for r in results)
    counts=run(psql+['-At'],f"SELECT q.retained_count,(SELECT count(*) FROM public.trust_evidence e WHERE e.owner_id=q.owner_id) FROM public.evidence_storage_quotas q WHERE q.owner_id='{owner}';").stdout.strip()
    assert counts=='50|50',counts
    run(psql,f"UPDATE public.trust_evidence SET deleted_at=clock_timestamp() WHERE owner_id='{owner}' AND deleted_at IS NULL;")
    assert run(psql+['-At'],f"SELECT retained_count FROM public.evidence_storage_quotas WHERE owner_id='{owner}';").stdout.strip()=='50'
    assert run(psql+['-At'],"SELECT has_table_privilege('authenticated','public.evidence_storage_quotas','SELECT') OR has_table_privilege('service_role','public.evidence_storage_quotas','UPDATE');").stdout.strip()=='f'
    return ['concurrent uploads at 49: one succeeds, one denied; counter and rows remain 50','tombstones retain quota','browser reads and service counter writes denied']
