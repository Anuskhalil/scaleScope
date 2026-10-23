"""Build reviewed staging artifacts from the frozen proposal plus explicit fixes."""
from pathlib import Path
import hashlib
import json

HERE = Path(__file__).resolve().parent
PROPOSAL = HERE.parent.parent / 'phase2b-proposal' / '01_schema_PROPOSAL.sql'
sql = PROPOSAL.read_text(encoding='utf-8')
assert sql.count('BEGIN;') == 1 and sql.endswith('COMMIT;\n')
sql = sql[sql.index('SET LOCAL lock_timeout'):sql.rindex('COMMIT;')]
sql = sql.replace('verification_audit_logs', 'verification_audit_history')
sql = sql.replace('IF OLD.passport_claim THEN', '''IF OLD.passport_claim THEN
   IF EXISTS(SELECT 1 FROM public.profile_verifications WHERE id=OLD.verification_id) THEN
    RAISE EXCEPTION 'Revoke or stale Passport claims; do not delete retained claim history';
   END IF;''', 1)
sql = sql.replace('DEFAULT gen_random_uuid()', 'DEFAULT pg_catalog.gen_random_uuid()')
sql = sql.replace('DECLARE parent public.profile_verifications; previous integer;',
                  'DECLARE parent public.profile_verifications; previous integer;')
sql = sql.replace(' evidence_sha256 text,', ''' evidence_sha256 text,
 claim_version integer,
 target_key_hash text,''')
sql = sql.replace("'deleted',OLD.passport_state,OLD.claim_value_hash);", "'deleted',OLD.passport_state,OLD.claim_value_hash);")
sql = sql.replace('SELECT coalesce(max(claim_version),0) INTO previous\n   FROM public.profile_verification_checks\n   WHERE user_id=NEW.user_id AND target_key=NEW.target_key AND passport_claim;', '''SELECT coalesce(max(a.claim_version),0) INTO previous
   FROM public.verification_audit_history a
   WHERE a.subject_id=NEW.user_id
     AND a.target_key_hash=encode(extensions.digest(NEW.target_key,'sha256'),'hex');''')
sql = sql.replace('INSERT INTO public.verification_audit_history(check_id,subject_id,event,new_state,claim_value_hash)\n   VALUES(NEW.id,NEW.user_id,\'submitted\',NEW.passport_state,NEW.claim_value_hash);', '''INSERT INTO public.verification_audit_history
   (check_id,subject_id,event,new_state,claim_value_hash,claim_version,target_key_hash)
   VALUES(NEW.id,NEW.user_id,'submitted',NEW.passport_state,NEW.claim_value_hash,
     NEW.claim_version,encode(extensions.digest(NEW.target_key,'sha256'),'hex'));
  UPDATE public.profile_verification_checks SET passport_state='stale'
   WHERE user_id=NEW.user_id AND target_key=NEW.target_key AND passport_claim
    AND passport_state IN ('submitted','in_review','supported','needs_changes','rejected');''')
sql = sql.replace('IF NOT NEW.passport_claim THEN RETURN NEW; END IF;', '''IF NOT NEW.passport_claim THEN RETURN NEW; END IF;
 IF NEW.decision_actor=NEW.user_id THEN RAISE EXCEPTION 'Self review forbidden'; END IF;''')
sql = sql.replace('IF NEW.passport_state IS DISTINCT FROM OLD.passport_state THEN', '''IF NEW.id IS DISTINCT FROM OLD.id OR NEW.check_type IS DISTINCT FROM OLD.check_type
    OR NEW.target_label IS DISTINCT FROM OLD.target_label
    OR NEW.metadata IS DISTINCT FROM OLD.metadata THEN
   RAISE EXCEPTION 'Passport identity and payload are immutable';
  END IF;
  IF NEW.passport_state IN ('submitted','in_review') AND
    (NEW.decision_actor IS NOT NULL OR NEW.decided_at IS NOT NULL
     OR NEW.expires_at IS NOT NULL OR NEW.source_kind IS NOT NULL) THEN
   RAISE EXCEPTION 'Undecided claim cannot contain a decision';
  END IF;
  IF NEW.passport_state IS DISTINCT FROM OLD.passport_state THEN
   IF NEW.passport_state IN ('stale','revoked','expired') AND
    ROW(NEW.decision_actor,NEW.decided_at,NEW.expires_at,NEW.source_kind)
     IS DISTINCT FROM ROW(OLD.decision_actor,OLD.decided_at,OLD.expires_at,OLD.source_kind) THEN
    RAISE EXCEPTION 'Invalidation must preserve the prior decision';
   END IF;
   IF NEW.passport_state='expired' AND OLD.expires_at > clock_timestamp() THEN
    RAISE EXCEPTION 'Claim has not expired yet';
   END IF;
   IF NEW.passport_state IN ('supported','needs_changes','rejected') THEN
    IF NEW.decided_at IS NULL OR NEW.decided_at < NEW.submitted_at
       OR NEW.decided_at > clock_timestamp() THEN
     RAISE EXCEPTION 'Invalid decision timestamp';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=NEW.decision_actor
                    AND p.deleted_at IS NULL) THEN
     RAISE EXCEPTION 'Active decision actor required';
    END IF;
   END IF;
   IF NEW.passport_state='supported' AND NEW.expires_at <= clock_timestamp() THEN
    RAISE EXCEPTION 'Supported claim must have future expiry';
   END IF;''')
sql = sql.replace('OR NEW.decided_at IS NOT NULL OR NEW.expires_at IS NOT NULL THEN',
                  'OR NEW.decided_at IS NOT NULL OR NEW.expires_at IS NOT NULL OR NEW.source_kind IS NOT NULL THEN')
sql = sql.replace('ROW(NEW.owner_id,NEW.object_path,NEW.sha256,NEW.byte_size,NEW.mime_type)',
                  'ROW(NEW.id,NEW.owner_id,NEW.object_path,NEW.sha256,NEW.byte_size,NEW.mime_type,NEW.category,NEW.title,NEW.claim,NEW.created_at)')
sql = sql.replace('ROW(OLD.owner_id,OLD.object_path,OLD.sha256,OLD.byte_size,OLD.mime_type)',
                  'ROW(OLD.id,OLD.owner_id,OLD.object_path,OLD.sha256,OLD.byte_size,OLD.mime_type,OLD.category,OLD.title,OLD.claim,OLD.created_at)')
sql = sql.replace("IF OLD.passport_private AND OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN", "IF OLD.passport_private AND OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN")
sql = sql.replace("IF c.passport_state='supported' THEN RAISE EXCEPTION 'Revoke claim before unlinking evidence'; END IF;", "IF c.passport_state NOT IN ('submitted','in_review') THEN RAISE EXCEPTION 'Reviewed evidence links are immutable'; END IF;")
sql += (HERE / 'safeguards.sql').read_text(encoding='utf-8')
preflight = (HERE / 'preflight.sql').read_text(encoding='utf-8')
postflight = (HERE / 'postflight.sql').read_text(encoding='utf-8')
smoke = (HERE / 'smoke.sql').read_text(encoding='utf-8')
banner = '-- STAGING ONLY: sopklyxvzmungxwgboqs. NEVER production.\n'
core = banner + 'BEGIN;\n' + preflight + sql + postflight
(HERE / '202610070001_trust_passport_STAGING.sql').write_text(core + "COMMIT;\nVALUES ('PHASE_B_STAGING_APPLIED');\n", encoding='utf-8')
(HERE / '01_REHEARSAL_ROLLBACK.sql').write_text(core + '\nSAVEPOINT smoke;\n' + smoke + "\nROLLBACK TO SAVEPOINT smoke;\nROLLBACK;\nVALUES ('PHASE_B_REHEARSAL_PASS_ROLLED_BACK');\n", encoding='utf-8')
manifest = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in HERE.glob('*.sql')}
(HERE / 'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
print('Built staging-only migration and rollback rehearsal; no database execution.')
