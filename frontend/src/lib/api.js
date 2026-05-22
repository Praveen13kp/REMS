import axios from "axios"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
  withCredentials: true,
})

// Custom window event the PlanLimitModal listens to. Dispatched whenever the
// backend returns 402 with a structured plan-limit payload, so any 402 from
// anywhere in the app surfaces the same upgrade prompt without each caller
// reimplementing the flow.
const PLAN_LIMIT_EVENT = "relms:plan-limit"

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const body = err.response?.data
    const data =
      body?.error ??
      (body?.message || body?.code ? { message: body.message, code: body.code } : null) ??
      { message: err.message }
    const status = err.response?.status
    const payload = { ...data, status }

    // 402 is the plan-cap / feature-locked path. Surface it as a global
    // event so the PlanLimitModal can render an upgrade prompt with the
    // resource, current count, and limit from the BE payload.
    if (
      status === 402 &&
      (data?.code === "PLAN_LIMIT_EXCEEDED" ||
        data?.code === "PLAN_FEATURE_LOCKED" ||
        data?.code === "TRIAL_EXPIRED")
    ) {
      payload.isPlanLimit = true
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(PLAN_LIMIT_EVENT, { detail: payload }),
        )
      }
    }

    return Promise.reject(payload)
  },
)

export { PLAN_LIMIT_EVENT }

export { api }
