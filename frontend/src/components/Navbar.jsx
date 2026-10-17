import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';

export const Navbar = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E7E9F1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-white border border-[#E7E9F1] shadow-xs flex items-center justify-center overflow-hidden p-0.5 group-hover:scale-105 transition-transform shrink-0">
            <img src="/logo.png" alt="Skyline Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-[#171A2B] group-hover:text-[#625BF6] transition-colors">
              Skyline
            </span>
            <span className="hidden sm:inline-block ml-1.5 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#625BF6]/10 text-[#625BF6] border border-[#625BF6]/20">
              Intelligence
            </span>
          </div>
        </Link>

        {/* Right Section: Notifications & User Profile */}
        <div className="flex items-center gap-3">
          {user && <NotificationDropdown />}

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 p-1 pl-2 pr-3 rounded-xl border border-[#E7E9F1] hover:bg-[#F7F8FC] transition-colors text-xs font-semibold text-[#171A2B]"
              >
                <div className="w-6 h-6 rounded-full bg-[#625BF6]/10 text-[#625BF6] flex items-center justify-center font-bold">
                  {user.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:inline">{user.full_name?.split(' ')[0]}</span>
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="p-2 text-[#687086] hover:text-[#171A2B] rounded-xl hover:bg-[#F7F8FC] transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3 py-1.5 text-xs font-semibold text-[#687086] hover:text-[#171A2B] rounded-xl"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#625BF6] hover:bg-[#5048E5] rounded-xl shadow-xs transition-colors"
              >
                Join Club
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
