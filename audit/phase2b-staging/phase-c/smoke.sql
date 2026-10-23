CREATE FUNCTION pg_temp.denied(sql_text text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 BEGIN EXECUTE sql_text;
 EXCEPTION WHEN insufficient_privilege THEN RETURN; END;
 RAISE EXCEPTION 'Unauthorized operation succeeded: %',sql_text;
END $$;
-- These approvals exist ONLY inside the rolled-back smoke savepoint.
UPDATE public.profile_reviews SET status='approved' WHERE user_id IN
 ('42fce0f8-b0d3-41a9-b246-2d4a5def266e','3ec91991-f475-4f07-a038-e2a7e1c8b24d');

SET LOCAL ROLE anon;
SELECT pg_temp.denied($q$ SELECT public.create_conversation_with_participants(
 '42fce0f8-b0d3-41a9-b246-2d4a5def266e','3ec91991-f475-4f07-a038-e2a7e1c8b24d','direct') $q$);
SELECT pg_temp.denied($q$ SELECT public.increment_login_tracking('42fce0f8-b0d3-41a9-b246-2d4a5def266e') $q$);
SELECT pg_temp.denied($q$ SELECT public.get_user_profile('42fce0f8-b0d3-41a9-b246-2d4a5def266e') $q$);
SELECT pg_temp.denied($q$ SELECT public.soft_delete_user('42fce0f8-b0d3-41a9-b246-2d4a5def266e') $q$);
SELECT pg_temp.denied('SELECT public.refresh_matching_scores()');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','42fce0f8-b0d3-41a9-b246-2d4a5def266e',true);
SELECT public.increment_login_tracking('42fce0f8-b0d3-41a9-b246-2d4a5def266e');
SELECT pg_temp.denied($q$ SELECT public.increment_login_tracking('3ec91991-f475-4f07-a038-e2a7e1c8b24d') $q$);
SELECT pg_temp.denied($q$ SELECT public.create_conversation_with_participants(
 '42fce0f8-b0d3-41a9-b246-2d4a5def266e','3ec91991-f475-4f07-a038-e2a7e1c8b24d','direct') $q$);
SELECT pg_temp.denied($q$ SELECT public.get_user_profile('3ec91991-f475-4f07-a038-e2a7e1c8b24d') $q$);
SELECT pg_temp.denied($q$ SELECT public.soft_delete_user('3ec91991-f475-4f07-a038-e2a7e1c8b24d') $q$);
SELECT pg_temp.denied('SELECT public.refresh_matching_scores()');
SELECT set_config('request.jwt.claim.sub','3ec91991-f475-4f07-a038-e2a7e1c8b24d',true);
SELECT public.increment_login_tracking('3ec91991-f475-4f07-a038-e2a7e1c8b24d');
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT pg_temp.denied($q$ SELECT public.create_conversation_with_participants(
 '42fce0f8-b0d3-41a9-b246-2d4a5def266e','8acd8892-8651-423c-ab8b-71437492f02b','direct') $q$);
INSERT INTO public.connections(user_1,user_2,connection_type)
 VALUES('3ec91991-f475-4f07-a038-e2a7e1c8b24d','42fce0f8-b0d3-41a9-b246-2d4a5def266e','investor_contact');
DO $$ DECLARE c uuid; repeated uuid; BEGIN
 c:=public.create_conversation_with_participants('42fce0f8-b0d3-41a9-b246-2d4a5def266e','3ec91991-f475-4f07-a038-e2a7e1c8b24d','direct');
 repeated:=public.create_conversation_with_participants('3ec91991-f475-4f07-a038-e2a7e1c8b24d','42fce0f8-b0d3-41a9-b246-2d4a5def266e','direct');
 IF c IS NULL OR repeated IS DISTINCT FROM c THEN RAISE EXCEPTION 'Conversation reuse failed'; END IF;
 IF (SELECT count(*) FROM public.conversation_participants WHERE conversation_id=c)<>2
 OR (SELECT count(*) FROM public.conversation_members WHERE conversation_id=c)<>2
 THEN RAISE EXCEPTION 'Conversation memberships missing'; END IF;
 INSERT INTO public.messages(conversation_id,sender_id,content)
 VALUES(c,'42fce0f8-b0d3-41a9-b246-2d4a5def266e','Synthetic Phase C message');
 IF NOT EXISTS(SELECT 1 FROM public.messages WHERE conversation_id=c AND content='Synthetic Phase C message')
 THEN RAISE EXCEPTION 'Service message path failed'; END IF;
END $$;
RESET ROLE;
VALUES ('PHASE_C_RPC_SMOKE_PASS');
