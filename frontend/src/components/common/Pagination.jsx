import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

// Build the page-number sequence shown in the control. Items are either
// page numbers (Number) or the literal "…" for gaps. Mirrors the admin
// Leads pattern (GitHub/Linear/Stripe style):
//
//   1 … 4 [5] 6 … 20      ← typical mid-range view
//   [1] 2 3 4 5 … 20      ← near the start (no leading ellipsis)
//   1 … 16 17 18 [19] 20  ← near the end (no trailing ellipsis)
export function buildPaginationItems(current, total, siblings = 1) {
  if (total <= 1) return [1]
  const window = siblings * 2 + 3 // first + siblings + current + siblings + last
  if (total <= window + 2) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const left = Math.max(current - siblings, 2)
  const right = Math.min(current + siblings, total - 1)
  const showLeftDots = left > 2
  const showRightDots = right < total - 1

  const items = [1]
  if (showLeftDots) items.push("…")
  for (let i = left; i <= right; i++) items.push(i)
  if (showRightDots) items.push("…")
  items.push(total)
  return items
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

// Presentational pagination control. The parent owns `page`/`pageSize`
// state and does the slicing — this just renders the footer and reports
// changes back. By default it hides itself when there's a single page so
// small lists stay uncluttered; pass hideOnSinglePage={false} to keep it.
export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  itemLabel = "rows",
  hideOnSinglePage = true,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const curPage = Math.min(Math.max(1, page), totalPages)
  const startRow = total === 0 ? 0 : (curPage - 1) * pageSize + 1
  const endRow = Math.min(curPage * pageSize, total)

  if (total === 0) return null
  if (hideOnSinglePage && totalPages <= 1) return null

  const items = buildPaginationItems(curPage, totalPages)
  const go = (p) => {
    const next = Math.min(Math.max(1, p), totalPages)
    if (next !== curPage) onPageChange(next)
  }

  return (
    <div className="table-foot">
      <span>
        Showing <b>{startRow}–{endRow}</b> of <b>{total}</b>
      </span>

      {onPageSizeChange && (
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1)}
          <select
            className="select"
            style={{ width: "auto", padding: "4px 8px" }}
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizeOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      )}

      <div className="pagination" role="navigation" aria-label="Pagination">
        <button
          type="button"
          onClick={() => go(1)}
          disabled={curPage <= 1}
          aria-label="First page"
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => go(curPage - 1)}
          disabled={curPage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        {items.map((it, i) =>
          it === "…" ? (
            <span key={`ellipsis-${i}`} style={{ padding: "0 6px", color: "var(--lp-text-muted)" }}>
              …
            </span>
          ) : (
            <button
              type="button"
              key={it}
              className={it === curPage ? "active" : ""}
              onClick={() => go(it)}
              aria-current={it === curPage ? "page" : undefined}
            >
              {it}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => go(curPage + 1)}
          disabled={curPage >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => go(totalPages)}
          disabled={curPage >= totalPages}
          aria-label="Last page"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  )
}
