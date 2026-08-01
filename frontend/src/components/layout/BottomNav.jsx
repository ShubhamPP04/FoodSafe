import { NavLink } from 'react-router-dom'
import { Search, BookOpen, Calendar, Map, ShieldCheck, Users, Newspaper } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/scan',    icon: Search,       label: 'Scan'    },
  { to: '/diary',   icon: BookOpen,     label: 'Diary'   },
  { to: '/meal',    icon: Calendar,     label: 'Meal'    },
  { to: '/map',     icon: Map,          label: 'Map'     },
  { to: '/brands',  icon: ShieldCheck,  label: 'Brands'  },
  { to: '/family',  icon: Users,        label: 'Family'  },
  { to: '/news',    icon: Newspaper,    label: 'News'    },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-paper/90 backdrop-blur-md border-t border-rule z-50">
      <div className="max-w-lg mx-auto flex h-16">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => [
              'relative flex flex-col items-center justify-center gap-1 flex-1',
              'transition-colors duration-100',
              isActive ? 'text-brand' : 'text-ink-3',
            ].join(' ')}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-brand rounded-b-sm" />
                )}
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[9px] font-semibold">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
