import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
  Store,
  CreditCard,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { CommandPalette } from '@/components/CommandPalette'
import { useQueueRealtime } from '@/hooks/useQueueRealtime'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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

  // Fetch token balance for header display
  const { data: tokenAccount } = useQuery({
    queryKey: ['token-account', organization?.id],
    queryFn: async () => {
      if (!organization) return null
      const { data } = await supabase
        .from('token_accounts')
        .select('balance, low_balance_threshold')
        .eq('organization_id', organization.id)
        .single()
      return data
    },
    enabled: !!organization,
    staleTime: 30000, // Cache for 30 seconds
  })

  const isLowBalance = tokenAccount && (tokenAccount.balance || 0) <= (tokenAccount.low_balance_threshold || 5)

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth/login')
  }

  const userEmail = user?.email || ''
  const userInitials = userEmail.slice(0, 2).toUpperCase()

  return (
    <TooltipProvider>
      {/* Command Palette - Press Cmd+K to open */}
      <CommandPalette />

      <div className="min-h-screen bg-gray-50">
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-primary focus:text-primary font-medium"
        >
          Skip to main content
        </a>

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
                <DropdownMenuItem onClick={() => navigate('/settings/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings/billing')}>
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
          {/* Top header bar with token balance */}
          <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200">
            <div className="flex items-center justify-end h-14 px-6 gap-4">
              {/* Token Balance Display */}
              {organization && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "gap-2 font-medium",
                        isLowBalance && "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      )}
                      aria-live="polite"
                    >
                      <Coins className={cn("h-4 w-4", isLowBalance ? "text-amber-600" : "text-purple-600")} />
                      <span className="tabular-nums">{tokenAccount?.balance ?? '...'}</span>
                      <span className="text-muted-foreground text-xs">tokens</span>
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-64 p-4">
                    <div className="space-y-4">
                      <div>
                        <p className="text-2xl font-bold">{tokenAccount?.balance ?? 0}</p>
                        <p className="text-sm text-muted-foreground">tokens available</p>
                      </div>

                      {isLowBalance && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                          Low balance! Purchase more tokens to continue processing.
                        </div>
                      )}

                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Quick Purchase</p>
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-col h-auto py-2"
                            onClick={() => navigate('/settings/billing')}
                          >
                            <span className="font-semibold">+10</span>
                            <span className="text-xs text-muted-foreground">$10</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-col h-auto py-2 border-purple-200 bg-purple-50"
                            onClick={() => navigate('/settings/billing')}
                          >
                            <span className="font-semibold">+50</span>
                            <span className="text-xs text-muted-foreground">$45</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-col h-auto py-2"
                            onClick={() => navigate('/settings/billing')}
                          >
                            <span className="font-semibold">+100</span>
                            <span className="text-xs text-muted-foreground">$90</span>
                          </Button>
                        </div>
                      </div>

                      <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        onClick={() => navigate('/settings/billing')}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        View All Packages
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </header>

          <main
            id="main-content"
            className={cn(
              location.pathname === '/studio' ? '' : 'p-8'
            )}
          >
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
