import { ThemeProvider } from 'next-themes'
import AppRoutes from '@/routes/AppRoutes'

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AppRoutes />
    </ThemeProvider>
  )
}

export default App
