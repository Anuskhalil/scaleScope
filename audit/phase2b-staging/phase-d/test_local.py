"""Run Phase D against reconstructed isolated baseline plus applied B/C."""
import ast
import json
import subprocess
import time
import uuid
import hashlib
from pathlib import Path
HERE=Path(__file__).resolve().parent
B=HERE.parent/'phase-b'
C=HERE.parent/'phase-c'
name='scalescope-security-d-'+uuid.uuid4().hex[:10]
logs=[]
def literal(file,key):
 tree=ast.parse(file.read_text(encoding='utf-8'))
 return next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign)
  and any(isinstance(t,ast.Name) and t.id==key for t in n.targets))
def run(args,data=None,required=True):
 r=subprocess.run(args,input=data,capture_output=True,text=True,encoding='utf-8',timeout=180)
 logs.append({'command':args,'returncode':r.returncode,'stdout':r.stdout,'stderr':r.stderr})
 if required and r.returncode: raise RuntimeError(r.stderr[-5000:])
 return r
bootstrap=literal(HERE.parent/'test_local_postgres.py','bootstrap')+"""
GRANT USAGE ON SCHEMA auth TO authenticated,anon,service_role;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
"""
baseline=(HERE.parent/'03_BASELINE_APPLY_STAGING_ONLY.sql').read_text(encoding='utf-8')
before,payload,after=baseline.split('$commands$')
baseline=before+'$commands$'+json.dumps([s for s in json.loads(payload) if not(s.startswith('DO $extension$') and 'supabase_vault' in s)])+'$commands$'+after
status='FAIL'
try:
 run(['docker','run','--rm','-d','--name',name,'--network','none','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17.6','-c','wal_level=logical'])
 for _ in range(60):
  if subprocess.run(['docker','exec',name,'pg_isready','-U','postgres'],capture_output=True,timeout=10).returncode==0: break
  time.sleep(1)
 else: raise RuntimeError('Local database startup timeout')
 psql=['docker','exec','-i',name,'psql','-X','-U','postgres','-v','ON_ERROR_STOP=1']
 run(psql,bootstrap); run(psql,baseline)
 run(psql,(HERE.parent/'06_UUID_DEFAULT_PARITY_STAGING_ONLY.sql').read_text(encoding='utf-8'))
 run(psql,literal(B/'test_local.py','fixture'))
 run(psql,(B/'202610070001_trust_passport_STAGING.sql').read_text(encoding='utf-8'))
 run(psql,(C/'202610070002_rpc_hardening_STAGING.sql').read_text(encoding='utf-8'))
 snapshot=literal(B/'test_local.py','snapshot')
 data_before=run(psql+['-At'],snapshot).stdout
 result=run(psql+['-At'],(HERE/'security.sql').read_text(encoding='utf-8'))
 assert 'PHASE_D_SECURITY_PASS_ROLLED_BACK' in result.stdout
 report_line=next(line for line in result.stdout.splitlines() if line.startswith('{') and '"security_report"' not in line and '"tests"' in line)
 report=json.loads(report_line)
 assert data_before==run(psql+['-At'],snapshot).stdout
 # Repeat demonstrates cleanup and fixture IDs are safe to reuse after rollback.
 run(psql,(HERE/'security.sql').read_text(encoding='utf-8'))
 status='PASS'
finally:
 run(['docker','stop',name],required=False)
 output={'status':status,'target':'Network-disabled local PostgreSQL 17.6 only',
 'sql_sha256':hashlib.sha256((HERE/'security.sql').read_bytes()).hexdigest(),
 'report':locals().get('report'),
 'limitations':['Managed Auth/Storage are local stubs; Vault guard omitted only locally.',
 'JWT signature enforcement/API/Storage are not exercised by SET ROLE SQL tests.',
 'Hosted suite execution remains pending; production untouched.'],'logs':logs}
 (HERE/'local-results.json').write_text(json.dumps(output,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'status':status,'tests':locals().get('report',{}).get('tests'),'limitations':output['limitations']},indent=2))
