import { useBriefBuilder } from '../BriefBuilderContext'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'

export function RetouchSection() {
  const { state, updateRetouch } = useBriefBuilder()
  const { dustRemoval, reflectionControl, metalWarmth, stoneSparkle } = state.brief.retouch

  return (
    <div className="space-y-3">
      {/* Dust Removal Toggle */}
      <div className="flex items-center justify-between py-1">
        <span className="text-xs text-slate-700">Dust Removal</span>
        <Switch
          checked={dustRemoval}
          onCheckedChange={(checked) => updateRetouch({ dustRemoval: checked })}
          className="scale-90"
        />
      </div>

      {/* Reflection Control */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-700">Reflection</span>
          <span className="text-[10px] text-pink-600 font-medium">{reflectionControl}%</span>
        </div>
        <Slider
          value={[reflectionControl]}
          onValueChange={([value]) => updateRetouch({ reflectionControl: value })}
          min={0}
          max={100}
          step={5}
          className="w-full"
        />
      </div>

      {/* Metal Warmth */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-700">Metal Warmth</span>
          <span className="text-[10px] text-pink-600 font-medium">{metalWarmth}%</span>
        </div>
        <Slider
          value={[metalWarmth]}
          onValueChange={([value]) => updateRetouch({ metalWarmth: value })}
          min={0}
          max={100}
          step={5}
          className="w-full"
        />
      </div>

      {/* Stone Sparkle */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-700">Stone Sparkle</span>
          <span className="text-[10px] text-pink-600 font-medium">{stoneSparkle}%</span>
        </div>
        <Slider
          value={[stoneSparkle]}
          onValueChange={([value]) => updateRetouch({ stoneSparkle: value })}
          min={0}
          max={100}
          step={5}
          className="w-full"
        />
      </div>
    </div>
  )
}

export default RetouchSection
