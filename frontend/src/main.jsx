import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// Restore persisted appearance preferences before first render (no flash).
;(function restoreAppearance() {
  const size = localStorage.getItem('lp-text-size') || 'default'
  document.documentElement.setAttribute('data-text-size', size)

  const hex = localStorage.getItem('lp-accent-hex')
  if (hex) {
    const n = parseInt(hex.slice(1), 16)
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
    const lighten = (c, a) => Math.min(255, Math.round(c + (255 - c) * a))
    const darken  = (c, a) => Math.round(c * (1 - a))
    const toHex = (...cs) => '#' + cs.map(v => v.toString(16).padStart(2, '0')).join('')
    document.documentElement.style.setProperty('--lp-accent', hex)
    document.documentElement.style.setProperty('--lp-accent-2',      toHex(lighten(r,.2), lighten(g,.2), lighten(b,.2)))
    document.documentElement.style.setProperty('--lp-accent-strong', toHex(darken(r,.1),  darken(g,.1),  darken(b,.1)))
    document.documentElement.style.setProperty('--lp-accent-deep',   toHex(darken(r,.2),  darken(g,.2),  darken(b,.2)))
  }
})()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
