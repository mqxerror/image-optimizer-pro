import { useQuery } from '@tanstack/react-query'
import { Clock, Heart, Loader2, Download, RotateCcw } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { StudioGeneration } from '@/types/studio'
import { formatDistanceToNow } from 'date-fns'

interface GenerationsHistoryProps {
  onSelectGeneration: (generation: StudioGeneration) => void
  onReuse: (generation: StudioGeneration) => void
}

export function GenerationsHistory({ onSelectGeneration, onReuse }: GenerationsHistoryProps) {
  const { organization } = useAuthStore()

  const { data: generations, isLoading } = useQuery({
    queryKey: ['studio-generations', organization?.id],
    queryFn: async () => {
      if (!organization) return []
      // Type assertion needed until migration is applied and types regenerated
      const { data, error } = await (supabase as any)
        .from('studio_generations')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return data as StudioGeneration[]
    },
    enabled: !!organization,
    refetchInterval: 5000, // Poll for updates
  })

  const toggleFavorite = async (generation: StudioGeneration) => {
    // Type assertion needed until migration is applied and types regenerated
    await (supabase as any)
      .from('studio_generations')
      .update({ is_favorite: !generation.is_favorite })
      .eq('id', generation.id)
  }

  const getStatusBadge = (status: StudioGeneration['status']) => {
    switch (status) {
      case 'processing':
        return (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        )
      case 'failed':
        return (
          <div className="absolute top-1 right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded">
            Failed
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      <div className="p-4 border-b border-gray-800">
        <h2 className="font-semibold">Generations</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {isLoading ? (
            <>
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="aspect-square w-full bg-gray-800" />
              ))}
            </>
          ) : generations && generations.length > 0 ? (
            generations.map(generation => (
              <div
                key={generation.id}
                className="group relative"
              >
                <button
                  onClick={() => onSelectGeneration(generation)}
                  className="w-full aspect-square rounded-lg overflow-hidden bg-gray-800 border border-gray-700 hover:border-purple-500 transition-colors"
                >
                  {generation.result_url ? (
                    <img
                      src={generation.result_url}
                      alt="Generated"
                      className="w-full h-full object-cover"
                    />
                  ) : generation.original_url ? (
                    <img
                      src={generation.original_url}
                      alt="Original"
                      className="w-full h-full object-cover opacity-50"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Clock className="h-6 w-6 text-gray-600" />
                    </div>
                  )}
                  {getStatusBadge(generation.status)}
                </button>

                {/* Hover actions */}
                {generation.status === 'success' && (
                  <div className="absolute bottom-2 left-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1 h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        onReuse(generation)
                      }}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reuse
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 px-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(generation)
                      }}
                    >
                      <Heart
                        className={`h-3 w-3 ${generation.is_favorite ? 'fill-red-500 text-red-500' : ''}`}
                      />
                    </Button>
                    {generation.result_url && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 px-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(generation.result_url!, '_blank')
                        }}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}

                {/* Timestamp */}
                <p className="text-[10px] text-gray-500 mt-1 text-center">
                  {formatDistanceToNow(new Date(generation.created_at), { addSuffix: true })}
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-10 w-10 mx-auto mb-3 text-gray-700" />
              <p className="text-sm">No generations yet</p>
              <p className="text-xs text-gray-600 mt-1">
                Your creations will appear here
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
