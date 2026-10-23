-- PROPOSAL ONLY. EMPTY-STATE rollback; refuses to destroy passport data.
-- Disable future passport endpoints first. Never use CASCADE or drop audit data
-- after launch. Nonempty rollback = retain schema, disable feature, forward fix.
-- Security hardening is intentionally NOT reverted to unsafe broad privileges.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.profile_verification_checks WHERE passport_claim)
 OR EXISTS(SELECT 1 FROM public.profile_verifications WHERE passport_opted_in_at IS NOT NULL)
 OR EXISTS(SELECT 1 FROM public.trust_evidence WHERE passport_private)
 OR EXISTS(SELECT 1 FROM public.profile_verification_evidence)
 OR EXISTS(SELECT 1 FROM public.verification_audit_logs) THEN
  RAISE EXCEPTION 'Nonempty passport state: retain data/schema; disable feature and forward-fix';
 END IF;
END $$;
DROP TRIGGER passport_link_guard_trg ON public.profile_verification_evidence;
DROP TRIGGER passport_no_sharing_trg ON public.evidence_grants;
DROP TRIGGER passport_evidence_guard_trg ON public.trust_evidence;
DROP TRIGGER passport_check_guard_trg ON public.profile_verification_checks;
DROP FUNCTION public.passport_link_guard();
DROP FUNCTION public.passport_no_sharing();
DROP FUNCTION public.passport_evidence_guard();
DROP FUNCTION public.passport_check_guard();
DROP POLICY passport_checks_api_read ON public.profile_verification_checks;
-- Keep no-write policies and narrowed ACLs as security improvements.
DROP TABLE public.profile_verification_evidence;
DROP TABLE public.verification_audit_logs;
DROP INDEX public.passport_claim_version_uq;
DROP INDEX public.passport_queue_idx;
DROP INDEX public.passport_summary_idx;
ALTER TABLE public.profile_verification_checks DROP CONSTRAINT passport_claim_shape,
 DROP COLUMN passport_claim, DROP COLUMN claim_kind, DROP COLUMN claim_version,
 DROP COLUMN claim_value_hash, DROP COLUMN passport_state, DROP COLUMN submitted_at,
 DROP COLUMN decided_at, DROP COLUMN expires_at, DROP COLUMN decision_actor,
 DROP COLUMN source_kind;
ALTER TABLE public.trust_evidence DROP COLUMN passport_private, DROP COLUMN deleted_at;
ALTER TABLE public.profile_verifications DROP COLUMN passport_opted_in_at;
ROLLBACK; -- Preview by default; change to COMMIT only after explicit rollback approval.
