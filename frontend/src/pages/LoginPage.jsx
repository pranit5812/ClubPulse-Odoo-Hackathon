import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

export const LoginPage = () => {
  const { user, role, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already logged in, redirect straight to dashboard
  React.useEffect(() => {
    if (user) {
      if (['organizer', 'admin'].includes(role)) {
        navigate('/organizer/overview', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, role, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');

    try {
      const loggedInUser = await login(email.trim().toLowerCase(), password);
      if (['organizer', 'admin'].includes(loggedInUser?.role)) {
        navigate('/organizer/overview', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.');
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
          Sign in to your account
        </h2>
        <p className="mt-1 text-xs text-[#687086]">
          Don't have an account yet?{' '}
          <Link to="/register" className="font-semibold text-[#625BF6] hover:text-[#5048E5]">
            Register here
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-[#E7E9F1] rounded-2xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-[#D9485F]/10 border border-[#D9485F]/20 flex items-center gap-2.5 text-xs text-[#D9485F]">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#D9485F]" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#171A2B] mb-1">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#687086] absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#171A2B]">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#687086] absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-[#E7E9F1] rounded-xl bg-[#F7F8FC] text-[#171A2B] focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#625BF6] hover:bg-[#5048E5] disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign in to Skyline'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 border-t border-[#E7E9F1]/80 text-center">
            <p className="text-xs text-[#687086]">
              New student?{' '}
              <Link to="/register" className="font-semibold text-[#625BF6] hover:text-[#5048E5]">
                Get OTP to set password & register →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
