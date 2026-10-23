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
