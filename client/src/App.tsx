import { lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CopilotKit } from '@copilotkit/react-core'
// CopilotSidebar is imported eagerly — lazy-loading it caused a blank screen
// because the outer Suspense boundary hid the entire app while the chunk loaded.
import { CopilotSidebar } from '@copilotkit/react-ui'
import '@copilotkit/react-ui/styles.css'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { CitationCopilot } from '@/components/citation/CitationCopilot'
import { Nav } from '@/components/citation/Nav'

// ─── Lazy-loaded pages ────────────────────────────────────────────────────────
// Each page is a separate dynamic chunk — only downloaded when first navigated to.
const CitationHome   = lazy(() => import('@/pages/CitationHome').then(m => ({ default: m.Home })))
const SearchPage     = lazy(() => import('@/pages/SearchPage').then(m => ({ default: m.Search })))
const Verticals      = lazy(() => import('@/pages/Verticals').then(m => ({ default: m.Verticals })))
const VerticalDetail = lazy(() => import('@/pages/VerticalDetail').then(m => ({ default: m.VerticalDetail })))
const Leaderboard    = lazy(() => import('@/pages/Leaderboard').then(m => ({ default: m.Leaderboard })))
const Audit          = lazy(() => import('@/pages/Audit').then(m => ({ default: m.Audit })))
const About          = lazy(() => import('@/pages/About').then(m => ({ default: m.About })))

// ─── Page loading fallback ────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
    </div>
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

// Determine the CopilotKit runtime URL — works both in dev and production
const COPILOT_RUNTIME_URL =
  (import.meta.env.VITE_COPILOT_RUNTIME_URL as string | undefined) ?? '/api/copilotkit'

function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div
          className="text-6xl font-bold text-slate-200 mb-4"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          404
        </div>
        <p className="text-slate-500 text-sm">Page not found</p>
      </div>
    </div>
  )
}

function AppRoutes() {
  const location = useLocation()
  return (
    <CopilotSidebar
      defaultOpen={false}
      labels={{
        title: 'citation.is Assistant',
        initial:
          'Ask me about scientific claims, research verticals, or request an audit. I have access to live data from the knowledge base.',
      }}
      instructions={`You are the citation.is scientific claim verification assistant. 
You help users understand scientific claims, find evidence, and navigate the knowledge base.
You have access to live data about:
- Global stats (total documents, claims, supported verdicts)
- Research verticals (Structural Biology, Salmon Biotech, and more)
- Search results for specific claims or topics
- Entity leaderboard rankings
Always be precise and cite specific numbers when available. 
If a user asks to search for something, suggest they use the search bar or tell them what you found in the readable context.
Current page: ${location.pathname}`}
    >
      <CitationCopilot />
      <div className="min-h-screen bg-white">
        <Nav />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<CitationHome />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/verticals" element={<Verticals />} />
            <Route path="/verticals/:domain" element={<VerticalDetail />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
    </CopilotSidebar>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CopilotKit runtimeUrl={COPILOT_RUNTIME_URL}>
        <BrowserRouter>
          <AppRoutes />
          <Toaster />
        </BrowserRouter>
      </CopilotKit>
    </QueryClientProvider>
  )
}
