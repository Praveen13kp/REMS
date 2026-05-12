import axios from "axios"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
  withCredentials: true,
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const data = err.response?.data?.error ?? { message: err.message }
    const payload = { ...data, status: err.response?.status }
    return Promise.reject(payload)
  }
)

export { api }
