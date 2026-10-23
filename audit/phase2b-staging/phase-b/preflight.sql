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
