"""Generate guarded staging SQL from reviewed migration proposals."""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parent
SOURCE=ROOT.parent/'phase-f'
def body(name):
    lines=(SOURCE/name).read_text(encoding='utf-8').splitlines()
    assert lines.count('BEGIN;')==1 and lines.count('COMMIT;')==1
    return '\n'.join(line for line in lines if line not in ('BEGIN;','COMMIT;'))
guard="""BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $guard$
BEGIN
 IF current_user<>'postgres' THEN RAISE EXCEPTION 'Run only as postgres in staging SQL Editor'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id='42fce0f8-b0d3-41a9-b246-2d4a5def266e' AND email='passport-founder@example.invalid')
 OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id='3ec91991-f475-4f07-a038-e2a7e1c8b24d' AND email='passport-investor@example.invalid')
 OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id='8acd8892-8651-423c-ab8b-71437492f02b' AND email='passport-reviewer@example.invalid')
 THEN RAISE EXCEPTION 'Staging synthetic identities missing; STOP'; END IF;
 IF to_regprocedure('public.submit_passport_claim(uuid,uuid,text,text,uuid[],boolean)') IS NULL
 OR to_regprocedure('public.passport_check_guard()') IS NULL
 THEN RAISE EXCEPTION 'Passport prerequisite missing'; END IF;
 IF to_regclass('public.evidence_storage_quotas') IS NOT NULL
 OR EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profile_verification_checks' AND column_name='decision_reason')
 THEN RAISE EXCEPTION 'Already or partially applied; do not rerun blindly'; END IF;
END $guard$;
-- Identity checks are defense in depth, not proof of project identity.
-- Operator MUST confirm scaleScope-Staging / sopklyxvzmungxwgboqs.
"""
post="""DO $verify$
BEGIN
 IF EXISTS(
 SELECT 1 FROM (SELECT owner_id,count(*) AS actual FROM public.trust_evidence GROUP BY owner_id) e
 FULL JOIN public.evidence_storage_quotas q USING(owner_id)
 WHERE e.actual IS DISTINCT FROM q.retained_count
 ) THEN RAISE EXCEPTION 'Quota backfill mismatch'; END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.evidence_storage_quotas'::regclass)
 THEN RAISE EXCEPTION 'Quota RLS missing'; END IF;
 IF has_table_privilege('authenticated','public.evidence_storage_quotas','SELECT')
 OR has_table_privilege('service_role','public.evidence_storage_quotas','UPDATE')
 OR has_function_privilege('authenticated','public.passport_review_metadata()','EXECUTE')
 OR has_function_privilege('anon','public.enforce_evidence_storage_quota()','EXECUTE')
 THEN RAISE EXCEPTION 'Unexpected client/counter privileges'; END IF;
END $verify$;
"""
combined=guard+body('evidence_quota_PROPOSAL.sql')+'\n'+body('review_metadata_PROPOSAL.sql')+'\n'+post
files={
'01_REHEARSAL_STAGING_ONLY.sql':combined+"ROLLBACK;\nSELECT 'RELEASE_PATCH_REHEARSAL_PASS_ROLLED_BACK';\n",
'02_APPLY_STAGING_ONLY.sql':combined+"COMMIT;\nSELECT 'RELEASE_PATCH_STAGING_APPLIED';\n",
'03_VERIFY_READ_ONLY.sql':"""SELECT
 to_regclass('public.evidence_storage_quotas') IS NOT NULL AS quota_table,
 EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='evidence_storage_quota_trg' AND tgenabled='O') AS quota_trigger,
 EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='a_passport_review_metadata_trg' AND tgenabled='O') AS review_trigger,
 EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profile_verification_checks' AND column_name='decision_reason') AS reason_column;
"""
}
for name,text in files.items():(ROOT/name).write_text(text,encoding='utf-8')
(ROOT/'manifest.json').write_text(json.dumps({name:hashlib.sha256(text.encode()).hexdigest() for name,text in files.items()},indent=2)+'\n',encoding='utf-8')
print('Generated rehearsal, apply, read-only verification and SHA256 manifest.')

