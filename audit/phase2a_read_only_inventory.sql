-- PHASE 2A: READ-ONLY INSPECTION, NOT A MIGRATION.
-- Run each numbered SELECT separately in the project's Supabase SQL Editor.
-- Choose No limit and export each complete result as JSON or CSV.
-- No application rows, auth users, storage objects or private documents are read.
-- Before sharing definitions, redact any hard-coded secret literals or private
-- email allowlists. Preserve object names, conditions and REDACTED markers.
-- Catalog visibility depends on the SQL Editor role. Send errors unchanged.
-- Nothing in this file is executed by Codex.

-- 01. Relation discovery, including views, RLS and expected core presence.
WITH expected(name) AS (
  VALUES ('profiles'), ('founder_profiles'), ('investor_profiles'),
    ('profile_reviews'), ('profile_review_history'), ('trust_evidence'),
    ('evidence_grants'), ('evidence_reviews'), ('evidence_ai_reviews'),
    ('meeting_followups')
)
SELECT 'expected_core' AS section, jsonb_build_object(
  'schema', 'public', 'name', name,
  'exists', to_regclass(format('public.%I', name)) IS NOT NULL
) AS details FROM expected
UNION ALL
SELECT 'relation', jsonb_build_object(
  'schema', n.nspname, 'name', c.relname, 'kind', c.relkind,
  'owner', pg_get_userbyid(c.relowner), 'rls', c.relrowsecurity,
  'force_rls', c.relforcerowsecurity, 'options', c.reloptions,
  'view_definition', CASE WHEN c.relkind IN ('v','m')
    THEN pg_get_viewdef(c.oid, true) ELSE NULL END
)
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r','p','v','m','f','S')
  AND n.nspname NOT LIKE 'pg_%'
  AND n.nspname NOT IN ('information_schema')
ORDER BY section, details;

-- 02. Exact columns, defaults, identity/generated flags; no table-row reads.
SELECT n.nspname AS schema_name, c.relname AS relation_name,
  a.attnum AS ordinal_position, a.attname AS column_name,
  format_type(a.atttypid, a.atttypmod) AS data_type,
  a.attnotnull AS not_null,
  pg_get_expr(d.adbin, d.adrelid) AS default_or_generation_expression,
  a.attidentity AS identity_kind, a.attgenerated AS generated_kind
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
WHERE a.attnum > 0 AND NOT a.attisdropped
  AND c.relkind IN ('r','p','v','m','f')
  AND n.nspname IN ('public','storage','supabase_migrations')
ORDER BY n.nspname, c.relname, a.attnum;

-- 03. Constraints, indexes, custom enum labels.
SELECT 'constraint' AS section, jsonb_build_object(
  'schema', n.nspname, 'table', c.relname, 'name', k.conname,
  'type', k.contype, 'definition', pg_get_constraintdef(k.oid, true),
  'validated', k.convalidated, 'deferrable', k.condeferrable,
  'initially_deferred', k.condeferred
) AS details
FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public','storage')
UNION ALL
SELECT 'index', jsonb_build_object(
  'schema', n.nspname, 'table', c.relname,
  'definition', pg_get_indexdef(i.indexrelid),
  'valid', i.indisvalid, 'ready', i.indisready,
  'unique', i.indisunique, 'primary', i.indisprimary
)
FROM pg_index i JOIN pg_class c ON c.oid = i.indrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public','storage')
UNION ALL
SELECT 'enum', jsonb_build_object(
  'schema', n.nspname, 'type', t.typname,
  'label', e.enumlabel, 'order', e.enumsortorder
)
FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
ORDER BY section, details;

-- 04. Deployed policies. Includes permissive/restrictive and Storage rules.
SELECT schemaname, tablename, policyname, permissive, roles, cmd,
  qual AS using_expression, with_check
FROM pg_policies
WHERE schemaname NOT LIKE 'pg_%'
  AND schemaname <> 'information_schema'
ORDER BY schemaname, tablename, policyname;

-- 05. Effective table/view and column privileges; accounts need not be assumed.
WITH roles AS (
  SELECT oid, rolname FROM pg_roles
  WHERE rolname IN ('anon','authenticated','service_role')
), relations AS (
  SELECT c.oid, n.nspname, c.relname
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('public','storage')
    AND c.relkind IN ('r','p','v','m','f')
)
SELECT 'effective_relation' AS section, jsonb_build_object(
  'role', r.rolname, 'schema', c.nspname, 'relation', c.relname,
  'privilege', p.privilege,
  'allowed', has_table_privilege(r.oid, c.oid, p.privilege)
) AS details
FROM roles r CROSS JOIN relations c
CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),
  ('TRUNCATE'),('REFERENCES'),('TRIGGER')) AS p(privilege)
UNION ALL
SELECT 'effective_columns', jsonb_build_object(
  'role', r.rolname, 'schema', c.nspname, 'relation', c.relname,
  'column', a.attname,
  'select', has_column_privilege(r.oid, c.oid, a.attnum, 'SELECT'),
  'insert', has_column_privilege(r.oid, c.oid, a.attnum, 'INSERT'),
  'update', has_column_privilege(r.oid, c.oid, a.attnum, 'UPDATE')
)
FROM roles r CROSS JOIN relations c
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY section, details;

-- 06. Raw/default ACLs, schema rights, role flags and membership.
-- ACL arrays retain PUBLIC grants; null ACL means PostgreSQL defaults, NOT deny.
SELECT 'relation_acl' AS section, jsonb_build_object(
  'schema', n.nspname, 'relation', c.relname,
  'kind', c.relkind, 'owner', pg_get_userbyid(c.relowner), 'acl', c.relacl
) AS details
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public','storage')
  AND c.relkind IN ('r','p','v','m','f','S')
UNION ALL
SELECT 'column_acl', jsonb_build_object(
  'schema', n.nspname, 'relation', c.relname, 'column', a.attname, 'acl', a.attacl
)
FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public','storage') AND a.attnum > 0
  AND NOT a.attisdropped AND a.attacl IS NOT NULL
UNION ALL
SELECT 'default_acl', jsonb_build_object(
  'owner', pg_get_userbyid(d.defaclrole), 'schema', n.nspname,
  'type', d.defaclobjtype, 'acl', d.defaclacl
)
FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
UNION ALL
SELECT 'role', jsonb_build_object(
  'name', rolname, 'superuser', rolsuper, 'inherit', rolinherit,
  'bypass_rls', rolbypassrls, 'login', rolcanlogin
)
FROM pg_roles
WHERE rolname IN ('anon','authenticated','service_role','authenticator')
  OR rolname ~* '(admin|review|trust|verif)'
UNION ALL
SELECT 'membership', jsonb_build_object(
  'member', member_role.rolname, 'granted_role', parent_role.rolname,
  'admin_option', m.admin_option
)
FROM pg_auth_members m JOIN pg_roles member_role ON member_role.oid = m.member
JOIN pg_roles parent_role ON parent_role.oid = m.roleid
UNION ALL
SELECT 'schema_access', jsonb_build_object(
  'schema', n.nspname, 'role', r.rolname, 'acl', n.nspacl,
  'usage', has_schema_privilege(r.oid,n.oid,'USAGE'),
  'create', has_schema_privilege(r.oid,n.oid,'CREATE')
)
FROM pg_namespace n CROSS JOIN pg_roles r
WHERE n.nspname IN ('public','storage')
  AND r.rolname IN ('anon','authenticated','service_role')
ORDER BY section;

-- 07. Function/RPC metadata and effective execute privileges.
-- Public/storage routines plus all functions attached to non-system triggers.
WITH relevant AS (
  SELECT p.*, n.nspname
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.prokind IN ('f','p')
    AND (n.nspname IN ('public','storage') OR p.oid IN (
      SELECT t.tgfoid FROM pg_trigger t WHERE NOT t.tgisinternal
    ))
)
SELECT p.nspname AS schema_name, p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type,
  p.prokind, p.prosecdef AS security_definer,
  pg_get_userbyid(p.proowner) AS owner, p.proacl AS acl,
  ARRAY(SELECT s FROM unnest(p.proconfig) s WHERE s LIKE 'search_path=%') AS search_path_config,
  (SELECT jsonb_object_agg(r.rolname, has_function_privilege(r.oid,p.oid,'EXECUTE'))
   FROM pg_roles r WHERE r.rolname IN ('anon','authenticated','service_role')) AS execute_privileges
FROM relevant p ORDER BY p.nspname,p.proname,identity_arguments;

-- 08. Function source for behavior/admin/requeue analysis.
-- CASE protects pg_get_functiondef from aggregates such as array_agg.
-- Review returned source for hard-coded secrets/private allowlists BEFORE sending.
SELECT n.nspname AS schema_name, p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  CASE WHEN p.prokind IN ('f','p') THEN pg_get_functiondef(p.oid) END AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prokind IN ('f','p')
  AND (n.nspname IN ('public','storage') OR p.oid IN (
    SELECT t.tgfoid FROM pg_trigger t WHERE NOT t.tgisinternal
  ))
ORDER BY n.nspname,p.proname,arguments;

-- 09. Actual triggers, including auth hooks and disabled triggers.
SELECT n.nspname AS table_schema, c.relname AS table_name,
  t.tgname AS trigger_name, t.tgenabled AS enabled_mode,
  pg_get_triggerdef(t.oid, true) AS definition,
  fn.nspname AS function_schema, p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS function_arguments
FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
JOIN pg_namespace fn ON fn.oid = p.pronamespace
WHERE NOT t.tgisinternal AND n.nspname NOT LIKE 'pg_%'
ORDER BY n.nspname,c.relname,t.tgname;

-- 10. Bucket CONFIGURATION only. Never query storage.objects contents.
SELECT b.id, b.name, b.public, b.file_size_limit, b.allowed_mime_types
FROM storage.buckets b ORDER BY b.id;

-- 11. Migration-history discovery. Does not read migration statement payloads.
-- If history tables exist, send this result first; a version-only query can
-- then be supplied for the actual columns. Manual SQL Editor runs may not
-- have entries in migration history.
SELECT n.nspname AS schema_name, c.relname AS table_name,
  a.attname AS column_name, format_type(a.atttypid,a.atttypmod) AS data_type
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid
WHERE c.relkind IN ('r','p') AND a.attnum > 0 AND NOT a.attisdropped
  AND (n.nspname = 'supabase_migrations'
    OR (n.nspname IN ('public','storage') AND c.relname ~* 'migration'))
ORDER BY n.nspname,c.relname,a.attnum;

-- 12. Legacy verification/status fields and policy function dependencies.
SELECT 'status_column' AS section, jsonb_build_object(
  'schema', n.nspname, 'table', c.relname, 'column', a.attname,
  'type', format_type(a.atttypid,a.atttypmod),
  'not_null', a.attnotnull, 'default', pg_get_expr(d.adbin,d.adrelid)
) AS details
FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
WHERE n.nspname = 'public' AND a.attnum > 0 AND NOT a.attisdropped
  AND a.attname ~* '(verif|review|approv|metadata|admin)'
UNION ALL
SELECT 'policy_function_dependency', jsonb_build_object(
  'table', pol.polrelid::regclass::text, 'policy', pol.polname,
  'function_schema', fn.nspname, 'function', f.proname,
  'arguments', pg_get_function_identity_arguments(f.oid),
  'security_definer', f.prosecdef
)
FROM pg_depend dep
JOIN pg_policy pol ON dep.classid = 'pg_policy'::regclass AND dep.objid = pol.oid
JOIN pg_proc f ON dep.refclassid = 'pg_proc'::regclass AND dep.refobjid = f.oid
JOIN pg_namespace fn ON fn.oid = f.pronamespace
ORDER BY section;
