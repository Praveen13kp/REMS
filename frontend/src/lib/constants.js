// Mirrored from backend (S1-BE-A-01 company.validation.js).
// Keep in sync with the prisma `CompanyType` enum.
export const COMPANY_TYPES = [
  { value: "DEVELOPER", label: "Developer" },
  { value: "BROKERAGE", label: "Brokerage" },
  { value: "CHANNEL_PARTNER", label: "Channel Partner" },
  { value: "INDIVIDUAL", label: "Individual" },
]

export const COMPANY_TYPE_VALUES = COMPANY_TYPES.map((t) => t.value)

// Invitable roles. OWNER is intentionally excluded — promoting to OWNER is a
// post-acceptance action by an existing OWNER (S1-BE-A-02 validation).
export const USER_ROLES = [
  { value: "MANAGER", label: "Manager" },
  { value: "AGENT", label: "Agent" },
  { value: "CHANNEL_PARTNER", label: "Channel Partner" },
]

export const USER_ROLE_VALUES = USER_ROLES.map((r) => r.value)

export const TIMEZONES = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
  { value: "Europe/London", label: "Europe/London (GMT)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET)" },
  { value: "America/New_York", label: "America/New_York (ET)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PT)" },
  { value: "UTC", label: "UTC" },
]

export const CURRENCIES = [
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "AED", label: "AED — UAE Dirham" },
]

// Mirrored from backend (prisma `ProjectType` enum + project.validation.js).
export const PROJECT_TYPES = [
  { value: "RESIDENTIAL", label: "Residential" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "PLOT", label: "Plot" },
  { value: "VILLA", label: "Villa" },
  { value: "MIXED", label: "Mixed" },
]

export const PROJECT_TYPE_VALUES = PROJECT_TYPES.map((t) => t.value)

// Lead statuses — mirror the seeded pipeline-stage names. The BE stores
// `Lead.status` as a free-text string, but values come from this list in
// practice (seed + S3 transition endpoint will enforce). Badge variant
// per status keeps the leads table consistent.
export const LEAD_STATUSES = [
  { value: "New", variant: "secondary" },
  { value: "Contacted", variant: "secondary" },
  { value: "Qualified", variant: "default" },
  { value: "Proposal Sent", variant: "default" },
  { value: "Negotiation", variant: "default" },
  { value: "Won", variant: "default", className: "bg-emerald-500 text-white hover:bg-emerald-500/90" },
  { value: "Lost", variant: "destructive" },
  { value: "Not Interested", variant: "outline" },
  { value: "Follow Up", variant: "secondary" },
]

export const LEAD_STATUS_VALUES = LEAD_STATUSES.map((s) => s.value)

export const LEAD_SOURCES = [
  "Website",
  "Referral",
  "Walk-in",
  "Facebook",
  "Instagram",
  "Google Ads",
  "99acres",
  "MagicBricks",
  "Housing.com",
  "WhatsApp",
  "Other",
]

// Mirrored from backend (S1-BE-A-01 seeded via pipeline.constants.js).
// Must stay in sync — names show in the onboarding preview before the
// stages endpoint (S3-BE-B-01) is live.
export const DEFAULT_PIPELINE_STAGES = [
  { name: "New", probability: 5 },
  { name: "Contacted", probability: 10 },
  { name: "Qualified", probability: 25 },
  { name: "Proposal Sent", probability: 40 },
  { name: "Negotiation", probability: 60 },
  { name: "Won", probability: 100, isWon: true },
  { name: "Lost", probability: 0, isLost: true },
  { name: "Not Interested", probability: 0, isLost: true },
  { name: "Follow Up", probability: 15 },
]

