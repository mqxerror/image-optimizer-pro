import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Upload, Loader2, Mail, Bell, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

interface EmailPreferences {
  processing_complete: boolean
  product_updates: boolean
  weekly_digest: boolean
}

interface UserProfileData {
  id: string
  user_id: string
  display_name: string | null
  avatar_url: string | null
  email_preferences: EmailPreferences
  created_at?: string | null
  updated_at?: string | null
}

export default function ProfileSettings() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Fetch user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user) return null

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      // If no profile exists, create one
      if (error && error.code === 'PGRST116') {
        const { data: newProfile, error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            display_name: user.email?.split('@')[0] || '',
            email_preferences: {
              processing_complete: true,
              product_updates: true,
              weekly_digest: false
            }
          })
          .select()
          .single()

        if (insertError) throw insertError
        const defaultPrefs: EmailPreferences = {
          processing_complete: true,
          product_updates: true,
          weekly_digest: false
        }
        return {
          ...newProfile,
          email_preferences: newProfile.email_preferences
            ? (newProfile.email_preferences as unknown as EmailPreferences)
            : defaultPrefs
        } as UserProfileData
      }

      if (error) throw error
      const defaultPrefs: EmailPreferences = {
        processing_complete: true,
        product_updates: true,
        weekly_digest: false
      }
      return {
        ...data,
        email_preferences: data.email_preferences
          ? (data.email_preferences as unknown as EmailPreferences)
          : defaultPrefs
      } as UserProfileData
    },
    enabled: !!user
  })

  // Local state for form
  const [displayName, setDisplayName] = useState('')
  const [emailPrefs, setEmailPrefs] = useState<EmailPreferences>({
    processing_complete: true,
    product_updates: true,
    weekly_digest: false
  })

  // Sync local state with fetched profile
  useState(() => {
    if (profile) {
      setDisplayName(profile.display_name || '')
      setEmailPrefs(profile.email_preferences)
    }
  })

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: { display_name?: string; avatar_url?: string; email_preferences?: EmailPreferences }) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('user_profiles')
        .update(updates as any)
        .eq('user_id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      toast({ title: 'Profile updated' })
    },
    onError: (error) => {
      toast({ title: 'Error updating profile', description: error.message, variant: 'destructive' })
    }
  })

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file type', description: 'Please upload an image', variant: 'destructive' })
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum size is 2MB', variant: 'destructive' })
      return
    }

    setIsUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${user.id}/avatar.${ext}`

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Update profile with avatar URL (add cache buster)
      await updateProfileMutation.mutateAsync({
        avatar_url: `${publicUrl}?t=${Date.now()}`
      })
    } catch (error) {
      toast({ title: 'Upload failed', description: (error as Error).message, variant: 'destructive' })
    } finally {
      setIsUploading(false)
    }
  }

  // Handle profile save
  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      display_name: displayName,
      email_preferences: emailPrefs
    })
  }

  // Handle email preference change
  const handleEmailPrefChange = (key: keyof EmailPreferences, value: boolean) => {
    setEmailPrefs(prev => ({ ...prev, [key]: value }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  const initials = (profile?.display_name || user?.email || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload Photo
              </Button>
              <p className="text-xs text-slate-500 mt-1">Max 2MB, JPG or PNG</p>
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName || profile?.display_name || ''}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="max-w-md"
            />
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="flex items-center gap-2 max-w-md">
              <Mail className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600">{user?.email}</span>
            </div>
            <p className="text-xs text-slate-500">Contact support to change your email</p>
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={updateProfileMutation.isPending}
          >
            {updateProfileMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Email Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Email Preferences
          </CardTitle>
          <CardDescription>Choose which emails you want to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Processing Complete</p>
              <p className="text-sm text-slate-500">Get notified when your images are done processing</p>
            </div>
            <Switch
              checked={emailPrefs.processing_complete}
              onCheckedChange={(v) => handleEmailPrefChange('processing_complete', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Product Updates</p>
              <p className="text-sm text-slate-500">New features and improvements</p>
            </div>
            <Switch
              checked={emailPrefs.product_updates}
              onCheckedChange={(v) => handleEmailPrefChange('product_updates', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Weekly Digest</p>
              <p className="text-sm text-slate-500">Summary of your weekly activity</p>
            </div>
            <Switch
              checked={emailPrefs.weekly_digest}
              onCheckedChange={(v) => handleEmailPrefChange('weekly_digest', v)}
            />
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={updateProfileMutation.isPending}
            variant="outline"
          >
            {updateProfileMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Preferences
          </Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>Manage your account security</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={async () => {
              const { error } = await supabase.auth.resetPasswordForEmail(user?.email || '')
              if (error) {
                toast({ title: 'Error', description: error.message, variant: 'destructive' })
              } else {
                toast({ title: 'Password reset email sent', description: 'Check your inbox' })
              }
            }}
          >
            <Lock className="h-4 w-4 mr-2" />
            Change Password
          </Button>
          <p className="text-xs text-slate-500 mt-2">
            We'll send you an email with a link to reset your password
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
