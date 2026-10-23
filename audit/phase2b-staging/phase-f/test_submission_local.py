import ast
import json
import subprocess
import time
import uuid
from concurrency_checks import check_concurrency
from quota_checks import check_quota
from pathlib import Path
HERE=Path(__file__).resolve().parent
B=HERE.parent/'phase-b'
name='scalescope-f-'+uuid.uuid4().hex[:10]
logs=[]
def literal(file,key):
 tree=ast.parse(file.read_text(encoding='utf-8'))
 return next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id==key for t in n.targets))
def run(args,data=None,required=True):
 r=subprocess.run(args,input=data,capture_output=True,text=True,encoding='utf-8',timeout=180)
 logs.append({'command':args,'returncode':r.returncode,'stdout':r.stdout,'stderr':r.stderr})
 if required and r.returncode: raise RuntimeError(r.stderr[-4000:])
 return r
status='FAIL'
concurrency=[]
try:
 run(['docker','run','--rm','-d','--name',name,'--network','none','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17.6','-c','wal_level=logical'])
 for _ in range(60):
  if subprocess.run(['docker','exec',name,'pg_isready','-U','postgres'],capture_output=True).returncode==0: break
  time.sleep(1)
 psql=['docker','exec','-i',name,'psql','-X','-U','postgres','-v','ON_ERROR_STOP=1']
 run(psql,literal(HERE.parent/'test_local_postgres.py','bootstrap'))
 baseline=(HERE.parent/'03_BASELINE_APPLY_STAGING_ONLY.sql').read_text(encoding='utf-8')
 before,payload,after=baseline.split('$commands$')
 run(psql,before+'$commands$'+json.dumps([s for s in json.loads(payload) if not(s.startswith('DO $extension$') and 'supabase_vault' in s)])+'$commands$'+after)
 run(psql,(HERE.parent/'06_UUID_DEFAULT_PARITY_STAGING_ONLY.sql').read_text(encoding='utf-8'))
 run(psql,literal(B/'test_local.py','fixture'))
 run(psql,(B/'202610070001_trust_passport_STAGING.sql').read_text(encoding='utf-8'))
 rehearsal=run(psql,(HERE/'01_SUBMISSION_REHEARSAL_STAGING.sql').read_text(encoding='utf-8'))
 assert 'PHASE_F_SUBMISSION_REHEARSAL_PASS_ROLLED_BACK' in rehearsal.stdout
 assert run(psql+['-At'],"SELECT to_regprocedure('public.submit_passport_claim(uuid,uuid,text,text,uuid[],boolean)') IS NULL;").stdout.strip()=='t'
 run(psql,(HERE/'02_SUBMISSION_APPLY_STAGING.sql').read_text(encoding='utf-8'))
 package=HERE.parent/'release-patch'
 rehearsed=run(psql,(package/'01_REHEARSAL_STAGING_ONLY.sql').read_text(encoding='utf-8'))
 assert 'RELEASE_PATCH_REHEARSAL_PASS_ROLLED_BACK' in rehearsed.stdout
 assert run(psql+['-At'],"SELECT to_regclass('public.evidence_storage_quotas') IS NULL;").stdout.strip()=='t'
 applied=run(psql,(package/'02_APPLY_STAGING_ONLY.sql').read_text(encoding='utf-8'))
 assert 'RELEASE_PATCH_STAGING_APPLIED' in applied.stdout
 assert run(psql+['-At'],(package/'03_VERIFY_READ_ONLY.sql').read_text(encoding='utf-8')).stdout.strip()=='t|t|t|t'
 result=run(psql,(HERE/'submission_smoke.sql').read_text(encoding='utf-8'))
 assert 'PHASE_F_SUBMISSION_LOCAL_PASS_ROLLED_BACK' in result.stdout
 quota_rehearsal=run(psql,(package/'04_QUOTA_REHEARSAL_STAGING_ONLY.sql').read_text(encoding='utf-8'))
 assert 'HOSTED_QUOTA_PASS_ROLLED_BACK' in quota_rehearsal.stdout
 concurrency=check_concurrency(psql,run)
 concurrency+=check_quota(psql,run,HERE)
 status='PASS'
finally:
 run(['docker','stop',name],required=False)
 (HERE/'submission-local-results.json').write_text(json.dumps({'status':status,'target':'Disposable network-disabled PostgreSQL only','concurrency':concurrency,'limitations':['Managed Supabase schemas stubbed; Vault omitted locally','Hosted concurrency and different-request supersession races not covered'],'logs':logs},indent=2)+'\n',encoding='utf-8')
 print(status)
