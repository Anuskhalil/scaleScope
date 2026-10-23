SELECT
 to_regclass('public.evidence_storage_quotas') IS NOT NULL AS quota_table,
 EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='evidence_storage_quota_trg' AND tgenabled='O') AS quota_trigger,
 EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='a_passport_review_metadata_trg' AND tgenabled='O') AS review_trigger,
 EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profile_verification_checks' AND column_name='decision_reason') AS reason_column;
