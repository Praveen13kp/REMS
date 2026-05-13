import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import ThemeToggle from './ThemeToggle.jsx'

const navLinks = [
  { href: '/', label: 'Home', section: '#home' },
  { href: '/#features', label: 'Features', section: '#features' },
  { href: '/#pricing', label: 'Pricing', section: '#pricing' },
  { href: '/#contact', label: 'Contact', section: '#contact' }
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 dark:bg-midnight-900/80 backdrop-blur-lg border-b border-ink-200 dark:border-midnight-700'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="container-custom">
        <nav className="flex h-16 sm:h-20 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-grad-brand text-white shadow-soft">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
                <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
              </svg>
            </div>
            <span className="text-lg sm:text-xl font-bold text-ink-900 dark:text-white font-display">
              LeadPro<span className="gradient-text">Realty</span>
            </span>
          </Link>

          <ul className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-ink-700 dark:text-ink-300 hover:text-brand-600 dark:hover:text-brand-300 hover:bg-ink-100 dark:hover:bg-midnight-800 transition-colors"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Link to="/login" className="btn-ghost text-sm">Login</Link>
            <Link to="/signup" className="btn-gradient text-sm py-2.5">Sign Up</Link>
          </div>

          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              aria-label="Toggle menu"
              onClick={() => setMobileOpen((o) => !o)}
              className="inline-flex items-center justify-center h-10 w-10 rounded-lg text-ink-700 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-midnight-800"
            >
              {mobileOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                  <path fillRule="evenodd" d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        </nav>

        {mobileOpen && (
          <div className="md:hidden pb-4 animate-fade-in-up">
            <ul className="flex flex-col gap-1 pt-2 border-t border-ink-200 dark:border-midnight-700">
              {navLinks.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3 rounded-lg text-ink-700 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-midnight-800"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
              <li className="grid grid-cols-2 gap-3 pt-3">
                <Link to="/login" className="btn-secondary text-sm">Login</Link>
                <Link to="/signup" className="btn-gradient text-sm">Sign Up</Link>
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  )
}
