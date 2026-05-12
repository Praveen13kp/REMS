import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"

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
            <Input id="priceRange" placeholder="e.g. Rs 50L - Rs 1.5Cr" {...register("priceRange")} />
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
            <label htmlFor="coverImageUrl" className="text-sm font-medium">Cover Image URL</label>
            <Input id="coverImageUrl" placeholder="https://..." {...register("coverImageUrl")} />
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