import { useCallback, useEffect, useState } from "react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useTheme } from "next-themes"
import { ArrowRight, Building2, Moon, Sun } from "lucide-react"
import ScrollToTopButton from "@/components/common/ScrollToTopButton"

const NAV_LINKS = [
  { to: "/", section: "home", label: "Home" },
  { to: "/features", section: "features", label: "Features" },
  { to: "/pricing", section: "pricing", label: "Pricing" },
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
  const location = useLocation()
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"
  const isLanding = location.pathname === "/"
  const [activeSection, setActiveSection] = useState("home")

  const scrollToSection = useCallback(
    (section) => {
      const target = document.getElementById(section)
      if (!target) return

      setActiveSection(section)
      target.scrollIntoView({ behavior: "smooth", block: "start" })
    },
    [],
  )

  useEffect(() => {
    if (!isLanding) {
      const current = NAV_LINKS.find((l) => l.to === location.pathname)
      setActiveSection(current?.section || "")
      return
    }

    const pendingSection = window.sessionStorage.getItem("landing-section")
    if (pendingSection) {
      window.sessionStorage.removeItem("landing-section")
      window.requestAnimationFrame(() => scrollToSection(pendingSection))
    }

    const sections = NAV_LINKS
      .map((l) => document.getElementById(l.section))
      .filter(Boolean)

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        if (visible?.target?.id) {
          setActiveSection(visible.target.id)
        }
      },
      {
        root: null,
        rootMargin: "-28% 0px -52% 0px",
        threshold: [0.15, 0.3, 0.5, 0.7],
      },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [isLanding, location.pathname, scrollToSection])

  const handleNav = (link) => {
    if (isLanding) {
      scrollToSection(link.section)
      return
    }

    window.sessionStorage.setItem("landing-section", link.section)
    navigate("/")
  }

  return (
    <nav className="public-nav">
      <div className="public-nav-inner">
        <Brand onClick={() => navigate("/")} />
        <div className="nav-links">
          {NAV_LINKS.map((l) => (
            <button
              key={l.section}
              type="button"
              className={activeSection === l.section ? "active" : ""}
              onClick={() => handleNav(l)}
            >
              {l.label}
            </button>
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
            <li><Link to="/changelog">Changelog</Link></li>
            <li><Link to="/roadmap">Roadmap</Link></li>
          </ul>
        </div>
        <div>
          <h4>Company</h4>
          <ul>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/blog">Blog</Link></li>
            <li><Link to="/careers">Careers</Link></li>
          </ul>
        </div>
        <div>
          <h4>Legal</h4>
          <ul>
            <li><Link to="/privacy">Privacy</Link></li>
            <li><Link to="/terms">Terms</Link></li>
            <li><Link to="/security">Security</Link></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <div>© 2026 LeadPro Realty. All rights reserved.</div>
        <div className="row" style={{ gap: 18 }}>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/security">Security</Link>
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
      <ScrollToTopButton />
    </div>
  )
}
