// SuperAdmin cross-tenant invoice/payments view. Lists every Razorpay
// payment across every company. Useful for accounting + spotting failed
// charges across the platform.

import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  IndianRupee,
  RefreshCw,
  Search,
  Building,
  Filter,
  Columns3,
  ListChecks,
  X,
  Calendar,
  Tag,
  Hash,
  Wallet,
  Receipt,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { adminService } from "@/services/adminService"
import { fmt } from "@/lib/format"

const PAGE_SIZE = 30

const STATUS_BADGE = {
  captured: "badge-success",
  authorized: "badge-info",
  failed: "badge-error",
  refunded: "badge-warning",
}

const INVOICE_COLUMNS = [
  { key: "date", label: "Date", icon: Calendar },
  { key: "company", label: "Company", icon: Building },
  { key: "plan", label: "Plan", icon: CreditCard },
  { key: "method", label: "Method", icon: Wallet },
  { key: "amount", label: "Amount", icon: IndianRupee },
  { key: "status", label: "Status", icon: Tag },
  { key: "paymentId", label: "Payment ID", icon: Hash },
  { key: "invoice", label: "Invoice", icon: Receipt },
]

export default function Invoices() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [companies, setCompanies] = useState([])

  const statusFilter = searchParams.get("status") ?? "captured"
  const companyFilter = searchParams.get("companyId") ?? ""
  const dateFrom = searchParams.get("dateFrom") ?? ""
  const dateTo = searchParams.get("dateTo") ?? ""
  const columnsParam = searchParams.get("columns") ?? ""
  const visibleColumns = useMemo(() => {
    if (!columnsParam) return INVOICE_COLUMNS.map((c) => c.key)
    return columnsParam.split(",").filter((k) => INVOICE_COLUMNS.some((c) => c.key === k))
  }, [columnsParam])

  const updateParams = (patch) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "" || v === undefined) next.delete(k)
        else next.set(k, String(v))
      }
      return next
    })
  }

  const toggleColumn = (key) => {
    const current = new Set(visibleColumns)
    if (current.has(key)) {
      if (current.size <= 1) return
      current.delete(key)
    } else {
      current.add(key)
    }
    updateParams({ columns: [...current].join(",") || null })
  }

  const toggleAllColumns = () => {
    const allKeys = INVOICE_COLUMNS.map((c) => c.key)
    const allVisible = allKeys.every((k) => visibleColumns.includes(k))
    if (allVisible) {
      updateParams({ columns: allKeys[0] })
    } else {
      updateParams({ columns: allKeys.join(",") || null })
    }
  }

  const load = async (p = page) => {
    setLoading(true)
    try {
      const data = await adminService.getInvoices({
        page: p,
        pageSize: PAGE_SIZE,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        companyId: companyFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
      setItems(data?.items || [])
      setTotal(data?.total || 0)
      setTotalAmount(data?.totalCapturedAmount || 0)
    } catch (err) {
      toast.error(err?.message || "Failed to load invoices")
    } finally {
      setLoading(false)
    }
  }

  // Filter chips
  const chips = []
  if (statusFilter !== "captured") chips.push({ label: `Status: ${statusFilter}`, clear: () => updateParams({ status: "captured" }) })
  if (companyFilter) {
    const c = companies.find((x) => x.id === companyFilter)
    chips.push({ label: `Company: ${c?.name || companyFilter}`, clear: () => updateParams({ companyId: null }) })
  }
  if (dateFrom || dateTo) chips.push({ label: `Date: ${dateFrom || "…"} → ${dateTo || "…"}`, clear: () => updateParams({ dateFrom: null, dateTo: null }) })
  const hasFilters = chips.length > 0
  const clearAllFilters = () => updateParams({ status: "captured", companyId: null, dateFrom: null, dateTo: null })

  // Row selection
  const [selected, setSelected] = useState(new Set())
  useEffect(() => { setSelected(new Set()) }, [search, statusFilter, companyFilter, dateFrom, dateTo, page])
  const toggleRow = (id, on) => {
    setSelected((prev) => { const next = new Set(prev); if (on) next.add(id); else next.delete(id); return next })
  }
  const toggleAll = (on) => { setSelected(on ? new Set(items.map((p) => p.id)) : new Set()) }
  const allSelected = items.length > 0 && items.every((p) => selected.has(p.id))

  useEffect(() => {
    adminService
      .getCompanies()
      .then((res) => setCompanies(res?.items || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    load(1)
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, companyFilter, dateFrom, dateTo])

  const handleSearchSubmit = (e) => {
    e?.preventDefault?.()
    load(1)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <>
      <div className="content-head">
        <div>
          <h1>Invoices</h1>
          <p>
            Every Razorpay payment across every tenant — useful for
            accounting reconciliation and spotting failed charges.
          </p>
        </div>
        <div className="row">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => navigate("/admin")}
          >
            Back to overview
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => load(page)}
            disabled={loading}
            title="Reload"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Summary tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div className="card">
          <div className="text-xs text-muted" style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>
            Captured (filtered)
          </div>
          <div style={{ fontSize: "1.467rem", fontWeight: 700, marginTop: 4 }}>
            <IndianRupee size={16} style={{ verticalAlign: "middle" }} />
            {(totalAmount / 100).toLocaleString("en-IN")}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: 4 }}>
            From {total} matching payment{total === 1 ? "" : "s"}
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-muted" style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>
            Status filter
          </div>
          <div style={{ fontSize: "1.333rem", fontWeight: 600, marginTop: 4, textTransform: "capitalize" }}>
            {statusFilter || "All"}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: 4 }}>
            Switch in filter row →
          </div>
        </div>
      </div>

      {/* Filters — popover style */}
      <div className="table-wrap" style={{ marginBottom: 14 }}>
        <div className="table-toolbar">
          <div className="topbar-search">
            <Search size={16} />
            <input
              placeholder="Search payment ID, order ID, description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="row" style={{ marginLeft: "auto", gap: 6 }}>
            {selected.size > 0 && (
              <>
                <span style={{ fontSize: "0.867rem", color: "var(--lp-text-muted)", whiteSpace: "nowrap" }}>
                  {selected.size} selected
                </span>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelected(new Set())}>
                  Clear selection
                </button>
              </>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="btn btn-sm btn-secondary">
                  <Filter size={14} /> Filters
                  {hasFilters && (
                    <span className="badge badge-muted" style={{ padding: "1px 6px", fontSize: "0.733rem", lineHeight: 1.4 }}>
                      {chips.length}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="min-w-[220px] p-2">
                <div className="stack" style={{ gap: "4px" }}>
                  <div>
                    <label className="label" style={{ fontSize: "0.75rem", marginBottom: 2, display: "block" }}>Company</label>
                    <select className="select" style={{ fontSize: "0.8rem", padding: "5px 8px", width: "100%" }}
                      value={companyFilter}
                      onChange={(e) => updateParams({ companyId: e.target.value || null })}
                    >
                      <option value="">All companies</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: "0.75rem", marginBottom: 2, display: "block" }}>Status</label>
                    <select className="select" style={{ fontSize: "0.8rem", padding: "5px 8px" }}
                      value={statusFilter}
                      onChange={(e) => updateParams({ status: e.target.value })}
                    >
                      <option value="captured">Captured</option>
                      <option value="failed">Failed</option>
                      <option value="refunded">Refunded</option>
                      <option value="authorized">Authorized</option>
                    </select>
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: "0.75rem", marginBottom: 2, display: "block" }}>From</label>
                    <input type="date" className="input" style={{ fontSize: "0.8rem", padding: "5px 8px", width: "100%" }}
                      value={dateFrom}
                      max={dateTo || undefined}
                      onChange={(e) => updateParams({ dateFrom: e.target.value || null })}
                    />
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: "0.75rem", marginBottom: 2, display: "block" }}>To</label>
                    <input type="date" className="input" style={{ fontSize: "0.8rem", padding: "5px 8px", width: "100%" }}
                      value={dateTo}
                      min={dateFrom || undefined}
                      onChange={(e) => updateParams({ dateTo: e.target.value || null })}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="btn btn-sm btn-secondary">
                  <Columns3 size={14} /> Columns
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="min-w-[200px] p-2">
                <div className="stack" style={{ gap: "2px" }}>
                  <label className="column-option" style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: "var(--lp-radius-input)", cursor: "pointer", fontSize: "0.867rem", borderBottom: "1px solid var(--lp-border)", marginBottom: 4 }}>
                    <input type="checkbox"
                      checked={INVOICE_COLUMNS.every((c) => visibleColumns.includes(c.key))}
                      onChange={toggleAllColumns}
                      style={{ accentColor: "var(--lp-accent)", width: 15, height: 15 }}
                    />
                    <ListChecks size={15} style={{ color: "var(--lp-text-muted)", flexShrink: 0 }} />
                    Select All
                  </label>
                  {INVOICE_COLUMNS.map((col) => (
                    <label key={col.key} className="column-option" style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: "var(--lp-radius-input)", cursor: "pointer", fontSize: "0.867rem" }}>
                      <input type="checkbox"
                        checked={visibleColumns.includes(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        style={{ accentColor: "var(--lp-accent)", width: 15, height: 15 }}
                      />
                      <col.icon size={15} style={{ color: "var(--lp-text-muted)", flexShrink: 0 }} />
                      {col.label}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {hasFilters && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearAllFilters}>
                Clear filters
              </button>
            )}
          </div>
        </div>
        {hasFilters && (
          <div style={{ padding: "10px 16px", display: "flex", gap: 6, flexWrap: "wrap", borderBottom: "1px solid var(--lp-border)" }}>
            {chips.map((c) => (
              <span key={c.label} className="badge badge-muted">
                {c.label}
                <button type="button" onClick={c.clear} aria-label={`Remove ${c.label}`} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginLeft: 6, display: "inline-flex", verticalAlign: "middle", lineHeight: 1 }}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="table-wrap">
        <div className="table-toolbar">
          <span className="text-xs text-muted">
            {loading ? "Loading…" : `${total} record${total === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} aria-label="Select all" />
                </th>
                {visibleColumns.includes("date") && <th>Date</th>}
                {visibleColumns.includes("company") && <th>Company</th>}
                {visibleColumns.includes("plan") && <th>Plan</th>}
                {visibleColumns.includes("method") && <th>Method</th>}
                {visibleColumns.includes("amount") && <th style={{ textAlign: "right" }}>Amount</th>}
                {visibleColumns.includes("status") && <th>Status</th>}
                {visibleColumns.includes("paymentId") && <th>Payment ID</th>}
                {visibleColumns.includes("invoice") && <th>Invoice</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} style={{ textAlign: "center", padding: 24, color: "var(--lp-text-muted)" }}>
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} style={{ textAlign: "center", padding: 24, color: "var(--lp-text-muted)" }}>
                    No invoices match.
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <input type="checkbox" checked={selected.has(p.id)} onChange={(e) => toggleRow(p.id, e.target.checked)} aria-label={`Select payment ${p.razorpayPaymentId || p.id}`} />
                    </td>
                    {visibleColumns.includes("date") && (
                      <td>
                        <div style={{ fontWeight: 500 }}>
                          {p.paidAt ? fmt.date(p.paidAt) : fmt.date(p.createdAt)}
                        </div>
                        <div className="text-xs text-muted">
                          {fmt.ago(p.paidAt || p.createdAt)}
                        </div>
                      </td>
                    )}
                    {visibleColumns.includes("company") && (
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.company?.name || "—"}</div>
                        <div className="text-xs text-muted" style={{ fontSize: "0.733rem" }}>
                          {p.companyId}
                        </div>
                      </td>
                    )}
                    {visibleColumns.includes("plan") && (
                      <td>
                        {p.subscription ? (
                          <span className="badge badge-info">
                            {p.subscription.plan} · {p.subscription.billingCycle}
                          </span>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>
                    )}
                    {visibleColumns.includes("method") && (
                      <td style={{ textTransform: "capitalize" }}>
                        {p.method ? (
                          <span className="row" style={{ gap: 6 }}>
                            <CreditCard size={12} />
                            {p.method}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    )}
                    {visibleColumns.includes("amount") && (
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        ₹{(p.amount / 100).toLocaleString("en-IN")}
                      </td>
                    )}
                    {visibleColumns.includes("status") && (
                      <td>
                        <span className={`badge ${STATUS_BADGE[p.status] || "badge-muted"}`}>
                          {p.status}
                        </span>
                      </td>
                    )}
                    {visibleColumns.includes("paymentId") && (
                      <td>
                        <code style={{ fontSize: "0.733rem", color: "var(--lp-text-muted)" }}>
                          {p.razorpayPaymentId}
                        </code>
                      </td>
                    )}
                    {visibleColumns.includes("invoice") && (
                      <td>
                        {p.razorpayInvoiceId ? (
                          <a
                            href={`https://api.razorpay.com/v1/invoices/${p.razorpayInvoiceId}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              color: "var(--lp-accent)",
                            }}
                          >
                            <Download size={12} /> PDF
                          </a>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div
          className="row row-between"
          style={{ alignItems: "center", marginTop: 14 }}
        >
          <span className="text-xs text-muted">
            Page {page} of {totalPages}
          </span>
          <div className="row" style={{ gap: 6 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={page <= 1 || loading}
              onClick={() => {
                const p = page - 1
                setPage(p)
                load(p)
              }}
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={page >= totalPages || loading}
              onClick={() => {
                const p = page + 1
                setPage(p)
                load(p)
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
