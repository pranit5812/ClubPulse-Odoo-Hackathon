import React from 'react';

const ROLE_COLORS = {
  admin: 'from-purple-600 to-indigo-700 text-white',
  organizer: 'from-indigo-600 to-blue-700 text-white',
  treasurer: 'from-emerald-600 to-teal-700 text-white',
  student: 'from-[#625BF6] to-violet-600 text-white'
};

const SIZES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-24 h-24 text-3xl'
};

export const UserAvatar = ({
  user,
  name = '',
  avatarUrl = null,
  role = 'student',
  size = 'md',
  showRing = false,
  className = ''
}) => {
  const userName = user?.full_name || name || 'User';
  const userRole = (user?.role || role || 'student').toLowerCase();
  const url = user?.avatar_url || avatarUrl;

  // Extract initials (e.g. "Aarav Sharma" -> "AS")
  const getInitials = (str) => {
    if (!str) return 'U';
    const parts = str.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(userName);
  const sizeClasses = SIZES[size] || SIZES.md;
  const gradient = ROLE_COLORS[userRole] || ROLE_COLORS.student;
  const ringClass = showRing ? 'ring-2 ring-white ring-offset-2 ring-offset-[#625BF6]/20' : '';

  if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/'))) {
    return (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden bg-[#F3F4F8] shadow-xs ${sizeClasses} ${ringClass} ${className}`}
      >
        <img
          src={url}
          alt={userName}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to initials if image fails to load
            e.currentTarget.style.display = 'none';
            if (e.currentTarget.nextElementSibling) {
              e.currentTarget.nextElementSibling.style.display = 'flex';
            }
          }}
        />
        <div
          style={{ display: 'none' }}
          className={`w-full h-full bg-gradient-to-br ${gradient} font-bold items-center justify-center tracking-tight select-none`}
        >
          {initials}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full bg-gradient-to-br ${gradient} font-bold shadow-xs select-none ${sizeClasses} ${ringClass} ${className}`}
      title={userName}
    >
      <span>{initials}</span>
    </div>
  );
};

export default UserAvatar;
