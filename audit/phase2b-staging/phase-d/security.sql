-- STAGING ONLY sopklyxvzmungxwgboqs. All test writes roll back.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='120s';
DO $$ BEGIN
 IF current_user<>'postgres' THEN RAISE EXCEPTION 'Reviewed postgres test owner required'; END IF;
 IF (SELECT count(*) FROM public.profiles WHERE
  (id='42fce0f8-b0d3-41a9-b246-2d4a5def266e' AND email='passport-founder@example.invalid') OR
  (id='3ec91991-f475-4f07-a038-e2a7e1c8b24d' AND email='passport-investor@example.invalid') OR
  (id='8acd8892-8651-423c-ab8b-71437492f02b' AND email='passport-reviewer@example.invalid'))<>3
 THEN RAISE EXCEPTION 'Known staging identities required'; END IF;
 IF EXISTS(SELECT 1 FROM public.profiles WHERE email NOT IN
  ('passport-founder@example.invalid','passport-investor@example.invalid','passport-reviewer@example.invalid'))
 THEN RAISE EXCEPTION 'Synthetic-only target required'; END IF;
 IF to_regclass('public.verification_audit_history') IS NULL
 OR has_function_privilege('authenticated','public.create_conversation_with_participants(uuid,uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'Phases B and C required'; END IF;
END $$;

CREATE TEMP TABLE security_results(test_name text PRIMARY KEY, status text NOT NULL);
GRANT INSERT,SELECT ON security_results TO anon,authenticated,service_role;
CREATE FUNCTION pg_temp.assert_pass(label text, condition boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 IF condition IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',label; END IF;
 INSERT INTO pg_temp.security_results VALUES(label,'PASS');
END $$;
CREATE FUNCTION pg_temp.reject(label text, statement text, expected_state text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 BEGIN EXECUTE statement;
 EXCEPTION WHEN OTHERS THEN
  IF SQLSTATE<>expected_state THEN RAISE EXCEPTION 'FAIL: % expected %, received %: %',label,expected_state,SQLSTATE,SQLERRM; END IF;
  INSERT INTO pg_temp.security_results VALUES(label,'PASS');
  RETURN;
 END;
 RAISE EXCEPTION 'FAIL: % operation was permitted',label;
END $$;

DO $$ DECLARE tab text; r text; perm text; f text; BEGIN
 FOREACH tab IN ARRAY ARRAY['profile_verifications','profile_verification_checks','trust_evidence',
 'profile_verification_evidence','verification_audit_history'] LOOP
  PERFORM pg_temp.assert_pass('RLS enabled: '||tab,(SELECT relrowsecurity FROM pg_class WHERE oid=('public.'||tab)::regclass));
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
   FOREACH perm IN ARRAY ARRAY['INSERT','UPDATE','DELETE','TRUNCATE'] LOOP
    PERFORM pg_temp.assert_pass(r||' no '||perm||': '||tab,NOT has_table_privilege(r,'public.'||tab,perm));
   END LOOP;
   PERFORM pg_temp.assert_pass(r||' no column writes: '||tab,NOT has_any_column_privilege(r,'public.'||tab,'INSERT,UPDATE'));
  END LOOP;
 END LOOP;
 FOREACH f IN ARRAY ARRAY['passport_check_guard()','passport_evidence_guard()','passport_link_guard()',
 'passport_no_sharing()','passport_evidence_tombstone()','passport_audit_immutable()',
 'passport_claim_is_current(uuid)','create_conversation_with_participants(uuid,uuid,text)',
 'get_user_profile(uuid)','soft_delete_user(uuid)','refresh_matching_scores()'] LOOP
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
   PERFORM pg_temp.assert_pass(r||' no execute: '||f,NOT has_function_privilege(r,'public.'||f,'EXECUTE'));
  END LOOP;
  PERFORM pg_temp.assert_pass('Fixed search path: '||f,EXISTS(SELECT 1 FROM pg_proc
   WHERE oid=('public.'||f)::regprocedure AND array_to_string(proconfig,',') LIKE '%search_path=""%'));
 END LOOP;
END $$;

-- Synthetic legacy checks let RLS tests prove preservation rather than just empty reads.
INSERT INTO public.profile_verifications(user_id,role,passport_opted_in_at)
 VALUES('42fce0f8-b0d3-41a9-b246-2d4a5def266e','early-stage-founder',now()),
 ('3ec91991-f475-4f07-a038-e2a7e1c8b24d','investor',now())
 ON CONFLICT(user_id) DO UPDATE SET passport_opted_in_at=now();
INSERT INTO public.profile_verification_checks(id,user_id,role,check_type,target_key,target_label,status)
 VALUES('91000000-0000-4000-8000-000000000001','42fce0f8-b0d3-41a9-b246-2d4a5def266e','early-stage-founder','legacy','phase_d.legacy','Synthetic legacy','passed'),
 ('91000000-0000-4000-8000-000000000002','3ec91991-f475-4f07-a038-e2a7e1c8b24d','investor','legacy','phase_d.legacy','Synthetic legacy','passed');
CREATE FUNCTION pg_temp.submit_claim(target text, version integer DEFAULT 1) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE claim_id uuid;
BEGIN
 INSERT INTO public.profile_verification_checks(user_id,verification_id,role,check_type,target_key,target_label,status,
  passport_claim,claim_kind,claim_version,claim_value_hash,passport_state,submitted_at)
 SELECT user_id,id,role,'passport',target,'Synthetic claim','skipped',true,'startup',version,repeat('a',64),'submitted',now()
 FROM public.profile_verifications WHERE user_id='42fce0f8-b0d3-41a9-b246-2d4a5def266e'
 RETURNING id INTO claim_id;
 RETURN claim_id;
END $$;
CREATE FUNCTION pg_temp.decide_claim(target text, decision text, source text DEFAULT 'manual_evidence') RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 UPDATE public.profile_verification_checks SET passport_state='in_review' WHERE target_key=target AND passport_claim AND passport_state='submitted';
 UPDATE public.profile_verification_checks SET passport_state=decision,
  decision_actor='8acd8892-8651-423c-ab8b-71437492f02b',decided_at=now(),
  expires_at=CASE WHEN decision='supported' THEN now()+interval '1 day' END,source_kind=source
 WHERE target_key=target AND passport_claim AND passport_state='in_review';
END $$;

SET LOCAL ROLE service_role;
SELECT pg_temp.submit_claim('phase_d.product');
SELECT pg_temp.submit_claim('phase_d.second');
INSERT INTO public.trust_evidence(id,owner_id,category,title,claim,object_path,mime_type,byte_size,sha256,passport_private)
 VALUES('91000000-0000-4000-8000-000000000003','42fce0f8-b0d3-41a9-b246-2d4a5def266e','product','Synthetic evidence','Synthetic evidence claim only',
 'founders/42fce0f8-b0d3-41a9-b246-2d4a5def266e/phase-d/one.pdf','application/pdf',10,repeat('b',64),true),
 ('91000000-0000-4000-8000-000000000004','3ec91991-f475-4f07-a038-e2a7e1c8b24d','product','Other owner','Synthetic other owner claim',
 'investors/3ec91991-f475-4f07-a038-e2a7e1c8b24d/phase-d/two.pdf','application/pdf',10,repeat('c',64),true);
SELECT pg_temp.reject('Cross-owner evidence link',$q$ INSERT INTO public.profile_verification_evidence(check_id,evidence_id)
 SELECT id,'91000000-0000-4000-8000-000000000004' FROM public.profile_verification_checks WHERE target_key='phase_d.product' $q$,'P0001');
INSERT INTO public.profile_verification_evidence(check_id,evidence_id)
 SELECT id,'91000000-0000-4000-8000-000000000003' FROM public.profile_verification_checks
 WHERE target_key IN ('phase_d.product','phase_d.second');
SELECT pg_temp.assert_pass('Evidence can support multiple claims',(SELECT count(*)=2 FROM public.profile_verification_evidence
 WHERE evidence_id='91000000-0000-4000-8000-000000000003'));
SELECT pg_temp.reject('Private evidence sharing blocked',$q$ INSERT INTO public.evidence_grants(evidence_id,recipient_id,expires_at)
 VALUES('91000000-0000-4000-8000-000000000003','3ec91991-f475-4f07-a038-e2a7e1c8b24d',now()+interval '1 day') $q$,'P0001');
SELECT pg_temp.reject('Immutable evidence hash',$q$ UPDATE public.trust_evidence SET sha256=repeat('d',64)
 WHERE id='91000000-0000-4000-8000-000000000003' $q$,'P0001');
SELECT pg_temp.reject('Immutable evidence purpose',$q$ UPDATE public.trust_evidence SET passport_private=false
 WHERE id='91000000-0000-4000-8000-000000000003' $q$,'P0001');
SELECT pg_temp.reject('Self review rejected',$q$ UPDATE public.profile_verification_checks SET decision_actor=user_id,
 passport_state='supported',decided_at=now(),expires_at=now()+interval '1 day',source_kind='manual_evidence'
 WHERE target_key='phase_d.product' $q$,'P0001');
SELECT pg_temp.reject('Skipped review transition rejected',$q$ UPDATE public.profile_verification_checks
 SET passport_state='supported',decision_actor='8acd8892-8651-423c-ab8b-71437492f02b',decided_at=now(),
 expires_at=now()+interval '1 day',source_kind='manual_evidence' WHERE target_key='phase_d.product' $q$,'P0001');
SELECT pg_temp.decide_claim('phase_d.product','supported');
SELECT pg_temp.decide_claim('phase_d.second','supported');
SELECT pg_temp.assert_pass('Backend supported claim eligible',(SELECT public.passport_claim_is_current(id)
 FROM public.profile_verification_checks WHERE target_key='phase_d.product'));
SELECT pg_temp.reject('Reviewed link deletion rejected',$q$ DELETE FROM public.profile_verification_evidence
 WHERE evidence_id='91000000-0000-4000-8000-000000000003' $q$,'P0001');
SELECT pg_temp.reject('Service cannot insert fabricated audit',$q$ INSERT INTO public.verification_audit_history(check_id,subject_id,event)
 VALUES(gen_random_uuid(),gen_random_uuid(),'submitted') $q$,'42501');
SELECT pg_temp.reject('Service cannot edit audit','UPDATE public.verification_audit_history SET event=event','42501');
SELECT pg_temp.reject('Service cannot delete audit','DELETE FROM public.verification_audit_history','42501');
SELECT pg_temp.reject('Service cannot truncate audit','TRUNCATE public.verification_audit_history','42501');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','42fce0f8-b0d3-41a9-b246-2d4a5def266e',true);
SELECT pg_temp.assert_pass('Owner legacy check readable',EXISTS(SELECT 1 FROM public.profile_verification_checks WHERE id='91000000-0000-4000-8000-000000000001'));
SELECT pg_temp.assert_pass('Other owner legacy check hidden',NOT EXISTS(SELECT 1 FROM public.profile_verification_checks WHERE id='91000000-0000-4000-8000-000000000002'));
SELECT pg_temp.assert_pass('Owner header readable',EXISTS(SELECT 1 FROM public.profile_verifications WHERE user_id=auth.uid()));
SELECT pg_temp.assert_pass('Other owner header hidden',NOT EXISTS(SELECT 1 FROM public.profile_verifications WHERE user_id<>auth.uid()));
SELECT pg_temp.assert_pass('Owner raw passport checks hidden',NOT EXISTS(SELECT 1 FROM public.profile_verification_checks WHERE passport_claim));
-- trust_evidence is backend-only in the baseline; even the owner uses its authorized API.
SELECT pg_temp.assert_pass('Direct evidence remains backend-only',NOT EXISTS(SELECT 1 FROM public.trust_evidence));
SELECT pg_temp.reject('Browser cannot approve own claim',$q$ UPDATE public.profile_verification_checks SET passport_state='supported' WHERE target_key='phase_d.product' $q$,'42501');
SELECT pg_temp.reject('Browser cannot forge reviewer',$q$ UPDATE public.profile_verification_checks SET decision_actor='8acd8892-8651-423c-ab8b-71437492f02b' $q$,'42501');
SELECT pg_temp.reject('Browser cannot read audit','SELECT * FROM public.verification_audit_history','42501');
SELECT pg_temp.reject('Browser cannot read evidence links','SELECT * FROM public.profile_verification_evidence','42501');
SELECT pg_temp.reject('Browser cannot delete audit','DELETE FROM public.verification_audit_history','42501');
SELECT pg_temp.reject('Browser cannot truncate audit','TRUNCATE public.verification_audit_history','42501');
SELECT pg_temp.reject('Browser cannot edit audit','UPDATE public.verification_audit_history SET event=event','42501');
SELECT set_config('request.jwt.claim.sub','3ec91991-f475-4f07-a038-e2a7e1c8b24d',true);
SELECT pg_temp.assert_pass('Other user cannot read founder passport evidence',NOT EXISTS(SELECT 1 FROM public.trust_evidence WHERE id='91000000-0000-4000-8000-000000000003'));
SELECT pg_temp.assert_pass('Other user cannot read founder checks',NOT EXISTS(SELECT 1 FROM public.profile_verification_checks WHERE user_id='42fce0f8-b0d3-41a9-b246-2d4a5def266e'));
RESET ROLE;
SET LOCAL ROLE anon;
SELECT pg_temp.reject('Anonymous cannot read checks','SELECT * FROM public.profile_verification_checks','42501');
SELECT pg_temp.reject('Anonymous cannot read evidence','SELECT * FROM public.trust_evidence','42501');
SELECT pg_temp.reject('Anonymous cannot read headers','SELECT * FROM public.profile_verifications','42501');
SELECT pg_temp.reject('Anonymous cannot read audit','SELECT * FROM public.verification_audit_history','42501');
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT pg_temp.submit_claim('phase_d.product',2);
SELECT pg_temp.assert_pass('New claim version invalidates previous support',EXISTS(SELECT 1 FROM public.profile_verification_checks
 WHERE target_key='phase_d.product' AND claim_version=1 AND passport_state='stale' AND NOT public.passport_claim_is_current(id)));
SELECT pg_temp.reject('Duplicate claim version rejected',$q$ SELECT pg_temp.submit_claim('phase_d.product',2) $q$,'P0001');
UPDATE public.trust_evidence SET deleted_at=now() WHERE id='91000000-0000-4000-8000-000000000003';
SELECT pg_temp.assert_pass('Tombstone invalidates every supported linked claim',NOT EXISTS(SELECT 1 FROM public.profile_verification_checks
 WHERE target_key IN ('phase_d.product','phase_d.second') AND public.passport_claim_is_current(id)));
SELECT pg_temp.reject('Cannot restore evidence tombstone',$q$ UPDATE public.trust_evidence SET deleted_at=null WHERE id='91000000-0000-4000-8000-000000000003' $q$,'P0001');
SELECT pg_temp.reject('Cannot link tombstoned evidence',$q$ INSERT INTO public.profile_verification_evidence(check_id,evidence_id)
 SELECT id,'91000000-0000-4000-8000-000000000003' FROM public.profile_verification_checks WHERE target_key='phase_d.product' AND claim_version=2 $q$,'P0001');
SELECT pg_temp.submit_claim('phase_d.rejected');
SELECT pg_temp.decide_claim('phase_d.rejected','rejected');
SELECT pg_temp.submit_claim('phase_d.changes');
SELECT pg_temp.decide_claim('phase_d.changes','needs_changes');
SELECT pg_temp.submit_claim('phase_d.revoked');
SELECT pg_temp.decide_claim('phase_d.revoked','supported','authoritative_source');
UPDATE public.profile_verification_checks SET passport_state='revoked' WHERE target_key='phase_d.revoked';
SELECT pg_temp.assert_pass('Revoked claim not eligible',(SELECT NOT public.passport_claim_is_current(id) FROM public.profile_verification_checks WHERE target_key='phase_d.revoked'));
SELECT pg_temp.assert_pass('Rejection audited',EXISTS(SELECT 1 FROM public.verification_audit_history a JOIN public.profile_verification_checks c ON c.id=a.check_id
 WHERE c.target_key='phase_d.rejected' AND a.event='transition' AND a.new_state='rejected' AND a.actor_id='8acd8892-8651-423c-ab8b-71437492f02b'));
SELECT pg_temp.assert_pass('Revocation audited',EXISTS(SELECT 1 FROM public.verification_audit_history a JOIN public.profile_verification_checks c ON c.id=a.check_id
 WHERE c.target_key='phase_d.revoked' AND a.event='transition' AND a.new_state='revoked'));
SELECT pg_temp.submit_claim('phase_d.expired');
UPDATE public.profile_verification_checks SET passport_state='in_review' WHERE target_key='phase_d.expired';
UPDATE public.profile_verification_checks SET passport_state='supported',
 decision_actor='8acd8892-8651-423c-ab8b-71437492f02b',decided_at=now(),source_kind='authoritative_source',
 expires_at=clock_timestamp()+interval '1 second' WHERE target_key='phase_d.expired';
SELECT pg_temp.reject('Cannot expire before deadline',$q$ UPDATE public.profile_verification_checks
 SET passport_state='expired' WHERE target_key='phase_d.expired' $q$,'P0001');
SELECT pg_sleep(1.1);
UPDATE public.profile_verification_checks SET passport_state='expired' WHERE target_key='phase_d.expired';
SELECT pg_temp.assert_pass('Expired claim excluded',(SELECT NOT public.passport_claim_is_current(id)
 FROM public.profile_verification_checks WHERE target_key='phase_d.expired'));
SELECT pg_temp.reject('Terminal claim cannot be revived',$q$ UPDATE public.profile_verification_checks
 SET passport_state='supported' WHERE target_key='phase_d.expired' $q$,'P0001');
SELECT pg_temp.assert_pass('Audit contains no raw fixture text',NOT EXISTS(SELECT 1 FROM public.verification_audit_history a
 WHERE to_jsonb(a)::text LIKE '%Synthetic%' OR to_jsonb(a)::text LIKE '%example.invalid%' OR to_jsonb(a)::text LIKE '%one.pdf%'));
RESET ROLE;
SELECT jsonb_build_object('status','PASS','tests',count(*),'results',jsonb_agg(to_jsonb(r) ORDER BY test_name)) AS security_report
 FROM pg_temp.security_results r;
ROLLBACK;
VALUES ('PHASE_D_SECURITY_PASS_ROLLED_BACK');
