import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, MoreHorizontal, Trash2, UserPlus, Mail, Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { OrganizationRole, ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/types/roles'
import { Skeleton } from '@/components/ui/skeleton'

interface MemberDetails {
  user_id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  role: string
  joined_at: string
}

export default function AdminMembers() {
  const { organization, user } = useAuthStore()
  const { can } = usePermissions()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')

  // Fetch members with details using the secure function
  const { data: members, isLoading } = useQuery({
    queryKey: ['admin-members', organization?.id],
    queryFn: async () => {
      if (!organization) return []

      // Try to use the function for detailed info (cast to bypass type checking until migration is run)
      const { data, error } = await (supabase.rpc as (fn: string, params: Record<string, unknown>) => ReturnType<typeof supabase.rpc>)(
        'get_organization_members',
        { org_id: organization.id }
      )

      if (error) {
        // Fallback to basic query if function doesn't exist
        const { data: basicData } = await supabase
          .from('user_organizations')
          .select('*')
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: true })

        return (basicData || []).map(m => ({
          user_id: m.user_id,
          email: null,
          display_name: null,
          avatar_url: null,
          role: m.role || 'viewer',
          joined_at: m.created_at
        })) as MemberDetails[]
      }

      return (data || []) as unknown as MemberDetails[]
    },
    enabled: !!organization,
  })

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: OrganizationRole }) => {
      const { error } = await supabase
        .from('user_organizations')
        .update({ role: newRole })
        .eq('user_id', userId)
        .eq('organization_id', organization?.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-members'] })
      toast({ title: 'Role updated', description: 'Member role has been changed.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating role', description: error.message, variant: 'destructive' })
    },
  })

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_organizations')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', organization?.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-members'] })
      toast({ title: 'Member removed', description: 'The member has been removed from your organization.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error removing member', description: error.message, variant: 'destructive' })
    },
  })

  const getRoleBadgeVariant = (role: string): 'default' | 'secondary' | 'outline' => {
    switch (role) {
      case 'owner': return 'default'
      case 'admin': return 'secondary'
      default: return 'outline'
    }
  }

  const getInitials = (member: MemberDetails) => {
    if (member.display_name) {
      return member.display_name.slice(0, 2).toUpperCase()
    }
    if (member.email) {
      return member.email.slice(0, 2).toUpperCase()
    }
    return member.user_id.slice(0, 2).toUpperCase()
  }

  const getDisplayName = (member: MemberDetails) => {
    return member.display_name || member.email || `User ${member.user_id.slice(0, 8)}`
  }

  const handleInvite = () => {
    // TODO: Implement invite functionality
    toast({
      title: 'Coming soon',
      description: 'Member invitations will be available in a future update.'
    })
    setInviteDialogOpen(false)
    setInviteEmail('')
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription className="mt-1.5">
              {members?.length} member{members?.length !== 1 ? 's' : ''} in your organization
            </CardDescription>
          </div>
          {can('canManageMembers') && (
            <Button onClick={() => setInviteDialogOpen(true)} size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members?.map((member) => {
                  const isCurrentUser = member.user_id === user?.id
                  const isMemberOwner = member.role === 'owner'
                  const role = (member.role || 'viewer') as OrganizationRole

                  return (
                    <TableRow key={member.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(member)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{getDisplayName(member)}</span>
                              {isCurrentUser && (
                                <Badge variant="outline" className="text-xs">You</Badge>
                              )}
                            </div>
                            {member.email && member.display_name && (
                              <p className="text-sm text-muted-foreground">{member.email}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {can('canManageMembers') && !isMemberOwner && !isCurrentUser ? (
                          <Select
                            value={role}
                            onValueChange={(value) =>
                              updateRoleMutation.mutate({
                                userId: member.user_id,
                                newRole: value as OrganizationRole
                              })
                            }
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                              <SelectItem value="editor">{ROLE_LABELS.editor}</SelectItem>
                              <SelectItem value="viewer">{ROLE_LABELS.viewer}</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={getRoleBadgeVariant(role)}>
                            {ROLE_LABELS[role] || role}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(member.joined_at || '').toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {can('canManageMembers') && !isMemberOwner && !isCurrentUser && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => removeMemberMutation.mutate(member.user_id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove Member
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {members?.map((member) => {
              const isCurrentUser = member.user_id === user?.id
              const isMemberOwner = member.role === 'owner'
              const role = (member.role || 'viewer') as OrganizationRole

              return (
                <div
                  key={member.user_id}
                  className="flex items-start gap-3 p-4 rounded-lg border bg-card"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback>{getInitials(member)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{getDisplayName(member)}</span>
                      {isCurrentUser && (
                        <Badge variant="outline" className="text-xs">You</Badge>
                      )}
                      <Badge variant={getRoleBadgeVariant(role)} className="text-xs">
                        {ROLE_LABELS[role] || role}
                      </Badge>
                    </div>
                    {member.email && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{member.email}</span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      Joined {new Date(member.joined_at || '').toLocaleDateString()}
                    </p>

                    {can('canManageMembers') && !isMemberOwner && !isCurrentUser && (
                      <div className="flex items-center gap-2 mt-3">
                        <Select
                          value={role}
                          onValueChange={(value) =>
                            updateRoleMutation.mutate({
                              userId: member.user_id,
                              newRole: value as OrganizationRole
                            })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                            <SelectItem value="editor">{ROLE_LABELS.editor}</SelectItem>
                            <SelectItem value="viewer">{ROLE_LABELS.viewer}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                          onClick={() => removeMemberMutation.mutate(member.user_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {members?.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No members found</p>
              {can('canManageMembers') && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setInviteDialogOpen(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite your first member
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Member Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select defaultValue="editor">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div>
                      <p className="font-medium">{ROLE_LABELS.admin}</p>
                      <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS.admin}</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div>
                      <p className="font-medium">{ROLE_LABELS.editor}</p>
                      <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS.editor}</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div>
                      <p className="font-medium">{ROLE_LABELS.viewer}</p>
                      <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS.viewer}</p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={!inviteEmail}>
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
