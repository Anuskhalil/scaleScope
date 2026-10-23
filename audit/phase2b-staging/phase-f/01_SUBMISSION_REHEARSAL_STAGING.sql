-- STAGING ONLY: sopklyxvzmungxwgboqs. Confirm Dashboard project before running.
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
-- Run only through the staging rehearsal/apply wrappers. No browser EXECUTE.
CREATE FUNCTION public.submit_passport_claim(p_user uuid,p_request uuid,p_kind text,p_hash text,p_evidence uuid[],p_consent boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE h public.profile_verifications; prior public.profile_verification_checks;
 r text; target text; version integer; evidence uuid; existing_ids uuid[];
BEGIN
 IF p_user IS NULL OR p_request IS NULL OR p_consent IS DISTINCT FROM true
 OR p_kind IS NULL OR p_kind NOT IN ('professional','education','startup','firm','traction','investment_history')
 OR p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$'
 OR p_evidence IS NULL OR cardinality(p_evidence) NOT BETWEEN 1 AND 10
 OR array_position(p_evidence,NULL) IS NOT NULL
 OR cardinality(p_evidence)<>(SELECT count(DISTINCT x) FROM unnest(p_evidence) x)
 THEN RAISE EXCEPTION 'Invalid claim submission' USING ERRCODE='22023'; END IF;
 SELECT user_type INTO r FROM public.profiles WHERE id=p_user AND deleted_at IS NULL FOR SHARE;
 IF r IS NULL OR r NOT IN ('early-stage-founder','investor') THEN RAISE EXCEPTION 'Active account required' USING ERRCODE='42501'; END IF;
 IF (p_kind IN ('startup','traction','education') AND r<>'early-stage-founder')
 OR (p_kind IN ('firm','investment_history') AND r<>'investor') THEN RAISE EXCEPTION 'Claim does not match role' USING ERRCODE='22023'; END IF;
 target:='passport.'||p_kind;
 INSERT INTO public.profile_verifications(user_id,role,passport_opted_in_at) VALUES(p_user,r,clock_timestamp())
 ON CONFLICT(user_id) DO NOTHING;
 SELECT * INTO h FROM public.profile_verifications WHERE user_id=p_user FOR UPDATE;
 IF h.role<>r THEN RAISE EXCEPTION 'Verification role mismatch' USING ERRCODE='22023'; END IF;
 SELECT * INTO prior FROM public.profile_verification_checks WHERE id=p_request;
 IF FOUND THEN
  SELECT array_agg(evidence_id ORDER BY evidence_id) INTO existing_ids FROM public.profile_verification_evidence WHERE check_id=p_request;
  IF prior.user_id<>p_user OR NOT prior.passport_claim OR prior.target_key<>target OR prior.claim_value_hash<>p_hash
   OR existing_ids IS DISTINCT FROM (SELECT array_agg(x ORDER BY x) FROM unnest(p_evidence) x)
  THEN RAISE EXCEPTION 'Request ID conflict' USING ERRCODE='23505'; END IF;
  RETURN jsonb_build_object('id',prior.id,'version',prior.claim_version,'status',prior.passport_state);
 END IF;
 UPDATE public.profile_verifications SET passport_opted_in_at=coalesce(passport_opted_in_at,clock_timestamp()) WHERE id=h.id;
 -- Consistent lock order prevents evidence deletion while claim links are created.
 FOR evidence IN SELECT x FROM unnest(p_evidence) x ORDER BY x LOOP
  PERFORM 1 FROM public.trust_evidence WHERE id=evidence AND owner_id=p_user AND passport_private AND deleted_at IS NULL FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Current private evidence owned by claimant required' USING ERRCODE='22023'; END IF;
 END LOOP;
 SELECT coalesce(max(claim_version),0)+1 INTO version FROM public.verification_audit_history
 WHERE subject_id=p_user AND target_key_hash=encode(pg_catalog.sha256(convert_to(target,'UTF8')),'hex');
 INSERT INTO public.profile_verification_checks(id,user_id,verification_id,role,check_type,target_key,target_label,status,score,passport_claim,claim_kind,claim_version,claim_value_hash,passport_state,submitted_at)
 VALUES(p_request,p_user,h.id,r,'passport',target,p_kind,'skipped',0,true,p_kind,version,p_hash,'submitted',clock_timestamp());
 INSERT INTO public.profile_verification_evidence(check_id,evidence_id) SELECT p_request,x FROM unnest(p_evidence) x;
 RETURN jsonb_build_object('id',p_request,'version',version,'status','submitted');
END $$;
REVOKE ALL ON FUNCTION public.submit_passport_claim(uuid,uuid,text,text,uuid[],boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_passport_claim(uuid,uuid,text,text,uuid[],boolean) TO service_role;

DO $post$ BEGIN
 IF has_function_privilege('anon','public.submit_passport_claim(uuid,uuid,text,text,uuid[],boolean)','EXECUTE') OR has_function_privilege('authenticated','public.submit_passport_claim(uuid,uuid,text,text,uuid[],boolean)','EXECUTE') OR NOT has_function_privilege('service_role','public.submit_passport_claim(uuid,uuid,text,text,uuid[],boolean)','EXECUTE') THEN RAISE EXCEPTION 'RPC ACL mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.submit_passport_claim(uuid,uuid,text,text,uuid[],boolean)'::regprocedure AND prosecdef) THEN RAISE EXCEPTION 'RPC must be SECURITY INVOKER'; END IF;
END $post$;

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
UPDATE public.profile_verification_checks SET passport_state='supported',decision_actor='8acd8892-8651-423c-ab8b-71437492f02b',decided_at=clock_timestamp(),expires_at=clock_timestamp()+interval '30 days',source_kind='manual_evidence' WHERE id='91000000-0000-4000-8000-000000000002';
DO $$ BEGIN
 IF NOT public.passport_claim_is_current('91000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'Supported claim eligibility failed'; END IF;
END $$;
UPDATE public.trust_evidence SET deleted_at=clock_timestamp() WHERE id='91000000-0000-4000-8000-000000000001';
DO $$ BEGIN
 IF public.passport_claim_is_current('91000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'Tombstoned evidence still current'; END IF;
END $$;

ROLLBACK;
SELECT 'PHASE_F_SUBMISSION_REHEARSAL_PASS_ROLLED_BACK';
