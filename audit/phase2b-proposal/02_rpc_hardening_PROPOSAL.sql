-- SEPARATE APPROVAL REQUIRED. Proposal only; not executed.
-- Apply before exposing Trust Passport. Retired direct-client conversation
-- calls must be removed/redirected before rollout.
BEGIN;
SET LOCAL lock_timeout='5s';
REVOKE ALL ON FUNCTION public.create_conversation_with_participants(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_conversation_with_participants(uuid,uuid,text) TO service_role;
REVOKE ALL ON FUNCTION public.get_user_profile(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.soft_delete_user(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.refresh_matching_scores() FROM PUBLIC,anon,authenticated;
-- No grant added for clients. Legacy broken routines retained for dependency review.
-- LoginPage calls this RPC today: preserve self-only authenticated access.
CREATE OR REPLACE FUNCTION public.increment_login_tracking(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
  RAISE EXCEPTION 'Own authenticated account required' USING ERRCODE='42501';
 END IF;
 INSERT INTO public.user_auth_tracking AS tracking(id,last_login,login_count)
 VALUES(p_user_id,now(),1)
 ON CONFLICT(id) DO UPDATE SET last_login=now(),
 login_count=coalesce(tracking.login_count,0)+1;
END $$;
REVOKE ALL ON FUNCTION public.increment_login_tracking(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.increment_login_tracking(uuid) TO authenticated,service_role;
COMMIT;
