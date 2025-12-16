import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { StudioIdea } from '@/types/studio'

interface IdeasToExploreProps {
  onSelectIdea: (idea: string) => void
}

export function IdeasToExplore({ onSelectIdea }: IdeasToExploreProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const { data: ideas } = useQuery({
    queryKey: ['studio-ideas'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('studio_ideas')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(5)

      if (error) throw error
      return data as StudioIdea[]
    },
  })

  if (!ideas?.length) return null

  return (
    <div className="space-y-2">
      {/* Collapsible header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-2 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-400 transition-colors"
      >
        <Sparkles className="h-3 w-3 text-purple-400" />
        <span>Ideas to explore</span>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {/* Collapsible content */}
      <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="space-y-1 pb-1">
          {ideas.map(idea => (
            <button
              key={idea.id}
              onClick={() => onSelectIdea(idea.text)}
              className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors flex items-center gap-2"
            >
              <Sparkles className="h-2.5 w-2.5 text-purple-400 flex-shrink-0" />
              <span className="line-clamp-1">{idea.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
