DO $$
DECLARE signature text; r text;
BEGIN
 FOREACH signature IN ARRAY ARRAY['create_conversation_with_participants(uuid,uuid,text)',
 'get_user_profile(uuid)','soft_delete_user(uuid)','refresh_matching_scores()'] LOOP
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF has_function_privilege(r,'public.'||signature,'EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected browser RPC access: % %',r,signature; END IF;
  END LOOP;
 END LOOP;
 IF NOT has_function_privilege('authenticated','public.increment_login_tracking(uuid)','EXECUTE')
 OR has_function_privilege('anon','public.increment_login_tracking(uuid)','EXECUTE')
 OR NOT has_function_privilege('service_role','public.create_conversation_with_participants(uuid,uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'Intended RPC grants missing'; END IF;
 IF (SELECT prosecdef FROM pg_proc WHERE oid='public.create_conversation_with_participants(uuid,uuid,text)'::regprocedure)
 THEN RAISE EXCEPTION 'Conversation must be invoker'; END IF;
END $$;
