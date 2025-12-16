import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type ProjectStatusTab = 'all' | 'draft' | 'active' | 'completed' | 'archived'

export interface ProjectStatusCount {
  all: number
  draft: number
  active: number
  completed: number
  archived: number
}

interface ProjectStatusTabsProps {
  activeTab: ProjectStatusTab
  onTabChange: (tab: ProjectStatusTab) => void
  counts: ProjectStatusCount
}

const tabs: { id: ProjectStatusTab; label: string; color?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  { id: 'active', label: 'Active', color: 'bg-blue-100 text-blue-700' },
  { id: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700' },
  { id: 'archived', label: 'Archived', color: 'bg-slate-100 text-slate-500' },
]

export function ProjectStatusTabs({ activeTab, onTabChange, counts }: ProjectStatusTabsProps) {
  const getCount = (tab: ProjectStatusTab): number => {
    return counts[tab] || 0
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map(tab => {
        const count = getCount(tab.id)
        const isActive = activeTab === tab.id

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all',
              'hover:border-slate-300',
              isActive
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-slate-200 bg-white'
            )}
          >
            <span className={cn(
              'font-medium',
              isActive ? 'text-primary' : 'text-slate-700'
            )}>
              {tab.label}
            </span>
            <Badge
              variant="secondary"
              className={cn(
                'px-2 py-0.5 text-xs font-semibold',
                tab.color && count > 0 ? tab.color : 'bg-slate-100 text-slate-600'
              )}
            >
              {count}
            </Badge>
          </button>
        )
      })}
    </div>
  )
}
