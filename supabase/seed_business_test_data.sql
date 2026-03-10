-- =====================================================
-- LUSTRE: Business Tier Test Data Seed Script
-- =====================================================
-- Creates a fully populated test organisation on the Business plan:
--
--   Organisation: "Sparkle Pro Cleaning Co"  (plan = 'business')
--   Admin user:   admin@sparklepro.test       / TestPassword123!
--   Team member:  team@sparklepro.test        / TestPassword123!
--
--   8 clients  (mix of active / lead / inactive)
--   16 properties  (2 per client)
--   12 jobs  (scheduled, completed, cancelled)
--   4 quotes  (draft, sent, accepted, declined)
--   Activities, follow-ups, audit log entries
--
-- NOTE: Org-level triggers will auto-create:
--   • Default roles  (Admin, Team Member)
--   • Default pipeline stages  (Lead → Won/Lost)
--   • Default job types  (Regular Clean, Deep Clean, …)
--
-- Run with:  psql $DATABASE_URL -f seed_business_test_data.sql
-- Or paste into the Supabase SQL editor.
-- =====================================================

BEGIN;

-- ── Fix CHECK constraints ─────────────────────────────────────────────────────
-- Drop and recreate any constraints that may be missing values added post-setup.
-- Application code enforces valid values; DB constraints are belt-and-braces.

ALTER TABLE public.organisations
  DROP CONSTRAINT IF EXISTS organisations_plan_check;
ALTER TABLE public.organisations
  ADD CONSTRAINT organisations_plan_check
  CHECK (plan IN ('free', 'starter', 'professional', 'business', 'enterprise'));

-- property_type: drop so any string value is accepted (app enforces via select).
ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_property_type_check;

-- activities type: drop so pipeline_stage_changed / pipeline_won / pipeline_lost
-- are accepted (these were added after the initial constraint was created).
ALTER TABLE public.activities
  DROP CONSTRAINT IF EXISTS activities_type_check;
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  -- ── Fixed UUIDs (predictable & re-runnable) ─────────────────────────────
  v_org_id        uuid := 'b1000000-0000-0000-0000-000000000001';
  v_admin_id      uuid := 'b1000000-0000-0000-0000-000000000002';
  v_member_id     uuid := 'b1000000-0000-0000-0000-000000000003';

  -- Clients
  v_c1  uuid := 'b1000000-0000-0000-0001-000000000001';
  v_c2  uuid := 'b1000000-0000-0000-0001-000000000002';
  v_c3  uuid := 'b1000000-0000-0000-0001-000000000003';
  v_c4  uuid := 'b1000000-0000-0000-0001-000000000004';
  v_c5  uuid := 'b1000000-0000-0000-0001-000000000005';
  v_c6  uuid := 'b1000000-0000-0000-0001-000000000006';
  v_c7  uuid := 'b1000000-0000-0000-0001-000000000007';
  v_c8  uuid := 'b1000000-0000-0000-0001-000000000008';

  -- Properties (2 per client)
  v_p1a uuid := 'b1000000-0000-0000-0002-000000000001';
  v_p1b uuid := 'b1000000-0000-0000-0002-000000000002';
  v_p2a uuid := 'b1000000-0000-0000-0002-000000000003';
  v_p2b uuid := 'b1000000-0000-0000-0002-000000000004';
  v_p3a uuid := 'b1000000-0000-0000-0002-000000000005';
  v_p3b uuid := 'b1000000-0000-0000-0002-000000000006';
  v_p4a uuid := 'b1000000-0000-0000-0002-000000000007';
  v_p4b uuid := 'b1000000-0000-0000-0002-000000000008';
  v_p5a uuid := 'b1000000-0000-0000-0002-000000000009';
  v_p5b uuid := 'b1000000-0000-0000-0002-000000000010';
  v_p6a uuid := 'b1000000-0000-0000-0002-000000000011';
  v_p6b uuid := 'b1000000-0000-0000-0002-000000000012';
  v_p7a uuid := 'b1000000-0000-0000-0002-000000000013';
  v_p7b uuid := 'b1000000-0000-0000-0002-000000000014';
  v_p8a uuid := 'b1000000-0000-0000-0002-000000000015';
  v_p8b uuid := 'b1000000-0000-0000-0002-000000000016';

  -- Jobs
  v_j1  uuid := 'b1000000-0000-0000-0003-000000000001';
  v_j2  uuid := 'b1000000-0000-0000-0003-000000000002';
  v_j3  uuid := 'b1000000-0000-0000-0003-000000000003';
  v_j4  uuid := 'b1000000-0000-0000-0003-000000000004';
  v_j5  uuid := 'b1000000-0000-0000-0003-000000000005';
  v_j6  uuid := 'b1000000-0000-0000-0003-000000000006';
  v_j7  uuid := 'b1000000-0000-0000-0003-000000000007';
  v_j8  uuid := 'b1000000-0000-0000-0003-000000000008';
  v_j9  uuid := 'b1000000-0000-0000-0003-000000000009';
  v_j10 uuid := 'b1000000-0000-0000-0003-000000000010';
  v_j11 uuid := 'b1000000-0000-0000-0003-000000000011';
  v_j12 uuid := 'b1000000-0000-0000-0003-000000000012';

  -- Quotes
  v_q1  uuid := 'b1000000-0000-0000-0004-000000000001';
  v_q2  uuid := 'b1000000-0000-0000-0004-000000000002';
  v_q3  uuid := 'b1000000-0000-0000-0004-000000000003';
  v_q4  uuid := 'b1000000-0000-0000-0004-000000000004';

  -- Resolved after org insert (from triggers)
  v_role_admin_id  uuid;
  v_role_member_id uuid;
  v_stage_lead     uuid;
  v_stage_qual     uuid;
  v_stage_proposal uuid;
  v_stage_won      uuid;
  v_stage_lost     uuid;
  v_jt_regular     uuid;
  v_jt_deep        uuid;
  v_jt_movein      uuid;
  v_jt_moveout     uuid;

BEGIN

  -- ══════════════════════════════════════════════════════════════════════════
  -- CLEAN UP previous run (safe to re-run)
  -- Delete by ID first so we catch profiles regardless of their org assignment
  -- (a handle_new_user trigger may have created them with a different org_id).
  -- ══════════════════════════════════════════════════════════════════════════
  DELETE FROM public.profiles      WHERE id IN (v_admin_id, v_member_id);
  DELETE FROM public.organisations WHERE id = v_org_id;
  DELETE FROM auth.users           WHERE id IN (v_admin_id, v_member_id);

  -- ══════════════════════════════════════════════════════════════════════════
  -- 1. AUTH USERS
  -- The handle_new_user trigger may auto-create a bare profile row here.
  -- We purge those immediately afterwards so our explicit insert is clean.
  -- ══════════════════════════════════════════════════════════════════════════
  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password,
    email_confirmed_at, confirmed_at,   -- both required for GoTrue to allow login
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change_token_new, recovery_token  -- must be '' not NULL
  ) VALUES
    (
      v_admin_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'admin@sparklepro.test',
      crypt('TestPassword123!', gen_salt('bf')),
      now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Sarah Mitchell"}',
      now(), now(),
      '', '', ''
    ),
    (
      v_member_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'team@sparklepro.test',
      crypt('TestPassword123!', gen_salt('bf')),
      now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"James Kowalski"}',
      now(), now(),
      '', '', ''
    );

  -- Purge any profiles auto-created by handle_new_user before we insert the org.
  DELETE FROM public.profiles WHERE id IN (v_admin_id, v_member_id);

  -- ══════════════════════════════════════════════════════════════════════════
  -- 2. ORGANISATION  (triggers auto-create roles, pipeline stages, job types)
  -- ══════════════════════════════════════════════════════════════════════════
  INSERT INTO public.organisations (
    id, name, email, phone,
    address_line1, address_line2, town, postcode,
    website, slug, plan, subscription_status,
    stripe_customer_id, stripe_subscription_id,
    subscription_current_period_end,
    onboarding_step, onboarding_completed_at,
    created_at
  ) VALUES (
    v_org_id,
    'Sparkle Pro Cleaning Co',
    'admin@sparklepro.test',
    '07700 900123',
    '14 Bright Street', 'City Centre',
    'Manchester', 'M1 1AB',
    'https://sparklepro.test',
    'sparkle-pro-cleaning-co',
    'business', 'active',
    'cus_test_business_001',
    'sub_test_business_001',
    now() + interval '1 year',
    5, now() - interval '30 days',
    now() - interval '60 days'
  );

  -- ── Resolve IDs created by triggers ──────────────────────────────────────
  SELECT id INTO v_role_admin_id  FROM public.roles WHERE organisation_id = v_org_id AND name = 'Admin';
  SELECT id INTO v_role_member_id FROM public.roles WHERE organisation_id = v_org_id AND name = 'Team Member';

  SELECT id INTO v_stage_lead     FROM public.pipeline_stages WHERE organisation_id = v_org_id AND name = 'Lead';
  SELECT id INTO v_stage_qual     FROM public.pipeline_stages WHERE organisation_id = v_org_id AND name = 'Qualified';
  SELECT id INTO v_stage_proposal FROM public.pipeline_stages WHERE organisation_id = v_org_id AND name = 'Proposal Sent';
  SELECT id INTO v_stage_won      FROM public.pipeline_stages WHERE organisation_id = v_org_id AND is_won = true;
  SELECT id INTO v_stage_lost     FROM public.pipeline_stages WHERE organisation_id = v_org_id AND is_lost = true;

  SELECT id INTO v_jt_regular FROM public.job_types WHERE organisation_id = v_org_id AND name = 'Regular Clean';
  SELECT id INTO v_jt_deep    FROM public.job_types WHERE organisation_id = v_org_id AND name = 'Deep Clean';
  SELECT id INTO v_jt_movein  FROM public.job_types WHERE organisation_id = v_org_id AND name = 'Move In';
  SELECT id INTO v_jt_moveout FROM public.job_types WHERE organisation_id = v_org_id AND name = 'Move Out';

  -- ══════════════════════════════════════════════════════════════════════════
  -- 3. PROFILES  (trigger assign_system_role_to_profile sets custom_role_id)
  -- ══════════════════════════════════════════════════════════════════════════
  INSERT INTO public.profiles (id, organisation_id, full_name, email, phone, role, custom_role_id)
  VALUES
    (v_admin_id,  v_org_id, 'Sarah Mitchell', 'admin@sparklepro.test', '07700 900123', 'admin',       v_role_admin_id),
    (v_member_id, v_org_id, 'James Kowalski', 'team@sparklepro.test',  '07700 900456', 'team_member', v_role_member_id);

  -- ══════════════════════════════════════════════════════════════════════════
  -- 4. CLIENTS
  -- ══════════════════════════════════════════════════════════════════════════
  INSERT INTO public.clients (
    id, organisation_id,
    first_name, last_name, email, phone, secondary_phone,
    status, source, notes,
    pipeline_stage_id, pipeline_assigned_to, estimated_monthly_value,
    pipeline_notes, pipeline_entered_at,
    won_at, created_at
  ) VALUES
    -- Active long-term clients
    (
      v_c1, v_org_id,
      'Emily', 'Hartley', 'emily.hartley@email.test', '07711 100001', NULL,
      'active', 'referral',
      'Long-term client. Prefers eco-friendly products. Has two dogs.',
      v_stage_won, v_admin_id, 280.00,
      'Ongoing monthly contract.', now() - interval '18 months',
      now() - interval '17 months', now() - interval '18 months'
    ),
    (
      v_c2, v_org_id,
      'Robert', 'Nguyen', 'rob.nguyen@email.test', '07711 100002', '07711 100099',
      'active', 'website',
      'Runs a short-let property. Needs fast turnaround cleans.',
      v_stage_won, v_member_id, 650.00,
      'Airbnb turnaround specialist - high value.', now() - interval '12 months',
      now() - interval '11 months', now() - interval '12 months'
    ),
    (
      v_c3, v_org_id,
      'Charlotte', 'Osei', 'c.osei@email.test', '07711 100003', NULL,
      'active', 'google',
      'Requested monthly deep cleans. Very particular about bathroom tiles.',
      v_stage_won, v_admin_id, 180.00,
      NULL, now() - interval '8 months',
      now() - interval '7 months', now() - interval '8 months'
    ),
    (
      v_c4, v_org_id,
      'Tom', 'Birchall', 'tom.birchall@email.test', '07711 100004', NULL,
      'active', 'social_media',
      'New family home. Bi-weekly cleans. Has a cat (hypoallergenic products needed).',
      v_stage_won, v_member_id, 220.00,
      NULL, now() - interval '5 months',
      now() - interval '4 months', now() - interval '5 months'
    ),

    -- Leads in pipeline
    (
      v_c5, v_org_id,
      'Priya', 'Sharma', 'priya.sharma@email.test', '07711 100005', NULL,
      'lead', 'referral',
      'Interested in move-in clean for new flat. Viewing on 15th.',
      v_stage_proposal, v_admin_id, 120.00,
      'Quote sent. Awaiting response.', now() - interval '10 days',
      NULL, now() - interval '10 days'
    ),
    (
      v_c6, v_org_id,
      'Marcus', 'Webb', 'm.webb@email.test', '07711 100006', NULL,
      'lead', 'cold_call',
      'Office manager for small law firm. Wants weekly office clean.',
      v_stage_qual, v_admin_id, 400.00,
      'Had initial call. Sending proposal this week.', now() - interval '5 days',
      NULL, now() - interval '5 days'
    ),
    (
      v_c7, v_org_id,
      'Fiona', 'McAllister', 'fiona.m@email.test', '07711 100007', NULL,
      'lead', 'website',
      'Enquired about end-of-tenancy clean.',
      v_stage_lead, v_member_id, 95.00,
      'New enquiry, needs follow-up call.', now() - interval '2 days',
      NULL, now() - interval '2 days'
    ),

    -- Inactive (churned)
    (
      v_c8, v_org_id,
      'Derek', 'Flanagan', 'd.flanagan@email.test', '07711 100008', NULL,
      'inactive', 'referral',
      'Cancelled after moving house.',
      v_stage_lost, v_admin_id, NULL,
      'Client relocated outside service area.', now() - interval '4 months',
      NULL, now() - interval '4 months'
    );

  -- ══════════════════════════════════════════════════════════════════════════
  -- 5. PROPERTIES  (2 per client)
  -- ══════════════════════════════════════════════════════════════════════════
  INSERT INTO public.properties (
    id, organisation_id, client_id,
    address_line1, address_line2, town, postcode,
    property_type, bedrooms, bathrooms,
    access_instructions, parking_instructions, alarm_instructions,
    key_held, specialist_surfaces, pets,
    created_at
  ) VALUES
    -- Emily Hartley  (semi-detached → house, flat stays flat)
    (v_p1a, v_org_id, v_c1, '4 Elm Grove', NULL,           'Manchester', 'M20 2AA', 'house',  3, 2, 'Key under the blue plant pot at side gate.', 'Street parking on Elm Grove.', NULL, true,  NULL,             'Two golden retrievers (friendly).',  now() - interval '18 months'),
    (v_p1b, v_org_id, v_c1, '8 Oak Mews',  'Didsbury',      'Manchester', 'M20 6BB', 'flat',  2, 1, 'Key fob in envelope under welcome mat.', 'Resident permit bay, speak to Emily.', NULL, true, NULL,             NULL,                                 now() - interval '6 months'),

    -- Robert Nguyen  (apartment → flat, studio → flat)
    (v_p2a, v_org_id, v_c2, '12 Canal St', 'Apt 3A',        'Manchester', 'M1 3XZ',  'flat',  1, 1, 'Key safe code: 4829. Door faces the canal.', 'Loading bay for 30 min, ring Robert.', NULL, true, 'Marble worktops - no bleach.', NULL,                                 now() - interval '12 months'),
    (v_p2b, v_org_id, v_c2, '7 Piccadilly', 'Studio 12',    'Manchester', 'M1 1ER',  'flat',  1, 1, 'Buzz unit 12 on the intercom.', 'No parking - NCP 5 mins away.', NULL, false, NULL,            NULL,                                 now() - interval '10 months'),

    -- Charlotte Osei  (terraced → house)
    (v_p3a, v_org_id, v_c3, '22 Beech Road', NULL,          'Stockport',  'SK2 5TT', 'house', 3, 1, 'Key with next door neighbour (Mrs Patel, No.24).', 'Park on Beech Road, no restrictions.', 'Alarm code: 1234 (beeps 30 sec).', false, 'Slate bathroom tiles.', NULL,   now() - interval '8 months'),
    (v_p3b, v_org_id, v_c3, '1 Rose Court', 'Flat B',       'Stockport',  'SK2 1AB', 'flat',  2, 1, 'Collect key from Charlotte at first visit.', 'Visitor bay at front.', NULL, true, NULL,             NULL,                                 now() - interval '3 months'),

    -- Tom Birchall  (detached → house, terraced → house)
    (v_p4a, v_org_id, v_c4, '56 Maple Drive', NULL,         'Sale',       'M33 4PP', 'house', 4, 2, 'Keysafe by front door - code: 7712.', 'Large driveway.', 'Alarm off before 8 am (neighbours). Code: 9988.', true, NULL, 'One indoor cat (Whiskers).',          now() - interval '5 months'),
    (v_p4b, v_org_id, v_c4, '3 Birch Lane', NULL,           'Sale',       'M33 6QQ', 'house', 2, 1, 'Tom will be present most visits.', 'On-street.', NULL, false, NULL,            NULL,                                 now() - interval '2 months'),

    -- Priya Sharma (lead)  (apartment → flat, terraced → house)
    (v_p5a, v_org_id, v_c5, '9 The Quays',  'Flat 14',      'Salford',    'M50 3TQ', 'flat',  2, 1, 'Contact Priya for access.', 'Underground car park, visitor space B3.', NULL, false, NULL,            NULL,                                 now() - interval '10 days'),
    (v_p5b, v_org_id, v_c5, '200 Regent Road', NULL,        'Salford',    'M5 4AB',  'house', 3, 1, 'Key with agent until completion.', 'On-street.', NULL, false, NULL,            NULL,                                 now() - interval '8 days'),

    -- Marcus Webb (lead)  (office → other, other stays other)
    (v_p6a, v_org_id, v_c6, '45 King St',   '3rd Floor',    'Manchester', 'M2 7ER',  'other', NULL, 2, 'Reception open from 7 am. Sign in with security.', 'NCP on Deansgate.', NULL, false, NULL,            NULL,                                 now() - interval '5 days'),
    (v_p6b, v_org_id, v_c6, '45 King St',   'Basement Gym', 'Manchester', 'M2 7ER',  'other', NULL, 1, 'Same building - access via stairwell B.', 'NCP on Deansgate.', NULL, false, NULL,            NULL,                                 now() - interval '5 days'),

    -- Fiona McAllister (lead)  (terraced → house)
    (v_p7a, v_org_id, v_c7, '33 Victoria Rd', NULL,         'Altrincham', 'WA14 2QS','house', 2, 1, 'Tenants still in situ - liaise with Fiona.', 'On-street.', NULL, false, NULL,            NULL,                                 now() - interval '2 days'),
    (v_p7b, v_org_id, v_c7, '10 Market St',   'Flat 2',     'Altrincham', 'WA14 1AB','flat',  1, 1, 'Will be vacant on clean day.', 'Visitor bay at rear.', NULL, false, NULL,            NULL,                                 now() - interval '1 day'),

    -- Derek Flanagan (inactive)  (semi-detached → house, terraced → house)
    (v_p8a, v_org_id, v_c8, '18 Willow Way', NULL,          'Bury',       'BL9 7TT', 'house', 3, 1, 'N/A - client no longer active.', NULL, NULL, false, NULL,            NULL,                                 now() - interval '4 months'),
    (v_p8b, v_org_id, v_c8, '2 Fern Close',  NULL,          'Bury',       'BL9 3JJ', 'house', 2, 1, 'N/A - client no longer active.', NULL, NULL, false, NULL,            NULL,                                 now() - interval '4 months');

  -- ══════════════════════════════════════════════════════════════════════════
  -- 6. JOBS
  -- ══════════════════════════════════════════════════════════════════════════
  INSERT INTO public.jobs (
    id, organisation_id, client_id, property_id,
    assigned_to, job_type_id, service_type,
    status, scheduled_date, scheduled_time,
    duration_hours, price, notes, internal_notes,
    completed_at, created_at
  ) VALUES
    -- Completed jobs (historical)
    (v_j1,  v_org_id, v_c1, v_p1a, v_member_id, v_jt_regular, 'regular',    'completed', current_date - 30, '09:00', 3.0, 90.00,  NULL, NULL, now() - interval '30 days', now() - interval '31 days'),
    (v_j2,  v_org_id, v_c1, v_p1a, v_member_id, v_jt_regular, 'regular',    'completed', current_date - 16, '09:00', 3.0, 90.00,  NULL, NULL, now() - interval '16 days', now() - interval '17 days'),
    (v_j3,  v_org_id, v_c2, v_p2a, v_member_id, v_jt_regular, 'regular',    'completed', current_date - 7,  '10:00', 2.0, 120.00, 'Airbnb changeover. New guests arriving 3 pm.', NULL, now() - interval '7 days',  now() - interval '8 days'),
    (v_j4,  v_org_id, v_c3, v_p3a, v_admin_id,  v_jt_deep,    'deep_clean', 'completed', current_date - 14, '08:00', 5.0, 185.00, 'Full deep clean incl. oven and fridge.', 'Bring extra oven cleaner.', now() - interval '14 days', now() - interval '15 days'),
    (v_j5,  v_org_id, v_c4, v_p4a, v_member_id, v_jt_regular, 'regular',    'completed', current_date - 3,  '09:30', 3.5, 105.00, NULL, NULL, now() - interval '3 days',  now() - interval '4 days'),
    (v_j6,  v_org_id, v_c8, v_p8a, v_admin_id,  v_jt_moveout, 'move_out',   'completed', current_date - 60, '08:00', 6.0, 220.00, 'End of tenancy clean.', NULL, now() - interval '60 days', now() - interval '61 days'),

    -- Scheduled (upcoming)
    (v_j7,  v_org_id, v_c1, v_p1a, v_member_id, v_jt_regular, 'regular',    'scheduled', current_date + 2,  '09:00', 3.0, 90.00,  NULL, NULL, NULL, now()),
    (v_j8,  v_org_id, v_c2, v_p2a, v_member_id, v_jt_regular, 'regular',    'scheduled', current_date + 5,  '10:00', 2.0, 120.00, 'Airbnb changeover. Guests check out 11 am.', NULL, NULL, now()),
    (v_j9,  v_org_id, v_c3, v_p3b, v_admin_id,  v_jt_regular, 'regular',    'scheduled', current_date + 7,  '09:00', 2.5, 90.00,  NULL, NULL, NULL, now()),
    (v_j10, v_org_id, v_c4, v_p4a, v_member_id, v_jt_regular, 'regular',    'scheduled', current_date + 10, '09:30', 3.5, 105.00, NULL, NULL, NULL, now()),
    (v_j11, v_org_id, v_c5, v_p5b, v_admin_id,  v_jt_movein,  'move_in',    'scheduled', current_date + 14, '08:00', 5.0, 160.00, 'Move-in clean once keys are handed over.', NULL, NULL, now()),

    -- Cancelled
    (v_j12, v_org_id, v_c4, v_p4b, v_member_id, v_jt_regular, 'regular',    'cancelled', current_date - 5,  '14:00', 2.0, 60.00,  NULL, 'Client cancelled same day - illness.', NULL, now() - interval '5 days');

  -- ══════════════════════════════════════════════════════════════════════════
  -- 7. QUOTES
  -- ══════════════════════════════════════════════════════════════════════════
  INSERT INTO public.quotes (
    id, organisation_id, client_id, property_id, job_id,
    created_by, quote_number, title,
    status, pricing_type, fixed_price,
    subtotal, tax_rate, tax_amount, total,
    notes, valid_until, accept_token,
    sent_at, viewed_at, responded_at,
    created_at, updated_at
  ) VALUES
    -- Accepted (linked to the completed deep clean)
    (
      v_q1, v_org_id, v_c3, v_p3a, v_j4,
      v_admin_id, 'Q-2025-001', 'Deep Clean - Beech Road',
      'accepted', 'fixed', 185.00,
      185.00, 0.20, 37.00, 222.00,
      'Includes oven, fridge, and full bathroom scrub.',
      current_date - 10,
      encode(gen_random_bytes(32), 'hex'),
      now() - interval '20 days',
      now() - interval '19 days',
      now() - interval '18 days',
      now() - interval '21 days',
      now() - interval '18 days'
    ),
    -- Sent (awaiting response from Priya)
    (
      v_q2, v_org_id, v_c5, v_p5b, NULL,
      v_admin_id, 'Q-2025-002', 'Move-In Clean - Regent Road',
      'sent', 'fixed', 160.00,
      160.00, 0.20, 32.00, 192.00,
      'Full move-in clean prior to occupancy. Includes inside of all cupboards.',
      current_date + 7,
      encode(gen_random_bytes(32), 'hex'),
      now() - interval '8 days',
      NULL, NULL,
      now() - interval '9 days',
      now() - interval '8 days'
    ),
    -- Draft (being prepared for Marcus)
    (
      v_q3, v_org_id, v_c6, v_p6a, NULL,
      v_admin_id, 'Q-2025-003', 'Weekly Office Clean - King St',
      'draft', 'fixed', 380.00,
      380.00, 0.20, 76.00, 456.00,
      'Weekly Monday morning clean. 3rd floor offices + basement gym.',
      current_date + 14,
      encode(gen_random_bytes(32), 'hex'),
      NULL, NULL, NULL,
      now() - interval '2 days',
      now() - interval '1 day'
    ),
    -- Declined
    (
      v_q4, v_org_id, v_c8, v_p8a, NULL,
      v_admin_id, 'Q-2025-004', 'End of Tenancy - Willow Way',
      'declined', 'fixed', 220.00,
      220.00, 0.20, 44.00, 264.00,
      NULL,
      current_date - 50,
      encode(gen_random_bytes(32), 'hex'),
      now() - interval '65 days',
      now() - interval '64 days',
      now() - interval '63 days',
      now() - interval '66 days',
      now() - interval '63 days'
    );

  -- ══════════════════════════════════════════════════════════════════════════
  -- 8. QUOTE LINE ITEMS
  -- ══════════════════════════════════════════════════════════════════════════
  INSERT INTO public.quote_line_items (
    id, organisation_id, quote_id,
    description, quantity, unit_price, amount,
    is_addon, sort_order, created_at
  ) VALUES
    -- Q1 (deep clean - accepted)
    (gen_random_uuid(), v_org_id, v_q1, 'Full deep clean (5 hrs)',    1, 150.00, 150.00, false, 1, now() - interval '21 days'),
    (gen_random_uuid(), v_org_id, v_q1, 'Oven cleaning',              1,  25.00,  25.00, true,  2, now() - interval '21 days'),
    (gen_random_uuid(), v_org_id, v_q1, 'Fridge/freezer interior',   1,  10.00,  10.00, true,  3, now() - interval '21 days'),
    -- Q2 (move-in - sent)
    (gen_random_uuid(), v_org_id, v_q2, 'Move-in clean (5 hrs)',      1, 130.00, 130.00, false, 1, now() - interval '9 days'),
    (gen_random_uuid(), v_org_id, v_q2, 'Inside cupboards & drawers', 1,  30.00,  30.00, true,  2, now() - interval '9 days'),
    -- Q3 (office - draft)
    (gen_random_uuid(), v_org_id, v_q3, 'Weekly office clean (4 hrs)', 1, 280.00, 280.00, false, 1, now() - interval '2 days'),
    (gen_random_uuid(), v_org_id, v_q3, 'Basement gym clean',          1, 100.00, 100.00, true,  2, now() - interval '2 days'),
    -- Q4 (end of tenancy - declined)
    (gen_random_uuid(), v_org_id, v_q4, 'End of tenancy clean (6 hrs)', 1, 180.00, 180.00, false, 1, now() - interval '66 days'),
    (gen_random_uuid(), v_org_id, v_q4, 'Carpet steam clean',           1,  40.00,  40.00, true,  2, now() - interval '66 days');

  -- ══════════════════════════════════════════════════════════════════════════
  -- 9. ACTIVITIES
  -- ══════════════════════════════════════════════════════════════════════════
  INSERT INTO public.activities (
    id, organisation_id, client_id, job_id,
    created_by, type, title, body, pinned, created_at
  ) VALUES
    -- Emily Hartley
    (gen_random_uuid(), v_org_id, v_c1, v_j1, v_member_id, 'job_completed',     'Job completed',           'Regular clean at Elm Grove. All good - dogs were in the garden.', false, now() - interval '30 days'),
    (gen_random_uuid(), v_org_id, v_c1, NULL, v_admin_id,  'note',              'Called to confirm',       'Emily confirmed she is happy with the service. Mentioned she may need an extra clean before Christmas.', false, now() - interval '25 days'),
    (gen_random_uuid(), v_org_id, v_c1, v_j2, v_member_id, 'job_completed',     'Job completed',           'Regular clean. Noted some mildew around bath seal - informed client.', false, now() - interval '16 days'),

    -- Robert Nguyen
    (gen_random_uuid(), v_org_id, v_c2, v_j3, v_member_id, 'job_completed',     'Airbnb changeover done', 'Quick turnaround. Left fresh towels as requested.', false, now() - interval '7 days'),
    (gen_random_uuid(), v_org_id, v_c2, NULL, v_admin_id,  'review_requested',  'Review request sent',     'Sent Google review request via WhatsApp.', false, now() - interval '6 days'),

    -- Charlotte Osei
    (gen_random_uuid(), v_org_id, v_c3, v_j4, v_admin_id,  'job_completed',     'Deep clean completed',   'Full deep clean done. Oven and fridge spotless. Client very happy.', true, now() - interval '14 days'),
    (gen_random_uuid(), v_org_id, v_c3, NULL, v_admin_id,  'quote_accepted',    'Quote accepted',         'Q-2025-001 accepted by Charlotte.', false, now() - interval '18 days'),

    -- Priya Sharma (lead)
    (gen_random_uuid(), v_org_id, v_c5, NULL, v_admin_id,  'call',              'Initial enquiry call',   'Spoke with Priya about move-in clean for Regent Rd. Flat vacant from 24th. Sending quote.', false, now() - interval '9 days'),
    (gen_random_uuid(), v_org_id, v_c5, NULL, v_admin_id,  'quote_sent',        'Quote sent',             'Q-2025-002 sent to priya.sharma@email.test', false, now() - interval '8 days'),
    (gen_random_uuid(), v_org_id, v_c5, NULL, v_admin_id,  'follow_up',         'Follow up due',          'Priya has not responded to quote yet. Chase by end of week.', false, now() - interval '4 days'),

    -- Marcus Webb (lead)
    (gen_random_uuid(), v_org_id, v_c6, NULL, v_admin_id,  'call',              'Qualification call',     'Spoke with Marcus at Webb & Partners. Needs weekly Monday 7-11 am office clean + gym monthly. High value opportunity.', false, now() - interval '5 days'),
    (gen_random_uuid(), v_org_id, v_c6, NULL, v_admin_id,  'pipeline_stage_changed', 'Moved to Qualified', NULL, false, now() - interval '4 days'),

    -- Fiona McAllister (lead)
    (gen_random_uuid(), v_org_id, v_c7, NULL, v_member_id, 'email',             'Enquiry received',       'Fiona submitted enquiry form for end-of-tenancy at Victoria Rd. Needs responding.', false, now() - interval '2 days'),

    -- Derek Flanagan (inactive / lost)
    (gen_random_uuid(), v_org_id, v_c8, v_j6, v_admin_id,  'job_completed',     'Final job completed',    'End of tenancy clean done to a high standard. Client leaving the area.', false, now() - interval '60 days'),
    (gen_random_uuid(), v_org_id, v_c8, NULL, v_admin_id,  'pipeline_lost',     'Client lost',            'Derek has moved to Yorkshire. Closed as lost.', false, now() - interval '58 days');

  -- ══════════════════════════════════════════════════════════════════════════
  -- 10. FOLLOW-UPS
  -- ══════════════════════════════════════════════════════════════════════════
  INSERT INTO public.follow_ups (
    id, organisation_id, client_id,
    created_by, assigned_to,
    title, notes, due_date,
    priority, status, created_at
  ) VALUES
    (gen_random_uuid(), v_org_id, v_c5, v_admin_id, v_admin_id,
     'Chase quote Q-2025-002', 'Priya has not responded. Call or WhatsApp to chase.',
     current_date + 1, 'high', 'open', now() - interval '4 days'),

    (gen_random_uuid(), v_org_id, v_c6, v_admin_id, v_admin_id,
     'Send office clean proposal to Marcus Webb', 'Draft Q-2025-003 is ready. Review and send.',
     current_date, 'urgent', 'open', now() - interval '1 day'),

    (gen_random_uuid(), v_org_id, v_c7, v_member_id, v_admin_id,
     'Call Fiona McAllister re: end of tenancy', 'Respond to website enquiry. Check availability for her move-out date.',
     current_date + 1, 'normal', 'open', now() - interval '2 days'),

    (gen_random_uuid(), v_org_id, v_c1, v_admin_id, v_admin_id,
     'Ask Emily about pre-Christmas extra clean', 'She mentioned needing an extra session before the holidays.',
     current_date + 30, 'low', 'open', now() - interval '25 days'),

    (gen_random_uuid(), v_org_id, v_c2, v_admin_id, v_member_id,
     'Confirm next Airbnb changeover slot with Robert', NULL,
     current_date + 3, 'normal', 'open', now() - interval '6 days');

  -- ══════════════════════════════════════════════════════════════════════════
  -- 11. AUDIT LOG ENTRIES (Business-tier feature)
  -- ══════════════════════════════════════════════════════════════════════════
  INSERT INTO public.audit_logs (
    id, organisation_id, actor_id,
    action, resource_type, resource_id,
    metadata, created_at
  ) VALUES
    (gen_random_uuid(), v_org_id, v_admin_id,
     'create_client', 'client', v_c1,
     '{"client_name":"Emily Hartley"}', now() - interval '18 months'),

    (gen_random_uuid(), v_org_id, v_admin_id,
     'update_vat_settings', 'organisation', v_org_id,
     '{"tax_rate":0.20}', now() - interval '30 days'),

    (gen_random_uuid(), v_org_id, v_admin_id,
     'delete_job', 'job', NULL,
     '{"job_id":"deleted-test","reason":"duplicate entry"}', now() - interval '10 days'),

    (gen_random_uuid(), v_org_id, v_member_id,
     'update_job_status', 'job', v_j5,
     '{"old_status":"scheduled","new_status":"completed"}', now() - interval '3 days'),

    (gen_random_uuid(), v_org_id, v_admin_id,
     'send_quote', 'quote', v_q2,
     '{"quote_number":"Q-2025-002","recipient":"priya.sharma@email.test"}', now() - interval '8 days');

END $$;

COMMIT;

-- ══════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  RAISE NOTICE '=== Business Test Data Verification ===';
  RAISE NOTICE 'Organisation: %', (SELECT name || ' (plan=' || plan || ', status=' || subscription_status || ')' FROM public.organisations WHERE id = 'b1000000-0000-0000-0000-000000000001');
  RAISE NOTICE 'Profiles:     %', (SELECT count(*) FROM public.profiles      WHERE organisation_id = 'b1000000-0000-0000-0000-000000000001');
  RAISE NOTICE 'Clients:      %', (SELECT count(*) FROM public.clients        WHERE organisation_id = 'b1000000-0000-0000-0000-000000000001');
  RAISE NOTICE 'Properties:   %', (SELECT count(*) FROM public.properties     WHERE organisation_id = 'b1000000-0000-0000-0000-000000000001');
  RAISE NOTICE 'Jobs:         %', (SELECT count(*) FROM public.jobs           WHERE organisation_id = 'b1000000-0000-0000-0000-000000000001');
  RAISE NOTICE 'Quotes:       %', (SELECT count(*) FROM public.quotes         WHERE organisation_id = 'b1000000-0000-0000-0000-000000000001');
  RAISE NOTICE 'Activities:   %', (SELECT count(*) FROM public.activities     WHERE organisation_id = 'b1000000-0000-0000-0000-000000000001');
  RAISE NOTICE 'Follow-ups:   %', (SELECT count(*) FROM public.follow_ups     WHERE organisation_id = 'b1000000-0000-0000-0000-000000000001');
  RAISE NOTICE 'Audit logs:   %', (SELECT count(*) FROM public.audit_logs     WHERE organisation_id = 'b1000000-0000-0000-0000-000000000001');
  RAISE NOTICE '=======================================';
  RAISE NOTICE 'Login → admin@sparklepro.test / TestPassword123!';
  RAISE NOTICE 'Login → team@sparklepro.test  / TestPassword123!';
END $$;
