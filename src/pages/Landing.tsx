import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Wand2, Layers, Scissors, ArrowRight, Sparkles, Zap, Star, Check, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

// Feature mode definitions - PRESERVED EXACTLY
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

// Stats for social proof - PRESERVED EXACTLY
const stats = [
  { value: '50K+', label: 'Images Enhanced' },
  { value: '2.5s', label: 'Avg. Processing' },
  { value: '4.9', label: 'User Rating', icon: Star },
]

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showStickyCTA, setShowStickyCTA] = useState(false)

  // Scroll handler for sticky CTA
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyCTA(window.scrollY > 600)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation - Mobile First */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <Wand2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-slate-900 text-sm sm:text-base">Image Optimizer Pro</span>
            </Link>

            {/* Desktop nav - hidden on mobile */}
            <div className="hidden md:flex items-center gap-4">
              <Link to="/auth/login">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link to="/auth/register">
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                  Get Started
                </Button>
              </Link>
            </div>

            {/* Mobile hamburger menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="h-11 w-11">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                <div className="flex flex-col h-full">
                  {/* Mobile menu header */}
                  <div className="flex items-center gap-2 mb-8">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                      <Wand2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-slate-900">Image Optimizer Pro</span>
                  </div>

                  {/* Mobile nav links */}
                  <nav className="flex flex-col gap-2">
                    {modes.map((mode) => (
                      <a
                        key={mode.id}
                        href={`#${mode.id}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100 min-h-[48px]",
                          mode.bgAccent
                        )}
                      >
                        <mode.icon className={cn("w-5 h-5", mode.textAccent)} />
                        <span className="font-medium">{mode.name}</span>
                      </a>
                    ))}
                  </nav>

                  {/* Mobile CTA buttons */}
                  <div className="mt-auto pt-8 space-y-3">
                    <Link
                      to="/auth/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block"
                    >
                      <Button variant="outline" className="w-full h-12">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/auth/register" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full h-12 bg-purple-600 hover:bg-purple-700">
                        Get Started
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Hero Section - Mobile First with Animations */}
      <section className="pt-20 sm:pt-24 md:pt-32 pb-12 sm:pb-16 md:pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-20 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-purple-200 rounded-full blur-3xl opacity-30 animate-float" />
          <div className="absolute bottom-0 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-indigo-200 rounded-full blur-3xl opacity-30 animate-float delay-500" />
        </div>

        <div className="max-w-7xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-xs sm:text-sm font-medium mb-4 sm:mb-6 opacity-0 animate-fade-in-up">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            AI-Powered Image Enhancement
          </div>

          {/* Title - Responsive scaling */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight mb-4 sm:mb-6 opacity-0 animate-fade-in-up delay-100">
            Transform Product Photos
            <br className="hidden sm:block" />
            <span className="block sm:inline mt-1 sm:mt-0 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Into Studio-Quality Images
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-8 sm:mb-10 px-2 opacity-0 animate-fade-in-up delay-200">
            Professional AI tools for jewelry and product photography. Enhance, combine, and edit your images with unprecedented quality and speed.
          </p>

          {/* Mode Cards - Horizontal scroll on mobile, grid on desktop */}
          <div className="relative mb-8 sm:mb-12 opacity-0 animate-scale-in delay-300">
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 sm:gap-4 pb-4 px-2 -mx-2 sm:mx-0 sm:px-0 md:grid md:grid-cols-3 md:overflow-visible md:max-w-3xl md:mx-auto scrollbar-hide">
              {modes.map((mode) => (
                <a
                  key={mode.id}
                  href={`#${mode.id}`}
                  className={cn(
                    "group flex-shrink-0 w-[260px] sm:w-[280px] md:w-auto snap-center",
                    "p-4 sm:p-5 rounded-xl border-2 transition-all",
                    "hover:shadow-lg active:scale-[0.98]",
                    "min-h-[120px] flex flex-col items-center justify-center",
                    mode.bgAccent,
                    mode.borderAccent
                  )}
                >
                  <div className={cn(
                    "w-11 h-11 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mb-3",
                    `bg-gradient-to-br ${mode.gradient}`
                  )}>
                    <mode.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1 text-base sm:text-sm">{mode.name}</h3>
                  <p className="text-sm sm:text-xs text-slate-500 text-center line-clamp-2">
                    {mode.tagline}
                  </p>
                </a>
              ))}
            </div>
          </div>

          {/* CTA Buttons - Full width stacked on mobile */}
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 items-stretch sm:items-center justify-center px-2 sm:px-0 opacity-0 animate-fade-in-up delay-400">
            <Link to="/auth/register" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 h-12 sm:h-11 px-6 sm:px-8 text-base font-semibold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/studio?demo=true" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-12 sm:h-11 px-6 sm:px-8 text-base border-2"
              >
                <Zap className="w-4 h-4 mr-2" />
                Try Live Demo
              </Button>
            </Link>
          </div>

          {/* Stats - Grid layout prevents overflow */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 md:gap-12 mt-10 sm:mt-12 pt-6 sm:pt-8 border-t border-slate-100 max-w-sm sm:max-w-none mx-auto">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                  <span className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tabular-nums">
                    {stat.value}
                  </span>
                  {stat.icon && (
                    <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 fill-amber-400" />
                  )}
                </div>
                <span className="text-xs sm:text-sm text-slate-500 block mt-0.5 sm:mt-1">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Sections - Mobile optimized */}
      {modes.map((mode, index) => (
        <section
          key={mode.id}
          id={mode.id}
          className={cn(
            "py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 overflow-hidden scroll-mt-16",
            index % 2 === 1 ? 'bg-slate-50' : 'bg-white'
          )}
        >
          <div className="max-w-7xl mx-auto">
            <div className={cn(
              "grid gap-8 md:gap-12 items-center",
              "grid-cols-1 lg:grid-cols-2",
              index % 2 === 1 && "lg:[&>*:first-child]:order-2"
            )}>
              {/* Content */}
              <div className="text-center lg:text-left">
                {/* Mode Badge */}
                <div className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-3 sm:mb-4",
                  mode.bgAccent,
                  mode.textAccent
                )}>
                  <mode.icon className="w-4 h-4" />
                  {mode.name}
                </div>

                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-3 sm:mb-4">
                  {mode.tagline}
                </h2>

                <p className="text-base sm:text-lg text-slate-600 mb-6 sm:mb-8 max-w-xl mx-auto lg:mx-0">
                  {mode.description}
                </p>

                {/* Feature List */}
                <ul className="space-y-3 mb-6 sm:mb-8 inline-block text-left">
                  {mode.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                        `bg-gradient-to-br ${mode.gradient}`
                      )}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-slate-700 text-sm sm:text-base">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link to={`/studio?feature=${mode.id}&demo=true`} className="block sm:inline-block">
                  <Button
                    size="lg"
                    className={cn(
                      "h-11 sm:h-12 px-6 sm:px-8 w-full sm:w-auto",
                      `bg-gradient-to-r ${mode.gradient} hover:opacity-90`
                    )}
                  >
                    Try {mode.name}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>

              {/* Screenshot */}
              <div className="relative">
                <div className={cn(
                  "relative rounded-xl sm:rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl border",
                  mode.borderAccent
                )}>
                  {/* Screenshot placeholder */}
                  <div className="aspect-[4/3] bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                    <div className="text-center p-6 sm:p-8">
                      <mode.icon className="w-12 h-12 sm:w-16 sm:h-16 text-slate-600 mx-auto mb-3 sm:mb-4" />
                      <p className="text-slate-500 text-xs sm:text-sm">
                        Screenshot: {mode.name} Mode
                      </p>
                      <p className="text-slate-600 text-[10px] sm:text-xs mt-2">
                        Use ?screenshot=true in Studio to capture
                      </p>
                    </div>
                  </div>

                  {/* Hero Control Label */}
                  <div className={cn(
                    "absolute top-3 right-3 sm:top-4 sm:right-4 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium shadow-lg",
                    "bg-white/90 backdrop-blur-sm border",
                    mode.borderAccent,
                    mode.textAccent
                  )}>
                    <span className="text-slate-500 mr-1">Hero:</span>
                    {mode.heroControl}
                  </div>
                </div>

                {/* Decorative elements - smaller on mobile */}
                <div className={cn(
                  "absolute -z-10 w-48 h-48 sm:w-72 sm:h-72 rounded-full blur-2xl sm:blur-3xl opacity-20",
                  `bg-gradient-to-br ${mode.gradient}`,
                  index % 2 === 0 ? "-bottom-12 -right-12 sm:-bottom-20 sm:-right-20" : "-bottom-12 -left-12 sm:-bottom-20 sm:-left-20"
                )} />
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Final CTA Section - Mobile optimized */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-600 to-indigo-700 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-16 sm:w-20 h-16 sm:h-20 border border-white rounded-full" />
          <div className="absolute bottom-10 right-10 w-24 sm:w-32 h-24 sm:h-32 border border-white rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-12 sm:w-16 h-12 sm:h-16 border border-white rounded-full" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
            Ready to Transform Your Product Images?
          </h2>
          <p className="text-base sm:text-lg text-purple-100 mb-6 sm:mb-8 max-w-xl mx-auto px-2">
            Join thousands of brands using AI to create stunning product photography.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 items-stretch sm:items-center justify-center px-2 sm:px-0">
            <Link to="/auth/register" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-white text-purple-700 hover:bg-purple-50 h-12 px-6 sm:px-8 font-semibold"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/studio?demo=true" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-12 px-6 sm:px-8 border-2 border-white/30 text-white hover:bg-white/10"
              >
                View Live Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer - Mobile optimized */}
      <footer className="py-8 sm:py-10 md:py-12 px-4 sm:px-6 lg:px-8 bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <Wand2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white">Image Optimizer Pro</span>
            </div>
            <p className="text-slate-400 text-sm text-center sm:text-right">
              &copy; {new Date().getFullYear()} Image Optimizer Pro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky CTA - appears after scrolling past hero */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-lg border-t border-slate-200 p-3 pb-safe",
          "transform transition-transform duration-300",
          showStickyCTA ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="flex gap-2 max-w-lg mx-auto">
          <Link to="/auth/register" className="flex-1">
            <Button className="w-full h-11 bg-purple-600 hover:bg-purple-700 font-semibold text-sm">
              Start Free Trial
            </Button>
          </Link>
          <Link to="/studio?demo=true">
            <Button variant="outline" className="h-11 px-4 border-2">
              <Zap className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
