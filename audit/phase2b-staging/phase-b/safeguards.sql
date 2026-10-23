-- No raw evidence payload is accepted in new Passport check rows.
ALTER TABLE public.profile_verification_checks ADD CONSTRAINT passport_payload_minimal
 CHECK (NOT passport_claim OR (target_value IS NULL AND metadata='{}'::jsonb AND message IS NULL));
ALTER TABLE public.trust_evidence ADD CONSTRAINT passport_evidence_shape
 CHECK (NOT passport_private OR (sha256 ~ '^[a-f0-9]{64}$'));

-- Column ACLs survive table-level REVOKE, so revoke both explicitly.
DO $acls$
DECLARE tab text; cols text;
BEGIN
 FOREACH tab IN ARRAY ARRAY['profile_verifications','profile_verification_checks','trust_evidence'] LOOP
  SELECT string_agg(quote_ident(attname),',') INTO cols FROM pg_attribute
   WHERE attrelid=('public.'||tab)::regclass AND attnum>0 AND NOT attisdropped;
  EXECUTE format('REVOKE ALL (%s) ON public.%I FROM PUBLIC,anon,authenticated',cols,tab);
 END LOOP;
END $acls$;
REVOKE ALL ON public.trust_evidence FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.trust_evidence TO authenticated;
REVOKE TRUNCATE ON public.trust_evidence FROM service_role;
CREATE POLICY passport_evidence_owner_read ON public.trust_evidence AS RESTRICTIVE
 FOR SELECT TO authenticated USING (NOT passport_private OR (owner_id=(SELECT auth.uid()) AND deleted_at IS NULL));
CREATE POLICY passport_evidence_no_insert ON public.trust_evidence AS RESTRICTIVE
 FOR INSERT TO anon,authenticated WITH CHECK(false);
CREATE POLICY passport_evidence_no_update ON public.trust_evidence AS RESTRICTIVE
 FOR UPDATE TO anon,authenticated USING(false) WITH CHECK(false);
CREATE POLICY passport_evidence_no_delete ON public.trust_evidence AS RESTRICTIVE
 FOR DELETE TO anon,authenticated USING(false);

CREATE FUNCTION public.passport_audit_immutable() RETURNS trigger
 LANGUAGE plpgsql SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'Passport audit is append-only'; END $$;
REVOKE ALL ON FUNCTION public.passport_audit_immutable() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER passport_audit_immutable_trg BEFORE UPDATE OR DELETE OR TRUNCATE
 ON public.verification_audit_history FOR EACH STATEMENT EXECUTE FUNCTION public.passport_audit_immutable();

CREATE FUNCTION public.passport_evidence_tombstone() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.passport_private AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
  UPDATE public.profile_verification_checks c SET passport_state='stale'
   WHERE c.passport_claim AND c.passport_state IN
    ('submitted','in_review','supported','needs_changes','rejected') AND EXISTS
     (SELECT 1 FROM public.profile_verification_evidence l WHERE l.check_id=c.id AND l.evidence_id=NEW.id);
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.passport_evidence_tombstone() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER passport_evidence_tombstone_trg AFTER UPDATE OF deleted_at ON public.trust_evidence
 FOR EACH ROW EXECUTE FUNCTION public.passport_evidence_tombstone();

-- Predicate only, not a public DTO or badge. Expiry is enforced at read time too.
CREATE FUNCTION public.passport_claim_is_current(p_check uuid) RETURNS boolean
 LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT EXISTS (
  SELECT 1 FROM public.profile_verification_checks c
  JOIN public.profile_verifications h ON h.id=c.verification_id
  JOIN public.profiles p ON p.id=c.user_id
  WHERE c.id=p_check AND c.passport_claim AND c.passport_state='supported'
   AND c.expires_at>now() AND h.passport_opted_in_at IS NOT NULL
   AND p.deleted_at IS NULL AND p.user_type=c.role
   AND NOT EXISTS (SELECT 1 FROM public.profile_verification_checks newer
    WHERE newer.user_id=c.user_id AND newer.target_key=c.target_key AND newer.passport_claim
     AND newer.claim_version>c.claim_version)
   AND (c.source_kind<>'manual_evidence' OR EXISTS (
    SELECT 1 FROM public.profile_verification_evidence l JOIN public.trust_evidence e ON e.id=l.evidence_id
    WHERE l.check_id=c.id AND e.passport_private AND e.deleted_at IS NULL AND e.owner_id=c.user_id))
   AND NOT EXISTS (SELECT 1 FROM public.profile_verification_evidence l
    JOIN public.trust_evidence e ON e.id=l.evidence_id
    WHERE l.check_id=c.id AND (e.deleted_at IS NOT NULL OR NOT e.passport_private))
 );
$$;
REVOKE ALL ON FUNCTION public.passport_claim_is_current(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.passport_claim_is_current(uuid) TO service_role;
