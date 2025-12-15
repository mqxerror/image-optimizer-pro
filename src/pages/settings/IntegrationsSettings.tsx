import { Link } from 'react-router-dom'
import { Puzzle, ChevronRight, ShoppingBag, FileText } from 'lucide-react'
import { GoogleDriveConnect } from '@/components/google-drive'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function IntegrationsSettings() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Puzzle className="h-5 w-5" />
          Integrations
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Connect external services to enhance your workflow
        </p>
      </div>

      {/* Google Drive */}
      <GoogleDriveConnect />

      {/* Quick Links to Other Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Other Integrations</CardTitle>
          <CardDescription>Additional services you can connect</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Shopify */}
          <Link
            to="/shopify"
            className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Shopify</p>
                <p className="text-sm text-gray-500">Connect your Shopify stores for product image optimization</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </Link>

          {/* Templates */}
          <Link
            to="/templates"
            className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Prompt Templates</p>
                <p className="text-sm text-gray-500">Create and manage AI prompt templates</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
