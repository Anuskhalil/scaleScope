# Phase E Storage API tests

Status: preparation and backend unit checks done; actual hosted Storage runner has
NOT yet been executed. No production mutation or policy weakening.

## First test batch

Fill backend/.env.staging-tests locally with staging anon/publishable key and the
two SYNTHETIC founder/investor passwords. This file is git-ignored. Do not share it.
backend/.env.staging already contains the staging legacy service_role key; runner
validates its ref/role with the same isolated launcher. JWT signature is validated
by Supabase on requests; local decoding is not an authenticity guarantee.

From backend folder run:

    node scripts/test-staging-storage.cjs

This script contacts ONLY sopklyxvzmungxwgboqs.supabase.co, authenticates both known
synthetic identities, checks bucket configuration and uploads a harmless one-pixel
PNG under founders/<synthetic-id>/phase-e/<random-run-id>/.
It tests anonymous/owner/other-user raw upload/read/update/delete restrictions,
backend download bytes, public URL denial and bucket size/MIME enforcement.
Raw owner upload is intentionally denied: trust-evidence requires the backend
validated upload flow. Owner backend upload is a separate following batch.

No public.trust_evidence rows or profile-review records are modified by this batch.
Finally cleanup removes ONLY exact synthetic paths attempted by this run and confirms
its run prefix is empty. An interrupted process may leave those files behind; the
console/report run prefix identifies them. Never delete the bucket or unrelated paths.

Safe result: audit/phase2b-staging/phase-e/storage-api-results.json. It includes test
names/statuses and synthetic paths, not keys/passwords/tokens. Share this report.

## Backend privacy fixes

Read authorization now denies tombstoned evidence for everyone and ignores normal
sharing grants for passport_private evidence. Owner/reviewer access remains allowed
for nondeleted evidence. Private sharing is rejected before issuing a grant.
Legacy deletion of passport_private evidence returns 409 BEFORE deleting the Storage
file: approved/linked evidence must use a future protected retention workflow.
The staging app now permits /api/trust while billing/AI workers/meetings remain disabled.
Restart the staging backend before later HTTP tests. No production deployment made.

## Still required before Phase E acceptance

- Actual first-batch report (runner may expose hosted policy differences).
- Backend owner upload/download, cross-user download denial, allowed reviewer access.
- HTTP file size/type and magic-byte mismatch rejection (not just unit tests).
- Passport-private sharing through actual backend and no raw object-path/public DTO leak.
- Compare trust-evidence, profile-documents, profile-evidence configuration/policies.

Magic-byte inspection checks the beginning of a file. It is NOT full PDF/image
parsing, malware scanning, identity verification or proof of factual authenticity.
Do not describe these tests as establishing those guarantees.
