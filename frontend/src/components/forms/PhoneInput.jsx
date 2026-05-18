import { forwardRef, useMemo } from "react"

// Fixed-country phone input. Renders a non-editable "+91" chip beside a
// digits-only field. Emits the full E.164-ish string ("+91XXXXXXXXXX")
// through onChange, or "" when the user clears it. This is the single
// place to swap if we ever go international — every lead/profile/edit
// form goes through here.
//
// Stored format in the DB: "+91" followed by 10 digits. Existing rows
// without "+91" are tolerated on read (we just show the trailing digits).

const COUNTRY_CODE = "+91"
const NATIONAL_LEN = 10

// Pull just the 10 digits out of whatever shape the value is in.
function extractDigits(raw) {
  if (!raw) return ""
  const stripped = String(raw).replace(/\D/g, "")
  // If the value already includes the 91 country code, drop it.
  const withoutCC = stripped.startsWith("91") && stripped.length > NATIONAL_LEN
    ? stripped.slice(2)
    : stripped
  return withoutCC.slice(0, NATIONAL_LEN)
}

const PhoneInput = forwardRef(function PhoneInput(
  { value, onChange, onBlur, name, disabled, placeholder, hasError, ...rest },
  ref,
) {
  const digits = useMemo(() => extractDigits(value), [value])

  const handleChange = (e) => {
    const next = extractDigits(e.target.value)
    if (!onChange) return
    // Emit the full +91XXXXXXXXXX, or "" if cleared. Don't emit a
    // half-formed prefix-only string — the server doesn't want "+91"
    // with no number.
    onChange(next ? `${COUNTRY_CODE}${next}` : "")
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
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "0 12px",
          background: "var(--lp-surface-2)",
          color: "var(--lp-text-muted)",
          fontSize: 14,
          fontWeight: 500,
          borderRight: "1px solid var(--lp-border)",
          userSelect: "none",
        }}
      >
        {COUNTRY_CODE}
      </span>
      <input
        ref={ref}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        name={name}
        value={digits}
        onChange={handleChange}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder || "98765 43210"}
        maxLength={NATIONAL_LEN}
        style={{
          flex: 1,
          border: 0,
          outline: "none",
          background: "transparent",
          padding: "10px 12px",
          color: "var(--lp-text)",
          fontSize: 14,
          minWidth: 0,
        }}
        {...rest}
      />
    </div>
  )
})

export default PhoneInput
