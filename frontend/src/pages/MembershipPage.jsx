import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, formatINR } from '../api/client';
import {
  CreditCard,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Award,
  Zap,
  Lock,
  Check,
  Clock,
  GraduationCap,
  Users,
  QrCode,
  CheckSquare
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Badge } from '../components/Badge';

export const MembershipPage = () => {
  const { user, isMember, refreshUser, switchTrack, membershipRole } = useAuth();
  const [selectedTier, setSelectedTier] = useState('annual'); // 'annual' or 'semester'
  const [loading, setLoading] = useState(false);
  const [switchingTrack, setSwitchingTrack] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentDetails, setPaymentDetails] = useState(null);

  // Dynamically load Razorpay SDK script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayPurchase = async (tierToBuy = selectedTier) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setPaymentDetails(null);

    const roleToBuy = user?.membership_role || 'participant';

    try {
      // 1. Ensure Razorpay script is loaded
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        throw new Error('Razorpay payment gateway failed to load. Please check your internet connection.');
      }

      // 2. Create Razorpay order in backend
      const orderData = await api.post('/api/payments/create-membership-order', {
        tier: tierToBuy,
        member_role: roleToBuy
      });

      const durationTitle = tierToBuy === 'annual' ? 'Annual Pass (12 Months)' : 'Semester Pass (6 Months)';

      // 3. Open Razorpay Checkout modal
      const options = {
        key: orderData.key_id || 'rzp_test_I1o9YOZinQtIYu',
        amount: orderData.amount_paise,
        currency: orderData.currency || 'INR',
        name: 'Skyline Campus Organization',
        description: `${durationTitle} - Chapter Membership`,
        image: '/logo.png',
        order_id: orderData.order_id,
        prefill: {
          name: user?.full_name || orderData.user_name,
          email: user?.email || orderData.user_email,
          contact: user?.phone || orderData.user_phone || '+91 9876543210'
        },
        notes: {
          tier: tierToBuy,
          member_role: roleToBuy,
          user_id: user?.id
        },
        theme: {
          color: '#625BF6'
        },
        handler: async function (response) {
          // 4. Verify payment with backend on success
          try {
            setLoading(true);
            const verifyRes = await api.post('/api/payments/verify-membership-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              tier: tierToBuy,
              member_role: roleToBuy
            });

            setPaymentDetails({
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              tier: tierToBuy,
              amount: tierToBuy === 'annual' ? 500 : 300
            });

            setSuccessMsg(
              `Payment verified! Your ${tierToBuy === 'annual' ? 'Annual Pass' : 'Semester Pass'} membership is active. Enjoy exclusive event discounts and hackathon access!`
            );
            await refreshUser();
          } catch (verifyErr) {
            console.error('Payment verification error:', verifyErr);
            setErrorMsg(verifyErr.message || 'Payment verification failed. Please contact support.');
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setLoading(false);
        setErrorMsg(response.error?.description || 'Payment was unsuccessful or cancelled.');
      });
      rzp.open();
    } catch (err) {
      console.error('Razorpay checkout error:', err);
      setErrorMsg(err.message || 'Unable to initiate Razorpay checkout.');
      setLoading(false);
    }
  };

  const handleInstantSwitchTrack = async (targetRole) => {
    if (switchingTrack || targetRole === user?.membership_role) return;
    setSwitchingTrack(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await switchTrack(targetRole);
      setSelectedRole(targetRole);
      setSuccessMsg(
        `Track updated to ${targetRole === 'volunteer' ? 'Volunteer Crew (Tasks & QR Scanner Unlocked)' : 'Participant'} successfully!`
      );
    } catch (err) {
      setErrorMsg(err.message || 'Could not update membership track.');
    } finally {
      setSwitchingTrack(false);
    }
  };

  const currentTierLabel = user?.membership_tier === 'semester' ? 'Semester Pass' : 'Annual Pass';
  const isCurrentVolunteer = user?.membership_role === 'volunteer';

  return (
    <DashboardLayout
      pageTitle="Membership Status"
      breadcrumbs={[{ label: 'Dashboard', link: '/dashboard' }, { label: 'Membership Status' }]}
    >
      <div className="w-full space-y-6">
        {/* Top Header Information */}
        <div className="flex items-center justify-end pb-1">
          <div className="text-xs text-[#687086]">
            <span>Skyline Membership</span>
            <span> • </span>
            <span className="font-semibold text-[#171A2B]">{user?.full_name}</span>
          </div>
        </div>

        {/* Page Title */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#625BF6]/10 border border-[#625BF6]/20 text-xs font-semibold text-[#625BF6] mb-2">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Chapter Credentialing & Dues</span>
          </div>
          <h1 className="text-2xl font-bold text-[#171A2B] tracking-tight">
            Membership Status & Razorpay Renewal
          </h1>
          <p className="text-xs text-[#687086] mt-1">
            Choose to join as an <strong>Event Participant</strong> or <strong>Volunteer Crew</strong>. 
            Volunteers unlock sprint tasks and Gate QR scanner access.
          </p>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-4 rounded-xl bg-[#16856B]/10 border border-[#16856B]/20 text-[#16856B] text-xs space-y-1 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-[#16856B] shrink-0" />
              <span>{successMsg}</span>
            </div>
            {paymentDetails && (
              <p className="text-[11px] text-[#16856B]/80 pl-6">
                Razorpay Reference: <span className="font-mono font-bold">{paymentDetails.paymentId}</span> • Recorded in Chapter Financial Ledger.
              </p>
            )}
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-[#D9485F]/10 border border-[#D9485F]/20 text-[#D9485F] text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-[#D9485F] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Digital Membership Pass Card */}
        <div className="p-6 rounded-2xl bg-[#17182B] text-white shadow-xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-56 h-56 bg-[#625BF6]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-bold shadow-md shadow-[#625BF6]/30 overflow-hidden p-0.5 shrink-0">
                <img src="/logo.png" alt="Skyline" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                  Skyline Chapter Credential
                </span>
                <h3 className="text-lg font-bold text-white">{user?.full_name}</h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs pt-1">
              <div>
                <span className="text-white/50 block text-[10px] uppercase tracking-wider">ID Number</span>
                <span className="font-mono font-semibold text-white">{user?.roll_number || 'STU-2026-001'}</span>
              </div>
              <div>
                <span className="text-white/50 block text-[10px] uppercase tracking-wider">Valid Until</span>
                <span className="font-semibold text-[#16856B]">
                  {user?.membership_expiry ? user.membership_expiry.slice(0, 10) : 'Not Active'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-left md:text-right space-y-3 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 relative z-10">
            <div className="flex flex-wrap items-center md:justify-end gap-2">
              <Badge variant={isMember ? 'active' : 'warning'}>
                {isMember ? `Active ${currentTierLabel}` : 'Pending Dues'}
              </Badge>
              {isMember && (
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                    isCurrentVolunteer
                      ? 'bg-[#625BF6]/30 text-[#CBD0E1] border-[#625BF6]/60'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {isCurrentVolunteer ? '🤝 Volunteer Track' : '🎓 Participant Track'}
                </span>
              )}
            </div>

            <div className="text-xs text-white/70">
              {isMember
                ? 'Your membership is active. Enjoy exclusive event discounts and chapter perks.'
                : 'Choose a membership pass tier below to activate your credential.'}
            </div>

            {/* Quick Switch Track for Existing Members */}
            {isMember && (
              <div className="pt-1 flex items-center md:justify-end gap-2">
                <button
                  onClick={() => handleInstantSwitchTrack(isCurrentVolunteer ? 'participant' : 'volunteer')}
                  disabled={switchingTrack}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold border border-white/10 transition-colors disabled:opacity-50"
                  title="Switch between Volunteer and Participant privileges"
                >
                  {switchingTrack
                    ? 'Updating Track...'
                    : isCurrentVolunteer
                    ? 'Switch to Participant Track'
                    : 'Switch to Volunteer Track'}
                </button>
              </div>
            )}

            <button
              onClick={() => handleRazorpayPurchase(selectedTier)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#625BF6] hover:bg-[#5048E5] text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting to Razorpay...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {isMember
                      ? `Renew ${selectedTier === 'annual' ? 'Annual Pass (₹500)' : 'Semester Pass (₹300)'}`
                      : `Pay ${selectedTier === 'annual' ? '₹500' : '₹300'} via Razorpay`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Choose Duration Tier (Annual vs Semester)                           */}
        {/* ------------------------------------------------------------------ */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-[#171A2B] uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#625BF6] text-white text-[11px] flex items-center justify-center font-bold">★</span>
                <span>Select Membership Pass Tier</span>
              </h2>
              <p className="text-xs text-[#687086] mt-0.5">
                Choose between an Annual Pass (12 Months) or a Semester Pass (6 Months).
              </p>
            </div>
            <span className="text-xs text-[#687086] hidden sm:inline">Click a tier to choose</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Annual Membership Tier */}
            <div
              onClick={() => setSelectedTier('annual')}
              className={`p-6 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between space-y-4 ${
                selectedTier === 'annual'
                  ? 'bg-white border-[#625BF6] shadow-[0_4px_16px_rgba(98,91,246,0.12)] ring-2 ring-[#625BF6]/20'
                  : 'bg-white border-[#E7E9F1] hover:border-[#D4D1FD] shadow-2xs'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                        selectedTier === 'annual'
                          ? 'border-[#625BF6] bg-[#625BF6] text-white'
                          : 'border-[#A6ACBE]'
                      }`}
                    >
                      {selectedTier === 'annual' && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-[#171A2B] text-base">Annual Tier</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#16856B]/10 text-[#16856B]">
                          Best Value
                        </span>
                      </div>
                      <p className="text-xs text-[#687086]">12 Months Full Chapter Coverage</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xl font-black text-[#171A2B]">₹500.00</span>
                    <span className="text-[10px] text-[#687086] block">/ 12 Months</span>
                  </div>
                </div>

                <ul className="text-xs text-[#687086] space-y-2 pt-3 border-t border-[#E7E9F1]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#16856B] shrink-0" />
                    <span>Full 1-Year access for both Spring & Fall Semesters</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#16856B] shrink-0" />
                    <span>Free admission to agent labs and technical workshops</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#16856B] shrink-0" />
                    <span>Voting rights in annual executive committee elections</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTier('annual');
                  handleRazorpayPurchase('annual');
                }}
                disabled={loading}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  selectedTier === 'annual'
                    ? 'bg-[#625BF6] hover:bg-[#5048E5] text-white shadow-xs'
                    : 'bg-[#F7F8FC] hover:bg-[#EEEDFE] text-[#171A2B] border border-[#E7E9F1]'
                }`}
              >
                <span>
                  {isMember
                    ? 'Renew Annual Pass (₹500)'
                    : 'Pay ₹500 via Razorpay'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 2. Semester Membership Tier */}
            <div
              onClick={() => setSelectedTier('semester')}
              className={`p-6 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between space-y-4 ${
                selectedTier === 'semester'
                  ? 'bg-white border-[#625BF6] shadow-[0_4px_16px_rgba(98,91,246,0.12)] ring-2 ring-[#625BF6]/20'
                  : 'bg-white border-[#E7E9F1] hover:border-[#D4D1FD] shadow-2xs'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                        selectedTier === 'semester'
                          ? 'border-[#625BF6] bg-[#625BF6] text-white'
                          : 'border-[#A6ACBE]'
                      }`}
                    >
                      {selectedTier === 'semester' && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-[#171A2B] text-base">Semester Tier</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#625BF6]/10 text-[#625BF6]">
                          Single Term
                        </span>
                      </div>
                      <p className="text-xs text-[#687086]">6 Months Chapter Coverage</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xl font-black text-[#171A2B]">₹300.00</span>
                    <span className="text-[10px] text-[#687086] block">/ 6 Months</span>
                  </div>
                </div>

                <ul className="text-xs text-[#687086] space-y-2 pt-3 border-t border-[#E7E9F1]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#16856B] shrink-0" />
                    <span>6 Months access for current ongoing academic term</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#16856B] shrink-0" />
                    <span>Discounted official chapter merchandise kit</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#16856B] shrink-0" />
                    <span>Full member privileges for the entire semester</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTier('semester');
                  handleRazorpayPurchase('semester');
                }}
                disabled={loading}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  selectedTier === 'semester'
                    ? 'bg-[#625BF6] hover:bg-[#5048E5] text-white shadow-xs'
                    : 'bg-[#F7F8FC] hover:bg-[#EEEDFE] text-[#171A2B] border border-[#E7E9F1]'
                }`}
              >
                <span>
                  {isMember
                    ? 'Renew Semester Pass (₹300)'
                    : 'Pay ₹300 via Razorpay'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Security & Audit Guarantee Notice */}
        <div className="p-4 rounded-xl bg-[#F7F8FD] border border-[#E1E4F5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#687086]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#16856B] shrink-0" />
            <span>
              Secure Razorpay Checkout • End-to-End Encrypted • Instant entry into Chapter Financial Ledger & Audit Trail
            </span>
          </div>
          <span className="font-mono text-[10px] text-[#A6ACBE]">Test Gateway ID: rzp_test_I1o9YOZinQtIYu</span>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MembershipPage;
