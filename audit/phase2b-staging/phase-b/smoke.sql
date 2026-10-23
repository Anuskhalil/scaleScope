-- Transactional synthetic smoke tests only. The enclosing rehearsal rolls back all rows.
CREATE FUNCTION pg_temp.expect_error(sql_text text, expected_text text) RETURNS void
 LANGUAGE plpgsql AS $$
BEGIN
 BEGIN EXECUTE sql_text;
 EXCEPTION WHEN OTHERS THEN
  IF position(expected_text in SQLERRM)=0 THEN RAISE; END IF;
  RETURN;
 END;
 RAISE EXCEPTION 'Expected rejection did not occur: %',expected_text;
END $$;

INSERT INTO public.profile_verifications(id,user_id,role,passport_opted_in_at)
 VALUES('90000000-0000-4000-8000-000000000001','42fce0f8-b0d3-41a9-b246-2d4a5def266e','early-stage-founder',now())
 ON CONFLICT(user_id) DO UPDATE SET passport_opted_in_at=now();
INSERT INTO public.profile_verification_checks
 (id,user_id,verification_id,role,check_type,target_key,target_label,status,
 passport_claim,claim_kind,claim_version,claim_value_hash,passport_state,submitted_at)
 SELECT '90000000-0000-4000-8000-000000000002',user_id,id,role,'passport',
 'staging.product','Synthetic product','skipped',true,'startup',1,repeat('a',64),'submitted',now()
 FROM public.profile_verifications WHERE user_id='42fce0f8-b0d3-41a9-b246-2d4a5def266e';

SELECT pg_temp.expect_error($q$ UPDATE public.profile_verification_checks SET passport_state='supported'
 WHERE id='90000000-0000-4000-8000-000000000002' $q$,'Invalid decision timestamp');
UPDATE public.profile_verification_checks SET passport_state='in_review'
 WHERE id='90000000-0000-4000-8000-000000000002';
SELECT pg_temp.expect_error($q$ UPDATE public.profile_verification_checks
 SET passport_state='supported',decision_actor=user_id,decided_at=now(),expires_at=now()+interval '30 days',source_kind='manual_evidence'
 WHERE id='90000000-0000-4000-8000-000000000002' $q$,'Self review forbidden');
SELECT pg_temp.expect_error($q$ UPDATE public.profile_verification_checks
 SET passport_state='supported',decision_actor='8acd8892-8651-423c-ab8b-71437492f02b',decided_at=now(),expires_at=now()+interval '30 days',source_kind='manual_evidence'
 WHERE id='90000000-0000-4000-8000-000000000002' $q$,'Manual support requires');

INSERT INTO public.trust_evidence(id,owner_id,category,title,claim,object_path,mime_type,byte_size,sha256,passport_private)
 VALUES('90000000-0000-4000-8000-000000000003','42fce0f8-b0d3-41a9-b246-2d4a5def266e',
 'product','Synthetic only','Synthetic evidence for a staging test',
 'founders/42fce0f8-b0d3-41a9-b246-2d4a5def266e/passport/synthetic.pdf','application/pdf',10,repeat('b',64),true);
INSERT INTO public.profile_verification_evidence(check_id,evidence_id)
 VALUES('90000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000003');
SELECT pg_temp.expect_error($q$ INSERT INTO public.evidence_grants(evidence_id,recipient_id,expires_at)
 VALUES('90000000-0000-4000-8000-000000000003','3ec91991-f475-4f07-a038-e2a7e1c8b24d',now()+interval '1 day') $q$,
 'Passport evidence cannot be shared');
SELECT pg_temp.expect_error($q$ UPDATE public.trust_evidence SET sha256=repeat('c',64)
 WHERE id='90000000-0000-4000-8000-000000000003' $q$,'Evidence provenance is immutable');
UPDATE public.profile_verification_checks SET passport_state='supported',
 decision_actor='8acd8892-8651-423c-ab8b-71437492f02b',decided_at=now(),expires_at=now()+interval '30 days',source_kind='manual_evidence'
 WHERE id='90000000-0000-4000-8000-000000000002';
DO $$ BEGIN
 IF NOT public.passport_claim_is_current('90000000-0000-4000-8000-000000000002')
 THEN RAISE EXCEPTION 'Supported claim not eligible'; END IF;
END $$;
SELECT pg_temp.expect_error($q$ UPDATE public.profile_verification_checks SET passport_state='expired'
 WHERE id='90000000-0000-4000-8000-000000000002' $q$,'Claim has not expired yet');
SELECT pg_temp.expect_error($q$ UPDATE public.profile_verification_checks SET target_label='Changed'
 WHERE id='90000000-0000-4000-8000-000000000002' $q$,'Passport identity and payload are immutable');
SELECT pg_temp.expect_error($q$ DELETE FROM public.profile_verification_evidence
 WHERE check_id='90000000-0000-4000-8000-000000000002' $q$,'Reviewed evidence links are immutable');
UPDATE public.trust_evidence SET deleted_at=now() WHERE id='90000000-0000-4000-8000-000000000003';
DO $$ BEGIN
 IF public.passport_claim_is_current('90000000-0000-4000-8000-000000000002')
 OR NOT EXISTS(SELECT 1 FROM public.profile_verification_checks
  WHERE id='90000000-0000-4000-8000-000000000002' AND passport_state='stale')
 THEN RAISE EXCEPTION 'Tombstoned evidence still eligible'; END IF;
 IF (SELECT count(*) FROM public.verification_audit_history
 WHERE check_id='90000000-0000-4000-8000-000000000002')<>5
 THEN RAISE EXCEPTION 'Lifecycle audit incomplete'; END IF;
END $$;
SELECT pg_temp.expect_error('DELETE FROM public.verification_audit_history','Passport audit is append-only');
SELECT pg_temp.expect_error($q$ DELETE FROM public.profile_verification_checks
 WHERE id='90000000-0000-4000-8000-000000000002' $q$,'do not delete retained claim history');

-- New versions cannot revive the stale one. Supersession invalidates the old claim.
INSERT INTO public.profile_verification_checks
 (id,user_id,verification_id,role,check_type,target_key,target_label,status,
 passport_claim,claim_kind,claim_version,claim_value_hash,passport_state,submitted_at)
 SELECT '90000000-0000-4000-8000-000000000004',user_id,id,role,'passport',
 'staging.product','Synthetic product','skipped',true,'startup',2,repeat('d',64),'submitted',now()
 FROM public.profile_verifications WHERE user_id='42fce0f8-b0d3-41a9-b246-2d4a5def266e';
SELECT pg_temp.expect_error($q$ INSERT INTO public.profile_verification_evidence(check_id,evidence_id)
 VALUES('90000000-0000-4000-8000-000000000004','90000000-0000-4000-8000-000000000003') $q$,
 'Evidence must be private, current');
SELECT pg_temp.expect_error($q$ UPDATE public.profile_verification_checks SET passport_state='in_review'
 WHERE id='90000000-0000-4000-8000-000000000002' $q$,'Undecided claim cannot contain a decision');
UPDATE public.profile_verification_checks SET passport_state='in_review'
 WHERE id='90000000-0000-4000-8000-000000000004';
UPDATE public.profile_verification_checks SET passport_state='supported',
 decision_actor='8acd8892-8651-423c-ab8b-71437492f02b',decided_at=now(),
 expires_at=clock_timestamp()+interval '1 second',source_kind='authoritative_source'
 WHERE id='90000000-0000-4000-8000-000000000004';
SELECT pg_sleep(1.1);
UPDATE public.profile_verification_checks SET passport_state='expired'
 WHERE id='90000000-0000-4000-8000-000000000004';
DO $$ BEGIN
 IF public.passport_claim_is_current('90000000-0000-4000-8000-000000000004') THEN
  RAISE EXCEPTION 'Expired claim eligible'; END IF;
END $$;

-- Real role permissions, not only postgres trigger behavior.
SET LOCAL ROLE service_role;
DO $$ BEGIN
 BEGIN
  DELETE FROM public.verification_audit_history;
  RAISE EXCEPTION 'Service role audit delete succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

-- The real backend must authorize its reviewer allowlist; DB guards cannot identify
-- a human behind a shared service-role credential. Here only service-path behavior is tested.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','42fce0f8-b0d3-41a9-b246-2d4a5def266e',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.profile_verification_checks WHERE passport_claim)
 THEN RAISE EXCEPTION 'Passport raw claim exposed to browser'; END IF;
 BEGIN
  UPDATE public.profile_verifications SET trust_score=100;
  RAISE EXCEPTION 'Browser decision write succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO public.verification_audit_history(check_id,subject_id,event)
  VALUES(gen_random_uuid(),gen_random_uuid(),'submitted');
  RAISE EXCEPTION 'Browser audit write succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN
  PERFORM 1 FROM public.profile_verification_checks;
  RAISE EXCEPTION 'Anonymous claim read succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
VALUES ('PHASE_B_SMOKE_PASS');
