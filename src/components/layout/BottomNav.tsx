import { NavLink } from 'react-router-dom';
import {
  Home,
  Calendar,
  Users,
  MessageSquare,
  Sliders,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

const navItems: NavItem[] = [
  { to: '/', label: 'Accueil', icon: Home },
  { to: '/planning', label: 'Planning', icon: Calendar },
  { to: '/equipe', label: 'Équipe', icon: Users },
  { to: '/chat', label: 'Chat', icon: MessageSquare, badge: '2' },
  { to: '/plus', label: 'Plus', icon: Sliders },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-sable/80 pb-6">
      <div className="max-w-md mx-auto px-2 flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center min-w-[48px] min-h-[48px] w-16 py-1 transition-all duration-200 active:scale-95 ${isActive
                  ? 'text-foret font-bold'
                  : 'text-muted hover:text-foret font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative flex items-center justify-center">
                    <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                    {item.badge !== undefined && (
                      <span className="absolute -top-1.5 -right-3 bg-terracotta text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none shadow-xs">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] mt-0.5 tracking-tight leading-tight">{item.label}</span>
                  {isActive ? (
                    <span className="w-1.5 h-1.5 bg-sauge rounded-full mt-1" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full mt-1 opacity-0" />
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
