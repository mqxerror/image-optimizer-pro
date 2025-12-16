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
  ChevronDown,
  FileText,
  Search,
  Menu,
  X,
  Shield,
  HelpCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { CommandPalette } from '@/components/CommandPalette'
import { useQueueRealtime } from '@/hooks/useQueueRealtime'
import { usePermissions } from '@/hooks/usePermissions'
import { OrganizationSwitcher } from '@/components/OrganizationSwitcher'
import { GuidedTour } from '@/components/GuidedTour'
import { useTour } from '@/hooks/useTour'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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

import { Permission } from '@/types/roles'

// Navigation item type with optional permission requirement
interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  highlight?: boolean
  tourId?: string
  requiresPermission?: keyof Permission
  ownerOnly?: boolean
}

// Base navigation items with permission requirements
const baseNavigation: NavItem[] = [
  { name: 'Home', href: '/', icon: LayoutDashboard, tourId: 'nav-home' },
  { name: 'Studio', href: '/studio', icon: Wand2, highlight: true, tourId: 'nav-studio', requiresPermission: 'canProcessImages' },
  { name: 'Projects', href: '/projects', icon: FolderKanban, tourId: 'nav-projects', requiresPermission: 'canViewContent' },
  { name: 'Templates', href: '/templates', icon: FileText, tourId: 'nav-templates', requiresPermission: 'canViewContent' },
  { name: 'Shopify', href: '/shopify', icon: Store, tourId: 'nav-shopify', requiresPermission: 'canViewContent' },
  { name: 'Activity', href: '/activity', icon: Activity, tourId: 'nav-activity', requiresPermission: 'canViewContent' },
  { name: 'Settings', href: '/settings', icon: Settings, tourId: 'nav-settings' },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, organization, signOut } = useAuthStore()
  const { isOwner, can } = usePermissions()

  const { startTour, hasCompletedTour } = useTour()

  // Build navigation with optional admin item for owners
  const navigation: NavItem[] = isOwner
    ? [...baseNavigation, { name: 'Admin', href: '/admin', icon: Shield, ownerOnly: true, tourId: 'nav-admin' }]
    : baseNavigation

  // Check if nav item is accessible
  const isNavItemAccessible = (item: NavItem): boolean => {
    if (item.ownerOnly && !isOwner) return false
    if (item.requiresPermission && !can(item.requiresPermission)) return false
    return true
  }

  // Sidebar collapsed state (persisted)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('mainSidebarCollapsed')
    return saved === 'true'
  })

  // Command palette state
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  // Mobile navigation state
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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
      {/* Guided Tour for first-time users */}
      <GuidedTour />

      {/* Command Palette - Press Cmd+K to open */}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />

      {/* Mobile Navigation Sheet */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b border-slate-200 px-6 py-4">
            <SheetTitle className="flex items-center gap-2">
              <ImageIcon className="h-6 w-6 text-primary" />
              <span>Image Optimizer</span>
            </SheetTitle>
          </SheetHeader>

          {/* Organization Switcher */}
          <OrganizationSwitcher collapsed={false} />

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 p-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              const isHighlight = 'highlight' in item && item.highlight
              const isAccessible = isNavItemAccessible(item)

              if (!isAccessible) {
                return (
                  <div
                    key={item.name}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium min-h-[44px] text-slate-400 cursor-not-allowed"
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {item.name}
                    <span className="ml-auto text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">
                      Restricted
                    </span>
                  </div>
                )
              }

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isHighlight
                      ? 'text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200'
                      : 'text-slate-700 hover:bg-slate-100'
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {item.name}
                  {isHighlight && !isActive && (
                    <span className="ml-auto text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded-full">
                      New
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* User section at bottom */}
          <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-4">
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{userEmail}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  setMobileNavOpen(false)
                  navigate('/settings/profile')
                }}
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  setMobileNavOpen(false)
                  navigate('/settings/billing')
                }}
              >
                <Coins className="h-4 w-4 mr-2" />
                Buy Tokens
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="min-h-screen bg-slate-50" data-tour="welcome">
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-primary focus:text-primary font-medium"
        >
          Skip to main content
        </a>

        {/* Sidebar - hidden on mobile, visible on desktop */}
        <div className={cn(
          "hidden md:block md:fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300",
          sidebarCollapsed ? "md:w-16" : "md:w-64"
        )}>
          {/* Header */}
          <div className={cn(
            "flex h-16 items-center border-b border-slate-200",
            sidebarCollapsed ? "justify-center px-2" : "gap-2 px-6"
          )}>
            <ImageIcon className="h-8 w-8 text-primary flex-shrink-0" />
            {!sidebarCollapsed && (
              <span className="text-xl font-semibold">Image Optimizer</span>
            )}
          </div>

          {/* Organization Switcher */}
          <OrganizationSwitcher collapsed={sidebarCollapsed} />

          {/* Toggle button - touch friendly */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              "absolute top-4 -right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border bg-white shadow-sm hover:bg-slate-50 transition-colors",
              "border-slate-200"
            )}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-4 w-4 text-slate-600" />
            ) : (
              <PanelLeftClose className="h-4 w-4 text-slate-600" />
            )}
          </button>

          <nav className={cn(
            "flex flex-col gap-1",
            sidebarCollapsed ? "p-2" : "p-4"
          )}>
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              const isHighlight = 'highlight' in item && item.highlight
              const isAccessible = isNavItemAccessible(item)

              // Disabled state for inaccessible items
              if (!isAccessible) {
                const disabledContent = (
                  <div
                    className={cn(
                      'flex items-center rounded-lg text-sm font-medium min-h-[44px] text-slate-400 cursor-not-allowed',
                      sidebarCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2'
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!sidebarCollapsed && item.name}
                  </div>
                )

                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      {disabledContent}
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.name}</p>
                      <p className="text-xs text-muted-foreground">Requires higher permission</p>
                    </TooltipContent>
                  </Tooltip>
                )
              }

              const linkContent = (
                <Link
                  key={item.name}
                  to={item.href}
                  data-tour={'tourId' in item ? item.tourId : undefined}
                  className={cn(
                    'flex items-center rounded-lg text-sm font-medium transition-colors min-h-[44px]',
                    sidebarCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isHighlight
                      ? 'text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200'
                      : 'text-slate-700 hover:bg-slate-100'
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
            "absolute bottom-0 left-0 right-0 border-t border-slate-200",
            sidebarCollapsed ? "p-2" : "p-4"
          )}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  data-tour="user-menu"
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
                {hasCompletedTour && (
                  <DropdownMenuItem onClick={startTour}>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Restart Tour
                  </DropdownMenuItem>
                )}
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
          sidebarCollapsed ? "md:pl-16" : "md:pl-64"
        )}>
          {/* Top header bar with token balance */}
          <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-slate-200">
            <div className="flex items-center h-14 px-4 md:px-6 gap-2 md:gap-4">
              {/* Hamburger menu - mobile only */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden p-2"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Logo - mobile only */}
              <div className="flex items-center gap-2 md:hidden">
                <ImageIcon className="h-6 w-6 text-primary" />
                <span className="font-semibold text-sm">Image Optimizer</span>
              </div>

              <div className="flex-1" />

              {/* Search / Command Palette Trigger */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCommandPaletteOpen(true)}
                className="gap-2 text-muted-foreground hover:text-foreground w-10 md:w-64 justify-center md:justify-start"
              >
                <Search className="h-4 w-4" />
                <span className="hidden md:block flex-1 text-left">Search...</span>
                <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 md:flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>

              {/* Token Balance Display */}
              {organization && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      data-tour="token-display"
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
