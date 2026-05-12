import { Link } from 'react-router-dom'

const socials = [
  { label: 'Twitter', svg: <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" /> },
  { label: 'LinkedIn', svg: <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" /> },
  { label: 'Facebook', svg: <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" /> },
  { label: 'Instagram', svg: <path d="M7 2C4.243 2 2 4.243 2 7v10c0 2.757 2.243 5 5 5h10c2.757 0 5-2.243 5-5V7c0-2.757-2.243-5-5-5H7zm0 2h10c1.654 0 3 1.346 3 3v10c0 1.654-1.346 3-3 3H7c-1.654 0-3-1.346-3-3V7c0-1.654 1.346-3 3-3zm10.5 1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/> }
]

export default function Footer() {
  return (
    <footer className="bg-ink-50 dark:bg-midnight-850 border-t border-ink-200 dark:border-midnight-700">
      <div className="container-custom py-14 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-grad-brand text-white shadow-soft">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
                  <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-ink-900 dark:text-white font-display">
                LeadPro<span className="gradient-text">Realty</span>
              </span>
            </Link>
            <p className="mt-4 text-sm text-ink-600 dark:text-ink-400 max-w-sm">
              The vertical CRM built for real estate. Capture leads, score them with AI, and close more deals.
            </p>
            <div className="mt-5 flex items-center gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-midnight-800 border border-ink-200 dark:border-midnight-700 text-ink-600 dark:text-ink-400 hover:text-brand-600 dark:hover:text-brand-300 hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">{s.svg}</svg>
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-ink-900 dark:text-white uppercase tracking-wider">Quick Links</h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li><a href="#" className="text-ink-600 dark:text-ink-400 hover:text-brand-600 dark:hover:text-brand-300">About</a></li>
              <li><a href="/#features" className="text-ink-600 dark:text-ink-400 hover:text-brand-600 dark:hover:text-brand-300">Features</a></li>
              <li><a href="/#pricing" className="text-ink-600 dark:text-ink-400 hover:text-brand-600 dark:hover:text-brand-300">Pricing</a></li>
              <li><a href="/#contact" className="text-ink-600 dark:text-ink-400 hover:text-brand-600 dark:hover:text-brand-300">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-ink-900 dark:text-white uppercase tracking-wider">Resources</h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li><a href="#" className="text-ink-600 dark:text-ink-400 hover:text-brand-600 dark:hover:text-brand-300">Documentation</a></li>
              <li><a href="#" className="text-ink-600 dark:text-ink-400 hover:text-brand-600 dark:hover:text-brand-300">Help Center</a></li>
              <li><a href="#" className="text-ink-600 dark:text-ink-400 hover:text-brand-600 dark:hover:text-brand-300">API Reference</a></li>
              <li><a href="#" className="text-ink-600 dark:text-ink-400 hover:text-brand-600 dark:hover:text-brand-300">System Status</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-ink-900 dark:text-white uppercase tracking-wider">Contact</h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="text-ink-600 dark:text-ink-400">support@leadprorealty.com</li>
              <li className="text-ink-600 dark:text-ink-400">+1 (555) 234-7890</li>
              <li className="text-ink-600 dark:text-ink-400">San Francisco, CA</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-ink-200 dark:border-midnight-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-ink-500 dark:text-ink-400">
            &copy; {new Date().getFullYear()} LeadPro Realty. All rights reserved.
          </p>
          <p className="text-sm text-ink-500 dark:text-ink-400">Made for real estate teams worldwide</p>
        </div>
      </div>
    </footer>
  )
}
