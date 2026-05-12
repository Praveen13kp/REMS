import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"

const pickCompany = (raw) => raw?.company ?? raw?.data?.company ?? raw ?? null

export function useCompany() {
  const [company, setCompany] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCompany = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.get("/company/me")
      setCompany(pickCompany(res))
    } catch (err) {
      setError(err)
      setCompany(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCompany()
  }, [fetchCompany])

  return { company, isLoading, error, refetch: fetchCompany, setCompany }
}
