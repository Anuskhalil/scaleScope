"""Build an instrumented rollback rehearsal. No database connection."""
import json
import runpy
from pathlib import Path
HERE = Path(__file__).resolve().parent
commands = runpy.run_path(str(HERE / "build_baseline_rehearsal.py"))["sql"]
payload = json.dumps(commands[commands.index("BEGIN;")+1:commands.index("ROLLBACK;")], indent=2)
assert "$commands$" not in payload and "$baseline_driver$" not in payload
driver = """-- STAGING ONLY: sopklyxvzmungxwgboqs. Run entire script with No limit.
-- Never replace ROLLBACK with COMMIT.
BEGIN;
DO $baseline_driver$
DECLARE
  v_step record;
  v_state text;
  v_message text;
  v_detail text;
  v_context text;
BEGIN
  FOR v_step IN
    SELECT value AS command, ordinality AS step_number
    FROM jsonb_array_elements_text($commands$
__PAYLOAD__
$commands$::jsonb) WITH ORDINALITY
  LOOP
    BEGIN
      EXECUTE v_step.command;
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS
        v_state = RETURNED_SQLSTATE,
        v_message = MESSAGE_TEXT,
        v_detail = PG_EXCEPTION_DETAIL,
        v_context = PG_EXCEPTION_CONTEXT;
      RAISE EXCEPTION USING
        ERRCODE = v_state,
        MESSAGE = format('BASELINE_STEP_%s_FAILED: %s', v_step.step_number, v_message),
        DETAIL = format('SQL: %s | Detail: %s | Context: %s',
                        left(v_step.command, 1500), v_detail, v_context),
        HINT = 'Send the full error including DETAIL. Do not commit.';
    END;
  END LOOP;
END;
$baseline_driver$;
ROLLBACK;
VALUES ('BASELINE_REHEARSAL_PASS_ROLLED_BACK');
""".replace("__PAYLOAD__", payload)
path = HERE / "02_BASELINE_DIAGNOSTIC_STAGING_ONLY.sql"
path.write_text(driver, encoding="utf-8")
print(f"Prepared {path.name}")

