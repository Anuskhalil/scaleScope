from pathlib import Path
import hashlib
import json
HERE=Path(__file__).resolve().parent
guard="""-- STAGING ONLY: sopklyxvzmungxwgboqs. Confirm Dashboard project before running.
-- Synthetic fixtures are a guard, not cryptographic project identity.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='120s';
DO $guard$
BEGIN
 IF current_user<>'postgres' THEN RAISE EXCEPTION 'Use postgres migration owner'; END IF;
 IF (SELECT count(*) FROM public.profiles)<>3 OR
 (SELECT count(*) FROM public.profiles WHERE
 (id='42fce0f8-b0d3-41a9-b246-2d4a5def266e' AND email='passport-founder@example.invalid' AND user_type='early-stage-founder') OR
 (id='3ec91991-f475-4f07-a038-e2a7e1c8b24d' AND email='passport-investor@example.invalid' AND user_type='investor') OR
 (id='8acd8892-8651-423c-ab8b-71437492f02b' AND email='passport-reviewer@example.invalid' AND user_type='early-stage-founder'))<>3
 THEN RAISE EXCEPTION 'Wrong target: exact three staging fixtures required'; END IF;
 IF to_regprocedure('public.submit_passport_claim(uuid,uuid,text,text,uuid[],boolean)') IS NOT NULL THEN RAISE EXCEPTION 'Already applied: inspect, do not replace blindly'; END IF;
 IF to_regprocedure('public.passport_claim_is_current(uuid)') IS NULL THEN RAISE EXCEPTION 'Phase B missing'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class WHERE oid IN ('public.profile_verifications'::regclass,'public.profile_verification_checks'::regclass,'public.trust_evidence'::regclass,'public.profile_verification_evidence'::regclass,'public.verification_audit_history'::regclass) AND NOT relrowsecurity) THEN RAISE EXCEPTION 'RLS drift'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='trust-evidence' AND NOT public AND file_size_limit=5242880) THEN RAISE EXCEPTION 'Bucket drift'; END IF;
END $guard$;
"""
post="""
DO $post$ BEGIN
 IF has_function_privilege('anon','public.submit_passport_claim(uuid,uuid,text,text,uuid[],boolean)','EXECUTE') OR has_function_privilege('authenticated','public.submit_passport_claim(uuid,uuid,text,text,uuid[],boolean)','EXECUTE') OR NOT has_function_privilege('service_role','public.submit_passport_claim(uuid,uuid,text,text,uuid[],boolean)','EXECUTE') THEN RAISE EXCEPTION 'RPC ACL mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.submit_passport_claim(uuid,uuid,text,text,uuid[],boolean)'::regprocedure AND prosecdef) THEN RAISE EXCEPTION 'RPC must be SECURITY INVOKER'; END IF;
END $post$;
"""
sql=(HERE/'claim_submission.sql').read_text(encoding='utf-8')
smoke=(HERE/'submission_smoke.sql').read_text(encoding='utf-8')
assert smoke.startswith('BEGIN;')
smoke=smoke[len('BEGIN;'):].split('ROLLBACK;')[0]
files={
 '01_SUBMISSION_REHEARSAL_STAGING.sql':guard+sql+post+smoke+"\nROLLBACK;\nSELECT 'PHASE_F_SUBMISSION_REHEARSAL_PASS_ROLLED_BACK';\n",
 '02_SUBMISSION_APPLY_STAGING.sql':guard+sql+post+"\nCOMMIT;\nSELECT 'PHASE_F_SUBMISSION_STAGING_APPLIED';\n",
}
for name,text in files.items(): (HERE/name).write_text(text,encoding='utf-8')
(HERE/'submission-manifest.json').write_text(json.dumps({name:hashlib.sha256((HERE/name).read_bytes()).hexdigest() for name in files},indent=2)+'\n',encoding='utf-8')
