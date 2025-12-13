import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ImageIcon, Loader2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

const onboardingSchema = z.object({
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
})

type OnboardingForm = z.infer<typeof onboardingSchema>

export default function Onboarding() {
  const navigate = useNavigate()
  const { user, setOrganization, fetchUserOrganizations } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
  })

  const onSubmit = async (data: OnboardingForm) => {
    if (!user) return

    setError(null)
    setIsLoading(true)

    try {
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: data.organizationName,
          owner_id: user.id,
          settings: {
            default_resolution: '2K'
          }
        })
        .select()
        .single()

      if (orgError) throw orgError

      // Create user_organization link
      const { error: linkError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: user.id,
          organization_id: org.id,
          role: 'owner'
        })

      if (linkError) throw linkError

      // Create token account with 10 free tokens
      const { error: tokenError } = await supabase
        .from('token_accounts')
        .insert({
          organization_id: org.id,
          balance: 10,
          lifetime_purchased: 0,
          lifetime_used: 0,
          low_balance_threshold: 5
        })

      if (tokenError) throw tokenError

      // Record the welcome bonus transaction
      const { data: tokenAccount } = await supabase
        .from('token_accounts')
        .select('id')
        .eq('organization_id', org.id)
        .single()

      if (tokenAccount) {
        await supabase
          .from('token_transactions')
          .insert({
            account_id: tokenAccount.id,
            type: 'bonus',
            amount: 10,
            balance_before: 0,
            balance_after: 10,
            description: 'Welcome bonus - 10 free tokens',
            created_by: user.id
          })
      }

      // Update store
      setOrganization(org)
      await fetchUserOrganizations()

      // Navigate to dashboard
      navigate('/')
    } catch (err) {
      console.error('Onboarding error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create organization')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-10 w-10 text-primary" />
              <span className="text-2xl font-bold">Image Optimizer Pro</span>
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome aboard!</CardTitle>
          <CardDescription>
            Let's set up your organization to get started
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <span className="font-semibold">Welcome gift!</span> You'll receive 10 free tokens to try out our service.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizationName">
                <Building2 className="inline h-4 w-4 mr-1" />
                Organization Name
              </Label>
              <Input
                id="organizationName"
                placeholder="e.g., My Jewelry Store"
                {...register('organizationName')}
              />
              {errors.organizationName && (
                <p className="text-sm text-red-600">{errors.organizationName.message}</p>
              )}
              <p className="text-xs text-gray-500">
                This is the name of your business or project
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Organization
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
