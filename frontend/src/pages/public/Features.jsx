import { useEffect } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRightIcon,
  BarChart3Icon,
  BellIcon,
  FlameIcon,
  KanbanIcon,
  LayersIcon,
  MessageSquareIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UploadIcon,
  UserCheckIcon,
  UsersIcon,
  WorkflowIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const SECTIONS = [
  {
    title: "Lead capture & dedup",
    description:
      "Capture leads from websites, ad platforms, walk-ins, and CSV imports. Built-in dedup catches duplicate phone numbers and emails before they pollute your pipeline.",
    items: [
      { icon: UploadIcon, title: "CSV import", blurb: "Bring leads from spreadsheets with dedup + field mapping." },
      { icon: FlameIcon, title: "Hot-lead alerts", blurb: "Get notified the moment a high-intent lead lands." },
      { icon: WorkflowIcon, title: "Public capture form", blurb: "Embed forms on your website that drop straight into the funnel." },
    ],
  },
  {
    title: "Assignment & ownership",
    description:
      "Get leads to the right agent fast. Round-robin, skill-based, or manual — your call.",
    items: [
      { icon: UserCheckIcon, title: "Smart assignment", blurb: "Round-robin or city-based routing, configurable per team." },
      { icon: UsersIcon, title: "Bulk assign", blurb: "Move dozens of leads at once when reorganizing teams." },
      { icon: ShieldCheckIcon, title: "Role-based access", blurb: "OWNER, ADMIN, MANAGER, AGENT — each sees what they should." },
    ],
  },
  {
    title: "Pipeline & follow-ups",
    description:
      "A real-estate–specific pipeline that maps to how your team actually works.",
    items: [
      { icon: KanbanIcon, title: "Kanban + list", blurb: "Switch between board and table without losing context." },
      { icon: LayersIcon, title: "Custom stages", blurb: "Add or rename stages as your sales motion evolves." },
      { icon: BellIcon, title: "Reminders + tasks", blurb: "Never miss a follow-up — system schedules the next touch." },
    ],
  },
  {
    title: "Insights & growth",
    description:
      "See where deals stall, who's performing, and what's working.",
    items: [
      { icon: BarChart3Icon, title: "Role-based dashboards", blurb: "Owner, manager, and agent dashboards tuned to each role." },
      { icon: SparklesIcon, title: "AI lead scoring", blurb: "Score leads on activity, source, and intent signals." },
      { icon: MessageSquareIcon, title: "Activity timeline", blurb: "Every call, note, and stage change in one timeline." },
    ],
  },
]

export default function Features() {
  useEffect(() => {
    document.title = "Features — LeadPro Realty"
  }, [])

  return (
    <>
      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Built for real estate sales
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Every feature is shaped by how brokers, channel partners, and
          developers actually sell. No generic CRM bloat.
        </p>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="flex flex-col gap-16">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <div className="max-w-2xl">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {section.title}
                </h2>
                <p className="mt-3 text-muted-foreground">
                  {section.description}
                </p>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {section.items.map((item) => (
                  <Card key={item.title}>
                    <CardHeader>
                      <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <item.icon className="size-5" />
                      </span>
                      <CardTitle className="mt-3 text-base">
                        {item.title}
                      </CardTitle>
                      <CardDescription>{item.blurb}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>

        <Card className="mt-16 bg-primary/5">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <h3 className="text-2xl font-bold">See it in action</h3>
            <p className="max-w-xl text-muted-foreground">
              Spin up a free workspace and try every feature with your own
              data.
            </p>
            <Button asChild size="lg">
              <Link to="/signup">
                Start free trial <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
