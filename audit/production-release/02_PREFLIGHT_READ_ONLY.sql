-- Production read-only baseline check; verify dashboard project reference.
BEGIN TRANSACTION READ ONLY;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='120s';
SET LOCAL search_path=pg_catalog,public,extensions;
DO $guard$ BEGIN
 IF current_user <> 'postgres' THEN RAISE EXCEPTION 'Migration owner must be postgres'; END IF;
 IF to_regclass('public.verification_audit_history') IS NOT NULL
 OR to_regclass('public.evidence_storage_quotas') IS NOT NULL
 OR EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public'
 AND table_name='profile_verification_checks' AND column_name='passport_claim') THEN
 RAISE EXCEPTION 'Unexpected prior/partial migration'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class WHERE oid IN ('public.profile_verifications'::regclass,
 'public.profile_verification_checks'::regclass,'public.trust_evidence'::regclass) AND NOT relrowsecurity)
 THEN RAISE EXCEPTION 'RLS baseline missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='trust-evidence' AND NOT public AND file_size_limit=5242880)
 THEN RAISE EXCEPTION 'Private evidence bucket baseline differs'; END IF;
END $guard$;
ROLLBACK;
SELECT 'PRODUCTION_PREFLIGHT_PASS';
