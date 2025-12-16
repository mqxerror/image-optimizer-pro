import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  FileText,
  Loader2,
  Search,
  Pencil,
  Trash2,
  Eye,
  Sparkles,
  Filter,
  Wand2,
  Star
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { PromptTemplate } from '@/types/database'

const CATEGORIES = ['Jewelry', 'Product', 'Fashion', 'Food', 'Other'] as const
const SUBCATEGORIES: Record<string, string[]> = {
  Jewelry: ['Rings', 'Necklaces', 'Earrings', 'Bracelets', 'Watches', 'Brooches', 'Anklets', 'Sets'],
  Product: ['General', 'Electronics', 'Home & Garden', 'Sports'],
  Fashion: ['Clothing', 'Accessories', 'Footwear'],
  Food: ['Dishes', 'Ingredients', 'Beverages'],
  Other: ['General']
}
const STYLES = ['Premium', 'Elegant', 'Standard', 'Lifestyle', 'Minimal', 'Classic'] as const
const BACKGROUNDS = ['White', 'Gradient', 'Transparent', 'Natural', 'Custom'] as const

const templateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  category: z.string().min(1, 'Please select a category'),
  subcategory: z.string().optional(),
  base_prompt: z.string().min(20, 'Prompt must be at least 20 characters'),
  style: z.string().optional(),
  background: z.string().optional(),
  lighting: z.string().optional(),
})

type TemplateForm = z.infer<typeof templateSchema>

export default function Templates() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization, user } = useAuthStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
  })

  const watchCategory = watch('category')

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates', organization?.id],
    queryFn: async () => {
      if (!organization) return []

      // Fetch system templates and org templates
      const { data } = await supabase
        .from('prompt_templates')
        .select('*')
        .or(`is_system.eq.true,organization_id.eq.${organization.id}`)
        .eq('is_active', true)
        .order('is_system', { ascending: false })
        .order('category')
        .order('name')

      return data || []
    },
    enabled: !!organization
  })

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (data: TemplateForm) => {
      if (!organization || !user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('prompt_templates')
        .insert({
          ...data,
          organization_id: organization.id,
          created_by: user.id,
          is_system: false,
          is_active: true
        })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      setIsCreateOpen(false)
      reset()
      toast({ title: 'Template created successfully' })
    },
    onError: (error) => {
      toast({ title: 'Error creating template', description: error.message, variant: 'destructive' })
    }
  })

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async (data: TemplateForm & { id: string }) => {
      const { id, ...updateData } = data
      const { error } = await supabase
        .from('prompt_templates')
        .update(updateData)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      setIsEditOpen(false)
      setSelectedTemplate(null)
      reset()
      toast({ title: 'Template updated successfully' })
    },
    onError: (error) => {
      toast({ title: 'Error updating template', description: error.message, variant: 'destructive' })
    }
  })

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('prompt_templates')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      setIsDeleteOpen(false)
      setSelectedTemplate(null)
      toast({ title: 'Template deleted successfully' })
    },
    onError: (error) => {
      toast({ title: 'Error deleting template', description: error.message, variant: 'destructive' })
    }
  })

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { error } = await supabase.from('prompt_templates')
        .update({ is_favorite: !isFavorite })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
    onError: (error) => {
      toast({ title: 'Error updating favorite', description: error.message, variant: 'destructive' })
    }
  })

  // AI Optimize prompt function
  const optimizePrompt = useCallback(async () => {
    setIsOptimizing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const currentPrompt = watch('base_prompt')
      const category = watch('category')
      const subcategory = watch('subcategory')
      const style = watch('style')
      const background = watch('background')
      const lighting = watch('lighting')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/optimize-prompt`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            current_prompt: currentPrompt,
            jewelry_type: subcategory || category,
            optimization_goal: style ? `${style} style` : 'professional quality',
            template_settings: {
              background_type: background,
              lighting_style: lighting,
              enhancement_level: 'high'
            }
          })
        }
      )

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      if (result.optimized_prompt) {
        setValue('base_prompt', result.optimized_prompt)
        toast({
          title: 'Prompt optimized!',
          description: `AI improved your prompt (~${result.tokens_used} tokens used)`
        })
      }
    } catch (error: any) {
      toast({
        title: 'Failed to optimize prompt',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setIsOptimizing(false)
    }
  }, [watch, setValue, toast])

  // Filter templates
  const filteredTemplates = templates?.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.base_prompt?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const systemTemplates = filteredTemplates?.filter(t => t.is_system) || []
  const customTemplates = filteredTemplates?.filter(t => !t.is_system) || []

  const handleCreate = (data: TemplateForm) => {
    createMutation.mutate(data)
  }

  const handleEdit = (template: PromptTemplate) => {
    setSelectedTemplate(template)
    reset({
      name: template.name,
      category: template.category || '',
      subcategory: template.subcategory || '',
      base_prompt: template.base_prompt || '',
      style: template.style || '',
      background: template.background || '',
      lighting: template.lighting || '',
    })
    setIsEditOpen(true)
  }

  const handleUpdate = (data: TemplateForm) => {
    if (!selectedTemplate) return
    updateMutation.mutate({ ...data, id: selectedTemplate.id })
  }

  const handleView = (template: PromptTemplate) => {
    setSelectedTemplate(template)
    setIsViewOpen(true)
  }

  const handleDeleteConfirm = (template: PromptTemplate) => {
    setSelectedTemplate(template)
    setIsDeleteOpen(true)
  }

  const TemplateCard = ({ template }: { template: PromptTemplate & { is_favorite?: boolean } }) => {
    const isFavorite = template.is_favorite || false

    return (
      <Card className="hover:shadow-lg transition-all hover:border-slate-300 group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                {template.name}
                {template.is_system && (
                  <Badge variant="secondary" className="text-[10px] bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 border-0">
                    <Sparkles className="h-3 w-3 mr-1" />
                    System
                  </Badge>
                )}
                {isFavorite && (
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                )}
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                {template.category} {template.subcategory && `/ ${template.subcategory}`}
              </CardDescription>
            </div>
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => toggleFavoriteMutation.mutate({ id: template.id, isFavorite })}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star className={isFavorite ? 'h-4 w-4 text-amber-500 fill-amber-500' : 'h-4 w-4 text-slate-400'} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(template)}>
                <Eye className="h-4 w-4" />
              </Button>
              {!template.is_system && (
                <>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(template)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteConfirm(template)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
            {template.base_prompt}
          </p>
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {template.style && <Badge variant="outline" className="text-[10px] font-medium">{template.style}</Badge>}
            {template.background && <Badge variant="outline" className="text-[10px] font-medium">{template.background}</Badge>}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-50 shadow-sm">
            <FileText className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Prompt Templates</h1>
            <p className="text-slate-500 mt-0.5 text-sm">Manage AI prompt templates for image optimization</p>
          </div>
        </div>
        <Button
          onClick={() => { reset(); setIsCreateOpen(true) }}
          className="gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg shadow-purple-500/30 ring-2 ring-purple-400/50 hover:ring-purple-500/60 transition-all hover:shadow-purple-500/40"
        >
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredTemplates && filteredTemplates.length > 0 ? (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({filteredTemplates.length})</TabsTrigger>
            <TabsTrigger value="system">System ({systemTemplates.length})</TabsTrigger>
            <TabsTrigger value="custom">Custom ({customTemplates.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map(template => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="system" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {systemTemplates.map(template => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="custom" className="mt-4">
            {customTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customTemplates.map(template => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No custom templates yet</p>
                <Button variant="link" onClick={() => setIsCreateOpen(true)}>
                  Create your first template
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FileText className="h-12 w-12 text-slate-400 mx-auto" />
          <h3 className="text-lg font-medium text-slate-900 mt-4">No templates found</h3>
          <p className="text-slate-500 mt-2">
            {searchQuery || categoryFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create prompt templates to customize how AI enhances your images'}
          </p>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false)
          setIsEditOpen(false)
          setSelectedTemplate(null)
          reset()
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditOpen ? 'Edit Template' : 'Create New Template'}</DialogTitle>
            <DialogDescription>
              {isEditOpen ? 'Update your prompt template' : 'Create a custom prompt template for image optimization'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(isEditOpen ? handleUpdate : handleCreate)}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input id="name" {...register('name')} placeholder="e.g., My Custom Ring Style" />
                  {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={watchCategory}
                    onValueChange={(value) => {
                      setValue('category', value)
                      setValue('subcategory', '')
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-sm text-red-600">{errors.category.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subcategory">Subcategory</Label>
                  <Select
                    value={watch('subcategory') || ''}
                    onValueChange={(value) => setValue('subcategory', value)}
                    disabled={!watchCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(SUBCATEGORIES[watchCategory] || []).map(sub => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="style">Style</Label>
                  <Select
                    value={watch('style') || ''}
                    onValueChange={(value) => setValue('style', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {STYLES.map(style => (
                        <SelectItem key={style} value={style}>{style}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="background">Background</Label>
                  <Select
                    value={watch('background') || ''}
                    onValueChange={(value) => setValue('background', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {BACKGROUNDS.map(bg => (
                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lighting">Lighting (optional)</Label>
                <Input id="lighting" {...register('lighting')} placeholder="e.g., Three-point studio" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="base_prompt">Base Prompt</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={optimizePrompt}
                    disabled={isOptimizing}
                    className="gap-2"
                  >
                    {isOptimizing ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Optimizing...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-3 w-3" />
                        AI Optimize
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  id="base_prompt"
                  {...register('base_prompt')}
                  placeholder="Describe how the AI should optimize images using this template... or click AI Optimize to generate one!"
                  rows={6}
                />
                {errors.base_prompt && <p className="text-sm text-red-600">{errors.base_prompt.message}</p>}
                <p className="text-xs text-slate-500">
                  Tip: Fill in category, style, and background first, then click "AI Optimize" to generate a professional prompt
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsCreateOpen(false)
                setIsEditOpen(false)
                reset()
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditOpen ? 'Update' : 'Create'} Template
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTemplate?.name}
              {selectedTemplate?.is_system && (
                <Badge variant="secondary">
                  <Sparkles className="h-3 w-3 mr-1" />
                  System
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate?.category} {selectedTemplate?.subcategory && `/ ${selectedTemplate.subcategory}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2 flex-wrap">
              {selectedTemplate?.style && <Badge>{selectedTemplate.style}</Badge>}
              {selectedTemplate?.background && <Badge variant="outline">{selectedTemplate.background}</Badge>}
              {selectedTemplate?.lighting && <Badge variant="outline">{selectedTemplate.lighting}</Badge>}
            </div>
            <div>
              <Label className="text-sm text-slate-500">Prompt</Label>
              <div className="mt-2 p-4 bg-slate-50 rounded-lg text-sm whitespace-pre-wrap">
                {selectedTemplate?.base_prompt}
              </div>
            </div>
          </div>
          <DialogFooter>
            {!selectedTemplate?.is_system && (
              <Button variant="outline" onClick={() => {
                setIsViewOpen(false)
                if (selectedTemplate) handleEdit(selectedTemplate)
              }}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            <Button onClick={() => setIsViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedTemplate?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedTemplate && deleteMutation.mutate(selectedTemplate.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
