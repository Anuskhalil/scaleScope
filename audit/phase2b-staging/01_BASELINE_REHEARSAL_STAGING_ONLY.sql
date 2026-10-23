-- STAGING BASELINE REHEARSAL ONLY. Never run on production.

-- Verify Dashboard URL: /project/sopklyxvzmungxwgboqs/sql/

-- This deliberately ends in ROLLBACK. Do not replace it with COMMIT.

-- Includes legacy unsafe privileges ONLY inside the uncommitted rehearsal.

BEGIN;

SET LOCAL search_path = public, extensions, pg_catalog;

SET LOCAL lock_timeout = '5s';

SET LOCAL statement_timeout = '120s';

DO $preflight$
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Run as postgres in the isolated staging SQL Editor';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f'))
     OR EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                WHERE n.nspname='public')
     OR EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
                WHERE n.nspname='public')
  THEN
    RAISE EXCEPTION 'STOP: public schema is not empty. Wrong target or baseline already applied.';
  END IF;
  IF EXISTS (SELECT 1 FROM storage.buckets)
     OR EXISTS (SELECT 1 FROM pg_policies WHERE schemaname IN ('public','storage')) THEN
    RAISE EXCEPTION 'STOP: staging buckets/policies are not empty';
  END IF;
  IF to_regprocedure('auth.uid()') IS NULL
     OR to_regprocedure('auth.role()') IS NULL
     OR to_regprocedure('extensions.uuid_generate_v4()') IS NULL
     OR to_regclass('auth.users') IS NULL THEN
    RAISE EXCEPTION 'Required managed Auth/extension dependencies are missing';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='auth.users'::regclass
             AND tgname='on_auth_user_created' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Unexpected pre-existing signup trigger';
  END IF;
END
$preflight$;

DO $extension$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='pg_stat_statements' AND e.extversion='1.11' AND n.nspname='extensions') THEN RAISE EXCEPTION 'Extension baseline changed'; END IF; END $extension$;

DO $extension$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='pgcrypto' AND e.extversion='1.3' AND n.nspname='extensions') THEN RAISE EXCEPTION 'Extension baseline changed'; END IF; END $extension$;

DO $extension$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='plpgsql' AND e.extversion='1.0' AND n.nspname='pg_catalog') THEN RAISE EXCEPTION 'Extension baseline changed'; END IF; END $extension$;

DO $extension$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='supabase_vault' AND e.extversion='0.3.1' AND n.nspname='vault') THEN RAISE EXCEPTION 'Extension baseline changed'; END IF; END $extension$;

DO $extension$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='uuid-ossp' AND e.extversion='1.1' AND n.nspname='extensions') THEN RAISE EXCEPTION 'Extension baseline changed'; END IF; END $extension$;

CREATE TYPE "public"."user_role" AS ENUM ('student', 'job_seeker', 'graduate', 'founder', 'investor', 'mentor', 'mentor_investor');

CREATE TABLE "public"."ai_growth_plans" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "role" text NOT NULL,
  "source" text DEFAULT 'deterministic_fallback'::text NOT NULL,
  "headline" text,
  "weekly_plan" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "match_strategy" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "mentor_gap" text,
  "investor_gap" text,
  "risk_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "confidence" numeric,
  "generated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."ai_growth_plans" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."audit_log" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "table_name" text NOT NULL,
  "operation" text NOT NULL,
  "old_data" jsonb,
  "new_data" jsonb,
  "user_id" uuid,
  "ip_address" inet,
  "created_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."connected_identity_accounts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "provider" text NOT NULL,
  "provider_user_id" text NOT NULL,
  "provider_email" text,
  "provider_name" text,
  "profile_url" text,
  "verified_at" timestamp with time zone DEFAULT now() NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);

ALTER TABLE "public"."connected_identity_accounts" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."connection_requests" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "sender_id" uuid NOT NULL,
  "receiver_id" uuid NOT NULL,
  "type" text NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "message" text,
  "responded_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "public"."connection_requests" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."connections" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_1" uuid NOT NULL,
  "user_2" uuid NOT NULL,
  "connection_type" text,
  "connected_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "public"."connections" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."conversation_members" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "joined_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "public"."conversation_members" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."conversation_participants" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "last_read_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "public"."conversation_participants" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."conversations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "type" text DEFAULT 'direct'::text,
  "title" text,
  "last_message_at" timestamp with time zone DEFAULT now(),
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."evidence_ai_reviews" (
  "evidence_id" uuid NOT NULL,
  "ai_status" text DEFAULT 'queued'::text NOT NULL,
  "ai_report" jsonb,
  "attempts" integer DEFAULT 0 NOT NULL,
  "available_at" timestamp with time zone DEFAULT now() NOT NULL,
  "lease_until" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."evidence_ai_reviews" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."evidence_grants" (
  "evidence_id" uuid NOT NULL,
  "recipient_id" uuid NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."evidence_grants" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."evidence_reviews" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "evidence_id" uuid NOT NULL,
  "reviewer_id" uuid,
  "status" text NOT NULL,
  "note" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."evidence_reviews" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."founder_profiles" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "company_name" text,
  "idea_title" text,
  "industry" text,
  "startup_stage" text,
  "company_stage" text,
  "problem_statement" text,
  "problem_solving" text,
  "solution_description" text,
  "unique_value_proposition" text,
  "target_market" text,
  "target_audience" text,
  "competitors" text,
  "revenue_model" text,
  "launch_timeline" text,
  "founding_year" integer,
  "team_size" integer DEFAULT 1,
  "funding_stage" text,
  "funding_raised" text,
  "pitch_deck_url" text,
  "demo_url" text,
  "website_url" text,
  "looking_for" text[] DEFAULT '{}'::text[],
  "help_needed" text[] DEFAULT '{}'::text[],
  "skills_needed" text[] DEFAULT '{}'::text[],
  "profile_completion" integer DEFAULT 0,
  "is_public" boolean DEFAULT true,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "founder_role" text,
  "commitment_level" text,
  "weekly_hours" text,
  "validation_status" text,
  "customer_validation" text,
  "traction_summary" text,
  "traction_metrics" jsonb DEFAULT '{}'::jsonb,
  "business_model_details" text,
  "go_to_market_strategy" text,
  "current_challenges" text,
  "hiring_roles" text[] DEFAULT '{}'::text[],
  "equity_available" text,
  "cofounder_requirements" text,
  "ask_amount" text,
  "use_of_funds" text,
  "milestones_next_6_months" text,
  "market_size" text,
  "product_status" text,
  "tech_stack" text[] DEFAULT '{}'::text[],
  "key_risks" text[] DEFAULT '{}'::text[],
  "founder_skills" text[] DEFAULT '{}'::text[],
  "startup_location" text,
  "legal_status" text,
  "monthly_revenue" numeric,
  "active_users" integer DEFAULT 0,
  "customer_count" integer DEFAULT 0,
  "incubator_or_accelerator" text,
  "pitch_video_url" text,
  "investment_readiness" text,
  "cofounder_status" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "onboarding_completed" boolean DEFAULT false NOT NULL
);

ALTER TABLE "public"."founder_profiles" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."interaction_history" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "target_user_id" uuid,
  "interaction_type" text NOT NULL,
  "context" jsonb DEFAULT '{}'::jsonb,
  "outcome" text,
  "created_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "public"."interaction_history" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."investor_profiles" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "profile_id" uuid,
  "investor_type" text,
  "firm_name" text,
  "investment_stage" text[] DEFAULT '{}'::text[],
  "industries_of_interest" text[] DEFAULT '{}'::text[],
  "ticket_size_min" numeric,
  "ticket_size_max" numeric,
  "geographic_focus" text,
  "portfolio_count" integer DEFAULT 0,
  "successful_exits" integer DEFAULT 0,
  "notable_investments" text,
  "investment_thesis" text,
  "typical_involvement" text,
  "accepting_pitches" boolean DEFAULT true,
  "preferred_contact_method" text,
  "fund_name" text,
  "preferred_stages" text[] DEFAULT '{}'::text[],
  "preferred_industries" text[] DEFAULT '{}'::text[],
  "check_range_min" numeric,
  "check_range_max" numeric,
  "geography_focus" text,
  "total_investments" integer DEFAULT 0,
  "exits" integer DEFAULT 0,
  "what_i_look_for" text,
  "is_verified" boolean DEFAULT false,
  "response_time" text,
  "profile_completion" integer DEFAULT 0,
  "onboarding_completed" boolean DEFAULT false,
  "is_public" boolean DEFAULT true,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "website_url" text,
  "booking_url" text,
  "investment_frequency" text,
  "lead_or_follow" text,
  "minimum_traction_required" text,
  "preferred_business_models" text[] DEFAULT '{}'::text[],
  "portfolio_url" text,
  "due_diligence_requirements" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);

ALTER TABLE "public"."investor_profiles" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."match_feedback" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "reviewer_id" uuid NOT NULL,
  "target_user_id" uuid NOT NULL,
  "match_context" text DEFAULT 'profile_view'::text NOT NULL,
  "rating" integer,
  "feedback" text,
  "reason_tags" text[] DEFAULT '{}'::text[] NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."match_feedback" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."match_outcomes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "reviewer_id" uuid NOT NULL,
  "target_user_id" uuid NOT NULL,
  "connection_id" uuid,
  "context" text DEFAULT 'post_intro'::text NOT NULL,
  "outcome" text NOT NULL,
  "rating" integer,
  "reason_tags" text[] DEFAULT '{}'::text[] NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."match_outcomes" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."matching_events" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" uuid NOT NULL,
  "target_id" uuid NOT NULL,
  "event_type" text NOT NULL,
  "reference" text NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."matching_events" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."matching_preferences" (
  "user_id" uuid NOT NULL,
  "prefer_same_university" boolean DEFAULT false,
  "prefer_same_location" boolean DEFAULT true,
  "min_commitment_level" text DEFAULT 'Casual (2–5 hrs/week)'::text,
  "skill_complementarity_weight" numeric(3,2) DEFAULT 0.4,
  "experience_level_weight" numeric(3,2) DEFAULT 0.3,
  "updated_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "public"."matching_preferences" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."meeting_followups" (
  "meeting_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "outcome" text NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "next_action" text DEFAULT ''::text NOT NULL,
  "due_at" timestamp with time zone,
  "completed" boolean DEFAULT false NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."meeting_followups" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."meeting_participants" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "meeting_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" text DEFAULT 'participant'::text NOT NULL,
  "joined_at" timestamp with time zone,
  "left_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."meeting_participants" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."meetings" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid,
  "host_id" uuid NOT NULL,
  "title" text NOT NULL,
  "provider" text DEFAULT 'livekit'::text NOT NULL,
  "room_name" text NOT NULL,
  "status" text DEFAULT 'scheduled'::text NOT NULL,
  "scheduled_at" timestamp with time zone,
  "started_at" timestamp with time zone,
  "ended_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."meetings" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."mentor_profiles" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "expertise_areas" text[] DEFAULT '{}'::text[],
  "years_experience" integer DEFAULT 0,
  "current_role" text,
  "current_company" text,
  "companies_worked" text[] DEFAULT '{}'::text[],
  "companies_founded" text[] DEFAULT '{}'::text[],
  "successful_exits" integer DEFAULT 0,
  "mentorship_style" text,
  "can_help_with" text[] DEFAULT '{}'::text[],
  "available_for" text[] DEFAULT '{}'::text[],
  "mentorship_capacity" integer DEFAULT 3,
  "current_mentees" integer DEFAULT 0,
  "hourly_rate" numeric,
  "is_pro_bono" boolean DEFAULT false,
  "profile_completion" integer DEFAULT 0,
  "onboarding_completed" boolean DEFAULT false,
  "is_public" boolean DEFAULT true,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "booking_url" text,
  "preferred_mentees" text[] DEFAULT '{}'::text[],
  "industries_supported" text[] DEFAULT '{}'::text[],
  "languages" text[] DEFAULT '{}'::text[],
  "availability_hours" text,
  "timezone" text,
  "mentorship_mode" text,
  "success_stories" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);

ALTER TABLE "public"."mentor_profiles" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."mentorship_milestones" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "mentor_id" uuid NOT NULL,
  "mentee_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "status" text DEFAULT 'active'::text NOT NULL,
  "due_date" date,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."mentorship_milestones" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."messages" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL,
  "sender_id" uuid NOT NULL,
  "content" text NOT NULL,
  "is_ai_generated" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now(),
  "read_at" timestamp with time zone,
  "type" text DEFAULT 'text'::text,
  "file_url" text,
  "file_name" text,
  "file_size" integer,
  "updated_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."opportunities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "type" text NOT NULL,
  "description" text,
  "organiser" text,
  "link" text,
  "deadline" date,
  "location" text DEFAULT 'Remote'::text,
  "is_featured" boolean DEFAULT false,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "posted_by" uuid,
  "city" text,
  "area" text,
  "domain" text,
  "industry" text,
  "source" text,
  "source_url" text,
  "starts_at" timestamp with time zone,
  "mode" text DEFAULT 'offline'::text,
  "tags" text[] DEFAULT '{}'::text[],
  "verified" boolean DEFAULT false
);

ALTER TABLE "public"."opportunities" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profile_evidence_files" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "role" text NOT NULL,
  "evidence_type" text NOT NULL,
  "storage_bucket" text DEFAULT 'profile-evidence'::text NOT NULL,
  "storage_path" text NOT NULL,
  "file_name" text,
  "mime_type" text,
  "size_bytes" bigint,
  "verification_status" text DEFAULT 'pending'::text NOT NULL,
  "extracted_summary" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."profile_evidence_files" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profile_review_history" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "revision" integer NOT NULL,
  "status" text NOT NULL,
  "note" text NOT NULL,
  "reviewer_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."profile_review_history" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profile_reviews" (
  "user_id" uuid NOT NULL,
  "revision" integer DEFAULT 1 NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "decision_note" text,
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "ai_status" text DEFAULT 'queued'::text NOT NULL,
  "ai_report" jsonb,
  "attempts" integer DEFAULT 0 NOT NULL,
  "available_at" timestamp with time zone DEFAULT now() NOT NULL,
  "lease_until" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."profile_reviews" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profile_verification_checks" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "verification_id" uuid,
  "role" text NOT NULL,
  "check_type" text NOT NULL,
  "target_key" text NOT NULL,
  "target_label" text NOT NULL,
  "target_value" text,
  "status" text NOT NULL,
  "score" integer DEFAULT 0 NOT NULL,
  "message" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "checked_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."profile_verification_checks" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profile_verifications" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "role" text NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "trust_score" integer DEFAULT 0 NOT NULL,
  "required_passed" boolean DEFAULT false NOT NULL,
  "summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "required_failures" text[] DEFAULT '{}'::text[] NOT NULL,
  "warnings" text[] DEFAULT '{}'::text[] NOT NULL,
  "verified_links" integer DEFAULT 0 NOT NULL,
  "failed_links" integer DEFAULT 0 NOT NULL,
  "checked_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."profile_verifications" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profiles" (
  "id" uuid NOT NULL,
  "full_name" text NOT NULL,
  "email" text NOT NULL,
  "user_type" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now(),
  "last_active" timestamp with time zone DEFAULT now(),
  "created_at" timestamp with time zone DEFAULT now(),
  "deleted_at" timestamp with time zone,
  "avatar_url" text,
  "bio" text,
  "location" text,
  "linkedin_url" text,
  "github_url" text,
  "twitter_url" text
);

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."roadmap_tasks" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "role" text NOT NULL,
  "task_key" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "status" text DEFAULT 'active'::text NOT NULL,
  "priority" text DEFAULT 'medium'::text NOT NULL,
  "cta_label" text,
  "cta_path" text,
  "source" text DEFAULT 'deterministic_v1'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."roadmap_tasks" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."skill_taxonomy" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "category" text NOT NULL,
  "parent_skill_id" uuid,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "public"."skill_taxonomy" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."startup_readiness_scores" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "source_role" text NOT NULL,
  "startup_title" text,
  "score" integer DEFAULT 0 NOT NULL,
  "stage" text,
  "investor_ready" boolean DEFAULT false NOT NULL,
  "strengths" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "risks" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "calculated_by" text DEFAULT 'deterministic_v1'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."startup_readiness_scores" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."student_activities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "type" text NOT NULL,
  "description" text NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "public"."student_activities" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."student_profiles" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "university" text,
  "degree" text,
  "major" text,
  "current_year" text,
  "career_goals" text,
  "looking_for" text[],
  "projects" text[],
  "has_startup_idea" boolean DEFAULT false,
  "startup_idea_description" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "skills_with_levels" jsonb DEFAULT '[]'::jsonb,
  "help_needed" text[] DEFAULT '{}'::text[],
  "commitment_level" text,
  "hours_per_week" text,
  "collaboration_preference" text,
  "has_cofounder" boolean DEFAULT false,
  "resume_url" text,
  "launch_risk_flags" text[] DEFAULT '{}'::text[],
  "short_bio_for_mentors" text,
  "graduation_year_int" integer,
  "profile_completion" integer DEFAULT 0,
  "onboarding_completed" boolean DEFAULT false,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "idea_title" text,
  "idea_domain" text,
  "idea_stage" text,
  "target_audience" text,
  "unique_value_prop" text,
  "portfolio_url" text,
  "preferred_role" text,
  "preferred_industries" text[] DEFAULT '{}'::text[],
  "open_to_internship" boolean DEFAULT false,
  "open_to_cofounder" boolean DEFAULT false,
  "availability_status" text,
  "languages" text[] DEFAULT '{}'::text[],
  "city_or_campus" text,
  "is_public" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT false NOT NULL
);

ALTER TABLE "public"."student_profiles" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."subscription_plans" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "role_scope" text[] DEFAULT '{}'::text[] NOT NULL,
  "price_monthly" numeric DEFAULT 0 NOT NULL,
  "price_yearly" numeric DEFAULT 0 NOT NULL,
  "currency" text DEFAULT 'USD'::text NOT NULL,
  "description" text,
  "features" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "limits" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."subscription_plans" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."trust_evidence" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" uuid NOT NULL,
  "category" text NOT NULL,
  "title" text NOT NULL,
  "claim" text NOT NULL,
  "object_path" text NOT NULL,
  "mime_type" text NOT NULL,
  "byte_size" integer NOT NULL,
  "sha256" text NOT NULL,
  "technical_status" text DEFAULT 'format_checked'::text NOT NULL,
  "review_status" text DEFAULT 'pending'::text NOT NULL,
  "review_note" text,
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."trust_evidence" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."trust_scores" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "role" text NOT NULL,
  "score" integer DEFAULT 0 NOT NULL,
  "level" text,
  "badges" text[] DEFAULT '{}'::text[] NOT NULL,
  "missing_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "calculated_by" text DEFAULT 'deterministic_v1'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."trust_scores" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."usage_counters" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "feature_key" text NOT NULL,
  "period_key" text NOT NULL,
  "used_count" integer DEFAULT 0 NOT NULL,
  "limit_count" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."usage_counters" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."user_auth_tracking" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "user_id" uuid,
  "last_login" timestamp with time zone,
  "login_count" integer DEFAULT 0,
  "last_ip_address" text,
  "last_user_agent" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "email" text
);

ALTER TABLE "public"."user_auth_tracking" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."user_skills" (
  "user_id" uuid NOT NULL,
  "skill_id" uuid NOT NULL,
  "proficiency_level" text,
  "years_experience" numeric(3,1),
  "verified" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "public"."user_skills" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."user_subscriptions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "plan_code" text DEFAULT 'free'::text NOT NULL,
  "status" text DEFAULT 'free'::text NOT NULL,
  "provider" text DEFAULT 'manual'::text NOT NULL,
  "provider_customer_id" text,
  "provider_subscription_id" text,
  "current_period_start" timestamp with time zone,
  "current_period_end" timestamp with time zone,
  "cancel_at_period_end" boolean DEFAULT false NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."user_subscriptions" ENABLE ROW LEVEL SECURITY;

SET LOCAL check_function_bodies = false;

CREATE OR REPLACE FUNCTION public.capture_matching_request_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare kind text;
begin
 if TG_OP = 'INSERT' and new.status = 'pending' then
  kind := 'request_sent';
 elsif TG_OP = 'UPDATE' and new.status is distinct from old.status and new.status in ('accepted','declined') then
  kind := case when new.status = 'accepted' then 'request_accepted' else 'request_declined' end;
 else
  return new;
 end if;
 insert into public.matching_events(actor_id,target_id,event_type,reference,payload)
 values (
 case when kind='request_sent' then new.sender_id else new.receiver_id end,
 case when kind='request_sent' then new.receiver_id else new.sender_id end,
 kind,new.id::text,jsonb_build_object('source','connection_requests')
 ) on conflict(actor_id,target_id,event_type,reference) do nothing;
 return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.claim_review_job(p_kind text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare job jsonb;
begin
 if p_kind='profile' then
  update public.profile_reviews set ai_status='failed',lease_until=null where ai_status='running' and lease_until<now() and attempts>=3;
  with candidate as (
   select user_id from public.profile_reviews where
   (ai_status in ('queued','failed') and attempts<3 and available_at<=now())
   or (ai_status='running' and lease_until<now() and attempts<3)
   order by updated_at for update skip locked limit 1
  )
  update public.profile_reviews r set ai_status='running',attempts=attempts+1,lease_until=now()+interval '2 minutes'
  from candidate c where r.user_id=c.user_id returning to_jsonb(r) into job;
 elsif p_kind='evidence' then
  update public.evidence_ai_reviews set ai_status='failed',lease_until=null where ai_status='running' and lease_until<now() and attempts>=3;
  with candidate as (
   select evidence_id from public.evidence_ai_reviews where
   (ai_status in ('queued','failed') and attempts<3 and available_at<=now())
   or (ai_status='running' and lease_until<now() and attempts<3)
   order by updated_at for update skip locked limit 1
  )
  update public.evidence_ai_reviews r set ai_status='running',attempts=attempts+1,lease_until=now()+interval '2 minutes'
  from candidate c where r.evidence_id=c.evidence_id returning to_jsonb(r) into job;
 end if;
 return job;
end $function$;

CREATE OR REPLACE FUNCTION public.create_conversation_with_participants(p_created_by uuid, p_other_user uuid, p_type text DEFAULT 'direct'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_conversation_id uuid;
begin
  if p_created_by is null or p_other_user is null then
    raise exception 'Both participants are required';
  end if;

  if p_created_by = p_other_user then
    raise exception 'Cannot create conversation with yourself';
  end if;

  select cp1.conversation_id
    into v_conversation_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2
    on cp2.conversation_id = cp1.conversation_id
  join public.conversations c
    on c.id = cp1.conversation_id
  where cp1.user_id = p_created_by
    and cp2.user_id = p_other_user
    and c.type = coalesce(p_type, 'direct')
  order by c.created_at asc
  limit 1;

  if v_conversation_id is null then
    insert into public.conversations(type, created_at, updated_at, last_message_at)
    values (coalesce(p_type, 'direct'), now(), now(), now())
    returning id into v_conversation_id;

    insert into public.conversation_participants(conversation_id, user_id, created_at)
    values
      (v_conversation_id, p_created_by, now()),
      (v_conversation_id, p_other_user, now())
    on conflict (conversation_id, user_id) do nothing;

    insert into public.conversation_members(conversation_id, user_id, joined_at)
    values
      (v_conversation_id, p_created_by, now()),
      (v_conversation_id, p_other_user, now())
    on conflict (conversation_id, user_id) do nothing;
  end if;

  return v_conversation_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.current_profile_approved()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.profile_reviews
 where user_id=(select auth.uid()) and status='approved');
$function$;

CREATE OR REPLACE FUNCTION public.decide_profile_review(p_user uuid, p_revision integer, p_admin uuid, p_status text, p_note text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if p_user=p_admin then raise exception 'Self approval is prohibited'; end if;
 if p_status not in ('approved','changes_requested','rejected') or length(trim(p_note))<20 or length(p_note)>1500 then raise exception 'Invalid decision'; end if;
 update public.profile_reviews set status=p_status,decision_note=p_note,reviewed_by=p_admin,reviewed_at=now(),updated_at=now()
 where user_id=p_user and revision=p_revision and status='pending';
 if not found then return false; end if;
 insert into public.profile_review_history(user_id,revision,status,note,reviewer_id) values(p_user,p_revision,p_status,p_note,p_admin);
 return true;
end $function$;

CREATE OR REPLACE FUNCTION public.enforce_active_registration_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if TG_OP = 'INSERT' then
    if new.user_type is null or new.user_type not in ('early-stage-founder', 'investor') then
      raise exception 'Select Early Founder or Investor.';
    end if;
  elsif new.user_type is distinct from old.user_type then
    if new.user_type is null or new.user_type not in ('early-stage-founder', 'investor') then
      raise exception 'Select Early Founder or Investor.';
    end if;
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.get_user_profile(user_uuid uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    profile_data JSON;
    role_data JSON;
    user_role TEXT;
BEGIN
    -- Get base profile
    SELECT row_to_json(up.*) INTO profile_data
    FROM public.user_profiles up
    WHERE up.id = user_uuid;
    
    IF profile_data IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get user role
    SELECT user_type INTO user_role
    FROM public.user_profiles
    WHERE id = user_uuid;
    
    -- Get role-specific data
    CASE user_role
        WHEN 'student' THEN
            SELECT row_to_json(sp.*) INTO role_data
            FROM public.student_profiles sp
            WHERE sp.user_id = user_uuid;
        WHEN 'early-stage-founder' THEN
            SELECT row_to_json(fp.*) INTO role_data
            FROM public.founder_profiles fp
            WHERE fp.user_id = user_uuid;
        WHEN 'mentor' THEN
            SELECT row_to_json(mp.*) INTO role_data
            FROM public.mentor_profiles mp
            WHERE mp.user_id = user_uuid;
        WHEN 'investor' THEN
            SELECT row_to_json(ip.*) INTO role_data
            FROM public.investor_profiles ip
            WHERE ip.user_id = user_uuid;
        ELSE
            role_data := NULL;
    END CASE;
    
    -- Combine profile and role data
    RETURN json_build_object(
        'profile', profile_data,
        'role_data', role_data
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_client_profile_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if current_user in ('anon', 'authenticated') then
    if TG_TABLE_NAME = 'profiles' then
      if TG_OP = 'UPDATE' and (
        new.id is distinct from old.id or
        new.user_type is distinct from old.user_type
      ) then
        raise exception 'Account identity and role can only be changed through an authorized server workflow.'
          using errcode = '42501';
      end if;
    elsif TG_TABLE_NAME = 'investor_profiles' then
      if TG_OP = 'INSERT' and new.is_verified is true then
        raise exception 'Verification is managed by the server.' using errcode = '42501';
      elsif TG_OP = 'UPDATE' then
        if new.is_verified is distinct from old.is_verified then
          raise exception 'Verification is managed by the server.' using errcode = '42501';
        end if;
        if new.user_id is distinct from old.user_id then
          raise exception 'Profile ownership cannot be changed.' using errcode = '42501';
        end if;
      end if;
      -- Nullable legacy alias must never point at another account.
      new.profile_id := new.user_id;
    elsif TG_TABLE_NAME = 'founder_profiles' then
      if TG_OP = 'UPDATE' and new.user_id is distinct from old.user_id then
        raise exception 'Profile ownership cannot be changed.' using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.guard_reviewed_connection()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare first_id uuid; second_id uuid;
begin
 if TG_TABLE_NAME='connections' then first_id:=NEW.user_1;second_id:=NEW.user_2;
 else
  if TG_OP='UPDATE' and (NEW.status is not distinct from OLD.status or NEW.status<>'accepted') then return NEW; end if;
  first_id:=NEW.sender_id;second_id:=NEW.receiver_id;
 end if;
 if not exists(select 1 from public.profile_reviews where user_id=first_id and status='approved')
 or not exists(select 1 from public.profile_reviews where user_id=second_id and status='approved') then
  raise exception 'Both profiles must be approved before creating a connection';
 end if;
 return NEW;
end $function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_full_name text;
  v_user_type text;
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'User'
  );

  v_user_type := COALESCE(
    NEW.raw_user_meta_data->>'user_type',
    'student'
  );

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    user_type,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_user_type,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    user_type = EXCLUDED.user_type;

  IF v_user_type = 'student' THEN
    INSERT INTO public.student_profiles (
      user_id,
      profile_completion,
      created_at
    )
    VALUES (
      NEW.id,
      0,
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  IF to_regclass('public.user_auth_tracking') IS NOT NULL THEN
    INSERT INTO public.user_auth_tracking (
      id,
      last_login,
      login_count
    )
    VALUES (
      NEW.id,
      NULL,
      0
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_login_tracking(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.user_auth_tracking (id, last_login, login_count)
  VALUES (p_user_id, now(), 1)
  ON CONFLICT (id)
  DO UPDATE SET
    last_login = now(),
    login_count = COALESCE(user_auth_tracking.login_count, 0) + 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_profile_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, operation, old_data, new_data, user_id)
    VALUES (TG_TABLE_NAME, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.queue_evidence_analysis()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid;
begin
 if TG_OP='UPDATE' and NEW.review_status is not distinct from OLD.review_status then return NEW; end if;
 if TG_OP='DELETE' then uid:=OLD.owner_id; else
  uid:=NEW.owner_id;
  insert into public.evidence_ai_reviews(evidence_id) values(NEW.id) on conflict do nothing;
 end if;
 update public.profile_reviews set revision=revision+1,status='pending',decision_note=null,
 reviewed_by=null,reviewed_at=null,ai_status='queued',ai_report=null,attempts=0,
 available_at=now()+interval '10 seconds',lease_until=null,updated_at=now() where user_id=uid;
 if TG_OP='DELETE' then return OLD; end if; return NEW;
end $function$;

CREATE OR REPLACE FUNCTION public.queue_profile_review()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid;
begin
 if TG_OP='DELETE' then
  update public.profile_reviews set revision=revision+1,status='pending',decision_note=null,reviewed_at=null,reviewed_by=null,ai_status='queued',ai_report=null,attempts=0,available_at=now(),lease_until=null,updated_at=now() where user_id=OLD.user_id;
  return OLD;
 end if;
 if TG_TABLE_NAME='profiles' then
  uid:=NEW.id;
  if NEW.user_type not in ('early-stage-founder','investor') then return NEW; end if;
 else uid:=NEW.user_id;
 end if;
 if TG_OP='UPDATE' and
 (to_jsonb(NEW)-array['updated_at','last_active','profile_completion','onboarding_completed']) =
 (to_jsonb(OLD)-array['updated_at','last_active','profile_completion','onboarding_completed']) then return NEW; end if;
 insert into public.profile_reviews(user_id) values(uid)
 on conflict(user_id) do update set revision=public.profile_reviews.revision+1,status='pending',
 decision_note=null,reviewed_by=null,reviewed_at=null,ai_status='queued',ai_report=null,attempts=0,
 available_at=now()+interval '10 seconds',lease_until=null,updated_at=now();
 return NEW;
end $function$;

CREATE OR REPLACE FUNCTION public.record_evidence_review(p_evidence uuid, p_reviewer uuid, p_status text, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if p_status not in ('supported','needs_changes','rejected') or length(trim(p_note))<20 or length(p_note)>1000 then
  raise exception 'Invalid review';
 end if;
 update public.trust_evidence set review_status=p_status,review_note=p_note,reviewed_by=p_reviewer,reviewed_at=now()
 where id=p_evidence and owner_id<>p_reviewer;
 if not found then raise exception 'Evidence unavailable or self-review prohibited'; end if;
 insert into public.evidence_reviews(evidence_id,reviewer_id,status,note) values(p_evidence,p_reviewer,p_status,p_note);
end; $function$;

CREATE OR REPLACE FUNCTION public.refresh_matching_scores()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.matching_candidate_scores;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.soft_delete_user(user_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.profiles 
  SET deleted_at = NOW(), 
      onboarding_completed = false,
      metadata = jsonb_set(metadata, '{deleted_reason}', '"user_requested"')
  WHERE id = user_uuid;
  -- Related tables auto-CASCADE due to FK constraints
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_graduation_year()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.graduation_year ~ '^\d{4}$' THEN
    NEW.graduation_year_int := NEW.graduation_year::INTEGER;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_investor_profile_aliases()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.profile_id := coalesce(new.profile_id, new.user_id);

  new.firm_name := coalesce(new.firm_name, new.fund_name);
  new.fund_name := coalesce(new.fund_name, new.firm_name);

  new.investment_stage := coalesce(new.investment_stage, new.preferred_stages, '{}'::text[]);
  new.preferred_stages := coalesce(new.preferred_stages, new.investment_stage, '{}'::text[]);

  new.industries_of_interest := coalesce(new.industries_of_interest, new.preferred_industries, '{}'::text[]);
  new.preferred_industries := coalesce(new.preferred_industries, new.industries_of_interest, '{}'::text[]);

  new.ticket_size_min := coalesce(new.ticket_size_min, new.check_range_min);
  new.check_range_min := coalesce(new.check_range_min, new.ticket_size_min);

  new.ticket_size_max := coalesce(new.ticket_size_max, new.check_range_max);
  new.check_range_max := coalesce(new.check_range_max, new.ticket_size_max);

  new.geographic_focus := coalesce(new.geographic_focus, new.geography_focus);
  new.geography_focus := coalesce(new.geography_focus, new.geographic_focus);

  new.portfolio_count := coalesce(new.portfolio_count, new.total_investments, 0);
  new.total_investments := coalesce(new.total_investments, new.portfolio_count, 0);

  new.successful_exits := coalesce(new.successful_exits, new.exits, 0);
  new.exits := coalesce(new.exits, new.successful_exits, 0);

  new.investment_thesis := coalesce(new.investment_thesis, new.what_i_look_for);
  new.what_i_look_for := coalesce(new.what_i_look_for, new.investment_thesis);

  new.updated_at := now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

SET LOCAL check_function_bodies = true;

ALTER TABLE "public"."ai_growth_plans" ADD CONSTRAINT "ai_growth_plans_confidence_check" CHECK (confidence IS NULL OR confidence >= 0::numeric AND confidence <= 1::numeric);

ALTER TABLE "public"."ai_growth_plans" ADD CONSTRAINT "ai_growth_plans_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."ai_growth_plans" ADD CONSTRAINT "ai_growth_plans_user_id_key" UNIQUE (user_id);

ALTER TABLE "public"."audit_log" ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."connected_identity_accounts" ADD CONSTRAINT "connected_identity_accounts_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."connected_identity_accounts" ADD CONSTRAINT "connected_identity_accounts_user_id_provider_key" UNIQUE (user_id, provider);

ALTER TABLE "public"."connection_requests" ADD CONSTRAINT "connection_requests_no_self" CHECK (sender_id <> receiver_id);

ALTER TABLE "public"."connection_requests" ADD CONSTRAINT "connection_requests_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."connection_requests" ADD CONSTRAINT "connection_requests_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'withdrawn'::text]));

ALTER TABLE "public"."connection_requests" ADD CONSTRAINT "connection_requests_type_check" CHECK (type = ANY (ARRAY['mentor_request'::text, 'mentor_offer'::text, 'cofounder_request'::text, 'investor_contact'::text, 'team_invite'::text]));

ALTER TABLE "public"."connections" ADD CONSTRAINT "connections_check" CHECK (user_1 <> user_2);

ALTER TABLE "public"."connections" ADD CONSTRAINT "connections_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."connections" ADD CONSTRAINT "connections_unique_pair" UNIQUE (user_1, user_2);

ALTER TABLE "public"."connections" ADD CONSTRAINT "connections_user_1_user_2_key" UNIQUE (user_1, user_2);

ALTER TABLE "public"."connections" ADD CONSTRAINT "connections_user_pair_unique" UNIQUE (user_1, user_2);

ALTER TABLE "public"."conversation_members" ADD CONSTRAINT "conversation_members_conversation_id_user_id_key" UNIQUE (conversation_id, user_id);

ALTER TABLE "public"."conversation_members" ADD CONSTRAINT "conversation_members_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."conversation_members" ADD CONSTRAINT "conversation_members_unique" UNIQUE (conversation_id, user_id);

ALTER TABLE "public"."conversation_participants" ADD CONSTRAINT "conversation_participants_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."conversation_participants" ADD CONSTRAINT "conversation_participants_unique" UNIQUE (conversation_id, user_id);

ALTER TABLE "public"."conversation_participants" ADD CONSTRAINT "conversation_participants_unique_user" UNIQUE (conversation_id, user_id);

ALTER TABLE "public"."conversations" ADD CONSTRAINT "conversations_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."evidence_ai_reviews" ADD CONSTRAINT "evidence_ai_reviews_ai_status_check" CHECK (ai_status = ANY (ARRAY['queued'::text, 'running'::text, 'complete'::text, 'failed'::text]));

ALTER TABLE "public"."evidence_ai_reviews" ADD CONSTRAINT "evidence_ai_reviews_pkey" PRIMARY KEY (evidence_id);

ALTER TABLE "public"."evidence_grants" ADD CONSTRAINT "evidence_grants_pkey" PRIMARY KEY (evidence_id, recipient_id);

ALTER TABLE "public"."evidence_reviews" ADD CONSTRAINT "evidence_reviews_note_check" CHECK (length(note) >= 20 AND length(note) <= 1000);

ALTER TABLE "public"."evidence_reviews" ADD CONSTRAINT "evidence_reviews_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."evidence_reviews" ADD CONSTRAINT "evidence_reviews_status_check" CHECK (status = ANY (ARRAY['supported'::text, 'needs_changes'::text, 'rejected'::text]));

ALTER TABLE "public"."founder_profiles" ADD CONSTRAINT "founder_intent_v2_check" CHECK (NOT metadata ? 'founder_intent'::text OR jsonb_typeof(metadata -> 'founder_intent'::text) = 'string'::text AND ((metadata ->> 'founder_intent'::text) = ANY (ARRAY['building'::text, 'joining'::text, 'exploring'::text]))) NOT VALID;

ALTER TABLE "public"."founder_profiles" ADD CONSTRAINT "founder_join_consent_v2_check" CHECK (NOT metadata ? 'open_to_joining'::text OR jsonb_typeof(metadata -> 'open_to_joining'::text) = 'boolean'::text) NOT VALID;

ALTER TABLE "public"."founder_profiles" ADD CONSTRAINT "founder_profiles_active_users_check" CHECK (active_users >= 0);

ALTER TABLE "public"."founder_profiles" ADD CONSTRAINT "founder_profiles_customer_count_check" CHECK (customer_count >= 0);

ALTER TABLE "public"."founder_profiles" ADD CONSTRAINT "founder_profiles_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."founder_profiles" ADD CONSTRAINT "founder_profiles_profile_completion_check" CHECK (profile_completion >= 0 AND profile_completion <= 100);

ALTER TABLE "public"."founder_profiles" ADD CONSTRAINT "founder_profiles_team_size_check" CHECK (team_size >= 1);

ALTER TABLE "public"."founder_profiles" ADD CONSTRAINT "founder_profiles_user_id_key" UNIQUE (user_id);

ALTER TABLE "public"."interaction_history" ADD CONSTRAINT "interaction_history_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."investor_profiles" ADD CONSTRAINT "investor_check_range_v2_check" CHECK ((check_range_min IS NULL OR check_range_min >= 0::numeric) AND (check_range_max IS NULL OR check_range_max >= 0::numeric) AND (check_range_min IS NULL OR check_range_max IS NULL OR check_range_min <= check_range_max)) NOT VALID;

ALTER TABLE "public"."investor_profiles" ADD CONSTRAINT "investor_profiles_exits_check" CHECK (exits >= 0);

ALTER TABLE "public"."investor_profiles" ADD CONSTRAINT "investor_profiles_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."investor_profiles" ADD CONSTRAINT "investor_profiles_portfolio_count_check" CHECK (portfolio_count >= 0);

ALTER TABLE "public"."investor_profiles" ADD CONSTRAINT "investor_profiles_profile_completion_check" CHECK (profile_completion >= 0 AND profile_completion <= 100);

ALTER TABLE "public"."investor_profiles" ADD CONSTRAINT "investor_profiles_successful_exits_check" CHECK (successful_exits >= 0);

ALTER TABLE "public"."investor_profiles" ADD CONSTRAINT "investor_profiles_total_investments_check" CHECK (total_investments >= 0);

ALTER TABLE "public"."investor_profiles" ADD CONSTRAINT "investor_profiles_user_id_key" UNIQUE (user_id);

ALTER TABLE "public"."match_feedback" ADD CONSTRAINT "match_feedback_not_self" CHECK (reviewer_id <> target_user_id);

ALTER TABLE "public"."match_feedback" ADD CONSTRAINT "match_feedback_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."match_feedback" ADD CONSTRAINT "match_feedback_rating_check" CHECK (rating >= 1 AND rating <= 5);

ALTER TABLE "public"."match_outcomes" ADD CONSTRAINT "match_outcomes_not_self" CHECK (reviewer_id <> target_user_id);

ALTER TABLE "public"."match_outcomes" ADD CONSTRAINT "match_outcomes_outcome_check" CHECK (outcome = ANY (ARRAY['good_fit'::text, 'poor_fit'::text, 'no_response'::text, 'met_off_platform'::text, 'not_ready'::text]));

ALTER TABLE "public"."match_outcomes" ADD CONSTRAINT "match_outcomes_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."match_outcomes" ADD CONSTRAINT "match_outcomes_rating_check" CHECK (rating >= 1 AND rating <= 5);

ALTER TABLE "public"."matching_events" ADD CONSTRAINT "matching_events_dedup" UNIQUE (actor_id, target_id, event_type, reference);

ALTER TABLE "public"."matching_events" ADD CONSTRAINT "matching_events_event_type_check" CHECK (event_type = ANY (ARRAY['recommendation_generated'::text, 'request_sent'::text, 'request_accepted'::text, 'request_declined'::text, 'feedback_reported'::text]));

ALTER TABLE "public"."matching_events" ADD CONSTRAINT "matching_events_no_self" CHECK (actor_id <> target_id);

ALTER TABLE "public"."matching_events" ADD CONSTRAINT "matching_events_payload_check" CHECK (jsonb_typeof(payload) = 'object'::text);

ALTER TABLE "public"."matching_events" ADD CONSTRAINT "matching_events_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."matching_events" ADD CONSTRAINT "matching_events_reference_check" CHECK (length(reference) >= 1 AND length(reference) <= 160);

ALTER TABLE "public"."matching_preferences" ADD CONSTRAINT "matching_preferences_pkey" PRIMARY KEY (user_id);

ALTER TABLE "public"."matching_preferences" ADD CONSTRAINT "matching_preferences_skill_complementarity_weight_check" CHECK (skill_complementarity_weight >= 0::numeric AND skill_complementarity_weight <= 1::numeric);

ALTER TABLE "public"."meeting_followups" ADD CONSTRAINT "meeting_followups_next_action_check" CHECK (length(next_action) <= 300);

ALTER TABLE "public"."meeting_followups" ADD CONSTRAINT "meeting_followups_notes_check" CHECK (length(notes) <= 2000);

ALTER TABLE "public"."meeting_followups" ADD CONSTRAINT "meeting_followups_outcome_check" CHECK (outcome = ANY (ARRAY['attended'::text, 'no_show'::text, 'reschedule'::text, 'not_held'::text]));

ALTER TABLE "public"."meeting_followups" ADD CONSTRAINT "meeting_followups_pkey" PRIMARY KEY (meeting_id, user_id);

ALTER TABLE "public"."meeting_participants" ADD CONSTRAINT "meeting_participants_meeting_id_user_id_key" UNIQUE (meeting_id, user_id);

ALTER TABLE "public"."meeting_participants" ADD CONSTRAINT "meeting_participants_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."meeting_participants" ADD CONSTRAINT "meeting_participants_role_check" CHECK (role = ANY (ARRAY['host'::text, 'participant'::text]));

ALTER TABLE "public"."meetings" ADD CONSTRAINT "meetings_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."meetings" ADD CONSTRAINT "meetings_room_name_key" UNIQUE (room_name);

ALTER TABLE "public"."meetings" ADD CONSTRAINT "meetings_status_check" CHECK (status = ANY (ARRAY['scheduled'::text, 'live'::text, 'ended'::text, 'cancelled'::text]));

ALTER TABLE "public"."mentor_profiles" ADD CONSTRAINT "mentor_profiles_current_mentees_check" CHECK (current_mentees >= 0);

ALTER TABLE "public"."mentor_profiles" ADD CONSTRAINT "mentor_profiles_mentorship_capacity_check" CHECK (mentorship_capacity >= 0);

ALTER TABLE "public"."mentor_profiles" ADD CONSTRAINT "mentor_profiles_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."mentor_profiles" ADD CONSTRAINT "mentor_profiles_profile_completion_check" CHECK (profile_completion >= 0 AND profile_completion <= 100);

ALTER TABLE "public"."mentor_profiles" ADD CONSTRAINT "mentor_profiles_successful_exits_check" CHECK (successful_exits >= 0);

ALTER TABLE "public"."mentor_profiles" ADD CONSTRAINT "mentor_profiles_user_id_key" UNIQUE (user_id);

ALTER TABLE "public"."mentor_profiles" ADD CONSTRAINT "mentor_profiles_years_experience_check" CHECK (years_experience >= 0);

ALTER TABLE "public"."mentorship_milestones" ADD CONSTRAINT "mentorship_milestones_not_self" CHECK (mentor_id <> mentee_id);

ALTER TABLE "public"."mentorship_milestones" ADD CONSTRAINT "mentorship_milestones_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."mentorship_milestones" ADD CONSTRAINT "mentorship_milestones_status_check" CHECK (status = ANY (ARRAY['active'::text, 'done'::text, 'blocked'::text, 'cancelled'::text]));

ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."opportunities" ADD CONSTRAINT "opportunities_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."opportunities" ADD CONSTRAINT "opportunities_type_check" CHECK (type = ANY (ARRAY['internship'::text, 'event'::text, 'funding'::text, 'hackathon'::text, 'accelerator'::text, 'grant'::text]));

ALTER TABLE "public"."profile_evidence_files" ADD CONSTRAINT "profile_evidence_files_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."profile_evidence_files" ADD CONSTRAINT "profile_evidence_files_size_bytes_check" CHECK (size_bytes IS NULL OR size_bytes >= 0);

ALTER TABLE "public"."profile_evidence_files" ADD CONSTRAINT "profile_evidence_files_status_check" CHECK (verification_status = ANY (ARRAY['pending'::text, 'verified'::text, 'failed'::text, 'needs_review'::text]));

ALTER TABLE "public"."profile_review_history" ADD CONSTRAINT "profile_review_history_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."profile_reviews" ADD CONSTRAINT "profile_reviews_ai_status_check" CHECK (ai_status = ANY (ARRAY['queued'::text, 'running'::text, 'complete'::text, 'failed'::text]));

ALTER TABLE "public"."profile_reviews" ADD CONSTRAINT "profile_reviews_pkey" PRIMARY KEY (user_id);

ALTER TABLE "public"."profile_reviews" ADD CONSTRAINT "profile_reviews_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'changes_requested'::text, 'rejected'::text]));

ALTER TABLE "public"."profile_verification_checks" ADD CONSTRAINT "profile_verification_checks_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."profile_verification_checks" ADD CONSTRAINT "profile_verification_checks_score_check" CHECK (score >= 0 AND score <= 100);

ALTER TABLE "public"."profile_verification_checks" ADD CONSTRAINT "profile_verification_checks_status_check" CHECK (status = ANY (ARRAY['passed'::text, 'failed'::text, 'warning'::text, 'skipped'::text]));

ALTER TABLE "public"."profile_verifications" ADD CONSTRAINT "profile_verifications_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."profile_verifications" ADD CONSTRAINT "profile_verifications_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'verified'::text, 'partially_verified'::text, 'needs_review'::text, 'failed'::text]));

ALTER TABLE "public"."profile_verifications" ADD CONSTRAINT "profile_verifications_trust_score_check" CHECK (trust_score >= 0 AND trust_score <= 100);

ALTER TABLE "public"."profile_verifications" ADD CONSTRAINT "profile_verifications_user_id_key" UNIQUE (user_id);

ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_email_key" UNIQUE (email);

ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_user_type_check" CHECK (user_type = ANY (ARRAY['student'::text, 'early-stage-founder'::text, 'mentor'::text, 'investor'::text, 'other'::text]));

ALTER TABLE "public"."roadmap_tasks" ADD CONSTRAINT "roadmap_tasks_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."roadmap_tasks" ADD CONSTRAINT "roadmap_tasks_priority_check" CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]));

ALTER TABLE "public"."roadmap_tasks" ADD CONSTRAINT "roadmap_tasks_status_check" CHECK (status = ANY (ARRAY['active'::text, 'done'::text, 'dismissed'::text]));

ALTER TABLE "public"."roadmap_tasks" ADD CONSTRAINT "roadmap_tasks_user_id_task_key_key" UNIQUE (user_id, task_key);

ALTER TABLE "public"."skill_taxonomy" ADD CONSTRAINT "skill_taxonomy_name_key" UNIQUE (name);

ALTER TABLE "public"."skill_taxonomy" ADD CONSTRAINT "skill_taxonomy_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."startup_readiness_scores" ADD CONSTRAINT "startup_readiness_scores_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."startup_readiness_scores" ADD CONSTRAINT "startup_readiness_scores_score_check" CHECK (score >= 0 AND score <= 100);

ALTER TABLE "public"."startup_readiness_scores" ADD CONSTRAINT "startup_readiness_scores_source_role_check" CHECK (source_role = ANY (ARRAY['student'::text, 'early-stage-founder'::text]));

ALTER TABLE "public"."startup_readiness_scores" ADD CONSTRAINT "startup_readiness_scores_user_id_key" UNIQUE (user_id);

ALTER TABLE "public"."student_activities" ADD CONSTRAINT "student_activities_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."student_activities" ADD CONSTRAINT "student_activities_type_check" CHECK (type = ANY (ARRAY['profile_updated'::text, 'connection_sent'::text, 'connection_accepted'::text, 'connection_declined'::text, 'connection_withdrawn'::text, 'message_sent'::text, 'opportunity_viewed'::text, 'mentor_request_sent'::text, 'cofounder_request_sent'::text, 'investor_contact_sent'::text, 'profile_viewed'::text, 'onboarding_completed'::text, 'has_cofounder'::text]));

ALTER TABLE "public"."student_profiles" ADD CONSTRAINT "student_profiles_commitment_check" CHECK (commitment_level = ANY (ARRAY['Exploring'::text, 'Casual (2–5 hrs/week)'::text, 'Serious (5–15 hrs/week)'::text, 'Full-time (15–30 hrs/week)'::text]));

ALTER TABLE "public"."student_profiles" ADD CONSTRAINT "student_profiles_graduation_range" CHECK (graduation_year_int >= 2020 AND graduation_year_int <= 2035);

ALTER TABLE "public"."student_profiles" ADD CONSTRAINT "student_profiles_idea_stage_check" CHECK (idea_stage = ANY (ARRAY['idea'::text, 'problem'::text, 'mvp'::text, 'traction'::text, 'revenue'::text]));

ALTER TABLE "public"."student_profiles" ADD CONSTRAINT "student_profiles_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."student_profiles" ADD CONSTRAINT "student_profiles_user_id_key" UNIQUE (user_id);

ALTER TABLE "public"."student_profiles" ADD CONSTRAINT "student_profiles_user_id_unique" UNIQUE (user_id);

ALTER TABLE "public"."subscription_plans" ADD CONSTRAINT "subscription_plans_code_key" UNIQUE (code);

ALTER TABLE "public"."subscription_plans" ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."trust_evidence" ADD CONSTRAINT "trust_evidence_byte_size_check" CHECK (byte_size >= 1 AND byte_size <= 5242880);

ALTER TABLE "public"."trust_evidence" ADD CONSTRAINT "trust_evidence_category_check" CHECK (category = ANY (ARRAY['identity'::text, 'education'::text, 'experience'::text, 'product'::text, 'traction'::text, 'investment_history'::text]));

ALTER TABLE "public"."trust_evidence" ADD CONSTRAINT "trust_evidence_claim_check" CHECK (length(claim) >= 10 AND length(claim) <= 1000);

ALTER TABLE "public"."trust_evidence" ADD CONSTRAINT "trust_evidence_mime_type_check" CHECK (mime_type = ANY (ARRAY['application/pdf'::text, 'image/png'::text, 'image/jpeg'::text]));

ALTER TABLE "public"."trust_evidence" ADD CONSTRAINT "trust_evidence_object_path_key" UNIQUE (object_path);

ALTER TABLE "public"."trust_evidence" ADD CONSTRAINT "trust_evidence_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."trust_evidence" ADD CONSTRAINT "trust_evidence_review_status_check" CHECK (review_status = ANY (ARRAY['pending'::text, 'supported'::text, 'needs_changes'::text, 'rejected'::text]));

ALTER TABLE "public"."trust_evidence" ADD CONSTRAINT "trust_evidence_sha256_check" CHECK (length(sha256) = 64);

ALTER TABLE "public"."trust_evidence" ADD CONSTRAINT "trust_evidence_technical_status_check" CHECK (technical_status = 'format_checked'::text);

ALTER TABLE "public"."trust_evidence" ADD CONSTRAINT "trust_evidence_title_check" CHECK (length(title) >= 1 AND length(title) <= 120);

ALTER TABLE "public"."trust_scores" ADD CONSTRAINT "trust_scores_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."trust_scores" ADD CONSTRAINT "trust_scores_score_check" CHECK (score >= 0 AND score <= 100);

ALTER TABLE "public"."trust_scores" ADD CONSTRAINT "trust_scores_user_id_key" UNIQUE (user_id);

ALTER TABLE "public"."usage_counters" ADD CONSTRAINT "usage_counters_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."usage_counters" ADD CONSTRAINT "usage_counters_unique_period" UNIQUE (user_id, feature_key, period_key);

ALTER TABLE "public"."usage_counters" ADD CONSTRAINT "usage_counters_used_count_check" CHECK (used_count >= 0);

ALTER TABLE "public"."user_auth_tracking" ADD CONSTRAINT "user_auth_tracking_email_key" UNIQUE (email);

ALTER TABLE "public"."user_auth_tracking" ADD CONSTRAINT "user_auth_tracking_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."user_skills" ADD CONSTRAINT "user_skills_pkey" PRIMARY KEY (user_id, skill_id);

ALTER TABLE "public"."user_skills" ADD CONSTRAINT "user_skills_proficiency_level_check" CHECK (proficiency_level = ANY (ARRAY['Beginner'::text, 'Intermediate'::text, 'Advanced'::text, 'Expert'::text]));

ALTER TABLE "public"."user_subscriptions" ADD CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_key" UNIQUE (user_id);

ALTER TABLE "public"."ai_growth_plans" ADD CONSTRAINT "ai_growth_plans_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."connected_identity_accounts" ADD CONSTRAINT "connected_identity_accounts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."connection_requests" ADD CONSTRAINT "connection_requests_receiver_id_fkey" FOREIGN KEY (receiver_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."connection_requests" ADD CONSTRAINT "connection_requests_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."connections" ADD CONSTRAINT "connections_user_1_fkey" FOREIGN KEY (user_1) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."connections" ADD CONSTRAINT "connections_user_2_fkey" FOREIGN KEY (user_2) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."conversation_members" ADD CONSTRAINT "conversation_members_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

ALTER TABLE "public"."conversation_members" ADD CONSTRAINT "conversation_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

ALTER TABLE "public"."conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."evidence_ai_reviews" ADD CONSTRAINT "evidence_ai_reviews_evidence_id_fkey" FOREIGN KEY (evidence_id) REFERENCES trust_evidence(id) ON DELETE CASCADE;

ALTER TABLE "public"."evidence_grants" ADD CONSTRAINT "evidence_grants_evidence_id_fkey" FOREIGN KEY (evidence_id) REFERENCES trust_evidence(id) ON DELETE CASCADE;

ALTER TABLE "public"."evidence_grants" ADD CONSTRAINT "evidence_grants_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."evidence_reviews" ADD CONSTRAINT "evidence_reviews_evidence_id_fkey" FOREIGN KEY (evidence_id) REFERENCES trust_evidence(id) ON DELETE CASCADE;

ALTER TABLE "public"."evidence_reviews" ADD CONSTRAINT "evidence_reviews_reviewer_id_fkey" FOREIGN KEY (reviewer_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."founder_profiles" ADD CONSTRAINT "founder_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."interaction_history" ADD CONSTRAINT "interaction_history_target_user_id_fkey" FOREIGN KEY (target_user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."interaction_history" ADD CONSTRAINT "interaction_history_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."investor_profiles" ADD CONSTRAINT "investor_profiles_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."investor_profiles" ADD CONSTRAINT "investor_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."match_feedback" ADD CONSTRAINT "match_feedback_reviewer_id_fkey" FOREIGN KEY (reviewer_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."match_feedback" ADD CONSTRAINT "match_feedback_target_user_id_fkey" FOREIGN KEY (target_user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."match_outcomes" ADD CONSTRAINT "match_outcomes_reviewer_id_fkey" FOREIGN KEY (reviewer_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."match_outcomes" ADD CONSTRAINT "match_outcomes_target_user_id_fkey" FOREIGN KEY (target_user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."matching_events" ADD CONSTRAINT "matching_events_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."matching_events" ADD CONSTRAINT "matching_events_target_id_fkey" FOREIGN KEY (target_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."matching_preferences" ADD CONSTRAINT "matching_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."meeting_followups" ADD CONSTRAINT "meeting_followups_meeting_id_fkey" FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE;

ALTER TABLE "public"."meeting_followups" ADD CONSTRAINT "meeting_followups_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."meeting_participants" ADD CONSTRAINT "meeting_participants_meeting_id_fkey" FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE;

ALTER TABLE "public"."meeting_participants" ADD CONSTRAINT "meeting_participants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."meetings" ADD CONSTRAINT "meetings_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL;

ALTER TABLE "public"."meetings" ADD CONSTRAINT "meetings_host_id_fkey" FOREIGN KEY (host_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."mentor_profiles" ADD CONSTRAINT "mentor_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."mentorship_milestones" ADD CONSTRAINT "mentorship_milestones_mentee_id_fkey" FOREIGN KEY (mentee_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."mentorship_milestones" ADD CONSTRAINT "mentorship_milestones_mentor_id_fkey" FOREIGN KEY (mentor_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."opportunities" ADD CONSTRAINT "opportunities_posted_by_fkey" FOREIGN KEY (posted_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."profile_evidence_files" ADD CONSTRAINT "profile_evidence_files_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."profile_review_history" ADD CONSTRAINT "profile_review_history_reviewer_id_fkey" FOREIGN KEY (reviewer_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."profile_review_history" ADD CONSTRAINT "profile_review_history_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."profile_reviews" ADD CONSTRAINT "profile_reviews_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."profile_reviews" ADD CONSTRAINT "profile_reviews_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."profile_verification_checks" ADD CONSTRAINT "profile_verification_checks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."profile_verification_checks" ADD CONSTRAINT "profile_verification_checks_verification_id_fkey" FOREIGN KEY (verification_id) REFERENCES profile_verifications(id) ON DELETE CASCADE;

ALTER TABLE "public"."profile_verifications" ADD CONSTRAINT "profile_verifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."roadmap_tasks" ADD CONSTRAINT "roadmap_tasks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."skill_taxonomy" ADD CONSTRAINT "skill_taxonomy_parent_skill_id_fkey" FOREIGN KEY (parent_skill_id) REFERENCES skill_taxonomy(id);

ALTER TABLE "public"."startup_readiness_scores" ADD CONSTRAINT "startup_readiness_scores_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."student_activities" ADD CONSTRAINT "student_activities_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."student_profiles" ADD CONSTRAINT "student_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."trust_evidence" ADD CONSTRAINT "trust_evidence_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."trust_evidence" ADD CONSTRAINT "trust_evidence_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."trust_scores" ADD CONSTRAINT "trust_scores_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."usage_counters" ADD CONSTRAINT "usage_counters_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."user_auth_tracking" ADD CONSTRAINT "user_auth_tracking_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."user_skills" ADD CONSTRAINT "user_skills_skill_id_fkey" FOREIGN KEY (skill_id) REFERENCES skill_taxonomy(id);

ALTER TABLE "public"."user_skills" ADD CONSTRAINT "user_skills_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

CREATE INDEX ai_growth_plans_user_idx ON public.ai_growth_plans USING btree (user_id);

CREATE INDEX idx_audit_created ON public.audit_log USING btree (created_at DESC);

CREATE INDEX idx_audit_table ON public.audit_log USING btree (table_name);

CREATE INDEX idx_audit_user ON public.audit_log USING btree (user_id);

CREATE INDEX connected_identity_accounts_user_idx ON public.connected_identity_accounts USING btree (user_id, provider, verified_at DESC);

CREATE INDEX idx_conn_req_receiver ON public.connection_requests USING btree (receiver_id);

CREATE INDEX idx_conn_req_sender ON public.connection_requests USING btree (sender_id);

CREATE INDEX idx_conn_req_status ON public.connection_requests USING btree (status);

CREATE INDEX idx_conn_req_type ON public.connection_requests USING btree (type);

CREATE INDEX idx_connection_requests_bidirectional ON public.connection_requests USING btree (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), type, status);

CREATE INDEX idx_connection_requests_pending ON public.connection_requests USING btree (receiver_id, status, type) WHERE (status = 'pending'::text);

CREATE INDEX idx_connection_requests_pending_incoming ON public.connection_requests USING btree (receiver_id, status, type) WHERE (status = 'pending'::text);

CREATE INDEX idx_connection_requests_pending_summary ON public.connection_requests USING btree (receiver_id, type, created_at DESC) INCLUDE (sender_id, status, message) WHERE (status = 'pending'::text);

CREATE INDEX idx_connection_requests_receiver ON public.connection_requests USING btree (receiver_id);

CREATE INDEX idx_connection_requests_receiver_pending ON public.connection_requests USING btree (receiver_id, status, created_at DESC) WHERE (status = 'pending'::text);

CREATE INDEX idx_connection_requests_sender ON public.connection_requests USING btree (sender_id, created_at DESC);

CREATE INDEX idx_connection_requests_sent ON public.connection_requests USING btree (sender_id, status, type);

CREATE INDEX idx_connection_requests_status ON public.connection_requests USING btree (status);

CREATE INDEX idx_connection_requests_type ON public.connection_requests USING btree (type, status);

CREATE UNIQUE INDEX connection_requests_one_pending_pair_type_idx ON public.connection_requests USING btree (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), type) WHERE (status = 'pending'::text);

CREATE UNIQUE INDEX idx_connection_requests_pending_unique ON public.connection_requests USING btree (sender_id, receiver_id, type) WHERE (status = 'pending'::text);

CREATE UNIQUE INDEX unique_pending_connection_request ON public.connection_requests USING btree (sender_id, receiver_id, type) WHERE (status = 'pending'::text);

CREATE INDEX idx_connections_user1 ON public.connections USING btree (user_1);

CREATE INDEX idx_connections_user2 ON public.connections USING btree (user_2);

CREATE UNIQUE INDEX connections_unique_pair_idx ON public.connections USING btree (LEAST(user_1, user_2), GREATEST(user_1, user_2));

CREATE INDEX idx_conversation_members_user ON public.conversation_members USING btree (user_id);

CREATE INDEX idx_conv_part_conv ON public.conversation_participants USING btree (conversation_id);

CREATE INDEX idx_conv_part_user ON public.conversation_participants USING btree (user_id);

CREATE INDEX idx_cp_conversation_id ON public.conversation_participants USING btree (conversation_id);

CREATE INDEX idx_cp_user_id ON public.conversation_participants USING btree (user_id);

CREATE INDEX evidence_ai_reviews_queue_idx ON public.evidence_ai_reviews USING btree (ai_status, available_at);

CREATE INDEX evidence_grants_recipient_idx ON public.evidence_grants USING btree (recipient_id, expires_at);

CREATE INDEX founder_intent_v2_idx ON public.founder_profiles USING btree (((metadata ->> 'founder_intent'::text)));

CREATE INDEX founder_profiles_founder_skills_idx ON public.founder_profiles USING gin (founder_skills);

CREATE INDEX founder_profiles_funding_stage_idx ON public.founder_profiles USING btree (funding_stage);

CREATE INDEX founder_profiles_help_needed_idx ON public.founder_profiles USING gin (help_needed);

CREATE INDEX founder_profiles_hiring_roles_idx ON public.founder_profiles USING gin (hiring_roles);

CREATE INDEX founder_profiles_industry_idx ON public.founder_profiles USING btree (industry);

CREATE INDEX founder_profiles_key_risks_idx ON public.founder_profiles USING gin (key_risks);

CREATE INDEX founder_profiles_looking_for_idx ON public.founder_profiles USING gin (looking_for);

CREATE INDEX founder_profiles_skills_needed_idx ON public.founder_profiles USING gin (skills_needed);

CREATE INDEX founder_profiles_tech_stack_idx ON public.founder_profiles USING gin (tech_stack);

CREATE INDEX founder_profiles_user_id_idx ON public.founder_profiles USING btree (user_id);

CREATE INDEX founder_profiles_verified_visibility_idx ON public.founder_profiles USING btree (user_id, is_public, is_active) WHERE ((is_public = true) AND (is_active = true));

CREATE INDEX idx_interaction_history_ml ON public.interaction_history USING btree (user_id, interaction_type, created_at DESC) WHERE (outcome IS NOT NULL);

CREATE INDEX idx_interaction_target ON public.interaction_history USING btree (target_user_id);

CREATE INDEX idx_interaction_type ON public.interaction_history USING btree (interaction_type);

CREATE INDEX idx_interaction_user ON public.interaction_history USING btree (user_id);

CREATE INDEX idx_investor_profiles_preferred_business_models ON public.investor_profiles USING gin (preferred_business_models);

CREATE INDEX investor_profiles_verified_visibility_idx ON public.investor_profiles USING btree (user_id, is_public, is_active) WHERE ((is_public = true) AND (is_active = true));

CREATE INDEX match_feedback_reviewer_idx ON public.match_feedback USING btree (reviewer_id);

CREATE INDEX match_feedback_target_idx ON public.match_feedback USING btree (target_user_id);

CREATE INDEX match_outcomes_context_idx ON public.match_outcomes USING btree (context);

CREATE INDEX match_outcomes_reviewer_idx ON public.match_outcomes USING btree (reviewer_id);

CREATE INDEX match_outcomes_target_idx ON public.match_outcomes USING btree (target_user_id);

CREATE INDEX matching_events_actor_created ON public.matching_events USING btree (actor_id, created_at DESC);

CREATE INDEX matching_events_target ON public.matching_events USING btree (target_id);

CREATE INDEX idx_matching_preferences_user_id ON public.matching_preferences USING btree (user_id);

CREATE INDEX meeting_followups_due_idx ON public.meeting_followups USING btree (user_id, due_at) WHERE (completed = false);

CREATE INDEX meeting_participants_meeting_id_idx ON public.meeting_participants USING btree (meeting_id);

CREATE INDEX meeting_participants_user_id_idx ON public.meeting_participants USING btree (user_id);

CREATE INDEX meetings_conversation_id_idx ON public.meetings USING btree (conversation_id);

CREATE INDEX meetings_host_id_idx ON public.meetings USING btree (host_id);

CREATE INDEX idx_mentor_profiles_industries_supported ON public.mentor_profiles USING gin (industries_supported);

CREATE INDEX mentor_profiles_verified_visibility_idx ON public.mentor_profiles USING btree (user_id, is_public, is_active) WHERE ((is_public = true) AND (is_active = true));

CREATE INDEX mentorship_milestones_pair_idx ON public.mentorship_milestones USING btree (mentor_id, mentee_id);

CREATE INDEX mentorship_milestones_status_idx ON public.mentorship_milestones USING btree (status);

CREATE INDEX idx_messages_conversation ON public.messages USING btree (conversation_id);

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC);

CREATE INDEX idx_messages_sender ON public.messages USING btree (sender_id);

CREATE INDEX idx_opp_deadline ON public.opportunities USING btree (deadline);

CREATE INDEX idx_opp_is_active ON public.opportunities USING btree (is_active);

CREATE INDEX idx_opp_is_featured ON public.opportunities USING btree (is_featured);

CREATE INDEX idx_opp_type ON public.opportunities USING btree (type);

CREATE INDEX idx_opportunities_active ON public.opportunities USING btree (is_active, deadline) WHERE (is_active = true);

CREATE INDEX idx_opps_active_deadline ON public.opportunities USING btree (is_active, deadline);

CREATE INDEX idx_opps_type ON public.opportunities USING btree (type) WHERE (is_active = true);

CREATE INDEX profile_evidence_files_status_idx ON public.profile_evidence_files USING btree (user_id, role, verification_status, updated_at DESC);

CREATE INDEX profile_evidence_files_user_idx ON public.profile_evidence_files USING btree (user_id, role, created_at DESC);

CREATE INDEX profile_reviews_queue_idx ON public.profile_reviews USING btree (ai_status, available_at);

CREATE INDEX profile_verification_checks_user_idx ON public.profile_verification_checks USING btree (user_id, checked_at DESC);

CREATE INDEX profile_verifications_trust_idx ON public.profile_verifications USING btree (user_id, status, trust_score, failed_links);

CREATE INDEX idx_profiles_active ON public.profiles USING btree (id) WHERE (deleted_at IS NULL);

CREATE INDEX idx_profiles_created_at ON public.profiles USING btree (created_at);

CREATE INDEX idx_profiles_email ON public.profiles USING btree (email);

CREATE INDEX idx_profiles_last_active ON public.profiles USING btree (last_active);

CREATE INDEX idx_profiles_location ON public.profiles USING btree (location);

CREATE INDEX idx_profiles_user_type ON public.profiles USING btree (user_type);

CREATE INDEX roadmap_tasks_user_status_idx ON public.roadmap_tasks USING btree (user_id, status);

CREATE INDEX startup_readiness_score_idx ON public.startup_readiness_scores USING btree (score DESC);

CREATE INDEX startup_readiness_user_idx ON public.startup_readiness_scores USING btree (user_id);

CREATE INDEX idx_student_activities_user ON public.student_activities USING btree (user_id, created_at DESC);

CREATE INDEX idx_student_activities_user_recent ON public.student_activities USING btree (user_id, created_at DESC);

CREATE INDEX idx_sp_has_cofounder ON public.student_profiles USING btree (has_cofounder);

CREATE INDEX idx_sp_has_startup_idea ON public.student_profiles USING btree (has_startup_idea);

CREATE INDEX idx_student_commitment ON public.student_profiles USING btree (commitment_level);

CREATE INDEX idx_student_has_cofounder ON public.student_profiles USING btree (has_cofounder);

CREATE INDEX idx_student_has_idea ON public.student_profiles USING btree (has_startup_idea);

CREATE INDEX idx_student_profiles_commitment ON public.student_profiles USING btree (commitment_level);

CREATE INDEX idx_student_profiles_has_idea ON public.student_profiles USING btree (has_startup_idea) WHERE (has_startup_idea = true);

CREATE INDEX idx_student_profiles_help_needed ON public.student_profiles USING gin (help_needed);

CREATE INDEX idx_student_profiles_idea_domain ON public.student_profiles USING btree (idea_domain) WHERE (idea_domain IS NOT NULL);

CREATE INDEX idx_student_profiles_looking_for ON public.student_profiles USING gin (looking_for);

CREATE INDEX idx_student_profiles_matching_core ON public.student_profiles USING btree (has_startup_idea, commitment_level, user_id) WHERE (has_startup_idea = true);

CREATE INDEX idx_student_profiles_preferred_industries ON public.student_profiles USING gin (preferred_industries);

CREATE INDEX idx_student_profiles_skills_gin ON public.student_profiles USING gin (skills_with_levels jsonb_path_ops);

CREATE INDEX idx_student_profiles_skills_levels ON public.student_profiles USING gin (skills_with_levels);

CREATE INDEX idx_student_profiles_university ON public.student_profiles USING btree (university);

CREATE INDEX idx_student_profiles_user_id ON public.student_profiles USING btree (user_id);

CREATE INDEX student_profiles_verified_visibility_idx ON public.student_profiles USING btree (user_id, is_public, is_active) WHERE ((is_public = true) AND (is_active = true));

CREATE INDEX trust_evidence_owner_idx ON public.trust_evidence USING btree (owner_id, created_at DESC);

CREATE INDEX trust_scores_user_idx ON public.trust_scores USING btree (user_id);

CREATE INDEX idx_usage_counters_user_feature_period ON public.usage_counters USING btree (user_id, feature_key, period_key);

CREATE INDEX idx_user_auth_tracking_user_id ON public.user_auth_tracking USING btree (user_id);

CREATE INDEX idx_user_skills_by_skill ON public.user_skills USING btree (skill_id);

CREATE INDEX idx_user_skills_lookup ON public.user_skills USING btree (user_id, proficiency_level DESC);

CREATE INDEX idx_user_skills_matching ON public.user_skills USING btree (skill_id, proficiency_level DESC, verified DESC);

CREATE INDEX idx_user_skills_skill ON public.user_skills USING btree (skill_id);

CREATE INDEX idx_user_skills_user ON public.user_skills USING btree (user_id);

CREATE INDEX idx_user_skills_verified ON public.user_skills USING btree (user_id, verified) WHERE (verified = true);

CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions USING btree (user_id);

REVOKE ALL PRIVILEGES ON TABLE "public"."evidence_reviews" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."evidence_reviews" TO "service_role";

GRANT SELECT ON TABLE "public"."evidence_reviews" TO "service_role";

GRANT UPDATE ON TABLE "public"."evidence_reviews" TO "service_role";

GRANT DELETE ON TABLE "public"."evidence_reviews" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."evidence_reviews" TO "service_role";

GRANT REFERENCES ON TABLE "public"."evidence_reviews" TO "service_role";

GRANT TRIGGER ON TABLE "public"."evidence_reviews" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."evidence_reviews" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."meeting_followups" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."meeting_followups" TO "service_role";

GRANT SELECT ON TABLE "public"."meeting_followups" TO "service_role";

GRANT UPDATE ON TABLE "public"."meeting_followups" TO "service_role";

GRANT DELETE ON TABLE "public"."meeting_followups" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."meeting_followups" TO "service_role";

GRANT REFERENCES ON TABLE "public"."meeting_followups" TO "service_role";

GRANT TRIGGER ON TABLE "public"."meeting_followups" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."meeting_followups" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."profile_reviews" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."profile_reviews" TO "service_role";

GRANT SELECT ON TABLE "public"."profile_reviews" TO "service_role";

GRANT UPDATE ON TABLE "public"."profile_reviews" TO "service_role";

GRANT DELETE ON TABLE "public"."profile_reviews" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."profile_reviews" TO "service_role";

GRANT REFERENCES ON TABLE "public"."profile_reviews" TO "service_role";

GRANT TRIGGER ON TABLE "public"."profile_reviews" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."profile_reviews" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."profile_review_history" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."profile_review_history" TO "service_role";

GRANT SELECT ON TABLE "public"."profile_review_history" TO "service_role";

GRANT UPDATE ON TABLE "public"."profile_review_history" TO "service_role";

GRANT DELETE ON TABLE "public"."profile_review_history" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."profile_review_history" TO "service_role";

GRANT REFERENCES ON TABLE "public"."profile_review_history" TO "service_role";

GRANT TRIGGER ON TABLE "public"."profile_review_history" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."profile_review_history" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."evidence_ai_reviews" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."evidence_ai_reviews" TO "service_role";

GRANT SELECT ON TABLE "public"."evidence_ai_reviews" TO "service_role";

GRANT UPDATE ON TABLE "public"."evidence_ai_reviews" TO "service_role";

GRANT DELETE ON TABLE "public"."evidence_ai_reviews" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."evidence_ai_reviews" TO "service_role";

GRANT REFERENCES ON TABLE "public"."evidence_ai_reviews" TO "service_role";

GRANT TRIGGER ON TABLE "public"."evidence_ai_reviews" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."evidence_ai_reviews" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."subscription_plans" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."subscription_plans" TO "anon";

GRANT SELECT ON TABLE "public"."subscription_plans" TO "anon";

GRANT UPDATE ON TABLE "public"."subscription_plans" TO "anon";

GRANT DELETE ON TABLE "public"."subscription_plans" TO "anon";

GRANT TRUNCATE ON TABLE "public"."subscription_plans" TO "anon";

GRANT REFERENCES ON TABLE "public"."subscription_plans" TO "anon";

GRANT TRIGGER ON TABLE "public"."subscription_plans" TO "anon";

GRANT MAINTAIN ON TABLE "public"."subscription_plans" TO "anon";

GRANT INSERT ON TABLE "public"."subscription_plans" TO "authenticated";

GRANT SELECT ON TABLE "public"."subscription_plans" TO "authenticated";

GRANT UPDATE ON TABLE "public"."subscription_plans" TO "authenticated";

GRANT DELETE ON TABLE "public"."subscription_plans" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."subscription_plans" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."subscription_plans" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."subscription_plans" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."subscription_plans" TO "authenticated";

GRANT INSERT ON TABLE "public"."subscription_plans" TO "service_role";

GRANT SELECT ON TABLE "public"."subscription_plans" TO "service_role";

GRANT UPDATE ON TABLE "public"."subscription_plans" TO "service_role";

GRANT DELETE ON TABLE "public"."subscription_plans" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."subscription_plans" TO "service_role";

GRANT REFERENCES ON TABLE "public"."subscription_plans" TO "service_role";

GRANT TRIGGER ON TABLE "public"."subscription_plans" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."subscription_plans" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."startup_readiness_scores" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."startup_readiness_scores" TO "anon";

GRANT SELECT ON TABLE "public"."startup_readiness_scores" TO "anon";

GRANT UPDATE ON TABLE "public"."startup_readiness_scores" TO "anon";

GRANT DELETE ON TABLE "public"."startup_readiness_scores" TO "anon";

GRANT TRUNCATE ON TABLE "public"."startup_readiness_scores" TO "anon";

GRANT REFERENCES ON TABLE "public"."startup_readiness_scores" TO "anon";

GRANT TRIGGER ON TABLE "public"."startup_readiness_scores" TO "anon";

GRANT MAINTAIN ON TABLE "public"."startup_readiness_scores" TO "anon";

GRANT INSERT ON TABLE "public"."startup_readiness_scores" TO "authenticated";

GRANT SELECT ON TABLE "public"."startup_readiness_scores" TO "authenticated";

GRANT UPDATE ON TABLE "public"."startup_readiness_scores" TO "authenticated";

GRANT DELETE ON TABLE "public"."startup_readiness_scores" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."startup_readiness_scores" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."startup_readiness_scores" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."startup_readiness_scores" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."startup_readiness_scores" TO "authenticated";

GRANT INSERT ON TABLE "public"."startup_readiness_scores" TO "service_role";

GRANT SELECT ON TABLE "public"."startup_readiness_scores" TO "service_role";

GRANT UPDATE ON TABLE "public"."startup_readiness_scores" TO "service_role";

GRANT DELETE ON TABLE "public"."startup_readiness_scores" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."startup_readiness_scores" TO "service_role";

GRANT REFERENCES ON TABLE "public"."startup_readiness_scores" TO "service_role";

GRANT TRIGGER ON TABLE "public"."startup_readiness_scores" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."startup_readiness_scores" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."roadmap_tasks" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."roadmap_tasks" TO "anon";

GRANT SELECT ON TABLE "public"."roadmap_tasks" TO "anon";

GRANT UPDATE ON TABLE "public"."roadmap_tasks" TO "anon";

GRANT DELETE ON TABLE "public"."roadmap_tasks" TO "anon";

GRANT TRUNCATE ON TABLE "public"."roadmap_tasks" TO "anon";

GRANT REFERENCES ON TABLE "public"."roadmap_tasks" TO "anon";

GRANT TRIGGER ON TABLE "public"."roadmap_tasks" TO "anon";

GRANT MAINTAIN ON TABLE "public"."roadmap_tasks" TO "anon";

GRANT INSERT ON TABLE "public"."roadmap_tasks" TO "authenticated";

GRANT SELECT ON TABLE "public"."roadmap_tasks" TO "authenticated";

GRANT UPDATE ON TABLE "public"."roadmap_tasks" TO "authenticated";

GRANT DELETE ON TABLE "public"."roadmap_tasks" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."roadmap_tasks" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."roadmap_tasks" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."roadmap_tasks" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."roadmap_tasks" TO "authenticated";

GRANT INSERT ON TABLE "public"."roadmap_tasks" TO "service_role";

GRANT SELECT ON TABLE "public"."roadmap_tasks" TO "service_role";

GRANT UPDATE ON TABLE "public"."roadmap_tasks" TO "service_role";

GRANT DELETE ON TABLE "public"."roadmap_tasks" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."roadmap_tasks" TO "service_role";

GRANT REFERENCES ON TABLE "public"."roadmap_tasks" TO "service_role";

GRANT TRIGGER ON TABLE "public"."roadmap_tasks" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."roadmap_tasks" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."match_feedback" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."match_feedback" TO "anon";

GRANT SELECT ON TABLE "public"."match_feedback" TO "anon";

GRANT UPDATE ON TABLE "public"."match_feedback" TO "anon";

GRANT DELETE ON TABLE "public"."match_feedback" TO "anon";

GRANT TRUNCATE ON TABLE "public"."match_feedback" TO "anon";

GRANT REFERENCES ON TABLE "public"."match_feedback" TO "anon";

GRANT TRIGGER ON TABLE "public"."match_feedback" TO "anon";

GRANT MAINTAIN ON TABLE "public"."match_feedback" TO "anon";

GRANT INSERT ON TABLE "public"."match_feedback" TO "authenticated";

GRANT SELECT ON TABLE "public"."match_feedback" TO "authenticated";

GRANT UPDATE ON TABLE "public"."match_feedback" TO "authenticated";

GRANT DELETE ON TABLE "public"."match_feedback" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."match_feedback" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."match_feedback" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."match_feedback" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."match_feedback" TO "authenticated";

GRANT INSERT ON TABLE "public"."match_feedback" TO "service_role";

GRANT SELECT ON TABLE "public"."match_feedback" TO "service_role";

GRANT UPDATE ON TABLE "public"."match_feedback" TO "service_role";

GRANT DELETE ON TABLE "public"."match_feedback" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."match_feedback" TO "service_role";

GRANT REFERENCES ON TABLE "public"."match_feedback" TO "service_role";

GRANT TRIGGER ON TABLE "public"."match_feedback" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."match_feedback" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."audit_log" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."audit_log" TO "service_role";

GRANT SELECT ON TABLE "public"."audit_log" TO "service_role";

GRANT UPDATE ON TABLE "public"."audit_log" TO "service_role";

GRANT DELETE ON TABLE "public"."audit_log" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."audit_log" TO "service_role";

GRANT REFERENCES ON TABLE "public"."audit_log" TO "service_role";

GRANT TRIGGER ON TABLE "public"."audit_log" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."audit_log" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."conversations" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."conversations" TO "anon";

GRANT SELECT ON TABLE "public"."conversations" TO "anon";

GRANT UPDATE ON TABLE "public"."conversations" TO "anon";

GRANT DELETE ON TABLE "public"."conversations" TO "anon";

GRANT TRUNCATE ON TABLE "public"."conversations" TO "anon";

GRANT REFERENCES ON TABLE "public"."conversations" TO "anon";

GRANT TRIGGER ON TABLE "public"."conversations" TO "anon";

GRANT MAINTAIN ON TABLE "public"."conversations" TO "anon";

GRANT INSERT ON TABLE "public"."conversations" TO "authenticated";

GRANT SELECT ON TABLE "public"."conversations" TO "authenticated";

GRANT UPDATE ON TABLE "public"."conversations" TO "authenticated";

GRANT DELETE ON TABLE "public"."conversations" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."conversations" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."conversations" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."conversations" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."conversations" TO "authenticated";

GRANT INSERT ON TABLE "public"."conversations" TO "service_role";

GRANT SELECT ON TABLE "public"."conversations" TO "service_role";

GRANT UPDATE ON TABLE "public"."conversations" TO "service_role";

GRANT DELETE ON TABLE "public"."conversations" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."conversations" TO "service_role";

GRANT REFERENCES ON TABLE "public"."conversations" TO "service_role";

GRANT TRIGGER ON TABLE "public"."conversations" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."conversations" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."connection_requests" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."connection_requests" TO "anon";

GRANT SELECT ON TABLE "public"."connection_requests" TO "anon";

GRANT UPDATE ON TABLE "public"."connection_requests" TO "anon";

GRANT DELETE ON TABLE "public"."connection_requests" TO "anon";

GRANT TRUNCATE ON TABLE "public"."connection_requests" TO "anon";

GRANT REFERENCES ON TABLE "public"."connection_requests" TO "anon";

GRANT TRIGGER ON TABLE "public"."connection_requests" TO "anon";

GRANT MAINTAIN ON TABLE "public"."connection_requests" TO "anon";

GRANT INSERT ON TABLE "public"."connection_requests" TO "authenticated";

GRANT SELECT ON TABLE "public"."connection_requests" TO "authenticated";

GRANT UPDATE ON TABLE "public"."connection_requests" TO "authenticated";

GRANT DELETE ON TABLE "public"."connection_requests" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."connection_requests" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."connection_requests" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."connection_requests" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."connection_requests" TO "authenticated";

GRANT INSERT ON TABLE "public"."connection_requests" TO "service_role";

GRANT SELECT ON TABLE "public"."connection_requests" TO "service_role";

GRANT UPDATE ON TABLE "public"."connection_requests" TO "service_role";

GRANT DELETE ON TABLE "public"."connection_requests" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."connection_requests" TO "service_role";

GRANT REFERENCES ON TABLE "public"."connection_requests" TO "service_role";

GRANT TRIGGER ON TABLE "public"."connection_requests" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."connection_requests" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."connections" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."connections" TO "anon";

GRANT SELECT ON TABLE "public"."connections" TO "anon";

GRANT UPDATE ON TABLE "public"."connections" TO "anon";

GRANT DELETE ON TABLE "public"."connections" TO "anon";

GRANT TRUNCATE ON TABLE "public"."connections" TO "anon";

GRANT REFERENCES ON TABLE "public"."connections" TO "anon";

GRANT TRIGGER ON TABLE "public"."connections" TO "anon";

GRANT MAINTAIN ON TABLE "public"."connections" TO "anon";

GRANT INSERT ON TABLE "public"."connections" TO "authenticated";

GRANT SELECT ON TABLE "public"."connections" TO "authenticated";

GRANT UPDATE ON TABLE "public"."connections" TO "authenticated";

GRANT DELETE ON TABLE "public"."connections" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."connections" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."connections" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."connections" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."connections" TO "authenticated";

GRANT INSERT ON TABLE "public"."connections" TO "service_role";

GRANT SELECT ON TABLE "public"."connections" TO "service_role";

GRANT UPDATE ON TABLE "public"."connections" TO "service_role";

GRANT DELETE ON TABLE "public"."connections" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."connections" TO "service_role";

GRANT REFERENCES ON TABLE "public"."connections" TO "service_role";

GRANT TRIGGER ON TABLE "public"."connections" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."connections" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."conversation_members" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."conversation_members" TO "anon";

GRANT SELECT ON TABLE "public"."conversation_members" TO "anon";

GRANT UPDATE ON TABLE "public"."conversation_members" TO "anon";

GRANT DELETE ON TABLE "public"."conversation_members" TO "anon";

GRANT TRUNCATE ON TABLE "public"."conversation_members" TO "anon";

GRANT REFERENCES ON TABLE "public"."conversation_members" TO "anon";

GRANT TRIGGER ON TABLE "public"."conversation_members" TO "anon";

GRANT MAINTAIN ON TABLE "public"."conversation_members" TO "anon";

GRANT INSERT ON TABLE "public"."conversation_members" TO "authenticated";

GRANT SELECT ON TABLE "public"."conversation_members" TO "authenticated";

GRANT UPDATE ON TABLE "public"."conversation_members" TO "authenticated";

GRANT DELETE ON TABLE "public"."conversation_members" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."conversation_members" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."conversation_members" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."conversation_members" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."conversation_members" TO "authenticated";

GRANT INSERT ON TABLE "public"."conversation_members" TO "service_role";

GRANT SELECT ON TABLE "public"."conversation_members" TO "service_role";

GRANT UPDATE ON TABLE "public"."conversation_members" TO "service_role";

GRANT DELETE ON TABLE "public"."conversation_members" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."conversation_members" TO "service_role";

GRANT REFERENCES ON TABLE "public"."conversation_members" TO "service_role";

GRANT TRIGGER ON TABLE "public"."conversation_members" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."conversation_members" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."opportunities" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."opportunities" TO "anon";

GRANT SELECT ON TABLE "public"."opportunities" TO "anon";

GRANT UPDATE ON TABLE "public"."opportunities" TO "anon";

GRANT DELETE ON TABLE "public"."opportunities" TO "anon";

GRANT TRUNCATE ON TABLE "public"."opportunities" TO "anon";

GRANT REFERENCES ON TABLE "public"."opportunities" TO "anon";

GRANT TRIGGER ON TABLE "public"."opportunities" TO "anon";

GRANT MAINTAIN ON TABLE "public"."opportunities" TO "anon";

GRANT INSERT ON TABLE "public"."opportunities" TO "authenticated";

GRANT SELECT ON TABLE "public"."opportunities" TO "authenticated";

GRANT UPDATE ON TABLE "public"."opportunities" TO "authenticated";

GRANT DELETE ON TABLE "public"."opportunities" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."opportunities" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."opportunities" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."opportunities" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."opportunities" TO "authenticated";

GRANT INSERT ON TABLE "public"."opportunities" TO "service_role";

GRANT SELECT ON TABLE "public"."opportunities" TO "service_role";

GRANT UPDATE ON TABLE "public"."opportunities" TO "service_role";

GRANT DELETE ON TABLE "public"."opportunities" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."opportunities" TO "service_role";

GRANT REFERENCES ON TABLE "public"."opportunities" TO "service_role";

GRANT TRIGGER ON TABLE "public"."opportunities" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."opportunities" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."student_activities" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."student_activities" TO "anon";

GRANT SELECT ON TABLE "public"."student_activities" TO "anon";

GRANT UPDATE ON TABLE "public"."student_activities" TO "anon";

GRANT DELETE ON TABLE "public"."student_activities" TO "anon";

GRANT TRUNCATE ON TABLE "public"."student_activities" TO "anon";

GRANT REFERENCES ON TABLE "public"."student_activities" TO "anon";

GRANT TRIGGER ON TABLE "public"."student_activities" TO "anon";

GRANT MAINTAIN ON TABLE "public"."student_activities" TO "anon";

GRANT INSERT ON TABLE "public"."student_activities" TO "authenticated";

GRANT SELECT ON TABLE "public"."student_activities" TO "authenticated";

GRANT UPDATE ON TABLE "public"."student_activities" TO "authenticated";

GRANT DELETE ON TABLE "public"."student_activities" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."student_activities" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."student_activities" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."student_activities" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."student_activities" TO "authenticated";

GRANT INSERT ON TABLE "public"."student_activities" TO "service_role";

GRANT SELECT ON TABLE "public"."student_activities" TO "service_role";

GRANT UPDATE ON TABLE "public"."student_activities" TO "service_role";

GRANT DELETE ON TABLE "public"."student_activities" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."student_activities" TO "service_role";

GRANT REFERENCES ON TABLE "public"."student_activities" TO "service_role";

GRANT TRIGGER ON TABLE "public"."student_activities" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."student_activities" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."messages" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."messages" TO "anon";

GRANT SELECT ON TABLE "public"."messages" TO "anon";

GRANT UPDATE ON TABLE "public"."messages" TO "anon";

GRANT DELETE ON TABLE "public"."messages" TO "anon";

GRANT TRUNCATE ON TABLE "public"."messages" TO "anon";

GRANT REFERENCES ON TABLE "public"."messages" TO "anon";

GRANT TRIGGER ON TABLE "public"."messages" TO "anon";

GRANT MAINTAIN ON TABLE "public"."messages" TO "anon";

GRANT INSERT ON TABLE "public"."messages" TO "authenticated";

GRANT SELECT ON TABLE "public"."messages" TO "authenticated";

GRANT UPDATE ON TABLE "public"."messages" TO "authenticated";

GRANT DELETE ON TABLE "public"."messages" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."messages" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."messages" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."messages" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."messages" TO "authenticated";

GRANT INSERT ON TABLE "public"."messages" TO "service_role";

GRANT SELECT ON TABLE "public"."messages" TO "service_role";

GRANT UPDATE ON TABLE "public"."messages" TO "service_role";

GRANT DELETE ON TABLE "public"."messages" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."messages" TO "service_role";

GRANT REFERENCES ON TABLE "public"."messages" TO "service_role";

GRANT TRIGGER ON TABLE "public"."messages" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."messages" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."meetings" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."meetings" TO "anon";

GRANT SELECT ON TABLE "public"."meetings" TO "anon";

GRANT UPDATE ON TABLE "public"."meetings" TO "anon";

GRANT DELETE ON TABLE "public"."meetings" TO "anon";

GRANT TRUNCATE ON TABLE "public"."meetings" TO "anon";

GRANT REFERENCES ON TABLE "public"."meetings" TO "anon";

GRANT TRIGGER ON TABLE "public"."meetings" TO "anon";

GRANT MAINTAIN ON TABLE "public"."meetings" TO "anon";

GRANT INSERT ON TABLE "public"."meetings" TO "authenticated";

GRANT SELECT ON TABLE "public"."meetings" TO "authenticated";

GRANT UPDATE ON TABLE "public"."meetings" TO "authenticated";

GRANT DELETE ON TABLE "public"."meetings" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."meetings" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."meetings" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."meetings" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."meetings" TO "authenticated";

GRANT INSERT ON TABLE "public"."meetings" TO "service_role";

GRANT SELECT ON TABLE "public"."meetings" TO "service_role";

GRANT UPDATE ON TABLE "public"."meetings" TO "service_role";

GRANT DELETE ON TABLE "public"."meetings" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."meetings" TO "service_role";

GRANT REFERENCES ON TABLE "public"."meetings" TO "service_role";

GRANT TRIGGER ON TABLE "public"."meetings" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."meetings" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."meeting_participants" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."meeting_participants" TO "anon";

GRANT SELECT ON TABLE "public"."meeting_participants" TO "anon";

GRANT UPDATE ON TABLE "public"."meeting_participants" TO "anon";

GRANT DELETE ON TABLE "public"."meeting_participants" TO "anon";

GRANT TRUNCATE ON TABLE "public"."meeting_participants" TO "anon";

GRANT REFERENCES ON TABLE "public"."meeting_participants" TO "anon";

GRANT TRIGGER ON TABLE "public"."meeting_participants" TO "anon";

GRANT MAINTAIN ON TABLE "public"."meeting_participants" TO "anon";

GRANT INSERT ON TABLE "public"."meeting_participants" TO "authenticated";

GRANT SELECT ON TABLE "public"."meeting_participants" TO "authenticated";

GRANT UPDATE ON TABLE "public"."meeting_participants" TO "authenticated";

GRANT DELETE ON TABLE "public"."meeting_participants" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."meeting_participants" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."meeting_participants" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."meeting_participants" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."meeting_participants" TO "authenticated";

GRANT INSERT ON TABLE "public"."meeting_participants" TO "service_role";

GRANT SELECT ON TABLE "public"."meeting_participants" TO "service_role";

GRANT UPDATE ON TABLE "public"."meeting_participants" TO "service_role";

GRANT DELETE ON TABLE "public"."meeting_participants" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."meeting_participants" TO "service_role";

GRANT REFERENCES ON TABLE "public"."meeting_participants" TO "service_role";

GRANT TRIGGER ON TABLE "public"."meeting_participants" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."meeting_participants" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."user_auth_tracking" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."user_auth_tracking" TO "anon";

GRANT SELECT ON TABLE "public"."user_auth_tracking" TO "anon";

GRANT UPDATE ON TABLE "public"."user_auth_tracking" TO "anon";

GRANT DELETE ON TABLE "public"."user_auth_tracking" TO "anon";

GRANT TRUNCATE ON TABLE "public"."user_auth_tracking" TO "anon";

GRANT REFERENCES ON TABLE "public"."user_auth_tracking" TO "anon";

GRANT TRIGGER ON TABLE "public"."user_auth_tracking" TO "anon";

GRANT MAINTAIN ON TABLE "public"."user_auth_tracking" TO "anon";

GRANT INSERT ON TABLE "public"."user_auth_tracking" TO "authenticated";

GRANT SELECT ON TABLE "public"."user_auth_tracking" TO "authenticated";

GRANT UPDATE ON TABLE "public"."user_auth_tracking" TO "authenticated";

GRANT DELETE ON TABLE "public"."user_auth_tracking" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."user_auth_tracking" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."user_auth_tracking" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."user_auth_tracking" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."user_auth_tracking" TO "authenticated";

GRANT INSERT ON TABLE "public"."user_auth_tracking" TO "service_role";

GRANT SELECT ON TABLE "public"."user_auth_tracking" TO "service_role";

GRANT UPDATE ON TABLE "public"."user_auth_tracking" TO "service_role";

GRANT DELETE ON TABLE "public"."user_auth_tracking" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."user_auth_tracking" TO "service_role";

GRANT REFERENCES ON TABLE "public"."user_auth_tracking" TO "service_role";

GRANT TRIGGER ON TABLE "public"."user_auth_tracking" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."user_auth_tracking" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."ai_growth_plans" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."ai_growth_plans" TO "anon";

GRANT SELECT ON TABLE "public"."ai_growth_plans" TO "anon";

GRANT UPDATE ON TABLE "public"."ai_growth_plans" TO "anon";

GRANT DELETE ON TABLE "public"."ai_growth_plans" TO "anon";

GRANT TRUNCATE ON TABLE "public"."ai_growth_plans" TO "anon";

GRANT REFERENCES ON TABLE "public"."ai_growth_plans" TO "anon";

GRANT TRIGGER ON TABLE "public"."ai_growth_plans" TO "anon";

GRANT MAINTAIN ON TABLE "public"."ai_growth_plans" TO "anon";

GRANT INSERT ON TABLE "public"."ai_growth_plans" TO "authenticated";

GRANT SELECT ON TABLE "public"."ai_growth_plans" TO "authenticated";

GRANT UPDATE ON TABLE "public"."ai_growth_plans" TO "authenticated";

GRANT DELETE ON TABLE "public"."ai_growth_plans" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."ai_growth_plans" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."ai_growth_plans" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."ai_growth_plans" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."ai_growth_plans" TO "authenticated";

GRANT INSERT ON TABLE "public"."ai_growth_plans" TO "service_role";

GRANT SELECT ON TABLE "public"."ai_growth_plans" TO "service_role";

GRANT UPDATE ON TABLE "public"."ai_growth_plans" TO "service_role";

GRANT DELETE ON TABLE "public"."ai_growth_plans" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."ai_growth_plans" TO "service_role";

GRANT REFERENCES ON TABLE "public"."ai_growth_plans" TO "service_role";

GRANT TRIGGER ON TABLE "public"."ai_growth_plans" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."ai_growth_plans" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."mentorship_milestones" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."mentorship_milestones" TO "anon";

GRANT SELECT ON TABLE "public"."mentorship_milestones" TO "anon";

GRANT UPDATE ON TABLE "public"."mentorship_milestones" TO "anon";

GRANT DELETE ON TABLE "public"."mentorship_milestones" TO "anon";

GRANT TRUNCATE ON TABLE "public"."mentorship_milestones" TO "anon";

GRANT REFERENCES ON TABLE "public"."mentorship_milestones" TO "anon";

GRANT TRIGGER ON TABLE "public"."mentorship_milestones" TO "anon";

GRANT MAINTAIN ON TABLE "public"."mentorship_milestones" TO "anon";

GRANT INSERT ON TABLE "public"."mentorship_milestones" TO "authenticated";

GRANT SELECT ON TABLE "public"."mentorship_milestones" TO "authenticated";

GRANT UPDATE ON TABLE "public"."mentorship_milestones" TO "authenticated";

GRANT DELETE ON TABLE "public"."mentorship_milestones" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."mentorship_milestones" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."mentorship_milestones" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."mentorship_milestones" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."mentorship_milestones" TO "authenticated";

GRANT INSERT ON TABLE "public"."mentorship_milestones" TO "service_role";

GRANT SELECT ON TABLE "public"."mentorship_milestones" TO "service_role";

GRANT UPDATE ON TABLE "public"."mentorship_milestones" TO "service_role";

GRANT DELETE ON TABLE "public"."mentorship_milestones" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."mentorship_milestones" TO "service_role";

GRANT REFERENCES ON TABLE "public"."mentorship_milestones" TO "service_role";

GRANT TRIGGER ON TABLE "public"."mentorship_milestones" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."mentorship_milestones" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."match_outcomes" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."match_outcomes" TO "anon";

GRANT SELECT ON TABLE "public"."match_outcomes" TO "anon";

GRANT UPDATE ON TABLE "public"."match_outcomes" TO "anon";

GRANT DELETE ON TABLE "public"."match_outcomes" TO "anon";

GRANT TRUNCATE ON TABLE "public"."match_outcomes" TO "anon";

GRANT REFERENCES ON TABLE "public"."match_outcomes" TO "anon";

GRANT TRIGGER ON TABLE "public"."match_outcomes" TO "anon";

GRANT MAINTAIN ON TABLE "public"."match_outcomes" TO "anon";

GRANT INSERT ON TABLE "public"."match_outcomes" TO "authenticated";

GRANT SELECT ON TABLE "public"."match_outcomes" TO "authenticated";

GRANT UPDATE ON TABLE "public"."match_outcomes" TO "authenticated";

GRANT DELETE ON TABLE "public"."match_outcomes" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."match_outcomes" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."match_outcomes" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."match_outcomes" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."match_outcomes" TO "authenticated";

GRANT INSERT ON TABLE "public"."match_outcomes" TO "service_role";

GRANT SELECT ON TABLE "public"."match_outcomes" TO "service_role";

GRANT UPDATE ON TABLE "public"."match_outcomes" TO "service_role";

GRANT DELETE ON TABLE "public"."match_outcomes" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."match_outcomes" TO "service_role";

GRANT REFERENCES ON TABLE "public"."match_outcomes" TO "service_role";

GRANT TRIGGER ON TABLE "public"."match_outcomes" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."match_outcomes" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."mentor_profiles" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."mentor_profiles" TO "anon";

GRANT SELECT ON TABLE "public"."mentor_profiles" TO "anon";

GRANT UPDATE ON TABLE "public"."mentor_profiles" TO "anon";

GRANT DELETE ON TABLE "public"."mentor_profiles" TO "anon";

GRANT TRUNCATE ON TABLE "public"."mentor_profiles" TO "anon";

GRANT REFERENCES ON TABLE "public"."mentor_profiles" TO "anon";

GRANT TRIGGER ON TABLE "public"."mentor_profiles" TO "anon";

GRANT MAINTAIN ON TABLE "public"."mentor_profiles" TO "anon";

GRANT INSERT ON TABLE "public"."mentor_profiles" TO "authenticated";

GRANT SELECT ON TABLE "public"."mentor_profiles" TO "authenticated";

GRANT UPDATE ON TABLE "public"."mentor_profiles" TO "authenticated";

GRANT DELETE ON TABLE "public"."mentor_profiles" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."mentor_profiles" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."mentor_profiles" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."mentor_profiles" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."mentor_profiles" TO "authenticated";

GRANT INSERT ON TABLE "public"."mentor_profiles" TO "service_role";

GRANT SELECT ON TABLE "public"."mentor_profiles" TO "service_role";

GRANT UPDATE ON TABLE "public"."mentor_profiles" TO "service_role";

GRANT DELETE ON TABLE "public"."mentor_profiles" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."mentor_profiles" TO "service_role";

GRANT REFERENCES ON TABLE "public"."mentor_profiles" TO "service_role";

GRANT TRIGGER ON TABLE "public"."mentor_profiles" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."mentor_profiles" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."investor_profiles" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."investor_profiles" TO "anon";

GRANT SELECT ON TABLE "public"."investor_profiles" TO "anon";

GRANT UPDATE ON TABLE "public"."investor_profiles" TO "anon";

GRANT DELETE ON TABLE "public"."investor_profiles" TO "anon";

GRANT TRUNCATE ON TABLE "public"."investor_profiles" TO "anon";

GRANT REFERENCES ON TABLE "public"."investor_profiles" TO "anon";

GRANT TRIGGER ON TABLE "public"."investor_profiles" TO "anon";

GRANT MAINTAIN ON TABLE "public"."investor_profiles" TO "anon";

GRANT INSERT ON TABLE "public"."investor_profiles" TO "authenticated";

GRANT SELECT ON TABLE "public"."investor_profiles" TO "authenticated";

GRANT UPDATE ON TABLE "public"."investor_profiles" TO "authenticated";

GRANT DELETE ON TABLE "public"."investor_profiles" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."investor_profiles" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."investor_profiles" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."investor_profiles" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."investor_profiles" TO "authenticated";

GRANT INSERT ON TABLE "public"."investor_profiles" TO "service_role";

GRANT SELECT ON TABLE "public"."investor_profiles" TO "service_role";

GRANT UPDATE ON TABLE "public"."investor_profiles" TO "service_role";

GRANT DELETE ON TABLE "public"."investor_profiles" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."investor_profiles" TO "service_role";

GRANT REFERENCES ON TABLE "public"."investor_profiles" TO "service_role";

GRANT TRIGGER ON TABLE "public"."investor_profiles" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."investor_profiles" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."student_profiles" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."student_profiles" TO "anon";

GRANT SELECT ON TABLE "public"."student_profiles" TO "anon";

GRANT UPDATE ON TABLE "public"."student_profiles" TO "anon";

GRANT DELETE ON TABLE "public"."student_profiles" TO "anon";

GRANT TRUNCATE ON TABLE "public"."student_profiles" TO "anon";

GRANT REFERENCES ON TABLE "public"."student_profiles" TO "anon";

GRANT TRIGGER ON TABLE "public"."student_profiles" TO "anon";

GRANT MAINTAIN ON TABLE "public"."student_profiles" TO "anon";

GRANT INSERT ON TABLE "public"."student_profiles" TO "authenticated";

GRANT SELECT ON TABLE "public"."student_profiles" TO "authenticated";

GRANT UPDATE ON TABLE "public"."student_profiles" TO "authenticated";

GRANT DELETE ON TABLE "public"."student_profiles" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."student_profiles" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."student_profiles" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."student_profiles" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."student_profiles" TO "authenticated";

GRANT INSERT ON TABLE "public"."student_profiles" TO "service_role";

GRANT SELECT ON TABLE "public"."student_profiles" TO "service_role";

GRANT UPDATE ON TABLE "public"."student_profiles" TO "service_role";

GRANT DELETE ON TABLE "public"."student_profiles" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."student_profiles" TO "service_role";

GRANT REFERENCES ON TABLE "public"."student_profiles" TO "service_role";

GRANT TRIGGER ON TABLE "public"."student_profiles" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."student_profiles" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."trust_scores" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."trust_scores" TO "anon";

GRANT SELECT ON TABLE "public"."trust_scores" TO "anon";

GRANT UPDATE ON TABLE "public"."trust_scores" TO "anon";

GRANT DELETE ON TABLE "public"."trust_scores" TO "anon";

GRANT TRUNCATE ON TABLE "public"."trust_scores" TO "anon";

GRANT REFERENCES ON TABLE "public"."trust_scores" TO "anon";

GRANT TRIGGER ON TABLE "public"."trust_scores" TO "anon";

GRANT MAINTAIN ON TABLE "public"."trust_scores" TO "anon";

GRANT INSERT ON TABLE "public"."trust_scores" TO "authenticated";

GRANT SELECT ON TABLE "public"."trust_scores" TO "authenticated";

GRANT UPDATE ON TABLE "public"."trust_scores" TO "authenticated";

GRANT DELETE ON TABLE "public"."trust_scores" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."trust_scores" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."trust_scores" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."trust_scores" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."trust_scores" TO "authenticated";

GRANT INSERT ON TABLE "public"."trust_scores" TO "service_role";

GRANT SELECT ON TABLE "public"."trust_scores" TO "service_role";

GRANT UPDATE ON TABLE "public"."trust_scores" TO "service_role";

GRANT DELETE ON TABLE "public"."trust_scores" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."trust_scores" TO "service_role";

GRANT REFERENCES ON TABLE "public"."trust_scores" TO "service_role";

GRANT TRIGGER ON TABLE "public"."trust_scores" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."trust_scores" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."user_subscriptions" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."user_subscriptions" TO "anon";

GRANT SELECT ON TABLE "public"."user_subscriptions" TO "anon";

GRANT UPDATE ON TABLE "public"."user_subscriptions" TO "anon";

GRANT DELETE ON TABLE "public"."user_subscriptions" TO "anon";

GRANT TRUNCATE ON TABLE "public"."user_subscriptions" TO "anon";

GRANT REFERENCES ON TABLE "public"."user_subscriptions" TO "anon";

GRANT TRIGGER ON TABLE "public"."user_subscriptions" TO "anon";

GRANT MAINTAIN ON TABLE "public"."user_subscriptions" TO "anon";

GRANT INSERT ON TABLE "public"."user_subscriptions" TO "authenticated";

GRANT SELECT ON TABLE "public"."user_subscriptions" TO "authenticated";

GRANT UPDATE ON TABLE "public"."user_subscriptions" TO "authenticated";

GRANT DELETE ON TABLE "public"."user_subscriptions" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."user_subscriptions" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."user_subscriptions" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."user_subscriptions" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."user_subscriptions" TO "authenticated";

GRANT INSERT ON TABLE "public"."user_subscriptions" TO "service_role";

GRANT SELECT ON TABLE "public"."user_subscriptions" TO "service_role";

GRANT UPDATE ON TABLE "public"."user_subscriptions" TO "service_role";

GRANT DELETE ON TABLE "public"."user_subscriptions" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."user_subscriptions" TO "service_role";

GRANT REFERENCES ON TABLE "public"."user_subscriptions" TO "service_role";

GRANT TRIGGER ON TABLE "public"."user_subscriptions" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."user_subscriptions" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."usage_counters" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."usage_counters" TO "anon";

GRANT SELECT ON TABLE "public"."usage_counters" TO "anon";

GRANT UPDATE ON TABLE "public"."usage_counters" TO "anon";

GRANT DELETE ON TABLE "public"."usage_counters" TO "anon";

GRANT TRUNCATE ON TABLE "public"."usage_counters" TO "anon";

GRANT REFERENCES ON TABLE "public"."usage_counters" TO "anon";

GRANT TRIGGER ON TABLE "public"."usage_counters" TO "anon";

GRANT MAINTAIN ON TABLE "public"."usage_counters" TO "anon";

GRANT INSERT ON TABLE "public"."usage_counters" TO "authenticated";

GRANT SELECT ON TABLE "public"."usage_counters" TO "authenticated";

GRANT UPDATE ON TABLE "public"."usage_counters" TO "authenticated";

GRANT DELETE ON TABLE "public"."usage_counters" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."usage_counters" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."usage_counters" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."usage_counters" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."usage_counters" TO "authenticated";

GRANT INSERT ON TABLE "public"."usage_counters" TO "service_role";

GRANT SELECT ON TABLE "public"."usage_counters" TO "service_role";

GRANT UPDATE ON TABLE "public"."usage_counters" TO "service_role";

GRANT DELETE ON TABLE "public"."usage_counters" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."usage_counters" TO "service_role";

GRANT REFERENCES ON TABLE "public"."usage_counters" TO "service_role";

GRANT TRIGGER ON TABLE "public"."usage_counters" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."usage_counters" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."profiles" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."profiles" TO "anon";

GRANT SELECT ON TABLE "public"."profiles" TO "anon";

GRANT UPDATE ON TABLE "public"."profiles" TO "anon";

GRANT DELETE ON TABLE "public"."profiles" TO "anon";

GRANT TRUNCATE ON TABLE "public"."profiles" TO "anon";

GRANT REFERENCES ON TABLE "public"."profiles" TO "anon";

GRANT TRIGGER ON TABLE "public"."profiles" TO "anon";

GRANT MAINTAIN ON TABLE "public"."profiles" TO "anon";

GRANT INSERT ON TABLE "public"."profiles" TO "authenticated";

GRANT SELECT ON TABLE "public"."profiles" TO "authenticated";

GRANT UPDATE ON TABLE "public"."profiles" TO "authenticated";

GRANT DELETE ON TABLE "public"."profiles" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."profiles" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."profiles" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."profiles" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."profiles" TO "authenticated";

GRANT INSERT ON TABLE "public"."profiles" TO "service_role";

GRANT SELECT ON TABLE "public"."profiles" TO "service_role";

GRANT UPDATE ON TABLE "public"."profiles" TO "service_role";

GRANT DELETE ON TABLE "public"."profiles" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."profiles" TO "service_role";

GRANT REFERENCES ON TABLE "public"."profiles" TO "service_role";

GRANT TRIGGER ON TABLE "public"."profiles" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."profiles" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."conversation_participants" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."conversation_participants" TO "anon";

GRANT SELECT ON TABLE "public"."conversation_participants" TO "anon";

GRANT UPDATE ON TABLE "public"."conversation_participants" TO "anon";

GRANT DELETE ON TABLE "public"."conversation_participants" TO "anon";

GRANT TRUNCATE ON TABLE "public"."conversation_participants" TO "anon";

GRANT REFERENCES ON TABLE "public"."conversation_participants" TO "anon";

GRANT TRIGGER ON TABLE "public"."conversation_participants" TO "anon";

GRANT MAINTAIN ON TABLE "public"."conversation_participants" TO "anon";

GRANT INSERT ON TABLE "public"."conversation_participants" TO "authenticated";

GRANT SELECT ON TABLE "public"."conversation_participants" TO "authenticated";

GRANT UPDATE ON TABLE "public"."conversation_participants" TO "authenticated";

GRANT DELETE ON TABLE "public"."conversation_participants" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."conversation_participants" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."conversation_participants" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."conversation_participants" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."conversation_participants" TO "authenticated";

GRANT INSERT ON TABLE "public"."conversation_participants" TO "service_role";

GRANT SELECT ON TABLE "public"."conversation_participants" TO "service_role";

GRANT UPDATE ON TABLE "public"."conversation_participants" TO "service_role";

GRANT DELETE ON TABLE "public"."conversation_participants" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."conversation_participants" TO "service_role";

GRANT REFERENCES ON TABLE "public"."conversation_participants" TO "service_role";

GRANT TRIGGER ON TABLE "public"."conversation_participants" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."conversation_participants" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."founder_profiles" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."founder_profiles" TO "anon";

GRANT SELECT ON TABLE "public"."founder_profiles" TO "anon";

GRANT UPDATE ON TABLE "public"."founder_profiles" TO "anon";

GRANT DELETE ON TABLE "public"."founder_profiles" TO "anon";

GRANT TRUNCATE ON TABLE "public"."founder_profiles" TO "anon";

GRANT REFERENCES ON TABLE "public"."founder_profiles" TO "anon";

GRANT TRIGGER ON TABLE "public"."founder_profiles" TO "anon";

GRANT MAINTAIN ON TABLE "public"."founder_profiles" TO "anon";

GRANT INSERT ON TABLE "public"."founder_profiles" TO "authenticated";

GRANT SELECT ON TABLE "public"."founder_profiles" TO "authenticated";

GRANT UPDATE ON TABLE "public"."founder_profiles" TO "authenticated";

GRANT DELETE ON TABLE "public"."founder_profiles" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."founder_profiles" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."founder_profiles" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."founder_profiles" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."founder_profiles" TO "authenticated";

GRANT INSERT ON TABLE "public"."founder_profiles" TO "service_role";

GRANT SELECT ON TABLE "public"."founder_profiles" TO "service_role";

GRANT UPDATE ON TABLE "public"."founder_profiles" TO "service_role";

GRANT DELETE ON TABLE "public"."founder_profiles" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."founder_profiles" TO "service_role";

GRANT REFERENCES ON TABLE "public"."founder_profiles" TO "service_role";

GRANT TRIGGER ON TABLE "public"."founder_profiles" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."founder_profiles" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."matching_preferences" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."matching_preferences" TO "anon";

GRANT SELECT ON TABLE "public"."matching_preferences" TO "anon";

GRANT UPDATE ON TABLE "public"."matching_preferences" TO "anon";

GRANT DELETE ON TABLE "public"."matching_preferences" TO "anon";

GRANT TRUNCATE ON TABLE "public"."matching_preferences" TO "anon";

GRANT REFERENCES ON TABLE "public"."matching_preferences" TO "anon";

GRANT TRIGGER ON TABLE "public"."matching_preferences" TO "anon";

GRANT MAINTAIN ON TABLE "public"."matching_preferences" TO "anon";

GRANT INSERT ON TABLE "public"."matching_preferences" TO "authenticated";

GRANT SELECT ON TABLE "public"."matching_preferences" TO "authenticated";

GRANT UPDATE ON TABLE "public"."matching_preferences" TO "authenticated";

GRANT DELETE ON TABLE "public"."matching_preferences" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."matching_preferences" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."matching_preferences" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."matching_preferences" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."matching_preferences" TO "authenticated";

GRANT INSERT ON TABLE "public"."matching_preferences" TO "service_role";

GRANT SELECT ON TABLE "public"."matching_preferences" TO "service_role";

GRANT UPDATE ON TABLE "public"."matching_preferences" TO "service_role";

GRANT DELETE ON TABLE "public"."matching_preferences" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."matching_preferences" TO "service_role";

GRANT REFERENCES ON TABLE "public"."matching_preferences" TO "service_role";

GRANT TRIGGER ON TABLE "public"."matching_preferences" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."matching_preferences" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."interaction_history" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."interaction_history" TO "anon";

GRANT SELECT ON TABLE "public"."interaction_history" TO "anon";

GRANT UPDATE ON TABLE "public"."interaction_history" TO "anon";

GRANT DELETE ON TABLE "public"."interaction_history" TO "anon";

GRANT TRUNCATE ON TABLE "public"."interaction_history" TO "anon";

GRANT REFERENCES ON TABLE "public"."interaction_history" TO "anon";

GRANT TRIGGER ON TABLE "public"."interaction_history" TO "anon";

GRANT MAINTAIN ON TABLE "public"."interaction_history" TO "anon";

GRANT INSERT ON TABLE "public"."interaction_history" TO "authenticated";

GRANT SELECT ON TABLE "public"."interaction_history" TO "authenticated";

GRANT UPDATE ON TABLE "public"."interaction_history" TO "authenticated";

GRANT DELETE ON TABLE "public"."interaction_history" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."interaction_history" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."interaction_history" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."interaction_history" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."interaction_history" TO "authenticated";

GRANT INSERT ON TABLE "public"."interaction_history" TO "service_role";

GRANT SELECT ON TABLE "public"."interaction_history" TO "service_role";

GRANT UPDATE ON TABLE "public"."interaction_history" TO "service_role";

GRANT DELETE ON TABLE "public"."interaction_history" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."interaction_history" TO "service_role";

GRANT REFERENCES ON TABLE "public"."interaction_history" TO "service_role";

GRANT TRIGGER ON TABLE "public"."interaction_history" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."interaction_history" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."user_skills" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."user_skills" TO "anon";

GRANT SELECT ON TABLE "public"."user_skills" TO "anon";

GRANT UPDATE ON TABLE "public"."user_skills" TO "anon";

GRANT DELETE ON TABLE "public"."user_skills" TO "anon";

GRANT TRUNCATE ON TABLE "public"."user_skills" TO "anon";

GRANT REFERENCES ON TABLE "public"."user_skills" TO "anon";

GRANT TRIGGER ON TABLE "public"."user_skills" TO "anon";

GRANT MAINTAIN ON TABLE "public"."user_skills" TO "anon";

GRANT INSERT ON TABLE "public"."user_skills" TO "authenticated";

GRANT SELECT ON TABLE "public"."user_skills" TO "authenticated";

GRANT UPDATE ON TABLE "public"."user_skills" TO "authenticated";

GRANT DELETE ON TABLE "public"."user_skills" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."user_skills" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."user_skills" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."user_skills" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."user_skills" TO "authenticated";

GRANT INSERT ON TABLE "public"."user_skills" TO "service_role";

GRANT SELECT ON TABLE "public"."user_skills" TO "service_role";

GRANT UPDATE ON TABLE "public"."user_skills" TO "service_role";

GRANT DELETE ON TABLE "public"."user_skills" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."user_skills" TO "service_role";

GRANT REFERENCES ON TABLE "public"."user_skills" TO "service_role";

GRANT TRIGGER ON TABLE "public"."user_skills" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."user_skills" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."skill_taxonomy" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."skill_taxonomy" TO "anon";

GRANT SELECT ON TABLE "public"."skill_taxonomy" TO "anon";

GRANT UPDATE ON TABLE "public"."skill_taxonomy" TO "anon";

GRANT DELETE ON TABLE "public"."skill_taxonomy" TO "anon";

GRANT TRUNCATE ON TABLE "public"."skill_taxonomy" TO "anon";

GRANT REFERENCES ON TABLE "public"."skill_taxonomy" TO "anon";

GRANT TRIGGER ON TABLE "public"."skill_taxonomy" TO "anon";

GRANT MAINTAIN ON TABLE "public"."skill_taxonomy" TO "anon";

GRANT INSERT ON TABLE "public"."skill_taxonomy" TO "authenticated";

GRANT SELECT ON TABLE "public"."skill_taxonomy" TO "authenticated";

GRANT UPDATE ON TABLE "public"."skill_taxonomy" TO "authenticated";

GRANT DELETE ON TABLE "public"."skill_taxonomy" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."skill_taxonomy" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."skill_taxonomy" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."skill_taxonomy" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."skill_taxonomy" TO "authenticated";

GRANT INSERT ON TABLE "public"."skill_taxonomy" TO "service_role";

GRANT SELECT ON TABLE "public"."skill_taxonomy" TO "service_role";

GRANT UPDATE ON TABLE "public"."skill_taxonomy" TO "service_role";

GRANT DELETE ON TABLE "public"."skill_taxonomy" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."skill_taxonomy" TO "service_role";

GRANT REFERENCES ON TABLE "public"."skill_taxonomy" TO "service_role";

GRANT TRIGGER ON TABLE "public"."skill_taxonomy" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."skill_taxonomy" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."profile_verifications" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."profile_verifications" TO "anon";

GRANT SELECT ON TABLE "public"."profile_verifications" TO "anon";

GRANT UPDATE ON TABLE "public"."profile_verifications" TO "anon";

GRANT DELETE ON TABLE "public"."profile_verifications" TO "anon";

GRANT TRUNCATE ON TABLE "public"."profile_verifications" TO "anon";

GRANT REFERENCES ON TABLE "public"."profile_verifications" TO "anon";

GRANT TRIGGER ON TABLE "public"."profile_verifications" TO "anon";

GRANT MAINTAIN ON TABLE "public"."profile_verifications" TO "anon";

GRANT INSERT ON TABLE "public"."profile_verifications" TO "authenticated";

GRANT SELECT ON TABLE "public"."profile_verifications" TO "authenticated";

GRANT UPDATE ON TABLE "public"."profile_verifications" TO "authenticated";

GRANT DELETE ON TABLE "public"."profile_verifications" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."profile_verifications" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."profile_verifications" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."profile_verifications" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."profile_verifications" TO "authenticated";

GRANT INSERT ON TABLE "public"."profile_verifications" TO "service_role";

GRANT SELECT ON TABLE "public"."profile_verifications" TO "service_role";

GRANT UPDATE ON TABLE "public"."profile_verifications" TO "service_role";

GRANT DELETE ON TABLE "public"."profile_verifications" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."profile_verifications" TO "service_role";

GRANT REFERENCES ON TABLE "public"."profile_verifications" TO "service_role";

GRANT TRIGGER ON TABLE "public"."profile_verifications" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."profile_verifications" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."profile_verification_checks" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."profile_verification_checks" TO "anon";

GRANT SELECT ON TABLE "public"."profile_verification_checks" TO "anon";

GRANT UPDATE ON TABLE "public"."profile_verification_checks" TO "anon";

GRANT DELETE ON TABLE "public"."profile_verification_checks" TO "anon";

GRANT TRUNCATE ON TABLE "public"."profile_verification_checks" TO "anon";

GRANT REFERENCES ON TABLE "public"."profile_verification_checks" TO "anon";

GRANT TRIGGER ON TABLE "public"."profile_verification_checks" TO "anon";

GRANT MAINTAIN ON TABLE "public"."profile_verification_checks" TO "anon";

GRANT INSERT ON TABLE "public"."profile_verification_checks" TO "authenticated";

GRANT SELECT ON TABLE "public"."profile_verification_checks" TO "authenticated";

GRANT UPDATE ON TABLE "public"."profile_verification_checks" TO "authenticated";

GRANT DELETE ON TABLE "public"."profile_verification_checks" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."profile_verification_checks" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."profile_verification_checks" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."profile_verification_checks" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."profile_verification_checks" TO "authenticated";

GRANT INSERT ON TABLE "public"."profile_verification_checks" TO "service_role";

GRANT SELECT ON TABLE "public"."profile_verification_checks" TO "service_role";

GRANT UPDATE ON TABLE "public"."profile_verification_checks" TO "service_role";

GRANT DELETE ON TABLE "public"."profile_verification_checks" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."profile_verification_checks" TO "service_role";

GRANT REFERENCES ON TABLE "public"."profile_verification_checks" TO "service_role";

GRANT TRIGGER ON TABLE "public"."profile_verification_checks" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."profile_verification_checks" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."profile_evidence_files" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."profile_evidence_files" TO "anon";

GRANT SELECT ON TABLE "public"."profile_evidence_files" TO "anon";

GRANT UPDATE ON TABLE "public"."profile_evidence_files" TO "anon";

GRANT DELETE ON TABLE "public"."profile_evidence_files" TO "anon";

GRANT TRUNCATE ON TABLE "public"."profile_evidence_files" TO "anon";

GRANT REFERENCES ON TABLE "public"."profile_evidence_files" TO "anon";

GRANT TRIGGER ON TABLE "public"."profile_evidence_files" TO "anon";

GRANT MAINTAIN ON TABLE "public"."profile_evidence_files" TO "anon";

GRANT INSERT ON TABLE "public"."profile_evidence_files" TO "authenticated";

GRANT SELECT ON TABLE "public"."profile_evidence_files" TO "authenticated";

GRANT UPDATE ON TABLE "public"."profile_evidence_files" TO "authenticated";

GRANT DELETE ON TABLE "public"."profile_evidence_files" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."profile_evidence_files" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."profile_evidence_files" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."profile_evidence_files" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."profile_evidence_files" TO "authenticated";

GRANT INSERT ON TABLE "public"."profile_evidence_files" TO "service_role";

GRANT SELECT ON TABLE "public"."profile_evidence_files" TO "service_role";

GRANT UPDATE ON TABLE "public"."profile_evidence_files" TO "service_role";

GRANT DELETE ON TABLE "public"."profile_evidence_files" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."profile_evidence_files" TO "service_role";

GRANT REFERENCES ON TABLE "public"."profile_evidence_files" TO "service_role";

GRANT TRIGGER ON TABLE "public"."profile_evidence_files" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."profile_evidence_files" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."connected_identity_accounts" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."connected_identity_accounts" TO "anon";

GRANT SELECT ON TABLE "public"."connected_identity_accounts" TO "anon";

GRANT UPDATE ON TABLE "public"."connected_identity_accounts" TO "anon";

GRANT DELETE ON TABLE "public"."connected_identity_accounts" TO "anon";

GRANT TRUNCATE ON TABLE "public"."connected_identity_accounts" TO "anon";

GRANT REFERENCES ON TABLE "public"."connected_identity_accounts" TO "anon";

GRANT TRIGGER ON TABLE "public"."connected_identity_accounts" TO "anon";

GRANT MAINTAIN ON TABLE "public"."connected_identity_accounts" TO "anon";

GRANT INSERT ON TABLE "public"."connected_identity_accounts" TO "authenticated";

GRANT SELECT ON TABLE "public"."connected_identity_accounts" TO "authenticated";

GRANT UPDATE ON TABLE "public"."connected_identity_accounts" TO "authenticated";

GRANT DELETE ON TABLE "public"."connected_identity_accounts" TO "authenticated";

GRANT TRUNCATE ON TABLE "public"."connected_identity_accounts" TO "authenticated";

GRANT REFERENCES ON TABLE "public"."connected_identity_accounts" TO "authenticated";

GRANT TRIGGER ON TABLE "public"."connected_identity_accounts" TO "authenticated";

GRANT MAINTAIN ON TABLE "public"."connected_identity_accounts" TO "authenticated";

GRANT INSERT ON TABLE "public"."connected_identity_accounts" TO "service_role";

GRANT SELECT ON TABLE "public"."connected_identity_accounts" TO "service_role";

GRANT UPDATE ON TABLE "public"."connected_identity_accounts" TO "service_role";

GRANT DELETE ON TABLE "public"."connected_identity_accounts" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."connected_identity_accounts" TO "service_role";

GRANT REFERENCES ON TABLE "public"."connected_identity_accounts" TO "service_role";

GRANT TRIGGER ON TABLE "public"."connected_identity_accounts" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."connected_identity_accounts" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."matching_events" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."matching_events" TO "service_role";

GRANT SELECT ON TABLE "public"."matching_events" TO "service_role";

GRANT UPDATE ON TABLE "public"."matching_events" TO "service_role";

GRANT DELETE ON TABLE "public"."matching_events" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."matching_events" TO "service_role";

GRANT REFERENCES ON TABLE "public"."matching_events" TO "service_role";

GRANT TRIGGER ON TABLE "public"."matching_events" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."matching_events" TO "service_role";

GRANT SELECT ON TABLE "public"."matching_events" TO "authenticated";

REVOKE ALL PRIVILEGES ON TABLE "public"."trust_evidence" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."trust_evidence" TO "service_role";

GRANT SELECT ON TABLE "public"."trust_evidence" TO "service_role";

GRANT UPDATE ON TABLE "public"."trust_evidence" TO "service_role";

GRANT DELETE ON TABLE "public"."trust_evidence" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."trust_evidence" TO "service_role";

GRANT REFERENCES ON TABLE "public"."trust_evidence" TO "service_role";

GRANT TRIGGER ON TABLE "public"."trust_evidence" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."trust_evidence" TO "service_role";

REVOKE ALL PRIVILEGES ON TABLE "public"."evidence_grants" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE "public"."evidence_grants" TO "service_role";

GRANT SELECT ON TABLE "public"."evidence_grants" TO "service_role";

GRANT UPDATE ON TABLE "public"."evidence_grants" TO "service_role";

GRANT DELETE ON TABLE "public"."evidence_grants" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."evidence_grants" TO "service_role";

GRANT REFERENCES ON TABLE "public"."evidence_grants" TO "service_role";

GRANT TRIGGER ON TABLE "public"."evidence_grants" TO "service_role";

GRANT MAINTAIN ON TABLE "public"."evidence_grants" TO "service_role";

REVOKE ALL PRIVILEGES ON FUNCTION "public"."capture_matching_request_event"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."capture_matching_request_event"() TO "service_role";

REVOKE ALL PRIVILEGES ON FUNCTION "public"."claim_review_job"(p_kind text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."claim_review_job"(p_kind text) TO "service_role";

REVOKE ALL PRIVILEGES ON FUNCTION "public"."create_conversation_with_participants"(p_created_by uuid, p_other_user uuid, p_type text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."create_conversation_with_participants"(p_created_by uuid, p_other_user uuid, p_type text) TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."create_conversation_with_participants"(p_created_by uuid, p_other_user uuid, p_type text) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."create_conversation_with_participants"(p_created_by uuid, p_other_user uuid, p_type text) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."create_conversation_with_participants"(p_created_by uuid, p_other_user uuid, p_type text) TO "service_role";

REVOKE ALL PRIVILEGES ON FUNCTION "public"."current_profile_approved"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."current_profile_approved"() TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."current_profile_approved"() TO "service_role";

REVOKE ALL PRIVILEGES ON FUNCTION "public"."decide_profile_review"(p_user uuid, p_revision integer, p_admin uuid, p_status text, p_note text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."decide_profile_review"(p_user uuid, p_revision integer, p_admin uuid, p_status text, p_note text) TO "service_role";

REVOKE ALL PRIVILEGES ON FUNCTION "public"."enforce_active_registration_role"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."enforce_active_registration_role"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."enforce_active_registration_role"() TO "anon";

GRANT EXECUTE ON FUNCTION "public"."enforce_active_registration_role"() TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."enforce_active_registration_role"() TO "service_role";

REVOKE ALL PRIVILEGES ON FUNCTION "public"."get_user_profile"(user_uuid uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."get_user_profile"(user_uuid uuid) TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."get_user_profile"(user_uuid uuid) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."get_user_profile"(user_uuid uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."get_user_profile"(user_uuid uuid) TO "service_role";

REVOKE ALL PRIVILEGES ON FUNCTION "public"."guard_client_profile_fields"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."guard_client_profile_fields"() TO "service_role";

REVOKE ALL PRIVILEGES ON FUNCTION "public"."guard_reviewed_connection"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."guard_reviewed_connection"() TO "service_role";

REVOKE ALL PRIVILEGES ON FUNCTION "public"."handle_new_user"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "anon";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "service_role";

REVOKE ALL PRIVILEGES ON FUNCTION "public"."handle_updated_at"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."handle_updated_at"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."handle_updated_at"() TO "anon";

GRANT EXECUTE ON FUNCTION "public"."handle_updated_at"() TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."handle_updated_at"() TO "service_role";

REVOKE ALL PRIVILEGES ON FUNCTION "public"."increment_login_tracking"(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."increment_login_tracking"(p_user_id uuid) TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."increment_login_tracking"(p_user_id uuid) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."increment_login_tracking"(p_user_id uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."increment_login_tracking"(p_user_id uuid) TO "service_role";

REVOKE ALL PRIVILEGES ON FUNCTION "public"."log_profile_changes"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."log_profile_changes"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."log_profile_changes"() TO "anon";

GRANT EXECUTE ON FUNCTION "public"."log_profile_changes"() TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."log_profile_changes"() TO "service_role";

REVOKE ALL PRIVILEGES ON FUNCTION "public"."queue_evidence_analysis"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."queue_evidence_analysis"() TO "service_role";

REVOKE ALL PRIVILEGES ON FUNCTION "public"."queue_profile_review"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."queue_profile_review"() TO "service_role";

REVOKE ALL PRIVILEGES ON FUNCTION "public"."record_evidence_review"(p_evidence uuid, p_reviewer uuid, p_status text, p_note text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."record_evidence_review"(p_evidence uuid, p_reviewer uuid, p_status text, p_note text) TO "service_role";

REVOKE ALL PRIVILEGES ON FUNCTION "public"."refresh_matching_scores"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."refresh_matching_scores"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."refresh_matching_scores"() TO "anon";

GRANT EXECUTE ON FUNCTION "public"."refresh_matching_scores"() TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."refresh_matching_scores"() TO "service_role";

REVOKE ALL PRIVILEGES ON FUNCTION "public"."rls_auto_enable"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO "anon";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO "service_role";

REVOKE ALL PRIVILEGES ON FUNCTION "public"."set_updated_at"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO "anon";

GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO "service_role";

REVOKE ALL PRIVILEGES ON FUNCTION "public"."soft_delete_user"(user_uuid uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."soft_delete_user"(user_uuid uuid) TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."soft_delete_user"(user_uuid uuid) TO "anon";

GRANT EXECUTE ON FUNCTION "public"."soft_delete_user"(user_uuid uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."soft_delete_user"(user_uuid uuid) TO "service_role";

REVOKE ALL PRIVILEGES ON FUNCTION "public"."sync_graduation_year"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."sync_graduation_year"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."sync_graduation_year"() TO "anon";

GRANT EXECUTE ON FUNCTION "public"."sync_graduation_year"() TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."sync_graduation_year"() TO "service_role";

REVOKE ALL PRIVILEGES ON FUNCTION "public"."sync_investor_profile_aliases"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."sync_investor_profile_aliases"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."sync_investor_profile_aliases"() TO "anon";

GRANT EXECUTE ON FUNCTION "public"."sync_investor_profile_aliases"() TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."sync_investor_profile_aliases"() TO "service_role";

REVOKE ALL PRIVILEGES ON FUNCTION "public"."update_updated_at_column"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION "public"."update_updated_at_column"() TO PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."update_updated_at_column"() TO "anon";

GRANT EXECUTE ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";

GRANT EXECUTE ON FUNCTION "public"."update_updated_at_column"() TO "service_role";

CREATE POLICY "Users can manage own AI growth plan" ON "public"."ai_growth_plans" AS PERMISSIVE FOR ALL TO "authenticated" USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "audit_log_no_client_access" ON "public"."audit_log" AS RESTRICTIVE FOR ALL TO "authenticated" USING (false) WITH CHECK (false);

CREATE POLICY "Users can read own connected identities" ON "public"."connected_identity_accounts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((auth.uid() = user_id));

CREATE POLICY "connection_requests_insert_sender" ON "public"."connection_requests" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((sender_id = ( SELECT auth.uid() AS uid)) AND (sender_id <> receiver_id) AND (status = 'pending'::text) AND (responded_at IS NULL)));

CREATE POLICY "connection_requests_receiver_response" ON "public"."connection_requests" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((receiver_id = ( SELECT auth.uid() AS uid)) AND (status = 'pending'::text))) WITH CHECK (((receiver_id = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['accepted'::text, 'declined'::text])) AND (responded_at IS NOT NULL)));

CREATE POLICY "connection_requests_select_participants" ON "public"."connection_requests" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT auth.uid() AS uid) = sender_id) OR (( SELECT auth.uid() AS uid) = receiver_id)));

CREATE POLICY "connection_requests_sender_withdraw" ON "public"."connection_requests" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((sender_id = ( SELECT auth.uid() AS uid)) AND (status = 'pending'::text))) WITH CHECK (((sender_id = ( SELECT auth.uid() AS uid)) AND (status = 'withdrawn'::text)));

CREATE POLICY "connections_select_participants" ON "public"."connections" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((( SELECT auth.uid() AS uid) = user_1) OR (( SELECT auth.uid() AS uid) = user_2)));

CREATE POLICY "conversation_participants_insert_own" ON "public"."conversation_participants" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "conversation_participants_select_own" ON "public"."conversation_participants" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "conversation_participants_update_own" ON "public"."conversation_participants" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "review_approved_participants" ON "public"."conversation_participants" AS RESTRICTIVE FOR ALL TO "authenticated" USING (( SELECT current_profile_approved() AS current_profile_approved)) WITH CHECK (( SELECT current_profile_approved() AS current_profile_approved));

CREATE POLICY "conversations_select_participants" ON "public"."conversations" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM conversation_participants cp
  WHERE ((cp.conversation_id = conversations.id) AND (cp.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "review_approved_conversations" ON "public"."conversations" AS RESTRICTIVE FOR ALL TO "authenticated" USING (( SELECT current_profile_approved() AS current_profile_approved)) WITH CHECK (( SELECT current_profile_approved() AS current_profile_approved));

CREATE POLICY "Founder profiles are viewable by authenticated users" ON "public"."founder_profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((is_public = true) OR (user_id = auth.uid())));

CREATE POLICY "Users can delete own founder profile" ON "public"."founder_profiles" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((user_id = auth.uid()));

CREATE POLICY "Users can insert own founder profile" ON "public"."founder_profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "Users can update own founder profile" ON "public"."founder_profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "founder_role_insert_guard" ON "public"."founder_profiles" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = founder_profiles.user_id) AND (p.user_type = 'early-stage-founder'::text) AND (p.deleted_at IS NULL))))));

CREATE POLICY "founder_role_update_guard" ON "public"."founder_profiles" AS RESTRICTIVE FOR UPDATE TO "authenticated" USING (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = founder_profiles.user_id) AND (p.user_type = 'early-stage-founder'::text) AND (p.deleted_at IS NULL)))))) WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = founder_profiles.user_id) AND (p.user_type = 'early-stage-founder'::text) AND (p.deleted_at IS NULL))))));

CREATE POLICY "interaction_own" ON "public"."interaction_history" AS PERMISSIVE FOR ALL TO "authenticated" USING (((user_id = auth.uid()) OR (target_user_id = auth.uid())));

CREATE POLICY "Investor can manage own profile" ON "public"."investor_profiles" AS PERMISSIVE FOR ALL TO "authenticated" USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Investors can read public active profiles" ON "public"."investor_profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((is_public = true) AND (is_active = true)));

CREATE POLICY "investor_role_insert_guard" ON "public"."investor_profiles" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = investor_profiles.user_id) AND (p.user_type = 'investor'::text) AND (p.deleted_at IS NULL))))));

CREATE POLICY "investor_role_update_guard" ON "public"."investor_profiles" AS RESTRICTIVE FOR UPDATE TO "authenticated" USING (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = investor_profiles.user_id) AND (p.user_type = 'investor'::text) AND (p.deleted_at IS NULL)))))) WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = investor_profiles.user_id) AND (p.user_type = 'investor'::text) AND (p.deleted_at IS NULL))))));

CREATE POLICY "Users can create own match feedback" ON "public"."match_feedback" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((auth.uid() = reviewer_id));

CREATE POLICY "Users can read related match feedback" ON "public"."match_feedback" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((auth.uid() = reviewer_id) OR (auth.uid() = target_user_id)));

CREATE POLICY "Users can create own match outcomes" ON "public"."match_outcomes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((auth.uid() = reviewer_id));

CREATE POLICY "Users can read related match outcomes" ON "public"."match_outcomes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((auth.uid() = reviewer_id) OR (auth.uid() = target_user_id)));

CREATE POLICY "matching_events_read_own" ON "public"."matching_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((actor_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "matching_preferences_manage_own" ON "public"."matching_preferences" AS PERMISSIVE FOR ALL TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Meeting participants: host can insert" ON "public"."meeting_participants" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM meetings m
  WHERE ((m.id = meeting_participants.meeting_id) AND (m.host_id = auth.uid())))));

CREATE POLICY "Meeting participants: own meetings read" ON "public"."meeting_participants" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((user_id = auth.uid()));

CREATE POLICY "Meeting participants: own row update" ON "public"."meeting_participants" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM meetings m
  WHERE ((m.id = meeting_participants.meeting_id) AND (m.host_id = auth.uid())))))) WITH CHECK (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM meetings m
  WHERE ((m.id = meeting_participants.meeting_id) AND (m.host_id = auth.uid()))))));

CREATE POLICY "Meetings: host can create" ON "public"."meetings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((host_id = auth.uid()));

CREATE POLICY "Meetings: host can update" ON "public"."meetings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((host_id = auth.uid())) WITH CHECK ((host_id = auth.uid()));

CREATE POLICY "Meetings: participants can read" ON "public"."meetings" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM meeting_participants mp
  WHERE ((mp.meeting_id = meetings.id) AND (mp.user_id = auth.uid())))));

CREATE POLICY "mentor_profiles_insert" ON "public"."mentor_profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "mentor_profiles_select" ON "public"."mentor_profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((is_public = true) OR (user_id = auth.uid())));

CREATE POLICY "mentor_profiles_update" ON "public"."mentor_profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "Mentors and mentees can manage milestones" ON "public"."mentorship_milestones" AS PERMISSIVE FOR ALL TO "authenticated" USING (((auth.uid() = mentor_id) OR (auth.uid() = mentee_id))) WITH CHECK (((auth.uid() = mentor_id) OR (auth.uid() = mentee_id)));

CREATE POLICY "messages_insert_participant_sender" ON "public"."messages" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((sender_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM conversation_participants cp
  WHERE ((cp.conversation_id = messages.conversation_id) AND (cp.user_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "messages_select_participants" ON "public"."messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM conversation_participants cp
  WHERE ((cp.conversation_id = messages.conversation_id) AND (cp.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "review_approved_messaging" ON "public"."messages" AS RESTRICTIVE FOR ALL TO "authenticated" USING (( SELECT current_profile_approved() AS current_profile_approved)) WITH CHECK (( SELECT current_profile_approved() AS current_profile_approved));

CREATE POLICY "Authenticated users can view active opportunities" ON "public"."opportunities" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((is_active = true));

CREATE POLICY "Everyone view active opportunities" ON "public"."opportunities" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((is_active = true));

CREATE POLICY "opportunities: authenticated can read active" ON "public"."opportunities" AS PERMISSIVE FOR SELECT TO PUBLIC USING (((auth.role() = 'authenticated'::text) AND (is_active = true)));

CREATE POLICY "opps_insert" ON "public"."opportunities" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((posted_by = auth.uid()));

CREATE POLICY "opps_select" ON "public"."opportunities" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((is_active = true));

CREATE POLICY "opps_update" ON "public"."opportunities" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((posted_by = auth.uid()));

CREATE POLICY "Users can manage own evidence files" ON "public"."profile_evidence_files" AS PERMISSIVE FOR ALL TO "authenticated" USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can read own profile verification checks" ON "public"."profile_verification_checks" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((auth.uid() = user_id));

CREATE POLICY "Users can read own profile verification" ON "public"."profile_verifications" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((auth.uid() = user_id));

CREATE POLICY "profiles_delete_own" ON "public"."profiles" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "profiles_insert_own" ON "public"."profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "profiles_select_authenticated_active" ON "public"."profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((deleted_at IS NULL) OR (id = ( SELECT auth.uid() AS uid))));

CREATE POLICY "profiles_update_own" ON "public"."profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((id = ( SELECT auth.uid() AS uid))) WITH CHECK ((id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Users can manage own roadmap tasks" ON "public"."roadmap_tasks" AS PERMISSIVE FOR ALL TO "authenticated" USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "skill_tax_select" ON "public"."skill_taxonomy" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((is_active = true));

CREATE POLICY "Users can read startup readiness scores" ON "public"."startup_readiness_scores" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Users can upsert own readiness score" ON "public"."startup_readiness_scores" AS PERMISSIVE FOR ALL TO "authenticated" USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "student_activities_insert_own" ON "public"."student_activities" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "student_activities_select_own" ON "public"."student_activities" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "student_profiles_delete_own" ON "public"."student_profiles" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "student_profiles_insert_own" ON "public"."student_profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "student_profiles_select_authenticated" ON "public"."student_profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "student_profiles_update_own" ON "public"."student_profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "public can read active subscription plans" ON "public"."subscription_plans" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((is_active = true));

CREATE POLICY "Users can read trust scores" ON "public"."trust_scores" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Users can upsert own trust score" ON "public"."trust_scores" AS PERMISSIVE FOR ALL TO "authenticated" USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "users can read own usage" ON "public"."usage_counters" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((auth.uid() = user_id));

CREATE POLICY "user_auth_tracking_select_own" ON "public"."user_auth_tracking" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "user_skills_modify" ON "public"."user_skills" AS PERMISSIVE FOR ALL TO "authenticated" USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "user_skills_select" ON "public"."user_skills" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "users can read own subscription" ON "public"."user_subscriptions" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((auth.uid() = user_id));

CREATE POLICY "Avatars are viewable by anyone" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((bucket_id = 'avatars'::text));

CREATE POLICY "Public can view avatars" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((bucket_id = 'avatars'::text));

CREATE POLICY "Users can delete own avatar files" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((bucket_id = 'avatars'::text) AND ((name ~~ ((auth.uid())::text || '.%'::text)) OR (name ~~ (('%_'::text || (auth.uid())::text) || '.%'::text)) OR (name ~~ (('avatars/'::text || (auth.uid())::text) || '.%'::text)) OR (name ~~ (('founders/%_'::text || (auth.uid())::text) || '.%'::text)))));

CREATE POLICY "Users can delete own avatar objects" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((bucket_id = 'avatars'::text) AND (((auth.uid())::text = (storage.foldername(name))[2]) OR ((storage.foldername(name))[2] ~~ ('%'::text || (auth.uid())::text)) OR (name ~~ (('%'::text || (auth.uid())::text) || '.%'::text)))));

CREATE POLICY "Users can delete own founder documents" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((bucket_id = 'profile-documents'::text) AND ((storage.foldername(name))[1] = 'founders'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));

CREATE POLICY "Users can delete own investor documents" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((bucket_id = 'profile-documents'::text) AND ((storage.foldername(name))[1] = 'investors'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));

CREATE POLICY "Users can delete own mentor documents" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((bucket_id = 'profile-documents'::text) AND ((storage.foldername(name))[1] = 'mentors'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));

CREATE POLICY "Users can delete own profile document objects" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((bucket_id = 'profile-documents'::text) AND (((auth.uid())::text = (storage.foldername(name))[2]) OR ((storage.foldername(name))[2] ~~ ('%'::text || (auth.uid())::text)))));

CREATE POLICY "Users can delete own profile evidence objects" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((bucket_id = 'profile-evidence'::text) AND ((auth.uid())::text = (storage.foldername(name))[2])));

CREATE POLICY "Users can delete their own avatar" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((bucket_id = 'avatars'::text) AND ((name ~~ (('avatars/'::text || (auth.uid())::text) || '%'::text)) OR (name ~~ (('founders/%_'::text || (auth.uid())::text) || '%'::text)))));

CREATE POLICY "Users can read avatar files" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((bucket_id = 'avatars'::text));

CREATE POLICY "Users can read own avatar objects" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((bucket_id = 'avatars'::text) AND (((auth.uid())::text = (storage.foldername(name))[2]) OR ((storage.foldername(name))[2] ~~ ('%'::text || (auth.uid())::text)) OR (name ~~ (('%'::text || (auth.uid())::text) || '.%'::text)))));

CREATE POLICY "Users can read own founder documents" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((bucket_id = 'profile-documents'::text) AND ((storage.foldername(name))[1] = 'founders'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));

CREATE POLICY "Users can read own investor documents" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((bucket_id = 'profile-documents'::text) AND ((storage.foldername(name))[1] = 'investors'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));

CREATE POLICY "Users can read own mentor documents" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((bucket_id = 'profile-documents'::text) AND ((storage.foldername(name))[1] = 'mentors'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));

CREATE POLICY "Users can read own profile document objects" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((bucket_id = 'profile-documents'::text) AND (((auth.uid())::text = (storage.foldername(name))[2]) OR ((storage.foldername(name))[2] ~~ ('%'::text || (auth.uid())::text)))));

CREATE POLICY "Users can read own profile documents" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((bucket_id = 'profile-documents'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));

CREATE POLICY "Users can read own profile evidence objects" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((bucket_id = 'profile-evidence'::text) AND ((auth.uid())::text = (storage.foldername(name))[2])));

CREATE POLICY "Users can update own avatar files" ON "storage"."objects" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((bucket_id = 'avatars'::text) AND ((name ~~ ((auth.uid())::text || '.%'::text)) OR (name ~~ (('%_'::text || (auth.uid())::text) || '.%'::text)) OR (name ~~ (('avatars/'::text || (auth.uid())::text) || '.%'::text)) OR (name ~~ (('founders/%_'::text || (auth.uid())::text) || '.%'::text))))) WITH CHECK (((bucket_id = 'avatars'::text) AND ((name ~~ ((auth.uid())::text || '.%'::text)) OR (name ~~ (('%_'::text || (auth.uid())::text) || '.%'::text)) OR (name ~~ (('avatars/'::text || (auth.uid())::text) || '.%'::text)) OR (name ~~ (('founders/%_'::text || (auth.uid())::text) || '.%'::text)))));

CREATE POLICY "Users can update own avatar objects" ON "storage"."objects" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((bucket_id = 'avatars'::text) AND (((auth.uid())::text = (storage.foldername(name))[2]) OR ((storage.foldername(name))[2] ~~ ('%'::text || (auth.uid())::text)) OR (name ~~ (('%'::text || (auth.uid())::text) || '.%'::text))))) WITH CHECK (((bucket_id = 'avatars'::text) AND (((auth.uid())::text = (storage.foldername(name))[2]) OR ((storage.foldername(name))[2] ~~ ('%'::text || (auth.uid())::text)) OR (name ~~ (('%'::text || (auth.uid())::text) || '.%'::text)))));

CREATE POLICY "Users can update own founder documents" ON "storage"."objects" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((bucket_id = 'profile-documents'::text) AND ((storage.foldername(name))[1] = 'founders'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));

CREATE POLICY "Users can update own investor documents" ON "storage"."objects" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((bucket_id = 'profile-documents'::text) AND ((storage.foldername(name))[1] = 'investors'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));

CREATE POLICY "Users can update own mentor documents" ON "storage"."objects" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((bucket_id = 'profile-documents'::text) AND ((storage.foldername(name))[1] = 'mentors'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));

CREATE POLICY "Users can update own profile document objects" ON "storage"."objects" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((bucket_id = 'profile-documents'::text) AND (((auth.uid())::text = (storage.foldername(name))[2]) OR ((storage.foldername(name))[2] ~~ ('%'::text || (auth.uid())::text))))) WITH CHECK (((bucket_id = 'profile-documents'::text) AND (((auth.uid())::text = (storage.foldername(name))[2]) OR ((storage.foldername(name))[2] ~~ ('%'::text || (auth.uid())::text)))));

CREATE POLICY "Users can update own profile documents" ON "storage"."objects" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((bucket_id = 'profile-documents'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));

CREATE POLICY "Users can update own profile evidence objects" ON "storage"."objects" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((bucket_id = 'profile-evidence'::text) AND ((auth.uid())::text = (storage.foldername(name))[2]))) WITH CHECK (((bucket_id = 'profile-evidence'::text) AND ((auth.uid())::text = (storage.foldername(name))[2])));

CREATE POLICY "Users can update their own avatar" ON "storage"."objects" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((bucket_id = 'avatars'::text) AND ((name ~~ (('avatars/'::text || (auth.uid())::text) || '%'::text)) OR (name ~~ (('founders/%_'::text || (auth.uid())::text) || '%'::text))))) WITH CHECK (((bucket_id = 'avatars'::text) AND ((name ~~ (('avatars/'::text || (auth.uid())::text) || '%'::text)) OR (name ~~ (('founders/%_'::text || (auth.uid())::text) || '%'::text)))));

CREATE POLICY "Users can upload own avatar" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[2])));

CREATE POLICY "Users can upload own avatar files" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((bucket_id = 'avatars'::text) AND ((name ~~ ((auth.uid())::text || '.%'::text)) OR (name ~~ (('%_'::text || (auth.uid())::text) || '.%'::text)) OR (name ~~ (('avatars/'::text || (auth.uid())::text) || '.%'::text)) OR (name ~~ (('founders/%_'::text || (auth.uid())::text) || '.%'::text)))));

CREATE POLICY "Users can upload own avatar objects" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((bucket_id = 'avatars'::text) AND (((auth.uid())::text = (storage.foldername(name))[2]) OR ((storage.foldername(name))[2] ~~ ('%'::text || (auth.uid())::text)) OR (name ~~ (('%'::text || (auth.uid())::text) || '.%'::text)))));

CREATE POLICY "Users can upload own founder documents" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((bucket_id = 'profile-documents'::text) AND ((storage.foldername(name))[1] = 'founders'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));

CREATE POLICY "Users can upload own investor documents" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((bucket_id = 'profile-documents'::text) AND ((storage.foldername(name))[1] = 'investors'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));

CREATE POLICY "Users can upload own mentor documents" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((bucket_id = 'profile-documents'::text) AND ((storage.foldername(name))[1] = 'mentors'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));

CREATE POLICY "Users can upload own profile document objects" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((bucket_id = 'profile-documents'::text) AND (((auth.uid())::text = (storage.foldername(name))[2]) OR ((storage.foldername(name))[2] ~~ ('%'::text || (auth.uid())::text)))));

CREATE POLICY "Users can upload own profile documents" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((bucket_id = 'profile-documents'::text) AND ((storage.foldername(name))[1] = ANY (ARRAY['students'::text, 'founders'::text, 'mentors'::text, 'investors'::text])) AND ((storage.foldername(name))[2] = (auth.uid())::text)));

CREATE POLICY "Users can upload own profile evidence objects" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((bucket_id = 'profile-evidence'::text) AND ((auth.uid())::text = (storage.foldername(name))[2])));

CREATE POLICY "Users can upload their own avatar" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((bucket_id = 'avatars'::text) AND ((name ~~ (('avatars/'::text || (auth.uid())::text) || '%'::text)) OR (name ~~ (('founders/%_'::text || (auth.uid())::text) || '%'::text)))));

CREATE POLICY "avatars_delete_own_folder" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

CREATE POLICY "avatars_insert_own_folder" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

CREATE POLICY "avatars_public_read" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((bucket_id = 'avatars'::text));

CREATE POLICY "avatars_update_own_folder" ON "storage"."objects" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))) WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

CREATE POLICY "trust_evidence_backend_only" ON "storage"."objects" AS RESTRICTIVE FOR ALL TO "anon", "authenticated" USING ((bucket_id <> 'trust-evidence'::text)) WITH CHECK ((bucket_id <> 'trust-evidence'::text));

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER capture_matching_request_event AFTER INSERT OR UPDATE OF status ON connection_requests FOR EACH ROW EXECUTE FUNCTION capture_matching_request_event();

CREATE TRIGGER guard_reviewed_connection_trg BEFORE INSERT OR UPDATE OF status ON connection_requests FOR EACH ROW EXECUTE FUNCTION guard_reviewed_connection();

CREATE TRIGGER update_connection_requests_updated_at BEFORE UPDATE ON connection_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER guard_reviewed_connection_trg BEFORE INSERT ON connections FOR EACH ROW EXECUTE FUNCTION guard_reviewed_connection();

CREATE TRIGGER queue_profile_review_trg AFTER INSERT OR DELETE OR UPDATE ON founder_profiles FOR EACH ROW EXECUTE FUNCTION queue_profile_review();

CREATE TRIGGER set_founder_profiles_updated_at BEFORE UPDATE ON founder_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER zz_guard_client_profile_fields BEFORE INSERT OR UPDATE ON founder_profiles FOR EACH ROW EXECUTE FUNCTION guard_client_profile_fields();

CREATE TRIGGER queue_profile_review_trg AFTER INSERT OR DELETE OR UPDATE ON investor_profiles FOR EACH ROW EXECUTE FUNCTION queue_profile_review();

CREATE TRIGGER sync_investor_profile_aliases_trg BEFORE INSERT OR UPDATE ON investor_profiles FOR EACH ROW EXECUTE FUNCTION sync_investor_profile_aliases();

CREATE TRIGGER zz_guard_client_profile_fields BEFORE INSERT OR UPDATE ON investor_profiles FOR EACH ROW EXECUTE FUNCTION guard_client_profile_fields();

CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER enforce_active_registration_role_trg BEFORE INSERT OR UPDATE OF user_type ON profiles FOR EACH ROW EXECUTE FUNCTION enforce_active_registration_role();

CREATE TRIGGER queue_profile_review_trg AFTER INSERT OR UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION queue_profile_review();

CREATE TRIGGER trigger_audit_profiles AFTER UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION log_profile_changes();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER zz_guard_client_profile_fields BEFORE INSERT OR UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION guard_client_profile_fields();

CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON student_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER queue_evidence_analysis_trg AFTER INSERT OR DELETE OR UPDATE OF review_status ON trust_evidence FOR EACH ROW EXECUTE FUNCTION queue_evidence_analysis();

CREATE TRIGGER set_updated_at_user_auth_tracking BEFORE UPDATE ON user_auth_tracking FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_user_auth_tracking_updated_at BEFORE UPDATE ON user_auth_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE EVENT TRIGGER "ensure_rls" ON ddl_command_end WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO') EXECUTE FUNCTION "public"."rls_auto_enable"();

ALTER EVENT TRIGGER "ensure_rls" ENABLE;

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."conversation_participants" ("id", "conversation_id", "user_id", "last_read_at", "created_at");

INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES ('avatars', 'avatars', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]);

INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES ('message-attachments', 'message-attachments', false, NULL, NULL);

INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES ('profile-documents', 'profile-documents', false, 15728640, ARRAY['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/webp', 'text/plain', 'text/csv', 'application/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']::text[]);

INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES ('profile-evidence', 'profile-evidence', false, 10485760, ARRAY['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/webp']::text[]);

INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES ('trust-evidence', 'trust-evidence', false, 5242880, ARRAY['application/pdf', 'image/png', 'image/jpeg']::text[]);

DO $postflight$
DECLARE v_table record; v_has_rows boolean;
BEGIN
  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r') <> 43 THEN
    RAISE EXCEPTION 'Public table count mismatch';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity) THEN
    RAISE EXCEPTION 'Public table without RLS';
  END IF;
  IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.prokind='f') <> 23 THEN
    RAISE EXCEPTION 'Public function count mismatch';
  END IF;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname IN ('public','storage')) <> 117 THEN
    RAISE EXCEPTION 'Policy count mismatch';
  END IF;
  IF (SELECT count(*) FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid
      JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND NOT t.tgisinternal) <> 21 THEN
    RAISE EXCEPTION 'Application trigger count mismatch';
  END IF;
  IF (SELECT count(*) FROM storage.buckets) <> 5
     OR EXISTS (SELECT 1 FROM storage.buckets WHERE public) THEN
    RAISE EXCEPTION 'Private bucket configuration mismatch';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger
                 WHERE tgrelid='auth.users'::regclass
                   AND tgname='on_auth_user_created'
                   AND tgenabled='O' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Signup trigger missing or not origin-enabled';
  END IF;
  FOR v_table IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I)',v_table.tablename) INTO v_has_rows;
    IF v_has_rows THEN RAISE EXCEPTION 'Unexpected application data'; END IF;
  END LOOP;
END
$postflight$;

ROLLBACK;

VALUES ('BASELINE_REHEARSAL_PASS_ROLLED_BACK');
