BEGIN;
INSERT INTO public.trust_evidence(id,owner_id,category,title,claim,object_path,mime_type,byte_size,sha256,passport_private)
VALUES('91000000-0000-4000-8000-000000000001','42fce0f8-b0d3-41a9-b246-2d4a5def266e','product','Synthetic','Synthetic staging evidence only','synthetic/phase-f.pdf','application/pdf',10,repeat('b',64),true);
SET LOCAL ROLE service_role;
SELECT public.submit_passport_claim('42fce0f8-b0d3-41a9-b246-2d4a5def266e','91000000-0000-4000-8000-000000000002','startup',repeat('a',64),ARRAY['91000000-0000-4000-8000-000000000001'::uuid],true);
SELECT public.submit_passport_claim('42fce0f8-b0d3-41a9-b246-2d4a5def266e','91000000-0000-4000-8000-000000000002','startup',repeat('a',64),ARRAY['91000000-0000-4000-8000-000000000001'::uuid],true);
RESET ROLE;
DO $$ DECLARE before_count integer; BEGIN
 IF (SELECT count(*) FROM public.profile_verification_checks WHERE id='91000000-0000-4000-8000-000000000002')<>1 THEN RAISE EXCEPTION 'Retry duplicated claim'; END IF;
 SELECT count(*) INTO before_count FROM public.verification_audit_history;
 BEGIN
  PERFORM public.submit_passport_claim('42fce0f8-b0d3-41a9-b246-2d4a5def266e','91000000-0000-4000-8000-000000000003','startup',repeat('c',64),ARRAY['91000000-0000-4000-8000-000000000099'::uuid],true);
  RAISE EXCEPTION 'Invalid evidence accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 IF (SELECT count(*) FROM public.verification_audit_history)<>before_count THEN RAISE EXCEPTION 'Failed write left audit'; END IF;
 IF (SELECT passport_state FROM public.profile_verification_checks WHERE id='91000000-0000-4000-8000-000000000002')<>'submitted' THEN RAISE EXCEPTION 'Failed submission invalidated prior claim'; END IF;
 IF has_function_privilege('authenticated','public.submit_passport_claim(uuid,uuid,text,text,uuid[],boolean)','EXECUTE') OR has_function_privilege('anon','public.submit_passport_claim(uuid,uuid,text,text,uuid[],boolean)','EXECUTE') THEN RAISE EXCEPTION 'Browser EXECUTE exposed'; END IF;
END $$;
UPDATE public.profile_verification_checks SET passport_state='in_review' WHERE id='91000000-0000-4000-8000-000000000002';
-- Optional release-patch checks, preserving this smoke test's pre-patch use.
DO $feedback$
BEGIN
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profile_verification_checks' AND column_name='decision_reason') THEN
  BEGIN
   UPDATE public.profile_verification_checks SET passport_state='rejected',decision_actor='8acd8892-8651-423c-ab8b-71437492f02b',source_kind='manual_evidence'
    WHERE id='91000000-0000-4000-8000-000000000002';
   RAISE EXCEPTION 'Reasonless rejection accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
 END IF;
END $feedback$;
UPDATE public.profile_verification_checks SET passport_state='supported',decision_actor='8acd8892-8651-423c-ab8b-71437492f02b',decided_at=clock_timestamp(),expires_at=clock_timestamp()+interval '30 days',source_kind='manual_evidence' WHERE id='91000000-0000-4000-8000-000000000002';
DO $$ BEGIN
 IF NOT public.passport_claim_is_current('91000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'Supported claim eligibility failed'; END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profile_verification_checks' AND column_name='decision_reason') THEN
  IF (SELECT expires_at-decided_at FROM public.profile_verification_checks WHERE id='91000000-0000-4000-8000-000000000002')<>interval '30 days' THEN RAISE EXCEPTION 'Expiry clock mismatch'; END IF;
  BEGIN
   EXECUTE 'UPDATE public.profile_verification_checks SET decision_reason=''Silently edited feedback'' WHERE id=''91000000-0000-4000-8000-000000000002''';
   RAISE EXCEPTION 'Feedback rewrite accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
 END IF;
END $$;
UPDATE public.trust_evidence SET deleted_at=clock_timestamp() WHERE id='91000000-0000-4000-8000-000000000001';
DO $$ BEGIN
 IF public.passport_claim_is_current('91000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'Tombstoned evidence still current'; END IF;
END $$;
ROLLBACK;
SELECT 'PHASE_F_SUBMISSION_LOCAL_PASS_ROLLED_BACK';
