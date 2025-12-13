# Image Optimizer Pro

> AI-powered SaaS platform for optimizing product images using Claude AI and Kie.ai

## Overview

Image Optimizer Pro is a modern, multi-tenant SaaS platform that transforms raw product images (primarily jewelry) into professional, e-commerce-ready visuals using AI-powered optimization.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **UI**: Tailwind CSS + shadcn/ui
- **AI Integration**: Claude AI (prompts) + Kie.ai (image processing)
- **State Management**: TanStack React Query + Zustand
- **Payments**: Stripe (token-based billing)

## Features

### Core Functionality
- ✅ Multi-tenant organization management
- ✅ Token-based billing system
- ✅ Real-time processing updates (WebSocket)
- ✅ Google Drive integration
- ✅ Batch image processing with queue management
- ✅ AI Studio for individual image enhancement
  - **Quick Mode**: 3 essential sliders (Lighting, Contrast, Sharpness)
  - **Advanced Mode**: Full control via draggable floating panel (Camera, Lighting, Background, Jewelry, Composition)
  - **Panel Features**:
    - Drag-and-drop panel repositioning with position persistence
    - Drag-to-reorder sections within panel
    - Collapse/Expand all sections button
    - Mode persistence with localStorage
    - Custom section order persistence
- ✅ Project-based workflow
- ✅ Template and preset system

### UX Enhancements (Recently Implemented)
- ✅ **UX-001**: Empty Dashboard State with CTAs
- ✅ **UX-002**: Prominent Start Processing Button
- ✅ **UX-003**: Token Cost Estimate in Project Wizard
- ✅ **UX-004**: Processing Completion Notification with confetti
- ✅ **UX-005**: Folder Preview with thumbnails
- ✅ **UX-006**: First-Time User Onboarding Tour
- ✅ **UX-007**: Template vs Preset Explanation
- ✅ **UX-008**: Before/After Comparison Slider
- ✅ **UX-009**: Project Progress Indicators
- ✅ **UX-010**: Bulk Download with progress
- ✅ **UX-011**: Version Badges on re-optimized images
- ✅ **UX-012**: Simplified Re-optimize Flow
- ✅ **UX-013**: Drag-and-Drop Upload in Studio
- ✅ **UX-014**: Quick/Advanced Mode Toggle in Studio (Redesigned Phase 1)
- ✅ **UX-015**: Processing Success Celebration (confetti)
- ✅ **UX-016**: Quality Feedback System (thumbs up/down)
- ✅ **UX-018**: Enhanced Loading Skeletons with shimmer
- ✅ **UX-020**: Image Zoom on Hover
- ✅ **Studio Redesign**: Quick Mode (3 sliders) + Advanced Mode (draggable floating panel)
- ✅ **Draggable Advanced Panel**: Drag-and-drop panel repositioning with position memory
- ✅ **Reorderable Sections**: Drag sections to customize order + Collapse/Expand all button
- ✅ **Queue Modernization**: Soft gradients, modern pill-styled filters, enhanced cards

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm
- Supabase account
- Kie.ai API key
- Claude API key

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run development server
npm run dev
```

### Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_KIE_API_KEY=your_kie_api_key
VITE_CLAUDE_API_KEY=your_claude_api_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── project-wizard/ # Project creation flow
│   ├── queue/          # Processing queue UI
│   ├── studio/         # AI Studio components
│   └── onboarding/     # Onboarding tour
├── pages/              # Route pages
├── hooks/              # Custom React hooks
├── stores/             # Zustand state stores
├── lib/                # Utility functions
└── types/              # TypeScript types

supabase/
├── migrations/         # Database migrations
└── functions/          # Edge functions
```

## Database Schema

See [Technical Specification](./bmad-docs/technical-spec.md) for complete database schema.

Key tables:
- `organizations` - Multi-tenant organization management
- `token_accounts` - Token balance tracking
- `projects` - Image processing projects
- `processing_queue` - Real-time job queue
- `processing_history` - Completed processing results
- `prompt_templates` - AI prompt templates
- `studio_presets` - Studio configuration presets

## Development

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Type check
npm run type-check
```

## Deployment

The application is designed to be deployed on:
- **Frontend**: Vercel, Netlify, or Cloudflare Pages
- **Backend**: Supabase (managed)
- **Edge Functions**: Supabase Edge Functions

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Proprietary - All rights reserved

## Acknowledgments

- Built with [Claude Code](https://claude.com/claude-code)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Powered by [Supabase](https://supabase.com/)
