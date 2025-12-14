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

          return (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template)}
              onMouseEnter={() => setHoveredId(template.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={cn(
                "relative p-3 rounded-lg border-2 transition-all text-left",
                isSelected
                  ? "border-purple-500 bg-purple-500/10"
                  : isHovered
                    ? "border-gray-600 bg-gray-700/50"
                    : "border-gray-700/50 bg-gray-800/30 hover:border-gray-600"
              )}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <Check className="h-4 w-4 text-purple-400" />
                </div>
              )}

              {/* Icon and name */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{info.icon}</span>
                <span className="text-sm font-medium text-gray-200">{template.name}</span>
              </div>

              {/* Description */}
              <p className="text-xs text-gray-500 line-clamp-2">
                {template.description || info.description}
              </p>

              {/* Usage count */}
              {template.usage_count > 0 && (
                <p className="text-[10px] text-gray-600 mt-1.5">
                  Used {template.usage_count} times
                </p>
              )}
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
