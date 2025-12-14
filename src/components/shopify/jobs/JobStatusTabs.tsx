import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { JobStatusTab, JobStatusCount } from './types'

interface JobStatusTabsProps {
  activeTab: JobStatusTab
  onTabChange: (tab: JobStatusTab) => void
  counts: JobStatusCount
}

const tabs: { id: JobStatusTab; label: string; color?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active', color: 'bg-blue-100 text-blue-700' },
  { id: 'paused', label: 'Paused', color: 'bg-orange-100 text-orange-700' },
  { id: 'awaiting_approval', label: 'Approval', color: 'bg-amber-100 text-amber-700' },
  { id: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700' },
  { id: 'failed', label: 'Failed', color: 'bg-red-100 text-red-700' },
]

export function JobStatusTabs({ activeTab, onTabChange, counts }: JobStatusTabsProps) {
  const getCount = (tab: JobStatusTab): number => {
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
              'hover:border-gray-300',
              isActive
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-gray-200 bg-white'
            )}
          >
            <span className={cn(
              'font-medium',
              isActive ? 'text-primary' : 'text-gray-700'
            )}>
              {tab.label}
            </span>
            <Badge
              variant="secondary"
              className={cn(
                'px-2 py-0.5 text-xs font-semibold',
                tab.color && count > 0 ? tab.color : 'bg-gray-100 text-gray-600'
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
