-- READ ONLY. Run in BOTH production and staging; export one result each.
-- Transaction-local search_path makes function qualification comparable.
BEGIN READ ONLY;
SET LOCAL search_path = pg_catalog;
SELECT c.relname AS table_name, a.attname AS column_name,
       pg_get_expr(ad.adbin,ad.adrelid) AS qualified_default
FROM pg_attrdef ad
JOIN pg_class c ON c.oid=ad.adrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=ad.adnum
WHERE n.nspname='public'
  AND (pg_get_expr(ad.adbin,ad.adrelid) LIKE '%gen_random_uuid%'
       OR pg_get_expr(ad.adbin,ad.adrelid) LIKE '%uuid_generate_v4%')
ORDER BY c.relname,a.attname;
ROLLBACK;
