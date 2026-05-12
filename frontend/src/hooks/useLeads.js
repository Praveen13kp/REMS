import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"

export function useLeads(params) {
  const [state, setState] = useState({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    isLoading: true,
    error: null,
  })

  const fetchLeads = useCallback(async (signal) => {
    setState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const res = await api.get("/leads", { params, signal })
      const data = res?.data ?? res ?? {}
      setState({
        items: data.items ?? [],
        total: data.total ?? 0,
        page: data.page ?? 1,
        pageSize: data.pageSize ?? 20,
        isLoading: false,
        error: null,
      })
    } catch (err) {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return
      setState((s) => ({ ...s, isLoading: false, error: err }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)])

  useEffect(() => {
    const ctrl = new AbortController()
    fetchLeads(ctrl.signal)
    return () => ctrl.abort()
  }, [fetchLeads])

  return { ...state, refetch: fetchLeads }
}
