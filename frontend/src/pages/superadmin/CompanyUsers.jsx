import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
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
  ArrowLeft,
} from "lucide-react"

import { adminService } from "@/services/adminService"
import { fmt } from "@/lib/format"

// Drill-in view of a single company's users. Reached from the Orgs page
// row action. Same shape as PlatformUsers but scoped to one companyId
// (the company filter dropdown is hidden — it's locked to the org).

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

export default function CompanyUsers() {
  const navigate = useNavigate()
  const { id: companyId } = useParams()
  const [company, setCompany] = useState(null)
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const load = async (p = page) => {
    setLoading(true)
    try {
      const data = await adminService.getUsers({
        page: p,
        pageSize: PAGE_SIZE,
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        companyId,
      })
      setUsers(data?.items || [])
      setTotal(data?.total || 0)
    } catch (err) {
      toast.error(err?.message || "Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  // Pull the company so we can show its name in the header.
  useEffect(() => {
    adminService
      .getCompany(companyId)
      .then((res) => setCompany(res ?? null))
      .catch(() => {})
  }, [companyId])

  useEffect(() => {
    load(1)
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, statusFilter, companyId])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  )

  const goPage = (p) => {
    if (p < 1 || p > totalPages) return
    setPage(p)
    load(p)
  }

  const toggleActive = async (u) => {
    try {
      await adminService.patchUser(u.id, { isActive: !u.isActive })
      toast.success(u.isActive ? "User deactivated" : "User activated")
      load(page)
    } catch (err) {
      toast.error(err?.message || "Failed to update user")
    }
  }

  return (
    <>
      <div className="content-head">
        <div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate("/admin/orgs")}
            style={{ marginBottom: 8 }}
          >
            <ArrowLeft size={14} /> Back to Organisations
          </button>
          <h1 style={{ margin: 0 }}>
            {company?.name || "Company"} · Users
          </h1>
          <p className="text-muted text-sm" style={{ marginTop: 4 }}>
            {total.toLocaleString("en-IN")}{" "}
            {total === 1 ? "user" : "users"} in this organisation
          </p>
        </div>
        <div className="row">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => load(page)}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <div className="topbar-search">
            <Search size={16} />
            <input
              value={search}
              placeholder="Search by name or email…"
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") load(1)
              }}
            />
          </div>
          <select
            className="select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ width: "auto" }}
          >
            <option value="">All roles</option>
            <option value="OWNER">Owner</option>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="AGENT">Agent</option>
            <option value="CHANNEL_PARTNER">Broker</option>
          </select>
          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: "auto" }}
          >
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>

        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Joined</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: "32px 12px",
                      textAlign: "center",
                      color: "var(--lp-text-muted)",
                    }}
                  >
                    Loading users…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: "32px 12px",
                      textAlign: "center",
                      color: "var(--lp-text-muted)",
                    }}
                  >
                    No users in this organisation yet.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="row">
                        <div className="avatar sm">
                          {fmt.initials(u.name || u.email || "?")}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.name || "—"}</div>
                          <div className="text-xs text-muted">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${ROLE_BADGE[u.role] || "badge-muted"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>{u.dept || "—"}</td>
                    <td>
                      {u.isActive ? (
                        <span className="badge badge-success">
                          <CheckCircle2 size={12} /> Active
                        </span>
                      ) : (
                        <span className="badge badge-error">
                          <ShieldAlert size={12} /> Disabled
                        </span>
                      )}
                    </td>
                    <td>{u.lastLoginAt ? fmt.ago(u.lastLoginAt) : "—"}</td>
                    <td>{u.createdAt ? fmt.date(u.createdAt) : "—"}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn-icon btn-ghost"
                          title={u.isActive ? "Deactivate" : "Activate"}
                          onClick={() => toggleActive(u)}
                        >
                          {u.isActive ? <Ban size={14} /> : <UserCheck size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div
            className="row"
            style={{
              justifyContent: "space-between",
              padding: "12px 16px",
              borderTop: "1px solid var(--lp-border)",
            }}
          >
            <div className="text-sm text-muted">
              Page {page} of {totalPages} · {total} users
            </div>
            <div className="row" style={{ gap: 4 }}>
              <button
                type="button"
                className="btn-icon btn-ghost"
                onClick={() => goPage(page - 1)}
                disabled={page === 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="btn-icon btn-ghost"
                onClick={() => goPage(page + 1)}
                disabled={page === totalPages}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
