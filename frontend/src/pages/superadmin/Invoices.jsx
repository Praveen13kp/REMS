// SuperAdmin cross-tenant invoice/payments view. Lists every Razorpay
// payment across every company. Useful for accounting + spotting failed
// charges across the platform.

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  IndianRupee,
  RefreshCw,
  Search,
} from "lucide-react"

import { adminService } from "@/services/adminService"
import { fmt } from "@/lib/format"

const PAGE_SIZE = 30

const STATUS_BADGE = {
  captured: "badge-success",
  authorized: "badge-info",
  failed: "badge-error",
  refunded: "badge-warning",
}

export default function Invoices() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("captured")
  const [companies, setCompanies] = useState([])
  const [companyFilter, setCompanyFilter] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

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

      {/* Filters */}
      <div className="card" style={{ marginBottom: 14 }}>
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(200px, 2fr) minmax(140px, 1fr) minmax(140px, 1fr) minmax(140px, 1fr) minmax(140px, 1fr)",
            gap: 10,
            alignItems: "end",
          }}
        >
          <div>
            <label className="text-xs text-muted" style={{ marginBottom: 4, display: "block" }}>
              Search
            </label>
            <div className="topbar-search" style={{ width: "100%" }}>
              <Search size={14} />
              <input
                placeholder="Payment ID, order ID, description…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted" style={{ marginBottom: 4, display: "block" }}>
              Company
            </label>
            <select
              className="select"
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">All</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted" style={{ marginBottom: 4, display: "block" }}>
              Status
            </label>
            <select
              className="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">All</option>
              <option value="captured">Captured</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="authorized">Authorized</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted" style={{ marginBottom: 4, display: "block" }}>
              From
            </label>
            <input
              type="date"
              className="input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label className="text-xs text-muted" style={{ marginBottom: 4, display: "block" }}>
              To
            </label>
            <input
              type="date"
              className="input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
        </form>
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
                <th>Date</th>
                <th>Company</th>
                <th>Plan</th>
                <th>Method</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th>Status</th>
                <th>Payment ID</th>
                <th>Invoice</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      padding: 24,
                      color: "var(--lp-text-muted)",
                    }}
                  >
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      padding: 24,
                      color: "var(--lp-text-muted)",
                    }}
                  >
                    No invoices match.
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>
                        {p.paidAt ? fmt.date(p.paidAt) : fmt.date(p.createdAt)}
                      </div>
                      <div className="text-xs text-muted">
                        {fmt.ago(p.paidAt || p.createdAt)}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.company?.name || "—"}</div>
                      <div className="text-xs text-muted" style={{ fontSize: "0.733rem" }}>
                        {p.companyId}
                      </div>
                    </td>
                    <td>
                      {p.subscription ? (
                        <span className="badge badge-info">
                          {p.subscription.plan} · {p.subscription.billingCycle}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
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
                    <td style={{ textAlign: "right", fontWeight: 600 }}>
                      ₹{(p.amount / 100).toLocaleString("en-IN")}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[p.status] || "badge-muted"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <code style={{ fontSize: "0.733rem", color: "var(--lp-text-muted)" }}>
                        {p.razorpayPaymentId}
                      </code>
                    </td>
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
