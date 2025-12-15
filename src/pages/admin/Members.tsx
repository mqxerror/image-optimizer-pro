import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, MoreHorizontal, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { useAuthStore } from '@/stores/auth'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { OrganizationRole, ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/types/roles'
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminMembers() {
  const { organization, user } = useAuthStore()
  const { can } = usePermissions()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch members with user profiles
  const { data: members, isLoading } = useQuery({
    queryKey: ['admin-members', organization?.id],
    queryFn: async () => {
      if (!organization) return []

      const { data } = await supabase
        .from('user_organizations')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: true })

      return data || []
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
      toast({ title: 'Role updated successfully' })
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
      toast({ title: 'Member removed' })
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
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Members
        </CardTitle>
        <CardDescription>
          Manage your organization's team members and their roles
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User ID</TableHead>
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
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{member.user_id.slice(0, 8)}...</span>
                      {isCurrentUser && (
                        <Badge variant="outline" className="text-xs">You</Badge>
                      )}
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
                        <SelectTrigger className="w-32">
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
                    ) : (
                      <Badge variant={getRoleBadgeVariant(role)}>
                        {ROLE_LABELS[role] || role}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(member.created_at || '').toLocaleDateString()}
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

        {members?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No members found
          </div>
        )}
      </CardContent>
    </Card>
  )
}
