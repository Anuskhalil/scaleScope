import subprocess
import time

OWNER='42fce0f8-b0d3-41a9-b246-2d4a5def266e'
CLAIM='92000000-0000-4000-8000-000000000002'
EVIDENCE='92000000-0000-4000-8000-000000000001'

def check_concurrency(psql, run):
    run(psql, f"""INSERT INTO public.trust_evidence(id,owner_id,category,title,claim,object_path,mime_type,byte_size,sha256,passport_private)
    VALUES('{EVIDENCE}','{OWNER}','product','Concurrency fixture','Synthetic evidence only','synthetic/concurrency.pdf','application/pdf',10,repeat('b',64),true);""")
    call=f"SELECT public.submit_passport_claim('{OWNER}','{CLAIM}','startup',repeat('a',64),ARRAY['{EVIDENCE}'::uuid],true);"
    def race(first_sql, second_sql):
        first=subprocess.Popen(psql,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8')
        try:
            first.stdin.write("BEGIN; SET LOCAL statement_timeout='15s'; SET LOCAL ROLE service_role; "+first_sql+" SELECT pg_sleep(2); COMMIT;")
            first.stdin.close()
            # Poll pg_stat_activity to prove the first session holds its transaction
            # before starting the competing request.
            for _ in range(60):
                waiting=run(psql+['-At'], "SELECT count(*) FROM pg_stat_activity WHERE wait_event='PgSleep';").stdout.strip()
                if waiting=='1': break
                time.sleep(.1)
            else: raise AssertionError('First session did not reach held transaction')
            second=run(psql,"SET statement_timeout='15s'; SET ROLE service_role; "+second_sql)
            first.wait(timeout=20)
            output=first.stdout.read()
            error=first.stderr.read()
            assert first.returncode==0, error
            return output, second.stdout
        finally:
            if first.poll() is None:
                first.kill()
                first.wait()
    race(call,call)
    assert run(psql+['-At'],f"SELECT count(*) FROM public.profile_verification_checks WHERE id='{CLAIM}';").stdout.strip()=='1'
    assert run(psql+['-At'],f"SELECT claim_version FROM public.profile_verification_checks WHERE id='{CLAIM}';").stdout.strip()=='1'
    run(psql,f"UPDATE public.profile_verification_checks SET passport_state='in_review' WHERE id='{CLAIM}';")
    update=lambda state: f"""WITH changed AS (
    UPDATE public.profile_verification_checks SET passport_state='{state}',
    decision_actor='8acd8892-8651-423c-ab8b-71437492f02b',decided_at=clock_timestamp(),
    source_kind='manual_evidence',expires_at=NULL,decision_reason='Synthetic decision reason for concurrency test.'
    WHERE id='{CLAIM}' AND claim_version=1 AND passport_state='in_review' RETURNING id)
    SELECT 'winner_count='||count(*) FROM changed;"""
    first,second=race(update('rejected'),update('needs_changes'))
    assert 'winner_count=1' in first, first
    assert 'winner_count=0' in second, second
    assert run(psql+['-At'],f"SELECT passport_state FROM public.profile_verification_checks WHERE id='{CLAIM}';").stdout.strip()=='rejected'
    return ['same-request concurrent submission: one claim/version',
            'competing conditional decisions: one winner, no overwrite']
