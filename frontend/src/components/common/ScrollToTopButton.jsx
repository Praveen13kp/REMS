import { useEffect, useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

// Floating scroll-helper button. Smart-toggles direction based on where the
// user is on the page:
//   - Near the top of a long page → down arrow, jumps to bottom
//   - Scrolled past the threshold → up arrow, jumps to top
// On short pages (nothing to scroll) it stays hidden entirely.

export default function ScrollToTopButton({ threshold = 480 }) {
  const [visible, setVisible] = useState(false)
  // "up" → show up-arrow (we are scrolled down, button jumps to top)
  // "down" → show down-arrow (we are near top, button jumps to bottom)
  const [direction, setDirection] = useState("down")

  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY
      const viewport = window.innerHeight
      const docHeight = document.documentElement.scrollHeight
      const scrollable = docHeight - viewport

      // Hide on short pages where there's nothing to scroll.
      if (scrollable < threshold) {
        setVisible(false)
        return
      }

      // Within ~80px of the bottom → also hide (no useful action left).
      const atBottom = scrollY >= scrollable - 80
      if (atBottom) {
        setVisible(false)
        return
      }

      setVisible(true)
      // Past the threshold from the top → user is "deep", offer up arrow.
      setDirection(scrollY > threshold ? "up" : "down")
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [threshold])

  const onClick = () => {
    if (direction === "up") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth",
      })
    }
  }

  const label = direction === "up" ? "Scroll to top" : "Scroll to bottom"

  return (
    <button
      type="button"
      className={`scroll-top-btn ${visible ? "show" : ""}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {direction === "up" ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
    </button>
  )
}
