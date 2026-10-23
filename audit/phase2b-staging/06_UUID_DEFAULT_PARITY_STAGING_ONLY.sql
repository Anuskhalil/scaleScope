-- STAGING ONLY: sopklyxvzmungxwgboqs. Confirm Dashboard project URL first.
-- Correct only the 35 defaults from the supplied production/staging CSVs.
-- No rows/IDs are rewritten. No Auth ownership or security privileges changed.
-- Deliberately refuses already-corrected or unexpected schemas.
BEGIN;
SET LOCAL search_path = pg_catalog;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
DO $uuid_parity$
DECLARE
  v_name text;
  v_default text;
  v_names text[] := ARRAY[
    'ai_growth_plans',
    'audit_log',
    'connected_identity_accounts',
    'connection_requests',
    'connections',
    'conversation_members',
    'conversation_participants',
    'conversations',
    'evidence_reviews',
    'founder_profiles',
    'interaction_history',
    'investor_profiles',
    'match_feedback',
    'match_outcomes',
    'matching_events',
    'meeting_participants',
    'meetings',
    'mentor_profiles',
    'mentorship_milestones',
    'messages',
    'opportunities',
    'profile_evidence_files',
    'profile_review_history',
    'profile_verification_checks',
    'profile_verifications',
    'roadmap_tasks',
    'skill_taxonomy',
    'startup_readiness_scores',
    'student_activities',
    'student_profiles',
    'subscription_plans',
    'trust_evidence',
    'trust_scores',
    'usage_counters',
    'user_subscriptions'
  ];
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Use postgres in the isolated staging SQL Editor';
  END IF;
  IF to_regprocedure('pg_catalog.gen_random_uuid()') IS NULL THEN
    RAISE EXCEPTION 'Required built-in UUID function missing';
  END IF;
  -- Validate every target before altering any default. Current production fails this guard.
  FOREACH v_name IN ARRAY v_names LOOP
    EXECUTE format('LOCK TABLE public.%I IN ACCESS EXCLUSIVE MODE', v_name);
    SELECT pg_get_expr(ad.adbin, ad.adrelid) INTO v_default
    FROM pg_attrdef ad
    JOIN pg_class c ON c.oid=ad.adrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=ad.adnum
    WHERE n.nspname='public' AND c.relname=v_name AND a.attname='id';
    IF v_default IS DISTINCT FROM 'extensions.gen_random_uuid()' THEN
      RAISE EXCEPTION 'STOP: unexpected default on %.id: %. Wrong target or already corrected.',
        v_name, coalesce(v_default, '<missing>');
    END IF;
  END LOOP;
  SELECT pg_get_expr(ad.adbin, ad.adrelid) INTO v_default
  FROM pg_attrdef ad JOIN pg_class c ON c.oid=ad.adrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace
  JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=ad.adnum
  WHERE n.nspname='public' AND c.relname='user_auth_tracking' AND a.attname='id';
  IF v_default IS DISTINCT FROM 'extensions.uuid_generate_v4()' THEN
    RAISE EXCEPTION 'Unexpected user_auth_tracking default; stop for review';
  END IF;
  FOREACH v_name IN ARRAY v_names LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN id SET DEFAULT pg_catalog.gen_random_uuid()', v_name);
  END LOOP;
  FOREACH v_name IN ARRAY v_names LOOP
    SELECT pg_get_expr(ad.adbin, ad.adrelid) INTO v_default
    FROM pg_attrdef ad JOIN pg_class c ON c.oid=ad.adrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=ad.adnum
    WHERE n.nspname='public' AND c.relname=v_name AND a.attname='id';
    IF v_default IS DISTINCT FROM 'gen_random_uuid()' THEN
      RAISE EXCEPTION 'UUID default correction failed on %', v_name;
    END IF;
  END LOOP;
END;
$uuid_parity$;
COMMIT;
VALUES ('STAGING_UUID_DEFAULTS_ALIGNED_35');
