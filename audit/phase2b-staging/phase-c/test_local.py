"""Phase C local simulation only; never reads credentials or contacts Supabase."""
import ast
import json
import subprocess
import time
import uuid
import hashlib
from pathlib import Path

HERE=Path(__file__).resolve().parent
B=HERE.parent/'phase-b'
name='scalescope-rpc-c-'+uuid.uuid4().hex[:10]
logs=[]
checks=[]
def literal(file, variable):
    tree=ast.parse(file.read_text(encoding='utf-8'))
    return next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign)
                and any(isinstance(t,ast.Name) and t.id==variable for t in n.targets))
def run(args,data=None,required=True):
    r=subprocess.run(args,input=data,capture_output=True,text=True,encoding='utf-8',timeout=180)
    logs.append({'command':args,'returncode':r.returncode,'stdout':r.stdout,'stderr':r.stderr})
    if required and r.returncode: raise RuntimeError(r.stderr[-6000:])
    return r
bootstrap=literal(HERE.parent/'test_local_postgres.py','bootstrap')+"""
GRANT USAGE ON SCHEMA auth TO authenticated,anon,service_role;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
"""
baseline=(HERE.parent/'03_BASELINE_APPLY_STAGING_ONLY.sql').read_text(encoding='utf-8')
before,payload,after=baseline.split('$commands$')
commands=json.loads(payload)
baseline=before+'$commands$'+json.dumps([s for s in commands if not(s.startswith('DO $extension$') and 'supabase_vault' in s)])+'$commands$'+after
status='FAIL'
try:
    run(['docker','run','--rm','-d','--name',name,'--network','none','-e','POSTGRES_HOST_AUTH_METHOD=trust',
         'postgres:17.6','-c','wal_level=logical'])
    for _ in range(60):
        if subprocess.run(['docker','exec',name,'pg_isready','-U','postgres'],capture_output=True,timeout=10).returncode==0: break
        time.sleep(1)
    else: raise RuntimeError('Local database startup timed out')
    psql=['docker','exec','-i',name,'psql','-X','-U','postgres','-v','ON_ERROR_STOP=1']
    run(psql,bootstrap)
    run(psql,baseline)
    run(psql,(HERE.parent/'06_UUID_DEFAULT_PARITY_STAGING_ONLY.sql').read_text(encoding='utf-8'))
    run(psql,literal(B/'test_local.py','fixture'))
    run(psql,(B/'202610070001_trust_passport_STAGING.sql').read_text(encoding='utf-8'))
    snapshot=literal(B/'test_local.py','snapshot')
    data_before=run(psql+['-At'],snapshot).stdout
    inventory=(HERE/'inventory.sql').read_text(encoding='utf-8')
    run(psql,inventory)
    matrix_query='SELECT jsonb_agg(to_jsonb(r)) FROM ('+inventory.strip().rstrip(';')+') r;'
    matrix_before=json.loads(run(psql+['-At'],matrix_query).stdout)
    funcs="SELECT jsonb_object_agg(p.oid::regprocedure::text,jsonb_build_object('definition',pg_get_functiondef(p.oid),'acl',p.proacl::text)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public';"
    f_before=json.loads(run(psql+['-At'],funcs).stdout)
    rehearsal=run(psql,(HERE/'01_REHEARSAL_ROLLBACK.sql').read_text(encoding='utf-8'))
    assert 'PHASE_C_REHEARSAL_PASS_ROLLED_BACK' in rehearsal.stdout
    assert data_before==run(psql+['-At'],snapshot).stdout
    assert f_before==json.loads(run(psql+['-At'],funcs).stdout)
    checks.append('Rehearsal rollback restored every public function and existing row')
    migration=(HERE/'202610070002_rpc_hardening_STAGING.sql').read_text(encoding='utf-8')
    run(psql,migration)
    assert data_before==run(psql+['-At'],snapshot).stdout
    f_after=json.loads(run(psql+['-At'],funcs).stdout)
    changed=[k for k in f_before if f_before[k]!=f_after[k]]
    assert len(changed)==5,changed
    checks.append({'exact_functions_changed':changed})
    run(psql,inventory)
    matrix_after=json.loads(run(psql+['-At'],matrix_query).stdout)
    (HERE/'rpc-before-after.json').write_text(json.dumps({'source':'Local reconstructed staging baseline; not a live database read',
        'before':matrix_before,'after':matrix_after},indent=2)+'\n',encoding='utf-8')
    run(psql,'BEGIN;\n'+(HERE/'smoke.sql').read_text(encoding='utf-8')+'\nROLLBACK;')
    repeat=run(psql,migration,required=False)
    assert repeat.returncode and 'Already hardened' in repeat.stderr
    checks.append('Anon/browser attacks denied; founder/investor self tracking and service conversation/message SQL pass')
    checks.append('Committed local apply preserves existing rows; repeat refuses')
    status='PASS'
finally:
    run(['docker','stop',name],required=False)
    report={'status':status,'target':'Local network-disabled PostgreSQL 17.6', 'checks':checks,
      'migration_sha256':hashlib.sha256((HERE/'202610070002_rpc_hardening_STAGING.sql').read_bytes()).hexdigest(),
      'limitations':['Auth/Storage stubs, no hosted API/login/session test.',
                     'SQL message write is not an HTTP/socket end-to-end test.',
                     'No hosted execution; no production changes.'], 'logs':logs}
    (HERE/'local-results.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='logs'},indent=2))
