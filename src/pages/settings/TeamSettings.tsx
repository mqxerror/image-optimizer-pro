import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users,
  UserPlus,
  Mail,
  Trash2,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
  ShieldCheck,
  Crown,
  MoreVertical,
  Copy,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { queryKeys } from '@/lib/queryKeys'

interface TeamMember {
  id: string
  user_id: string
  role: string
  joined_at: string
  user?: {
    id: string
    email: string
    full_name?: string
    avatar_url?: string
  }
}

interface Invitation {
  id: string
  email: string
  role: string
  created_at: string
  expires_at: string
  accepted_at: string | null
  token: string
}

export default function TeamSettings() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization, user } = useAuthStore()
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviteMessage, setInviteMessage] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Fetch team members
  const { data: members = [], isLoading: loadingMembers } = useQuery<TeamMember[]>({
    queryKey: queryKeys.team.members(organization?.id || ''),
    queryFn: async () => {
      if (!organization) return []
      const { data, error } = await (supabase as any)
        .from('user_organizations')
        .select(`
          id,
          user_id,
          role,
          joined_at,
          user:user_id (
            id,
            email,
            raw_user_meta_data
          )
        `)
        .eq('organization_id', organization.id)

      if (error) throw error

      return (data || []).map((m: any) => ({
        ...m,
        user: m.user ? {
          id: m.user.id,
          email: m.user.email,
          full_name: m.user.raw_user_meta_data?.full_name,
          avatar_url: m.user.raw_user_meta_data?.avatar_url,
        } : null,
      }))
    },
    enabled: !!organization,
  })

  // Fetch pending invitations
  const { data: invitations = [], isLoading: loadingInvitations } = useQuery<Invitation[]>({
    queryKey: queryKeys.team.invitations(organization?.id || ''),
    queryFn: async () => {
      if (!organization) return []
      const { data, error } = await (supabase as any)
        .from('organization_invitations')
        .select('*')
        .eq('organization_id', organization.id)
        .is('accepted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!organization,
  })

  // Get current user's role
  const currentUserRole = members.find(m => m.user_id === user?.id)?.role || 'member'
  const canManageTeam = ['owner', 'admin'].includes(currentUserRole)

  // Invite member mutation
  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!organization || !user) throw new Error('Not authenticated')

      const { data, error } = await (supabase as any)
        .from('organization_invitations')
        .insert({
          organization_id: organization.id,
          email: inviteEmail.toLowerCase().trim(),
          role: inviteRole,
          message: inviteMessage || null,
          invited_by: user.id,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.team.invitations(organization?.id || '') })
      setIsInviteOpen(false)
      setInviteEmail('')
      setInviteRole('member')
      setInviteMessage('')
      toast({
        title: 'Invitation sent',
        description: `Invitation sent to ${data.email}`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to send invitation',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Cancel invitation mutation
  const cancelInviteMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await (supabase as any)
        .from('organization_invitations')
        .delete()
        .eq('id', invitationId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.team.invitations(organization?.id || '') })
      toast({ title: 'Invitation cancelled' })
    },
    onError: (error) => {
      toast({
        title: 'Failed to cancel invitation',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Update member role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: string }) => {
      const { error } = await (supabase as any)
        .from('user_organizations')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.team.members(organization?.id || '') })
      toast({ title: 'Role updated' })
    },
    onError: (error) => {
      toast({
        title: 'Failed to update role',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await (supabase as any)
        .from('user_organizations')
        .delete()
        .eq('id', memberId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.team.members(organization?.id || '') })
      toast({ title: 'Member removed' })
    },
    onError: (error) => {
      toast({
        title: 'Failed to remove member',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-amber-500" />
      case 'admin':
        return <ShieldCheck className="h-4 w-4 text-blue-500" />
      default:
        return <Shield className="h-4 w-4 text-gray-400" />
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Badge className="bg-amber-100 text-amber-800">Owner</Badge>
      case 'admin':
        return <Badge className="bg-blue-100 text-blue-800">Admin</Badge>
      default:
        return <Badge variant="secondary">Member</Badge>
    }
  }

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email?.slice(0, 2).toUpperCase() || '??'
  }

  const copyInviteLink = async (token: string) => {
    const link = `${window.location.origin}/invite/${token}`
    await navigator.clipboard.writeText(link)
    setCopiedId(token)
    setTimeout(() => setCopiedId(null), 2000)
    toast({ title: 'Invite link copied' })
  }

  return (
    <div className="space-y-6">
      {/* Team Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Team Members
            </CardTitle>
            <CardDescription>Manage who has access to your organization</CardDescription>
          </div>
          {canManageTeam && (
            <Button onClick={() => setIsInviteOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingMembers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.user?.avatar_url} />
                      <AvatarFallback className="bg-purple-100 text-purple-700">
                        {getInitials(member.user?.full_name, member.user?.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {member.user?.full_name || member.user?.email}
                        </p>
                        {member.user_id === user?.id && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{member.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRoleBadge(member.role)}
                    {canManageTeam && member.role !== 'owner' && member.user_id !== user?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => updateRoleMutation.mutate({
                              memberId: member.id,
                              newRole: member.role === 'admin' ? 'member' : 'admin'
                            })}
                          >
                            {member.role === 'admin' ? 'Demote to Member' : 'Promote to Admin'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => removeMemberMutation.mutate(member.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {canManageTeam && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Pending Invitations
            </CardTitle>
            <CardDescription>Invitations waiting to be accepted</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingInvitations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : invitations.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No pending invitations</p>
            ) : (
              <div className="space-y-3">
                {invitations.map((invitation) => {
                  const isExpired = new Date(invitation.expires_at) < new Date()
                  return (
                    <div
                      key={invitation.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        isExpired ? 'bg-red-50' : 'bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          isExpired ? 'bg-red-100' : 'bg-blue-100'
                        }`}>
                          {isExpired ? (
                            <XCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{invitation.email}</p>
                          <p className="text-sm text-gray-500">
                            {isExpired ? 'Expired' : `Expires ${new Date(invitation.expires_at).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getRoleBadge(invitation.role)}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyInviteLink(invitation.token)}
                        >
                          {copiedId === invitation.token ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => cancelInviteMutation.mutate(invitation.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-gray-400" />
                      Member
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-blue-500" />
                      Admin
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {inviteRole === 'admin'
                  ? 'Can manage team members and settings'
                  : 'Can view and process images'}
              </p>
            </div>
            <div>
              <Label>Personal Message (optional)</Label>
              <Textarea
                placeholder="Hey, join our team on Image Optimizer Pro!"
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={!inviteEmail || inviteMutation.isPending}
            >
              {inviteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
