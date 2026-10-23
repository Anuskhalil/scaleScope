from pathlib import Path
import hashlib, json
root=Path(__file__).resolve().parent
staging=root.parent/'phase2b-staging'
read=lambda p:p.read_text(encoding='utf-8')
b=read(staging/'phase-b/202610070001_trust_passport_STAGING.sql')
prefix='-- STAGING ONLY: sopklyxvzmungxwgboqs. NEVER production.\nBEGIN;\n'+read(staging/'phase-b/preflight.sql')
ending="COMMIT;\nVALUES ('PHASE_B_STAGING_APPLIED');\n"
assert b.startswith(prefix) and b.endswith(ending)
b=b[len(prefix):-len(ending)]
def proposal(name):
    lines=read(staging/'phase-f'/name).splitlines()
    assert lines.count('BEGIN;')==1 and lines.count('COMMIT;')==1
    return '\n'.join(x for x in lines if x not in ('BEGIN;','COMMIT;'))
guard="""-- LOCAL RESTORED PRODUCTION BACKUP ONLY. NOT APPROVED FOR LIVE SQL EDITOR.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='120s';
SET LOCAL search_path=pg_catalog,public,extensions;
DO $guard$ BEGIN
 IF current_setting('scalescope.restore_rehearsal',true) IS DISTINCT FROM 'isolated-local' THEN
 RAISE EXCEPTION 'Run only through network-disabled local restore harness'; END IF;
 IF current_user <> 'postgres' THEN RAISE EXCEPTION 'Migration owner must be postgres'; END IF;
 IF to_regclass('public.verification_audit_history') IS NOT NULL
 OR to_regclass('public.evidence_storage_quotas') IS NOT NULL
 OR EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public'
 AND table_name='profile_verification_checks' AND column_name='passport_claim') THEN
 RAISE EXCEPTION 'Unexpected prior/partial migration'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class WHERE oid IN ('public.profile_verifications'::regclass,
 'public.profile_verification_checks'::regclass,'public.trust_evidence'::regclass) AND NOT relrowsecurity)
 THEN RAISE EXCEPTION 'RLS baseline missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='trust-evidence' AND NOT public AND file_size_limit=5242880)
 THEN RAISE EXCEPTION 'Private evidence bucket baseline differs'; END IF;
END $guard$;
"""
sql=guard+b+'\n'+read(staging/'phase-c/changes.sql')+'\n'+read(staging/'phase-f/claim_submission.sql')+'\n'+proposal('evidence_quota_PROPOSAL.sql')+'\n'+proposal('review_metadata_PROPOSAL.sql')+'\n'+read(staging/'phase-c/postflight.sql')+"\nROLLBACK;\nSELECT 'PRODUCTION_BACKUP_MIGRATION_REHEARSAL_PASS_ROLLED_BACK';\n"
target=root/'01_LOCAL_BACKUP_REHEARSAL.sql'
target.write_text(sql,encoding='utf-8')
(root/'manifest.json').write_text(json.dumps({'artifact':target.name,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'scope':'Local backup rehearsal only; no live approval'},indent=2))
print('Local-only production backup migration rehearsal generated.')
