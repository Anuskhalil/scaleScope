-- PROPOSAL ONLY: hosted execution requires approval.
BEGIN;
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
COMMIT;

