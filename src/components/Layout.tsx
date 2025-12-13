import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  ListTodo,
  History,
  Settings,
  ImageIcon,
  LogOut,
  User,
  Coins,
  Wand2
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

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Studio', href: '/studio', icon: Wand2, highlight: true, tourId: 'nav-studio' },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Templates', href: '/templates', icon: FileText },
  { name: 'Queue', href: '/queue', icon: ListTodo, tourId: 'nav-queue' },
  { name: 'History', href: '/history', icon: History, tourId: 'nav-history' },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, organization, signOut } = useAuthStore()

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
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200">
        <div className="flex h-16 items-center gap-2 px-6 border-b border-gray-200">
          <ImageIcon className="h-8 w-8 text-primary" />
          <span className="text-xl font-semibold">Image Optimizer</span>
        </div>

        {/* Organization name */}
        {organization && (
          <div className="px-6 py-3 border-b border-gray-100">
            <p className="text-xs text-gray-500">Organization</p>
            <p className="text-sm font-medium truncate">{organization.name}</p>
          </div>
        )}

        <nav className="flex flex-col gap-1 p-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            const isHighlight = 'highlight' in item && item.highlight
            return (
              <Link
                key={item.name}
                to={item.href}
                data-tour={'tourId' in item ? item.tourId : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isHighlight
                    ? 'text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <item.icon className="h-5 w-5" />
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
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 px-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium truncate max-w-[140px]">
                    {userEmail}
                  </span>
                </div>
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
      <div className="pl-64">
        <main className={cn(
          location.pathname === '/studio' ? '' : 'p-8'
        )}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
