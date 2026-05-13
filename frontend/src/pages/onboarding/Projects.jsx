import { Link, useNavigate } from "react-router-dom"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { PROJECT_TYPES, PROJECT_TYPE_VALUES } from "@/lib/constants"

const projectSchema = z.object({
  name: z.string().min(2, "Project name is required"),
  location: z.string().min(1, "Location is required"),
  type: z.enum(PROJECT_TYPE_VALUES, { message: "Select a project type" }),
})

const errStyle = { color: "var(--lp-error)", fontSize: 12, marginTop: 4 }

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
    <div className="stack">
      <div>
        <h2 style={{ fontSize: 18, marginBottom: 6 }}>
          Add your first project
        </h2>
        <p className="text-muted" style={{ fontSize: 14 }}>
          Projects are the properties you&apos;re selling. Leads get tagged
          against them. You can add more later from the Projects page.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="stack" noValidate>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          <div className="field">
            <label htmlFor="name">
              Project name <span className="req">*</span>
            </label>
            <input
              id="name"
              className="input"
              placeholder="Skyline Heights"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && <div style={errStyle}>{errors.name.message}</div>}
          </div>

          <div className="field">
            <label htmlFor="location">
              Location <span className="req">*</span>
            </label>
            <input
              id="location"
              className="input"
              placeholder="Hinjewadi, Pune"
              aria-invalid={!!errors.location}
              {...register("location")}
            />
            {errors.location && (
              <div style={errStyle}>{errors.location.message}</div>
            )}
          </div>
        </div>

        <div className="field">
          <label htmlFor="type">
            Type <span className="req">*</span>
          </label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <select
                id="type"
                className="select"
                aria-invalid={!!errors.type}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
              >
                <option value="" disabled>
                  Select a project type
                </option>
                {PROJECT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            )}
          />
          {errors.type && <div style={errStyle}>{errors.type.message}</div>}
        </div>

        <div className="row row-between">
          <Link to="/onboarding/pipeline" className="btn btn-ghost">
            Skip for now
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving…" : "Add project and continue"}
          </button>
        </div>
      </form>
    </div>
  )
}
