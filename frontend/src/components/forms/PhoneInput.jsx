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
//
// Critical: this runs on EVERY keystroke because PhoneInput is controlled
// — RHF stores "+91XXXXXXXXXX" and feeds it back as the value prop. We
// must always strip the leading +91 when it's there, including during
// the transient typing states ("+9", "+91", "+919", …). The old
// implementation only stripped when total length > 10, so typing "9"
// rendered "919", typing "8" rendered "9198", and so on — each keystroke
// appended to the visible country code instead of replacing it.
function extractDigits(raw) {
  if (raw == null || raw === "") return ""
  const s = String(raw)
  // Canonical "+91…" form from form state — strip the country code
  // unconditionally. This is the dominant case during edit/typing.
  if (s.startsWith("+91")) {
    return s.slice(3).replace(/\D/g, "").slice(0, NATIONAL_LEN)
  }
  // Raw user input or a legacy unprefixed value.
  const digits = s.replace(/\D/g, "")
  // Legacy DB rows stored as "919876543210" without the + — treat the
  // leading 91 as the country code only when the total is exactly 12.
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2)
  }
  return digits.slice(0, NATIONAL_LEN)
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
