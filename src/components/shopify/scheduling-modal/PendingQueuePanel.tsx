import { useState } from 'react'
import {
  ListOrdered,
  Search,
  ChevronUp,
  ChevronDown,
  Minus,
  X,
  Play,
  Ban,
  ImageIcon,
  Webhook,
  Calendar,
  Hand
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { PendingQueuePanelProps, QueueItem } from './types'

const sourceIcons: Record<string, typeof Webhook> = {
  webhook: Webhook,
  scheduled: Calendar,
  manual: Hand
}

const sourceLabels: Record<string, string> = {
  webhook: 'Webhook',
  scheduled: 'Scheduled',
  manual: 'Manual'
}

const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
  high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  normal: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  low: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' }
}

type SourceFilter = 'all' | 'webhook' | 'scheduled' | 'manual'

export function PendingQueuePanel({
  items,
  isLoading,
  filters,
  onFiltersChange,
  onPriorityChange,
  onExclude,
  onRemove,
  onProcess
}: PendingQueuePanelProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchValue, setSearchValue] = useState(filters.search || '')

  const pendingItems = items.filter(i => i.status === 'pending')

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pendingItems.map(i => i.id)))
    }
  }

  const handleSearch = () => {
    onFiltersChange({ ...filters, search: searchValue })
  }

  const handleSourceFilter = (source: SourceFilter) => {
    onFiltersChange({
      ...filters,
      source: source === 'all' ? null : source
    })
  }

  const handlePriorityChange = (priority: 'high' | 'normal' | 'low') => {
    if (selectedIds.size === 0) return
    onPriorityChange(Array.from(selectedIds), priority)
    setSelectedIds(new Set())
  }

  const handleExclude = () => {
    if (selectedIds.size === 0) return
    onExclude(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  const handleRemove = () => {
    if (selectedIds.size === 0) return
    onRemove(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  const handleProcess = () => {
    if (selectedIds.size === 0) return
    onProcess(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  const activeSource = filters.source || 'all'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListOrdered className="h-5 w-5 text-amber-600" />
          <h3 className="font-semibold">Pending Queue</h3>
          <Badge variant="secondary">{pendingItems.length}</Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Source filter tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {(['all', 'webhook', 'scheduled', 'manual'] as const).map(source => (
            <button
              key={source}
              onClick={() => handleSourceFilter(source)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                activeSource === source
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {source === 'all' ? 'All' : sourceLabels[source]}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9 h-9"
            />
          </div>
        </div>
      </div>

      {/* Selection actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm text-blue-700 font-medium">
            {selectedIds.size} selected
          </span>
          <div className="flex-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7">
                Set Priority
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handlePriorityChange('high')}>
                <ChevronUp className="h-4 w-4 mr-2 text-red-600" />
                High
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePriorityChange('normal')}>
                <Minus className="h-4 w-4 mr-2 text-slate-600" />
                Normal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePriorityChange('low')}>
                <ChevronDown className="h-4 w-4 mr-2 text-blue-600" />
                Low
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={handleExclude}
          >
            <Ban className="h-3.5 w-3.5 mr-1.5" />
            Exclude
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-red-600 hover:text-red-700"
            onClick={handleRemove}
          >
            <X className="h-3.5 w-3.5 mr-1.5" />
            Remove
          </Button>

          <Button
            size="sm"
            className="h-7"
            onClick={handleProcess}
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Process Now
          </Button>
        </div>
      )}

      {/* Queue list */}
      <div className="border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 border-b text-xs font-medium text-muted-foreground">
          <Checkbox
            checked={selectedIds.size === pendingItems.length && pendingItems.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <span className="flex-1">Product</span>
          <span className="w-20 text-center">Source</span>
          <span className="w-20 text-center">Priority</span>
          <span className="w-16 text-center">Images</span>
          <span className="w-8" />
        </div>

        {/* Items */}
        <div className="max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : pendingItems.length > 0 ? (
            pendingItems.map(item => (
              <QueueRow
                key={item.id}
                item={item}
                isSelected={selectedIds.has(item.id)}
                onSelect={() => toggleSelect(item.id)}
                onRemove={() => onRemove([item.id])}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ListOrdered className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm text-muted-foreground">Queue is empty</p>
              <p className="text-xs text-muted-foreground mt-1">
                Products will appear here when added via triggers
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface QueueRowProps {
  item: QueueItem
  isSelected: boolean
  onSelect: () => void
  onRemove: () => void
}

function QueueRow({ item, isSelected, onSelect, onRemove }: QueueRowProps) {
  const SourceIcon = sourceIcons[item.source] || Hand
  const priorityStyle = priorityColors[item.priority] || priorityColors.normal

  return (
    <div className={cn(
      'flex items-center gap-4 px-4 py-3 border-b last:border-b-0 transition-colors',
      isSelected && 'bg-blue-50/50'
    )}>
      <Checkbox
        checked={isSelected}
        onCheckedChange={onSelect}
      />

      {/* Product info */}
      <div className="flex-1 flex items-center gap-3 min-w-0">
        {item.thumbnail_url ? (
          <img
            src={item.thumbnail_url}
            alt=""
            className="w-10 h-10 object-cover rounded border"
          />
        ) : (
          <div className="w-10 h-10 bg-slate-100 rounded border flex items-center justify-center">
            <ImageIcon className="h-4 w-4 text-slate-400" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {item.product_title || 'Untitled Product'}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {item.product_handle}
          </p>
        </div>
      </div>

      {/* Source */}
      <div className="w-20 flex justify-center">
        <Badge variant="outline" className="text-xs px-1.5">
          <SourceIcon className="h-3 w-3 mr-1" />
          {sourceLabels[item.source]}
        </Badge>
      </div>

      {/* Priority */}
      <div className="w-20 flex justify-center">
        <Badge
          variant="outline"
          className={cn(
            'text-xs px-1.5 capitalize',
            priorityStyle.bg,
            priorityStyle.text,
            priorityStyle.border
          )}
        >
          {item.priority}
        </Badge>
      </div>

      {/* Image count */}
      <div className="w-16 text-center text-sm text-muted-foreground">
        {item.image_count}
      </div>

      {/* Actions */}
      <div className="w-8">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-red-600"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
