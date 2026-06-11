import { lazy, Suspense } from 'react'
import { CopilotKit } from '@copilotkit/react-core'
import '@copilotkit/react-ui/styles.css'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { CitationCopilot } from '@/components/citation/CitationCopilot'
import { Nav } from '@/components/citation/Nav'
import { Home as CitationHome } from '@/pages/CitationHome'
import { Search as SearchPage } from '@/pages/SearchPage'
import { Verticals } from '@/pages/Verticals'
import { VerticalDetail } from '@/pages/VerticalDetail'
import { Leaderboard } from '@/pages/Leaderboard'
import { Audit } from '@/pages/Audit'
import { About } from '@/pages/About'
import { RegistryPage } from '@/pages/RegistryPage'
import { ClaimDetail } from '@/pages/ClaimDetail'

// Lazy-load the 3.5MB CopilotSidebar so it doesn't block React from mounting.
// The QueryClientProvider + tRPC.Provider are owned by main.tsx — do NOT add
// another QueryClientProvider here or tRPC hooks will see two separate caches.
const CopilotSidebar = lazy(() =>
  import('@copilotkit/react-ui').then((m) => ({ default: m.CopilotSidebar }))
)

// CopilotKit runtime URL — works both in dev and production
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
    <Suspense
      fallback={
        <div className="min-h-screen bg-white">
          <Nav />
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
          </div>
        </div>
      }
    >
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
          <Routes>
            <Route path="/" element={<CitationHome />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/verticals" element={<Verticals />} />
            <Route path="/verticals/:domain" element={<VerticalDetail />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="/about" element={<About />} />
            <Route path="/registry" element={<RegistryPage />} />
            <Route path="/claims/:id" element={<ClaimDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </CopilotSidebar>
    </Suspense>
  )
}

export default function App() {
  return (
    <CopilotKit runtimeUrl={COPILOT_RUNTIME_URL}>
      <BrowserRouter>
        <AppRoutes />
        <Toaster />
      </BrowserRouter>
    </CopilotKit>
  )
}
