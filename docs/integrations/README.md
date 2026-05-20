# Lead Capture Integrations — Documentation

Documentation for Bizzfly's multi-tenant lead capture system. Each tenant connects their own Meta / Google Ads / IndiaMART / JustDial / website forms using their own credentials (BYO — Bring Your Own).

---

## Files in this folder

| File | Audience | Purpose |
|---|---|---|
| `00-discussion-and-decisions.md` | Internal | The *why* — options considered, decisions made, architecture principles |
| `01-build-plan.md` | Internal | Phased implementation plan, file structure, schema |
| `02-meta-credentials-guide.md` | Tenants + internal | How to generate Meta App + Page Access Token |
| `03-google-ads-credentials-guide.md` | Tenants + internal | How to set up Google Ads API + Developer Token + Refresh Token |
| `04-website-forms-guide.md` | Tenants + internal | How to wire any website form to Bizzfly |
| `05-justdial-credentials-guide.md` | Tenants + internal | How to request JustDial API access |
| `06-indiamart-credentials-guide.md` | Tenants + internal | How to generate IndiaMART CRM Key |
| `07-localhost-testing.md` | Internal (dev) | How to test webhooks locally before deployment |
| `08-progress-and-testing.md` | Internal | **Living doc.** What shipped per phase, files touched, end-to-end test recipes. Updated each time a phase lands. |

The provider guides (02–06) double as the source text for the in-app `Connect{Provider}.jsx` setup wizards.

---

## Quick links

- **Build order**: Meta → Google → Website → JustDial → IndiaMART
- **Architecture overview**: see `00-discussion-and-decisions.md` → "Architecture decisions"
- **Schema**: see `01-build-plan.md` → "Database changes"
- **Localhost tunnel setup**: see `07-localhost-testing.md`

---

## Status

- [x] Phase 0 — Foundations (2026-05-19)
- [x] Phase 1 — Meta (2026-05-19)
- [x] Phase 2 — Google Ads (2026-05-19)
- [x] Phase 3 — Website Forms (2026-05-19)
- [x] Phase 4 — JustDial (2026-05-19)
- [x] Phase 5 — IndiaMART (2026-05-19)
- [x] Phase 6 — Polish & operations (2026-05-19)

🎉 **All phases shipped.** Time to test end-to-end and merge.

See `08-progress-and-testing.md` for what each shipped phase included and how to test it.
