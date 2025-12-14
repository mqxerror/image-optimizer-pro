import { Search, Store, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ShopifyStore } from '@/types/shopify'
import type { JobsFilterState } from './types'

interface JobsToolbarProps {
  filters: JobsFilterState
  onFiltersChange: (filters: Partial<JobsFilterState>) => void
  stores: ShopifyStore[]
  selectionMode: boolean
  selectedCount: number
  onToggleSelectionMode: () => void
  onClearSelection: () => void
}

export function JobsToolbar({
  filters,
  onFiltersChange,
  stores,
  selectionMode,
  selectedCount,
  onToggleSelectionMode,
  onClearSelection
}: JobsToolbarProps) {
  const hasFilters = filters.search || filters.storeId

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-lg border">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search jobs..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ search: e.target.value })}
          className="pl-9"
        />
      </div>

      {/* Store Filter */}
      <Select
        value={filters.storeId || '__all__'}
        onValueChange={(v) => onFiltersChange({ storeId: v === '__all__' ? null : v })}
      >
        <SelectTrigger className="w-[200px]">
          <Store className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="All stores" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All stores</SelectItem>
          {stores.map(store => (
            <SelectItem key={store.id} value={store.id}>
              {store.shop_name || store.shop_domain.split('.')[0]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFiltersChange({ search: '', storeId: null })}
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}

      {/* Divider */}
      <div className="h-8 w-px bg-gray-200" />

      {/* Selection Mode */}
      <Button
        variant={selectionMode ? 'default' : 'outline'}
        size="sm"
        onClick={onToggleSelectionMode}
      >
        {selectionMode ? `${selectedCount} selected` : 'Select'}
      </Button>

      {selectionMode && selectedCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
        >
          Clear selection
        </Button>
      )}
    </div>
  )
}
