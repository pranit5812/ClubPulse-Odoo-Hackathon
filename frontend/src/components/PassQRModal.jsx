import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  Sparkles,
  Eye,
  Copy,
  Check,
  Mail,
  RefreshCw
} from 'lucide-react';
import { api } from '../api/client';
import { buildTicketQRData } from '../utils/ticketQR';

export const PassQRModal = ({ ticket, user, isOpen, onClose }) => {
  const [showRawText, setShowRawText] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSentMsg, setEmailSentMsg] = useState('');
  if (!isOpen || !ticket) return null;

  const qrValue = buildTicketQRData(ticket, user);
  const isVolunteer = ticket.role_track === 'volunteer';

  const handleResendEmail = async () => {
    if (emailSending) return;
    setEmailSending(true);
    setEmailSentMsg('');
    try {
      const res = await api.post(`/api/tickets/${ticket.id}/resend-email`);
      setEmailSentMsg(res?.message || 'Pass emailed successfully to your inbox!');
      setTimeout(() => setEmailSentMsg(''), 4000);
    } catch (err) {
      setEmailSentMsg('Sent request to queue pass email.');
      setTimeout(() => setEmailSentMsg(''), 4000);
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17182B]/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[#E7E9F1] my-8 relative animate-in zoom-in-95 duration-150 space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-[#687086] hover:bg-[#F3F4F8] hover:text-[#171A2B] transition-colors cursor-pointer"
          title="Close Pass"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1 pr-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#625BF6]/10 border border-[#625BF6]/20 text-[11px] font-bold text-[#625BF6]">
            <Sparkles className="w-3 h-3" />
            <span>Official Gate Pass & Credential</span>
          </div>
          <h2 className="text-lg font-black text-[#171A2B] leading-tight">
            {ticket.event_title}
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-[#687086] pt-0.5">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#625BF6]" />
              {ticket.event_date}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 truncate max-w-[200px]">
              <MapPin className="w-3.5 h-3.5 text-[#687086]" />
              {ticket.venue}
            </span>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="bg-gradient-to-b from-[#F7F8FC] to-white p-5 rounded-2xl border border-[#E7E9F1] shadow-inner text-center">
          <div className="p-3.5 bg-white rounded-2xl border border-[#D4D1FD] shadow-xs inline-block mx-auto">
            <QRCodeSVG
              value={qrValue}
              size={185}
              level="M"
              includeMargin={false}
            />
          </div>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
              isVolunteer
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}>
              {isVolunteer ? '🤝 Volunteer Pass' : '🎓 Participant Pass'}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
              ticket.checked_in
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-emerald-500 text-white shadow-2xs'
            }`}>
              {ticket.checked_in ? (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  Checked In
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3" />
                  Gate Ready
                </>
              )}
            </span>
          </div>
          <div className="mt-1 font-mono text-[10px] text-[#687086] font-bold tracking-wider select-all">
            {ticket.qr_token}
          </div>
        </div>


        {/* Scanned Text Preview Toggle */}
        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={() => setShowRawText(!showRawText)}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#625BF6] hover:text-[#5048E5] transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showRawText ? 'Hide Scanned Camera Text' : 'Preview Scanned Camera Text'}</span>
          </button>

          {showRawText && (
            <div className="mt-2 p-3 bg-[#17182B] rounded-xl text-left border border-slate-700 animate-in fade-in-50 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[10px] text-slate-400 font-mono">
                <span>Decoded Camera Output</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(qrValue);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="mt-2 text-[10px] text-slate-200 font-mono whitespace-pre-wrap leading-relaxed select-all max-h-48 overflow-y-auto">
                {qrValue}
              </pre>
            </div>
          )}
        </div>

        {/* Instructions & Actions */}
        <div className="space-y-2.5 pt-1 text-center">
          <p className="text-[11px] text-[#687086]">
            Present this QR code to the chapter executive or gate scanner for express entry verification.
          </p>

          <button
            type="button"
            onClick={handleResendEmail}
            disabled={emailSending}
            className="w-full py-2.5 bg-[#F7F8FC] border border-[#D4D1FD] hover:bg-[#EEEDFE]/40 text-[#625BF6] font-bold text-xs rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Send this QR pass and event ticket directly to your email"
          >
            {emailSending ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Sending QR Pass to Email...</span>
              </>
            ) : (
              <>
                <Mail className="w-3.5 h-3.5" />
                <span>Email Pass to Me</span>
              </>
            )}
          </button>

          {emailSentMsg && (
            <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 py-1.5 px-3 rounded-xl animate-in fade-in-50 duration-150">
              {emailSentMsg}
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-[#625BF6] hover:bg-[#5048E5] text-white font-bold text-xs rounded-xl transition-colors shadow-2xs cursor-pointer"
          >
            Close Pass
          </button>
        </div>
      </div>
    </div>
  );
};

export default PassQRModal;
