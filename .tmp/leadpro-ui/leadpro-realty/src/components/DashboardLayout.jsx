import { useState } from 'react'
import { Outlet, Link } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import ThemeToggle from './ThemeToggle.jsx'

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-midnight-900 text-ink-900 dark:text-ink-100">
      <div className="flex">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 min-w-0 flex flex-col">
          <header className="sticky top-0 z-20 bg-white/80 dark:bg-midnight-850/80 backdrop-blur border-b border-ink-200 dark:border-midnight-700">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-midnight-700" aria-label="Open sidebar">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <div className="hidden md:block relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" /></svg>
                  <input placeholder="Search leads, agents, projects..." className="pl-10 pr-4 py-2 w-64 lg:w-80 rounded-xl bg-ink-100 dark:bg-midnight-800 border border-transparent focus:border-brand-400 focus:bg-white dark:focus:bg-midnight-700 outline-none text-sm" />
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <ThemeToggle />
                <button className="relative p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-midnight-700" aria-label="Notifications">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .53-.21 1.04-.59 1.41L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-accent-500 ring-2 ring-white dark:ring-midnight-850" />
                </button>
                <Link to="/" className="hidden sm:flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-ink-100 dark:hover:bg-midnight-700">
                  <span className="h-8 w-8 rounded-full bg-grad-brand flex items-center justify-center text-white text-sm font-bold">RK</span>
                  <span className="text-sm font-medium hidden md:inline">Rohan K.</span>
                </Link>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
