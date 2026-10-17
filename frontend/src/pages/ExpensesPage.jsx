import React, { useState, useEffect, useRef } from 'react';
import { api, formatINR } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Receipt,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  X,
  AlertCircle,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Upload,
  FileText,
  Image,
  Eye,
  Trash2,
  Paperclip
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

// ─── Receipt File Uploader ────────────────────────────────────────────────────
const ReceiptUploader = ({ receiptFile, receiptPreview, onFileChange, onClear }) => {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileChange(file);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onFileChange(file);
  };

  const isPdf = receiptFile?.type === 'application/pdf';

  if (receiptFile) {
    return (
      <div className="border border-[#625BF6]/30 rounded-xl bg-[#EEEDFE]/40 p-3 flex items-center gap-3">
        {isPdf ? (
          <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-rose-500" />
          </div>
        ) : receiptPreview ? (
          <img
            src={receiptPreview}
            alt="Receipt preview"
            className="w-10 h-10 rounded-lg object-cover border border-[#E7E9F1] shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
            <Image className="w-5 h-5 text-indigo-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#171A2B] truncate">{receiptFile.name}</p>
          <p className="text-[10px] text-[#8B93A7]">
            {(receiptFile.size / 1024).toFixed(1)} KB · {isPdf ? 'PDF Document' : 'Image'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="p-1.5 rounded-lg hover:bg-rose-50 text-[#8B93A7] hover:text-rose-500 transition-colors"
          title="Remove file"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer transition-all ${
        dragging
          ? 'border-[#625BF6] bg-[#EEEDFE]/60 scale-[1.01]'
          : 'border-[#E7E9F1] bg-[#F7F8FC] hover:border-[#625BF6]/50 hover:bg-[#EEEDFE]/30'
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${dragging ? 'bg-[#625BF6] text-white' : 'bg-[#625BF6]/10 text-[#625BF6]'}`}>
        <Upload className="w-4.5 h-4.5" />
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold text-[#171A2B]">
          {dragging ? 'Drop your receipt here' : 'Upload Fee Receipt'}
        </p>
        <p className="text-[10px] text-[#8B93A7] mt-0.5">
          Drag & drop or click · JPG, PNG, PDF up to 8MB
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
};

// ─── Receipt Viewer Cell ──────────────────────────────────────────────────────
const ReceiptCell = ({ receiptUrl, receiptFilename }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  if (!receiptUrl) {
    return <span className="text-[10px] text-[#8B93A7] italic">No attachment</span>;
  }
  const isPdf = receiptUrl.startsWith('data:application/pdf') || receiptUrl.endsWith('.pdf');
  const isDataUrl = receiptUrl.startsWith('data:');
  const isImage = receiptUrl.startsWith('data:image') || (!isPdf && !receiptUrl.endsWith('.pdf'));

  return (
    <>
      <div className="flex items-center gap-1.5">
        {isImage && isDataUrl ? (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#625BF6] hover:underline"
          >
            <Eye className="w-3 h-3" />
            <span>View Receipt</span>
          </button>
        ) : (
          <a
            href={receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#625BF6] hover:underline"
          >
            {isPdf ? <FileText className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
            <span>{isPdf ? 'View PDF' : 'View Bill'}</span>
          </a>
        )}
      </div>
      {receiptFilename && (
        <p className="text-[9px] text-[#8B93A7] truncate max-w-[110px]" title={receiptFilename}>
          {receiptFilename}
        </p>
      )}

      {/* Lightbox for image receipts */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E7E9F1]">
              <div>
                <p className="text-xs font-bold text-[#171A2B]">Fee Receipt</p>
                {receiptFilename && (
                  <p className="text-[10px] text-[#8B93A7]">{receiptFilename}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#F7F8FC] text-[#687086]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-[#F7F8FC] max-h-[70vh] overflow-auto">
              <img
                src={receiptUrl}
                alt="Fee Receipt"
                className="max-w-full h-auto rounded-xl object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const ExpensesPage = () => {
  const { user, role, isVolunteer } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  // Form states
  const [amountInr, setAmountInr] = useState('');
  const [category, setCategory] = useState('logistics');
  const [description, setDescription] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isOrganizer = role === 'organizer';
  const isTreasurer = role === 'treasurer';
  const canReview = ['organizer', 'treasurer', 'admin'].includes(role);

  const showNotice = (msg) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const endpoint = canReview ? '/api/expenses' : '/api/expenses/my-claims';
      const data = await api.get(endpoint);
      setExpenses(data || []);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [role, isVolunteer, user]);

  const handleFileChange = (file) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setErrorMsg('Only images (JPG, PNG, WebP) or PDF files are accepted.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('File size must be under 8MB.');
      return;
    }
    setErrorMsg('');
    setReceiptFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setReceiptPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview(null);
    }
  };

  const clearFile = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  const handleSubmitClaim = async (e) => {
    e.preventDefault();
    if (!amountInr || !description) return;
    if (!receiptFile) {
      setErrorMsg('Please upload your fee receipt before submitting.');
      return;
    }
    setSubmitLoading(true);
    setErrorMsg('');

    try {
      // Step 1: Upload receipt file
      setUploadingReceipt(true);
      const formData = new FormData();
      formData.append('file', receiptFile);

      const token = localStorage.getItem('skyline_token') || localStorage.getItem('clubpulse_token');
      const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const uploadRes = await fetch(`${BASE_URL}/api/expenses/upload-receipt`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.detail || 'Receipt upload failed.');
      }
      const uploadData = await uploadRes.json();
      setUploadingReceipt(false);

      // Step 2: Submit claim with receipt URL
      await api.post('/api/expenses/claim', {
        amount_paise: Math.round(Number(amountInr) * 100),
        category,
        description,
        receipt_url: uploadData.url,
        receipt_filename: uploadData.filename
      });

      setClaimModalOpen(false);
      setAmountInr('');
      setDescription('');
      setReceiptFile(null);
      setReceiptPreview(null);
      fetchExpenses();
      showNotice('Reimbursement claim submitted successfully with receipt.');
    } catch (err) {
      setErrorMsg(err.message || 'Claim submission failed.');
    } finally {
      setSubmitLoading(false);
      setUploadingReceipt(false);
    }
  };

  const handleReview = async (expenseId, action) => {
    try {
      await api.patch(`/api/expenses/${expenseId}/review`, {
        action,
        notes: `Reviewed by ${user?.full_name || 'Organizer'}`
      });
      showNotice(`Claim ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'updated'} successfully.`);
      fetchExpenses();
    } catch (err) {
      alert(`Review action failed: ${err.message}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Action Notice Toast */}
        {actionNotice && (
          <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-100" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#625BF6]/10 border border-[#625BF6]/20 text-xs font-semibold text-[#625BF6] mb-2">
              <Receipt className="w-3.5 h-3.5" />
              <span>{isOrganizer ? 'Volunteer Claims & Reimbursements' : 'Reimbursements & Claims'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#171A2B] tracking-tight">
              {isOrganizer ? 'Volunteer Reimbursement Claims' : 'Expense Reimbursement Claims'}
            </h1>
            <p className="text-xs sm:text-sm text-[#687086] mt-1">
              {isOrganizer
                ? 'Review out-of-pocket expense claims and receipts submitted by event volunteers.'
                : 'Upload your fee receipt and submit out-of-pocket claims for chapter event expenses.'}
            </p>
          </div>

          {!isOrganizer && (
            <button
              id="submit-new-claim-btn"
              onClick={() => setClaimModalOpen(true)}
              className="px-4 py-2.5 bg-[#625BF6] hover:bg-[#5048E5] text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Submit New Claim</span>
            </button>
          )}
        </div>

        {/* Organizer Notice Banner */}
        {isOrganizer && (
          <div className="p-4 rounded-2xl bg-[#EEEDFE]/60 border border-[#625BF6]/20 flex items-start gap-3 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-[#625BF6]/10 text-[#625BF6] flex items-center justify-center shrink-0 mt-0.5">
              <UserCheck className="w-5 h-5 text-[#625BF6]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#171A2B]">
                Volunteer Claims Inbox
              </h4>
              <p className="text-[11px] text-[#687086] mt-0.5 leading-relaxed">
                Out-of-pocket expense reimbursement claims submitted by volunteers — including attached fee receipts — are displayed below for organizer review.
              </p>
            </div>
          </div>
        )}

        {/* Expenses Table */}
        <div className="bg-white rounded-2xl border border-[#E7E9F1] shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton lines={5} />
            </div>
          ) : expenses.length === 0 ? (
            <div className="py-16 text-center">
              <EmptyState
                icon={Receipt}
                title={isOrganizer ? "No volunteer reimbursement claims found" : "No expense reimbursement claims found"}
                description={
                  isOrganizer
                    ? "When volunteers submit out-of-pocket event expense claims with receipts, they will display here."
                    : "Click 'Submit New Claim' to upload your fee receipt and submit a reimbursement claim."
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8FC] text-[#687086] uppercase font-bold border-b border-[#E7E9F1] text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Claim ID & Date</th>
                    <th className="py-3.5 px-4">Volunteer / Claimant</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Description</th>
                    <th className="py-3.5 px-4">Fee Receipt</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    {canReview && <th className="py-3.5 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E9F1] font-medium text-[#171A2B]">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[#F7F8FC]/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[#687086]">
                        <div className="text-[#171A2B] font-bold">#{exp.id.slice(-6).toUpperCase()}</div>
                        <div className="text-[10px] text-[#687086]">{exp.created_at?.slice(0, 10)}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#171A2B] flex items-center gap-1.5">
                          <span>{exp.user_name}</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Volunteer
                          </span>
                        </div>
                        <div className="text-[10px] text-[#8B93A7]">{exp.user_email}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F7F8FC] border border-[#E7E9F1] capitalize text-[#687086]">
                          {exp.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[#171A2B] max-w-xs">
                        <div className="truncate" title={exp.description}>{exp.description}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <ReceiptCell
                          receiptUrl={exp.receipt_url}
                          receiptFilename={exp.receipt_filename}
                        />
                      </td>

                      <td className="py-3.5 px-4 font-bold text-sm text-[#171A2B]">
                        {formatINR(exp.amount_paise)}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            exp.status === 'disbursed'
                              ? 'active'
                              : exp.status === 'approved'
                              ? 'accent'
                              : exp.status === 'rejected'
                              ? 'critical'
                              : 'warning'
                          }
                        >
                          {exp.status === 'pending' || exp.status === 'submitted'
                            ? 'Pending Review'
                            : exp.status}
                        </Badge>
                      </td>

                      {canReview && (
                        <td className="py-3.5 px-4 text-right">
                          {['pending', 'submitted'].includes(exp.status) && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleReview(exp.id, 'approve')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white text-[11px] font-bold transition-colors cursor-pointer border border-emerald-200"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReview(exp.id, 'reject')}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-800 hover:text-white text-[11px] font-bold transition-colors cursor-pointer border border-rose-200"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {exp.status === 'approved' && isTreasurer && (
                            <button
                              type="button"
                              onClick={() => handleReview(exp.id, 'disburse')}
                              className="px-3 py-1 rounded-lg bg-[#625BF6] hover:bg-[#5048E5] text-white text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Disburse Funds
                            </button>
                          )}
                          {exp.status === 'approved' && !isTreasurer && (
                            <span className="text-[11px] text-emerald-700 font-semibold">
                              Approved
                            </span>
                          )}
                          {['disbursed', 'rejected'].includes(exp.status) && (
                            <span className="text-[11px] text-[#687086] italic">
                              {exp.status === 'disbursed' ? 'Settled' : 'Rejected'}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Claim Modal (For Students / Volunteers) ── */}
        {claimModalOpen && !isOrganizer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full border border-[#E7E9F1] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7E9F1]">
                <div>
                  <h3 className="font-bold text-base text-[#171A2B]">Submit Reimbursement Claim</h3>
                  <p className="text-[10px] text-[#8B93A7] mt-0.5">Attach your original fee receipt for verification</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setClaimModalOpen(false); clearFile(); setErrorMsg(''); }}
                  className="p-1 rounded-lg hover:bg-[#F7F8FC] text-[#687086]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-[#D9485F]/10 border border-[#D9485F]/20 text-xs text-[#D9485F] flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmitClaim} className="space-y-4 text-xs">
                {/* Amount */}
                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">
                    Amount Spent (INR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="e.g. 1450"
                    value={amountInr}
                    onChange={(e) => setAmountInr(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">Category *</label>
                  <select
                    value={['logistics', 'refreshments', 'production', 'travel', 'supplies'].includes(category) ? category : '__other__'}
                    onChange={(e) => {
                      if (e.target.value === '__other__') {
                        setCategory('');
                      } else {
                        setCategory(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                  >
                    <option value="logistics">Event Logistics & Setup</option>
                    <option value="refreshments">Food & Refreshments</option>
                    <option value="production">Stage, Audio & Production</option>
                    <option value="travel">Volunteer Travel / Conveyance</option>
                    <option value="supplies">Print, Stationery & Supplies</option>
                    <option value="__other__">Other (type manually)</option>
                  </select>
                  {!['logistics', 'refreshments', 'production', 'travel', 'supplies'].includes(category) && (
                    <input
                      type="text"
                      required
                      placeholder="e.g. Registration Fee, Equipment Rental..."
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full mt-2 px-3 py-2 border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                    />
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1">Description & Reason *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Specify what items were purchased and why..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                  />
                </div>

                {/* Fee Receipt Upload */}
                <div>
                  <label className="block font-semibold text-[#171A2B] mb-1 flex items-center gap-1">
                    <Paperclip className="w-3 h-3 text-[#625BF6]" />
                    Fee Receipt *
                  </label>
                  <ReceiptUploader
                    receiptFile={receiptFile}
                    receiptPreview={receiptPreview}
                    onFileChange={handleFileChange}
                    onClear={clearFile}
                  />
                  <p className="text-[10px] text-[#8B93A7] mt-1.5">
                    ⓘ Original receipts are required for reimbursement approval
                  </p>
                </div>

                {/* Upload progress indicator */}
                {uploadingReceipt && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-50 border border-indigo-200">
                    <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[11px] text-indigo-700 font-medium">Uploading receipt...</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setClaimModalOpen(false); clearFile(); setErrorMsg(''); }}
                    className="px-4 py-2 text-xs font-semibold text-[#687086] hover:bg-[#F7F8FC] rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading || !receiptFile}
                    className="px-4 py-2 text-xs font-bold bg-[#625BF6] hover:bg-[#5048E5] disabled:opacity-60 text-white rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
                  >
                    {submitLoading ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {uploadingReceipt ? 'Uploading...' : 'Submitting...'}
                      </>
                    ) : (
                      <>
                        <Receipt className="w-3 h-3" />
                        Submit Claim
                      </>
                    )}
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
