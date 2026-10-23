"""Offline artifact integrity checks; not SQL execution or PostgreSQL parsing."""
import hashlib
import json
import re
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
SQL = (HERE / "01_BASELINE_REHEARSAL_STAGING_ONLY.sql").read_text(encoding="utf-8")
MANIFEST = json.loads((HERE / "baseline-preparation-manifest.json").read_text(encoding="utf-8"))

class ArtifactTests(unittest.TestCase):
    def test_postflight_record_does_not_shadow_sql_alias(self):
        block = SQL.split("DO $postflight$", 1)[1].split("$postflight$;", 1)[0]
        self.assertIn("DECLARE v_table record; v_has_rows boolean;", block)
        self.assertIn("FOR v_table IN SELECT", block)
        self.assertIn("v_table.tablename", block)
        self.assertNotRegex(block, r"\b(?:FROM|JOIN)\s+\w+\s+v_table\b")
        self.assertNotRegex(block, r"\b(?:DECLARE|FOR)\s+t\b")

    def test_managed_auth_trigger_needs_no_owner_alter(self):
        self.assertIn("CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users", SQL)
        self.assertNotRegex(SQL, r'(?im)^ALTER TABLE (?:auth\.users|"auth"\."users")')
        self.assertIn("Signup trigger missing or not origin-enabled", SQL)

    def test_rollback_only(self):
        self.assertEqual(len(re.findall(r"(?m)^BEGIN;$", SQL)), 1)
        self.assertEqual(len(re.findall(r"(?m)^ROLLBACK;$", SQL)), 1)
        self.assertNotRegex(SQL, r"(?im)^COMMIT\s*;")
        self.assertTrue(SQL.rstrip().endswith("VALUES ('BASELINE_REHEARSAL_PASS_ROLLED_BACK');"))
        self.assertGreater(SQL.rfind("VALUES ('BASELINE_REHEARSAL_PASS_ROLLED_BACK')"), SQL.rfind("ROLLBACK;"))

    def test_manifest_hash(self):
        path = HERE / "01_BASELINE_REHEARSAL_STAGING_ONLY.sql"
        self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), MANIFEST["rehearsal_sha256"])

    def test_schema_counts(self):
        for prefix, expected in [
            (r'^CREATE TABLE "public"\.', 43),
            (r'^CREATE POLICY ', 117),
            (r'^CREATE TRIGGER ', 21),
            (r'^CREATE (?:UNIQUE )?INDEX ', 121),
            (r'^ALTER TABLE "public"\..* ADD CONSTRAINT ', 204),
            (r'^CREATE EVENT TRIGGER ', 1),
        ]:
            self.assertEqual(len(re.findall(prefix, SQL, re.M)), expected, prefix)

    def test_only_configuration_inserts(self):
        # Top-level statements only; stored function bodies retain existing DML.
        inserts = re.findall(r"(?m)^INSERT INTO ([^\n]+)", SQL)
        self.assertEqual(len(inserts), 5)
        self.assertTrue(all(s.startswith("storage.buckets ") for s in inserts))

    def test_order_and_guards(self):
        self.assertLess(SQL.index("DO $preflight$"), SQL.index('CREATE TABLE "public".'))
        self.assertLess(SQL.rfind('CREATE TABLE "public".'), SQL.index(' ADD CONSTRAINT '))
        self.assertLess(SQL.index("CREATE OR REPLACE FUNCTION"), SQL.index("CREATE POLICY"))
        self.assertIn("public schema is not empty", SQL)
        self.assertIn("Required managed Auth/extension dependencies are missing", SQL)
        self.assertNotRegex(SQL, r"(?m)^DROP ")
        self.assertNotRegex(SQL, r"(?m)^CREATE (?:OR REPLACE )?FUNCTION (?:auth|storage|realtime)\.")

if __name__ == "__main__":
    unittest.main(verbosity=2)
