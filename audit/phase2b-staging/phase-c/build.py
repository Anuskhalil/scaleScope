from pathlib import Path
import json
import hashlib
HERE=Path(__file__).resolve().parent
preflight="""
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
"""
core='-- STAGING sopklyxvzmungxwgboqs ONLY; never production.\nBEGIN;\nSET LOCAL lock_timeout=\'5s\';\nSET LOCAL statement_timeout=\'120s\';\n'+preflight
core+=(HERE/'changes.sql').read_text(encoding='utf-8')+(HERE/'postflight.sql').read_text(encoding='utf-8')
(HERE/'202610070002_rpc_hardening_STAGING.sql').write_text(core+"\nCOMMIT;\nVALUES ('PHASE_C_STAGING_APPLIED');\n",encoding='utf-8')
(HERE/'01_REHEARSAL_ROLLBACK.sql').write_text(core+'\nSAVEPOINT smoke;\n'+(HERE/'smoke.sql').read_text(encoding='utf-8')+"\nROLLBACK TO SAVEPOINT smoke;\nROLLBACK;\nVALUES ('PHASE_C_REHEARSAL_PASS_ROLLED_BACK');\n",encoding='utf-8')
(HERE/'manifest.json').write_text(json.dumps({p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in HERE.glob('*.sql')},indent=2)+'\n',encoding='utf-8')
