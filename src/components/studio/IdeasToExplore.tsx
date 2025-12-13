import { useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { StudioIdea } from '@/types/studio'

interface IdeasToExploreProps {
  onSelectIdea: (idea: string) => void
}

export function IdeasToExplore({ onSelectIdea }: IdeasToExploreProps) {
  const { data: ideas } = useQuery({
    queryKey: ['studio-ideas'],
    queryFn: async () => {
      // Type assertion needed until migration is applied and types regenerated
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
    <div className="space-y-3">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider text-center">
        Ideas to Explore
      </p>
      <div className="space-y-2">
        {ideas.map(idea => (
          <button
            key={idea.id}
            onClick={() => onSelectIdea(idea.text)}
            className="w-full text-left px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 transition-colors flex items-center gap-2"
          >
            <Sparkles className="h-3 w-3 text-purple-400 flex-shrink-0" />
            <span>{idea.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
