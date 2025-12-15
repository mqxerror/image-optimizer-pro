import { Cloud, HardDrive, Check } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface StorageChoiceSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (destination: 'supabase' | 'google_drive') => void
  currentSelection: 'supabase' | 'google_drive'
}

export function StorageChoiceSheet({
  open,
  onOpenChange,
  onSelect,
  currentSelection
}: StorageChoiceSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>Save Results To</SheetTitle>
          <SheetDescription>
            Choose where to save your processed images
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-3 py-6">
          {/* App Storage Option */}
          <button
            type="button"
            onClick={() => onSelect('supabase')}
            className={cn(
              'flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
              currentSelection === 'supabase'
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <div className={cn(
              'flex items-center justify-center h-12 w-12 rounded-full',
              currentSelection === 'supabase'
                ? 'bg-primary text-primary-foreground'
                : 'bg-gray-100 text-gray-600'
            )}>
              <Cloud className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">App Storage</h4>
              <p className="text-sm text-gray-500">
                Keep images in your Image Optimizer account
              </p>
            </div>
            {currentSelection === 'supabase' && (
              <Check className="h-5 w-5 text-primary" />
            )}
          </button>

          {/* Google Drive Option */}
          <button
            type="button"
            onClick={() => onSelect('google_drive')}
            className={cn(
              'flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
              currentSelection === 'google_drive'
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <div className={cn(
              'flex items-center justify-center h-12 w-12 rounded-full',
              currentSelection === 'google_drive'
                ? 'bg-primary text-primary-foreground'
                : 'bg-gray-100 text-gray-600'
            )}>
              <HardDrive className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">Google Drive</h4>
              <p className="text-sm text-gray-500">
                Save directly to your connected Google Drive
              </p>
            </div>
            {currentSelection === 'google_drive' && (
              <Check className="h-5 w-5 text-primary" />
            )}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
