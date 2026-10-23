BEGIN TRANSACTION READ ONLY;
DO $postflight$
DECLARE tab text; role_name text; func text;
BEGIN
 FOREACH tab IN ARRAY ARRAY['profile_verifications','profile_verification_checks','trust_evidence',
  'profile_verification_evidence','verification_audit_history'] LOOP
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=('public.'||tab)::regclass)
   THEN RAISE EXCEPTION 'RLS missing: %',tab; END IF;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF has_table_privilege(role_name,'public.'||tab,'INSERT,UPDATE,DELETE,TRUNCATE')
    OR has_any_column_privilege(role_name,'public.'||tab,'INSERT,UPDATE')
    THEN RAISE EXCEPTION 'Browser write privilege: % %',role_name,tab; END IF;
  END LOOP;
 END LOOP;
 IF has_table_privilege('service_role','public.verification_audit_history','INSERT,UPDATE,DELETE,TRUNCATE')
 THEN RAISE EXCEPTION 'Audit direct write grant'; END IF;
 FOREACH func IN ARRAY ARRAY['passport_check_guard()','passport_link_guard()',
  'passport_evidence_guard()','passport_no_sharing()','passport_evidence_tombstone()',
  'passport_audit_immutable()','passport_claim_is_current(uuid)'] LOOP
  IF has_function_privilege('anon','public.'||func,'EXECUTE') OR
   has_function_privilege('authenticated','public.'||func,'EXECUTE')
  THEN RAISE EXCEPTION 'Browser function grant: %',func; END IF;
 END LOOP;
 IF to_regclass('public.passport_claim_version_uq') IS NULL OR
    to_regclass('public.passport_evidence_reverse_idx') IS NULL THEN
  RAISE EXCEPTION 'Missing Passport indexes'; END IF;
 IF EXISTS(SELECT 1 FROM public.profile_verification_checks WHERE passport_claim)
 OR EXISTS(SELECT 1 FROM public.profile_verifications WHERE passport_opted_in_at IS NOT NULL)
 OR EXISTS(SELECT 1 FROM public.verification_audit_history)
 THEN RAISE EXCEPTION 'Migration must not populate or promote Passport claims'; END IF;
END $postflight$;

DO $$
DECLARE signature text; r text;
BEGIN
 FOREACH signature IN ARRAY ARRAY['create_conversation_with_participants(uuid,uuid,text)',
 'get_user_profile(uuid)','soft_delete_user(uuid)','refresh_matching_scores()'] LOOP
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF has_function_privilege(r,'public.'||signature,'EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected browser RPC access: % %',r,signature; END IF;
  END LOOP;
 END LOOP;
 IF NOT has_function_privilege('authenticated','public.increment_login_tracking(uuid)','EXECUTE')
 OR has_function_privilege('anon','public.increment_login_tracking(uuid)','EXECUTE')
 OR NOT has_function_privilege('service_role','public.create_conversation_with_participants(uuid,uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'Intended RPC grants missing'; END IF;
 IF (SELECT prosecdef FROM pg_proc WHERE oid='public.create_conversation_with_participants(uuid,uuid,text)'::regprocedure)
 THEN RAISE EXCEPTION 'Conversation must be invoker'; END IF;
END $$;

DO $quota$ BEGIN
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
DO $attachment_verify$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='message-attachments' AND NOT public
 AND file_size_limit=5242880 AND allowed_mime_types=ARRAY['application/pdf','image/jpeg','image/png'])
 THEN RAISE EXCEPTION 'Attachment limits missing'; END IF;
END $attachment_verify$;
ROLLBACK;
SELECT 'PRODUCTION_POSTFLIGHT_PASS';
