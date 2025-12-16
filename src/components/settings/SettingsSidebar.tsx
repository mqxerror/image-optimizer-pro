import { NavLink } from 'react-router-dom'
import { User, Building2, CreditCard, Puzzle, Users, Gift } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

interface NavGroup {
  group: string
  items: NavItem[]
}

const settingsNav: NavGroup[] = [
  {
    group: 'Account',
    items: [
      { name: 'Profile', href: '/settings/profile', icon: User }
    ]
  },
  {
    group: 'Organization',
    items: [
      { name: 'General', href: '/settings/organization', icon: Building2 },
      { name: 'Team', href: '/settings/team', icon: Users, badge: 'New' },
      { name: 'Billing & Tokens', href: '/settings/billing', icon: CreditCard }
    ]
  },
  {
    group: 'Developer',
    items: [
      { name: 'Integrations', href: '/settings/integrations', icon: Puzzle }
    ]
  }
]

export function SettingsSidebar() {
  return (
    <nav className="space-y-6">
      {/* Mobile: horizontal scrollable tabs */}
      <div className="md:hidden overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-max">
          {settingsNav.flatMap(group => group.items).map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                  isActive
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Desktop: vertical sidebar */}
      <div className="hidden md:block space-y-6">
        {settingsNav.map((group) => (
          <div key={group.group}>
            <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
              {group.group}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                      isActive
                        ? 'bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 ring-1 ring-purple-200 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        isActive ? "bg-purple-100" : "bg-gray-100"
                      )}>
                        <item.icon className={cn("h-4 w-4", isActive ? "text-purple-600" : "text-gray-500")} />
                      </div>
                      <span className="flex-1">{item.name}</span>
                      {item.badge && (
                        <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>
    </nav>
  )
}
