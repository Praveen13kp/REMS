import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2Icon, UploadCloud } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api"

// Common buckets for Indian real-estate price tiers. Used as datalist
// suggestions so the user can either pick one or type their own range.
const PRICE_RANGE_PRESETS = [
  "Under ₹50 L",
  "₹50 L - ₹1 Cr",
  "₹1 Cr - ₹2 Cr",
  "₹2 Cr - ₹5 Cr",
  "₹5 Cr - ₹10 Cr",
  "Above ₹10 Cr",
]

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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

export default function ProjectFormDialog({ project, open, onOpenChange, onSuccess, createProject, updateProject }) {
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

  // Cover-image upload: piggybacks on the existing tenant-scoped /files
  // module so we don't have to build a separate storage path. Files are
  // tagged with folder="cover-images"; the URL we save is the auth'd
  // inline-download endpoint (cards are only rendered to logged-in users
  // of the same tenant, so auth is fine).
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

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

  useEffect(() => {
    if (open) {
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
    }
  }, [open, project, reset])

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

  const fieldClass = "flex flex-col gap-1.5"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Project" : "New Project"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the project details below."
              : "Fill in the details to create a new project."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className={fieldClass}>
            <label htmlFor="name" className="text-sm font-medium">Name</label>
            <Input id="name" placeholder="Project name" aria-invalid={!!errors.name} {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className={fieldClass}>
            <label htmlFor="location" className="text-sm font-medium">Location</label>
            <Input id="location" placeholder="City, area" aria-invalid={!!errors.location} {...register("location")} />
            {errors.location && <p className="text-xs text-destructive">{errors.location.message}</p>}
          </div>

          <div className={fieldClass}>
            <label htmlFor="type" className="text-sm font-medium">Type</label>
            <Select
              value={selectedType}
              onValueChange={(v) => setValue("type", v, { shouldValidate: true })}
            >
              <SelectTrigger aria-invalid={!!errors.type}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
          </div>

          <div className={fieldClass}>
            <label htmlFor="priceRange" className="text-sm font-medium">Price Range</label>
            {/* datalist gives us a dropdown of presets + free typing in one
                control — no extra component, native browser UX, matches
                the rest of the form. */}
            <Input
              id="priceRange"
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

          <div className={fieldClass}>
            <label htmlFor="description" className="text-sm font-medium">Description</label>
            <Textarea id="description" placeholder="Brief description" {...register("description")} />
          </div>

          <div className={fieldClass}>
            <label htmlFor="reraNumber" className="text-sm font-medium">RERA Number</label>
            <Input id="reraNumber" placeholder="RERA registration number" {...register("reraNumber")} />
          </div>

          <div className={fieldClass}>
            <label htmlFor="possessionDate" className="text-sm font-medium">Possession Date</label>
            <Input id="possessionDate" type="date" {...register("possessionDate")} />
          </div>

          <div className={fieldClass}>
            <label htmlFor="coverImageUrl" className="text-sm font-medium">
              Cover Image
            </label>
            <div className="flex gap-2">
              <Input
                id="coverImageUrl"
                placeholder="Paste an image URL, or upload"
                className="flex-1"
                {...register("coverImageUrl")}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={onPickCoverImage}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2Icon className="animate-spin" size={14} />
                ) : (
                  <UploadCloud size={14} />
                )}
                {uploading ? "Uploading…" : "Upload"}
              </Button>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2Icon className="animate-spin" />}
              {isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}