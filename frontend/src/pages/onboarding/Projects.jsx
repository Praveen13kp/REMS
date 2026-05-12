import { Link, useNavigate } from "react-router-dom"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { PROJECT_TYPES, PROJECT_TYPE_VALUES } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const projectSchema = z.object({
  name: z.string().min(2, "Project name is required"),
  location: z.string().min(1, "Location is required"),
  type: z.enum(PROJECT_TYPE_VALUES, { message: "Select a project type" }),
})

export default function OnboardingProjects() {
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: "", location: "", type: "" },
  })

  const onSubmit = async (data) => {
    try {
      await api.post("/projects", data)
      toast.success("Project added")
      navigate("/onboarding/pipeline")
    } catch (err) {
      toast.error(err?.message || "Failed to create project")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Add your first project</h2>
        <p className="text-sm text-muted-foreground">
          Projects are the properties you&apos;re selling. Leads get tagged
          against them. You can add more later from the Projects page.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">
              Project name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Skyline Heights"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="location">
              Location <span className="text-destructive">*</span>
            </Label>
            <Input
              id="location"
              placeholder="Hinjewadi, Pune"
              aria-invalid={!!errors.location}
              {...register("location")}
            />
            {errors.location && (
              <p className="text-xs text-destructive">
                {errors.location.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="type">
            Type <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="type"
                  className="w-full"
                  aria-invalid={!!errors.type}
                >
                  <SelectValue placeholder="Select a project type" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.type && (
            <p className="text-xs text-destructive">{errors.type.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <Link
            to="/onboarding/pipeline"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Skip for now
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2Icon className="animate-spin" />}
            Add project and continue
          </Button>
        </div>
      </form>
    </div>
  )
}
