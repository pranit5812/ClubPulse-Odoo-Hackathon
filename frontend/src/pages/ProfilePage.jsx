import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { DashboardLayout } from '../components/DashboardLayout';
import { UserAvatar } from '../components/UserAvatar';
import {
  User,
  Edit3,
  KeyRound,
  Settings,
  Mail,
  Phone,
  BookOpen,
  Calendar,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Save,
  RotateCcw,
  Camera,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  Bell,
  Globe,
  SlidersHorizontal,
  Ticket,
  CheckSquare,
  Building2,
  Wallet,
  ArrowRight,
  LogOut,
  Sparkles,
  Info,
  Users
} from 'lucide-react';

export const ProfilePage = () => {
  const { user: authUser, updateUser, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab with URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['overview', 'edit', 'password', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Profile data from backend
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    bio: '',
    department: '',
    designation: '',
    avatar_url: ''
  });
  const [editErrors, setEditErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Change password state
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');

  // Settings state
  const [notificationPrefs, setNotificationPrefs] = useState({
    email_alerts: true,
    event_reminders: true,
    announcements: true,
    treasury_updates: true
  });
  const [visibilityPref, setVisibilityPref] = useState('club_members');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState('');

  // Fetch full profile from backend
  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get('/api/users/me');
      setProfile(data);

      // Pre-fill edit form
      setEditForm({
        full_name: data.full_name || '',
        phone: data.phone || '',
        bio: data.bio || '',
        department: data.department || '',
        designation: data.designation || '',
        avatar_url: data.avatar_url || ''
      });

      // Pre-fill settings
      if (data.notification_preferences) {
        setNotificationPrefs(data.notification_preferences);
      }
      if (data.profile_visibility) {
        setVisibilityPref(data.profile_visibility);
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
      setError(err.message || 'Could not load profile. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Validation for Edit Profile
  const validateEditForm = () => {
    const errors = {};
    if (!editForm.full_name.trim()) {
      errors.full_name = 'Full name is required.';
    } else if (editForm.full_name.trim().length < 2) {
      errors.full_name = 'Full name must be at least 2 characters.';
    }

    if (editForm.phone && editForm.phone.trim()) {
      // Basic phone format check: must contain at least 7 digits
      const digits = editForm.phone.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) {
        errors.phone = 'Please enter a valid phone number (7-15 digits).';
      }
    }

    if (editForm.bio && editForm.bio.length > 500) {
      errors.bio = 'Bio cannot exceed 500 characters.';
    }

    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Edit Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!validateEditForm()) return;

    try {
      setSavingProfile(true);
      setSaveSuccessMsg('');
      const updated = await api.patch('/api/users/me', editForm);
      setProfile(updated);
      updateUser(updated); // Sync auth context & top navbar avatar immediately!
      setSaveSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 4500);
    } catch (err) {
      alert(`Failed to save profile: ${err.message}`);
    } finally {
      setSavingProfile(false);
    }
  };

  // Reset Edit Profile Form to original data
  const handleResetEditForm = () => {
    if (!profile) return;
    setEditForm({
      full_name: profile.full_name || '',
      phone: profile.phone || '',
      bio: profile.bio || '',
      department: profile.department || '',
      designation: profile.designation || '',
      avatar_url: profile.avatar_url || ''
    });
    setEditErrors({});
  };

  // Preset avatar pickers for convenience
  const PRESET_AVATARS = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&fit=crop&q=80',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&fit=crop&q=80'
  ];

  // Validation for Change Password
  const validatePasswordForm = () => {
    const errors = {};
    if (!passwordForm.current_password) {
      errors.current_password = 'Current password is required.';
    }
    if (!passwordForm.new_password) {
      errors.new_password = 'New password is required.';
    } else if (passwordForm.new_password.length < 6) {
      errors.new_password = 'New password must be at least 6 characters long.';
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      errors.confirm_password = 'Passwords do not match.';
    }
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!validatePasswordForm()) return;

    try {
      setSavingPassword(true);
      setPasswordSuccessMsg('');
      const res = await api.post('/api/users/me/change-password', passwordForm);
      setPasswordSuccessMsg(res.message || 'Password changed successfully!');
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      setTimeout(() => setPasswordSuccessMsg(''), 5000);
    } catch (err) {
      alert(`Password change failed: ${err.message}`);
    } finally {
      setSavingPassword(false);
    }
  };

  // Submit Account Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      setSettingsSuccessMsg('');
      const updated = await api.patch('/api/users/me', {
        notification_preferences: notificationPrefs,
        profile_visibility: visibilityPref
      });
      setProfile(updated);
      updateUser(updated);
      setSettingsSuccessMsg('Account settings and preferences saved successfully!');
      setTimeout(() => setSettingsSuccessMsg(''), 4500);
    } catch (err) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const roleName = (profile?.role || authUser?.role || 'student').toUpperCase();
  const getRoleBadgeClasses = (r) => {
    switch (r?.toLowerCase()) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'organizer':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'treasurer':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <DashboardLayout pageTitle="User Profile" breadcrumbs={[{ label: 'Account' }, { label: 'Profile' }]}>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* ============================================================== */}
        {/* A. PROFILE HERO HEADER CARD                                    */}
        {/* ============================================================== */}
        <div className="bg-white rounded-3xl border border-[#E7E9F1] shadow-xs overflow-hidden">
          {/* Top Decorative Banner */}
          <div className="h-32 sm:h-40 bg-gradient-to-r from-[#625BF6] via-[#7B73F8] to-[#9061F9] relative p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_70%)]" />
            <div className="absolute right-6 top-6 hidden sm:flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-md border border-white/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Verified Account</span>
              </span>
            </div>
          </div>

          {/* Profile User Info Strip */}
          <div className="px-6 pb-6 pt-3 relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="-mt-16 sm:-mt-20 shrink-0">
                <UserAvatar
                  user={profile || authUser}
                  size="2xl"
                  showRing={true}
                  className="border-4 border-white shadow-md ring-0 bg-white"
                />
              </div>
              <div className="space-y-1 pb-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-[#171A2B] tracking-tight">
                    {profile?.full_name || authUser?.full_name || 'Loading...'}
                  </h1>
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-md uppercase tracking-wider border ${getRoleBadgeClasses(
                      profile?.role || authUser?.role
                    )}`}
                  >
                    {roleName}
                  </span>
                  {profile?.membership_status === 'active' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Active Member
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#687086] flex items-center gap-2">
                  <span>{profile?.email || authUser?.email}</span>
                  {profile?.roll_number && (
                    <>
                      <span>•</span>
                      <span className="font-mono">{profile.roll_number}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Quick Action Navigation Buttons */}
            <div className="flex items-center gap-2 flex-wrap pt-2 sm:pt-0 sm:pb-1">
              <button
                type="button"
                onClick={() => handleTabChange('edit')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all ${
                  activeTab === 'edit'
                    ? 'bg-[#625BF6] text-white shadow-xs'
                    : 'bg-[#F7F8FC] hover:bg-[#F0F1FA] text-[#171A2B] border border-[#E7E9F1]'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('password')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all ${
                  activeTab === 'password'
                    ? 'bg-[#625BF6] text-white shadow-xs'
                    : 'bg-[#F7F8FC] hover:bg-[#F0F1FA] text-[#171A2B] border border-[#E7E9F1]'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Password</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('settings')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all ${
                  activeTab === 'settings'
                    ? 'bg-[#625BF6] text-white shadow-xs'
                    : 'bg-[#F7F8FC] hover:bg-[#F0F1FA] text-[#171A2B] border border-[#E7E9F1]'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* TABS CONTROLLER                                                */}
        {/* ============================================================== */}
        <div className="flex items-center gap-2 border-b border-[#E7E9F1] pb-3 overflow-x-auto">
          {[
            { id: 'overview', label: 'Profile Overview', icon: User },
            { id: 'edit', label: 'Edit Profile Information', icon: Edit3 },
            { id: 'password', label: 'Change Password', icon: KeyRound },
            { id: 'settings', label: 'Account Preferences', icon: Settings }
          ].map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#625BF6] text-white shadow-xs'
                    : 'bg-white text-[#687086] border border-[#E7E9F1] hover:bg-[#F7F8FC]'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ============================================================== */}
        {/* TAB 1: OVERVIEW & ROLE INTELLIGENCE                            */}
        {/* ============================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Top Grid: Personal Details + Role Specific Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column (2 Cols): Personal Details & Bio */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-[#E7E9F1] shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F8]">
                    <h3 className="text-sm font-extrabold text-[#171A2B] flex items-center gap-2">
                      <User className="w-4 h-4 text-[#625BF6]" />
                      Personal Information
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleTabChange('edit')}
                      className="text-xs font-bold text-[#625BF6] hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[11px] font-semibold text-[#687086] block">Full Name</span>
                      <span className="text-xs font-bold text-[#171A2B]">{profile?.full_name || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-[#687086] block">Email Address</span>
                      <span className="text-xs font-bold text-[#171A2B]">{profile?.email || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-[#687086] block">Phone Number</span>
                      <span className="text-xs font-bold text-[#171A2B]">{profile?.phone || 'Not provided'}</span>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-[#687086] block">Department / Course</span>
                      <span className="text-xs font-bold text-[#171A2B]">{profile?.department || 'Computer Science & Engineering'}</span>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-[#687086] block">Designation</span>
                      <span className="text-xs font-bold text-[#171A2B]">{profile?.designation || (roleName + ' Member')}</span>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-[#687086] block">Member Since</span>
                      <span className="text-xs font-bold text-[#171A2B]">
                        {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Spring 2026'}
                      </span>
                    </div>
                  </div>

                  {/* Bio Card */}
                  <div className="pt-3 border-t border-[#F3F4F8]">
                    <span className="text-[11px] font-semibold text-[#687086] block mb-1">About & Biography</span>
                    <p className="text-xs text-[#171A2B] leading-relaxed bg-[#F7F8FC] p-3 rounded-xl border border-[#E7E9F1]">
                      {profile?.bio || 'No personal bio added yet. Click Edit Profile to add a summary about your campus activities and passions.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column (1 Col): Role-Specific Operational Card */}
              <div className="space-y-6">
                {/* 1. Student Role Card */}
                {profile?.role === 'student' && (
                  <div className="bg-white rounded-2xl p-6 border border-indigo-100 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F8]">
                      <h3 className="text-sm font-extrabold text-[#171A2B] flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#625BF6]" />
                        Student Credentials
                      </h3>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                        Campus ID
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-[#F3F4F8]">
                        <span className="text-[#687086]">Student ID / Roll No</span>
                        <span className="font-mono font-bold text-[#171A2B]">
                          {profile?.role_details?.roll_number || profile?.roll_number || 'STU-2024-042'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[#F3F4F8]">
                        <span className="text-[#687086]">Membership Status</span>
                        {profile?.membership_status === 'active' ? (
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 capitalize">
                            Active Member
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                              Non-Member
                            </span>
                            <Link to="/membership" className="text-[11px] font-bold text-[#625BF6] hover:underline">
                              Join →
                            </Link>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[#F3F4F8]">
                        <span className="text-[#687086]">Renewal Expiry</span>
                        <span className="font-mono text-[#171A2B]">
                          {profile?.membership_expiry ? new Date(profile.membership_expiry).toLocaleDateString('en-IN') : 'Not Subscribed'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[#F3F4F8]">
                        <span className="text-[#687086]">Event Registrations</span>
                        <span className="font-bold text-[#625BF6]">
                          {profile?.role_details?.events_registered_count ?? 3} Active Passes
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-[#687086]">Volunteer Tasks</span>
                        <span className="font-bold text-[#171A2B]">
                          {profile?.role_details?.volunteer_tasks_count ?? 1} Tasks Assigned
                        </span>
                      </div>
                    </div>

                    <Link
                      to="/my-tickets"
                      className="w-full mt-2 py-2 px-3 text-xs font-bold text-[#625BF6] bg-[#625BF6]/10 hover:bg-[#625BF6]/20 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>View My QR Passes</span>
                    </Link>
                  </div>
                )}

                {/* 2. Organizer Role Card */}
                {profile?.role === 'organizer' && (
                  <div className="bg-white rounded-2xl p-6 border border-indigo-100 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F8]">
                      <h3 className="text-sm font-extrabold text-[#171A2B] flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        Organizer Portfolio
                      </h3>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                        Council Lead
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold text-[#687086] block">Organization</span>
                        <span className="font-bold text-[#171A2B]">
                          {profile?.role_details?.organization || 'ClubPulse Student Council'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-[#687086] block">Executive Designation</span>
                        <span className="font-bold text-[#625BF6]">
                          {profile?.role_details?.designation || 'Lead Event Director'}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-[#F3F4F8]">
                        <span className="text-[10px] font-semibold text-[#687086] block mb-1.5">
                          Assigned Responsibilities
                        </span>
                        <ul className="space-y-1 text-[11px] text-[#171A2B]">
                          {(profile?.role_details?.assigned_responsibilities || [
                            'Event Creation & Lifecycle Control',
                            'Attendee Capacity & Ticket Tier Management',
                            'Volunteer Task Assignment & Rosters'
                          ]).map((r, idx) => (
                            <li key={idx} className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3 h-3 text-indigo-600 shrink-0" />
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <Link
                      to="/organizer/events"
                      className="w-full mt-2 py-2 px-3 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Manage Events & Tickets</span>
                    </Link>
                  </div>
                )}

                {/* 3. Treasurer Role Card */}
                {profile?.role === 'treasurer' && (
                  <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F8]">
                      <h3 className="text-sm font-extrabold text-[#171A2B] flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-emerald-600" />
                        Treasury Governance
                      </h3>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Financial Officer
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold text-[#687086] block">Organization</span>
                        <span className="font-bold text-[#171A2B]">
                          {profile?.role_details?.organization || 'ClubPulse Executive Treasury'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-[#687086] block">Clearance</span>
                        <span className="font-bold text-emerald-700">
                          {profile?.role_details?.security_clearance || 'Treasury Level 2 (Public Accounting)'}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-[#F3F4F8]">
                        <span className="text-[10px] font-semibold text-[#687086] block mb-1.5">
                          Financial Permissions
                        </span>
                        <ul className="space-y-1 text-[11px] text-[#171A2B]">
                          {(profile?.role_details?.financial_permissions || [
                            'Live Simulator Scenario Modeling',
                            'Category Expense Allocation',
                            'Realized Intake Reconciliation',
                            'Treasury Ledger Auditing'
                          ]).map((p, idx) => (
                            <li key={idx} className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <Link
                      to="/ledger"
                      className="w-full mt-2 py-2 px-3 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Open Treasury Ledger</span>
                    </Link>
                  </div>
                )}

                {/* 4. Admin Role Card */}
                {profile?.role === 'admin' && (
                  <div className="bg-white rounded-2xl p-6 border border-purple-100 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F8]">
                      <h3 className="text-sm font-extrabold text-[#171A2B] flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-600" />
                        Administrator Powers
                      </h3>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                        Super User
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold text-[#687086] block">Department</span>
                        <span className="font-bold text-[#171A2B]">
                          {profile?.role_details?.department || 'Executive Council & IT Administration'}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-[#F3F4F8]">
                        <span className="text-[10px] font-semibold text-[#687086] block mb-1.5">
                          Assigned Permissions
                        </span>
                        <ul className="space-y-1 text-[11px] text-[#171A2B]">
                          {(profile?.role_details?.assigned_permissions || [
                            'Global User Management & Governance',
                            'Role Assignment & Security Policy Enforcement',
                            'Audit Trail Oversight',
                            'System Health & Service Integration'
                          ]).map((p, idx) => (
                            <li key={idx} className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3 h-3 text-purple-600 shrink-0" />
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <Link
                      to="/admin/users"
                      className="w-full mt-2 py-2 px-3 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Manage All Users</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: EDIT PROFILE FORM                                       */}
        {/* ============================================================== */}
        {activeTab === 'edit' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E7E9F1] shadow-xs space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#F3F4F8]">
              <div>
                <h2 className="text-base font-bold text-[#171A2B] flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[#625BF6]" />
                  <span>Edit Personal Information</span>
                </h2>
                <p className="text-xs text-[#687086] mt-0.5">
                  Update your contact details, biography, avatar, and department credentials.
                </p>
              </div>
              <span className="text-xs text-[#687086]">
                Role & permissions are locked to your designated track.
              </span>
            </div>

            {saveSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Avatar Selection Strip */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold text-[#171A2B] block">Profile Avatar</label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <UserAvatar
                    avatarUrl={editForm.avatar_url}
                    name={editForm.full_name || 'User'}
                    role={profile?.role}
                    size="xl"
                    showRing={true}
                  />
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-[#687086]">Quick Presets:</span>
                      {PRESET_AVATARS.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setEditForm((prev) => ({ ...prev, avatar_url: url }))}
                          className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all ${
                            editForm.avatar_url === url ? 'border-[#625BF6] scale-110' : 'border-[#E7E9F1] hover:border-[#625BF6]'
                          }`}
                        >
                          <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                      {editForm.avatar_url && (
                        <button
                          type="button"
                          onClick={() => setEditForm((prev) => ({ ...prev, avatar_url: '' }))}
                          className="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear to Initials</span>
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      placeholder="Or enter custom image URL (https://...)"
                      value={editForm.avatar_url}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, avatar_url: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#E7E9F1] bg-[#F7F8FC] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#625BF6]"
                    />
                  </div>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#171A2B] block">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.full_name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, full_name: e.target.value }))}
                    className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                      editErrors.full_name ? 'border-rose-400 bg-rose-50/30' : 'border-[#E7E9F1] bg-[#F7F8FC]'
                    } focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#625BF6] transition-all`}
                  />
                  {editErrors.full_name && (
                    <span className="text-[11px] text-rose-600 block">{editErrors.full_name}</span>
                  )}
                </div>

                {/* Email (Read-Only) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#171A2B] block">
                    Email Address <span className="text-[#687086] text-[10px]">(Account Login Identifier)</span>
                  </label>
                  <input
                    type="email"
                    disabled
                    value={profile?.email || authUser?.email || ''}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E7E9F1] bg-[#F3F4F8] text-[#687086] cursor-not-allowed"
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#171A2B] block">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                      editErrors.phone ? 'border-rose-400 bg-rose-50/30' : 'border-[#E7E9F1] bg-[#F7F8FC]'
                    } focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#625BF6] transition-all`}
                  />
                  {editErrors.phone && (
                    <span className="text-[11px] text-rose-600 block">{editErrors.phone}</span>
                  )}
                </div>

                {/* Department / Course */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#171A2B] block">Department or Program</label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science, Finance, Arts"
                    value={editForm.department}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E7E9F1] bg-[#F7F8FC] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#625BF6] transition-all"
                  />
                </div>

                {/* Designation */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-[#171A2B] block">Role Designation Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Student Lead, Core Volunteer, Treasurer"
                    value={editForm.designation}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, designation: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E7E9F1] bg-[#F7F8FC] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#625BF6] transition-all"
                  />
                </div>

                {/* Bio */}
                <div className="space-y-1 sm:col-span-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-[#171A2B] block">Short Biography</label>
                    <span className="text-[10px] text-[#687086]">{editForm.bio.length} / 500</span>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Tell other club members about yourself, your skills, and what drives you on campus..."
                    value={editForm.bio}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, bio: e.target.value }))}
                    className={`w-full p-3 text-xs rounded-xl border ${
                      editErrors.bio ? 'border-rose-400 bg-rose-50/30' : 'border-[#E7E9F1] bg-[#F7F8FC]'
                    } focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#625BF6] transition-all resize-none`}
                  />
                  {editErrors.bio && (
                    <span className="text-[11px] text-rose-600 block">{editErrors.bio}</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F3F4F8]">
                <button
                  type="button"
                  onClick={handleResetEditForm}
                  disabled={savingProfile}
                  className="px-4 py-2 text-xs font-semibold text-[#687086] hover:bg-[#F3F4F8] rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Changes</span>
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#625BF6] hover:bg-[#5249df] rounded-xl shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingProfile ? 'Saving Updates...' : 'Save Profile Updates'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: CHANGE PASSWORD FORM                                    */}
        {/* ============================================================== */}
        {activeTab === 'password' && (
          <div className="max-w-xl mx-auto bg-white rounded-2xl p-6 sm:p-8 border border-[#E7E9F1] shadow-xs space-y-6 animate-in fade-in duration-150">
            <div className="pb-4 border-b border-[#F3F4F8]">
              <h2 className="text-base font-bold text-[#171A2B] flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#625BF6]" />
                <span>Change Account Password</span>
              </h2>
              <p className="text-xs text-[#687086] mt-0.5">
                Protect your account by setting a strong, unique password.
              </p>
            </div>

            {passwordSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passwordSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Current Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#171A2B] block">Current Password</label>
                <div className="relative">
                  <input
                    type={showPassword.current ? 'text' : 'password'}
                    required
                    value={passwordForm.current_password}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))
                    }
                    className={`w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl border ${
                      passwordErrors.current_password ? 'border-rose-400' : 'border-[#E7E9F1]'
                    } bg-[#F7F8FC] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#625BF6]`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => ({ ...prev, current: !prev.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#687086] hover:text-[#171A2B]"
                  >
                    {showPassword.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.current_password && (
                  <span className="text-[11px] text-rose-600 block">{passwordErrors.current_password}</span>
                )}
              </div>

              {/* New Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#171A2B] block">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword.new ? 'text' : 'password'}
                    required
                    value={passwordForm.new_password}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))
                    }
                    className={`w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl border ${
                      passwordErrors.new_password ? 'border-rose-400' : 'border-[#E7E9F1]'
                    } bg-[#F7F8FC] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#625BF6]`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#687086] hover:text-[#171A2B]"
                  >
                    {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.new_password && (
                  <span className="text-[11px] text-rose-600 block">{passwordErrors.new_password}</span>
                )}
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#171A2B] block">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showPassword.confirm ? 'text' : 'password'}
                    required
                    value={passwordForm.confirm_password}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, confirm_password: e.target.value }))
                    }
                    className={`w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl border ${
                      passwordErrors.confirm_password ? 'border-rose-400' : 'border-[#E7E9F1]'
                    } bg-[#F7F8FC] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#625BF6]`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#687086] hover:text-[#171A2B]"
                  >
                    {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.confirm_password && (
                  <span className="text-[11px] text-rose-600 block">{passwordErrors.confirm_password}</span>
                )}
              </div>

              <div className="p-3 bg-[#F7F8FC] rounded-xl border border-[#E7E9F1] text-[11px] text-[#687086] space-y-1">
                <span className="font-semibold text-[#171A2B] block">Password Security Policy:</span>
                <p>• Must be at least 6 characters long.</p>
                <p>• Must be different from your current active password.</p>
                <p>• Stored using one-way cryptographic Bcrypt hashing with salted protection.</p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-[#625BF6] hover:bg-[#5249df] rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{savingPassword ? 'Verifying & Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: ACCOUNT PREFERENCES & SETTINGS                          */}
        {/* ============================================================== */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl p-6 sm:p-8 border border-[#E7E9F1] shadow-xs space-y-6 animate-in fade-in duration-150">
            <div className="pb-4 border-b border-[#F3F4F8]">
              <h2 className="text-base font-bold text-[#171A2B] flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#625BF6]" />
                <span>Account Settings & Preferences</span>
              </h2>
              <p className="text-xs text-[#687086] mt-0.5">
                Manage notifications, community directory privacy, and security sessions.
              </p>
            </div>

            {settingsSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{settingsSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Notification Preferences */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#171A2B] flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#625BF6]" />
                  <span>Notification Subscriptions</span>
                </h3>

                <div className="space-y-2">
                  {[
                    { key: 'email_alerts', label: 'Email Security & Login Alerts', desc: 'Receive instant alerts for logins and security credential changes' },
                    { key: 'event_reminders', label: 'Event Booking Reminders', desc: 'Get updates on booked event passes, schedule changes, and entry QR codes' },
                    { key: 'announcements', label: 'Campus Announcements', desc: 'Broadcast updates regarding student council activities' },
                    { key: 'treasury_updates', label: 'Treasury & Expense Claim Status', desc: 'Notifications for budget approvals and voucher payouts' }
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-start gap-3 p-3 rounded-xl border border-[#E7E9F1] bg-[#F7F8FC] hover:bg-white transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(notificationPrefs[item.key])}
                        onChange={(e) =>
                          setNotificationPrefs((prev) => ({ ...prev, [item.key]: e.target.checked }))
                        }
                        className="mt-0.5 rounded text-[#625BF6] focus:ring-[#625BF6] w-4 h-4"
                      />
                      <div>
                        <span className="text-xs font-bold text-[#171A2B] block">{item.label}</span>
                        <span className="text-[11px] text-[#687086] leading-tight block">{item.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Profile Visibility */}
              <div className="space-y-3 pt-3 border-t border-[#F3F4F8]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#171A2B] flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#625BF6]" />
                  <span>Profile Directory Visibility</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'club_members', label: 'Club Members Only', desc: 'Visible to verified students & staff' },
                    { id: 'public', label: 'Public Campus', desc: 'Listed on the open member roster' },
                    { id: 'private', label: 'Private Only', desc: 'Visible only to executive council' }
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        visibilityPref === opt.id
                          ? 'border-[#625BF6] bg-[#625BF6]/5 ring-1 ring-[#625BF6]'
                          : 'border-[#E7E9F1] bg-white hover:bg-[#F7F8FC]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value={opt.id}
                        checked={visibilityPref === opt.id}
                        onChange={(e) => setVisibilityPref(e.target.value)}
                        className="sr-only"
                      />
                      <span className="text-xs font-bold text-[#171A2B] block">{opt.label}</span>
                      <span className="text-[10px] text-[#687086] block mt-0.5">{opt.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-[#F3F4F8]">
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out of Account</span>
                </button>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-[#625BF6] hover:bg-[#5249df] rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingSettings ? 'Saving...' : 'Save Preferences'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
