import { useBriefBuilder } from '../BriefBuilderContext'
import { Switch } from '@/components/ui/switch'
import { ShieldCheck, Ban } from 'lucide-react'

export function ComplianceSection() {
  const { state, updateCompliance } = useBriefBuilder()
  const { gmcSafe, noWatermarks } = state.brief.compliance

  return (
    <div className="space-y-2">
      {/* GMC Safe */}
      <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center">
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
          </div>
          <div>
            <span className="text-xs text-slate-700 block">GMC Safe</span>
            <span className="text-[9px] text-slate-400">No overlays or text</span>
          </div>
        </div>
        <Switch
          checked={gmcSafe}
          onCheckedChange={(checked) => updateCompliance({ gmcSafe: checked })}
          className="scale-90"
        />
      </div>

      {/* No Watermarks */}
      <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-blue-100 flex items-center justify-center">
            <Ban className="h-3 w-3 text-blue-600" />
          </div>
          <div>
            <span className="text-xs text-slate-700 block">No Watermarks</span>
            <span className="text-[9px] text-slate-400">Clean without logos</span>
          </div>
        </div>
        <Switch
          checked={noWatermarks}
          onCheckedChange={(checked) => updateCompliance({ noWatermarks: checked })}
          className="scale-90"
        />
      </div>
    </div>
  )
}

export default ComplianceSection
