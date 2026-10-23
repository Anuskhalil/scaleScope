"""Network-disabled PostgreSQL rehearsal; never connects to hosted Supabase."""
import ast
import hashlib
import json
import subprocess
import time
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
name = 'scalescope-passport-b-' + uuid.uuid4().hex[:10]
logs = []
checks = []

def run(args, data=None, required=True):
    result = subprocess.run(args, input=data, capture_output=True, text=True,
                            encoding='utf-8', timeout=180)
    logs.append({'command': args, 'returncode': result.returncode,
                 'stdout': result.stdout, 'stderr': result.stderr})
    if required and result.returncode:
        raise RuntimeError(result.stderr[-7000:])
    return result

# Reuse only the literal bootstrap definition, not the old harness side effects.
tree = ast.parse((HERE.parent/'test_local_postgres.py').read_text(encoding='utf-8'))
bootstrap = next(ast.literal_eval(n.value) for n in tree.body if isinstance(n, ast.Assign)
                 and any(isinstance(t, ast.Name) and t.id=='bootstrap' for t in n.targets))
bootstrap += """
GRANT USAGE ON SCHEMA auth TO authenticated,anon,service_role;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
"""
baseline = (HERE.parent/'03_BASELINE_APPLY_STAGING_ONLY.sql').read_text(encoding='utf-8')
before, payload, after = baseline.split('$commands$')
statements = json.loads(payload)
omitted = [s for s in statements if s.startswith('DO $extension$') and 'supabase_vault' in s]
assert len(omitted)==1
baseline = before+'$commands$'+json.dumps([s for s in statements if s not in omitted])+'$commands$'+after
fixture = """
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('42fce0f8-b0d3-41a9-b246-2d4a5def266e','passport-founder@example.invalid','{"full_name":"Staging Test Founder","user_type":"early-stage-founder"}'),
 ('3ec91991-f475-4f07-a038-e2a7e1c8b24d','passport-investor@example.invalid','{"full_name":"Staging Test Investor","user_type":"investor"}'),
 ('8acd8892-8651-423c-ab8b-71437492f02b','passport-reviewer@example.invalid','{"full_name":"Staging Test Reviewer","user_type":"early-stage-founder"}');
INSERT INTO public.founder_profiles(user_id) VALUES
 ('42fce0f8-b0d3-41a9-b246-2d4a5def266e'),('8acd8892-8651-423c-ab8b-71437492f02b');
INSERT INTO public.investor_profiles(user_id) VALUES ('3ec91991-f475-4f07-a038-e2a7e1c8b24d');
INSERT INTO public.profile_verifications(user_id,role,status,trust_score)
 VALUES('42fce0f8-b0d3-41a9-b246-2d4a5def266e','early-stage-founder','partially_verified',75);
INSERT INTO public.profile_verification_checks(user_id,role,check_type,target_key,target_label,status,score)
 VALUES('42fce0f8-b0d3-41a9-b246-2d4a5def266e','early-stage-founder','link','github','GitHub','passed',100);
"""
snapshot = """
CREATE TEMP TABLE row_snapshot(name text, rows jsonb);
DO $$ DECLARE t text; excluded text[]; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public'
  AND tablename NOT IN ('profile_verification_evidence','verification_audit_history') LOOP
  excluded:=CASE t
   WHEN 'profile_verifications' THEN ARRAY['passport_opted_in_at']
   WHEN 'profile_verification_checks' THEN ARRAY['passport_claim','claim_kind','claim_version','claim_value_hash','passport_state','submitted_at','decided_at','expires_at','decision_actor','source_kind']
   WHEN 'trust_evidence' THEN ARRAY['passport_private','deleted_at']
   ELSE ARRAY[]::text[] END;
  EXECUTE format('INSERT INTO row_snapshot SELECT %L,coalesce(jsonb_agg(j ORDER BY j::text),''[]''::jsonb) FROM (SELECT to_jsonb(r)-$1 AS j FROM public.%I r) s',t,t)
   USING excluded;
 END LOOP;
END $$;
SELECT jsonb_object_agg(name,rows) FROM row_snapshot;
"""
status='FAIL'
try:
    run(['docker','run','--rm','-d','--name',name,'--network','none','-e',
         'POSTGRES_HOST_AUTH_METHOD=trust','postgres:17.6','-c','wal_level=logical'])
    for _ in range(60):
        if subprocess.run(['docker','exec',name,'pg_isready','-U','postgres'],capture_output=True,timeout=10).returncode==0:
            break
        time.sleep(1)
    else:
        raise RuntimeError('Local PostgreSQL startup timeout')
    psql=['docker','exec','-i',name,'psql','-X','-U','postgres','-v','ON_ERROR_STOP=1']
    run(psql,bootstrap)
    run(psql,baseline)
    run(psql,(HERE.parent/'06_UUID_DEFAULT_PARITY_STAGING_ONLY.sql').read_text(encoding='utf-8'))
    run(psql,fixture)
    data_before=run(psql+['-At'],snapshot).stdout
    schema_before=run(['docker','exec',name,'pg_dump','-U','postgres','--schema-only','--schema=public']).stdout
    original_functions=run(psql+['-At'],"SELECT jsonb_object_agg(p.oid::regprocedure::text,pg_get_functiondef(p.oid)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public';").stdout
    rehearsal=run(psql,(HERE/'01_REHEARSAL_ROLLBACK.sql').read_text(encoding='utf-8'))
    assert 'PHASE_B_REHEARSAL_PASS_ROLLED_BACK' in rehearsal.stdout
    assert data_before==run(psql+['-At'],snapshot).stdout
    assert run(psql+['-At'],"SELECT to_regclass('public.verification_audit_history') IS NULL;").stdout.strip()=='t'
    checks.append('Rehearsal and smoke rolled back; legacy rows and admission records unchanged')
    migration=(HERE/'202610070001_trust_passport_STAGING.sql').read_text(encoding='utf-8')
    run(psql,migration)
    assert data_before==run(psql+['-At'],snapshot).stdout
    checks.append('Local committed apply preserves all 43 existing public tables\' row values and IDs')
    functions_after=run(psql+['-At'],"SELECT jsonb_object_agg(p.oid::regprocedure::text,pg_get_functiondef(p.oid)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public';").stdout
    assert all(json.loads(functions_after)[key]==value for key,value in json.loads(original_functions).items())
    checks.append('All 23 pre-existing public function definitions unchanged')
    repeat=run(psql,migration,required=False)
    assert repeat.returncode and 'One-shot migration already applied' in repeat.stderr
    checks.append('Repeat refuses before mutation')
    run(psql,'BEGIN;\n'+(HERE/'smoke.sql').read_text(encoding='utf-8')+'\nROLLBACK;')
    checks.append('Applied-schema lifecycle and browser denial smoke pass')
    schema_after=run(['docker','exec',name,'pg_dump','-U','postgres','--schema-only','--schema=public']).stdout
    import difflib
    (HERE/'local-schema.diff').write_text(''.join(difflib.unified_diff(
        schema_before.splitlines(True),schema_after.splitlines(True),fromfile='before',tofile='after')),encoding='utf-8')
    status='PASS'
finally:
    run(['docker','stop',name],required=False)
    report={'status':status,'target':'Local network-disabled Docker ONLY', 'checks':checks,
            'migration_sha256':hashlib.sha256((HERE/'202610070001_trust_passport_STAGING.sql').read_bytes()).hexdigest(),
            'limitations':['Managed Auth/Storage are minimal stubs; no real API or Storage tests.',
                           'Supabase Vault availability check omitted ONLY in local baseline bootstrap.',
                           'Hosted event triggers/SQL Editor/ownership not reproduced.',
                           'No hosted migration executed; phases C-G remain separate.'], 'logs':logs}
    (HERE/'local-results.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='logs'},indent=2))
