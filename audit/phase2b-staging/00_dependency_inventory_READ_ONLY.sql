-- PHASE A SUPPLEMENT: READ ONLY. Run ONCE in EACH project's SQL Editor.
-- Production: gqkjvxcyetesvqmjkuus
-- Staging: sopklyxvzmungxwgboqs
-- Export the single result row as CSV. This is NOT a migration.
-- No application records, Auth users or Storage objects are read.
-- Review any custom function definitions for embedded secrets before sharing.
SELECT jsonb_build_object(
  'captured_at', now(),
  'server_version', current_setting('server_version'),
  'extensions', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'name', e.extname, 'version', e.extversion, 'schema', n.nspname
    ) ORDER BY e.extname), '[]'::jsonb)
    FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
  ),
  'event_triggers', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'name', e.evtname, 'event', e.evtevent, 'enabled', e.evtenabled,
      'tags', e.evttags, 'owner', pg_get_userbyid(e.evtowner),
      'function_schema', n.nspname, 'function', p.proname,
      'arguments', pg_get_function_identity_arguments(p.oid),
      'definition', CASE WHEN n.nspname = 'public' AND p.prokind IN ('f','p')
        THEN pg_get_functiondef(p.oid) ELSE NULL END
    ) ORDER BY e.evtname), '[]'::jsonb)
    FROM pg_event_trigger e JOIN pg_proc p ON p.oid = e.evtfoid
    JOIN pg_namespace n ON n.oid = p.pronamespace
  ),
  'public_table_properties', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'table', c.relname, 'persistence', c.relpersistence,
      'replica_identity', c.relreplident, 'is_partition', c.relispartition,
      'options', c.reloptions, 'owner', pg_get_userbyid(c.relowner)
    ) ORDER BY c.relname), '[]'::jsonb)
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r','p')
  ),
  'public_nondefault_collations', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'table', c.relname, 'column', a.attname,
      'schema', cn.nspname, 'collation', co.collname
    ) ORDER BY c.relname, a.attnum), '[]'::jsonb)
    FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_type t ON t.oid = a.atttypid
    JOIN pg_collation co ON co.oid = a.attcollation
    JOIN pg_namespace cn ON cn.oid = co.collnamespace
    WHERE n.nspname = 'public' AND a.attnum > 0 AND NOT a.attisdropped
      AND a.attcollation <> t.typcollation
  ),
  'public_custom_types', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'name', t.typname, 'kind', t.typtype,
      'base_type', CASE WHEN t.typbasetype <> 0 THEN format_type(t.typbasetype,t.typtypmod) END,
      'not_null', t.typnotnull, 'default', t.typdefault
    ) ORDER BY t.typname), '[]'::jsonb)
    FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    LEFT JOIN pg_class c ON c.oid = t.typrelid
    WHERE n.nspname = 'public' AND t.typelem = 0
      AND (t.typrelid = 0 OR c.relkind = 'c')
  ),
  'public_sequences', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'name', c.relname, 'type', format_type(s.seqtypid,NULL),
      'start', s.seqstart, 'increment', s.seqincrement,
      'minimum', s.seqmin, 'maximum', s.seqmax,
      'cache', s.seqcache, 'cycle', s.seqcycle
    ) ORDER BY c.relname), '[]'::jsonb)
    FROM pg_sequence s JOIN pg_class c ON c.oid = s.seqrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public'
  ),
  'constraint_indexes', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'table', c.relname, 'constraint', k.conname, 'type', k.contype,
      'index_schema', ni.nspname, 'index', ci.relname
    ) ORDER BY c.relname,k.conname), '[]'::jsonb)
    FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_class ci ON ci.oid = k.conindid
    JOIN pg_namespace ni ON ni.oid = ci.relnamespace
    WHERE n.nspname = 'public' AND k.contype IN ('p','u','x')
  ),
  'publications', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'name', p.pubname, 'all_tables', p.puballtables,
      'insert', p.pubinsert, 'update', p.pubupdate,
      'delete', p.pubdelete, 'truncate', p.pubtruncate
    ) ORDER BY p.pubname), '[]'::jsonb) FROM pg_publication p
  ),
  'public_publication_tables', (
    SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.pubname,t.tablename), '[]'::jsonb)
    FROM pg_publication_tables t WHERE t.schemaname = 'public'
  ),
  'public_inheritance', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'child', c.relname, 'parent_schema', pn.nspname, 'parent', p.relname
    ) ORDER BY c.relname), '[]'::jsonb)
    FROM pg_inherits i JOIN pg_class c ON c.oid = i.inhrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_class p ON p.oid = i.inhparent
    JOIN pg_namespace pn ON pn.oid = p.relnamespace WHERE n.nspname = 'public'
  )
) AS baseline_dependencies;
