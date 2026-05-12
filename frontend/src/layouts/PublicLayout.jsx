import { Link, NavLink, Outlet, useNavigate } from "react-router-dom"
import { useTheme } from "next-themes"
import { ArrowRight, Building2, Moon, Sun } from "lucide-react"
import { toast } from "sonner"

const NAV_LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/contact", label: "Contact" },
]

function Brand({ onClick }) {
  return (
    <div className="brand" onClick={onClick}>
      <span className="brand-mark">
        <Building2 size={18} />
      </span>
      <span>LeadPro Realty</span>
    </div>
  )
}

function PublicNavbar() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <nav className="public-nav">
      <div className="public-nav-inner">
        <Brand onClick={() => navigate("/")} />
        <div className="nav-links">
          {NAV_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {l.label}
            </NavLink>
          ))}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button
            className="btn-icon btn-ghost"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="btn btn-ghost" onClick={() => navigate("/login")}>
            Login
          </button>
          <button className="btn btn-primary" onClick={() => navigate("/signup")}>
            Sign Up <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </nav>
  )
}

function PublicFooter() {
  const navigate = useNavigate()
  const stub = (label) => toast.info(`${label} coming soon`)
  return (
    <footer className="public-footer">
      <div className="footer-inner">
        <div>
          <Brand onClick={() => navigate("/")} />
          <p className="text-muted text-sm" style={{ maxWidth: 300, marginTop: 14 }}>
            The smart CRM for real estate sales teams in India and beyond.
            Capture, assign, follow up, and close — all in one place.
          </p>
        </div>
        <div>
          <h4>Product</h4>
          <ul>
            <li><Link to="/features">Features</Link></li>
            <li><Link to="/pricing">Pricing</Link></li>
            <li><a onClick={() => stub("Changelog")}>Changelog</a></li>
            <li><a onClick={() => stub("Roadmap")}>Roadmap</a></li>
          </ul>
        </div>
        <div>
          <h4>Company</h4>
          <ul>
            <li><Link to="/contact">Contact</Link></li>
            <li><a onClick={() => stub("About")}>About</a></li>
            <li><a onClick={() => stub("Blog")}>Blog</a></li>
            <li><a onClick={() => stub("Careers")}>Careers</a></li>
          </ul>
        </div>
        <div>
          <h4>Stay Updated</h4>
          <p className="text-muted text-sm" style={{ marginBottom: 10 }}>
            Monthly newsletter, no spam.
          </p>
          <div className="row">
            <input className="input" placeholder="email@company.com" style={{ flex: 1 }} />
            <button className="btn btn-primary btn-sm" onClick={() => toast.success("Subscribed!")}>
              Subscribe
            </button>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div>© 2026 LeadPro Realty. All rights reserved.</div>
        <div className="row" style={{ gap: 18 }}>
          <a onClick={() => stub("Privacy")}>Privacy</a>
          <a onClick={() => stub("Terms")}>Terms</a>
          <a onClick={() => stub("Security")}>Security</a>
        </div>
      </div>
    </footer>
  )
}

export default function PublicLayout() {
  return (
    <div className="leadpro-scope" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicNavbar />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}
