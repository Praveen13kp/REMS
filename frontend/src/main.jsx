import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// Restore persisted text-size before first render (no flash). Brand
// accent is intentionally NOT restored here — it's per-company and
// gets applied by App.jsx once the session resolves, so we don't
// briefly paint the previous tenant's colour into a new one.
;(function restoreAppearance() {
  const size = localStorage.getItem('lp-text-size') || 'default'
  document.documentElement.setAttribute('data-text-size', size)
})()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
