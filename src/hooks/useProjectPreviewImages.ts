import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'

/**
 * Fetches preview images for multiple projects
 * Returns a map of project_id -> array of up to 4 image URLs
 */
export function useProjectPreviewImages(projectIds: string[]) {
  return useQuery({
    queryKey: queryKeys.projects.previewImages(projectIds),
    queryFn: async () => {
      if (projectIds.length === 0) return {}

      // Fetch up to 4 completed images per project
      const { data: images, error } = await supabase
        .from('processing_history')
        .select('project_id, original_url, optimized_url, status')
        .in('project_id', projectIds)
        .eq('status', 'success')
        .order('completed_at', { ascending: false })

      if (error) {
        console.error('Error fetching preview images:', error)
        return {}
      }

      // Group images by project_id and take first 4 per project
      const previewMap: Record<string, string[]> = {}

      for (const img of (images || [])) {
        if (!previewMap[img.project_id]) {
          previewMap[img.project_id] = []
        }
        if (previewMap[img.project_id].length < 4) {
          // Prefer optimized_url, fallback to original_url
          const url = img.optimized_url || img.original_url
          if (url) {
            previewMap[img.project_id].push(url)
          }
        }
      }

      return previewMap
    },
    enabled: projectIds.length > 0,
    staleTime: 30000, // Cache for 30 seconds
  })
}

/**
 * Get preview images for a single project
 */
export function useProjectPreviewImagesForOne(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.previewImagesSingle(projectId ?? ''),
    queryFn: async () => {
      if (!projectId) return []

      const { data: images, error } = await supabase
        .from('processing_history')
        .select('original_url, optimized_url, status')
        .eq('project_id', projectId)
        .eq('status', 'success')
        .order('completed_at', { ascending: false })
        .limit(4)

      if (error) {
        console.error('Error fetching preview images:', error)
        return []
      }

      return (images || []).map(img => img.optimized_url || img.original_url).filter(Boolean)
    },
    enabled: !!projectId,
    staleTime: 30000,
  })
}
