// Mirrored from backend (S1-BE-A-01 company.validation.js).
// Keep in sync with the prisma `CompanyType` enum.
export const COMPANY_TYPES = [
  { value: "DEVELOPER", label: "Developer" },
  { value: "BROKERAGE", label: "Brokerage" },
  { value: "CHANNEL_PARTNER", label: "Channel Partner" },
  { value: "INDIVIDUAL", label: "Individual" },
]

export const COMPANY_TYPE_VALUES = COMPANY_TYPES.map((t) => t.value)
