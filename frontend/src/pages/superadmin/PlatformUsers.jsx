import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  ShieldAlert,
  UserCheck,
} from "lucide-react"

import { adminService } from "@/services/adminService"
import { fmt } from "@/lib/format"

// Platform-admin view of every user across every tenant. Lets a super
// admin spot stuck/disabled accounts at any company and toggle them
// without leaving the platform-admin console. Cross-tenant by design —
// the BE endpoint bypasses tenant scope intentionally.

const ROLE_BADGE = {
  OWNER: "badge-warning",
  ADMIN: "badge-info",
  MANAGER: "badge-info",
  AGENT: "badge-success",
  CHANNEL_PARTNER: "badge-muted",
  SUPER_ADMIN: "badge-error",
  PLATFORM_ADMIN: "badge-error",
}

const PAGE_SIZE = 30

export default function PlatformUsers() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [companies, setCompanies] = useState([])
  const [companyFilter, setCompanyFilter] = useState("")

  const load = async (p = page) => {
    setLoading(true)
    try {
      const data = await adminService.getUsers({
        page: p,
        pageSize: PAGE_SIZE,
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        companyId: companyFilter || undefined,
      })
      setUsers(data?.items || [])
      setTotal(data?.total || 0)
    } catch (err) {
      toast.error(err?.message || "Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  // Preload companies for the filter dropdown.
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
  }, [roleFilter, statusFilter, companyFilter])

  const handleToggleActive = async (u) => {
    const next = !u.isActive
    if (
      !window.confirm(
        next
          ? `Re-enable ${u.name || u.email}? They'll be able to sign in again.`
          : `Disable ${u.name || u.email}? They'll be signed out and can't log back in.`,
      )
    ) {
      return
    }
    try {
      await adminService.patchUser(u.id, { isActive: next })
      toast.success(next ? "User enabled" : "User disabled")
      setUsers((cur) =>
        cur.map((x) => (x.id === u.id ? { ...x, isActive: next } : x)),
      )
    } catch (err) {
      toast.error(err?.message || "Failed to update user")
    }
  }

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
          <h1>Platform users</h1>
          <p>
            Every user across every organisation. Use this to investigate
            stuck accounts, disable bad actors, or help an OWNER unblock
            their team.
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

      {/* Filters */}
      <div className="card" style={{ marginBottom: 14 }}>
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(220px, 2fr) minmax(160px, 1fr) minmax(140px, 1fr) minmax(140px, 1fr)",
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
                placeholder="Name or email…"
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
              <option value="">All companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted" style={{ marginBottom: 4, display: "block" }}>
              Role
            </label>
            <select
              className="select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">All roles</option>
              <option value="OWNER">Owner</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="AGENT">Agent</option>
              <option value="CHANNEL_PARTNER">Broker</option>
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
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </form>
      </div>

      {/* Users table */}
      <div className="table-wrap">
        <div className="table-toolbar">
          <span className="text-xs text-muted">
            {loading ? "Loading…" : `${total} user${total === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>User</th>
                <th>Company</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      padding: 24,
                      color: "var(--lp-text-muted)",
                    }}
                  >
                    Loading…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      padding: 24,
                      color: "var(--lp-text-muted)",
                    }}
                  >
                    No users match.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="row" style={{ gap: 10, alignItems: "center" }}>
                        <div className="avatar">{fmt.initials(u.name || u.email)}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.name || "—"}</div>
                          <div className="text-xs text-muted">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {u.company ? (
                        <button
                          type="button"
                          className="btn-link"
                          onClick={() => navigate(`/admin/orgs`)}
                          style={{
                            background: "transparent",
                            border: 0,
                            padding: 0,
                            color: "var(--lp-accent)",
                            cursor: "pointer",
                            fontSize: "0.867rem",
                          }}
                        >
                          {u.company.name}
                        </button>
                      ) : (
                        <span className="text-xs text-muted">No company (broker)</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${ROLE_BADGE[u.role] || "badge-muted"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      {u.isActive ? (
                        <span className="badge badge-success">Active</span>
                      ) : (
                        <span className="badge badge-error">Disabled</span>
                      )}
                    </td>
                    <td>
                      {u.lastLoginAt ? (
                        <span className="text-xs">{fmt.ago(u.lastLoginAt)}</span>
                      ) : (
                        <span className="text-xs text-muted">Never</span>
                      )}
                    </td>
                    <td className="text-xs">{u.createdAt ? fmt.date(u.createdAt) : "—"}</td>
                    <td>
                      <div className="row-actions">
                        {u.role !== "SUPER_ADMIN" && u.role !== "PLATFORM_ADMIN" && (
                          <button
                            className="btn-icon btn-ghost"
                            type="button"
                            title={u.isActive ? "Disable user" : "Re-enable user"}
                            onClick={() => handleToggleActive(u)}
                          >
                            {u.isActive ? <Ban size={14} /> : <UserCheck size={14} />}
                          </button>
                        )}
                        {(u.role === "SUPER_ADMIN" || u.role === "PLATFORM_ADMIN") && (
                          <ShieldAlert
                            size={14}
                            style={{ color: "var(--lp-text-muted)" }}
                            aria-label="Protected — platform admin"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
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
