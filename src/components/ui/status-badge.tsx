import { cva, type VariantProps } from 'class-variance-authority'
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  type LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Status configurations for different contexts
const STATUS_CONFIGS = {
  // Queue/Processing statuses
  queued: {
    label: 'Queued',
    color: 'slate',
    icon: Clock,
    animate: false
  },
  pending: {
    label: 'Pending',
    color: 'slate',
    icon: Clock,
    animate: false
  },
  processing: {
    label: 'Processing',
    color: 'blue',
    icon: Loader2,
    animate: true
  },
  optimizing: {
    label: 'Optimizing',
    color: 'blue',
    icon: Loader2,
    animate: true
  },
  submitted: {
    label: 'Submitted',
    color: 'blue',
    icon: Loader2,
    animate: true
  },
  success: {
    label: 'Done',
    color: 'green',
    icon: CheckCircle,
    animate: false
  },
  completed: {
    label: 'Done',
    color: 'green',
    icon: CheckCircle,
    animate: false
  },
  failed: {
    label: 'Failed',
    color: 'red',
    icon: XCircle,
    animate: false
  },
  timeout: {
    label: 'Timeout',
    color: 'orange',
    icon: AlertCircle,
    animate: false
  },
  cancelled: {
    label: 'Cancelled',
    color: 'slate',
    icon: XCircle,
    animate: false
  },
  retrying: {
    label: 'Retrying',
    color: 'amber',
    icon: RefreshCw,
    animate: true
  },
  // Shopify statuses
  syncing: {
    label: 'Syncing',
    color: 'blue',
    icon: Loader2,
    animate: true
  },
  synced: {
    label: 'Synced',
    color: 'green',
    icon: CheckCircle,
    animate: false
  },
  // Project statuses
  active: {
    label: 'Active',
    color: 'green',
    icon: CheckCircle,
    animate: false
  },
  draft: {
    label: 'Draft',
    color: 'slate',
    icon: Clock,
    animate: false
  },
  archived: {
    label: 'Archived',
    color: 'slate',
    icon: null,
    animate: false
  }
} as const

type StatusType = keyof typeof STATUS_CONFIGS

// Color variants
const colorVariants = {
  slate: {
    pill: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-500',
    icon: 'text-slate-500'
  },
  blue: {
    pill: 'bg-blue-100 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    icon: 'text-blue-500'
  },
  green: {
    pill: 'bg-green-100 text-green-700 border-green-200',
    dot: 'bg-green-500',
    icon: 'text-green-500'
  },
  red: {
    pill: 'bg-red-100 text-red-700 border-red-200',
    dot: 'bg-red-500',
    icon: 'text-red-500'
  },
  orange: {
    pill: 'bg-orange-100 text-orange-700 border-orange-200',
    dot: 'bg-orange-500',
    icon: 'text-orange-500'
  },
  amber: {
    pill: 'bg-amber-100 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    icon: 'text-amber-500'
  }
} as const

const badgeVariants = cva(
  'inline-flex items-center gap-1 font-medium transition-all shrink-0',
  {
    variants: {
      variant: {
        pill: 'px-2 py-0.5 rounded-full text-xs border',
        dot: 'text-xs gap-1.5',
        icon: 'gap-1',
        minimal: 'text-xs'
      },
      size: {
        sm: 'text-[10px]',
        md: 'text-xs',
        lg: 'text-sm'
      }
    },
    defaultVariants: {
      variant: 'pill',
      size: 'md'
    }
  }
)

export interface StatusBadgeProps
  extends VariantProps<typeof badgeVariants> {
  status: string
  showIcon?: boolean
  showLabel?: boolean
  label?: string // Override default label
  className?: string
  iconClassName?: string
  attemptCount?: number // For retry indicator
  maxAttempts?: number
}

export function StatusBadge({
  status,
  variant = 'pill',
  size = 'md',
  showIcon = true,
  showLabel = true,
  label,
  className,
  iconClassName,
  attemptCount,
  maxAttempts = 3
}: StatusBadgeProps) {
  // Normalize status to lowercase
  const normalizedStatus = status?.toLowerCase() as StatusType

  // Get config or use default
  const config = STATUS_CONFIGS[normalizedStatus] || {
    label: status || 'Unknown',
    color: 'slate' as const,
    icon: null,
    animate: false
  }

  const colors = colorVariants[config.color as keyof typeof colorVariants] || colorVariants.slate
  const Icon = config.icon as LucideIcon | null
  const displayLabel = label || config.label

  // Check if this is a retry attempt
  const isRetrying = attemptCount && attemptCount > 0 && normalizedStatus === 'pending'
  const retryLabel = isRetrying ? `Retry ${attemptCount}/${maxAttempts}` : displayLabel

  // Render based on variant
  if (variant === 'dot') {
    return (
      <span className={cn(badgeVariants({ variant, size }), className)}>
        <span
          className={cn(
            'w-2 h-2 rounded-full',
            colors.dot,
            config.animate && 'animate-pulse'
          )}
        />
        {showLabel && <span>{retryLabel}</span>}
      </span>
    )
  }

  if (variant === 'icon') {
    if (!Icon) return null
    return (
      <span className={cn(badgeVariants({ variant, size }), colors.icon, className)}>
        <Icon
          className={cn(
            size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4',
            config.animate && 'animate-spin',
            iconClassName
          )}
        />
        {showLabel && <span>{retryLabel}</span>}
      </span>
    )
  }

  if (variant === 'minimal') {
    return (
      <span className={cn(badgeVariants({ variant, size }), colors.icon, className)}>
        {showIcon && Icon && (
          <Icon
            className={cn(
              size === 'sm' ? 'h-3 w-3' : 'h-4 w-4',
              config.animate && 'animate-spin',
              iconClassName
            )}
          />
        )}
        {showLabel && <span>{retryLabel}</span>}
      </span>
    )
  }

  // Default: pill variant
  return (
    <span className={cn(badgeVariants({ variant, size }), colors.pill, className)}>
      {showIcon && Icon && (
        <Icon
          className={cn(
            size === 'sm' ? 'h-3 w-3' : 'h-4 w-4',
            config.animate && 'animate-spin',
            iconClassName
          )}
        />
      )}
      {showLabel && <span>{retryLabel}</span>}
    </span>
  )
}

// Helper function to get status color for borders/backgrounds
export function getStatusColor(status: string): {
  border: string
  bg: string
  text: string
  gradient: string
} {
  const normalizedStatus = status?.toLowerCase() as StatusType
  const config = STATUS_CONFIGS[normalizedStatus]

  const colorMap = {
    slate: {
      border: 'border-slate-200',
      bg: 'bg-slate-500',
      text: 'text-slate-500',
      gradient: 'from-slate-900/80'
    },
    blue: {
      border: 'border-blue-400 border-2',
      bg: 'bg-blue-500',
      text: 'text-blue-500',
      gradient: 'from-blue-900/80'
    },
    green: {
      border: 'border-green-400 border-2',
      bg: 'bg-green-500',
      text: 'text-green-500',
      gradient: 'from-green-900/80'
    },
    red: {
      border: 'border-red-400 border-2',
      bg: 'bg-red-500',
      text: 'text-red-500',
      gradient: 'from-red-900/80'
    },
    orange: {
      border: 'border-orange-400 border-2',
      bg: 'bg-orange-500',
      text: 'text-orange-500',
      gradient: 'from-orange-900/80'
    },
    amber: {
      border: 'border-amber-400 border-2',
      bg: 'bg-amber-500',
      text: 'text-amber-500',
      gradient: 'from-amber-900/80'
    }
  }

  const color = config?.color || 'slate'
  return colorMap[color as keyof typeof colorMap] || colorMap.slate
}

// Export the configs for external use
export { STATUS_CONFIGS }
export type { StatusType }
