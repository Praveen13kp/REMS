import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Moon, Sun, Search, Bell, LogOut, User, CheckCheck } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import { fmt } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Poll cadence for the bell badge + dropdown. 15s strikes a balance between
// "feels instant for incoming intake leads" and "doesn't hammer the BE for
// long-idle tabs". We also refetch on tab focus, when the panel opens, and
// after a mark-as-read so the count never lags the dropdown contents.
// True realtime requires SSE/WebSockets — out of scope for now.
const POLL_MS = 15_000
const PANEL_LIMIT = 6

function useNotifications(enabled) {
  const [count, setCount] = useState(0)
  const [items, setItems] = useState([])

  const refresh = useCallback(async () => {
    if (!enabled) return
    try {
      const [countRes, listRes] = await Promise.all([
        api.get('/notifications/unread-count'),
        api.get('/notifications', { params: { pageSize: PANEL_LIMIT } }),
      ])
      setCount(Number(countRes?.count ?? countRes?.data?.count ?? 0) || 0)
      const list = listRes?.items ?? listRes?.data?.items ?? listRes?.data ?? []
      setItems(Array.isArray(list) ? list : [])
    } catch {
      // ignore — keeps last value, retries on next tick
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return undefined
    refresh()
    const id = setInterval(refresh, POLL_MS)
    const onFocus = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('focus', refresh)
    }
  }, [enabled, refresh])

  // Optimistic local mutations so the UI is snappy; refresh() reconciles
  // with BE on the next tick if anything diverges.
  const markRead = useCallback(
    async (id) => {
      setItems((cur) => cur.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)))
      setCount((c) => Math.max(0, c - 1))
      try {
        await api.patch(`/notifications/${id}/read`)
      } catch {
        refresh()
      }
    },
    [refresh],
  )

  const markAllRead = useCallback(async () => {
    setItems((cur) => cur.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })))
    setCount(0)
    try {
      await api.patch('/notifications/read-all')
    } catch {
      refresh()
    }
  }, [refresh])

  return { count, items, refresh, markRead, markAllRead }
}

function Navbar() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const { user, signOut } = useAuthStore()
  const { count: unread, items, refresh, markRead, markAllRead } = useNotifications(!!user?.id)
  const [panelOpen, setPanelOpen] = useState(false)
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  // When the panel opens, force-refresh so the user sees the freshest list
  // even if the next poll tick is 14 seconds away.
  const handleOpenChange = (open) => {
    setPanelOpen(open)
    if (open) refresh()
  }

  const handleItemClick = (n) => {
    if (!n.readAt) markRead(n.id)
    setPanelOpen(false)
    if (n.link) navigate(n.link)
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">
          {user?.company ?? 'RELMS'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="h-8 w-48 rounded-lg pl-8 text-sm"
          />
        </div>

        <Popover open={panelOpen} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="relative"
              aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
            >
              <Bell className="size-4" />
              {unread > 0 && (
                <span
                  className="absolute -top-1 -right-1 inline-flex min-w-[16px] h-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-background"
                  aria-hidden="true"
                >
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-sm font-semibold">
                Notifications{unread > 0 ? ` (${unread})` : ''}
              </span>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <CheckCheck className="size-3" /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                  You're all caught up.
                </div>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleItemClick(n)}
                    className={`flex w-full items-start gap-2 border-b border-border/60 px-3 py-2 text-left hover:bg-muted/50 ${
                      n.readAt ? '' : 'bg-muted/30'
                    }`}
                  >
                    {!n.readAt && (
                      <span className="mt-1.5 inline-block size-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                    )}
                    <div className={`flex-1 min-w-0 ${n.readAt ? 'pl-3' : ''}`}>
                      <div className="text-xs font-medium truncate">{n.title}</div>
                      {n.body && (
                        <div className="text-xs text-muted-foreground truncate">{n.body}</div>
                      )}
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {fmt.ago(n.createdAt)}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="border-t border-border px-3 py-2 text-center">
              <Link
                to="/notifications"
                onClick={() => setPanelOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                View all notifications
              </Link>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="rounded-full">
              <Avatar size="sm">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user?.name}</span>
                <span className="text-xs text-muted-foreground">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export default Navbar
