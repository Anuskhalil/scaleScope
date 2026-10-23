-- PROPOSAL: local rehearsal only until hosted migration approval.
BEGIN;
LOCK TABLE public.trust_evidence IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE public.evidence_storage_quotas (
 owner_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 retained_count bigint NOT NULL CHECK(retained_count>=0)
);
ALTER TABLE public.evidence_storage_quotas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.evidence_storage_quotas FROM PUBLIC,anon,authenticated,service_role;
INSERT INTO public.evidence_storage_quotas(owner_id,retained_count)
 SELECT owner_id,count(*) FROM public.trust_evidence GROUP BY owner_id;
CREATE FUNCTION public.enforce_evidence_storage_quota() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
   RAISE EXCEPTION 'Evidence ownership cannot be transferred' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
 ELSIF TG_OP='DELETE' THEN
  UPDATE public.evidence_storage_quotas SET retained_count=retained_count-1
   WHERE owner_id=OLD.owner_id AND retained_count>0;
  RETURN OLD;
 END IF;
 INSERT INTO public.evidence_storage_quotas(owner_id,retained_count)
 VALUES(NEW.owner_id,1)
 ON CONFLICT(owner_id) DO UPDATE SET retained_count=public.evidence_storage_quotas.retained_count+1
 WHERE public.evidence_storage_quotas.retained_count<50;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Evidence retained-file quota exceeded' USING ERRCODE='P0001';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_evidence_storage_quota() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER evidence_storage_quota_trg BEFORE INSERT OR DELETE OR UPDATE OF owner_id
 ON public.trust_evidence FOR EACH ROW EXECUTE FUNCTION public.enforce_evidence_storage_quota();
COMMIT;

