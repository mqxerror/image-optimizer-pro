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
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Templates</h4>
        <p className="text-xs text-slate-500 mt-0.5">Choose a style for your combination</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {templates?.map((template) => {
          const info = categoryInfo[template.category as keyof typeof categoryInfo] || categoryInfo.custom
          const isSelected = selectedTemplateId === template.id
          const isHovered = hoveredId === template.id

          // Category-based gradient backgrounds for visual previews
          const categoryGradients: Record<string, string> = {
            natural: 'from-amber-500/20 via-yellow-500/10 to-orange-500/20',
            studio: 'from-slate-400/20 via-white/10 to-slate-400/20',
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
                    ? "border-slate-600 bg-slate-700/50"
                    : "border-slate-700/50 bg-slate-800/30 hover:border-slate-600"
              )}
            >
              {/* Visual Preview Area */}
              <div className={cn(
                "h-20 w-full relative flex items-center justify-center",
                template.thumbnail_url
                  ? "bg-slate-900"
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
                    <span className="text-[10px] text-slate-400 font-medium">{info.label}</span>
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
                <span className="text-sm font-medium text-slate-200 block truncate">{template.name}</span>

                {/* Description */}
                <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                  {template.description || info.description}
                </p>

                {/* Usage count */}
                {template.usage_count > 0 && (
                  <p className="text-[9px] text-slate-600 mt-1">
                    {template.usage_count} uses
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Custom template hint */}
      <div className="bg-slate-800/30 rounded-lg p-2 border border-slate-700/50">
        <p className="text-[10px] text-slate-500 text-center">
          Adjust settings and save as your own template
        </p>
      </div>
    </div>
  )
}

export default CombinationTemplates
