import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const adminNav = [
  { name: 'Overview', href: '/admin', icon: LayoutDashboard },
  { name: 'Members', href: '/admin/members', icon: Users },
]

export function AdminSidebar() {
  return (
    <nav className="space-y-1">
      {adminNav.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.href === '/admin'}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )
          }
        >
          <item.icon className="h-4 w-4" />
          {item.name}
        </NavLink>
      ))}
    </nav>
  )
}
