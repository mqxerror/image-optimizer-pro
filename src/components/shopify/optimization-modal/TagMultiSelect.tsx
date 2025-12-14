import { useState, useMemo } from 'react'
import { Check, ChevronDown, X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface TagMultiSelectProps {
  allTags: string[]
  tagCounts?: Map<string, number>
  selectedTags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  variant?: 'default' | 'destructive'
  maxDisplay?: number
}

export function TagMultiSelect({
  allTags,
  tagCounts,
  selectedTags,
  onChange,
  placeholder = 'Select tags...',
  variant = 'default',
  maxDisplay = 3
}: TagMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredTags = useMemo(() => {
    if (!search.trim()) return allTags
    const query = search.toLowerCase()
    return allTags.filter(tag => tag.toLowerCase().includes(query))
  }, [allTags, search])

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter(t => t !== tag))
    } else {
      onChange([...selectedTags, tag])
    }
  }

  const removeTag = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selectedTags.filter(t => t !== tag))
  }

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between min-h-[40px] h-auto py-2',
            variant === 'destructive' && selectedTags.length > 0 && 'border-red-300 bg-red-50'
          )}
        >
          {selectedTags.length === 0 ? (
            <span className="text-muted-foreground font-normal">{placeholder}</span>
          ) : (
            <div className="flex flex-wrap gap-1 items-center">
              {selectedTags.slice(0, maxDisplay).map(tag => (
                <Badge
                  key={tag}
                  variant={variant === 'destructive' ? 'destructive' : 'secondary'}
                  className="text-xs px-1.5 py-0"
                >
                  {tag}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer hover:text-foreground"
                    onClick={(e) => removeTag(tag, e)}
                  />
                </Badge>
              ))}
              {selectedTags.length > maxDisplay && (
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  +{selectedTags.length - maxDisplay} more
                </Badge>
              )}
            </div>
          )}
          <div className="flex items-center gap-1 ml-2">
            {selectedTags.length > 0 && (
              <X
                className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={clearAll}
              />
            )}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[300px] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        <ScrollArea className="h-[240px]">
          {filteredTags.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {search ? 'No tags found' : 'No tags available'}
            </div>
          ) : (
            <div className="p-1">
              {filteredTags.map(tag => {
                const isSelected = selectedTags.includes(tag)
                const count = tagCounts?.get(tag)

                return (
                  <div
                    key={tag}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer',
                      'hover:bg-accent transition-colors',
                      isSelected && 'bg-accent'
                    )}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      toggleTag(tag)
                    }}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center',
                        isSelected
                          ? variant === 'destructive'
                            ? 'bg-red-500 border-red-500'
                            : 'bg-primary border-primary'
                          : 'border-gray-300'
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="flex-1 text-sm truncate">{tag}</span>
                    {count !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        ({count})
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
        {selectedTags.length > 0 && (
          <div className="p-2 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {selectedTags.length} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange([])
                }}
              >
                Clear all
              </Button>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
