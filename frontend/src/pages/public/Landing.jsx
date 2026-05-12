import { useEffect } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  FlameIcon,
  ListChecksIcon,
  MessageSquareIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const FEATURES = [
  {
    icon: FlameIcon,
    title: "AI lead scoring",
    blurb: "Hot prospects bubble to the top automatically based on activity and intent signals.",
  },
  {
    icon: UsersIcon,
    title: "Smart assignment",
    blurb: "Round-robin or skill-based routing so leads reach the right agent in seconds.",
  },
  {
    icon: ListChecksIcon,
    title: "Pipeline + Kanban",
    blurb: "Visualize every deal stage. Drag to move, with full audit history per lead.",
  },
  {
    icon: MessageSquareIcon,
    title: "Calls & WhatsApp logging",
    blurb: "Every conversation tied to the right lead. No more sticky-note follow-ups.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Role-based access",
    blurb: "Owners, admins, managers, agents — everyone sees exactly what they should.",
  },
  {
    icon: SparklesIcon,
    title: "Multi-tenant SaaS",
    blurb: "Built for agencies, brokerages, and developers — your data, your workspace.",
  },
]

const PRICING_TEASER = [
  { name: "Starter", price: "Free", perks: ["Up to 100 leads", "2 team members"] },
  { name: "Growth", price: "₹2,999/mo", perks: ["Unlimited leads", "10 team members", "Kanban + reports"], featured: true },
  { name: "Scale", price: "Custom", perks: ["Unlimited team", "SSO + audit log", "Priority support"] },
]

export default function Landing() {
  useEffect(() => {
    document.title = "LeadPro Realty — Real estate lead management"
  }, [])

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 -right-20 size-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute top-40 -left-20 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:items-center lg:py-32">
          <div className="flex flex-col gap-6 text-center lg:text-left">
            <Badge variant="secondary" className="mx-auto w-fit gap-2 lg:mx-0">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              Multi-tenant SaaS CRM for Real Estate
            </Badge>

            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Manage leads. Close deals.{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Grow
              </span>{" "}
              your real estate business.
            </h1>

            <p className="mx-auto max-w-xl text-lg text-muted-foreground lg:mx-0">
              A smart lead management platform for brokers, builders, and real
              estate sales teams. Capture, score, assign, and convert — all in
              one workspace.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Button asChild size="lg">
                <Link to="/signup">
                  Get started <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/features">See features</Link>
              </Button>
            </div>

            <ul className="mx-auto grid max-w-md gap-3 text-sm text-foreground sm:grid-cols-2 lg:mx-0">
              {["Easy lead tracking", "Smart assignment", "Role-based access", "AI lead scoring"].map((b) => (
                <li key={b} className="flex items-center justify-center gap-2 lg:justify-start">
                  <CheckCircle2Icon className="size-4 shrink-0 text-emerald-500" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: simplified dashboard preview */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <Card className="overflow-hidden shadow-xl">
              <div className="flex items-center gap-1.5 border-b border-border bg-muted px-4 py-3">
                <span className="size-3 rounded-full bg-red-400" />
                <span className="size-3 rounded-full bg-yellow-400" />
                <span className="size-3 rounded-full bg-green-400" />
                <span className="ml-3 truncate text-xs text-muted-foreground">
                  app.leadprorealty.io/dashboard
                </span>
              </div>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Welcome back</p>
                    <h3 className="text-base font-bold">Sales Dashboard</h3>
                  </div>
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    RK
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "New leads", value: "247" },
                    { label: "Hot leads", value: "38" },
                    { label: "Booked", value: "12" },
                  ].map((k) => (
                    <div key={k.label} className="rounded-lg bg-muted p-3">
                      <p className="text-[10px] font-medium text-muted-foreground">{k.label}</p>
                      <p className="text-xl font-bold">{k.value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold">Bookings — last 7 days</p>
                    <span className="text-xs font-medium text-emerald-500">+24%</span>
                  </div>
                  <div className="flex h-16 items-end gap-1.5">
                    {[40, 65, 50, 80, 60, 95, 75].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-gradient-to-t from-primary to-primary/60"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything your sales team needs
            </h2>
            <p className="mt-4 text-muted-foreground">
              Built specifically for real estate workflows — from first call to
              final booking.
            </p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title}>
                <CardHeader>
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="size-5" />
                  </span>
                  <CardTitle className="mt-3 text-base">{f.title}</CardTitle>
                  <CardDescription>{f.blurb}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-muted-foreground">
              Start free. Upgrade when your team grows.
            </p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {PRICING_TEASER.map((p) => (
              <Card
                key={p.name}
                className={p.featured ? "border-primary shadow-lg" : ""}
              >
                <CardHeader>
                  {p.featured && (
                    <Badge className="w-fit">Most popular</Badge>
                  )}
                  <CardTitle>{p.name}</CardTitle>
                  <p className="text-2xl font-bold">{p.price}</p>
                </CardHeader>
                <CardContent>
                  <ul className="flex flex-col gap-2 text-sm">
                    {p.perks.map((perk) => (
                      <li key={perk} className="flex items-center gap-2">
                        <CheckCircle2Icon className="size-4 text-emerald-500" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <Button asChild variant="outline">
              <Link to="/pricing">See full pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border bg-primary/5">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to close more deals?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Set up your workspace in five minutes. No credit card required.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild size="lg">
              <Link to="/signup">
                Get started free <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
