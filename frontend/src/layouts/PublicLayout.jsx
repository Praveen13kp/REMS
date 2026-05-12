import { useEffect, useState } from "react"
import { Link, NavLink, Outlet, useLocation } from "react-router-dom"
import { ArrowRightIcon, Building2, MenuIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/contact", label: "Contact" },
]

function Brand({ className }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 text-foreground", className)}>
      <span className="inline-flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Building2 className="size-4" />
      </span>
      <span className="font-semibold">LeadPro Realty</span>
    </Link>
  )
}

function PublicNavbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors",
        scrolled
          ? "border-b border-border bg-background/85 backdrop-blur"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Brand />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/signup">
              Get started <ArrowRightIcon className="size-3.5" />
            </Link>
          </Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button size="icon" variant="ghost" aria-label="Open menu">
              <MenuIcon className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[80vw] max-w-sm">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="flex h-full flex-col gap-6 p-6">
              <Brand />
              <nav className="flex flex-col gap-1">
                {NAV_LINKS.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end={l.to === "/"}
                    className={({ isActive }) =>
                      cn(
                        "rounded-md px-3 py-2 text-base font-medium",
                        isActive
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )
                    }
                  >
                    {l.label}
                  </NavLink>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-2">
                <Button asChild variant="outline">
                  <Link to="/login">Log in</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">Get started</Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}

function PublicFooter() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Brand />
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            The smart CRM for real estate sales teams in India and beyond.
            Capture, assign, follow up, and close — all in one place.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Product</h4>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
            <li><Link to="/features" className="hover:text-foreground">Features</Link></li>
            <li><Link to="/pricing" className="hover:text-foreground">Pricing</Link></li>
            <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Company</h4>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
            <li><Link to="/signup" className="hover:text-foreground">Get started</Link></li>
            <li><Link to="/login" className="hover:text-foreground">Log in</Link></li>
          </ul>
        </div>
      </div>
      <Separator />
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
        <span>© 2026 LeadPro Realty. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <span>Privacy</span>
          <span>Terms</span>
          <span>Security</span>
        </div>
      </div>
    </footer>
  )
}

export default function PublicLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <PublicNavbar />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}
