import React, { useState, useEffect } from 'react';
import { api, formatINR } from '../api/client';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Mail,
  Phone,
  Calendar,
  Plus,
  X,
  CreditCard,
  Bell,
  AlertTriangle,
  Send,
  Clock
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

export const MembersManagementPage = () => {
  const [members, setMembers] = useState([]);
  const [expiringSummary, setExpiringSummary] = useState({ expiring_count: 0, expired_count: 0, expiring_members: [] });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, pending, expired, expiring
  const [loading, setLoading] = useState(true);
  const [renewLoadingId, setRenewLoadingId] = useState(null);
  const [notifyingId, setNotifyingId] = useState(null);
  const [bulkNotifying, setBulkNotifying] = useState(false);
  const [toast, setToast] = useState(null);

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [renewModalMember, setRenewModalMember] = useState(null);
  const [paymentRef, setPaymentRef] = useState('');

  // Form state
  const [formState, setFormState] = useState({
    full_name: '',
    email: '',
    roll_number: '',
    department: 'Computer Science',
    membership_type: 'annual',
    dues_paid_inr: 500
  });
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const [membersData, expiringData] = await Promise.all([
        api.get('/api/members').catch(() => []),
        api.get('/api/members/expiring-summary').catch(() => ({ expiring_count: 0, expired_count: 0, expiring_members: [] }))
      ]);
      setMembers(membersData || []);
      setExpiringSummary(expiringData || { expiring_count: 0, expired_count: 0, expiring_members: [] });
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleSendRenewalNotice = async (memberId, memberName) => {
    setNotifyingId(memberId);
    try {
      await api.post(`/api/members/${memberId}/send-renewal-notice`);
      showToast(`Renewal notification sent to ${memberName}.`, 'success');
    } catch (err) {
      showToast(`Failed to send notification: ${err.message}`, 'error');
    } finally {
      setNotifyingId(null);
    }
  };

  const handleBulkRenewalNotices = async () => {
    setBulkNotifying(true);
    try {
      const res = await api.post('/api/members/send-bulk-renewal-notices');
      showToast(`Renewal notices sent to ${res.notified_count || 0} member(s) with expiring/overdue passes.`, 'success');
      fetchMembers();
    } catch (err) {
      showToast(`Failed to dispatch bulk notices: ${err.message}`, 'error');
    } finally {
      setBulkNotifying(false);
    }
  };

  const getExpiryInfo = (expiryDate, validUntil) => {
    const raw = expiryDate || validUntil;
    if (!raw) return { label: 'N/A', isUrgent: false, isExpired: false, dateStr: 'N/A' };
    const dateStr = raw.slice(0, 10);
    const diffDays = Math.ceil((new Date(raw) - new Date()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { label: `Expired (${Math.abs(diffDays)}d ago)`, isUrgent: true, isExpired: true, dateStr };
    }
    if (diffDays <= 30) {
      return { label: `Expires in ${diffDays}d`, isUrgent: true, isExpired: false, dateStr };
    }
    return { label: `Valid (${diffDays}d left)`, isUrgent: false, isExpired: false, dateStr };
  };

  const handleRenewMember = async (e) => {
    e.preventDefault();
    if (!renewModalMember) return;
    setRenewLoadingId(renewModalMember.id);
    try {
      await api.post(`/api/members/${renewModalMember.id}/renew`, {
        duration_months: 12,
        payment_reference: paymentRef || `RENEW-CASH-${Date.now()}`
      });
      setRenewModalMember(null);
      setPaymentRef('');
      fetchMembers();
    } catch (err) {
      alert(`Renewal failed: ${err.message}`);
    } finally {
      setRenewLoadingId(null);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/members', {
        full_name: formState.full_name,
        email: formState.email,
        roll_number: formState.roll_number,
        department: formState.department,
        membership_type: formState.membership_type,
        dues_paid_paise: Math.round(Number(formState.dues_paid_inr) * 100)
      });
      setAddModalOpen(false);
      setFormState({
        full_name: '',
        email: '',
        roll_number: '',
        department: 'Computer Science',
        membership_type: 'annual',
        dues_paid_inr: 500
      });
      fetchMembers();
    } catch (err) {
      alert(`Failed to add member: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.roll_number.toLowerCase().includes(search.toLowerCase());

    const expInfo = getExpiryInfo(m.expiry_date, m.valid_until);

    if (statusFilter === 'expiring') {
      return matchesSearch && (expInfo.isUrgent || m.status === 'expired');
    }
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout pageTitle="Member Roster & Registry">
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Toast Notification */}
        {toast && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between border shadow-sm transition-all ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{toast.msg}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-current opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#625BF6]/10 border border-[#625BF6]/20 text-xs font-semibold text-[#625BF6] mb-2">
              <Users className="w-3.5 h-3.5" />
              <span>Official Chapter Registry</span>
            </div>
            <h1 className="text-2xl font-bold text-[#171A2B] tracking-tight">
              Member Roster & Registry
            </h1>
            <p className="text-xs text-[#687086] mt-1">
              Verify student dues, departments, validity terms, and dispatch membership renewal notifications.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={fetchMembers}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl border border-[#E7E9F1] bg-white hover:bg-[#F7F8FC] text-xs font-semibold text-[#171A2B] flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setAddModalOpen(true)}
              className="px-4 py-2 bg-[#625BF6] hover:bg-[#5048E5] text-white rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
          </div>
        </div>

        {/* Expiring Memberships Action Banner */}
        {(expiringSummary.expiring_count > 0 || expiringSummary.expired_count > 0) && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 border border-amber-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[#171A2B]">
                    {expiringSummary.expiring_count + expiringSummary.expired_count} Memberships Expiring Soon or Overdue
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    Action Recommended
                  </span>
                </div>
                <p className="text-xs text-[#687086] mt-0.5">
                  Send renewal notices to alert students on their portal so they renew before losing voting eligibility and member event discounts.
                </p>
              </div>
            </div>

            <button
              onClick={handleBulkRenewalNotices}
              disabled={bulkNotifying}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
            >
              <Bell className={`w-3.5 h-3.5 ${bulkNotifying ? 'animate-bounce' : ''}`} />
              <span>{bulkNotifying ? 'Dispatching...' : 'Notify All Expiring Members'}</span>
            </button>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E7E9F1] shadow-2xs">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-[#687086] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by student name, roll number, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#687086] font-medium">Status:</span>
            {['all', 'active', 'expiring', 'pending', 'expired'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl font-bold capitalize transition-colors flex items-center gap-1 ${
                  statusFilter === st
                    ? 'bg-[#171A2B] text-white'
                    : 'bg-[#F7F8FC] text-[#687086] hover:bg-[#E7E9F1]'
                }`}
              >
                <span>{st}</span>
                {st === 'expiring' && (expiringSummary.expiring_count > 0 || expiringSummary.expired_count > 0) && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Members Table */}
        <div className="bg-white rounded-2xl border border-[#E7E9F1] shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton lines={5} />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={Users}
                title="No members match criteria"
                description="Try clearing search filters or registering new students in the club registry."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8FC] text-[#687086] uppercase font-bold border-b border-[#E7E9F1] text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Member Info</th>
                    <th className="py-3.5 px-4">Roll / Student ID</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Valid Until / Expiry</th>
                    <th className="py-3.5 px-4">Dues Paid</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E9F1] font-medium text-[#171A2B]">
                  {filteredMembers.map((mem) => {
                    const exp = getExpiryInfo(mem.expiry_date, mem.valid_until);
                    return (
                      <tr key={mem.id} className="hover:bg-[#F7F8FC]/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#171A2B]">{mem.full_name}</div>
                          <div className="text-[11px] text-[#687086] flex items-center gap-1">
                            <Mail className="w-3 h-3 text-[#687086]" />
                            <span>{mem.email}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-[#171A2B]">
                          {mem.roll_number}
                        </td>
                        <td className="py-3.5 px-4 text-[#687086]">{mem.department || 'General'}</td>
                        <td className="py-3.5 px-4">
                          <Badge variant={mem.status === 'active' ? 'positive' : mem.status === 'expired' ? 'critical' : 'warning'}>
                            {mem.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold text-[#171A2B]">{exp.dateStr}</div>
                            {exp.label !== 'N/A' && (
                              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                                exp.isExpired
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : exp.isUrgent
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'text-[#8B93A7]'
                              }`}>
                                <Clock className="w-2.5 h-2.5" />
                                <span>{exp.label}</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#16856B]">
                          {formatINR(mem.dues_paid_paise)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSendRenewalNotice(mem.id, mem.full_name)}
                              disabled={notifyingId === mem.id}
                              className="px-2.5 py-1.5 rounded-xl border border-amber-200 hover:border-amber-400 bg-amber-50/50 hover:bg-amber-100/60 font-semibold text-amber-800 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                              title="Send membership renewal alert notification to student portal"
                            >
                              <Bell className="w-3 h-3 text-amber-700" />
                              <span>{notifyingId === mem.id ? 'Sending...' : 'Notify'}</span>
                            </button>
                            <button
                              onClick={() => {
                                setRenewModalMember(mem);
                                setPaymentRef(`RENEW-REF-${Date.now().toString().slice(-6)}`);
                              }}
                              className="px-2.5 py-1.5 rounded-xl border border-[#E7E9F1] hover:border-[#625BF6] hover:bg-[#625BF6]/5 font-semibold text-[#625BF6] text-[11px] transition-colors"
                            >
                              Renew Pass
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

        {/* Add Member Modal */}
        {addModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17182B]/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E7E9F1] space-y-4">
              <div className="flex items-center justify-between border-b border-[#E7E9F1] pb-3">
                <h3 className="text-base font-bold text-[#171A2B] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#625BF6]" />
                  <span>Register New Student Member</span>
                </h3>
                <button onClick={() => setAddModalOpen(false)} className="text-[#687086] hover:text-[#171A2B]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddMember} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">Full Student Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Malhotra"
                    value={formState.full_name}
                    onChange={(e) => setFormState({ ...formState, full_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#171A2B] mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="student@clubpulse.edu"
                      value={formState.email}
                      onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#171A2B] mb-1">Roll / ID *</label>
                    <input
                      type="text"
                      required
                      placeholder="STU-2026-099"
                      value={formState.roll_number}
                      onChange={(e) => setFormState({ ...formState, roll_number: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#171A2B] mb-1">Department</label>
                    <input
                      type="text"
                      value={formState.department}
                      onChange={(e) => setFormState({ ...formState, department: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#171A2B] mb-1">Annual Dues Paid (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={formState.dues_paid_inr}
                      onChange={(e) => setFormState({ ...formState, dues_paid_inr: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E7E9F1] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="px-4 py-2 border rounded-xl text-[#687086] hover:bg-[#F7F8FC]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-[#625BF6] hover:bg-[#5048E5] text-white font-semibold rounded-xl"
                  >
                    {submitting ? 'Registering...' : 'Enroll Student'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Renew Member Modal */}
        {renewModalMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17182B]/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-[#E7E9F1] space-y-4">
              <div className="flex items-center justify-between border-b border-[#E7E9F1] pb-3">
                <h3 className="text-base font-bold text-[#171A2B] flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#16856B]" />
                  <span>Renew Pass for 1 Year</span>
                </h3>
                <button onClick={() => setRenewModalMember(null)} className="text-[#687086] hover:text-[#171A2B]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-[#687086]">
                Renewing annual pass for <strong className="text-[#171A2B]">{renewModalMember.full_name}</strong> ({renewModalMember.email}).
              </div>

              <form onSubmit={handleRenewMember} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">
                    Payment Reference / Receipt ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="e.g. UPI-TXN-98234 or CASH-REC-01"
                    className="w-full px-3 py-2 border rounded-xl bg-[#F7F8FC] border-[#E7E9F1]"
                  />
                </div>

                <div className="p-3 rounded-xl bg-[#16856B]/10 border border-[#16856B]/20 text-[11px] text-[#16856B]">
                  Validates duration extension (+12 months) and records transaction on ledger.
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRenewModalMember(null)}
                    className="px-4 py-2 border rounded-xl text-[#687086] hover:bg-[#F7F8FC]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={renewLoadingId === renewModalMember.id}
                    className="px-5 py-2 bg-[#16856B] hover:bg-[#13745D] text-white font-semibold rounded-xl"
                  >
                    {renewLoadingId === renewModalMember.id ? 'Processing...' : 'Confirm Renewal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
