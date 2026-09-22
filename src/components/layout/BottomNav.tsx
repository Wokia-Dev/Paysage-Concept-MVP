import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import {
  Home,
  CalendarDays,
  Users,
  MessageSquare,
  MoreHorizontal,
  Briefcase,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export function BottomNav() {
  const { profile } = useAuth();
  const isSupervisor = profile?.role === 'chef_equipe' || profile?.role === 'admin';

  const navItems: NavItem[] = isSupervisor
    ? [
      { to: '/', label: 'Accueil', icon: Home },
      { to: '/planning', label: 'Planning', icon: CalendarDays },
      { to: '/chantiers', label: 'Chantiers', icon: Briefcase },
      { to: '/equipe', label: 'Équipe', icon: Users },
      { to: '/plus', label: 'Plus', icon: MoreHorizontal },
    ]
    : [
      { to: '/', label: 'Accueil', icon: Home },
      { to: '/planning', label: 'Planning', icon: CalendarDays },
      { to: '/equipe', label: 'Équipe', icon: Users },
      { to: '/chat', label: 'Chat', icon: MessageSquare, badge: 'P2' },
      { to: '/plus', label: 'Plus', icon: MoreHorizontal },
    ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-sable/80 pb-safe">
      <div className="max-w-md mx-auto px-2 flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center w-16 py-1 transition-all duration-200 active:scale-95 ${isActive
                  ? 'text-terracotta font-semibold'
                  : 'text-foret/60 hover:text-foret font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                    {item.badge && (
                      <span className="absolute -top-1 -right-2 text-[9px] bg-sauge text-foret font-bold px-1 py-0.2 rounded-full leading-tight">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] mt-1 tracking-tight">{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 w-8 h-1 bg-terracotta rounded-full transition-all" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
