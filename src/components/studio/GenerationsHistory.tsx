import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock, Heart, Loader2, Download, RotateCcw, Users, Image, Trash2, AlertTriangle, ImageOff } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { StudioGeneration } from '@/types/studio'
import { formatDistanceToNow } from 'date-fns'
import { GenerationDetailModal, type GenerationDetail } from '@/components/shared/GenerationDetailModal'
import { useToast } from '@/hooks/use-toast'

// Track images that failed to load
const failedImages = new Set<string>()

// Unified generation type that works for both single and combination
interface UnifiedGeneration {
  id: string
  type: 'single' | 'combination'
  original_url?: string | null
  result_url: string | null
  status: 'pending' | 'processing' | 'pending_result' | 'success' | 'failed'
  task_id?: string | null
  is_favorite?: boolean
  created_at: string
  // Combination specific
  model_image_url?: string | null
  jewelry_image_url?: string | null
  // Extended fields for detail modal
  generated_prompt?: string | null
  ai_model?: string | null
  position_y?: number | null
  scale?: number | null
  blend_intensity?: number | null
  lighting_match?: number | null
  rotation?: number | null
  processing_time_sec?: number | null
  tokens_used?: number | null
  // Single image specific
  final_prompt?: string | null
  custom_prompt?: string | null
  settings_snapshot?: any | null  // For saving as preset
}

interface GenerationsHistoryProps {
  onSelectGeneration?: (generation: StudioGeneration) => void
  onReuse: (generation: StudioGeneration) => void
}

// Convert UnifiedGeneration to GenerationDetail for the shared modal
function unifiedToGenerationDetail(gen: UnifiedGeneration): GenerationDetail {
  const isCombination = gen.type === 'combination'
  return {
    id: gen.id,
    source: isCombination ? 'combination' : 'studio',
    originalUrl: isCombination ? gen.model_image_url : gen.original_url,
    resultUrl: gen.result_url,
    thumbnailUrl: gen.result_url || gen.original_url,
    modelImageUrl: gen.model_image_url,
    jewelryImageUrl: gen.jewelry_image_url,
    prompt: isCombination ? gen.generated_prompt : (gen.final_prompt || gen.custom_prompt),
    aiModel: gen.ai_model,
    fileName: null,
    status: gen.status,
    createdAt: gen.created_at,
    completedAt: gen.result_url ? gen.created_at : null,
    processingTimeSec: gen.processing_time_sec,
    tokensUsed: gen.tokens_used,
    errorMessage: null,
    positionY: gen.position_y,
    scale: gen.scale,
    rotation: gen.rotation,
    blendIntensity: gen.blend_intensity,
    lightingMatch: gen.lighting_match,
    settingsSnapshot: gen.settings_snapshot,
  }
}

export function GenerationsHistory({ onReuse }: GenerationsHistoryProps) {
  const { organization } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [selectedGeneration, setSelectedGeneration] = useState<UnifiedGeneration | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [isCheckingPending, setIsCheckingPending] = useState(false)
  const [isDeletingAll, setIsDeletingAll] = useState(false)

  // Convert selected generation for the modal
  const selectedGenerationDetail = useMemo(() => {
    return selectedGeneration ? unifiedToGenerationDetail(selectedGeneration) : null
  }, [selectedGeneration])

  const { data: generations, isLoading } = useQuery({
    queryKey: ['studio-generations', organization?.id],
    queryFn: async (): Promise<UnifiedGeneration[]> => {
      if (!organization) return []

      // Fetch both single generations and combination jobs with extended fields
      const [singlesResult, combinationsResult] = await Promise.all([
        (supabase as any)
          .from('studio_generations')
          .select('id, original_url, result_url, status, is_favorite, created_at, final_prompt, custom_prompt, ai_model, processing_time_sec, tokens_used, task_id, settings_snapshot')
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false })
          .limit(15),
        (supabase as any)
          .from('combination_jobs')
          .select('id, model_image_url, jewelry_image_url, result_url, status, is_favorite, created_at, generated_prompt, ai_model, position_y, scale, blend_intensity, lighting_match, rotation, processing_time_sec, tokens_used')
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false })
          .limit(15),
      ])

      // Map single generations to unified format
      const singles: UnifiedGeneration[] = (singlesResult.data || []).map((g: any) => {
        // Normalize status - if result_url exists, treat as success
        let normalizedStatus = g.status
        if (g.result_url && g.status !== 'failed') {
          normalizedStatus = 'success'
        } else if (g.status === 'pending_result') {
          // Keep pending_result status for auto-retry
          normalizedStatus = 'pending_result'
        } else if (g.status === 'timeout' || g.status === 'error') {
          // Normalize timeout/error to failed for consistent UI
          normalizedStatus = 'failed'
        }
        return {
          id: g.id,
          type: 'single' as const,
          original_url: g.original_url,
          result_url: g.result_url,
          status: normalizedStatus,
          task_id: g.task_id,
          is_favorite: g.is_favorite,
          created_at: g.created_at,
          // Extended fields
          final_prompt: g.final_prompt,
          custom_prompt: g.custom_prompt,
          ai_model: g.ai_model,
          processing_time_sec: g.processing_time_sec,
          tokens_used: g.tokens_used,
          settings_snapshot: g.settings_snapshot,
        }
      })

      // Map combination jobs to unified format (remap status)
      // Status mapping: pending/generating -> processing, success -> success, failed -> failed
      const combinations: UnifiedGeneration[] = (combinationsResult.data || []).map((c: any) => {
        // Normalize status to our unified format
        // IMPORTANT: If result_url exists, treat as success (fallback in case status update failed)
        let normalizedStatus: 'pending' | 'processing' | 'success' | 'failed' = 'pending'
        if (c.result_url) {
          // Result URL exists - definitely success
          normalizedStatus = 'success'
        } else if (c.status === 'success' || c.status === 'completed') {
          normalizedStatus = 'success'
        } else if (c.status === 'failed' || c.status === 'error') {
          normalizedStatus = 'failed'
        } else if (c.status === 'generating' || c.status === 'processing') {
          normalizedStatus = 'processing'
        } else if (c.status === 'pending') {
          normalizedStatus = 'processing' // Show pending as processing (with spinner)
        }

        return {
          id: c.id,
          type: 'combination' as const,
          model_image_url: c.model_image_url,
          jewelry_image_url: c.jewelry_image_url,
          result_url: c.result_url,
          status: normalizedStatus,
          is_favorite: c.is_favorite,
          created_at: c.created_at,
          // Extended fields
          generated_prompt: c.generated_prompt,
          ai_model: c.ai_model,
          position_y: c.position_y,
          scale: c.scale,
          blend_intensity: c.blend_intensity,
          lighting_match: c.lighting_match,
          rotation: c.rotation,
          processing_time_sec: c.processing_time_sec,
          tokens_used: c.tokens_used,
        }
      })

      // Merge and sort by created_at descending
      const all = [...singles, ...combinations].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      // Deduplicate by ID (in case of any race conditions or duplicate entries)
      const seen = new Set<string>()
      const deduplicated = all.filter(g => {
        if (seen.has(g.id)) return false
        seen.add(g.id)
        return true
      })

      return deduplicated.slice(0, 20)
    },
    enabled: !!organization,
    refetchInterval: (query) => {
      // Poll faster (2s) when there are processing items, slower (10s) otherwise
      const data = query.state.data as UnifiedGeneration[] | undefined
      const hasProcessing = data?.some(g => g.status === 'processing')
      return hasProcessing ? 2000 : 10000
    },
  })

  // Count processing items (includes pending_result as they're still being worked on)
  const processingCount = generations?.filter(g => g.status === 'processing' || g.status === 'pending_result').length || 0
  const pendingResultCount = generations?.filter(g => g.status === 'pending_result').length || 0
  const failedCount = generations?.filter(g => g.status === 'failed').length || 0

  const toggleFavorite = async (generation: UnifiedGeneration) => {
    const table = generation.type === 'single' ? 'studio_generations' : 'combination_jobs'
    await (supabase as any)
      .from(table)
      .update({ is_favorite: !generation.is_favorite })
      .eq('id', generation.id)
  }

  // Delete a single generation
  const deleteGeneration = async (generation: UnifiedGeneration) => {
    const table = generation.type === 'single' ? 'studio_generations' : 'combination_jobs'
    const { error } = await (supabase as any)
      .from(table)
      .delete()
      .eq('id', generation.id)

    if (error) {
      toast({
        title: 'Failed to delete',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({ title: 'Generation removed' })
      queryClient.invalidateQueries({ queryKey: ['studio-generations'] })
    }
  }

  // Clear all failed generations
  const clearAllFailed = async () => {
    if (!organization) return
    setIsDeletingAll(true)

    try {
      // Delete failed singles
      await (supabase as any)
        .from('studio_generations')
        .delete()
        .eq('organization_id', organization.id)
        .in('status', ['failed', 'timeout', 'error'])

      // Delete failed combinations
      await (supabase as any)
        .from('combination_jobs')
        .delete()
        .eq('organization_id', organization.id)
        .in('status', ['failed', 'timeout', 'error'])

      toast({ title: 'All failed generations cleared' })
      queryClient.invalidateQueries({ queryKey: ['studio-generations'] })
    } catch (error) {
      toast({
        title: 'Failed to clear',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      })
    } finally {
      setIsDeletingAll(false)
    }
  }

  // Auto-check pending_result items by calling the edge function
  const checkPendingGenerations = useCallback(async () => {
    if (isCheckingPending) return

    try {
      setIsCheckingPending(true)
      console.log('Checking pending generations...')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-pending-generations`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (response.ok) {
        const result = await response.json()
        console.log('Check pending result:', result)
        // Refresh the list if any items were updated
        if (result.results?.some((r: any) => r.status === 'success' || r.status === 'failed')) {
          queryClient.invalidateQueries({ queryKey: ['studio-generations'] })
        }
      }
    } catch (error) {
      console.error('Error checking pending generations:', error)
    } finally {
      setIsCheckingPending(false)
    }
  }, [isCheckingPending, queryClient])

  // Auto-trigger check when there are pending_result items
  const hasPendingResult = generations?.some(g => g.status === 'pending_result' || (g.status === 'processing' && g.task_id))

  useEffect(() => {
    if (!hasPendingResult) return

    // Check immediately when pending_result items are detected
    checkPendingGenerations()

    // Then check every 10 seconds
    const interval = setInterval(checkPendingGenerations, 10000)
    return () => clearInterval(interval)
  }, [hasPendingResult, checkPendingGenerations])

  const getStatusBadge = (status: UnifiedGeneration['status']) => {
    switch (status) {
      case 'pending':
        return (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded gap-1">
            <div className="h-5 w-5 md:h-6 md:w-6 rounded-full border-2 border-white/50 border-t-white animate-spin" />
            <span className="text-white text-[10px] md:text-xs font-medium">Queued</span>
          </div>
        )
      case 'processing':
        return (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 to-blue-900/80 flex flex-col items-center justify-center rounded gap-1 md:gap-2 p-1">
            <div className="relative">
              <div className="h-6 w-6 md:h-8 md:w-8 rounded-full border-2 border-purple-400/30 border-t-purple-400 animate-spin" />
              <Loader2 className="absolute inset-0 m-auto h-3 w-3 md:h-4 md:w-4 text-white animate-pulse" />
            </div>
            <span className="text-white text-[10px] md:text-xs font-medium">Processing</span>
            <span className="text-white/70 text-[8px] md:text-[10px]">~15 sec</span>
            <div className="flex gap-0.5">
              <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )
      case 'pending_result':
        return (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-900/80 to-orange-900/80 flex flex-col items-center justify-center rounded gap-1 p-1">
            <div className="relative">
              <div className="h-6 w-6 md:h-8 md:w-8 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" style={{ animationDuration: '2s' }} />
              <Clock className="absolute inset-0 m-auto h-3 w-3 md:h-4 md:w-4 text-white" />
            </div>
            <span className="text-white text-[9px] md:text-xs font-medium text-center px-1">Checking...</span>
          </div>
        )
      case 'failed':
        return (
          <div className="absolute top-1 right-1 bg-red-500 text-white text-[9px] md:text-[10px] px-1 md:px-1.5 py-0.5 rounded">
            Failed
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="h-full flex flex-col bg-white text-slate-900">
      {/* Processing Banner - compact on mobile */}
      {processingCount > 0 && (
        <div className={`px-3 md:px-4 py-2 md:py-3 flex items-center gap-2 md:gap-3 ${
          pendingResultCount > 0
            ? 'bg-gradient-to-r from-amber-600 to-orange-600'
            : 'bg-gradient-to-r from-purple-600 to-blue-600 animate-pulse'
        }`}>
          <div className="relative flex-shrink-0">
            <div className="h-5 w-5 md:h-6 md:w-6 rounded-full border-2 border-white/30 border-t-white animate-spin"
                 style={{ animationDuration: pendingResultCount > 0 ? '2s' : '1s' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs md:text-sm font-medium truncate">
              {processingCount} {processingCount === 1 ? 'task' : 'tasks'} {pendingResultCount > 0 ? 'checking' : 'processing'}
            </p>
            <p className="text-white/70 text-[10px] md:text-xs truncate">
              {pendingResultCount > 0
                ? 'Taking longer than usual...'
                : <>Usually ~15 seconds<span className="hidden md:inline"> per image</span></>}
            </p>
          </div>
          <div className="flex gap-0.5 flex-shrink-0">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}

      {/* Failed Banner - compact on mobile */}
      {failedCount > 0 && (
        <div className="px-3 md:px-4 py-1.5 md:py-2 bg-red-50 border-b border-red-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
            <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4 text-red-500 flex-shrink-0" />
            <span className="text-xs md:text-sm text-red-700 truncate">
              {failedCount} failed
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 md:h-7 text-[10px] md:text-xs text-red-600 hover:text-red-700 hover:bg-red-100 px-2 flex-shrink-0"
            onClick={clearAllFailed}
            disabled={isDeletingAll}
          >
            {isDeletingAll ? (
              <Loader2 className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1 animate-spin" />
            ) : (
              <Trash2 className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
            )}
            Clear
          </Button>
        </div>
      )}

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 md:p-4">
          {/* Grid layout: 2 columns on mobile, 2-3 on tablet */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="aspect-square w-full bg-slate-100 rounded-lg" />
              ))}
            </>
          ) : generations && generations.length > 0 ? (
            generations.map(generation => (
              <div
                key={`${generation.type}-${generation.id}`}
                className="group relative"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    // Open detail modal for any generation (success, failed, timeout)
                    // Only skip if still processing
                    if (generation.status !== 'processing' && generation.status !== 'pending') {
                      setSelectedGeneration(generation)
                      setModalOpen(true)
                    }
                  }}
                  className={`w-full aspect-square rounded-lg overflow-hidden bg-slate-100 border-2 transition-all ${
                    generation.status === 'processing' || generation.status === 'pending'
                      ? 'border-purple-400 ring-2 ring-purple-200 ring-offset-2 cursor-wait'
                      : 'border-slate-200 hover:border-purple-500 cursor-pointer'
                  }`}
                >
                  {(() => {
                    const imageUrl = generation.result_url ||
                      (generation.type === 'combination' ? generation.model_image_url : generation.original_url)
                    const isPreview = !generation.result_url

                    if (imageUrl && !failedImages.has(imageUrl)) {
                      return (
                        <img
                          src={imageUrl}
                          alt={generation.result_url ? "Generated" : "Preview"}
                          className={`w-full h-full object-cover ${isPreview ? 'opacity-50' : ''}`}
                          loading="lazy"
                          onError={(e) => {
                            failedImages.add(imageUrl)
                            // Force re-render by setting src to empty
                            ;(e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      )
                    }
                    return (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-slate-50">
                        <ImageOff className="h-5 w-5 md:h-6 md:w-6 text-slate-300" />
                        <span className="text-[9px] text-slate-400">No preview</span>
                      </div>
                    )
                  })()}
                  {getStatusBadge(generation.status)}
                  {/* Type indicator badge */}
                  <div className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${
                    generation.type === 'combination'
                      ? 'bg-gradient-to-r from-blue-500 to-amber-500 text-white'
                      : 'bg-purple-500/80 text-white'
                  }`}>
                    {generation.type === 'combination' ? (
                      <Users className="h-2.5 w-2.5 inline-block" />
                    ) : (
                      <Image className="h-2.5 w-2.5 inline-block" />
                    )}
                  </div>
                </button>

                {/* Action buttons - visible on hover (desktop) or always visible (mobile) for completed generations */}
                {generation.status !== 'processing' && generation.status !== 'pending' && (
                  <div className="absolute bottom-1 left-1 right-1 md:bottom-2 md:left-2 md:right-2 flex gap-0.5 md:gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    {/* Desktop: show reuse button */}
                    {generation.type === 'single' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="hidden md:flex flex-1 h-6 md:h-7 text-[10px] md:text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          onReuse(generation as any)
                        }}
                      >
                        <RotateCcw className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                        Reuse
                      </Button>
                    )}
                    {/* Mobile: minimal buttons, tap for details */}
                    <div className="flex md:hidden gap-0.5 ml-auto">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite(generation)
                        }}
                      >
                        <Heart
                          className={`h-2.5 w-2.5 ${generation.is_favorite ? 'fill-red-500 text-red-500' : ''}`}
                        />
                      </Button>
                    </div>
                    {/* Desktop: full action bar */}
                    <div className="hidden md:flex gap-1">
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
                      <Button
                        size="sm"
                        variant="secondary"
                        className={`h-7 px-2 ${generation.status === 'failed' ? 'bg-red-100 hover:bg-red-200 text-red-600' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteGeneration(generation)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

              </div>
            ))
          ) : null}
          </div>

          {/* Empty state - outside grid for proper centering */}
          {!isLoading && (!generations || generations.length === 0) && (
            <div className="text-center py-8 md:py-12 px-4 md:px-6">
              <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                <Image className="h-6 w-6 md:h-8 md:w-8 text-purple-500" />
              </div>
              <p className="text-sm md:text-base font-medium text-slate-700 mb-2">No generations yet</p>
              <p className="text-xs md:text-sm text-slate-500 mb-3 max-w-[200px] md:max-w-xs mx-auto">
                Upload an image and click Generate to create your first AI-enhanced product photo.
              </p>
              <div className="flex flex-col gap-1.5 md:gap-2 text-[10px] md:text-xs text-slate-400">
                <div className="flex items-center justify-center gap-1.5 md:gap-2">
                  <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-purple-400 rounded-full" />
                  <span>Single: Enhance lighting & style</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 md:gap-2">
                  <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-blue-400 rounded-full" />
                  <span>Combo: Place jewelry on models</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Generation Detail Modal */}
      <GenerationDetailModal
        generation={selectedGenerationDetail}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) setSelectedGeneration(null)
        }}
        onReuse={selectedGeneration?.type === 'single' ? () => {
          onReuse(selectedGeneration as any)
          setModalOpen(false)
          setSelectedGeneration(null)
        } : undefined}
        onDelete={selectedGeneration ? () => {
          deleteGeneration(selectedGeneration)
          setModalOpen(false)
          setSelectedGeneration(null)
        } : undefined}
      />
    </div>
  )
}

// Export the processing count for use in parent components
export function useGenerationsProcessingCount() {
  const { organization } = useAuthStore()

  const { data } = useQuery({
    queryKey: ['studio-generations-count', organization?.id],
    queryFn: async () => {
      if (!organization) return 0

      const [singlesResult, combinationsResult] = await Promise.all([
        (supabase as any)
          .from('studio_generations')
          .select('id, status, result_url')
          .eq('organization_id', organization.id)
          .in('status', ['pending', 'processing', 'pending_result'])
          .limit(10),
        (supabase as any)
          .from('combination_jobs')
          .select('id, status, result_url')
          .eq('organization_id', organization.id)
          .in('status', ['pending', 'processing', 'generating'])
          .limit(10),
      ])

      // Filter out any that have result_url (they're actually done)
      const singles = (singlesResult.data || []).filter((g: any) => !g.result_url)
      const combinations = (combinationsResult.data || []).filter((c: any) => !c.result_url)

      return singles.length + combinations.length
    },
    enabled: !!organization,
    refetchInterval: 3000,
  })

  return data || 0
}
