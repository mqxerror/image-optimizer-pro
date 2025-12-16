import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Building2, Loader2, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

export default function OrganizationSettings() {
  const { toast } = useToast()
  const { organization, setOrganization } = useAuthStore()

  const [orgName, setOrgName] = useState(organization?.name || '')
  const [defaultResolution, setDefaultResolution] = useState<string>(
    (organization?.settings as any)?.default_resolution || '2K'
  )

  // Sync state when organization changes
  useEffect(() => {
    if (organization) {
      setOrgName(organization.name || '')
      setDefaultResolution((organization.settings as any)?.default_resolution || '2K')
    }
  }, [organization])

  // Update organization settings
  const updateOrgMutation = useMutation({
    mutationFn: async () => {
      if (!organization) throw new Error('No organization')

      const { data, error } = await supabase
        .from('organizations')
        .update({
          name: orgName,
          settings: { default_resolution: defaultResolution }
        })
        .eq('id', organization.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      setOrganization(data)
      toast({ title: 'Settings saved successfully' })
    },
    onError: (error) => {
      toast({ title: 'Error saving settings', description: error.message, variant: 'destructive' })
    }
  })

  return (
    <div className="space-y-6">
      {/* Organization Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization
          </CardTitle>
          <CardDescription>Manage your organization settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name</Label>
            <Input
              id="orgName"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Your organization name"
              className="max-w-md"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resolution">Default Resolution</Label>
            <Select value={defaultResolution} onValueChange={setDefaultResolution}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2K">2K (Standard - 1 token)</SelectItem>
                <SelectItem value="4K">4K (Premium - 2 tokens)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              This is the default resolution for new projects
            </p>
          </div>

          <Button
            onClick={() => updateOrgMutation.mutate()}
            disabled={updateOrgMutation.isPending}
          >
            {updateOrgMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Token Pricing Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Token Pricing
          </CardTitle>
          <CardDescription>How tokens are used for image optimization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-slate-50">
              <p className="font-medium text-slate-900">2K Optimization</p>
              <p className="text-2xl font-bold text-primary mt-1">1 token</p>
              <p className="text-sm text-slate-500 mt-1">Standard resolution</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50">
              <p className="font-medium text-slate-900">4K Optimization</p>
              <p className="text-2xl font-bold text-primary mt-1">2 tokens</p>
              <p className="text-sm text-slate-500 mt-1">Premium resolution</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50">
              <p className="font-medium text-slate-900">Re-process</p>
              <p className="text-2xl font-bold text-primary mt-1">0.5 tokens</p>
              <p className="text-sm text-slate-500 mt-1">Retry with adjustments</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
