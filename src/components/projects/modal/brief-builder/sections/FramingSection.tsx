import { useBriefBuilder } from '../BriefBuilderContext'
import { FRAMING_OPTIONS } from '../types'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

export function FramingSection() {
  const { state, updateFraming } = useBriefBuilder()
  const { position, marginPercent, cropSafe } = state.brief.framing

  return (
    <div className="space-y-3">
      {/* Position */}
      <div className="space-y-1.5">
        <span className="text-xs text-slate-700">Position</span>
        <div className="grid grid-cols-2 gap-1.5">
          {FRAMING_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => updateFraming({ position: option.id })}
              className={cn(
                "px-2.5 py-1.5 rounded-lg transition-all text-xs",
                position === option.id
                  ? "bg-blue-50 ring-1 ring-blue-400 text-blue-700 font-medium"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-600"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Margin */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-700">Margin</span>
          <span className="text-[10px] text-blue-600 font-medium">{marginPercent}%</span>
        </div>
        <Slider
          value={[marginPercent]}
          onValueChange={([value]) => updateFraming({ marginPercent: value })}
          min={5}
          max={25}
          step={1}
          className="w-full"
        />
      </div>

      {/* Crop Safe */}
      <div className="flex items-center justify-between py-1">
        <div>
          <span className="text-xs text-slate-700 block">Crop Safe</span>
          <span className="text-[9px] text-slate-400">Extra margins for ads</span>
        </div>
        <Switch
          checked={cropSafe}
          onCheckedChange={(checked) => updateFraming({ cropSafe: checked })}
          className="scale-90"
        />
      </div>
    </div>
  )
}

export default FramingSection
