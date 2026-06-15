import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
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
import { AuditDetail } from '@/pages/AuditDetail'
import { EntityPage } from '@/pages/EntityPage'
import { Developers } from '@/pages/Developers'
import DevelopersMcp from '@/pages/DevelopersMcp'
import DevelopersSlm from '@/pages/DevelopersSlm'
import { Contradictions } from '@/pages/Contradictions'
import { Methodology } from '@/pages/Methodology'
import { Pricing } from '@/pages/Pricing'
import { Dashboard as MyAccount } from '@/pages/Dashboard'
import { Status } from '@/pages/Status'
import { Welcome } from '@/pages/Welcome'
import Verify from '@/pages/Verify'

function NotFound() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center" role="main">
      <div className="text-center">
        <h1
          className="text-6xl font-bold text-slate-200 mb-4"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          404
        </h1>
        <p className="text-slate-500 text-sm">Page not found</p>
      </div>
    </main>
  )
}

function SiteFooter() {
  return (
    <footer className="border-t border-slate-100 py-8 mt-16" role="contentinfo">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
        <p>
          <a href="/" className="font-medium text-slate-600 hover:text-slate-900">citation.is</a>
          {' '}— Open registry of verified scientific claims.{' '}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-600"
          >
            CC BY 4.0
          </a>
        </p>
        <nav aria-label="Footer navigation">
          <ul className="flex gap-4 list-none p-0 m-0">
            <li><a href="/about" className="hover:text-slate-600">About</a></li>
            <li><a href="/methodology" className="hover:text-slate-600">Methodology</a></li>
            <li><a href="/pricing" className="hover:text-slate-600">Pricing</a></li>
            <li><a href="/developers" className="hover:text-slate-600">API</a></li>
            <li><a href="/dashboard" className="hover:text-slate-600">My Account</a></li>
            <li><a href="/status" className="hover:text-slate-600">Status</a></li>
            <li><a href="/llms.txt" className="hover:text-slate-600">llms.txt</a></li>
            <li><a href="/openapi.json" className="hover:text-slate-600">OpenAPI</a></li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}

function AppShell() {
  const { pathname } = useLocation()
  const isFullscreen = pathname === '/welcome'

  if (isFullscreen) {
    return (
      <>
        <Routes>
          <Route path="/welcome" element={<Welcome />} />
        </Routes>
        <Toaster />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Semantic header landmark — contains the primary site navigation */}
      <header role="banner">
        <Nav />
      </header>

      {/* Main content landmark */}
      <main role="main" className="flex-1">
        <Routes>
          <Route path="/" element={<CitationHome />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/verticals" element={<Verticals />} />
          <Route path="/verticals/:domain" element={<VerticalDetail />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/audit/:id" element={<AuditDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/registry" element={<RegistryPage />} />
          <Route path="/claims/:id" element={<ClaimDetail />} />
          <Route path="/entity/:type/:name" element={<EntityPage />} />
          <Route path="/developers" element={<Developers />} />
          <Route path="/developers/mcp" element={<DevelopersMcp />} />
          <Route path="/developers/slm" element={<DevelopersSlm />} />
          <Route path="/contradictions" element={<Contradictions />} />
          <Route path="/methodology" element={<Methodology />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/dashboard" element={<MyAccount />} />
          <Route path="/status" element={<Status />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/verify/:shareId" element={<Verify />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* Semantic footer landmark */}
      <SiteFooter />
      <Toaster />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
