-- Read-only: capture on staging before/after migration. Do not run proposal files.
SELECT p.oid::regprocedure::text AS signature,
 pg_get_userbyid(p.proowner) AS owner,
 p.prosecdef AS security_definer,p.proconfig AS configuration,
 EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
  WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public_execute,
 has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
 has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute,
 pg_get_functiondef(p.oid) AS definition
FROM pg_proc p WHERE p.oid IN (
 'public.create_conversation_with_participants(uuid,uuid,text)'::regprocedure,
 'public.increment_login_tracking(uuid)'::regprocedure,
 'public.get_user_profile(uuid)'::regprocedure,
 'public.soft_delete_user(uuid)'::regprocedure,
 'public.refresh_matching_scores()'::regprocedure)
ORDER BY signature;
