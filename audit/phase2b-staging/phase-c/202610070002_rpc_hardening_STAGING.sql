-- STAGING sopklyxvzmungxwgboqs ONLY; never production.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='120s';

DO $$ BEGIN
 IF current_user<>'postgres' THEN RAISE EXCEPTION 'postgres migration owner required'; END IF;
 IF to_regclass('public.verification_audit_history') IS NULL THEN
  RAISE EXCEPTION 'Phase B required'; END IF;
 IF (SELECT count(*) FROM public.profiles WHERE
  (id='42fce0f8-b0d3-41a9-b246-2d4a5def266e' AND email='passport-founder@example.invalid') OR
  (id='3ec91991-f475-4f07-a038-e2a7e1c8b24d' AND email='passport-investor@example.invalid') OR
  (id='8acd8892-8651-423c-ab8b-71437492f02b' AND email='passport-reviewer@example.invalid'))<>3
 THEN RAISE EXCEPTION 'Known staging fixtures required'; END IF;
 IF EXISTS(SELECT 1 FROM public.profiles WHERE email NOT IN
  ('passport-founder@example.invalid','passport-investor@example.invalid','passport-reviewer@example.invalid'))
 THEN RAISE EXCEPTION 'Synthetic-only staging required'; END IF;
 IF NOT (SELECT prosecdef FROM pg_proc WHERE oid='public.create_conversation_with_participants(uuid,uuid,text)'::regprocedure)
 THEN RAISE EXCEPTION 'Already hardened or unexpected drift'; END IF;
END $$;
-- Separate scoped RPC hardening. No table/Storage policies or matching changes.
CREATE OR REPLACE FUNCTION public.create_conversation_with_participants(
 p_created_by uuid,p_other_user uuid,p_type text DEFAULT 'direct')
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE conversation uuid;
BEGIN
 IF current_user NOT IN ('service_role','postgres') THEN
  RAISE EXCEPTION 'Backend authority required' USING ERRCODE='42501';
 END IF;
 IF p_created_by IS NULL OR p_other_user IS NULL OR p_created_by=p_other_user
  OR coalesce(p_type,'direct')<>'direct' THEN
  RAISE EXCEPTION 'Two distinct participants and direct conversation required' USING ERRCODE='22023';
 END IF;
 IF (SELECT count(*) FROM public.profiles WHERE id IN (p_created_by,p_other_user)
     AND deleted_at IS NULL)<>2 THEN
  RAISE EXCEPTION 'Active participants required' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.connections
  WHERE (user_1=p_created_by AND user_2=p_other_user) OR (user_2=p_created_by AND user_1=p_other_user)) THEN
  RAISE EXCEPTION 'Connect first before opening a conversation' USING ERRCODE='42501';
 END IF;
 -- Serialize a pair to prevent duplicate rooms from simultaneous backend calls.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  least(p_created_by,p_other_user)::text||':'||greatest(p_created_by,p_other_user)::text,0));
 SELECT a.conversation_id INTO conversation FROM public.conversation_participants a
 JOIN public.conversation_participants b ON b.conversation_id=a.conversation_id
 JOIN public.conversations c ON c.id=a.conversation_id
 WHERE a.user_id=p_created_by AND b.user_id=p_other_user AND c.type='direct'
  AND (SELECT count(*) FROM public.conversation_participants x WHERE x.conversation_id=c.id)=2
 ORDER BY c.created_at,c.id LIMIT 1;
 IF conversation IS NULL THEN
  INSERT INTO public.conversations(type,created_at,updated_at,last_message_at)
  VALUES('direct',now(),now(),now()) RETURNING id INTO conversation;
  INSERT INTO public.conversation_participants(conversation_id,user_id,created_at)
  VALUES(conversation,p_created_by,now()),(conversation,p_other_user,now());
  INSERT INTO public.conversation_members(conversation_id,user_id,joined_at)
  VALUES(conversation,p_created_by,now()),(conversation,p_other_user,now());
 END IF;
 RETURN conversation;
END $$;
REVOKE ALL ON FUNCTION public.create_conversation_with_participants(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_conversation_with_participants(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.increment_login_tracking(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
  RAISE EXCEPTION 'Own authenticated account required' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_user_id AND deleted_at IS NULL) THEN
  RAISE EXCEPTION 'Active profile required' USING ERRCODE='42501';
 END IF;
 INSERT INTO public.user_auth_tracking AS tracking(id,last_login,login_count)
 VALUES(p_user_id,now(),1)
 ON CONFLICT(id) DO UPDATE SET last_login=now(),login_count=coalesce(tracking.login_count,0)+1;
END $$;
REVOKE ALL ON FUNCTION public.increment_login_tracking(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.increment_login_tracking(uuid) TO authenticated;

-- No repository callers found. Retain legacy bodies/dependencies, quarantine browser
-- execution. Service-role permissions are not widened; these bodies remain broken.
ALTER FUNCTION public.get_user_profile(uuid) SET search_path='';
ALTER FUNCTION public.soft_delete_user(uuid) SET search_path='';
ALTER FUNCTION public.refresh_matching_scores() SET search_path='';
REVOKE ALL ON FUNCTION public.get_user_profile(uuid),public.soft_delete_user(uuid),
 public.refresh_matching_scores() FROM PUBLIC,anon,authenticated;
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

COMMIT;
VALUES ('PHASE_C_STAGING_APPLIED');
