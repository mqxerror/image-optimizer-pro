import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { categoryInfo, type CombinationTemplate } from '@/types/combination'

interface CombinationTemplatesProps {
  selectedTemplateId: string | null
  onSelectTemplate: (template: CombinationTemplate) => void
  className?: string
}

export function CombinationTemplates({
  selectedTemplateId,
  onSelectTemplate,
  className
}: CombinationTemplatesProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Fetch system templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['combination-templates'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('combination_templates')
        .select('*')
        .eq('is_system', true)
        .eq('is_active', true)
        .order('category', { ascending: true })

      if (error) throw error
      return data as CombinationTemplate[]
    },
  })

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Templates</h4>
        <p className="text-xs text-gray-500 mt-0.5">Choose a style for your combination</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {templates?.map((template) => {
          const info = categoryInfo[template.category as keyof typeof categoryInfo] || categoryInfo.custom
          const isSelected = selectedTemplateId === template.id
          const isHovered = hoveredId === template.id

          // Category-based gradient backgrounds for visual previews
          const categoryGradients: Record<string, string> = {
            natural: 'from-amber-500/20 via-yellow-500/10 to-orange-500/20',
            studio: 'from-gray-400/20 via-white/10 to-gray-400/20',
            dramatic: 'from-purple-600/20 via-pink-500/10 to-rose-600/20',
            outdoor: 'from-green-500/20 via-teal-500/10 to-emerald-500/20',
            custom: 'from-blue-500/20 via-purple-500/10 to-indigo-500/20',
          }

          return (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template)}
              onMouseEnter={() => setHoveredId(template.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={cn(
                "relative rounded-xl border-2 transition-all text-left overflow-hidden",
                isSelected
                  ? "border-purple-500 bg-purple-500/10"
                  : isHovered
                    ? "border-gray-600 bg-gray-700/50"
                    : "border-gray-700/50 bg-gray-800/30 hover:border-gray-600"
              )}
            >
              {/* Visual Preview Area */}
              <div className={cn(
                "h-20 w-full relative flex items-center justify-center",
                template.thumbnail_url
                  ? "bg-gray-900"
                  : `bg-gradient-to-br ${categoryGradients[template.category] || categoryGradients.custom}`
              )}>
                {template.thumbnail_url ? (
                  <img
                    src={template.thumbnail_url}
                    alt={template.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  // Placeholder preview with icon
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-3xl opacity-80">{info.icon}</span>
                    <span className="text-[10px] text-gray-400 font-medium">{info.label}</span>
                  </div>
                )}

                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-purple-500 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-2.5">
                {/* Name */}
                <span className="text-sm font-medium text-gray-200 block truncate">{template.name}</span>

                {/* Description */}
                <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">
                  {template.description || info.description}
                </p>

                {/* Usage count */}
                {template.usage_count > 0 && (
                  <p className="text-[9px] text-gray-600 mt-1">
                    {template.usage_count} uses
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Custom template hint */}
      <div className="bg-gray-800/30 rounded-lg p-2 border border-gray-700/50">
        <p className="text-[10px] text-gray-500 text-center">
          Adjust settings and save as your own template
        </p>
      </div>
    </div>
  )
}

export default CombinationTemplates
