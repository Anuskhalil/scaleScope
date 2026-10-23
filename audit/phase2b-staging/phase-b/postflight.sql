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
