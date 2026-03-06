-- =============================================================================
-- LUSTRE Migration: Custom operator email sending domain
-- =============================================================================
-- Adds four nullable columns to organisations that together represent the
-- lifecycle of a custom sending domain:
--
--   resend_domain_id    — Resend's domain ID once created via their API
--   email_domain_name   — the bare domain, e.g. "abbeywindows.co.uk"
--   email_domain_status — 'pending' while awaiting DNS verification,
--                         'verified' once Resend confirms the records
--   custom_from_email   — the full "from" address to use once verified,
--                         e.g. "quotes@abbeywindows.co.uk"
--
-- Organisations that have not set up a custom domain will have all four
-- columns NULL and will continue to send from hello@simplylustre.com.
-- =============================================================================

ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS resend_domain_id    text,
  ADD COLUMN IF NOT EXISTS email_domain_name   text,
  ADD COLUMN IF NOT EXISTS email_domain_status text
    CHECK (email_domain_status IN ('pending', 'verified')),
  ADD COLUMN IF NOT EXISTS custom_from_email   text;
