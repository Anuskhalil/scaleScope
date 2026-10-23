from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parent
staging=root.parent/'phase2b-staging'
read=lambda p:p.read_text(encoding='utf-8')
local=read(root/'01_LOCAL_BACKUP_REHEARSAL.sql')
local_check=" IF current_setting('scalescope.restore_rehearsal',true) IS DISTINCT FROM 'isolated-local' THEN\n RAISE EXCEPTION 'Run only through network-disabled local restore harness'; END IF;\n"
assert local.count(local_check)==1
production_check=" IF current_setting('scalescope.production_release_confirmation',true) IS DISTINCT FROM 'gqkjvxcyetesvqmjkuus' THEN\n RAISE EXCEPTION 'Production execution not confirmed; follow release runbook'; END IF;\n"
guard_end=local.index('END $guard$;')+len('END $guard$;')
guard=local[:guard_end].replace(local_check,'').replace('-- LOCAL RESTORED PRODUCTION BACKUP ONLY. NOT APPROVED FOR LIVE SQL EDITOR.','-- Production read-only baseline check; verify dashboard project reference.')
guard=guard.replace('BEGIN;','BEGIN TRANSACTION READ ONLY;',1)
(root/'02_PREFLIGHT_READ_ONLY.sql').write_text(guard+"\nROLLBACK;\nSELECT 'PRODUCTION_PREFLIGHT_PASS';\n",encoding='utf-8')
footer="ROLLBACK;\nSELECT 'PRODUCTION_BACKUP_MIGRATION_REHEARSAL_PASS_ROLLED_BACK';\n"
assert local.endswith(footer)
extra="""DO $quota$ BEGIN
 IF EXISTS(SELECT 1 FROM
 (SELECT owner_id,count(*) AS actual FROM public.trust_evidence GROUP BY owner_id) e
 FULL JOIN public.evidence_storage_quotas q USING(owner_id)
 WHERE e.actual IS DISTINCT FROM q.retained_count) THEN RAISE EXCEPTION 'Quota backfill mismatch'; END IF;
 IF has_table_privilege('authenticated','public.evidence_storage_quotas','SELECT')
 OR has_table_privilege('service_role','public.evidence_storage_quotas','UPDATE')
 OR has_function_privilege('authenticated','public.passport_review_metadata()','EXECUTE')
 THEN RAISE EXCEPTION 'Quota/review metadata grants differ'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.profile_verification_checks'::regclass
 AND tgname='a_passport_review_metadata_trg' AND tgenabled='O')
 THEN RAISE EXCEPTION 'Review metadata trigger missing'; END IF;
END $quota$;
"""
attachment_check="""DO $attachment_verify$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='message-attachments' AND NOT public
 AND file_size_limit=5242880 AND allowed_mime_types=ARRAY['application/pdf','image/jpeg','image/png'])
 THEN RAISE EXCEPTION 'Attachment limits missing'; END IF;
END $attachment_verify$;
"""
apply=local[:-len(footer)].replace(local_check,production_check).replace('-- LOCAL RESTORED PRODUCTION BACKUP ONLY. NOT APPROVED FOR LIVE SQL EDITOR.','-- PRODUCTION CANDIDATE: requires approved runbook and explicit session confirmation.')+read(root/'attachment_limits.sql')+extra+attachment_check+"COMMIT;\nSELECT 'PRODUCTION_PASSPORT_APPLIED';\n"
(root/'03_APPLY_CANDIDATE_NOT_YET_APPROVED.sql').write_text(apply,encoding='utf-8')
post='BEGIN TRANSACTION READ ONLY;\n'+read(staging/'phase-b/postflight.sql')+'\n'+read(staging/'phase-c/postflight.sql')+'\n'+extra+attachment_check+"ROLLBACK;\nSELECT 'PRODUCTION_POSTFLIGHT_PASS';\n"
(root/'04_POSTFLIGHT_READ_ONLY.sql').write_text(post,encoding='utf-8')
(root/'manifest.json').write_text(json.dumps({p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in root.glob('*.sql')},indent=2),encoding='utf-8')
print('Production candidate generated, not approved or executed live.')
