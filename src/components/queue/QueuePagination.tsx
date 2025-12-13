import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface QueuePaginationProps {
  page: number
  totalPages: number
  totalCount: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200]

export function QueuePagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange
}: QueuePaginationProps) {
  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, totalCount)

  return (
    <div className="flex items-center justify-between px-3 py-4 bg-gradient-to-r from-slate-50 to-white border rounded-xl shadow-sm">
      <div className="flex items-center gap-4">
        <div className="text-sm text-slate-600">
          Showing <span className="font-semibold text-slate-800">{startItem}</span> to{' '}
          <span className="font-semibold text-slate-800">{endItem}</span> of{' '}
          <span className="font-semibold text-slate-800">{totalCount.toLocaleString()}</span> items
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Per page:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="w-[70px] h-8 rounded-full border-slate-200 bg-white/80 hover:bg-white transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* First page button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
          onClick={() => onPageChange(1)}
          disabled={page === 1}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        {/* Previous page button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-1 mx-2 bg-slate-100 rounded-full p-1">
          {generatePageNumbers(page, totalPages).map((pageNum, idx) => (
            pageNum === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 text-sm">
                ...
              </span>
            ) : (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum as number)}
                className={`
                  h-7 min-w-[28px] px-2.5 rounded-full text-sm font-medium transition-all
                  ${page === pageNum
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }
                `}
              >
                {pageNum}
              </button>
            )
          ))}
        </div>

        {/* Next page button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        {/* Last page button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function generatePageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | string)[] = []

  // Always show first page
  pages.push(1)

  if (current > 3) {
    pages.push('...')
  }

  // Show pages around current
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) {
    if (!pages.includes(i)) {
      pages.push(i)
    }
  }

  if (current < total - 2) {
    pages.push('...')
  }

  // Always show last page
  if (!pages.includes(total)) {
    pages.push(total)
  }

  return pages
}
