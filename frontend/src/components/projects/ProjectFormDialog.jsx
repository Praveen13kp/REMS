import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2Icon, UploadCloud, X } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api"

const PRICE_RANGE_PRESETS = [
  "Under Rs 50 L",
  "Rs 50 L - Rs 1 Cr",
  "Rs 1 Cr - Rs 2 Cr",
  "Rs 2 Cr - Rs 5 Cr",
  "Rs 5 Cr - Rs 10 Cr",
  "Above Rs 10 Cr",
]

const PROJECT_TYPES = [
  { value: "RESIDENTIAL", label: "Residential" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "PLOT", label: "Plot" },
  { value: "VILLA", label: "Villa" },
  { value: "MIXED", label: "Mixed" },
]

const projectSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(120),
  location: z.string().min(1, "Location is required"),
  type: z.enum(["RESIDENTIAL", "COMMERCIAL", "PLOT", "VILLA", "MIXED"], {
    required_error: "Type is required",
  }),
  priceRange: z.string().optional(),
  description: z.string().optional(),
  reraNumber: z.string().optional(),
  possessionDate: z.string().optional(),
  coverImageUrl: z.string().optional(),
})

export default function ProjectFormDialog({
  project,
  open,
  onOpenChange,
  onSuccess,
  createProject,
  updateProject,
}) {
  const isEdit = !!project

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      location: "",
      type: undefined,
      priceRange: "",
      description: "",
      reraNumber: "",
      possessionDate: "",
      coverImageUrl: "",
    },
  })

  const selectedType = watch("type")
  const coverImageUrl = watch("coverImageUrl")
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!open) return
    if (project) {
      reset({
        name: project.name || "",
        location: project.location || "",
        type: project.type || undefined,
        priceRange: project.priceRange || "",
        description: project.description || "",
        reraNumber: project.reraNumber || "",
        possessionDate: project.possessionDate
          ? project.possessionDate.split("T")[0]
          : "",
        coverImageUrl: project.coverImageUrl || "",
      })
    } else {
      reset({
        name: "",
        location: "",
        type: undefined,
        priceRange: "",
        description: "",
        reraNumber: "",
        possessionDate: "",
        coverImageUrl: "",
      })
    }
  }, [open, project, reset])

  const onPickCoverImage = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick an image file")
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("folder", "cover-images")
      const res = await api.post("/files", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      const fileId = res?.data?.id || res?.id
      if (!fileId) throw new Error("Upload returned no id")
      const url = `${API_BASE.replace(/\/$/, "")}/files/${fileId}/download?inline=true`
      setValue("coverImageUrl", url, { shouldDirty: true })
      toast.success("Cover image uploaded")
    } catch (err) {
      if (err?.status === 413) toast.error("Image too large (10 MB max)")
      else if (err?.status === 415) toast.error("Unsupported image type")
      else toast.error(err?.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await updateProject(project.id, data)
        toast.success("Project updated")
      } else {
        await createProject(data)
        toast.success("Project created")
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toast.error(err?.message || "Something went wrong")
    }
  }

  const close = () => {
    if (!isSubmitting) onOpenChange(false)
  }

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={close}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-form-title"
      >
        <div className="modal-head">
          <div>
            <h3 id="project-form-title">{isEdit ? "Edit Project" : "New Project"}</h3>
            <p style={{ marginTop: 4, color: "var(--lp-text-muted)", fontSize: "0.9rem" }}>
              {isEdit
                ? "Update the project details below."
                : "Fill in the details to create a new project."}
            </p>
          </div>
          <button
            type="button"
            className="btn-icon btn-ghost"
            onClick={close}
            disabled={isSubmitting}
            aria-label="Close project form"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "contents" }}>
          <div className="modal-body">
            <FieldError name="name" label="Name" error={errors.name?.message}>
              <input
                id="name"
                className="input"
                placeholder="Project name"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
            </FieldError>

            <FieldError name="location" label="Location" error={errors.location?.message}>
              <input
                id="location"
                className="input"
                placeholder="City, area"
                aria-invalid={!!errors.location}
                {...register("location")}
              />
            </FieldError>

            <FieldError name="type" label="Type" error={errors.type?.message}>
              <select
                id="type"
                className="select"
                value={selectedType || ""}
                onChange={(e) => setValue("type", e.target.value, { shouldValidate: true })}
                aria-invalid={!!errors.type}
              >
                <option value="" disabled>Select type</option>
                {PROJECT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </FieldError>

            <div className="field">
              <label htmlFor="priceRange">Price Range</label>
              <input
                id="priceRange"
                className="input"
                list="priceRange-options"
                placeholder="Pick a range or type your own"
                {...register("priceRange")}
              />
              <datalist id="priceRange-options">
                {PRICE_RANGE_PRESETS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            <div className="field">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                className="textarea"
                placeholder="Brief description"
                rows={3}
                {...register("description")}
              />
            </div>

            <div className="field">
              <label htmlFor="reraNumber">RERA Number</label>
              <input
                id="reraNumber"
                className="input"
                placeholder="RERA registration number"
                {...register("reraNumber")}
              />
            </div>

            <div className="field">
              <label htmlFor="possessionDate">Possession Date</label>
              <input id="possessionDate" className="input" type="date" {...register("possessionDate")} />
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="coverImageUrl">Cover Image</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  id="coverImageUrl"
                  className="input"
                  placeholder="Paste an image URL, or upload"
                  style={{ flex: 1 }}
                  {...register("coverImageUrl")}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={onPickCoverImage}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2Icon className="animate-spin" size={14} />
                  ) : (
                    <UploadCloud size={14} />
                  )}
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
              {coverImageUrl && (
                <img
                  src={coverImageUrl}
                  alt="Cover preview"
                  style={{
                    marginTop: 8,
                    maxHeight: 120,
                    borderRadius: 8,
                    objectFit: "cover",
                    border: "1px solid var(--lp-border)",
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                  }}
                />
              )}
            </div>
          </div>

          <div className="modal-foot">
            <button type="button" className="btn btn-secondary" onClick={close} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting && <Loader2Icon className="animate-spin" size={14} />}
              {isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FieldError({ name, label, error, children }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      {children}
      {error && <p style={{ color: "var(--lp-error)", fontSize: "0.8rem" }}>{error}</p>}
    </div>
  )
}
