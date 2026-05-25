import { LogOut, Settings as SettingsIcon, User, HelpCircle, X } from "lucide-react"
import { roleLabel } from "@/lib/format"
import UserAvatar from "@/components/common/UserAvatar"

export default function ProfileModal({ user, onClose, onNavigate, onSignOut }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Account</h3>
          <button className="btn-icon btn-ghost" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="row" style={{ gap: 14, marginBottom: 18 }}>
            <UserAvatar user={user} size="lg" />
            <div>
              <div style={{ fontWeight: 600 }}>{user?.name}</div>
              <div className="text-muted text-sm">{user?.email}</div>
              <span className="badge badge-info" style={{ marginTop: 4 }}>
                {roleLabel(user?.role)}
              </span>
            </div>
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <button className="nav-item" onClick={() => onNavigate("/profile")}>
              <User size={16} /><span>My Profile</span>
            </button>
            <button className="nav-item" onClick={() => onNavigate("/settings")}>
              <SettingsIcon size={16} /><span>Settings</span>
            </button>
            <button className="nav-item" onClick={onClose}>
              <HelpCircle size={16} /><span>Help & Docs</span>
            </button>
            <button className="nav-item" style={{ color: "var(--lp-error)" }} onClick={onSignOut}>
              <LogOut size={16} /><span>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
