$ErrorActionPreference = 'Stop'
$backup = 'C:\Users\Anus Khalil\ScaleScope-Backups\production-20261012-172917'
if (!(Test-Path -LiteralPath (Join-Path $backup 'data.sql'))) {
    throw 'Expected private backup directory is missing.'
}
$output = Join-Path $backup 'managed-schema.sql'
if (Test-Path -LiteralPath $output) {
    throw 'managed-schema.sql already exists; do not overwrite without inspection.'
}
docker info --format '{{.ServerVersion}}'
if ($LASTEXITCODE -ne 0) { throw 'Start Docker Desktop first.' }
Write-Host 'Read-only production Auth/Storage schema export. Enter DATABASE password at Password:.'
Write-Host 'No source rows or schemas are modified. Password is not saved by this script.'
docker run --rm -it --mount "type=bind,source=$backup,target=/backup" `
    --env PGSSLMODE=require postgres:17.6 pg_dump `
    --host=aws-1-ap-south-1.pooler.supabase.com --port=5432 `
    --username=postgres.gqkjvxcyetesvqmjkuus --dbname=postgres `
    --password --schema-only --schema=auth --schema=storage `
    --file=/backup/managed-schema.sql.partial
if ($LASTEXITCODE -ne 0) {
    throw 'Export failed; any .partial file is incomplete. Share error only, never password.'
}
$partial = Join-Path $backup 'managed-schema.sql.partial'
if ((Get-Item -LiteralPath $partial).Length -eq 0) { throw 'Empty export.' }
Move-Item -LiteralPath $partial -Destination $output
Get-Item -LiteralPath $output | Select-Object Name, Length
Get-FileHash -LiteralPath $output -Algorithm SHA256 | Select-Object Algorithm, Hash
Write-Host 'MANAGED_SCHEMA_EXPORTED; local restore still needs verification.'
