import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, formatINR } from '../api/client';
import {
  Ticket,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  QrCode,
  X,
  ArrowRight,
  Download,
  ZoomIn,
  ShieldCheck
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

// ─── Full-screen QR Pass Modal ────────────────────────────────────────────────
const QRPassModal = ({ ticket, user, onClose }) => {
  if (!ticket) return null;

  const handleDownload = () => {
    if (!ticket.qr_image) return;
    const link = document.createElement('a');
    link.href = ticket.qr_image;
    link.download = `ClubPulse_Pass_${ticket.qr_token}.png`;
    link.click();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#625BF6] to-[#8B5CF6] px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Official Entry Pass</p>
            <h3 className="text-sm font-bold text-white truncate max-w-[220px]">{ticket.event_title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code */}
        <div className="p-6 flex flex-col items-center gap-4 bg-[#F7F8FC]">
          {ticket.qr_image ? (
            <div className="bg-white p-3 rounded-2xl shadow-md border border-[#E7E9F1]">
              <img
                src={ticket.qr_image}
                alt="Event QR Pass"
                className="w-52 h-52 object-contain"
              />
            </div>
          ) : (
            <div className="w-52 h-52 rounded-2xl bg-[#E7E9F1] flex items-center justify-center">
              <QrCode className="w-16 h-16 text-[#8B93A7]" />
            </div>
          )}

          {/* Token */}
          <div className="text-center">
            <p className="text-[10px] text-[#8B93A7] mb-1">Pass Token</p>
            <code className="text-sm font-bold text-[#625BF6] bg-[#EEEDFE] px-3 py-1.5 rounded-xl tracking-wider">
              {ticket.qr_token}
            </code>
          </div>
        </div>

        {/* Attendee Info */}
        <div className="px-5 pb-2 space-y-2 text-xs">
          <div className="flex items-center justify-between py-2 border-b border-[#F0F2F7]">
            <span className="text-[#8B93A7]">Attendee</span>
            <span className="font-semibold text-[#171A2B]">{ticket.user_name}</span>
          </div>
          {ticket.user_roll_number && (
            <div className="flex items-center justify-between py-2 border-b border-[#F0F2F7]">
              <span className="text-[#8B93A7]">Roll Number</span>
              <span className="font-semibold text-[#171A2B]">{ticket.user_roll_number}</span>
            </div>
          )}
          {ticket.user_department && (
            <div className="flex items-center justify-between py-2 border-b border-[#F0F2F7]">
              <span className="text-[#8B93A7]">Department</span>
              <span className="font-semibold text-[#171A2B]">{ticket.user_department}</span>
            </div>
          )}
          <div className="flex items-center justify-between py-2 border-b border-[#F0F2F7]">
            <span className="text-[#8B93A7]">Pass Type</span>
            <span className={`font-bold text-[11px] px-2 py-0.5 rounded-full border ${
              ticket.role_track === 'volunteer'
                ? 'bg-[#625BF6]/10 text-[#625BF6] border-[#625BF6]/20'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {ticket.role_track === 'volunteer' ? '🤝 Volunteer' : '🎓 Participant'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[#8B93A7]">Status</span>
            <span className={`font-semibold ${ticket.checked_in ? 'text-emerald-600' : 'text-[#625BF6]'}`}>
              {ticket.checked_in ? '✅ Checked In' : '🟢 Valid – Ready for Entry'}
            </span>
          </div>
        </div>

        {/* Download button */}
        <div className="px-5 pb-5 pt-2">
          <button
            onClick={handleDownload}
            disabled={!ticket.qr_image}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#625BF6] hover:bg-[#5048E5] disabled:opacity-50 text-white text-xs font-bold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Save QR Pass to Device
          </button>
          <p className="text-[10px] text-center text-[#8B93A7] mt-2">
            Present this QR at the gate for instant entry verification
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const MyTicketsPage = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModalTicket, setActiveModalTicket] = useState(null);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const data = await api.get('/api/tickets/my-tickets');
        setTickets(data || []);
      } catch (err) {
        console.error('Failed to load tickets:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#625BF6]/10 border border-[#625BF6]/20 text-xs font-semibold text-[#625BF6] mb-2">
            <Ticket className="w-3.5 h-3.5" />
            <span>Digital Event Credential Passes</span>
          </div>
          <h1 className="text-2xl font-bold text-[#171A2B] tracking-tight">
            My Registered Passes & QR Codes
          </h1>
          <p className="text-xs text-[#687086] mt-1">
            Your QR passes are stored securely. Tap any pass to view or download for gate entry.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((n) => (
              <div key={n} className="bg-white rounded-2xl h-56 animate-pulse border border-[#E7E9F1]" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-12 bg-white rounded-2xl border border-[#E7E9F1]">
            <EmptyState
              icon={Ticket}
              title="No active event passes registered"
              description="You have not booked tickets for any upcoming events. Explore the event calendar to reserve seats."
              action={
                <a
                  href="/events"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#625BF6] text-white rounded-xl text-xs font-semibold hover:bg-[#5048E5] transition-colors"
                >
                  <span>Explore Events</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tickets.map((tkt) => (
              <div
                key={tkt.id}
                className="bg-white rounded-2xl border border-[#E7E9F1] shadow-2xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
              >
                {/* Top: event info + status badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#625BF6]">
                      Pass #{tkt.id.slice(-6).toUpperCase()}
                    </span>
                    <h3 className="font-bold text-base text-[#171A2B] truncate">{tkt.event_title}</h3>
                    <div className="text-xs text-[#687086] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{tkt.event_date?.slice(0, 10)}</span>
                    </div>
                    <div className="text-xs text-[#687086] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="truncate">{tkt.venue}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      tkt.role_track === 'volunteer'
                        ? 'bg-[#625BF6]/10 text-[#625BF6] border-[#625BF6]/20'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {tkt.role_track === 'volunteer' ? '🤝 Volunteer' : '🎓 Participant'}
                    </span>
                    <Badge variant={tkt.checked_in ? 'active' : 'primary'}>
                      {tkt.checked_in ? 'Checked In' : 'Valid Pass'}
                    </Badge>
                  </div>
                </div>

                {/* QR image preview + info row */}
                <div
                  className="p-3 bg-[#F7F8FC] rounded-xl border border-[#E7E9F1] flex items-center gap-3 cursor-pointer hover:border-[#625BF6]/40 transition-colors"
                  onClick={() => setActiveModalTicket(tkt)}
                >
                  {/* QR thumbnail — stored in DB */}
                  <div className="shrink-0 bg-white rounded-xl p-1.5 border border-[#E7E9F1] shadow-sm">
                    {tkt.qr_image ? (
                      <img
                        src={tkt.qr_image}
                        alt="QR Pass"
                        className="w-16 h-16 object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 flex items-center justify-center bg-[#EEEDFE] rounded-lg">
                        <QrCode className="w-8 h-8 text-[#625BF6]" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-[#171A2B]">
                      {tkt.user_name} {tkt.user_roll_number ? `(${tkt.user_roll_number})` : ''}
                    </div>
                    <code className="text-[10px] text-[#625BF6] font-bold block truncate">
                      {tkt.qr_token}
                    </code>
                    <div className="text-[11px] font-bold text-[#171A2B] mt-0.5">
                      {formatINR(tkt.total_amount_paise)}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <ZoomIn className="w-4 h-4 text-[#8B93A7]" />
                  </div>
                </div>

                {/* Bottom: check-in status + action */}
                <div className="text-[11px] text-[#687086] flex items-center justify-between">
                  {tkt.checked_in ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified at {tkt.checked_in_at?.slice(11, 16)}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Ready for gate check-in
                    </span>
                  )}
                  <button
                    onClick={() => setActiveModalTicket(tkt)}
                    className="text-xs font-semibold text-[#625BF6] hover:text-[#5048E5] flex items-center gap-0.5"
                  >
                    View Pass →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full-screen QR Pass Modal */}
      {activeModalTicket && (
        <QRPassModal
          ticket={activeModalTicket}
          user={user}
          onClose={() => setActiveModalTicket(null)}
        />
      )}
    </DashboardLayout>
  );
};
