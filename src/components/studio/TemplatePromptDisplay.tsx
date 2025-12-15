import { useState } from 'react'
import { FileText, Edit, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TemplatePromptDisplayProps {
  templateName: string
  prompt: string
  onEditAsCustom: () => void
}

export function TemplatePromptDisplay({
  templateName,
  prompt,
  onEditAsCustom
}: TemplatePromptDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="space-y-2">
      {/* Template header with name and actions */}
      <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText className="h-4 w-4 text-blue-400 flex-shrink-0" />
          <span className="text-sm text-blue-400 flex-shrink-0">Template:</span>
          <span className="text-sm text-white font-medium truncate">{templateName}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEditAsCustom}
          className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 text-xs gap-1 flex-shrink-0"
        >
          <Edit className="h-3 w-3" />
          <span className="hidden sm:inline">Edit as Custom</span>
          <span className="sm:hidden">Edit</span>
        </Button>
      </div>

      {/* Collapsible prompt preview */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-800/30 transition-colors"
        >
          <span className="text-xs text-gray-500">
            Prompt will be sent to AI exactly as written
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </button>

        <div
          className={`transition-all duration-200 ease-in-out overflow-hidden ${
            isExpanded ? 'max-h-48' : 'max-h-0'
          }`}
        >
          <div className="px-3 pb-3">
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
              {prompt}
            </p>
          </div>
        </div>

        {/* Preview snippet when collapsed */}
        {!isExpanded && (
          <div className="px-3 pb-3 -mt-1">
            <p className="text-sm text-gray-400 line-clamp-2">{prompt}</p>
          </div>
        )}
      </div>
    </div>
  )
}
