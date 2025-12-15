import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { Loader2, Zap, FolderOpen, Wand2, FileText, Coins, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useTemplates } from '@/hooks/useTemplates'
import { AI_MODELS } from '@/constants/aiModels'

interface QuickCreateProjectProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUseWizard: () => void
}

// Get single-mode models for projects
const PROJECT_MODELS = AI_MODELS.filter(m => m.modes.includes('single'))

export function QuickCreateProject({ open, onOpenChange, onUseWizard }: QuickCreateProjectProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization } = useAuthStore()

  // Form state
  const [name, setName] = useState('')
  const [aiModel, setAiModel] = useState('flux-kontext-pro')
  const [resolution, setResolution] = useState<'2k' | '4k'>('2k')
  const [templateId, setTemplateId] = useState<string>('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Data fetching
  const { data: templates } = useTemplates()
  const { data: tokenAccount } = useQuery({
    queryKey: ['token-account', organization?.id],
    queryFn: async () => {
      if (!organization) return null
      const { data } = await supabase
        .from('token_accounts')
        .select('balance')
        .eq('organization_id', organization.id)
        .single()
      return data
    },
    enabled: !!organization,
  })

  const selectedModel = PROJECT_MODELS.find(m => m.id === aiModel)
  const tokenCost = resolution === '4k' ? 2 : 1

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organization) throw new Error('No organization')
      if (!name.trim()) throw new Error('Project name is required')

      const projectData = {
        organization_id: organization.id,
        name: name.trim(),
        ai_model: aiModel,
        resolution,
        trial_count: 3,
        prompt_mode: templateId ? 'template' : 'custom',
        template_id: templateId || null,
        status: 'draft',
        total_images: 0,
        processed_images: 0,
        failed_images: 0,
        trial_completed: 0,
        total_tokens: 0,
      }

      const { data, error } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast({
        title: 'Project created',
        description: 'Your project has been created. Add images to start processing.',
      })
      handleClose()
    },
    onError: (error) => {
      toast({
        title: 'Failed to create project',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleClose = () => {
    setName('')
    setAiModel('flux-kontext-pro')
    setResolution('2k')
    setTemplateId('')
    setShowAdvanced(false)
    onOpenChange(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Quick Create Project
          </DialogTitle>
          <DialogDescription>
            Create a new project with sensible defaults. You can adjust settings later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              placeholder="e.g., Spring Collection 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Quick Settings Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* AI Model */}
            <div className="space-y-2">
              <Label htmlFor="ai-model" className="flex items-center gap-1">
                <Wand2 className="h-3.5 w-3.5" />
                AI Model
              </Label>
              <Select value={aiModel} onValueChange={setAiModel}>
                <SelectTrigger id="ai-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_MODELS.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <span>{model.friendlyName}</span>
                        {model.recommended && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded">
                            Rec
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prompt Template */}
            <div className="space-y-2">
              <Label htmlFor="template" className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                Prompt Template
              </Label>
              <Select value={templateId || '__none__'} onValueChange={(v) => setTemplateId(v === '__none__' ? '' : v)}>
                <SelectTrigger id="template">
                  <SelectValue placeholder="Select template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No template</SelectItem>
                  {(templates || []).map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Settings Collapsible */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="w-full justify-between">
                <span className="text-muted-foreground">Advanced Settings</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-4">
              {/* Resolution */}
              <div className="space-y-2">
                <Label>Resolution</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={resolution === '2k' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setResolution('2k')}
                    className="flex-1"
                  >
                    2K Standard
                    <span className="ml-2 text-xs opacity-70">1 token</span>
                  </Button>
                  <Button
                    type="button"
                    variant={resolution === '4k' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setResolution('4k')}
                    className="flex-1"
                  >
                    4K Premium
                    <span className="ml-2 text-xs opacity-70">2 tokens</span>
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Token Info */}
          <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Coins className="h-4 w-4 text-purple-600" />
              <span className="text-muted-foreground">Your balance:</span>
              <span className="font-medium">{tokenAccount?.balance ?? 0} tokens</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {tokenCost} token per image
            </div>
          </div>
        </form>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onUseWizard}
            className="sm:mr-auto"
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            Use Full Wizard
          </Button>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !name.trim()}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Create Project
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
