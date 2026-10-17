import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Lock, 
  Mail, 
  User, 
  Hash, 
  Phone, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2,
  KeyRound,
  RotateCcw,
  ArrowLeft,
  Sparkles
} from 'lucide-react';

export const RegisterPage = () => {
  const { sendOtp, verifyOtpAndRegister } = useAuth();
  const navigate = useNavigate();

  // Wizard Step: 'details' | 'otp'
  const [step, setStep] = useState('details');

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // OTP State
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Status State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval = null;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, timer]);

  // Handle Step 1: Submit Details & Trigger OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setError('Please provide your full legal name and email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      await sendOtp(email.trim().toLowerCase(), fullName.trim());
      setStep('otp');
      setTimer(60);
      setCanResend(false);
      setSuccessMsg(`A 6-digit verification OTP was sent to ${email.trim().toLowerCase()}`);
    } catch (err) {
      setError(err.message || 'Failed to send verification code. Please check email address.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await sendOtp(email.trim().toLowerCase(), fullName.trim());
      setTimer(60);
      setCanResend(false);
      setSuccessMsg('A new verification code has been dispatched to your email.');
    } catch (err) {
      setError(err.message || 'Failed to resend verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2: Verify OTP & Register Account
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }
    if (otp.trim().length < 4) {
      setError('Verification code must be at least 4-6 digits.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await verifyOtpAndRegister({
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        password,
        roll_number: rollNumber.trim() || 'STU-2026-001',
        phone: phone.trim() || null,
        otp: otp.trim()
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-12 h-12 rounded-xl bg-white border border-[#E7E9F1] shadow-xs flex items-center justify-center p-1 overflow-hidden shrink-0">
            <img src="/logo.png" alt="Skyline" className="w-full h-full object-contain" />
          </div>
          <span className="text-2xl font-extrabold text-[#171A2B] tracking-tight">
            Skyline
          </span>
        </Link>

        <h2 className="mt-4 text-xl font-bold tracking-tight text-[#171A2B]">
          {step === 'details' ? 'Create student account' : 'Enter Email Verification Code'}
        </h2>
        <p className="mt-1 text-xs text-[#687086]">
          {step === 'details' ? (
            <>
              Already registered?{' '}
              <Link to="/login" className="font-semibold text-[#625BF6] hover:text-[#5048E5]">
                Sign in with email & password
              </Link>
            </>
          ) : (
            <>
              We sent an OTP to <span className="font-semibold text-[#171A2B]">{email}</span>
            </>
          )}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-[#E7E9F1] rounded-2xl space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-[#D9485F]/10 border border-[#D9485F]/20 flex items-center gap-2.5 text-xs text-[#D9485F]">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#D9485F]" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-[#2ECC71]/10 border border-[#2ECC71]/20 flex items-center gap-2.5 text-xs text-[#27AE60]">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#27AE60]" />
              <span>{successMsg}</span>
            </div>
          )}

          {step === 'details' ? (
            /* STEP 1: FILL DETAILS & CLICK CREATE/CONTINUE */
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#171A2B] mb-1">
                  Full Legal Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#687086] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Harsh Parmar"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171A2B] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#687086] absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#171A2B] mb-1">
                    Roll / Student ID
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-[#687086] absolute left-3 top-3" />
                    <input
                      type="text"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      placeholder="STU-2026-042"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#171A2B] mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#687086] absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765..."
                      className="w-full pl-9 pr-3 py-2 text-xs border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171A2B] mb-1">
                  Create Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#687086] absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171A2B] mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#687086] absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !fullName || !email || !password || !confirmPassword}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#625BF6] hover:bg-[#5048E5] disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{loading ? 'Sending Verification OTP...' : 'Create Student Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* STEP 2: ENTER OTP & VERIFY TO COMPLETE REGISTRATION */
            <form onSubmit={handleVerifyAndRegister} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#625BF6]/5 border border-[#625BF6]/15 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#625BF6] shrink-0 mt-0.5" />
                <div className="text-xs text-[#171A2B]">
                  <p className="font-semibold text-[#625BF6]">Email Verification Required</p>
                  <p className="text-[#687086] mt-0.5">
                    We have dispatched a 6-digit one-time code to <strong>{email}</strong>. Please enter the OTP to activate your account.
                  </p>
                </div>
              </div>


              <div>
                <label className="block text-xs font-semibold text-[#171A2B] mb-1">
                  6-Digit Verification Code (OTP)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#687086] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={10}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-full pl-9 pr-3 py-2 text-sm tracking-widest font-mono border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep('details');
                    setError('');
                  }}
                  className="inline-flex items-center gap-1 text-[#687086] hover:text-[#171A2B] cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>

                <button
                  type="button"
                  disabled={!canResend || loading}
                  onClick={handleResendOtp}
                  className="inline-flex items-center gap-1 text-[#625BF6] hover:text-[#5048E5] disabled:text-[#8F95B2] disabled:cursor-not-allowed cursor-pointer font-medium"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{canResend ? 'Resend OTP' : `Resend in ${timer}s`}</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || !otp.trim()}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#625BF6] hover:bg-[#5048E5] disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{loading ? 'Verifying & Creating Account...' : 'Verify OTP & Complete Registration'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          <div className="pt-2 border-t border-[#E7E9F1]/80 text-center">
            <p className="text-xs text-[#687086]">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-[#625BF6] hover:text-[#5048E5]">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
