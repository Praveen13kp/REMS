import { useState, useCallback } from "react"
import { api } from "@/lib/api"

export function useProjects() {
  const [state, setState] = useState({
    projects: [],
    total: 0,
    page: 1,
    pageSize: 20,
    loading: false,
    error: null,
  })

  const fetchProjects = useCallback(async (params = {}) => {
    const { search, type, page = 1, pageSize = 20 } = params
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const res = await api.get("/projects", { params: { search, type, page, pageSize } })
      setState({
        projects: res.data.items,
        total: res.data.total,
        page: res.data.page,
        pageSize: res.data.pageSize,
        loading: false,
        error: null,
      })
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err }))
    }
  }, [])

  const createProject = useCallback(async (data) => {
    const res = await api.post("/projects", data)
    return res.data
  }, [])

  const updateProject = useCallback(async (id, data) => {
    const res = await api.patch("/projects/" + id, data)
    return res.data
  }, [])

  const deleteProject = useCallback(async (id) => {
    await api.delete("/projects/" + id)
  }, [])

  return {
    ...state,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  }
}