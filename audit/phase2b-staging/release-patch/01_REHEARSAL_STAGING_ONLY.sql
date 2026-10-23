BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $guard$
BEGIN
 IF current_user<>'postgres' THEN RAISE EXCEPTION 'Run only as postgres in staging SQL Editor'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id='42fce0f8-b0d3-41a9-b246-2d4a5def266e' AND email='passport-founder@example.invalid')
 OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id='3ec91991-f475-4f07-a038-e2a7e1c8b24d' AND email='passport-investor@example.invalid')
 OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id='8acd8892-8651-423c-ab8b-71437492f02b' AND email='passport-reviewer@example.invalid')
 THEN RAISE EXCEPTION 'Staging synthetic identities missing; STOP'; END IF;
 IF to_regprocedure('public.submit_passport_claim(uuid,uuid,text,text,uuid[],boolean)') IS NULL
 OR to_regprocedure('public.passport_check_guard()') IS NULL
 THEN RAISE EXCEPTION 'Passport prerequisite missing'; END IF;
 IF to_regclass('public.evidence_storage_quotas') IS NOT NULL
 OR EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profile_verification_checks' AND column_name='decision_reason')
 THEN RAISE EXCEPTION 'Already or partially applied; do not rerun blindly'; END IF;
END $guard$;
-- Identity checks are defense in depth, not proof of project identity.
-- Operator MUST confirm scaleScope-Staging / sopklyxvzmungxwgboqs.
-- PROPOSAL: local rehearsal only until hosted migration approval.
LOCK TABLE public.trust_evidence IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE public.evidence_storage_quotas (
 owner_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 retained_count bigint NOT NULL CHECK(retained_count>=0)
);
ALTER TABLE public.evidence_storage_quotas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.evidence_storage_quotas FROM PUBLIC,anon,authenticated,service_role;
INSERT INTO public.evidence_storage_quotas(owner_id,retained_count)
 SELECT owner_id,count(*) FROM public.trust_evidence GROUP BY owner_id;
CREATE FUNCTION public.enforce_evidence_storage_quota() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
   RAISE EXCEPTION 'Evidence ownership cannot be transferred' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
 ELSIF TG_OP='DELETE' THEN
  UPDATE public.evidence_storage_quotas SET retained_count=retained_count-1
   WHERE owner_id=OLD.owner_id AND retained_count>0;
  RETURN OLD;
 END IF;
 INSERT INTO public.evidence_storage_quotas(owner_id,retained_count)
 VALUES(NEW.owner_id,1)
 ON CONFLICT(owner_id) DO UPDATE SET retained_count=public.evidence_storage_quotas.retained_count+1
 WHERE public.evidence_storage_quotas.retained_count<50;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Evidence retained-file quota exceeded' USING ERRCODE='P0001';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_evidence_storage_quota() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER evidence_storage_quota_trg BEFORE INSERT OR DELETE OR UPDATE OF owner_id
 ON public.trust_evidence FOR EACH ROW EXECUTE FUNCTION public.enforce_evidence_storage_quota();

-- PROPOSAL ONLY: hosted execution requires approval.
ALTER TABLE public.profile_verification_checks ADD COLUMN decision_reason text;
ALTER TABLE public.profile_verification_checks ADD CONSTRAINT passport_reason_length
 CHECK (decision_reason IS NULL OR (passport_claim AND char_length(btrim(decision_reason)) BETWEEN 10 AND 700));
-- Revoke column privileges as well as table privileges for private reviewer feedback.
REVOKE ALL (decision_reason) ON public.profile_verification_checks FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.passport_review_metadata() RETURNS trigger
 LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NOT NEW.passport_claim THEN
  IF NEW.decision_reason IS NOT NULL THEN RAISE EXCEPTION 'Reason requires a Passport claim'; END IF;
  RETURN NEW;
 END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.decision_reason IS NOT NULL THEN RAISE EXCEPTION 'Undecided claim cannot have review feedback'; END IF;
  RETURN NEW;
 END IF;
 IF OLD.passport_state='in_review' AND NEW.passport_state IN ('supported','needs_changes','rejected') THEN
  NEW.decided_at:=clock_timestamp();
  NEW.expires_at:=CASE WHEN NEW.passport_state='supported' THEN NEW.decided_at+interval '30 days' ELSE NULL END;
  NEW.decision_reason:=nullif(btrim(NEW.decision_reason),'');
  IF NEW.passport_state IN ('needs_changes','rejected') AND
    (NEW.decision_reason IS NULL OR char_length(NEW.decision_reason)<10) THEN
   RAISE EXCEPTION 'Explain the correction or rejection in at least 10 characters' USING ERRCODE='23514';
  END IF;
 ELSIF NEW.decision_reason IS DISTINCT FROM OLD.decision_reason THEN
  RAISE EXCEPTION 'Review feedback cannot be rewritten' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.passport_review_metadata() FROM PUBLIC,anon,authenticated,service_role;
-- Alphabetical order ensures timestamps are set before passport_check_guard_trg.
CREATE TRIGGER a_passport_review_metadata_trg BEFORE INSERT OR UPDATE
 ON public.profile_verification_checks FOR EACH ROW EXECUTE FUNCTION public.passport_review_metadata();

DO $verify$
BEGIN
 IF EXISTS(
 SELECT 1 FROM (SELECT owner_id,count(*) AS actual FROM public.trust_evidence GROUP BY owner_id) e
 FULL JOIN public.evidence_storage_quotas q USING(owner_id)
 WHERE e.actual IS DISTINCT FROM q.retained_count
 ) THEN RAISE EXCEPTION 'Quota backfill mismatch'; END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.evidence_storage_quotas'::regclass)
 THEN RAISE EXCEPTION 'Quota RLS missing'; END IF;
 IF has_table_privilege('authenticated','public.evidence_storage_quotas','SELECT')
 OR has_table_privilege('service_role','public.evidence_storage_quotas','UPDATE')
 OR has_function_privilege('authenticated','public.passport_review_metadata()','EXECUTE')
 OR has_function_privilege('anon','public.enforce_evidence_storage_quota()','EXECUTE')
 THEN RAISE EXCEPTION 'Unexpected client/counter privileges'; END IF;
END $verify$;
ROLLBACK;
SELECT 'RELEASE_PATCH_REHEARSAL_PASS_ROLLED_BACK';
