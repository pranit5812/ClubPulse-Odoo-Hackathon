import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera, CheckCircle2, AlertTriangle, RefreshCw, KeyRound } from 'lucide-react';
import { api } from '../api/client';
import { parseQRContent } from '../utils/ticketQR';

export const QRScannerModal = ({ isOpen, onClose, onCheckInComplete }) => {
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setScanResult(null);
      setManualToken('');
      return;
    }

    // Initialize scanner with a slight delay to ensure DOM is rendered
    const timeout = setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true
          },
          false
        );

        scanner.render(
          (decodedText) => {
            handleVerifyToken(decodedText);
            scanner.clear();
          },
          (error) => {
            // Silence routine scan frame misses
          }
        );

        scannerRef.current = scanner;
        setScannerActive(true);
      } catch (err) {
        console.warn('QR camera scanner initialization notice:', err);
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch {}
      }
    };
  }, [isOpen]);

  const handleVerifyToken = async (rawScan) => {
    if (!rawScan || loading) return;
    setLoading(true);
    setScanResult(null);

    const { token: actualToken, profile: embeddedProfile } = parseQRContent(rawScan);

    try {
      const res = await api.post('/api/tickets/check-in', { qr_token: actualToken });
      setScanResult({
        success: res.success,
        message: res.message,
        attendeeName: res.attendee_name || embeddedProfile?.attendee_name,
        rollNumber: res.attendee_roll_number || embeddedProfile?.roll_number,
        department: res.attendee_department || embeddedProfile?.department,
        email: res.attendee_email || embeddedProfile?.email,
        eventTitle: res.event_title || embeddedProfile?.event_title,
        time: res.checked_in_at
      });
      if (onCheckInComplete) onCheckInComplete(res);
    } catch (err) {
      setScanResult({
        success: false,
        message: err.message || 'Verification failed. Invalid token.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Live QR Ticket Check-In</h3>
              <p className="text-xs text-slate-500">Fast attendee validation & attendance counter</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Result Alert */}
          {scanResult && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                scanResult.success
                  ? 'bg-teal-50 border-teal-200 text-teal-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {scanResult.success ? (
                <CheckCircle2 className="w-6 h-6 text-teal-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="text-sm">
                <div className="font-semibold">
                  {scanResult.success ? 'Verified Check-In!' : 'Check-In Rejected'}
                </div>
                <div>{scanResult.message}</div>
                {scanResult.attendeeName && (
                  <div className="mt-1 text-xs opacity-90 font-medium space-y-0.5">
                    <div>
                      Attendee: <strong>{scanResult.attendeeName}</strong>
                      {scanResult.rollNumber && <span className="ml-1 font-mono text-[11px] text-teal-800">({scanResult.rollNumber})</span>}
                      {scanResult.department && <span className="ml-1 text-slate-600">• {scanResult.department}</span>}
                    </div>
                    {scanResult.eventTitle && <div className="text-[11px] text-slate-600">Event: {scanResult.eventTitle}</div>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scanner Viewfinder Box */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-900 min-h-[260px] flex items-center justify-center relative">
            <div id="qr-reader" className="w-full text-white text-xs"></div>
          </div>

          {/* Manual Input Alternative */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Or manually enter ticket QR token (e.g., CP-TKT-HACK-ANANYA-DEMO01):
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Paste QR token string..."
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyToken(manualToken)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={() => handleVerifyToken(manualToken)}
                disabled={loading || !manualToken.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Validate'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500 px-5">
          <span>Protected against concurrent duplicate scans</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-100"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
