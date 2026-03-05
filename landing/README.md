# Lustre Landing Page

**URL:** www.simplylustre.com
**Status:** Marketing / conversion landing page — separate entity from the web app.

## What this is

A standalone HTML/CSS/JS landing page for `www.simplylustre.com`. It is intentionally decoupled from the Next.js web app (`app.simplylustre.com`) so that:

- Marketing can be updated independently of the product
- It loads fast (no JS framework overhead)
- It can be hosted anywhere (Vercel, Netlify, Cloudflare Pages, S3+CDN)
- It's crawlable and SEO-friendly from day one

## Files

```
landing/
├── index.html   # Full landing page (all sections)
├── styles.css   # All styles
├── main.js      # Interactivity: pricing toggle, FAQ accordion, mobile nav
└── README.md    # This file
```

## Sections

1. **Navigation** — Sticky, with CTA button
2. **Hero** — Headline, sub-copy, dual CTA, browser mockup of the dashboard
3. **Social proof bar** — Dark band with key stats
4. **Problem section** — Speaks to the spreadsheet/WhatsApp pain
5. **Features** — 6 feature blocks (2 large, 4 standard)
6. **UK-native** — Dark gradient section highlighting UK differentiation
7. **How it works** — 3 numbered steps
8. **Testimonials** — 3 customer quotes
9. **Pricing** — 4 tiers with annual/monthly toggle
10. **Comparison table** — Lustre vs. Jobber vs. ServiceM8 vs. Spreadsheets
11. **FAQ** — 7 questions with accessible accordion
12. **Final CTA** — Dark gradient with dual CTA
13. **Footer** — Full links and legal

## Deploying

### Vercel (recommended)
1. Create a new Vercel project pointing to this repo
2. Set root directory to `landing/`
3. No build step required (static HTML)
4. Add `www.simplylustre.com` as a custom domain

### Netlify
Same as above — set publish directory to `landing/`, no build command.

### Cloudflare Pages
Same approach — static HTML, no build step.

## Key links (update before launch)

| Placeholder | Replace with |
|---|---|
| `https://app.simplylustre.com/sign-up` | Actual app sign-up URL |
| `https://app.simplylustre.com/sign-in` | Actual app sign-in URL |
| `mailto:hello@simplylustre.com` | Actual sales/support email |
| `/privacy`, `/terms`, `/gdpr` | Actual policy pages |
| `/help`, `/status` | Actual help centre + status page URLs |

## To add before launch

- [ ] Real customer testimonials (replace placeholder initials with photos where possible)
- [ ] Actual stat numbers (replace placeholder stats with real data from PostHog/Stripe)
- [ ] Product screenshot or real mockup replacing the browser mockup
- [ ] Favicon (`/favicon.ico` or `<link rel="icon">`)
- [ ] OG image (`og:image` meta tag)
- [ ] Google Analytics / PostHog snippet for landing page tracking
- [ ] Cookie consent banner (required for GDPR)
- [ ] Demo booking link (Calendly or similar) for the "Book a demo" CTA
