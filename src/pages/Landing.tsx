import { Link } from 'react-router-dom'
import { Wand2, Layers, Scissors, ArrowRight, Sparkles, Zap, Star, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Feature mode definitions
const modes = [
  {
    id: 'enhance',
    name: 'AI Enhance',
    tagline: 'Turn raw product photos into studio-grade output',
    description: 'Transform any product image with AI-powered enhancement. Professional lighting, perfect backgrounds, and stunning results in seconds.',
    icon: Wand2,
    color: 'purple',
    gradient: 'from-purple-500 to-indigo-500',
    bgAccent: 'bg-purple-50',
    borderAccent: 'border-purple-200',
    textAccent: 'text-purple-600',
    heroControl: 'AI Model',
    features: [
      'Studio-quality lighting enhancement',
      'Intelligent background generation',
      'Multiple AI models to choose from',
    ],
    screenshot: '/screenshots/enhance-demo.png',
  },
  {
    id: 'combine',
    name: 'Combine',
    tagline: 'Composite jewelry onto model photos seamlessly',
    description: 'Place your jewelry on lifestyle model shots with intelligent blending. Perfect positioning, natural lighting match, and flawless results.',
    icon: Layers,
    color: 'blue',
    gradient: 'from-blue-500 to-amber-500',
    bgAccent: 'bg-blue-50',
    borderAccent: 'border-blue-200',
    textAccent: 'text-blue-600',
    heroControl: 'Blending',
    features: [
      'AI-powered jewelry placement',
      'Natural lighting matching',
      'Adjustable position, scale & rotation',
    ],
    screenshot: '/screenshots/combine-demo.png',
  },
  {
    id: 'edit',
    name: 'Edit',
    tagline: 'Deterministic adjustments with precision control',
    description: 'Fine-tune your images with professional editing tools. Background removal, resize, crop, and effects with pixel-perfect control.',
    icon: Scissors,
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-500',
    bgAccent: 'bg-emerald-50',
    borderAccent: 'border-emerald-200',
    textAccent: 'text-emerald-600',
    heroControl: 'Background',
    features: [
      'One-click background removal',
      'Smart resize & crop tools',
      'Professional color adjustments',
    ],
    screenshot: '/screenshots/edit-demo.png',
  },
]

// Stats for social proof
const stats = [
  { value: '50K+', label: 'Images Enhanced' },
  { value: '2.5s', label: 'Avg. Processing' },
  { value: '4.9', label: 'User Rating', icon: Star },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <Wand2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-slate-900">Image Optimizer Pro</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/auth/login">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link to="/auth/register">
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Image Enhancement
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight mb-6">
            Transform Product Photos
            <br />
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Into Studio-Quality Images
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10">
            Professional AI tools for jewelry and product photography. Enhance, combine, and edit your images with unprecedented quality and speed.
          </p>

          {/* Mode Cards (Jump Links) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-12">
            {modes.map((mode) => (
              <a
                key={mode.id}
                href={`#${mode.id}`}
                className={cn(
                  "group p-4 rounded-xl border-2 transition-all hover:shadow-lg",
                  mode.bgAccent,
                  mode.borderAccent,
                  "hover:scale-[1.02]"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center mb-3 mx-auto",
                  `bg-gradient-to-br ${mode.gradient}`
                )}>
                  <mode.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{mode.name}</h3>
                <p className="text-sm text-slate-500">{mode.tagline.split(' ').slice(0, 4).join(' ')}...</p>
              </a>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth/register">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 h-12 px-8 text-base">
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/studio?demo=true">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                <Zap className="w-4 h-4 mr-2" />
                Try Live Demo
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 sm:gap-12 mt-12 pt-8 border-t border-slate-100">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-2xl sm:text-3xl font-bold text-slate-900">{stat.value}</span>
                  {stat.icon && <stat.icon className="w-5 h-5 text-amber-400 fill-amber-400" />}
                </div>
                <span className="text-sm text-slate-500">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      {modes.map((mode, index) => (
        <section
          key={mode.id}
          id={mode.id}
          className={cn(
            "py-20 px-4 sm:px-6 lg:px-8",
            index % 2 === 1 ? 'bg-slate-50' : 'bg-white'
          )}
        >
          <div className="max-w-7xl mx-auto">
            <div className={cn(
              "grid lg:grid-cols-2 gap-12 items-center",
              index % 2 === 1 && "lg:flex-row-reverse"
            )}>
              {/* Content */}
              <div className={cn(index % 2 === 1 && "lg:order-2")}>
                {/* Mode Badge */}
                <div className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-4",
                  mode.bgAccent,
                  mode.textAccent
                )}>
                  <mode.icon className="w-4 h-4" />
                  {mode.name}
                </div>

                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                  {mode.tagline}
                </h2>

                <p className="text-lg text-slate-600 mb-8">
                  {mode.description}
                </p>

                {/* Feature List */}
                <ul className="space-y-3 mb-8">
                  {mode.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                        `bg-gradient-to-br ${mode.gradient}`
                      )}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link to={`/studio?feature=${mode.id}&demo=true`}>
                  <Button
                    size="lg"
                    className={cn(
                      "h-11",
                      `bg-gradient-to-r ${mode.gradient} hover:opacity-90`
                    )}
                  >
                    Try {mode.name}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>

              {/* Screenshot */}
              <div className={cn(
                "relative",
                index % 2 === 1 && "lg:order-1"
              )}>
                <div className={cn(
                  "relative rounded-2xl overflow-hidden shadow-2xl border",
                  mode.borderAccent
                )}>
                  {/* Screenshot placeholder - replace with actual screenshots */}
                  <div className="aspect-[4/3] bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                    <div className="text-center p-8">
                      <mode.icon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-500 text-sm">
                        Screenshot: {mode.name} Mode
                      </p>
                      <p className="text-slate-600 text-xs mt-2">
                        Use ?screenshot=true in Studio to capture
                      </p>
                    </div>
                  </div>

                  {/* Hero Control Label */}
                  <div className={cn(
                    "absolute top-4 right-4 px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg",
                    "bg-white/90 backdrop-blur-sm border",
                    mode.borderAccent,
                    mode.textAccent
                  )}>
                    <span className="text-slate-500 mr-1">Hero:</span>
                    {mode.heroControl}
                  </div>
                </div>

                {/* Decorative elements */}
                <div className={cn(
                  "absolute -z-10 w-72 h-72 rounded-full blur-3xl opacity-20",
                  `bg-gradient-to-br ${mode.gradient}`,
                  index % 2 === 0 ? "-bottom-20 -right-20" : "-bottom-20 -left-20"
                )} />
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Final CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-600 to-indigo-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Product Images?
          </h2>
          <p className="text-lg text-purple-100 mb-8">
            Join thousands of brands using AI to create stunning product photography.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth/register">
              <Button size="lg" className="bg-white text-purple-700 hover:bg-purple-50 h-12 px-8">
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/studio?demo=true">
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-8 border-white/30 text-white hover:bg-white/10"
              >
                View Live Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <Wand2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white">Image Optimizer Pro</span>
            </div>
            <p className="text-slate-400 text-sm">
              &copy; {new Date().getFullYear()} Image Optimizer Pro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
