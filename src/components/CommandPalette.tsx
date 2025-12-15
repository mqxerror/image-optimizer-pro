import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Wand2,
  FolderKanban,
  Store,
  Activity,
  Settings,
  User,
  CreditCard,
  Puzzle,
  Building2,
  FileText,
  Search,
  Plus,
  LogOut
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from '@/components/ui/command'
import { useAuthStore } from '@/stores/auth'

interface CommandItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  keywords?: string[]
  group: 'navigation' | 'actions' | 'settings' | 'account'
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { signOut } = useAuthStore()

  // Handle keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const runCommand = useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  const commands: CommandItem[] = useMemo(() => [
    // Navigation
    {
      id: 'home',
      label: 'Go to Dashboard',
      icon: LayoutDashboard,
      action: () => navigate('/'),
      keywords: ['home', 'dashboard', 'overview'],
      group: 'navigation'
    },
    {
      id: 'studio',
      label: 'Go to Studio',
      icon: Wand2,
      action: () => navigate('/studio'),
      keywords: ['studio', 'ai', 'edit', 'enhance'],
      group: 'navigation'
    },
    {
      id: 'projects',
      label: 'Go to Projects',
      icon: FolderKanban,
      action: () => navigate('/projects'),
      keywords: ['projects', 'folders', 'images'],
      group: 'navigation'
    },
    {
      id: 'shopify',
      label: 'Go to Shopify',
      icon: Store,
      action: () => navigate('/shopify'),
      keywords: ['shopify', 'store', 'ecommerce'],
      group: 'navigation'
    },
    {
      id: 'activity',
      label: 'Go to Activity',
      icon: Activity,
      action: () => navigate('/activity'),
      keywords: ['activity', 'queue', 'history', 'processing'],
      group: 'navigation'
    },
    {
      id: 'templates',
      label: 'Go to Templates',
      icon: FileText,
      action: () => navigate('/templates'),
      keywords: ['templates', 'prompts', 'presets'],
      group: 'navigation'
    },

    // Actions
    {
      id: 'new-project',
      label: 'Create New Project',
      icon: Plus,
      action: () => navigate('/projects'),
      keywords: ['new', 'create', 'project', 'add'],
      group: 'actions'
    },

    // Settings
    {
      id: 'settings-profile',
      label: 'Profile Settings',
      icon: User,
      action: () => navigate('/settings/profile'),
      keywords: ['profile', 'account', 'avatar', 'name'],
      group: 'settings'
    },
    {
      id: 'settings-org',
      label: 'Organization Settings',
      icon: Building2,
      action: () => navigate('/settings/organization'),
      keywords: ['organization', 'org', 'company', 'team'],
      group: 'settings'
    },
    {
      id: 'settings-billing',
      label: 'Billing & Tokens',
      icon: CreditCard,
      action: () => navigate('/settings/billing'),
      keywords: ['billing', 'tokens', 'purchase', 'credits', 'payment'],
      group: 'settings'
    },
    {
      id: 'settings-integrations',
      label: 'Integrations',
      icon: Puzzle,
      action: () => navigate('/settings/integrations'),
      keywords: ['integrations', 'google drive', 'connect'],
      group: 'settings'
    },

    // Account
    {
      id: 'sign-out',
      label: 'Sign Out',
      icon: LogOut,
      action: async () => {
        await signOut()
        navigate('/auth/login')
      },
      keywords: ['logout', 'sign out', 'exit'],
      group: 'account'
    }
  ], [navigate, signOut])

  const navigationCommands = commands.filter(c => c.group === 'navigation')
  const actionCommands = commands.filter(c => c.group === 'actions')
  const settingsCommands = commands.filter(c => c.group === 'settings')
  const accountCommands = commands.filter(c => c.group === 'account')

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {navigationCommands.map((command) => (
            <CommandItem
              key={command.id}
              onSelect={() => runCommand(command.action)}
              className="gap-2"
            >
              <command.icon className="h-4 w-4" />
              {command.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          {actionCommands.map((command) => (
            <CommandItem
              key={command.id}
              onSelect={() => runCommand(command.action)}
              className="gap-2"
            >
              <command.icon className="h-4 w-4" />
              {command.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Settings">
          {settingsCommands.map((command) => (
            <CommandItem
              key={command.id}
              onSelect={() => runCommand(command.action)}
              className="gap-2"
            >
              <command.icon className="h-4 w-4" />
              {command.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Account">
          {accountCommands.map((command) => (
            <CommandItem
              key={command.id}
              onSelect={() => runCommand(command.action)}
              className="gap-2"
            >
              <command.icon className="h-4 w-4" />
              {command.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
