import { BrowserRouter, Routes, Route } from 'react-router-dom'
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

export default function App() {
  return (
    <BrowserRouter>
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
      <Toaster />
    </BrowserRouter>
  )
}
