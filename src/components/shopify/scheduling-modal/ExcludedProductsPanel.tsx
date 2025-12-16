import { useState } from 'react'
import { Ban, Undo2, ImageIcon, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { ExcludedProductsPanelProps, ExcludedProduct } from './types'

export function ExcludedProductsPanel({
  products,
  isLoading,
  onRestore
}: ExcludedProductsPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  const handleRestore = () => {
    if (selectedIds.size === 0) return
    // Get the shopify_product_ids for the selected items
    const productIds = products
      .filter(p => selectedIds.has(p.id))
      .map(p => p.shopify_product_id)
    onRestore(productIds)
    setSelectedIds(new Set())
  }

  if (products.length === 0 && !isLoading) {
    return null
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between px-4 py-2 h-auto"
        >
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium">Excluded Products</span>
            <Badge variant="secondary" className="text-xs">
              {products.length}
            </Badge>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border rounded-lg mt-2">
          {/* Selection actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 border-b">
              <span className="text-sm text-blue-700 font-medium">
                {selectedIds.size} selected
              </span>
              <div className="flex-1" />
              <Button
                size="sm"
                variant="outline"
                className="h-7"
                onClick={handleRestore}
              >
                <Undo2 className="h-3.5 w-3.5 mr-1.5" />
                Restore to Queue
              </Button>
            </div>
          )}

          {/* List */}
          <div className="max-h-48 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2].map(i => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              products.map(product => (
                <ExcludedRow
                  key={product.id}
                  product={product}
                  isSelected={selectedIds.has(product.id)}
                  onSelect={() => toggleSelect(product.id)}
                  onRestore={() => onRestore([product.shopify_product_id])}
                />
              ))
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

interface ExcludedRowProps {
  product: ExcludedProduct
  isSelected: boolean
  onSelect: () => void
  onRestore: () => void
}

function ExcludedRow({ product, isSelected, onSelect, onRestore }: ExcludedRowProps) {
  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 transition-colors',
      isSelected && 'bg-blue-50/50'
    )}>
      <Checkbox
        checked={isSelected}
        onCheckedChange={onSelect}
      />

      {/* Product info */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {product.thumbnail_url ? (
          <img
            src={product.thumbnail_url}
            alt=""
            className="w-8 h-8 object-cover rounded border"
          />
        ) : (
          <div className="w-8 h-8 bg-slate-100 rounded border flex items-center justify-center">
            <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm truncate">
            {product.product_title || 'Untitled Product'}
          </p>
          {product.reason && (
            <p className="text-xs text-muted-foreground truncate">
              {product.reason}
            </p>
          )}
        </div>
      </div>

      {/* Restore button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        onClick={(e) => {
          e.stopPropagation()
          onRestore()
        }}
      >
        <Undo2 className="h-3.5 w-3.5 mr-1" />
        Restore
      </Button>
    </div>
  )
}
