import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  ImageIcon,
  LogOut,
  User,
  Coins,
  Wand2,
  PanelLeftClose,
  PanelLeft,
  Activity,
  Store
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { useQueueRealtime } from '@/hooks/useQueueRealtime'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Consolidated navigation (reduced from 8+ to 5 items)
const navigation = [
  { name: 'Home', href: '/', icon: LayoutDashboard },
  { name: 'Studio', href: '/studio', icon: Wand2, highlight: true, tourId: 'nav-studio' },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Shopify', href: '/shopify', icon: Store },
  { name: 'Activity', href: '/activity', icon: Activity, tourId: 'nav-activity' },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, organization, signOut } = useAuthStore()

  // Sidebar collapsed state (persisted)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('mainSidebarCollapsed')
    return saved === 'true'
  })

  useEffect(() => {
    localStorage.setItem('mainSidebarCollapsed', String(sidebarCollapsed))
  }, [sidebarCollapsed])

  // Global realtime subscription for processing notifications
  // This enables project completion toasts app-wide
  useQueueRealtime({
    showToasts: false, // Disable individual item toasts (e.g., "Image optimized")
    showProjectCompletionToasts: true // Enable project completion toasts
  })

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth/login')
  }

  const userEmail = user?.email || ''
  const userInitials = userEmail.slice(0, 2).toUpperCase()

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar */}
        <div className={cn(
          "fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-64"
        )}>
          {/* Header */}
          <div className={cn(
            "flex h-16 items-center border-b border-gray-200",
            sidebarCollapsed ? "justify-center px-2" : "gap-2 px-6"
          )}>
            <ImageIcon className="h-8 w-8 text-primary flex-shrink-0" />
            {!sidebarCollapsed && (
              <span className="text-xl font-semibold">Image Optimizer</span>
            )}
          </div>

          {/* Organization name - only when expanded */}
          {organization && !sidebarCollapsed && (
            <div className="px-6 py-3 border-b border-gray-100">
              <p className="text-xs text-gray-500">Organization</p>
              <p className="text-sm font-medium truncate">{organization.name}</p>
            </div>
          )}

          {/* Toggle button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              "absolute top-4 -right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-white shadow-sm hover:bg-gray-50 transition-colors",
              "border-gray-200"
            )}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-3 w-3 text-gray-600" />
            ) : (
              <PanelLeftClose className="h-3 w-3 text-gray-600" />
            )}
          </button>

          <nav className={cn(
            "flex flex-col gap-1",
            sidebarCollapsed ? "p-2" : "p-4"
          )}>
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              const isHighlight = 'highlight' in item && item.highlight

              const linkContent = (
                <Link
                  key={item.name}
                  to={item.href}
                  data-tour={'tourId' in item ? item.tourId : undefined}
                  className={cn(
                    'flex items-center rounded-lg text-sm font-medium transition-colors',
                    sidebarCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isHighlight
                      ? 'text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <>
                      {item.name}
                      {isHighlight && !isActive && (
                        <span className="ml-auto text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded-full">
                          New
                        </span>
                      )}
                    </>
                  )}
                </Link>
              )

              // Show tooltip when collapsed
              if (sidebarCollapsed) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {item.name}
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return linkContent
            })}
          </nav>

          {/* User section at bottom */}
          <div className={cn(
            "absolute bottom-0 left-0 right-0 border-t border-gray-200",
            sidebarCollapsed ? "p-2" : "p-4"
          )}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full",
                    sidebarCollapsed ? "justify-center p-2" : "justify-start gap-3 px-3"
                  )}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  {!sidebarCollapsed && (
                    <div className="flex flex-col items-start text-left">
                      <span className="text-sm font-medium truncate max-w-[140px]">
                        {userEmail}
                      </span>
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <User className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Coins className="mr-2 h-4 w-4" />
                  Buy Tokens
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Main content */}
        <div className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "pl-16" : "pl-64"
        )}>
          <main className={cn(
            location.pathname === '/studio' ? '' : 'p-8'
          )}>
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
