import { Link } from 'react-router-dom'
import { Beaker, ShoppingBag, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { TestRunCardProps } from './types'

export function TestRunCard({
  storeId,
  config
}: TestRunCardProps) {
  const approvalComplete = config
    ? config.batches_completed >= config.approval_threshold
    : false

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="p-3 bg-white rounded-lg shadow-sm border">
          <Beaker className="h-6 w-6 text-purple-600" />
        </div>

        {/* Content */}
        <div className="flex-1 space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-purple-900">Test Before Automating</h4>
              {!approvalComplete && (
                <Badge
                  variant="outline"
                  className="bg-purple-100 text-purple-700 border-purple-200 text-xs"
                >
                  Recommended
                </Badge>
              )}
            </div>
            <p className="text-sm text-purple-700 mt-1">
              Before enabling automation, test on a few products to verify quality
            </p>
          </div>

          {/* Quick links */}
          <div className="flex gap-2">
            <Button asChild variant="default" className="bg-purple-600 hover:bg-purple-700">
              <Link to={`/shopify/${storeId}/products`}>
                <ShoppingBag className="h-4 w-4 mr-2" />
                Select Products to Test
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/shopify/jobs?store=${storeId}`}>
                <Briefcase className="h-4 w-4 mr-2" />
                View Jobs
              </Link>
            </Button>
          </div>

          {/* Hint */}
          <p className="text-xs text-purple-600">
            Go to Products → select items → click Optimize to manually test before enabling automation
          </p>
        </div>
      </div>
    </div>
  )
}
