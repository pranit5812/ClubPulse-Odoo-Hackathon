import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { api } from '../api/client';
import { parseQRContent } from '../utils/ticketQR';
import {
  Camera,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  RefreshCw,
  Users,
  ShieldAlert,
  ArrowRight,
  Info,
  Clock
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Badge } from '../components/Badge';

export const QRScannerPage = () => {
  const [manualToken, setManualToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);
  const [currentResult, setCurrentResult] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    try {
      const scanner = new Html5QrcodeScanner(
        'qr-lane-reader',
        {
          fps: 10,
          qrbox: { width: 260, height: 260 },
          rememberLastUsedCamera: true
        },
        false
      );

      scanner.render(
        (decodedText) => {
          verifyToken(decodedText);
        },
        (error) => {
          // Normal frame scan pass-through
        }
      );
      scannerRef.current = scanner;
    } catch (err) {
      console.warn('QR camera lane scanner initialization warning:', err);
      setCameraError('Camera access unavailable or permission not granted. Use manual token entry below.');
    }

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch {}
      }
    };
  }, []);

  const verifyToken = async (rawScan) => {
    if (!rawScan || loading) return;
    setLoading(true);
    setCurrentResult(null);

    const { token: actualToken, profile: embeddedProfile } = parseQRContent(rawScan);

    try {
      const res = await api.post('/api/tickets/check-in', { qr_token: actualToken });
      const record = {
        token: actualToken,
        success: res.success,
        message: res.message,
        attendeeName: res.attendee_name || embeddedProfile?.attendee_name,
        rollNumber: res.attendee_roll_number || embeddedProfile?.roll_number,
        department: res.attendee_department || embeddedProfile?.department,
        email: res.attendee_email || embeddedProfile?.email,
        eventTitle: res.event_title || embeddedProfile?.event_title,
        time: new Date().toLocaleTimeString()
      };
      setCurrentResult(record);
      setScanHistory((prev) => [record, ...prev.slice(0, 9)]);
    } catch (err) {
      const errRecord = {
        token: actualToken,
        success: false,
        message: err.message || 'Token verification failed. Check connection or ticket validity.',
        time: new Date().toLocaleTimeString()
      };
      setCurrentResult(errRecord);
      setScanHistory((prev) => [errRecord, ...prev.slice(0, 9)]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Gate Fast QR Scanner Lane">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#625BF6]/10 border border-[#625BF6]/20 text-xs font-semibold text-[#625BF6] mb-2">
            <Camera className="w-3.5 h-3.5" />
            <span>Fast Turnstile Gate Verification</span>
          </div>
          <h1 className="text-2xl font-bold text-[#171A2B] tracking-tight">
            Fast QR Scanner Lane
          </h1>
          <p className="text-xs text-[#687086] mt-1">
            Real-time optical camera scanner with server-side atomic validation and duplicate re-entry rejection.
          </p>
        </div>

        {/* Camera Permission / Error Warning Banner */}
        {cameraError && (
          <div className="p-4 rounded-xl bg-[#C97A16]/10 border border-[#C97A16]/30 flex items-center gap-3 text-xs text-[#C97A16]">
            <Info className="w-5 h-5 shrink-0" />
            <div>
              <span className="font-bold">Camera Notice:</span> {cameraError}
            </div>
          </div>
        )}

        {/* Current Scan Result Feedback Banner */}
        {currentResult && (
          <div
            className={`p-5 rounded-2xl border flex items-start gap-4 transition-all shadow-md ${
              currentResult.success
                ? 'bg-[#16856B]/10 border-[#16856B]/30 text-[#16856B]'
                : 'bg-[#D9485F]/10 border-[#D9485F]/30 text-[#D9485F]'
            }`}
          >
            {currentResult.success ? (
              <CheckCircle2 className="w-7 h-7 text-[#16856B] shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-7 h-7 text-[#D9485F] shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="text-base font-bold">
                {currentResult.success ? 'Verified Check-In!' : 'Check-In Rejected!'}
              </div>
              <p className="text-xs mt-0.5 font-medium">{currentResult.message}</p>
              {currentResult.attendeeName && (
                <div className="mt-2 text-xs font-semibold text-[#171A2B] space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>Attendee: <strong>{currentResult.attendeeName}</strong></span>
                    {currentResult.rollNumber && <span className="font-mono text-[11px] text-[#625BF6] bg-[#625BF6]/10 px-2 py-0.5 rounded-md">ID: {currentResult.rollNumber}</span>}
                    {currentResult.department && <span className="text-[#687086]">• {currentResult.department}</span>}
                  </div>
                  <div className="text-[11px] text-[#687086] flex flex-wrap items-center gap-2">
                    <span>Event: <strong>{currentResult.eventTitle}</strong></span>
                    {currentResult.email && <span>• Email: {currentResult.email}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Scanner Viewfinder Box */}
          <div className="md:col-span-7 bg-white p-5 rounded-2xl border border-[#E7E9F1] shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#171A2B] flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-[#625BF6]" />
                Camera Optical Viewfinder
              </span>
              <span className="text-[10px] text-[#16856B] font-bold bg-[#16856B]/10 px-2 py-0.5 rounded-full border border-[#16856B]/20">
                Lane Active (10 FPS)
              </span>
            </div>

            <div className="border border-[#E7E9F1] rounded-xl overflow-hidden bg-[#17182B] min-h-[280px] flex items-center justify-center">
              <div id="qr-lane-reader" className="w-full text-white text-xs"></div>
            </div>

            {/* Manual Token Fallback */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-[#171A2B] mb-1.5">
                Manual Token Entry (e.g. CP-TKT-HACK-DEMO01):
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <KeyRound className="w-4 h-4 text-[#687086] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Type or paste ticket token..."
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && verifyToken(manualToken)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                  />
                </div>
                <button
                  onClick={() => verifyToken(manualToken)}
                  disabled={loading || !manualToken.trim()}
                  className="px-4 py-2 bg-[#625BF6] hover:bg-[#5048E5] disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Validate Pass'}
                </button>
              </div>
            </div>
          </div>

          {/* Recent Scans Feed (Last 10 Scans) */}
          <div className="md:col-span-5 bg-white p-5 rounded-2xl border border-[#E7E9F1] shadow-2xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#E7E9F1] pb-2.5 mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#171A2B]">
                  Recent Scanned Passes ({scanHistory.length})
                </h3>
                <span className="text-[10px] text-[#687086]">Last 10 Scans</span>
              </div>

              {scanHistory.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#687086]">
                  No tickets verified in this active browser session yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {scanHistory.map((scan, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                        scan.success ? 'bg-[#16856B]/5 border-[#16856B]/20' : 'bg-[#D9485F]/5 border-[#D9485F]/20'
                      }`}
                    >
                      <div className="truncate">
                        <div className="font-bold text-[#171A2B] truncate">
                          {scan.attendeeName || scan.token}
                        </div>
                        <div className="text-[10px] text-[#687086] flex items-center gap-2 mt-0.5">
                          <span>{scan.time}</span>
                          {scan.eventTitle && (
                            <>
                              <span>•</span>
                              <span className="truncate">{scan.eventTitle}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge variant={scan.success ? 'positive' : 'critical'}>
                        {scan.success ? 'Verified' : 'Rejected'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#E7E9F1] text-[11px] text-[#687086] flex items-center justify-between">
              <span>Atomic Anti-Duplicate:</span>
              <strong className="text-[#16856B]">Guaranteed 1 Pass per Attendee</strong>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
