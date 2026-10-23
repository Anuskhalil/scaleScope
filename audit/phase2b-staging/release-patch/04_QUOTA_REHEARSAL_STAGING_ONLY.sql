-- ONLY scaleScope-Staging sopklyxvzmungxwgboqs. Stop staging backend first.
-- Transaction-only synthetic rows; no Storage files are uploaded.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
DO $test$
DECLARE
  owner_uid uuid := '42fce0f8-b0d3-41a9-b246-2d4a5def266e';
  existing_count bigint;
  fixture_id uuid;
  idx integer;
BEGIN
  IF current_user <> 'postgres' OR NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id=owner_uid
      AND email='passport-founder@example.invalid'
  ) THEN RAISE EXCEPTION 'Staging fixture/SQL role guard failed'; END IF;
  -- A fixture guard is not proof of project identity: verify dashboard reference.
  LOCK TABLE public.trust_evidence IN SHARE ROW EXCLUSIVE MODE;
  SELECT count(*) INTO existing_count FROM public.trust_evidence WHERE owner_id=owner_uid;
  IF existing_count >= 50 THEN RAISE EXCEPTION 'Fixture already at quota; stop for inspection'; END IF;
  IF coalesce((SELECT retained_count FROM public.evidence_storage_quotas WHERE owner_id=owner_uid),0) <> existing_count THEN
    RAISE EXCEPTION 'Quota counter differs from retained rows';
  END IF;
  FOR idx IN 1..(50-existing_count)::integer LOOP
    INSERT INTO public.trust_evidence(owner_id,category,title,claim,object_path,mime_type,byte_size,sha256,passport_private)
    VALUES(owner_uid,'product','Rollback-only quota fixture','Synthetic quota test',
      'synthetic/quota-rollback/'||gen_random_uuid()::text,'application/pdf',10,repeat('b',64),true)
    RETURNING id INTO fixture_id;
  END LOOP;
  BEGIN
    INSERT INTO public.trust_evidence(owner_id,category,title,claim,object_path,mime_type,byte_size,sha256,passport_private)
    VALUES(owner_uid,'product','Must be denied','Synthetic quota test',
      'synthetic/quota-rollback/'||gen_random_uuid()::text,'application/pdf',10,repeat('b',64),true);
    RAISE EXCEPTION 'Quota did not block row 51' USING ERRCODE='23514';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'Evidence retained-file quota exceeded' THEN RAISE; END IF;
  END;
  UPDATE public.trust_evidence SET deleted_at=clock_timestamp() WHERE id=fixture_id;
  IF (SELECT retained_count FROM public.evidence_storage_quotas WHERE owner_id=owner_uid) <> 50
     OR (SELECT count(*) FROM public.trust_evidence WHERE owner_id=owner_uid) <> 50 THEN
    RAISE EXCEPTION 'Retained-file quota invariant failed';
  END IF;
  IF has_table_privilege('authenticated','public.evidence_storage_quotas','SELECT')
     OR has_table_privilege('service_role','public.evidence_storage_quotas','UPDATE') THEN
    RAISE EXCEPTION 'Quota counter privileges are too broad';
  END IF;
END
$test$;
ROLLBACK;
SELECT 'HOSTED_QUOTA_PASS_ROLLED_BACK' AS result;
