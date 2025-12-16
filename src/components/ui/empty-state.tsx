import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface EmptyStateAction {
  label: string
  onClick: () => void
  variant?: 'default' | 'outline' | 'ghost' | 'brand'
  icon?: LucideIcon
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  actions?: EmptyStateAction[]
  className?: string
  /** Compact mode for inline/smaller empty states */
  compact?: boolean
  /** Variant affects icon background color */
  variant?: 'default' | 'brand' | 'info' | 'success' | 'warning'
}

const variantStyles = {
  default: {
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-400',
    gradientFrom: 'from-slate-100',
    gradientTo: 'to-slate-50',
  },
  brand: {
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-500',
    gradientFrom: 'from-purple-100',
    gradientTo: 'to-violet-50',
  },
  info: {
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-500',
    gradientFrom: 'from-blue-100',
    gradientTo: 'to-indigo-50',
  },
  success: {
    iconBg: 'bg-green-100',
    iconColor: 'text-green-500',
    gradientFrom: 'from-green-100',
    gradientTo: 'to-emerald-50',
  },
  warning: {
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-500',
    gradientFrom: 'from-amber-100',
    gradientTo: 'to-yellow-50',
  },
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
  className,
  compact = false,
  variant = 'default',
}: EmptyStateProps) {
  const styles = variantStyles[variant]

  if (compact) {
    return (
      <div className={cn('text-center py-8', className)}>
        <div className={cn(
          'w-12 h-12 mx-auto rounded-full flex items-center justify-center',
          styles.iconBg
        )}>
          <Icon className={cn('h-6 w-6', styles.iconColor)} />
        </div>
        <p className="text-slate-600 font-medium mt-3">{title}</p>
        {description && (
          <p className="text-slate-500 text-sm mt-1">{description}</p>
        )}
        {actions && actions.length > 0 && (
          <div className="flex justify-center gap-2 mt-4">
            {actions.map((action, i) => (
              <Button
                key={i}
                variant={action.variant === 'brand' ? 'default' : action.variant || 'outline'}
                size="sm"
                onClick={action.onClick}
                className={cn(
                  action.variant === 'brand' && 'bg-purple-600 hover:bg-purple-700'
                )}
              >
                {action.icon && <action.icon className="h-4 w-4 mr-1.5" />}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      'bg-white rounded-xl border border-slate-200 p-12 text-center max-w-2xl mx-auto',
      className
    )}>
      {/* Visual illustration */}
      <div className={cn(
        'w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center',
        `bg-gradient-to-br ${styles.gradientFrom} ${styles.gradientTo}`
      )}>
        <Icon className={cn('h-10 w-10', styles.iconColor)} />
      </div>

      <h3 className="text-xl font-semibold text-slate-900">{title}</h3>

      {description && (
        <p className="text-slate-500 mt-2 max-w-md mx-auto">{description}</p>
      )}

      {actions && actions.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8">
          {actions.map((action, i) => (
            <Button
              key={i}
              variant={action.variant === 'brand' ? 'default' : action.variant || 'outline'}
              size="lg"
              onClick={action.onClick}
              className={cn(
                action.variant === 'brand' &&
                'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg shadow-purple-500/30'
              )}
            >
              {action.icon && <action.icon className="h-4 w-4 mr-2" />}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Preset empty states for common scenarios
 */
export const emptyStatePresets = {
  noProjects: {
    title: 'Create your first project',
    description: 'Projects help you batch process multiple images with consistent settings.',
  },
  noResults: {
    title: 'No results found',
    description: 'Try adjusting your search or filters.',
  },
  noActivity: {
    title: 'No activity yet',
    description: 'Start processing images in Studio or create a Project.',
  },
  noTemplates: {
    title: 'No templates yet',
    description: 'Templates help you save and reuse your favorite processing settings.',
  },
  noImages: {
    title: 'No images',
    description: 'Upload or select images to get started.',
  },
  error: {
    title: 'Something went wrong',
    description: 'We encountered an error. Please try again.',
  },
} as const
