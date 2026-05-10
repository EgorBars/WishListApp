import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gift, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="border-b border-gray-100 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 min-h-[44px] items-center justify-between gap-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-lg font-bold text-brand-primary sm:text-xl">
            <Gift size={24} className="sm:size-28" />
            <span className="hidden sm:inline">WishList App</span>
          </Link>

          {user && (
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="hidden max-w-[120px] truncate text-xs text-gray-600 sm:inline-block sm:max-w-[200px] sm:text-sm">{user.email}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="flex min-h-[44px] min-w-[44px] items-center gap-2 text-xs font-medium text-gray-500 transition-colors hover:text-brand-error sm:text-sm"
                aria-label="Выйти из аккаунта"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Выйти</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
