-- STAGING ONLY: sopklyxvzmungxwgboqs. NEVER production.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='120s';
SET LOCAL search_path=pg_catalog,public,extensions;
-- These synthetic identities are an additional guard, NOT cryptographic project identity.
-- The operator must verify the Dashboard project reference before running.
DO $preflight$
DECLARE n integer;
BEGIN
 IF current_user <> 'postgres' THEN RAISE EXCEPTION 'Run with reviewed migration owner postgres'; END IF;
 SELECT count(*) INTO n FROM public.profiles p JOIN (VALUES
  ('42fce0f8-b0d3-41a9-b246-2d4a5def266e'::uuid,'passport-founder@example.invalid','early-stage-founder'),
  ('3ec91991-f475-4f07-a038-e2a7e1c8b24d'::uuid,'passport-investor@example.invalid','investor'),
  ('8acd8892-8651-423c-ab8b-71437492f02b'::uuid,'passport-reviewer@example.invalid','early-stage-founder')
 ) AS fixtures(id,email,role) ON p.id=fixtures.id AND p.email=fixtures.email AND p.user_type=fixtures.role;
 IF n<>3 THEN RAISE EXCEPTION 'Wrong target: three known staging identities required'; END IF;
 IF EXISTS (SELECT 1 FROM public.profiles WHERE email NOT IN
  ('passport-founder@example.invalid','passport-investor@example.invalid','passport-reviewer@example.invalid'))
 THEN RAISE EXCEPTION 'Synthetic-only staging required'; END IF;
 IF to_regclass('public.verification_audit_history') IS NOT NULL
 OR to_regclass('public.profile_verification_evidence') IS NOT NULL
 OR EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public'
   AND table_name='profile_verification_checks' AND column_name='passport_claim')
 THEN RAISE EXCEPTION 'One-shot migration already applied or partial schema drift'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class WHERE oid IN
  ('public.profile_verifications'::regclass,'public.profile_verification_checks'::regclass,
   'public.trust_evidence'::regclass,'public.evidence_grants'::regclass)
  AND NOT relrowsecurity) THEN RAISE EXCEPTION 'Baseline RLS drift'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='trust-evidence' AND NOT public
   AND file_size_limit=5242880) THEN RAISE EXCEPTION 'Private evidence bucket baseline drift'; END IF;
END $preflight$;
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
CREATE TABLE public.verification_audit_history (
 id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
 check_id uuid NOT NULL,
 subject_id uuid NOT NULL,
 event text NOT NULL CHECK(event IN ('submitted','transition','deleted','evidence_linked','evidence_unlinked')),
 old_state text,
 new_state text,
 actor_id uuid,
 claim_value_hash text,
 evidence_id uuid,
 evidence_sha256 text,
 claim_version integer,
 target_key_hash text,
 recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX passport_audit_subject_idx ON public.verification_audit_history(subject_id,recorded_at);
ALTER TABLE public.profile_verification_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_audit_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profile_verification_evidence,public.verification_audit_history FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.profile_verification_evidence,public.verification_audit_history FROM service_role;
GRANT SELECT,INSERT,DELETE ON public.profile_verification_evidence TO service_role;
GRANT SELECT ON public.verification_audit_history TO service_role;
-- No browser policies: these tables are backend-only. service_role bypasses RLS.
-- Audit INSERT performed only by fixed-path trigger, not client supplied logs.

CREATE FUNCTION public.passport_check_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE parent public.profile_verifications; previous integer;
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.passport_claim THEN
   IF EXISTS(SELECT 1 FROM public.profile_verifications WHERE id=OLD.verification_id) THEN
    RAISE EXCEPTION 'Revoke or stale Passport claims; do not delete retained claim history';
   END IF;
   INSERT INTO public.verification_audit_history(check_id,subject_id,event,old_state,claim_value_hash)
   VALUES(OLD.id,OLD.user_id,'deleted',OLD.passport_state,OLD.claim_value_hash);
  END IF;
  RETURN OLD;
 END IF;
 IF TG_OP='UPDATE' AND OLD.passport_claim IS DISTINCT FROM NEW.passport_claim THEN
  RAISE EXCEPTION 'Legacy rows cannot be promoted or passport rows downgraded';
 END IF;
 IF NOT NEW.passport_claim THEN RETURN NEW; END IF;
 IF NEW.decision_actor=NEW.user_id THEN RAISE EXCEPTION 'Self review forbidden'; END IF;
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
    OR NEW.decided_at IS NOT NULL OR NEW.expires_at IS NOT NULL OR NEW.source_kind IS NOT NULL THEN
   RAISE EXCEPTION 'New claims must be undecided';
  END IF;
  SELECT coalesce(max(a.claim_version),0) INTO previous
   FROM public.verification_audit_history a
   WHERE a.subject_id=NEW.user_id
     AND a.target_key_hash=encode(extensions.digest(NEW.target_key,'sha256'),'hex');
  IF NEW.claim_version<>previous+1 THEN RAISE EXCEPTION 'Claim version conflict'; END IF;
  INSERT INTO public.verification_audit_history
   (check_id,subject_id,event,new_state,claim_value_hash,claim_version,target_key_hash)
   VALUES(NEW.id,NEW.user_id,'submitted',NEW.passport_state,NEW.claim_value_hash,
     NEW.claim_version,encode(extensions.digest(NEW.target_key,'sha256'),'hex'));
  UPDATE public.profile_verification_checks SET passport_state='stale'
   WHERE user_id=NEW.user_id AND target_key=NEW.target_key AND passport_claim
    AND passport_state IN ('submitted','in_review','supported','needs_changes','rejected');
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
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.check_type IS DISTINCT FROM OLD.check_type
    OR NEW.target_label IS DISTINCT FROM OLD.target_label
    OR NEW.metadata IS DISTINCT FROM OLD.metadata THEN
   RAISE EXCEPTION 'Passport identity and payload are immutable';
  END IF;
  IF NEW.passport_state IN ('submitted','in_review') AND
    (NEW.decision_actor IS NOT NULL OR NEW.decided_at IS NOT NULL
     OR NEW.expires_at IS NOT NULL OR NEW.source_kind IS NOT NULL) THEN
   RAISE EXCEPTION 'Undecided claim cannot contain a decision';
  END IF;
  IF NEW.passport_state IS DISTINCT FROM OLD.passport_state THEN
   IF NEW.passport_state IN ('stale','revoked','expired') AND
    ROW(NEW.decision_actor,NEW.decided_at,NEW.expires_at,NEW.source_kind)
     IS DISTINCT FROM ROW(OLD.decision_actor,OLD.decided_at,OLD.expires_at,OLD.source_kind) THEN
    RAISE EXCEPTION 'Invalidation must preserve the prior decision';
   END IF;
   IF NEW.passport_state='expired' AND OLD.expires_at > clock_timestamp() THEN
    RAISE EXCEPTION 'Claim has not expired yet';
   END IF;
   IF NEW.passport_state IN ('supported','needs_changes','rejected') THEN
    IF NEW.decided_at IS NULL OR NEW.decided_at < NEW.submitted_at
       OR NEW.decided_at > clock_timestamp() THEN
     RAISE EXCEPTION 'Invalid decision timestamp';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=NEW.decision_actor
                    AND p.deleted_at IS NULL) THEN
     RAISE EXCEPTION 'Active decision actor required';
    END IF;
   END IF;
   IF NEW.passport_state='supported' AND NEW.expires_at <= clock_timestamp() THEN
    RAISE EXCEPTION 'Supported claim must have future expiry';
   END IF;
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
   INSERT INTO public.verification_audit_history(check_id,subject_id,event,old_state,new_state,actor_id,claim_value_hash)
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
   ROW(NEW.id,NEW.owner_id,NEW.object_path,NEW.sha256,NEW.byte_size,NEW.mime_type,NEW.category,NEW.title,NEW.claim,NEW.created_at)
   IS DISTINCT FROM ROW(OLD.id,OLD.owner_id,OLD.object_path,OLD.sha256,OLD.byte_size,OLD.mime_type,OLD.category,OLD.title,OLD.claim,OLD.created_at) THEN
   RAISE EXCEPTION 'Evidence provenance is immutable';
  END IF;
  IF OLD.passport_private AND OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
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
   IF c.passport_state NOT IN ('submitted','in_review') THEN RAISE EXCEPTION 'Reviewed evidence links are immutable'; END IF;
   INSERT INTO public.verification_audit_history(check_id,subject_id,event,evidence_id)
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
 INSERT INTO public.verification_audit_history(check_id,subject_id,event,evidence_id,evidence_sha256)
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
DO $postflight$
DECLARE tab text; role_name text; func text;
BEGIN
 FOREACH tab IN ARRAY ARRAY['profile_verifications','profile_verification_checks','trust_evidence',
  'profile_verification_evidence','verification_audit_history'] LOOP
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=('public.'||tab)::regclass)
   THEN RAISE EXCEPTION 'RLS missing: %',tab; END IF;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF has_table_privilege(role_name,'public.'||tab,'INSERT,UPDATE,DELETE,TRUNCATE')
    OR has_any_column_privilege(role_name,'public.'||tab,'INSERT,UPDATE')
    THEN RAISE EXCEPTION 'Browser write privilege: % %',role_name,tab; END IF;
  END LOOP;
 END LOOP;
 IF has_table_privilege('service_role','public.verification_audit_history','INSERT,UPDATE,DELETE,TRUNCATE')
 THEN RAISE EXCEPTION 'Audit direct write grant'; END IF;
 FOREACH func IN ARRAY ARRAY['passport_check_guard()','passport_link_guard()',
  'passport_evidence_guard()','passport_no_sharing()','passport_evidence_tombstone()',
  'passport_audit_immutable()','passport_claim_is_current(uuid)'] LOOP
  IF has_function_privilege('anon','public.'||func,'EXECUTE') OR
   has_function_privilege('authenticated','public.'||func,'EXECUTE')
  THEN RAISE EXCEPTION 'Browser function grant: %',func; END IF;
 END LOOP;
 IF to_regclass('public.passport_claim_version_uq') IS NULL OR
    to_regclass('public.passport_evidence_reverse_idx') IS NULL THEN
  RAISE EXCEPTION 'Missing Passport indexes'; END IF;
 IF EXISTS(SELECT 1 FROM public.profile_verification_checks WHERE passport_claim)
 OR EXISTS(SELECT 1 FROM public.profile_verifications WHERE passport_opted_in_at IS NOT NULL)
 OR EXISTS(SELECT 1 FROM public.verification_audit_history)
 THEN RAISE EXCEPTION 'Migration must not populate or promote Passport claims'; END IF;
END $postflight$;

SAVEPOINT smoke;
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

ROLLBACK TO SAVEPOINT smoke;
ROLLBACK;
VALUES ('PHASE_B_REHEARSAL_PASS_ROLLED_BACK');
