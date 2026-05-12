import { useEffect } from "react"
import { Link } from "react-router-dom"
import { CheckIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    cadence: "forever",
    cta: "Start free",
    ctaTo: "/signup",
    description: "Try the product end-to-end. No credit card.",
    features: [
      { label: "Up to 100 leads", included: true },
      { label: "2 team members", included: true },
      { label: "Lead capture + manual assignment", included: true },
      { label: "Basic pipeline (5 stages)", included: true },
      { label: "Kanban board + reports", included: false },
      { label: "WhatsApp / call logging", included: false },
      { label: "Priority support", included: false },
    ],
  },
  {
    name: "Growth",
    price: "₹2,999",
    cadence: "/month",
    cta: "Get Growth",
    ctaTo: "/signup",
    description: "For small teams scaling sales operations.",
    featured: true,
    features: [
      { label: "Unlimited leads", included: true },
      { label: "Up to 10 team members", included: true },
      { label: "Auto-assignment + AI lead scoring", included: true },
      { label: "Full Kanban + 9-stage pipeline", included: true },
      { label: "WhatsApp / call logging", included: true },
      { label: "CSV import / export", included: true },
      { label: "Priority support", included: false },
    ],
  },
  {
    name: "Scale",
    price: "Custom",
    cadence: "",
    cta: "Talk to sales",
    ctaTo: "/contact",
    description: "For agencies and brokerages with many offices.",
    features: [
      { label: "Unlimited everything", included: true },
      { label: "Multi-region tenancy", included: true },
      { label: "SSO + audit log", included: true },
      { label: "Custom integrations", included: true },
      { label: "Dedicated CSM + onboarding", included: true },
      { label: "99.9% SLA", included: true },
      { label: "Priority support", included: true },
    ],
  },
]

export default function Pricing() {
  useEffect(() => {
    document.title = "Pricing — LeadPro Realty"
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-muted-foreground">
          Start free, upgrade when your team grows. No hidden fees.
        </p>
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-3 md:items-stretch">
        {PLANS.map((plan) => (
          <Card
            key={plan.name}
            className={cn(
              "flex flex-col",
              plan.featured && "border-primary shadow-lg",
            )}
          >
            <CardHeader>
              {plan.featured && <Badge className="w-fit">Most popular</Badge>}
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                {plan.cadence && (
                  <span className="text-sm text-muted-foreground">
                    {plan.cadence}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {plan.description}
              </p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-6">
              <ul className="flex flex-col gap-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f.label} className="flex items-start gap-2">
                    {f.included ? (
                      <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    ) : (
                      <XIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
                    )}
                    <span
                      className={cn(
                        !f.included && "text-muted-foreground/70",
                      )}
                    >
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant={plan.featured ? "default" : "outline"}
                className="mt-auto w-full"
              >
                <Link to={plan.ctaTo}>{plan.cta}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-16 text-center">
        <h3 className="text-lg font-semibold">Need something different?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          We build custom plans for large agencies and developers.
        </p>
        <Button asChild variant="link" className="mt-2">
          <Link to="/contact">Talk to sales →</Link>
        </Button>
      </div>
    </div>
  )
}
