-- Production read-only inventory. No user rows, credentials or Storage bytes.
BEGIN TRANSACTION READ ONLY;
SELECT jsonb_build_object(
 'tables', (SELECT jsonb_agg(jsonb_build_object('name',c.relname,'rls',c.relrowsecurity) ORDER BY c.relname)
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind='r'),
 'functions', (SELECT jsonb_agg(jsonb_build_object('name',p.proname,
   'arguments',pg_get_function_identity_arguments(p.oid),
   'security_definer',p.prosecdef,'settings',p.proconfig,
   'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),
   'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE')) ORDER BY p.proname,p.oid)
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'),
 'policies', (SELECT jsonb_agg(to_jsonb(p)) FROM pg_policies p WHERE schemaname IN ('public','storage')),
 'buckets', (SELECT jsonb_agg(jsonb_build_object('id',id,'public',public,
   'file_size_limit',file_size_limit,'allowed_mime_types',allowed_mime_types)) FROM storage.buckets),
 'passport_columns', (SELECT jsonb_agg(jsonb_build_object('table',table_name,'column',column_name,
   'type',data_type,'nullable',is_nullable) ORDER BY table_name,ordinal_position)
   FROM information_schema.columns WHERE table_schema='public' AND table_name IN
   ('profile_verifications','profile_verification_checks','trust_evidence',
    'profile_verification_evidence','verification_audit_history','evidence_storage_quotas'))
) AS release_inventory;
COMMIT;
