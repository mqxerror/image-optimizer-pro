import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { queryKeys } from '@/lib/queryKeys'
import type { PromptTemplate } from '@/types/database'

// Fetch all templates for the organization
export function useTemplates() {
  const { organization } = useAuthStore()

  return useQuery({
    queryKey: queryKeys.templates.list(organization?.id ?? ''),
    queryFn: async () => {
      if (!organization) return []

      const { data, error } = await supabase
        .from('prompt_templates')
        .select('*')
        .or(`organization_id.eq.${organization.id},is_system.eq.true`)
        .order('name')

      if (error) throw error
      return (data || []) as PromptTemplate[]
    },
    enabled: !!organization
  })
}

// Fetch a single template
export function useTemplate(templateId: string | null) {
  return useQuery({
    queryKey: queryKeys.templates.detail(templateId ?? ''),
    queryFn: async () => {
      if (!templateId) return null

      const { data, error } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (error) throw error
      return data as PromptTemplate
    },
    enabled: !!templateId
  })
}
