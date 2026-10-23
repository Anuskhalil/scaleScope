-- PROPOSAL ONLY. DO NOT RUN WITHOUT APPROVAL AND APPLICATION ROLLOUT GATES.
-- Snapshot basis: Q01-Q12 supplied CSVs. No legacy rows promoted/backfilled.
-- One-shot migration; absence of IF NOT EXISTS deliberately detects drift.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
DO $$
BEGIN
 IF current_user <> 'postgres' THEN RAISE EXCEPTION 'Reviewed postgres migration owner required'; END IF;
 IF to_regclass('public.profile_verifications') IS NULL
 OR to_regclass('public.profile_verification_checks') IS NULL
 OR to_regclass('public.trust_evidence') IS NULL THEN
  RAISE EXCEPTION 'Live baseline missing; do not create replacement tables';
 END IF;
END $$;

-- Existing per-user header remains the header, not a new request table.
ALTER TABLE public.profile_verifications
 ADD COLUMN passport_opted_in_at timestamptz;

-- Existing per-field checks carry versioned claim requests.
-- Existing status/score retain legacy meaning; passport_state is independent.
ALTER TABLE public.profile_verification_checks
 ADD COLUMN passport_claim boolean NOT NULL DEFAULT false,
 ADD COLUMN claim_kind text,
 ADD COLUMN claim_version integer,
 ADD COLUMN claim_value_hash text,
 ADD COLUMN passport_state text,
 ADD COLUMN submitted_at timestamptz,
 ADD COLUMN decided_at timestamptz,
 ADD COLUMN expires_at timestamptz,
 ADD COLUMN decision_actor uuid,
 ADD COLUMN source_kind text,
 ADD CONSTRAINT passport_claim_shape CHECK (
  (NOT passport_claim AND claim_kind IS NULL AND claim_version IS NULL
   AND claim_value_hash IS NULL AND passport_state IS NULL
   AND submitted_at IS NULL AND decided_at IS NULL AND expires_at IS NULL
   AND decision_actor IS NULL AND source_kind IS NULL)
  OR
  (passport_claim AND verification_id IS NOT NULL
   AND role IN ('early-stage-founder','investor')
   AND claim_kind IS NOT NULL AND claim_kind IN
    ('account_control','professional','education','startup','firm','traction','investment_history')
   AND claim_version IS NOT NULL AND claim_version > 0
   AND claim_value_hash IS NOT NULL AND claim_value_hash ~ '^[a-f0-9]{64}$'
   AND passport_state IS NOT NULL AND passport_state IN
    ('submitted','in_review','supported','needs_changes','rejected','stale','revoked','expired')
   AND submitted_at IS NOT NULL
   AND status = 'skipped' AND score = 0
   AND (passport_state NOT IN ('supported','needs_changes','rejected')
     OR (decision_actor IS NOT NULL AND decided_at IS NOT NULL
       AND decision_actor <> user_id AND source_kind IS NOT NULL))
   AND (passport_state <> 'supported'
     OR (expires_at IS NOT NULL AND expires_at > decided_at))
   AND (source_kind IS NULL OR source_kind IN
     ('manual_evidence','authoritative_source','oauth_control','email_control')))
 );
CREATE UNIQUE INDEX passport_claim_version_uq
 ON public.profile_verification_checks(user_id,target_key,claim_version)
 WHERE passport_claim;
CREATE INDEX passport_queue_idx
 ON public.profile_verification_checks(passport_state,submitted_at)
 WHERE passport_claim;
CREATE INDEX passport_summary_idx
 ON public.profile_verification_checks(user_id,expires_at)
 WHERE passport_claim AND passport_state='supported';

ALTER TABLE public.trust_evidence
 ADD COLUMN passport_private boolean NOT NULL DEFAULT false,
 ADD COLUMN deleted_at timestamptz;

-- New relation only: many claims to many existing evidence objects.
CREATE TABLE public.profile_verification_evidence (
 check_id uuid NOT NULL REFERENCES public.profile_verification_checks(id) ON DELETE CASCADE,
 evidence_id uuid NOT NULL REFERENCES public.trust_evidence(id) ON DELETE RESTRICT,
 linked_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(check_id,evidence_id)
);
CREATE INDEX passport_evidence_reverse_idx
 ON public.profile_verification_evidence(evidence_id);

-- No FK cascades: decision provenance survives profile/check/evidence deletion.
-- No raw evidence/target/email/provider payloads here. Retention is separate policy.
CREATE TABLE public.verification_audit_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 check_id uuid NOT NULL,
 subject_id uuid NOT NULL,
 event text NOT NULL CHECK(event IN ('submitted','transition','deleted','evidence_linked','evidence_unlinked')),
 old_state text,
 new_state text,
 actor_id uuid,
 claim_value_hash text,
 evidence_id uuid,
 evidence_sha256 text,
 recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX passport_audit_subject_idx ON public.verification_audit_logs(subject_id,recorded_at);
ALTER TABLE public.profile_verification_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profile_verification_evidence,public.verification_audit_logs FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.profile_verification_evidence,public.verification_audit_logs FROM service_role;
GRANT SELECT,INSERT,DELETE ON public.profile_verification_evidence TO service_role;
GRANT SELECT ON public.verification_audit_logs TO service_role;
-- No browser policies: these tables are backend-only. service_role bypasses RLS.
-- Audit INSERT performed only by fixed-path trigger, not client supplied logs.

CREATE FUNCTION public.passport_check_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE parent public.profile_verifications; previous integer;
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.passport_claim THEN
   INSERT INTO public.verification_audit_logs(check_id,subject_id,event,old_state,claim_value_hash)
   VALUES(OLD.id,OLD.user_id,'deleted',OLD.passport_state,OLD.claim_value_hash);
  END IF;
  RETURN OLD;
 END IF;
 IF TG_OP='UPDATE' AND OLD.passport_claim IS DISTINCT FROM NEW.passport_claim THEN
  RAISE EXCEPTION 'Legacy rows cannot be promoted or passport rows downgraded';
 END IF;
 IF NOT NEW.passport_claim THEN RETURN NEW; END IF;
 SELECT * INTO parent FROM public.profile_verifications
 WHERE id=NEW.verification_id FOR UPDATE;
 IF NOT FOUND OR parent.user_id<>NEW.user_id OR parent.role<>NEW.role
   OR parent.passport_opted_in_at IS NULL THEN
  RAISE EXCEPTION 'Missing consent or mismatched verification owner/role';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=NEW.user_id
   AND p.user_type=NEW.role AND p.deleted_at IS NULL) THEN
  RAISE EXCEPTION 'Active role required';
 END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.passport_state<>'submitted' OR NEW.decision_actor IS NOT NULL
    OR NEW.decided_at IS NOT NULL OR NEW.expires_at IS NOT NULL THEN
   RAISE EXCEPTION 'New claims must be undecided';
  END IF;
  SELECT coalesce(max(claim_version),0) INTO previous
   FROM public.profile_verification_checks
   WHERE user_id=NEW.user_id AND target_key=NEW.target_key AND passport_claim;
  IF NEW.claim_version<>previous+1 THEN RAISE EXCEPTION 'Claim version conflict'; END IF;
  INSERT INTO public.verification_audit_logs(check_id,subject_id,event,new_state,claim_value_hash)
   VALUES(NEW.id,NEW.user_id,'submitted',NEW.passport_state,NEW.claim_value_hash);
 ELSE
  IF ROW(NEW.user_id,NEW.verification_id,NEW.role,NEW.target_key,NEW.target_value,
    NEW.claim_kind,NEW.claim_version,NEW.claim_value_hash,NEW.submitted_at)
   IS DISTINCT FROM ROW(OLD.user_id,OLD.verification_id,OLD.role,OLD.target_key,OLD.target_value,
    OLD.claim_kind,OLD.claim_version,OLD.claim_value_hash,OLD.submitted_at) THEN
   RAISE EXCEPTION 'Submit a new version; claim content is immutable';
  END IF;
  IF NEW.passport_state=OLD.passport_state AND
    ROW(NEW.decision_actor,NEW.decided_at,NEW.expires_at,NEW.source_kind)
    IS DISTINCT FROM ROW(OLD.decision_actor,OLD.decided_at,OLD.expires_at,OLD.source_kind) THEN
   RAISE EXCEPTION 'Decision details cannot be silently rewritten';
  END IF;
  IF NEW.passport_state IS DISTINCT FROM OLD.passport_state THEN
   IF NOT (
    (OLD.passport_state='submitted' AND NEW.passport_state IN ('in_review','stale','revoked')) OR
    (OLD.passport_state='in_review' AND NEW.passport_state IN ('supported','needs_changes','rejected','stale','revoked')) OR
    (OLD.passport_state='supported' AND NEW.passport_state IN ('stale','revoked','expired')) OR
    (OLD.passport_state IN ('needs_changes','rejected') AND NEW.passport_state IN ('stale','revoked'))
   ) THEN RAISE EXCEPTION 'Invalid claim transition'; END IF;
   IF NEW.passport_state='supported' AND NEW.source_kind='manual_evidence'
    AND NOT EXISTS(SELECT 1 FROM public.profile_verification_evidence l
     JOIN public.trust_evidence e ON e.id=l.evidence_id
     WHERE l.check_id=NEW.id AND e.passport_private AND e.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Manual support requires current private evidence';
   END IF;
   INSERT INTO public.verification_audit_logs(check_id,subject_id,event,old_state,new_state,actor_id,claim_value_hash)
    VALUES(NEW.id,NEW.user_id,'transition',OLD.passport_state,NEW.passport_state,
     CASE WHEN NEW.passport_state IN ('supported','needs_changes','rejected') THEN NEW.decision_actor END,
     NEW.claim_value_hash);
  END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.passport_check_guard() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER passport_check_guard_trg
 BEFORE INSERT OR UPDATE OR DELETE ON public.profile_verification_checks
 FOR EACH ROW EXECUTE FUNCTION public.passport_check_guard();

CREATE FUNCTION public.passport_evidence_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.passport_private IS DISTINCT FROM OLD.passport_private THEN
   RAISE EXCEPTION 'Upload fresh private evidence; purpose cannot be converted';
  END IF;
  IF OLD.passport_private AND
   ROW(NEW.owner_id,NEW.object_path,NEW.sha256,NEW.byte_size,NEW.mime_type)
   IS DISTINCT FROM ROW(OLD.owner_id,OLD.object_path,OLD.sha256,OLD.byte_size,OLD.mime_type) THEN
   RAISE EXCEPTION 'Evidence provenance is immutable';
  END IF;
  IF OLD.passport_private AND OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
   RAISE EXCEPTION 'Deleted evidence cannot be restored silently';
  END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.passport_evidence_guard() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER passport_evidence_guard_trg
 BEFORE UPDATE ON public.trust_evidence FOR EACH ROW EXECUTE FUNCTION public.passport_evidence_guard();

CREATE FUNCTION public.passport_no_sharing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE private_evidence boolean;
BEGIN
 SELECT passport_private INTO private_evidence FROM public.trust_evidence
 WHERE id=NEW.evidence_id FOR UPDATE;
 IF private_evidence THEN RAISE EXCEPTION 'Passport evidence cannot be shared'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.passport_no_sharing() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER passport_no_sharing_trg
 BEFORE INSERT OR UPDATE ON public.evidence_grants
 FOR EACH ROW EXECUTE FUNCTION public.passport_no_sharing();

CREATE FUNCTION public.passport_link_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.profile_verification_checks; e public.trust_evidence;
BEGIN
 IF TG_OP='DELETE' THEN
  SELECT * INTO c FROM public.profile_verification_checks WHERE id=OLD.check_id;
  IF FOUND THEN
   IF c.passport_state='supported' THEN RAISE EXCEPTION 'Revoke claim before unlinking evidence'; END IF;
   INSERT INTO public.verification_audit_logs(check_id,subject_id,event,evidence_id)
    VALUES(c.id,c.user_id,'evidence_unlinked',OLD.evidence_id);
  END IF;
  RETURN OLD;
 END IF;
 SELECT * INTO c FROM public.profile_verification_checks WHERE id=NEW.check_id FOR UPDATE;
 SELECT * INTO e FROM public.trust_evidence WHERE id=NEW.evidence_id FOR UPDATE;
 IF c.id IS NULL OR e.id IS NULL OR NOT c.passport_claim
   OR c.passport_state NOT IN ('submitted','in_review')
   OR c.user_id<>e.owner_id OR NOT e.passport_private OR e.deleted_at IS NOT NULL THEN
  RAISE EXCEPTION 'Evidence must be private, current and owned by this claim owner';
 END IF;
 INSERT INTO public.verification_audit_logs(check_id,subject_id,event,evidence_id,evidence_sha256)
  VALUES(c.id,c.user_id,'evidence_linked',e.id,e.sha256);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.passport_link_guard() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER passport_link_guard_trg BEFORE INSERT OR DELETE
 ON public.profile_verification_evidence FOR EACH ROW EXECUTE FUNCTION public.passport_link_guard();

-- Keep existing owner SELECT policies; block browser writes even if a future
-- permissive write policy is accidentally added. New internal data is API-only.
REVOKE ALL ON public.profile_verifications,public.profile_verification_checks FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.profile_verifications,public.profile_verification_checks TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.profile_verifications,public.profile_verification_checks TO service_role;
REVOKE TRUNCATE ON public.profile_verifications,public.profile_verification_checks FROM service_role;
CREATE POLICY passport_header_no_insert ON public.profile_verifications AS RESTRICTIVE FOR INSERT TO anon,authenticated WITH CHECK(false);
CREATE POLICY passport_header_no_update ON public.profile_verifications AS RESTRICTIVE FOR UPDATE TO anon,authenticated USING(false) WITH CHECK(false);
CREATE POLICY passport_header_no_delete ON public.profile_verifications AS RESTRICTIVE FOR DELETE TO anon,authenticated USING(false);
CREATE POLICY passport_checks_no_insert ON public.profile_verification_checks AS RESTRICTIVE FOR INSERT TO anon,authenticated WITH CHECK(false);
CREATE POLICY passport_checks_no_update ON public.profile_verification_checks AS RESTRICTIVE FOR UPDATE TO anon,authenticated USING(false) WITH CHECK(false);
CREATE POLICY passport_checks_no_delete ON public.profile_verification_checks AS RESTRICTIVE FOR DELETE TO anon,authenticated USING(false);
-- Claim rows served by owner-safe DTO, not direct SELECT *. Legacy reads preserved.
CREATE POLICY passport_checks_api_read ON public.profile_verification_checks AS RESTRICTIVE
 FOR SELECT TO authenticated USING(NOT passport_claim);

COMMIT;
