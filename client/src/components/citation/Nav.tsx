import { Link, useLocation } from 'react-router-dom'
import { Search, BarChart2, BookOpen, Trophy, FileText, Database, Code2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { to: '/search', label: 'Search', icon: Search },
  { to: '/registry', label: 'Registry', icon: Database },
  { to: '/verticals', label: 'Verticals', icon: BarChart2 },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/developers', label: 'Developers', icon: Code2 },
  { to: '/about', label: 'About', icon: BookOpen },
  { to: '/audit', label: 'Request Audit', icon: FileText },
]

export function Nav() {
  const { pathname } = useLocation()
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0 group">
          <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center">
            <span className="text-white text-xs font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>
              C
            </span>
          </div>
          <span
            className="text-slate-900 font-bold text-base tracking-tight hidden sm:block"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            citation.is
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0',
                pathname === to || pathname.startsWith(to + '/')
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden md:block">{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
