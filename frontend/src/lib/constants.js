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
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "AGENT", label: "Agent" },
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

