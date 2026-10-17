import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { api, formatINR } from '../api/client';
import {
  X,
  Ticket,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  GraduationCap,
  Users,
  Check,
  ShieldCheck,
  CreditCard
} from 'lucide-react';

export const EventBookingModal = ({ event, isOpen, onClose, onBookSuccess }) => {
  const { user, isMember, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [quantity, setQuantity] = useState(1);
  const [selectedRole, setSelectedRole] = useState('participant'); // 'participant' or 'volunteer'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingTicket, setExistingTicket] = useState(null);

  useEffect(() => {
    if (isOpen && event && user) {
      api.get('/api/tickets/my-tickets')
        .then((tickets) => {
          const match = (tickets || []).find((t) => t.event_id === event.id && t.status !== 'cancelled');
          setExistingTicket(match || null);
        })
        .catch(() => {});
    } else {
      setExistingTicket(null);
    }
  }, [isOpen, event?.id, user]);

  if (!isOpen || !event) return null;

  const unitPricePaise = isMember ? event.member_price_paise : event.non_member_price_paise;
  const totalPricePaise = unitPricePaise * quantity;
  const remainingCapacity = Math.max(0, event.capacity - (event.booked_count || 0));
  const isApprovedVolunteer = Boolean(user?.volunteer_events?.includes(event?.id));

  // Dynamically ensure Razorpay SDK script is available
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

  const handleBook = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (existingTicket) {
      setError('You are already enrolled in this event. Re-registration is not permitted.');
      return;
    }
    if (isApprovedVolunteer) {
      setError('You are registered as an official volunteer for this event. Participant pass registration is closed.');
      return;
    }
    setLoading(true);
    setError('');

    const roleTrackToUse = isMember ? selectedRole : 'participant';

    try {
      // Flow A: Free Ticket Registration (0 paise)
      if (totalPricePaise === 0) {
        const ticketRes = await api.post('/api/tickets/book', {
          event_id: event.id,
          quantity,
          role_track: roleTrackToUse
        });

        if (refreshUser) {
          try {
            await refreshUser();
          } catch {}
        }
        try {
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        } catch {}

        if (onBookSuccess) onBookSuccess(ticketRes);
        onClose();
        // Redirect directly to "My QR Passes" page
        navigate('/my-tickets');
        return;
      }

      // Flow B: Paid Ticket Registration via Razorpay Gateway
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        throw new Error('Razorpay payment gateway failed to load. Please check your internet connection.');
      }

      // 1. Create Razorpay Order on backend
      const orderData = await api.post('/api/payments/create-ticket-order', {
        event_id: event.id,
        quantity,
        role_track: roleTrackToUse
      });

      if (orderData.is_free) {
        const ticketRes = await api.post('/api/tickets/book', {
          event_id: event.id,
          quantity,
          role_track: roleTrackToUse
        });
        if (refreshUser) {
          try {
            await refreshUser();
          } catch {}
        }
        try {
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        } catch {}
        if (onBookSuccess) onBookSuccess(ticketRes);
        onClose();
        navigate('/my-tickets');
        return;
      }

      // 2. Configure Razorpay checkout options
      const options = {
        key: orderData.key_id || 'rzp_test_placeholder',
        amount: orderData.amount_paise,
        currency: orderData.currency || 'INR',
        name: 'ClubPulse Campus Organization',
        description: `Pass Registration: ${event.title}`,
        image: '/logo.png',
        order_id: orderData.order_id,
        prefill: {
          name: user?.full_name || orderData.user_name,
          email: user?.email || orderData.user_email,
          contact: user?.phone || orderData.user_phone || '+91 9876543210'
        },
        notes: {
          event_id: event.id,
          event_title: event.title,
          role_track: roleTrackToUse,
          quantity: String(quantity),
          user_id: user?.id
        },
        theme: {
          color: '#625BF6'
        },
        handler: async function (response) {
          try {
            setLoading(true);
            // 3. When Razorpay payment completes, generate the ticket
            const ticketRes = await api.post('/api/tickets/book', {
              event_id: event.id,
              quantity,
              role_track: roleTrackToUse,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (refreshUser) {
              try {
                await refreshUser();
              } catch {}
            }
            try {
              confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
            } catch {}

            if (onBookSuccess) onBookSuccess(ticketRes);
            onClose();
            // Automatically redirect to "My QR Passes" (/my-tickets)
            navigate('/my-tickets');
          } catch (tktErr) {
            console.error('Ticket generation after payment failed:', tktErr);
            setError(tktErr.message || 'Payment completed, but ticket generation failed. Please contact support.');
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
      rzp.on('payment.failed', function (resp) {
        setLoading(false);
        setError(resp.error?.description || 'Payment was unsuccessful or cancelled.');
      });
      rzp.open();
    } catch (err) {
      setError(err.message || 'Ticket booking checkout could not be initiated.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 my-8">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Event Registration Pass</h3>
              <p className="text-xs text-slate-500 line-clamp-1">{event.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {existingTicket && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-emerald-950">Already Enrolled in this Event</div>
                  <div className="text-[11px] text-emerald-700">You already possess a verified entry pass. Re-registration is not allowed.</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/my-tickets');
                }}
                className="px-3.5 py-1.5 bg-[#16856B] text-white rounded-lg text-xs font-bold hover:bg-[#13715B] transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>View Pass</span>
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Event details snippet */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span>Date & Time:</span>
              <strong className="text-slate-800">{event.event_date}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Venue:</span>
              <strong className="text-slate-800">{event.venue}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Seats Available:</span>
              <strong className="text-teal-700">{remainingCapacity} of {event.capacity}</strong>
            </div>
          </div>

          {/* Membership Discount Callout */}
          <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            isMember ? 'bg-teal-50 border-teal-200 text-teal-800' : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-[#625BF6]" />
              <div>
                <div className="font-semibold">
                  {isMember
                    ? 'Club Member Rate Applied'
                    : 'Standard Non-Member Rate Applied'}
                </div>
                <div className="text-[11px] opacity-80">
                  {isMember
                    ? 'Active chapter member discount applied'
                    : `Club members pay ${event.member_price_paise === 0 ? '₹0 (Free)' : formatINR(event.member_price_paise)}`}
                </div>
              </div>
            </div>
            <strong className="text-sm font-bold text-[#171A2B]">
              {unitPricePaise === 0 ? 'Free Pass' : `${formatINR(unitPricePaise)}/ticket`}
            </strong>
          </div>

          {/* Chapter Role Track Selection: Shown ONLY if user has active membership */}
          {isMember && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                  <span>Choose Your Chapter Role Track</span>
                </label>
                <span className="text-[11px] text-indigo-600 font-semibold">Active Member Privilege</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option A: Participant Track */}
                <div
                  onClick={() => setSelectedRole('participant')}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between gap-2 ${
                    selectedRole === 'participant'
                      ? 'bg-indigo-50/50 border-indigo-600 shadow-xs ring-2 ring-indigo-600/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          selectedRole === 'participant' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-slate-900 leading-tight">As a Participant</h5>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                          Attendee & Competitor
                        </span>
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        selectedRole === 'participant' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                      }`}
                    >
                      {selectedRole === 'participant' && <Check className="w-2.5 h-2.5" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Hackathons, workshops & chapter networking. Direct competition & verified attendee credential.
                  </p>
                </div>

                {/* Option B: Volunteer Track */}
                <div
                  onClick={() => setSelectedRole('volunteer')}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between gap-2 ${
                    selectedRole === 'volunteer'
                      ? 'bg-indigo-50/50 border-indigo-600 shadow-xs ring-2 ring-indigo-600/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          selectedRole === 'volunteer' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-slate-900 leading-tight">As a Volunteer</h5>
                        <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                          Operations & Logistics
                        </span>
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        selectedRole === 'volunteer' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                      }`}
                    >
                      {selectedRole === 'volunteer' && <Check className="w-2.5 h-2.5" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Event organizing crew. Unlocks volunteer task sprint boards & check-in gate scanner.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Number of Attendees
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold"
                >
                  -
                </button>
                <span className="px-5 py-2 text-sm font-bold text-slate-900">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(remainingCapacity, quantity + 1))}
                  className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold"
                >
                  +
                </button>
              </div>
              <span className="text-xs text-slate-500">Max 10 passes per checkout</span>
            </div>
          </div>

          {/* Workflow Notice */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2 text-[11px] text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {totalPricePaise > 0
                ? 'Secured Razorpay checkout. Once payment completes, your digital QR pass will be generated and available under My QR Passes.'
                : 'Free member privilege. Your pass will be generated instantly and available under My QR Passes.'}
            </span>
          </div>

          {/* Total Calculation & Action */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500">Total payable</span>
              <div className="text-xl font-extrabold text-slate-900">{formatINR(totalPricePaise)}</div>
            </div>
            {existingTicket ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/my-tickets');
                }}
                className="py-2.5 px-5 bg-[#16856B] hover:bg-[#13715B] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Enrolled • View Pass</span>
              </button>
            ) : (
              <button
                onClick={handleBook}
                disabled={loading || remainingCapacity === 0 || isApprovedVolunteer}
                className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <span>{totalPricePaise > 0 ? 'Connecting to Razorpay...' : 'Generating Ticket...'}</span>
                ) : isApprovedVolunteer ? (
                  <span>Volunteering (Pass Closed)</span>
                ) : totalPricePaise > 0 ? (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Pay & Register with Razorpay</span>
                  </>
                ) : (
                  <>
                    <span>
                      {isMember
                        ? `Claim Pass as ${selectedRole === 'volunteer' ? 'Volunteer' : 'Participant'}`
                        : 'Claim Free Pass'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
