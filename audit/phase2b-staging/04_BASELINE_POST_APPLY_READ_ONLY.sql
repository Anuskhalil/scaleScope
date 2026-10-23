-- Run ONLY in staging after 03 reports STAGING_BASELINE_APPLIED.
-- Read-only catalog checks. Not a replacement for complete Q01-Q12 parity.
SELECT jsonb_build_object(
 'public_tables', (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'),
 'public_tables_without_rls', (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity),
 'public_functions', (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f'),
 'policies', (SELECT count(*) FROM pg_policies WHERE schemaname IN ('public','storage')),
 'application_triggers', (SELECT count(*) FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND NOT t.tgisinternal),
 'private_buckets', (SELECT count(*) FROM storage.buckets WHERE NOT public),
 'public_buckets', (SELECT count(*) FROM storage.buckets WHERE public),
 'signup_trigger_enabled', EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='auth.users'::regclass AND tgname='on_auth_user_created' AND tgenabled='O' AND NOT tgisinternal),
 'ensure_rls_enabled', EXISTS(SELECT 1 FROM pg_event_trigger WHERE evtname='ensure_rls' AND evtenabled='O'),
 'realtime_membership', (SELECT coalesce(jsonb_agg(tablename ORDER BY tablename),'[]'::jsonb) FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public')
) AS baseline_post_apply;
