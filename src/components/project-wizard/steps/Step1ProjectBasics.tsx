import { UseFormReturn } from 'react-hook-form'
import { Folder, HelpCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { GoogleDriveBrowser } from '@/components/google-drive'
import { WizardFormData, SelectedFolder } from '../types'
import { FIELD_TOOLTIPS } from '../constants'

interface Step1Props {
  form: UseFormReturn<WizardFormData>
  selectedFolder: SelectedFolder | null
  onFolderSelect: (folderId: string, folderName: string) => void
}

export function Step1ProjectBasics({ form, selectedFolder, onFolderSelect }: Step1Props) {
  const { register, formState: { errors } } = form

  return (
    <div className="space-y-6">
      {/* Project Name */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Project Name
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium">{FIELD_TOOLTIPS.name.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {FIELD_TOOLTIPS.name.description}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          id="name"
          placeholder="e.g., Summer Collection 2024"
          {...register('name')}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Give your project a descriptive name to find it easily later
        </p>
      </div>

      {/* Source Folder */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">
            Source Folder
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium">{FIELD_TOOLTIPS.source_folder.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {FIELD_TOOLTIPS.source_folder.description}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Selected folder display */}
        {selectedFolder && (
          <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg mb-3">
            <Folder className="h-5 w-5 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{selectedFolder.name}</p>
              <p className="text-xs text-muted-foreground">Selected folder</p>
            </div>
          </div>
        )}

        {/* Google Drive Browser */}
        <div className="border rounded-lg overflow-hidden">
          <GoogleDriveBrowser
            selectionMode="folder"
            onSelectFolder={onFolderSelect}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Browse and select the Google Drive folder containing your jewelry images
        </p>
      </div>
    </div>
  )
}
