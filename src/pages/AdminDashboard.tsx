import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  Database,
  Server,
  Cpu,
  HardDrive,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Zap,
  Users,
  FolderKanban,
  Coins,
  List,
  Globe,
  Shield,
  Code,
  ExternalLink,
  Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3006/api/v1'
const BASE_URL = API_URL // Debug endpoint is under /api/v1

// Only allow this email to access the dashboard
const ADMIN_EMAIL = 'mqx.dev@gmail.com'

interface DebugStatus {
  status: string
  service: string
  version: string
  uptime: number
  timestamp: string
  responseTime: number
  database: {
    status: string
    latency: number
    stats: Record<string, number>
  }
  memory: {
    used: number
    total: number
    unit: string
  }
  endpoints: Array<{
    method: string
    path: string
    description: string
  }>
  environment: {
    nodeVersion: string
    platform: string
    arch: string
  }
}

interface EdgeFunction {
  name: string
  status: 'migrated' | 'pending' | 'deprecated'
  newEndpoint?: string
}

const edgeFunctions: EdgeFunction[] = [
  { name: 'process-image', status: 'migrated', newEndpoint: '/api/v1/images/process' },
  { name: 'optimize-image', status: 'migrated', newEndpoint: '/api/v1/images/optimize' },
  { name: 'combine-images', status: 'migrated', newEndpoint: '/api/v1/images/combine' },
  { name: 'check-ai-jobs', status: 'migrated', newEndpoint: '/api/v1/jobs/check' },
  { name: 'get-job-status', status: 'migrated', newEndpoint: '/api/v1/jobs/:id' },
  { name: 'optimize-prompt', status: 'migrated', newEndpoint: '/api/v1/prompts/optimize' },
  { name: 'thumbnail-proxy', status: 'migrated', newEndpoint: '/api/v1/proxy/thumbnail' },
  { name: 'submit-ai-job', status: 'pending' },
  { name: 'ai-webhook', status: 'pending' },
  { name: 'batch', status: 'migrated', newEndpoint: '/api/v1/batch/run' },
  { name: 'shopify-oauth', status: 'pending' },
  { name: 'shopify-products', status: 'pending' },
  { name: 'shopify-process-images', status: 'pending' },
  { name: 'shopify-push', status: 'pending' },
  { name: 'shopify-jobs', status: 'pending' },
  { name: 'shopify-automation', status: 'pending' },
  { name: 'google-auth-url', status: 'pending' },
  { name: 'google-oauth-callback', status: 'pending' },
  { name: 'google-drive-files', status: 'pending' },
  { name: 'stripe', status: 'pending' },
  { name: 'stripe-webhook', status: 'pending' },
  { name: 'export-project-images', status: 'pending' },
  { name: 'check-pending-generations', status: 'pending' },
  { name: 'image-process', status: 'deprecated' },
  { name: 'kie-webhook', status: 'deprecated' },
]

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [testResults, setTestResults] = useState<Record<string, { status: string; time: number; error?: string }>>({})
  const [isTestingEndpoints, setIsTestingEndpoints] = useState(false)

  // Check if user is admin
  useEffect(() => {
    if (user && user.email !== ADMIN_EMAIL) {
      navigate('/')
    }
  }, [user, navigate])

  // Fetch debug status from backend
  const { data: debugStatus, isLoading, error, refetch } = useQuery<DebugStatus>({
    queryKey: ['debug-status'],
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/debug/status`)
      if (!response.ok) throw new Error('Failed to fetch status')
      return response.json()
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  // Fetch Supabase Edge Functions status
  const { data: supabaseStatus } = useQuery({
    queryKey: ['supabase-status'],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession()
      return {
        authenticated: !!session?.session,
        url: import.meta.env.VITE_SUPABASE_URL,
      }
    },
  })

  // Test an endpoint
  const testEndpoint = async (method: string, path: string) => {
    const key = `${method} ${path}`
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token

      const start = Date.now()
      const url = path.includes(':id') || path.includes(':taskId')
        ? null // Skip parameterized endpoints
        : `${BASE_URL}${path}`

      if (!url) {
        setTestResults(prev => ({
          ...prev,
          [key]: { status: 'skipped', time: 0 }
        }))
        return
      }

      const response = await fetch(url, {
        method: method === 'GET' ? 'GET' : 'OPTIONS',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })

      setTestResults(prev => ({
        ...prev,
        [key]: {
          status: response.ok ? 'ok' : `${response.status}`,
          time: Date.now() - start
        }
      }))
    } catch (e) {
      setTestResults(prev => ({
        ...prev,
        [key]: {
          status: 'error',
          time: 0,
          error: e instanceof Error ? e.message : 'Unknown error'
        }
      }))
    }
  }

  // Test all endpoints
  const testAllEndpoints = async () => {
    if (!debugStatus?.endpoints) return
    setIsTestingEndpoints(true)
    setTestResults({})

    for (const endpoint of debugStatus.endpoints) {
      await testEndpoint(endpoint.method, endpoint.path)
      await new Promise(r => setTimeout(r, 100)) // Small delay between tests
    }

    setIsTestingEndpoints(false)
  }

  // Download test results as log file
  const downloadTestLog = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const lines: string[] = [
      '='.repeat(60),
      `JEWELAI API ENDPOINT TEST LOG`,
      `Generated: ${new Date().toISOString()}`,
      `API URL: ${BASE_URL}`,
      '='.repeat(60),
      '',
      'SYSTEM STATUS:',
      `-  API Status: ${debugStatus?.status || 'unknown'}`,
      `-  Database: ${debugStatus?.database?.status || 'unknown'}`,
      `-  DB Latency: ${debugStatus?.database?.latency || 0}ms`,
      `-  Uptime: ${debugStatus?.uptime ? Math.round(debugStatus.uptime) + 's' : 'unknown'}`,
      `-  Memory: ${debugStatus?.memory?.used || 0}/${debugStatus?.memory?.total || 0} MB`,
      '',
      'DATABASE STATS:',
      ...Object.entries(debugStatus?.database?.stats || {}).map(
        ([key, value]) => `-  ${key}: ${value === -1 ? 'TABLE NOT FOUND' : value}`
      ),
      '',
      '='.repeat(60),
      'ENDPOINT TEST RESULTS:',
      '='.repeat(60),
      '',
    ]

    // Add endpoint results
    const endpoints = debugStatus?.endpoints || []
    let passed = 0
    let failed = 0
    let skipped = 0

    for (const endpoint of endpoints) {
      const key = `${endpoint.method} ${endpoint.path}`
      const result = testResults[key]
      let statusStr = 'NOT TESTED'

      if (result) {
        if (result.status === 'ok') {
          statusStr = `OK (${result.time}ms)`
          passed++
        } else if (result.status === 'skipped') {
          statusStr = 'SKIPPED (parameterized)'
          skipped++
        } else {
          statusStr = `FAILED: ${result.status}${result.error ? ' - ' + result.error : ''}`
          failed++
        }
      }

      lines.push(`[${endpoint.method.padEnd(6)}] ${endpoint.path}`)
      lines.push(`         Status: ${statusStr}`)
      lines.push(`         Description: ${endpoint.description}`)
      lines.push('')
    }

    // Summary
    lines.push('='.repeat(60))
    lines.push('SUMMARY:')
    lines.push(`-  Total Endpoints: ${endpoints.length}`)
    lines.push(`-  Passed: ${passed}`)
    lines.push(`-  Failed: ${failed}`)
    lines.push(`-  Skipped: ${skipped}`)
    lines.push(`-  Not Tested: ${endpoints.length - passed - failed - skipped}`)
    lines.push('='.repeat(60))

    // Create and download file
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `api-test-log-${timestamp}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Shield className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              This dashboard is only accessible to administrators.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h ${mins}m`
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  const migratedCount = edgeFunctions.filter(f => f.status === 'migrated').length
  const pendingCount = edgeFunctions.filter(f => f.status === 'pending').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-50 shadow-sm">
            <Terminal className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 mt-0.5 text-sm">Backend monitoring & migration status</p>
          </div>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={`${debugStatus?.status === 'ok' ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {debugStatus?.status === 'ok' ? (
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              ) : (
                <XCircle className="h-8 w-8 text-red-600" />
              )}
              <div>
                <p className="text-sm text-gray-500">API Status</p>
                <p className={`text-lg font-bold ${debugStatus?.status === 'ok' ? 'text-green-700' : 'text-red-700'}`}>
                  {isLoading ? '...' : debugStatus?.status?.toUpperCase() || 'ERROR'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${debugStatus?.database?.status === 'connected' ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Database className={`h-8 w-8 ${debugStatus?.database?.status === 'connected' ? 'text-green-600' : 'text-red-600'}`} />
              <div>
                <p className="text-sm text-gray-500">Database</p>
                <p className={`text-lg font-bold ${debugStatus?.database?.status === 'connected' ? 'text-green-700' : 'text-red-700'}`}>
                  {isLoading ? '...' : debugStatus?.database?.latency ? `${debugStatus.database.latency}ms` : 'ERROR'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Uptime</p>
                <p className="text-lg font-bold text-blue-700">
                  {isLoading ? '...' : debugStatus?.uptime ? formatUptime(debugStatus.uptime) : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Cpu className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Memory</p>
                <p className="text-lg font-bold text-purple-700">
                  {isLoading ? '...' : debugStatus?.memory ? `${debugStatus.memory.used}/${debugStatus.memory.total} MB` : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="endpoints" className="space-y-4">
        <TabsList>
          <TabsTrigger value="endpoints">API Endpoints</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="migration">Migration Status</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        {/* Endpoints Tab */}
        <TabsContent value="endpoints">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  NestJS API Endpoints
                </CardTitle>
                <CardDescription>
                  {debugStatus?.endpoints?.length || 0} endpoints available at {BASE_URL}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={testAllEndpoints} disabled={isTestingEndpoints} size="sm">
                  {isTestingEndpoints ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Activity className="h-4 w-4 mr-2" />
                      Test All
                    </>
                  )}
                </Button>
                <Button
                  onClick={downloadTestLog}
                  disabled={Object.keys(testResults).length === 0}
                  size="sm"
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Log
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {debugStatus?.endpoints?.map((endpoint, i) => {
                      const key = `${endpoint.method} ${endpoint.path}`
                      const result = testResults[key]
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="outline"
                              className={
                                endpoint.method === 'GET' ? 'bg-green-100 text-green-700 border-green-200' :
                                endpoint.method === 'POST' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                endpoint.method === 'PATCH' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                endpoint.method === 'DELETE' ? 'bg-red-100 text-red-700 border-red-200' :
                                'bg-gray-100'
                              }
                            >
                              {endpoint.method}
                            </Badge>
                            <code className="text-sm font-mono">{endpoint.path}</code>
                            <span className="text-sm text-gray-500">{endpoint.description}</span>
                          </div>
                          {result && (
                            <div className="flex items-center gap-2">
                              {result.status === 'ok' ? (
                                <Badge className="bg-green-100 text-green-700">
                                  {result.time}ms
                                </Badge>
                              ) : result.status === 'skipped' ? (
                                <Badge variant="outline">Skipped</Badge>
                              ) : (
                                <Badge variant="destructive">{result.status}</Badge>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Statistics
              </CardTitle>
              <CardDescription>
                Self-hosted Supabase PostgreSQL on mercan server
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <Users className="h-6 w-6 text-blue-600" />
                        <div>
                          <p className="text-2xl font-bold">{debugStatus?.database?.stats?.users ?? '-'}</p>
                          <p className="text-sm text-gray-500">Users</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <Globe className="h-6 w-6 text-purple-600" />
                        <div>
                          <p className="text-2xl font-bold">{debugStatus?.database?.stats?.organizations ?? '-'}</p>
                          <p className="text-sm text-gray-500">Organizations</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <FolderKanban className="h-6 w-6 text-green-600" />
                        <div>
                          <p className="text-2xl font-bold">{debugStatus?.database?.stats?.projects ?? '-'}</p>
                          <p className="text-sm text-gray-500">Projects</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <Coins className="h-6 w-6 text-amber-600" />
                        <div>
                          <p className="text-2xl font-bold">{debugStatus?.database?.stats?.token_accounts ?? '-'}</p>
                          <p className="text-sm text-gray-500">Token Accounts</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <List className="h-6 w-6 text-cyan-600" />
                        <div>
                          <p className={`text-2xl font-bold ${(debugStatus?.database?.stats?.processing_queue ?? -1) < 0 ? 'text-gray-400' : ''}`}>
                            {(debugStatus?.database?.stats?.processing_queue ?? -1) < 0 ? 'N/A' : debugStatus?.database?.stats?.processing_queue}
                          </p>
                          <p className="text-sm text-gray-500">Queue Items</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <Activity className="h-6 w-6 text-pink-600" />
                        <div>
                          <p className={`text-2xl font-bold ${(debugStatus?.database?.stats?.ai_jobs ?? -1) < 0 ? 'text-gray-400' : ''}`}>
                            {(debugStatus?.database?.stats?.ai_jobs ?? -1) < 0 ? 'N/A' : debugStatus?.database?.stats?.ai_jobs}
                          </p>
                          <p className="text-sm text-gray-500">AI Jobs</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Migration Status Tab */}
        <TabsContent value="migration">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Edge Functions Migration
              </CardTitle>
              <CardDescription>
                Migrating from Supabase Edge Functions to NestJS API
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Progress Summary */}
              <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Migration Progress</span>
                    <span className="text-sm text-gray-500">
                      {migratedCount} / {edgeFunctions.length} ({Math.round(migratedCount / edgeFunctions.length * 100)}%)
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                      style={{ width: `${(migratedCount / edgeFunctions.length) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>Migrated ({migratedCount})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span>Pending ({pendingCount})</span>
                  </div>
                </div>
              </div>

              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {edgeFunctions.map((fn, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        fn.status === 'migrated' ? 'bg-green-50' :
                        fn.status === 'pending' ? 'bg-yellow-50' :
                        'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {fn.status === 'migrated' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : fn.status === 'pending' ? (
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-400" />
                        )}
                        <code className="text-sm font-mono">{fn.name}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        {fn.newEndpoint && (
                          <code className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                            {fn.newEndpoint}
                          </code>
                        )}
                        <Badge
                          className={
                            fn.status === 'migrated' ? 'bg-green-100 text-green-700' :
                            fn.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-500'
                          }
                        >
                          {fn.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Server Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">NestJS API URL</p>
                      <code className="text-sm font-mono">{API_URL}</code>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Supabase URL</p>
                      <code className="text-sm font-mono">{supabaseStatus?.url || '-'}</code>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Node Version</p>
                      <code className="text-sm font-mono">{debugStatus?.environment?.nodeVersion || '-'}</code>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Platform</p>
                      <code className="text-sm font-mono">
                        {debugStatus?.environment?.platform || '-'} ({debugStatus?.environment?.arch || '-'})
                      </code>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Quick Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <a
                    href="http://38.97.60.181:3000"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <p className="font-medium">Dokploy</p>
                    <p className="text-sm text-gray-500">Docker Management</p>
                  </a>
                  <a
                    href="http://38.97.60.181:3002"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <p className="font-medium">Supabase Studio</p>
                    <p className="text-sm text-gray-500">Database Admin</p>
                  </a>
                  <a
                    href={`${BASE_URL}/debug/status`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <p className="font-medium">API Debug</p>
                    <p className="text-sm text-gray-500">Raw JSON Status</p>
                  </a>
                  <a
                    href={`${BASE_URL}/health`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <p className="font-medium">Health Check</p>
                    <p className="text-sm text-gray-500">API Health</p>
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
