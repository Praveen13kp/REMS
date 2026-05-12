import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckIcon, CopyIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { USER_ROLES, USER_ROLE_VALUES } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

const inviteSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  role: z.enum(USER_ROLE_VALUES, { message: "Select a role" }),
})

function CopyInviteLink({ url }) {
  const [copied, setCopied] = useState(false)

  if (!url) return <span className="text-xs text-muted-foreground">—</span>

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Couldn't copy. Select and copy manually.")
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        readOnly
        value={url}
        className="h-7 text-xs"
        onFocus={(e) => e.currentTarget.select()}
      />
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        onClick={onCopy}
        aria-label="Copy invite link"
      >
        {copied ? (
          <CheckIcon className="size-3.5" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
      </Button>
    </div>
  )
}

export default function OnboardingTeam() {
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchMembers = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await api.get("/users")
      const list = res?.users ?? res?.data?.users ?? res?.data ?? []
      setMembers(Array.isArray(list) ? list : [])
    } catch {
      setMembers([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "AGENT" },
  })

  const onInvite = async (data) => {
    try {
      await api.post("/users/invite", data)
      toast.success(`Invite sent to ${data.email}`)
      reset({ email: "", role: data.role })
      fetchMembers()
    } catch (err) {
      if (err?.status === 409) {
        setError("email", {
          type: "server",
          message: err?.message || "This email is already invited or active",
        })
        return
      }
      toast.error(err?.message || "Failed to send invite")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleSubmit(onInvite)}
        className="flex flex-col gap-4 rounded-lg border border-input bg-background p-4"
      >
        <div>
          <h3 className="text-sm font-semibold">Invite a teammate</h3>
          <p className="text-xs text-muted-foreground">
            They&apos;ll get a one-time link to set their password and join.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_auto]">
          <div className="flex flex-col gap-1.5">
            <Input
              type="email"
              placeholder="teammate@company.com"
              aria-label="Email"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full" aria-label="Role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && (
              <p className="text-xs text-destructive">{errors.role.message}</p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2Icon className="animate-spin" />}
            Send invite
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Team</h3>
        <div className="overflow-hidden rounded-lg border border-input">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name / Email</TableHead>
                <TableHead className="w-28">Role</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead>Invite link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                    No teammates yet. Invite your first one above.
                  </TableCell>
                </TableRow>
              ) : (
                members.map((m) => {
                  const isPending = m.status === "PENDING"
                  return (
                    <TableRow key={m.id ?? m.email}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{m.name || "—"}</span>
                          <span className="text-xs text-muted-foreground">
                            {m.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{m.role}</TableCell>
                      <TableCell>
                        <Badge variant={isPending ? "outline" : "default"}>
                          {isPending ? "Pending" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isPending ? (
                          <CopyInviteLink url={m.inviteUrl || m.inviteLink} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Link
          to="/onboarding/projects"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Skip for now
        </Link>
        <Button onClick={() => navigate("/onboarding/projects")}>
          Continue
        </Button>
      </div>
    </div>
  )
}
