import { forwardRef, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Search, X } from "lucide-react"

// International phone input — Flipkart-style.
// One bordered input box; the country code lives inline on the left as a
// borderless "+91 ▾" button. Tapping it opens a full-screen searchable
// country list (modal) styled like Flipkart's login picker.
// Emits the full E.164-ish string ("+91XXXXXXXXXX") through onChange.

// Common countries first (matches Flipkart's ordering), then the rest
// alphabetically. iso3 codes match the Flipkart UI ("India (IND)" etc.).
const COUNTRIES = [
  { code: "+91",  iso3: "IND", name: "India",          len: 10, placeholder: "98765 43210", pinned: true },
  { code: "+1",   iso3: "USA", name: "United States",  len: 10, placeholder: "202-555-0123", pinned: true },
  { code: "+44",  iso3: "GBR", name: "United Kingdom", len: 10, placeholder: "7700 900123",  pinned: true },
  { code: "+93",  iso3: "AFG", name: "Afghanistan",    len: 9,  placeholder: "70 123 4567" },
  { code: "+355", iso3: "ALB", name: "Albania",        len: 9,  placeholder: "67 212 3456" },
  { code: "+213", iso3: "DZA", name: "Algeria",        len: 9,  placeholder: "551 23 45 67" },
  { code: "+1",   iso3: "ASM", name: "American Samoa", len: 10, placeholder: "684 123 4567" },
  { code: "+376", iso3: "AND", name: "Andorra",        len: 6,  placeholder: "312 345" },
  { code: "+244", iso3: "AGO", name: "Angola",         len: 9,  placeholder: "923 123 456" },
  { code: "+1",   iso3: "AIA", name: "Anguilla",       len: 10, placeholder: "264 235 1234" },
  { code: "+54",  iso3: "ARG", name: "Argentina",      len: 10, placeholder: "11 1234-5678" },
  { code: "+374", iso3: "ARM", name: "Armenia",        len: 8,  placeholder: "77 123456" },
  { code: "+61",  iso3: "AUS", name: "Australia",      len: 9,  placeholder: "412 345 678" },
  { code: "+43",  iso3: "AUT", name: "Austria",        len: 11, placeholder: "664 1234567" },
  { code: "+994", iso3: "AZE", name: "Azerbaijan",     len: 9,  placeholder: "40 123 45 67" },
  { code: "+973", iso3: "BHR", name: "Bahrain",        len: 8,  placeholder: "3600 1234" },
  { code: "+880", iso3: "BGD", name: "Bangladesh",     len: 10, placeholder: "1812 345678" },
  { code: "+375", iso3: "BLR", name: "Belarus",        len: 9,  placeholder: "29 491 19 11" },
  { code: "+32",  iso3: "BEL", name: "Belgium",        len: 9,  placeholder: "470 12 34 56" },
  { code: "+501", iso3: "BLZ", name: "Belize",         len: 7,  placeholder: "622 1234" },
  { code: "+229", iso3: "BEN", name: "Benin",          len: 8,  placeholder: "90 01 12 34" },
  { code: "+975", iso3: "BTN", name: "Bhutan",         len: 8,  placeholder: "17 12 34 56" },
  { code: "+591", iso3: "BOL", name: "Bolivia",        len: 8,  placeholder: "71234567" },
  { code: "+55",  iso3: "BRA", name: "Brazil",         len: 11, placeholder: "11 91234-5678" },
  { code: "+673", iso3: "BRN", name: "Brunei",         len: 7,  placeholder: "712 3456" },
  { code: "+359", iso3: "BGR", name: "Bulgaria",       len: 9,  placeholder: "48 123 456" },
  { code: "+855", iso3: "KHM", name: "Cambodia",       len: 9,  placeholder: "91 234 567" },
  { code: "+237", iso3: "CMR", name: "Cameroon",       len: 9,  placeholder: "6 71 23 45 67" },
  { code: "+1",   iso3: "CAN", name: "Canada",         len: 10, placeholder: "204 250 1234" },
  { code: "+56",  iso3: "CHL", name: "Chile",          len: 9,  placeholder: "9 1234 5678" },
  { code: "+86",  iso3: "CHN", name: "China",          len: 11, placeholder: "131 2345 6789" },
  { code: "+57",  iso3: "COL", name: "Colombia",       len: 10, placeholder: "321 1234567" },
  { code: "+506", iso3: "CRI", name: "Costa Rica",     len: 8,  placeholder: "8312 3456" },
  { code: "+385", iso3: "HRV", name: "Croatia",        len: 9,  placeholder: "91 234 5678" },
  { code: "+357", iso3: "CYP", name: "Cyprus",         len: 8,  placeholder: "96 123456" },
  { code: "+420", iso3: "CZE", name: "Czech Republic", len: 9,  placeholder: "601 123 456" },
  { code: "+45",  iso3: "DNK", name: "Denmark",        len: 8,  placeholder: "32 12 34 56" },
  { code: "+593", iso3: "ECU", name: "Ecuador",        len: 9,  placeholder: "99 123 4567" },
  { code: "+20",  iso3: "EGY", name: "Egypt",          len: 10, placeholder: "100 123 4567" },
  { code: "+372", iso3: "EST", name: "Estonia",        len: 8,  placeholder: "5123 4567" },
  { code: "+251", iso3: "ETH", name: "Ethiopia",       len: 9,  placeholder: "91 123 4567" },
  { code: "+679", iso3: "FJI", name: "Fiji",           len: 7,  placeholder: "701 2345" },
  { code: "+358", iso3: "FIN", name: "Finland",        len: 10, placeholder: "41 2345678" },
  { code: "+33",  iso3: "FRA", name: "France",         len: 9,  placeholder: "6 12 34 56 78" },
  { code: "+995", iso3: "GEO", name: "Georgia",        len: 9,  placeholder: "555 12 34 56" },
  { code: "+49",  iso3: "DEU", name: "Germany",        len: 11, placeholder: "151 12345678" },
  { code: "+233", iso3: "GHA", name: "Ghana",          len: 9,  placeholder: "23 123 4567" },
  { code: "+30",  iso3: "GRC", name: "Greece",         len: 10, placeholder: "691 234 5678" },
  { code: "+852", iso3: "HKG", name: "Hong Kong",      len: 8,  placeholder: "5123 4567" },
  { code: "+36",  iso3: "HUN", name: "Hungary",        len: 9,  placeholder: "20 123 4567" },
  { code: "+354", iso3: "ISL", name: "Iceland",        len: 7,  placeholder: "611 1234" },
  { code: "+62",  iso3: "IDN", name: "Indonesia",      len: 11, placeholder: "812 3456 7890" },
  { code: "+98",  iso3: "IRN", name: "Iran",           len: 10, placeholder: "912 345 6789" },
  { code: "+964", iso3: "IRQ", name: "Iraq",           len: 10, placeholder: "791 234 5678" },
  { code: "+353", iso3: "IRL", name: "Ireland",        len: 9,  placeholder: "85 012 3456" },
  { code: "+972", iso3: "ISR", name: "Israel",         len: 9,  placeholder: "50 234 5678" },
  { code: "+39",  iso3: "ITA", name: "Italy",          len: 10, placeholder: "312 345 6789" },
  { code: "+81",  iso3: "JPN", name: "Japan",          len: 10, placeholder: "90 1234 5678" },
  { code: "+962", iso3: "JOR", name: "Jordan",         len: 9,  placeholder: "7 9012 3456" },
  { code: "+7",   iso3: "KAZ", name: "Kazakhstan",     len: 10, placeholder: "771 000 9998" },
  { code: "+254", iso3: "KEN", name: "Kenya",          len: 9,  placeholder: "712 123456" },
  { code: "+965", iso3: "KWT", name: "Kuwait",         len: 8,  placeholder: "500 12345" },
  { code: "+371", iso3: "LVA", name: "Latvia",         len: 8,  placeholder: "2123 4567" },
  { code: "+961", iso3: "LBN", name: "Lebanon",        len: 8,  placeholder: "71 123 456" },
  { code: "+218", iso3: "LBY", name: "Libya",          len: 9,  placeholder: "91 2345678" },
  { code: "+370", iso3: "LTU", name: "Lithuania",      len: 8,  placeholder: "612 34567" },
  { code: "+352", iso3: "LUX", name: "Luxembourg",     len: 9,  placeholder: "628 123 456" },
  { code: "+853", iso3: "MAC", name: "Macao",          len: 8,  placeholder: "6612 3456" },
  { code: "+60",  iso3: "MYS", name: "Malaysia",       len: 10, placeholder: "12 345 6789" },
  { code: "+960", iso3: "MDV", name: "Maldives",       len: 7,  placeholder: "771 2345" },
  { code: "+356", iso3: "MLT", name: "Malta",          len: 8,  placeholder: "9696 1234" },
  { code: "+230", iso3: "MUS", name: "Mauritius",      len: 8,  placeholder: "5251 2345" },
  { code: "+52",  iso3: "MEX", name: "Mexico",         len: 10, placeholder: "222 123 4567" },
  { code: "+377", iso3: "MCO", name: "Monaco",         len: 8,  placeholder: "612 345 678" },
  { code: "+976", iso3: "MNG", name: "Mongolia",       len: 8,  placeholder: "8812 3456" },
  { code: "+212", iso3: "MAR", name: "Morocco",        len: 9,  placeholder: "650 123456" },
  { code: "+95",  iso3: "MMR", name: "Myanmar",        len: 9,  placeholder: "9 212 3456" },
  { code: "+977", iso3: "NPL", name: "Nepal",          len: 10, placeholder: "984 1234567" },
  { code: "+31",  iso3: "NLD", name: "Netherlands",    len: 9,  placeholder: "6 12345678" },
  { code: "+64",  iso3: "NZL", name: "New Zealand",    len: 9,  placeholder: "21 123 4567" },
  { code: "+234", iso3: "NGA", name: "Nigeria",        len: 10, placeholder: "802 123 4567" },
  { code: "+47",  iso3: "NOR", name: "Norway",         len: 8,  placeholder: "406 12 345" },
  { code: "+968", iso3: "OMN", name: "Oman",           len: 8,  placeholder: "9212 3456" },
  { code: "+92",  iso3: "PAK", name: "Pakistan",       len: 10, placeholder: "301 2345678" },
  { code: "+970", iso3: "PSE", name: "Palestine",      len: 9,  placeholder: "599 123 456" },
  { code: "+507", iso3: "PAN", name: "Panama",         len: 8,  placeholder: "6123 4567" },
  { code: "+51",  iso3: "PER", name: "Peru",           len: 9,  placeholder: "912 345 678" },
  { code: "+63",  iso3: "PHL", name: "Philippines",    len: 10, placeholder: "905 123 4567" },
  { code: "+48",  iso3: "POL", name: "Poland",         len: 9,  placeholder: "512 345 678" },
  { code: "+351", iso3: "PRT", name: "Portugal",       len: 9,  placeholder: "912 345 678" },
  { code: "+974", iso3: "QAT", name: "Qatar",          len: 8,  placeholder: "3312 3456" },
  { code: "+40",  iso3: "ROU", name: "Romania",        len: 9,  placeholder: "712 034 567" },
  { code: "+7",   iso3: "RUS", name: "Russia",         len: 10, placeholder: "912 345-67-89" },
  { code: "+966", iso3: "SAU", name: "Saudi Arabia",   len: 9,  placeholder: "51 234 5678" },
  { code: "+221", iso3: "SEN", name: "Senegal",        len: 9,  placeholder: "70 123 45 67" },
  { code: "+381", iso3: "SRB", name: "Serbia",         len: 9,  placeholder: "60 1234567" },
  { code: "+65",  iso3: "SGP", name: "Singapore",      len: 8,  placeholder: "8123 4567" },
  { code: "+421", iso3: "SVK", name: "Slovakia",       len: 9,  placeholder: "912 123 456" },
  { code: "+386", iso3: "SVN", name: "Slovenia",       len: 8,  placeholder: "31 234 567" },
  { code: "+27",  iso3: "ZAF", name: "South Africa",   len: 9,  placeholder: "71 123 4567" },
  { code: "+82",  iso3: "KOR", name: "South Korea",    len: 10, placeholder: "10 1234 5678" },
  { code: "+34",  iso3: "ESP", name: "Spain",          len: 9,  placeholder: "612 34 56 78" },
  { code: "+94",  iso3: "LKA", name: "Sri Lanka",      len: 9,  placeholder: "71 234 5678" },
  { code: "+46",  iso3: "SWE", name: "Sweden",         len: 9,  placeholder: "70 123 45 67" },
  { code: "+41",  iso3: "CHE", name: "Switzerland",    len: 9,  placeholder: "78 123 45 67" },
  { code: "+963", iso3: "SYR", name: "Syria",          len: 9,  placeholder: "94 123 4567" },
  { code: "+886", iso3: "TWN", name: "Taiwan",         len: 9,  placeholder: "912 345 678" },
  { code: "+66",  iso3: "THA", name: "Thailand",       len: 9,  placeholder: "81 234 5678" },
  { code: "+216", iso3: "TUN", name: "Tunisia",        len: 8,  placeholder: "20 123 456" },
  { code: "+90",  iso3: "TUR", name: "Turkey",         len: 10, placeholder: "501 234 56 78" },
  { code: "+380", iso3: "UKR", name: "Ukraine",        len: 9,  placeholder: "50 123 4567" },
  { code: "+971", iso3: "ARE", name: "United Arab Emirates", len: 9, placeholder: "50 123 4567" },
  { code: "+598", iso3: "URY", name: "Uruguay",        len: 8,  placeholder: "94 231 234" },
  { code: "+998", iso3: "UZB", name: "Uzbekistan",     len: 9,  placeholder: "91 234 56 78" },
  { code: "+58",  iso3: "VEN", name: "Venezuela",      len: 10, placeholder: "412 1234567" },
  { code: "+84",  iso3: "VNM", name: "Vietnam",        len: 9,  placeholder: "91 234 56 78" },
  { code: "+967", iso3: "YEM", name: "Yemen",          len: 9,  placeholder: "71 234 5678" },
  { code: "+260", iso3: "ZMB", name: "Zambia",         len: 9,  placeholder: "95 1234567" },
  { code: "+263", iso3: "ZWE", name: "Zimbabwe",       len: 9,  placeholder: "71 234 5678" },
]

// Pinned (India, US, UK) first, the rest alphabetical by name — mirrors
// Flipkart's order. We use (code, iso3) as the unique key because dial
// codes like +1 are shared across multiple countries.
const ORDERED = [
  ...COUNTRIES.filter((c) => c.pinned),
  ...COUNTRIES.filter((c) => !c.pinned).sort((a, b) => a.name.localeCompare(b.name)),
]

const keyOf = (c) => `${c.code}:${c.iso3}`
const DEFAULT_COUNTRY = ORDERED[0]

function extractParts(raw) {
  if (raw == null || raw === "") return { code: DEFAULT_COUNTRY.code, digits: "" }
  const s = String(raw)
  // Longest dial-code prefix wins (so "+971" beats "+9").
  const matches = COUNTRIES.filter((c) => s.startsWith(c.code))
  if (matches.length) {
    const c = matches.reduce((a, b) => (b.code.length > a.code.length ? b : a))
    return {
      code: c.code,
      digits: s.slice(c.code.length).replace(/\D/g, "").slice(0, c.len),
    }
  }
  const digits = s.replace(/\D/g, "")
  if (digits.length === 12 && digits.startsWith("91")) {
    return { code: "+91", digits: digits.slice(2) }
  }
  return { code: DEFAULT_COUNTRY.code, digits: digits.slice(0, DEFAULT_COUNTRY.len) }
}

function CountryPickerModal({ open, onClose, onPick }) {
  const [query, setQuery] = useState("")
  const searchRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    // Autofocus search after the modal mounts.
    const t = setTimeout(() => searchRef.current?.focus(), 50)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
      clearTimeout(t)
    }
  }, [open, onClose])

  useEffect(() => { if (!open) setQuery("") }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ORDERED
    return ORDERED.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.iso3.toLowerCase().includes(q) ||
      c.code.includes(q),
    )
  }, [query])

  if (!open) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Select country"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0, 0, 0, 0.32)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 360,
          maxHeight: "min(70vh, 480px)",
          background: "var(--lp-surface, #fff)",
          color: "var(--lp-text, #111)",
          borderRadius: 12,
          border: "1px solid var(--lp-border)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderBottom: "1px solid var(--lp-border)",
          }}
        >
          <Search size={14} style={{ color: "var(--lp-text-muted)", flexShrink: 0 }} />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Country"
            style={{
              flex: 1,
              border: 0,
              outline: "none",
              background: "transparent",
              color: "var(--lp-text)",
              fontSize: 15,
              padding: "4px 0",
              minWidth: 0,
            }}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              border: 0,
              background: "transparent",
              cursor: "pointer",
              color: "var(--lp-text-muted)",
              padding: 4,
              display: "inline-flex",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--lp-text-muted)", fontSize: 13 }}>
              No countries match "{query}"
            </div>
          ) : (
            filtered.map((c) => (
              <button
                key={keyOf(c)}
                type="button"
                onClick={() => { onPick(c); onClose() }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  border: 0,
                  borderBottom: "1px solid var(--lp-border)",
                  background: "transparent",
                  color: "var(--lp-text)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 13,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--lp-surface-2)" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
              >
                <span>{c.name} ({c.iso3})</span>
                <span style={{ color: "var(--lp-text-muted)", fontVariantNumeric: "tabular-nums" }}>{c.code}</span>
              </button>
            ))
          )}
        </div>

        <div style={{ padding: "6px 12px", borderTop: "1px solid var(--lp-border)", textAlign: "center" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 0,
              background: "transparent",
              color: "var(--lp-accent, #2563eb)",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              padding: "6px 12px",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

const PhoneInput = forwardRef(function PhoneInput(
  { value, onChange, onBlur, name, disabled, hasError, ...rest },
  ref,
) {
  const parsed = useMemo(() => extractParts(value), [value])
  const [code, setCode] = useState(parsed.code)
  const [iso3, setIso3] = useState(() => {
    const m = COUNTRIES.find((c) => c.code === parsed.code)
    return m?.iso3 || DEFAULT_COUNTRY.iso3
  })
  const [pickerOpen, setPickerOpen] = useState(false)

  // Sync down from parent-supplied value (paste, autofill, server hydrate).
  useEffect(() => {
    if (parsed.code !== code && (parsed.digits || value)) {
      setCode(parsed.code)
      const m = COUNTRIES.find((c) => c.code === parsed.code)
      if (m) setIso3(m.iso3)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed.code, parsed.digits, value])

  const digits = parsed.digits
  const activeCountry = useMemo(
    () => COUNTRIES.find((c) => c.code === code && c.iso3 === iso3) ||
          COUNTRIES.find((c) => c.code === code) ||
          DEFAULT_COUNTRY,
    [code, iso3],
  )

  const handleDigitsChange = (e) => {
    const raw = e.target.value
    if (raw.includes("+")) {
      const { code: detectedCode, digits: detectedDigits } = extractParts(raw)
      setCode(detectedCode)
      const m = COUNTRIES.find((c) => c.code === detectedCode)
      if (m) setIso3(m.iso3)
      onChange?.(detectedDigits ? `${detectedCode}${detectedDigits}` : "")
      return
    }
    const nextDigits = raw.replace(/\D/g, "").slice(0, activeCountry.len)
    onChange?.(nextDigits ? `${code}${nextDigits}` : "")
  }

  const handleCountryPick = (c) => {
    setCode(c.code)
    setIso3(c.iso3)
    const { digits: currentDigits } = extractParts(value)
    const trimmed = currentDigits.slice(0, c.len)
    onChange?.(trimmed ? `${c.code}${trimmed}` : "")
  }

  return (
    <>
      <div
        className="phone-input"
        style={{
          display: "flex",
          alignItems: "center",
          border: `1px solid ${hasError ? "var(--lp-error)" : "var(--lp-border)"}`,
          borderRadius: "var(--lp-radius-input, 8px)",
          background: "var(--lp-surface)",
          padding: "0 6px 0 12px",
          gap: 4,
        }}
      >
        <button
          type="button"
          onClick={() => !disabled && setPickerOpen(true)}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          aria-label={`Country code ${code}, change`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
            border: 0,
            background: "transparent",
            color: "var(--lp-text)",
            fontSize: "0.933rem",
            fontWeight: 500,
            cursor: disabled ? "not-allowed" : "pointer",
            padding: "10px 4px 10px 0",
            outline: "none",
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
          }}
        >
          {code}
          <span aria-hidden="true" style={{ fontSize: "0.7rem", marginTop: 2, opacity: 0.75 }}>▾</span>
        </button>
        <input
          ref={ref}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          name={name}
          value={digits}
          onChange={handleDigitsChange}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={activeCountry.placeholder || "Phone Number"}
          style={{
            flex: 1,
            border: 0,
            outline: "none",
            background: "transparent",
            padding: "10px 8px",
            color: "var(--lp-text)",
            fontSize: "0.933rem",
            minWidth: 0,
          }}
          {...rest}
        />
      </div>
      <CountryPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={handleCountryPick}
      />
    </>
  )
})

export default PhoneInput
