import { forwardRef, useMemo } from "react"

// International phone input. Supports selecting country code (+91, +1, +44).
// Emits the full E.164-ish string ("+91XXXXXXXXXX") through onChange.

const COUNTRIES = [
  { code: "+91", label: "IN", len: 10, placeholder: "98765 43210" },
  { code: "+1", label: "US", len: 10, placeholder: "202-555-0123" },
  { code: "+44", label: "UK", len: 10, placeholder: "7700 900123" },
  { code: "+971", label: "AE", len: 10, placeholder: "50 123 4567" },
  { code: "+61", label: "AU", len: 10, placeholder: "412 345 678" },
  { code: "+49", label: "DE", len: 11, placeholder: "151 12345678" },
  { code: "+33", label: "FR", len: 10, placeholder: "6 12 34 56 78" },
  { code: "+65", label: "SG", len: 10, placeholder: "8123 4567" },
]

function extractParts(raw) {
  if (raw == null || raw === "") return { code: "+91", digits: "" }
  const s = String(raw)
  const country = COUNTRIES.find((c) => s.startsWith(c.code))
  if (country) {
    return {
      code: country.code,
      digits: s.slice(country.code.length).replace(/\D/g, "").slice(0, country.len),
    }
  }
  // Legacy or raw digits
  const digits = s.replace(/\D/g, "")
  if (digits.length === 12 && digits.startsWith("91")) {
    return { code: "+91", digits: digits.slice(2) }
  }
  return { code: "+91", digits: digits.slice(0, 10) }
}

const PhoneInput = forwardRef(function PhoneInput(
  { value, onChange, onBlur, name, disabled, hasError, ...rest },
  ref,
) {
  const { code, digits } = useMemo(() => extractParts(value), [value])
  const activeCountry = COUNTRIES.find((c) => c.code === code) || COUNTRIES[0]

  const handleDigitsChange = (e) => {
    const nextDigits = e.target.value.replace(/\D/g, "").slice(0, activeCountry.len)
    // If nextDigits already includes the code (e.g. pasted), don't prepend it again
    const full = `${code}${nextDigits}`
    onChange?.(nextDigits ? full : "")
  }

  const handleCountryChange = (e) => {
    const nextCode = e.target.value
    // Re-verify digits to ensure we don't have a double code when switching
    const { digits: currentDigits } = extractParts(value)
    onChange?.(currentDigits ? `${nextCode}${currentDigits}` : "")
  }

  return (
    <div
      className="phone-input"
      style={{
        display: "flex",
        alignItems: "stretch",
        border: `1px solid ${hasError ? "var(--lp-error)" : "var(--lp-border)"}`,
        borderRadius: "var(--lp-radius-input, 8px)",
        background: "var(--lp-surface)",
        overflow: "hidden",
      }}
    >
      <select
        value={code}
        onChange={handleCountryChange}
        disabled={disabled}
        style={{
          background: "var(--lp-surface-2)",
          color: "var(--lp-text)",
          fontSize: "0.867rem",
          fontWeight: 500,
          border: 0,
          borderRight: "1px solid var(--lp-border)",
          padding: "0 8px",
          outline: "none",
          cursor: "pointer",
        }}
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label} ({c.code})
          </option>
        ))}
      </select>
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
        placeholder={activeCountry.placeholder}
        maxLength={activeCountry.len}
        style={{
          flex: 1,
          border: 0,
          outline: "none",
          background: "transparent",
          padding: "10px 12px",
          color: "var(--lp-text)",
          fontSize: "0.933rem",
          minWidth: 0,
        }}
        {...rest}
      />
    </div>
  )
})

export default PhoneInput
