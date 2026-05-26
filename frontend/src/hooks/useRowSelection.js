import { useCallback, useMemo, useState } from "react"

// Shared row-selection state for any data table. Lets pages drop a
// checkbox column + bulk-action bar in without reinventing the wiring
// each time.
//
// Usage:
//   const sel = useRowSelection(rows, (r) => r.id, {
//     isSelectable: (r) => !r.deletedAt,
//   })
//   <input checked={sel.allSelected} onChange={(e) => sel.toggleAll(e.target.checked)} />
//   {rows.map((r) => (
//     <input checked={sel.isSelected(r.id)}
//            onChange={(e) => sel.toggleRow(r.id, e.target.checked)} />
//   ))}
//   {sel.count > 0 && <BulkBar count={sel.count} onClear={sel.clear} />}
//
// isSelectable(row): optional predicate. Rows that fail the test are
// excluded from select-all and shouldn't render a clickable checkbox.
export function useRowSelection(rows = [], getId = (r) => r.id, opts = {}) {
  const { isSelectable } = opts
  const [selected, setSelected] = useState(() => new Set())

  const selectableIds = useMemo(() => {
    if (!isSelectable) return rows.map(getId)
    return rows.filter(isSelectable).map(getId)
  }, [rows, getId, isSelectable])

  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id))
  const someSelected =
    !allSelected && selectableIds.some((id) => selected.has(id))

  const toggleRow = useCallback((id, on) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(
    (on) => {
      setSelected(on ? new Set(selectableIds) : new Set())
    },
    [selectableIds],
  )

  const clear = useCallback(() => setSelected(new Set()), [])

  const isSelected = useCallback((id) => selected.has(id), [selected])

  return {
    selected,
    ids: useMemo(() => [...selected], [selected]),
    count: selected.size,
    allSelected,
    someSelected,
    isSelected,
    toggleRow,
    toggleAll,
    clear,
  }
}
