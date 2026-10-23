-- NOT EXECUTED. Run only on a disposable staging clone AFTER approval/schema.
-- This metadata suite needs no user data. Always ends in ROLLBACK.
BEGIN;
DO $$
DECLARE r text; t text; f text;
BEGIN
 FOREACH t IN ARRAY ARRAY['profile_verifications','profile_verification_checks',
   'trust_evidence','profile_verification_evidence','verification_audit_logs'] LOOP
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=('public.'||t)::regclass) THEN
   RAISE EXCEPTION 'RLS disabled: %',t;
  END IF;
 END LOOP;
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
  FOREACH t IN ARRAY ARRAY['profile_verifications','profile_verification_checks',
    'trust_evidence','profile_verification_evidence','verification_audit_logs'] LOOP
   IF has_table_privilege(r,'public.'||t,'INSERT')
    OR has_table_privilege(r,'public.'||t,'UPDATE')
    OR has_table_privilege(r,'public.'||t,'DELETE')
    OR has_table_privilege(r,'public.'||t,'TRUNCATE') THEN
    RAISE EXCEPTION 'Unexpected client write grant % %',r,t;
   END IF;
  END LOOP;
  FOREACH f IN ARRAY ARRAY[
   'public.create_conversation_with_participants(uuid,uuid,text)',
   'public.get_user_profile(uuid)','public.soft_delete_user(uuid)',
   'public.refresh_matching_scores()','public.passport_check_guard()',
   'public.passport_evidence_guard()','public.passport_no_sharing()',
   'public.passport_link_guard()'] LOOP
   IF has_function_privilege(r,f,'EXECUTE') THEN
    RAISE EXCEPTION 'Unsafe RPC grant % %',r,f;
   END IF;
  END LOOP;
 END LOOP;
 IF has_table_privilege('service_role','public.verification_audit_logs','UPDATE')
 OR has_table_privilege('service_role','public.verification_audit_logs','DELETE')
 OR has_table_privilege('service_role','public.verification_audit_logs','TRUNCATE')
 OR has_table_privilege('service_role','public.verification_audit_logs','INSERT') THEN
  RAISE EXCEPTION 'Audit is not trigger-owned append-only';
 END IF;
 IF has_function_privilege('anon','public.increment_login_tracking(uuid)','EXECUTE')
 OR NOT has_function_privilege('authenticated','public.increment_login_tracking(uuid)','EXECUTE') THEN
  RAISE EXCEPTION 'Login tracking grants incorrect';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public'
   AND tablename='profile_verification_checks' AND policyname='passport_checks_api_read'
   AND permissive='RESTRICTIVE') THEN RAISE EXCEPTION 'Missing private claim policy'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='trust-evidence'
   AND NOT public AND file_size_limit=5242880) THEN RAISE EXCEPTION 'Evidence bucket drift'; END IF;
END $$;
SELECT 'Catalog assertions passed; runtime tests still required' AS result;
ROLLBACK;

-- Runtime suite requires two PRE-CREATED staging-only Auth/profile fixtures:
-- 90000000-0000-4000-8000-000000000001 passport-owner@example.invalid (founder)
-- 90000000-0000-4000-8000-000000000002 passport-reviewer@example.invalid (investor)
-- No Auth API calls or real Storage files are made here.
BEGIN;
DO $$
DECLARE owner_id constant uuid='90000000-0000-4000-8000-000000000001';
 reviewer_id constant uuid='90000000-0000-4000-8000-000000000002';
 header_id uuid; check_id uuid; evidence_id uuid; n integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=owner_id
   AND email='passport-owner@example.invalid' AND user_type='early-stage-founder')
 OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=reviewer_id
   AND email='passport-reviewer@example.invalid' AND user_type='investor') THEN
  RAISE EXCEPTION 'Dedicated staging fixtures required; no real users substituted';
 END IF;
 INSERT INTO public.profile_verifications(user_id,role,passport_opted_in_at)
 VALUES(owner_id,'early-stage-founder',now())
 ON CONFLICT(user_id) DO UPDATE SET passport_opted_in_at=now()
 RETURNING id INTO header_id;
 INSERT INTO public.profile_verification_checks(user_id,verification_id,role,check_type,
 target_key,target_label,status,passport_claim,claim_kind,claim_version,claim_value_hash,
 passport_state,submitted_at)
 VALUES(owner_id,header_id,'early-stage-founder','passport','test.product','Test product',
 'skipped',true,'startup',1,repeat('a',64),'submitted',now()) RETURNING id INTO check_id;
 BEGIN
  UPDATE public.profile_verification_checks SET passport_state='supported' WHERE id=check_id;
  RAISE EXCEPTION 'FAIL: skipped review state accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
 END;
 UPDATE public.profile_verification_checks SET passport_state='in_review' WHERE id=check_id;
 BEGIN
  UPDATE public.profile_verification_checks SET passport_state='supported',
   decision_actor=owner_id,decided_at=now(),expires_at=now()+interval '30 days',
   source_kind='authoritative_source' WHERE id=check_id;
  RAISE EXCEPTION 'FAIL: self-review accepted';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 INSERT INTO public.trust_evidence(owner_id,category,title,claim,object_path,
 mime_type,byte_size,sha256,passport_private)
 VALUES(owner_id,'product','Test','Staging-only product claim',
 'founders/90000000-0000-4000-8000-000000000001/test/'||gen_random_uuid()||'.pdf',
 'application/pdf',10,repeat('b',64),true) RETURNING id INTO evidence_id;
 INSERT INTO public.profile_verification_evidence VALUES(check_id,evidence_id,now());
 BEGIN
  INSERT INTO public.evidence_grants(evidence_id,recipient_id,expires_at)
  VALUES(evidence_id,reviewer_id,now()+interval '1 day');
  RAISE EXCEPTION 'FAIL: private evidence shared';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
 END;
 BEGIN
  UPDATE public.trust_evidence SET sha256=repeat('c',64) WHERE id=evidence_id;
  RAISE EXCEPTION 'FAIL: provenance changed';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
 END;
 UPDATE public.profile_verification_checks SET passport_state='supported',
 decision_actor=reviewer_id,decided_at=now(),expires_at=now()+interval '30 days',
 source_kind='manual_evidence' WHERE id=check_id;
 SELECT count(*) INTO n FROM public.verification_audit_logs WHERE subject_id=owner_id;
 IF n<4 THEN RAISE EXCEPTION 'Missing lifecycle audit'; END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000001',true);
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.profile_verification_checks WHERE passport_claim) THEN
  RAISE EXCEPTION 'Private claim rows visible directly';
 END IF;
 IF EXISTS(SELECT 1 FROM public.profile_verifications
   WHERE user_id<>'90000000-0000-4000-8000-000000000001'::uuid) THEN
  RAISE EXCEPTION 'Other user headers visible';
 END IF;
 BEGIN
  UPDATE public.profile_verifications SET trust_score=100;
  RAISE EXCEPTION 'FAIL: browser update accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  PERFORM public.increment_login_tracking('90000000-0000-4000-8000-000000000002');
  RAISE EXCEPTION 'FAIL: other account login tracking accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
RESET ROLE;
SELECT 'Runtime staging assertions passed; all fixture changes rolled back' AS result;
ROLLBACK;
