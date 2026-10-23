# Phase 2A - Live Supabase Read-Only Inventory

## A. Live Access Confirmation

Status: WAITING FOR LIVE RESULTS. Database actually inspect nahi hua.

Available tools/resources mein is project ka Supabase SQL connector nahi mila. Local PATH par psql/Supabase CLI bhi available nahi mile. Repository config files live catalog access prove nahi karti. Service-role application API access ko SQL/catalog read access assume nahi kiya.

No secrets read/requested, no network database request, no user records or private evidence opened. Attached read-only inspection SQL user ko run karni hai. No application, environment, migration or policy changes.

## B. Live Core Schema Inventory

Pending. Query 01 core presence aur other relations discover karti hai; 02 columns/defaults/generated flags, 03 constraints/indexes/enums. Custom schemas found hon to unki detail follow-up mein inspect hogi. Zero returned rows ko permission visibility ke baghair missing schema proof nahi samjhenge.

## C. Live RLS Matrix

Pending Query 04 and relation RLS/FORCE RLS from 01. Actual USING/WITH CHECK plus permissive/restrictive combination inspect hogi. Repository policies deployed assume nahi hain.

## D. Database Grants & RPC Security

Pending Queries 05-09 and 12. Effective table/column privileges, PUBLIC/default ACLs, schema access, role membership, function execute, SECURITY DEFINER, search_path, source and triggers needed. Grants aur RLS separate evaluate honge.

Function-source export ko share karne se pehlay secret literals/private allowlist emails redact karein. Signature, logic aur REDACTED markers preserve karein. Queries routine bodies EXECUTE nahi karti.

## E. Storage Security Inventory

Pending Query 10 plus Storage policies/grants from 01-06. trust-evidence aur profile-documents ki actual bucket privacy, MIME/size limits aur permissions abhi unconfirmed hain. Bucket metadata only requested; object rows/contents nahi.

## F. Existing Verification/Review Infrastructure

Phase 1 mein local code observed tha; live equivalent existence abhi confirm nahi. trust_evidence reuse, grant restrictions, deletion/history behavior aur claim relationships ke conclusions actual results ke baad honge. Evidence pipelines ko security-equivalent abhi declare nahi kar sakte.

## G. Repository vs Live Schema Drift

Pending all results. Query 11 migration-history structure discover karti hai; version-only follow-up actual schema dekh kar milega. History existence script execution ka complete proof nahi: manual SQL Editor changes separately compare karni hongi.

## H. Privacy/Security Risks

Critical: no live-confirmed finding yet.
High: no live-confirmed finding yet.
Medium: no live-confirmed finding yet.
Low: no live-confirmed finding yet.

Ye clean bill of health nahi. Phase 1 local-code risks remain recorded, lekin live severity/catalog facts invent nahi karenge. Shareable exports mein hard-coded secrets/allowlist emails pehlay redact karein; profile rows ya documents bhejne ki zaroorat nahi.

## I. Trust Passport Schema Decision

verification_requests: DEFERRED.
Claim-to-evidence relationship: DEFERRED.
verification_badges: DEFERRED.
verification_audit_logs: DEFERRED.
professional_email_challenges: DEFERRED.

CREATE NEW / EXTEND EXISTING / DO NOT CREATE classification live equivalents dekhe baghair choose nahi hogi.

## J. Proposed Phase 2B Schema

Not finalized. No table/column/privacy design promoted to final schema in this phase. Phase 1 proposal provisional hai. Actual live evidence ownership, sharing and provenance determine karenge kaunsa minimal extension suitable hai.

## K. Phase 2B File Plan

Deferred until live inventory. No final migration generated.
This phase only produced:
- audit/phase2a_read_only_inventory.sql
- audit/PHASE2A_LIVE_INVENTORY_STATUS.md

Phase 1 implementation file plan provisional remains; application unchanged.

## L. Blockers

1. User runs numbered queries 01-12 individually in connected Supabase project's SQL Editor with No limit.
2. Export complete JSON/CSV per query, label Q01 through Q12. Long cells/screenshots can truncate definitions; file export preferred.
3. Send first Q01-Q04 if batching easier; remaining Q05-Q12 afterwards.
4. Include project reference (not key/password) and whether this is development or production, to confirm target.
5. If a query fails, send query number and full error; do not modify schema or execute old fixes.
6. Custom schemas/functions found outside initial detailed public/storage scope may need another read-only query.
7. After results, A-L final live report will replace pending conclusions; explicit approval still needed before Phase 2B.

No keys, passwords, user data, actual documents or provider payloads required.
