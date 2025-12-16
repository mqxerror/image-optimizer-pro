import { useState } from 'react'
import { Check, ChevronsUpDown, Building2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useAuthStore, UserOrganizationWithOrg } from '@/stores/auth'
import { useToast } from '@/hooks/use-toast'
import { ROLE_LABELS } from '@/types/roles'
import type { OrganizationRole } from '@/types/roles'

interface OrganizationSwitcherProps {
  collapsed?: boolean
}

export function OrganizationSwitcher({ collapsed = false }: OrganizationSwitcherProps) {
  const { organization, userOrganizations, setOrganization } = useAuthStore()
  const { toast } = useToast()
  const [isSwitching, setIsSwitching] = useState(false)

  const handleSwitchOrg = async (membership: UserOrganizationWithOrg) => {
    if (!membership.organizations || membership.organizations.id === organization?.id) return

    setIsSwitching(true)

    // Small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 300))

    setOrganization(membership.organizations)
    setIsSwitching(false)

    toast({
      title: 'Organization switched',
      description: `Now viewing ${membership.organizations.name}`,
    })
  }

  // Don't render if no organization or only one org (simplified view)
  if (!organization) return null

  const currentMembership = userOrganizations.find(
    (uo) => uo.organization_id === organization.id
  )
  const currentRole = (currentMembership?.role || 'member') as OrganizationRole
  const hasMultipleOrgs = userOrganizations.length > 1

  // Single org - just show static display
  if (!hasMultipleOrgs) {
    if (collapsed) {
      return (
        <div className="px-2 py-3 border-b border-gray-100">
          <div className="h-10 w-10 mx-auto rounded-lg bg-gray-100 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-gray-600" />
          </div>
        </div>
      )
    }

    return (
      <div className="px-6 py-3 border-b border-gray-100">
        <p className="text-xs text-gray-500">Organization</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm font-medium truncate">{organization.name}</span>
          <Badge variant="outline" className="text-xs flex-shrink-0">
            {ROLE_LABELS[currentRole] || currentRole}
          </Badge>
        </div>
      </div>
    )
  }

  // Multiple orgs - show switcher
  // Collapsed state - just show icon with tooltip
  if (collapsed) {
    return (
      <div className="px-2 py-3 border-b border-gray-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 mx-auto"
              disabled={isSwitching}
            >
              {isSwitching ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Building2 className="h-5 w-5" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-64">
            <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {userOrganizations.map((membership) => {
              const org = membership.organizations
              if (!org) return null
              const isActive = org.id === organization.id
              const role = (membership.role || 'member') as OrganizationRole
              return (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => handleSwitchOrg(membership)}
                  className={cn(
                    "flex items-center justify-between cursor-pointer",
                    isActive && "bg-gray-50"
                  )}
                  disabled={isSwitching}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{org.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {ROLE_LABELS[role] || role}
                    </Badge>
                    {isActive && <Check className="h-4 w-4 text-primary" />}
                  </div>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  // Expanded state - full display
  return (
    <div className="px-6 py-3 border-b border-gray-100">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "w-full text-left hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20",
              isSwitching && "opacity-70 pointer-events-none"
            )}
            disabled={isSwitching}
          >
            <p className="text-xs text-gray-500">Organization</p>
            <div className="flex items-center justify-between mt-0.5">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {isSwitching ? (
                  <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                ) : null}
                <span className="text-sm font-medium truncate">{organization.name}</span>
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {ROLE_LABELS[currentRole] || currentRole}
                </Badge>
              </div>
              <ChevronsUpDown className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {userOrganizations.map((membership) => {
            const org = membership.organizations
            if (!org) return null
            const isActive = org.id === organization.id
            const role = (membership.role || 'member') as OrganizationRole
            return (
              <DropdownMenuItem
                key={org.id}
                onClick={() => handleSwitchOrg(membership)}
                className={cn(
                  'flex items-center justify-between cursor-pointer',
                  isActive && 'bg-gray-50'
                )}
                disabled={isSwitching}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{org.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {ROLE_LABELS[role] || role}
                  </Badge>
                  {isActive && <Check className="h-4 w-4 text-primary" />}
                </div>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
