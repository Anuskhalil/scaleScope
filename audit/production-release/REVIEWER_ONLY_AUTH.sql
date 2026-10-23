-- Manually reviewed migration. No users created; existing profiles stay unchanged.
-- Main project only. Back up function definitions before execution.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $migration$
DECLARE definition text; fragment text;
BEGIN
 definition := pg_get_functiondef('public.handle_new_user()'::regprocedure);
 IF position('reviewer_only' in definition)>0 THEN RAISE EXCEPTION 'Reviewer migration already applied; stop'; END IF;
 IF definition !~ 'BEGIN[[:space:]]+v_full_name' THEN RAISE EXCEPTION 'Unexpected signup function; inspect before changing'; END IF;
 -- app_metadata is server-controlled; never trust raw_user_meta_data for this.
 definition := regexp_replace(definition,'BEGIN([[:space:]]+)v_full_name',
 'BEGIN\1IF NEW.raw_app_meta_data @> ''{"reviewer_only":true}''::jsonb THEN RETURN NEW; END IF;\1v_full_name');
 EXECUTE definition;
 definition := pg_get_functiondef('public.passport_check_guard()'::regprocedure);
 fragment := 'IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=NEW.decision_actor';
 IF position(fragment in definition)=0 THEN RAISE EXCEPTION 'Unexpected Passport guard; inspect before changing'; END IF;
 definition := replace(definition,fragment,
 'IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id=NEW.decision_actor AND u.email_confirmed_at IS NOT NULL AND u.raw_app_meta_data @> ''{"reviewer_only":true}''::jsonb) AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=NEW.decision_actor');
 EXECUTE definition;
END $migration$;
COMMIT;
SELECT 'REVIEWER_ONLY_AUTH_APPLIED';
