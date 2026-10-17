import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  ShieldAlert, 
  ShieldCheck, 
  UserCheck, 
  UserX, 
  KeyRound, 
  Edit3, 
  Eye, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Calendar, 
  Mail, 
  Phone, 
  Building, 
  Award,
  Sparkles,
  Lock
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { UserAvatar } from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

// ClubPulse Administrator Governance & User Directory Page
export function AdminUsersPage() {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [viewingUser, setViewingUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [roleModalUser, setRoleModalUser] = useState(null);
  const [newSelectedRole, setNewSelectedRole] = useState('');
  const [resetPassUser, setResetPassUser] = useState(null);
  const [tempPassword, setTempPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [dialogError, setDialogError] = useState('');

  // Edit form state
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    department: '',
    designation: '',
    bio: '',
    membership_status: 'active',
    is_active: true
  });

  const fetchUsers = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const data = await api.get('/api/admin/users');
      setUsers(data?.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError(err.message || 'Failed to retrieve user registry');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Compute metrics
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.is_active !== false).length;
    const admins = users.filter(u => u.role === 'admin' && u.is_active !== false).length;
    const organizers = users.filter(u => u.role === 'organizer').length;
    const treasurers = users.filter(u => u.role === 'treasurer').length;
    const students = users.filter(u => u.role === 'student').length;
    return { total, active, admins, organizers, treasurers, students };
  }, [users]);

  // Filtered list
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Role filter
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      // Status filter
      if (statusFilter === 'active' && u.is_active === false) return false;
      if (statusFilter === 'inactive' && u.is_active !== false) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (u.full_name || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const roll = (u.roll_number || '').toLowerCase();
        const dept = (u.department || '').toLowerCase();
        const phone = (u.phone || '').toLowerCase();
        return name.includes(q) || email.includes(q) || roll.includes(q) || dept.includes(q) || phone.includes(q);
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, searchQuery]);

  // Open Edit Modal
  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name || '',
      phone: user.phone || '',
      department: user.department || '',
      designation: user.designation || '',
      bio: user.bio || '',
      membership_status: user.membership_status || 'active',
      is_active: user.is_active !== false
    });
    setDialogError('');
  };

  // Submit User Profile Edit
  const handleSaveUserEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setActionLoading(true);
    setDialogError('');

    try {
      const updated = await api.patch(`/api/admin/users/${editingUser.id}`, editForm);
      setSuccessMsg(`Profile updated for ${editingUser.full_name || editingUser.email}`);
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...updated } : u));
      setEditingUser(null);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to update user:', err);
      setDialogError(err.message || 'Failed to update user profile');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Role Modal
  const handleOpenRoleModal = (user) => {
    setRoleModalUser(user);
    setNewSelectedRole(user.role);
    setDialogError('');
  };

  // Submit Role Change
  const handleSaveRoleChange = async () => {
    if (!roleModalUser || !newSelectedRole) return;
    if (newSelectedRole === roleModalUser.role) {
      setRoleModalUser(null);
      return;
    }

    setActionLoading(true);
    setDialogError('');

    try {
      await api.patch(`/api/admin/users/${roleModalUser.id}`, {
        role: newSelectedRole
      });
      setSuccessMsg(`Role for ${roleModalUser.full_name} updated to ${newSelectedRole.toUpperCase()}`);
      setUsers(prev => prev.map(u => u.id === roleModalUser.id ? { ...u, role: newSelectedRole } : u));
      setRoleModalUser(null);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to change role:', err);
      setDialogError(err.message || 'Failed to modify role assignment');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Account Active / Inactive
  const handleToggleActive = async (user) => {
    const nextStatus = !(user.is_active !== false);
    const actionLabel = nextStatus ? 'activate' : 'deactivate';

    if (user.role === 'admin' && !nextStatus && stats.admins <= 1) {
      setError('Cannot deactivate the sole active Administrator account.');
      setTimeout(() => setError(''), 4000);
      return;
    }

    if (!window.confirm(`Are you sure you want to ${actionLabel} account for ${user.full_name || user.email}?`)) {
      return;
    }

    try {
      await api.patch(`/api/admin/users/${user.id}`, { is_active: nextStatus });
      setSuccessMsg(`Account ${user.full_name} is now ${nextStatus ? 'Active' : 'Deactivated'}`);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: nextStatus } : u));
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to toggle active status:', err);
      setError(err.message || `Failed to ${actionLabel} account`);
      setTimeout(() => setError(''), 4000);
    }
  };

  // Open Reset Password
  const handleOpenResetPassword = (user) => {
    setResetPassUser(user);
    setTempPassword('');
    setConfirmPassword('');
    setDialogError('');
  };

  // Submit Password Reset
  const handleSaveResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPassUser) return;
    if (tempPassword.length < 6) {
      setDialogError('Password must be at least 6 characters long');
      return;
    }
    if (tempPassword !== confirmPassword) {
      setDialogError('Passwords do not match');
      return;
    }

    setActionLoading(true);
    setDialogError('');

    try {
      await api.post(`/api/admin/users/${resetPassUser.id}/reset-password`, {
        new_password: tempPassword,
        confirm_password: confirmPassword
      });
      setSuccessMsg(`Password successfully reset for ${resetPassUser.full_name}`);
      setResetPassUser(null);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to reset password:', err);
      setDialogError(err.message || 'Failed to reset password');
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">Admin</span>;
      case 'organizer':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">Organizer</span>;
      case 'treasurer':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Treasurer</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Student</span>;
    }
  };

  return (
    <DashboardLayout pageTitle="User Governance & Directory">
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 rounded-xl bg-violet-50 text-violet-600">
                <Users className="w-6 h-6" />
              </span>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                User Governance & Directory
              </h1>
            </div>
            <p className="text-slate-500 text-sm md:text-base max-w-2xl">
              Inspect user credentials, manage role privileges, maintain member states, and enforce strict last-active administrator protection policies.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchUsers(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-violet-600' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 shadow-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <span className="text-sm font-medium">{successMsg}</span>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3 shadow-sm animate-fade-in">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Users</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.active}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Admins</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.admins}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Organizers</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.organizers}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Treasurers</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.treasurers}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Students</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.students}</p>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, roll no, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 uppercase">Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-700"
              >
                <option value="all">All Roles</option>
                <option value="student">Student</option>
                <option value="organizer">Organizer</option>
                <option value="treasurer">Treasurer</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-700"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Deactivated Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table / Directory */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 text-center">
              <RefreshCw className="w-8 h-8 text-violet-600 animate-spin mx-auto mb-3" />
              <p className="text-slate-500 font-medium text-sm">Loading user directory...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-16 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No users found</h3>
              <p className="text-slate-500 text-sm mt-1">Try modifying your search or role filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/75 border-b border-slate-100 text-xs uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Department / Roll</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    const isActive = u.is_active !== false;
                    const isCurrentUser = currentAdmin?.id === u.id;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar user={u} size="md" />
                            <div>
                              <div className="font-semibold text-slate-900 flex items-center gap-2">
                                {u.full_name || 'Nameless User'}
                                {isCurrentUser && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-violet-100 text-violet-700 rounded">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400">{u.email}</div>
                              {u.phone && <div className="text-[11px] text-slate-400 mt-0.5">{u.phone}</div>}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getRoleBadge(u.role)}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-slate-800 font-medium">
                            {u.department || 'General'}
                          </div>
                          {u.roll_number && (
                            <div className="text-xs text-slate-400">ID: {u.roll_number}</div>
                          )}
                          {u.designation && (
                            <div className="text-xs text-slate-500 italic">{u.designation}</div>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                            <span className={`text-xs font-semibold ${isActive ? 'text-emerald-700' : 'text-rose-600'}`}>
                              {isActive ? 'Active' : 'Deactivated'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 capitalize">
                            Member: {u.membership_status || 'regular'}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View profile */}
                            <button
                              onClick={() => setViewingUser(u)}
                              title="View User Details"
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Edit info */}
                            <button
                              onClick={() => handleOpenEdit(u)}
                              title="Edit Profile Information"
                              className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Role management */}
                            <button
                              onClick={() => handleOpenRoleModal(u)}
                              title="Modify Role & Privileges"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <ShieldAlert className="w-4 h-4" />
                            </button>

                            {/* Reset password */}
                            <button
                              onClick={() => handleOpenResetPassword(u)}
                              title="Reset Password"
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>

                            {/* Active/Deactivate toggle */}
                            <button
                              onClick={() => handleToggleActive(u)}
                              title={isActive ? 'Deactivate Account' : 'Activate Account'}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isActive 
                                  ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' 
                                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* MODAL 1: VIEW USER DETAILS                                     */}
        {/* ------------------------------------------------------------- */}
        {viewingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative space-y-5">
              <button
                onClick={() => setViewingUser(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4">
                <UserAvatar user={viewingUser} size="lg" />
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{viewingUser.full_name}</h3>
                  <p className="text-sm text-slate-500">{viewingUser.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getRoleBadge(viewingUser.role)}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      viewingUser.is_active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {viewingUser.is_active !== false ? 'Active Account' : 'Deactivated'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm text-slate-700">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">User ID</span>
                  <span className="font-mono text-xs text-slate-800">{viewingUser.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">Department</span>
                  <span className="font-semibold">{viewingUser.department || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">Designation</span>
                  <span>{viewingUser.designation || 'None'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">Phone</span>
                  <span>{viewingUser.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">Roll / Student ID</span>
                  <span>{viewingUser.roll_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Joined Date</span>
                  <span>{viewingUser.created_at ? new Date(viewingUser.created_at).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>

              {viewingUser.bio && (
                <div className="bg-violet-50/50 border border-violet-100 rounded-xl p-3.5 text-sm text-slate-700">
                  <span className="text-xs font-bold text-violet-800 block mb-1">Bio</span>
                  <p className="italic text-slate-600">{viewingUser.bio}</p>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setViewingUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 2: EDIT USER PROFILE                                      */}
        {/* ------------------------------------------------------------- */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative space-y-4">
              <button
                onClick={() => setEditingUser(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-violet-50 text-violet-600">
                  <Edit3 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Edit User Profile</h3>
                  <p className="text-xs text-slate-500">{editingUser.email}</p>
                </div>
              </div>

              {dialogError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{dialogError}</span>
                </div>
              )}

              <form onSubmit={handleSaveUserEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.full_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Department</label>
                    <input
                      type="text"
                      value={editForm.department}
                      onChange={(e) => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Designation</label>
                    <input
                      type="text"
                      value={editForm.designation}
                      onChange={(e) => setEditForm(prev => ({ ...prev, designation: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Membership Status</label>
                    <select
                      value={editForm.membership_status}
                      onChange={(e) => setEditForm(prev => ({ ...prev, membership_status: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="active">Active</option>
                      <option value="regular">Regular</option>
                      <option value="pending">Pending</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Biography</label>
                  <textarea
                    rows={2}
                    value={editForm.bio}
                    onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 3: ROLE CHANGE & PRIVILEGE ASSIGNMENT                    */}
        {/* ------------------------------------------------------------- */}
        {roleModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative space-y-4">
              <button
                onClick={() => setRoleModalUser(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
                  <ShieldAlert className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Modify Role Assignment</h3>
                  <p className="text-xs text-slate-500">{roleModalUser.full_name} ({roleModalUser.email})</p>
                </div>
              </div>

              {dialogError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{dialogError}</span>
                </div>
              )}

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> High Privilege Action
                </p>
                <p>
                  Role modifications grant or revoke broad permissions across Treasury, Event Operations, and User Governance. System enforces protection on the last active Administrator.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">Select New Role</label>
                <div className="space-y-2">
                  {[
                    { id: 'student', title: 'Student', desc: 'Browse catalog, register for events, volunteer tasks' },
                    { id: 'organizer', title: 'Organizer', desc: 'Manage events, budget simulators, oversee operations' },
                    { id: 'treasurer', title: 'Treasurer', desc: 'Financial ledgers, expense validations, budget controls' },
                    { id: 'admin', title: 'Administrator', desc: 'Full system sovereignty, user governance, audit trails' }
                  ].map((r) => (
                    <label
                      key={r.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        newSelectedRole === r.id
                          ? 'border-violet-600 bg-violet-50/50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={r.id}
                        checked={newSelectedRole === r.id}
                        onChange={() => setNewSelectedRole(r.id)}
                        className="mt-1 text-violet-600 focus:ring-violet-500"
                      />
                      <div>
                        <div className="text-sm font-bold text-slate-800">{r.title}</div>
                        <div className="text-xs text-slate-500">{r.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRoleModalUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading || newSelectedRole === roleModalUser.role}
                  onClick={handleSaveRoleChange}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Updating Role...' : 'Confirm Role Change'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 4: SECURE PASSWORD RESET                                 */}
        {/* ------------------------------------------------------------- */}
        {resetPassUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative space-y-4">
              <button
                onClick={() => setResetPassUser(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                  <KeyRound className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Reset User Password</h3>
                  <p className="text-xs text-slate-500">{resetPassUser.full_name} ({resetPassUser.email})</p>
                </div>
              </div>

              {dialogError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{dialogError}</span>
                </div>
              )}

              <form onSubmit={handleSaveResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">New Temporary Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 6 characters"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setResetPassUser(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
