// UX-018: Enhanced loading skeleton with shimmer animation
import { cn } from "@/lib/utils"

interface ShimmerSkeletonProps {
  className?: string
}

export function ShimmerSkeleton({ className }: ShimmerSkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]",
        "relative overflow-hidden",
        className
      )}
    >
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer"
        style={{
          animation: 'shimmer 2s infinite',
          backgroundSize: '200% 100%',
        }}
      />
    </div>
  )
}

// Card skeleton for grid views
export function CardSkeleton() {
  return (
    <div className="rounded-lg border overflow-hidden">
      <ShimmerSkeleton className="aspect-square w-full" />
      <div className="p-3 space-y-2">
        <ShimmerSkeleton className="h-4 w-3/4" />
        <div className="flex justify-between">
          <ShimmerSkeleton className="h-3 w-16" />
          <ShimmerSkeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  )
}

// Table row skeleton
export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b">
      <ShimmerSkeleton className="h-12 w-12 rounded" />
      <div className="flex-1 space-y-2">
        <ShimmerSkeleton className="h-4 w-1/3" />
        <ShimmerSkeleton className="h-3 w-1/4" />
      </div>
      <ShimmerSkeleton className="h-8 w-20 rounded" />
    </div>
  )
}

// Stats card skeleton
export function StatsCardSkeleton() {
  return (
    <div className="rounded-lg border p-6 space-y-3">
      <ShimmerSkeleton className="h-4 w-20" />
      <ShimmerSkeleton className="h-8 w-16" />
      <ShimmerSkeleton className="h-3 w-24" />
    </div>
  )
}
