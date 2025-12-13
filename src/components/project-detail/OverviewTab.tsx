import { format } from 'date-fns'
import {
  Clock,
  Cpu,
  DollarSign,
  ExternalLink,
  Folder,
  ImageIcon,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  XCircle,
  Zap,
  CheckCircle,
  FileText,
  Palette,
  PenLine,
  Sparkles
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AddToQueue } from '@/components/processing'
import {
  useProjectQueueStats,
  useProcessProjectQueue,
  useRetryProjectFailed,
  useRunTrialBatch,
  useResetTrial
} from './hooks/useProjectQueueStats'
import { supabase } from '@/lib/supabase'
import {
  generateTemplatePrompt,
  generateStudioPresetPrompt,
  type TemplateData,
  type StudioPreset
} from '@/lib/prompt-utils'
import type { Project } from '@/types/database'

interface OverviewTabProps {
  project: Project
}

const statusConfig: Record<string, { color: string; label: string }> = {
  draft: { color: 'bg-gray-100 text-gray-700', label: 'Draft' },
  active: { color: 'bg-blue-100 text-blue-700', label: 'Active' },
  completed: { color: 'bg-green-100 text-green-700', label: 'Completed' },
  archived: { color: 'bg-yellow-100 text-yellow-700', label: 'Archived' },
}

const AI_MODELS: Record<string, string> = {
  'flux-kontext-pro': 'Flux Kontext Pro',
  'flux-kontext-max': 'Flux Kontext Max',
  'nano-banana': 'Nano Banana',
  'nano-banana-pro': 'Nano Banana Pro',
  'ghibli': 'Ghibli Style',
  'midjourney': 'Midjourney',
}

const TOKEN_PRICE = 0.04 // $0.04 per token
const AVG_PROCESSING_TIME_SEC = 30 // 30 seconds per image average

function getProgressPercentage(project: Project): number {
  if (!project.total_images || project.total_images === 0) return 0
  return Math.round((project.processed_images / project.total_images) * 100)
}

export function OverviewTab({ project: initialProject }: OverviewTabProps) {
  const queryClient = useQueryClient()

  // Fetch fresh project data to ensure we have the latest stats
  const { data: freshProject } = useQuery({
    queryKey: ['project-detail', initialProject.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', initialProject.id)
        .single()
      if (error) throw error
      return data as Project
    },
    initialData: initialProject,
    refetchInterval: 5000, // Refresh every 5 seconds to show live updates
  })

  // Use fresh data if available, otherwise fall back to initial
  const project = freshProject || initialProject

  // Fetch queue stats for this project
  const { data: queueStats, isLoading: loadingStats } = useProjectQueueStats(project.id)

  // Fetch template if using template mode
  const { data: template } = useQuery({
    queryKey: ['project-template', project.template_id],
    queryFn: async () => {
      if (!project.template_id) return null
      const { data } = await supabase
        .from('prompt_templates')
        .select('name, base_prompt, style, background, lighting')
        .eq('id', project.template_id)
        .single()
      return data as (TemplateData & { name: string }) | null
    },
    enabled: !!project.template_id && project.prompt_mode === 'template'
  })

  // Fetch studio preset if using preset mode - fetch ALL fields for consistent prompt generation
  const { data: preset } = useQuery({
    queryKey: ['project-preset', project.studio_preset_id],
    queryFn: async () => {
      if (!project.studio_preset_id) return null
      const { data } = await supabase
        .from('studio_presets')
        .select('*')
        .eq('id', project.studio_preset_id)
        .single()
      return data as StudioPreset | null
    },
    enabled: !!project.studio_preset_id && project.prompt_mode === 'preset'
  })

  // Mutations for quick actions
  const processQueue = useProcessProjectQueue(project.id)
  const retryFailed = useRetryProjectFailed(project.id)
  const runTrial = useRunTrialBatch(project.id, project.trial_count)
  const resetTrial = useResetTrial(project.id)

  // Calculations
  const progressPercent = getProgressPercentage(project)
  const estimatedCost = (project.total_tokens * TOKEN_PRICE).toFixed(2)
  const remainingImages = (queueStats?.queued || 0) + (queueStats?.processing || 0)
  const estimatedMinutes = Math.ceil((remainingImages * AVG_PROCESSING_TIME_SEC) / 60)

  // Get AI model name from project (with fallback)
  const aiModelKey = project.ai_model || 'flux-kontext-pro'
  const aiModelName = AI_MODELS[aiModelKey] || aiModelKey

  // Generate the active prompt based on mode
  const getActivePrompt = (): { prompt: string; source: string; sourceName?: string } => {
    const mode = project.prompt_mode || 'custom'

    if (mode === 'template' && template) {
      return {
        prompt: generateTemplatePrompt(template),
        source: 'template',
        sourceName: template.name
      }
    }

    if (mode === 'preset' && preset) {
      return {
        prompt: generateStudioPresetPrompt(preset),
        source: 'preset',
        sourceName: preset.name
      }
    }

    return {
      prompt: project.custom_prompt || 'No prompt configured',
      source: 'custom'
    }
  }

  const activePromptInfo = getActivePrompt()

  return (
    <div className="space-y-4 py-2">
      {/* Top Row: Status, Resolution, AI Model */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Zap className="h-3.5 w-3.5" />
              STATUS
            </div>
            <Badge className={statusConfig[project.status]?.color || 'bg-gray-100'}>
              {statusConfig[project.status]?.label || project.status}
            </Badge>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <ImageIcon className="h-3.5 w-3.5" />
              RESOLUTION
            </div>
            <p className="font-semibold">{project.resolution}</p>
            <p className="text-xs text-muted-foreground">
              {project.resolution === '4K' ? '4096px' : '2048px'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Cpu className="h-3.5 w-3.5" />
              AI MODEL
            </div>
            <p className="font-semibold text-sm">{aiModelName}</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              Processing Progress
            </CardTitle>
            <span className="text-2xl font-bold">{progressPercent}%</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={progressPercent} className="h-3" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {project.processed_images.toLocaleString()} of {project.total_images.toLocaleString()} images
            </span>
            <div className="flex items-center gap-3">
              {project.failed_images > 0 && (
                <span className="text-red-600 flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5" />
                  {project.failed_images} failed
                </span>
              )}
              {remainingImages > 0 && (
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  ~{estimatedMinutes} min remaining
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid: Queue Status, Trial Run, Tokens */}
      <div className="grid grid-cols-3 gap-3">
        {/* Queue Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Clock className="h-3.5 w-3.5" />
              QUEUE STATUS
            </div>
            {loadingStats ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Queued</span>
                  <span className="font-medium">{queueStats?.queued || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Processing</span>
                  <span className="font-medium text-yellow-600">
                    {queueStats?.processing || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Failed</span>
                  <span className={`font-medium ${(queueStats?.failed || 0) > 0 ? 'text-red-600' : ''}`}>
                    {queueStats?.failed || 0}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trial Run */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <CheckCircle className="h-3.5 w-3.5" />
              TRIAL RUN
            </div>
            <p className="font-semibold text-lg">
              {project.trial_completed}/{project.trial_count}
            </p>
            {/* Status indicator based on trial state */}
            {project.trial_count > 0 && (
              project.trial_completed >= project.trial_count ? (
                <Badge className="bg-green-100 text-green-700 mt-1">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
              ) : project.trial_completed > 0 ? (
                <Badge className="bg-yellow-100 text-yellow-700 mt-1">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  In Progress
                </Badge>
              ) : (
                <Badge variant="secondary" className="mt-1">
                  Not Started
                </Badge>
              )
            )}
          </CardContent>
        </Card>

        {/* Tokens */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <DollarSign className="h-3.5 w-3.5" />
              TOKENS
            </div>
            <p className="font-semibold text-lg">{project.total_tokens}</p>
            <p className="text-xs text-muted-foreground">tokens used</p>
            <p className="text-sm font-medium text-green-600 mt-1">
              ~${estimatedCost}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <Zap className="h-3.5 w-3.5" />
            QUICK ACTIONS
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Run Trial Button - only show if trial_count > 0 and trial not completed */}
            {project.trial_count > 0 && project.trial_completed < project.trial_count && (
              <Button
                size="sm"
                onClick={() => runTrial.mutate()}
                disabled={runTrial.isPending || !queueStats?.queued}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {runTrial.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Run Trial ({project.trial_count} images)
              </Button>
            )}

            {/* Reset Trial Button - show when there's trial progress to reset */}
            {project.trial_count > 0 && project.trial_completed > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => resetTrial.mutate()}
                disabled={resetTrial.isPending}
                className="border-amber-600 text-amber-600 hover:bg-amber-50"
              >
                {resetTrial.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Reset Trial
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => processQueue.mutate(10)}
              disabled={processQueue.isPending || !queueStats?.queued}
              className="bg-green-600 hover:bg-green-700"
            >
              {processQueue.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Process Queue {queueStats?.queued ? `(${queueStats.queued})` : ''}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => retryFailed.mutate()}
              disabled={retryFailed.isPending || !queueStats?.failed}
            >
              {retryFailed.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Retry Failed {queueStats?.failed ? `(${queueStats.failed})` : ''}
            </Button>

            <AddToQueue
              projectId={project.id}
              projectName={project.name}
              onQueued={() => {
                queryClient.invalidateQueries({ queryKey: ['projects'] })
                queryClient.invalidateQueries({ queryKey: ['project-queue-stats', project.id] })
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Source Folder */}
      {project.input_folder_url && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Folder className="h-3.5 w-3.5" />
              SOURCE FOLDER
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium truncate flex-1 mr-4">
                {project.input_folder_url.split('/').pop() || 'Google Drive Folder'}
              </p>
              <a
                href={project.input_folder_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-primary hover:underline shrink-0"
              >
                Open in Drive
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Prompt */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {activePromptInfo.source === 'template' && <FileText className="h-3.5 w-3.5" />}
              {activePromptInfo.source === 'preset' && <Palette className="h-3.5 w-3.5" />}
              {activePromptInfo.source === 'custom' && <PenLine className="h-3.5 w-3.5" />}
              ACTIVE PROMPT
            </div>
            <Badge variant="secondary" className="text-xs">
              {activePromptInfo.source === 'template' && (
                <>
                  <FileText className="h-3 w-3 mr-1" />
                  Template
                </>
              )}
              {activePromptInfo.source === 'preset' && (
                <>
                  <Palette className="h-3 w-3 mr-1" />
                  Studio Preset
                </>
              )}
              {activePromptInfo.source === 'custom' && (
                <>
                  <PenLine className="h-3 w-3 mr-1" />
                  Custom
                </>
              )}
            </Badge>
          </div>
          {activePromptInfo.sourceName && (
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-medium">{activePromptInfo.sourceName}</span>
            </div>
          )}
          <p className="text-sm p-3 bg-muted/50 rounded-lg max-h-32 overflow-y-auto whitespace-pre-wrap">
            {activePromptInfo.prompt}
          </p>
        </CardContent>
      </Card>

      {/* Timestamps */}
      <div className="text-xs text-muted-foreground pt-2 border-t">
        Created: {format(new Date(project.created_at), 'MMM d, yyyy HH:mm')}
        <span className="mx-2">•</span>
        Updated: {format(new Date(project.updated_at), 'MMM d, yyyy HH:mm')}
      </div>
    </div>
  )
}
