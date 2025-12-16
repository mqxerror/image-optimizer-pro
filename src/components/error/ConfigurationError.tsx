import { AlertTriangle, Settings, ExternalLink, RefreshCw } from 'lucide-react'

interface ConfigurationErrorProps {
  title?: string
  message?: string
  details?: string[]
}

export function ConfigurationError({
  title = 'Configuration Required',
  message = 'The application is missing required configuration.',
  details = [
    'VITE_SUPABASE_URL - Your Supabase project URL',
    'VITE_SUPABASE_ANON_KEY - Your Supabase anonymous key'
  ]
}: ConfigurationErrorProps) {
  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{title}</h1>
                <p className="text-amber-100 text-sm">Environment setup needed</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Message */}
            <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 font-medium">{message}</p>
                <p className="text-xs text-amber-600 mt-1">
                  This usually means environment variables haven't been set on the deployment.
                </p>
              </div>
            </div>

            {/* Missing Variables */}
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Missing environment variables:</h2>
              <div className="space-y-2">
                {details.map((detail, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                    <code className="text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-700 font-mono">
                      {detail.split(' - ')[0]}
                    </code>
                    {detail.includes(' - ') && (
                      <span className="text-xs text-slate-500">
                        {detail.split(' - ')[1]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-700">How to fix:</h2>
              <ol className="space-y-2 text-sm text-slate-600">
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                  <span>Copy <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">.env.example</code> to <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">.env</code></span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                  <span>Add your Supabase credentials from your project dashboard</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
                  <span>Set environment variables in your deployment platform (Vercel, Netlify, etc.)</span>
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 text-xs font-bold flex items-center justify-center flex-shrink-0">4</span>
                  <span>Rebuild and redeploy the application</span>
                </li>
              </ol>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleRefresh}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Supabase Dashboard
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-4">
          Image Optimizer Pro - Configuration Required
        </p>
      </div>
    </div>
  )
}
