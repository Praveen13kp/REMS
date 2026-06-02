import { useCallback, useEffect, useRef, useState } from "react"

// useFormDraft — a useState-compatible hook that auto-persists form values so
// they survive a modal being closed by a backdrop/outside click (or even a
// full page navigation), and restores them automatically when the same form
// is reopened.
//
// Drafts are namespaced in sessionStorage under a stable `key`. Closing a
// modal does NOT clear the draft — only an explicit user action should:
// call the returned `clearDraft()` from your Cancel / Reset / submit-success
// handlers. That's the whole contract:
//
//   const [form, setForm, clearDraft] = useFormDraft("invite-user", INITIAL)
//   ...
//   // backdrop close  -> just close the modal; draft persists, reopen restores
//   // Cancel / submit  -> clearDraft(); then close
//
// `key` should be unique per logical form. For per-entity edit forms, include
// the id (e.g. `edit-lead:${leadId}`) so each record keeps its own draft.
//
// Notes:
//   - Values must be JSON-serialisable (plain objects/strings/numbers/bools/
//     arrays). Don't use this for File inputs — those can't be serialised.
//   - sessionStorage (not localStorage): drafts live for the browser tab/
//     session and are cleared when the tab closes, which is the right
//     lifetime for "I accidentally clicked away" recovery.

const PREFIX = "relms:form-draft:"

function safeStorage() {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null
    return window.sessionStorage
  } catch {
    // Storage can throw in private-mode / sandboxed iframes.
    return null
  }
}

function readDraft(key) {
  const store = safeStorage()
  if (!store) return undefined
  try {
    const raw = store.getItem(PREFIX + key)
    return raw == null ? undefined : JSON.parse(raw)
  } catch {
    return undefined
  }
}

function writeDraft(key, value) {
  const store = safeStorage()
  if (!store) return
  try {
    store.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Quota / serialisation failure — degrade gracefully to in-memory only.
  }
}

export function readFormDraft(key) {
  return readDraft(key)
}

export function writeFormDraft(key, value) {
  writeDraft(key, value)
}

export function clearFormDraft(key) {
  const store = safeStorage()
  if (!store) return
  try {
    store.removeItem(PREFIX + key)
  } catch {
    /* ignore */
  }
}

export function useFormDraft(key, initialValues) {
  // Keep the very first initialValues so clearDraft() can reset back to them
  // without callers having to pass them again.
  const initialRef = useRef(initialValues)

  const [value, setValueState] = useState(() => {
    const draft = readDraft(key)
    return draft !== undefined ? draft : initialValues
  })

  // If the key changes (e.g. switching which entity is being edited), load
  // that key's draft (or fall back to the current initialValues).
  const prevKeyRef = useRef(key)
  useEffect(() => {
    if (prevKeyRef.current === key) return
    prevKeyRef.current = key
    const draft = readDraft(key)
    setValueState(draft !== undefined ? draft : initialRef.current)
  }, [key])

  // Persist on every change.
  useEffect(() => {
    writeDraft(key, value)
  }, [key, value])

  const setValue = useCallback((next) => {
    setValueState((prev) => (typeof next === "function" ? next(prev) : next))
  }, [])

  // Wipe the persisted draft AND reset the live value to the initial values.
  // Call from Cancel / Reset / successful submit — never from a backdrop close.
  const clearDraft = useCallback(
    (resetTo) => {
      clearFormDraft(key)
      setValueState(resetTo !== undefined ? resetTo : initialRef.current)
    },
    [key],
  )

  return [value, setValue, clearDraft]
}

export default useFormDraft
