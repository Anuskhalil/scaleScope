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
