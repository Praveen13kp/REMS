// Temporary smoke-test page for S0-FE-A-03. Renders one of every shadcn
// primitive listed in docs/STATIC-UI-MAP.md so reviewers can confirm the
// map is real. DELETE THIS FILE when S0-FE-A-02 lands the real app shell.

import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { fmt, priorityCls, statusCls, roleLabel } from "@/lib/format"

const sampleLeads = [
  { id: "ld_1001", name: "Aarav Sharma", priority: "Hot", status: "New", budget: 8500000, createdAt: Date.now() - 1000 * 60 * 30 },
  { id: "ld_1002", name: "Priya Patel", priority: "Warm", status: "Interested", budget: 12500000, createdAt: Date.now() - 1000 * 60 * 60 * 26 },
  { id: "ld_1003", name: "Rohan Singh", priority: "Cold", status: "Lost", budget: 6500000, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5 },
]

export default function UiCheck() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">UI primitives smoke test</h1>
        <p className="text-sm text-muted-foreground">
          Temporary — see <code>docs/STATIC-UI-MAP.md</code>. Removed when S0-FE-A-02 lands.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button size="sm">Small</Button>
          <Button size="icon" variant="ghost" aria-label="icon">
            ×
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Badges (priority + status via lib/format)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {["Hot", "Warm", "Cold"].map((p) => (
            <Badge key={p} variant={priorityCls(p)}>
              {p}
            </Badge>
          ))}
          {["New", "Interested", "Booked", "Lost"].map((s) => (
            <Badge key={s} variant={statusCls(s)}>
              {s}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Form primitives</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Lead name" />
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="cold">Cold</SelectItem>
            </SelectContent>
          </Select>
          <Textarea placeholder="Notes" className="md:col-span-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Table + format helpers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleLeads.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.name}</TableCell>
                  <TableCell>
                    <Badge variant={priorityCls(l.priority)}>{l.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusCls(l.status)}>{l.status}</Badge>
                  </TableCell>
                  <TableCell>{fmt.inr(l.budget)}</TableCell>
                  <TableCell>{fmt.ago(l.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-4 text-xs text-muted-foreground">
            roleLabel('super_admin') → <strong>{roleLabel("super_admin")}</strong> ·
            fmt.date(now) → <strong>{fmt.date(Date.now())}</strong> ·
            fmt.initials('Priya Patel') → <strong>{fmt.initials("Priya Patel")}</strong>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dialog + Sonner toast</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Sample dialog</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Replaces the static build's <code>modal-backdrop</code> stack.
              </p>
              <DialogFooter>
                <Button>OK</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={() => toast.success("Toast fired from sonner")}>
            Fire toast
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
