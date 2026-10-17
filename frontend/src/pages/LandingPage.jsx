import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import gsap from 'gsap';
import {
  Activity,
  ShieldAlert,
  SlidersHorizontal,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  Users,
  Ticket,
  Lock,
  Sparkles,
  Zap,
  Megaphone
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { ThreeScene } from '../components/ThreeScene';
import { AnnouncementSlider } from '../components/AnnouncementSlider';
import { api } from '../api/client';

export const LandingPage = () => {
  const { user, role, loading: authLoading } = useAuth();
  const heroRef = useRef(null);
  const cardsRef = useRef(null);
  const [announcements, setAnnouncements] = useState([]);


  useEffect(() => {
    api.get('/api/announcements')
      .then((data) => setAnnouncements(data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.from('.gsap-hero-title', {
        opacity: 0,
        y: 24,
        duration: 0.7,
        ease: 'power3.out'
      });

      gsap.from('.gsap-hero-subtitle', {
        opacity: 0,
        y: 18,
        duration: 0.7,
        delay: 0.12,
        ease: 'power3.out'
      });

      gsap.from('.gsap-hero-cta', {
        opacity: 0,
        y: 14,
        duration: 0.6,
        delay: 0.24,
        ease: 'power3.out'
      });

      gsap.from('.gsap-card', {
        opacity: 0,
        y: 24,
        duration: 0.7,
        stagger: 0.1,
        delay: 0.35,
        ease: 'power3.out'
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  // Authenticated users never see the landing page - redirect directly to dashboard
  if (!authLoading && user) {
    if (['organizer', 'admin'].includes(role)) {
      return <Navigate to="/organizer/overview" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div ref={heroRef} className="min-h-screen bg-[#F7F8FC] text-[#171A2B] flex flex-col selection:bg-[#625BF6] selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Value Prop */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#625BF6]/10 border border-[#625BF6]/20 text-xs font-semibold text-[#625BF6] shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-[#625BF6]" />
                <span>Odoo Hackathon 2026 • Student Organization Intelligence Platform</span>
              </div>

              <h1 className="gsap-hero-title text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#171A2B] leading-[1.12]">
                Know what your club can afford,{' '}
                <span className="text-[#625BF6]">
                  what is at risk
                </span>
                , and what to do next.
              </h1>

              <p className="gsap-hero-subtitle text-base sm:text-lg text-[#687086] max-w-2xl leading-relaxed">
                Skyline transforms chaotic collegiate clubs into resilient operating engines. 
                Move beyond disconnected spreadsheets with connected financial ledgers, 
                explainable risk auditing, and non-mutating event scenario simulations.
              </p>

              <div className="gsap-hero-cta flex flex-wrap items-center gap-3.5 pt-2">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#625BF6] hover:bg-[#5048E5] text-white font-semibold text-sm shadow-md shadow-[#625BF6]/25 transition-all"
                >
                  <span>Launch Student Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/risk"
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-[#F7F8FC] text-[#171A2B] font-semibold text-sm border border-[#E7E9F1] shadow-2xs transition-all"
                >
                  <ShieldAlert className="w-4 h-4 text-[#D9485F]" />
                  <span>Inspect Risk Engine</span>
                </Link>

                <Link
                  to="/simulator"
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-[#F7F8FC] text-[#171A2B] font-semibold text-sm border border-[#E7E9F1] shadow-2xs transition-all"
                >
                  <SlidersHorizontal className="w-4 h-4 text-[#625BF6]" />
                  <span>Test Live Simulator</span>
                </Link>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-[#687086] font-medium">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16856B]" />
                  <span>Strict Integer Paise Ledger</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16856B]" />
                  <span>Deterministic Rule Engine</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16856B]" />
                  <span>Zero-Mutation Sandbox</span>
                </div>
              </div>
            </div>

            {/* Right Column: Three.js Interactive 3D Graphic */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl bg-white p-3 border border-[#E7E9F1] shadow-xl">
                <ThreeScene />
                <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E7E9F1] shadow-md">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#171A2B]">
                    <span className="flex items-center gap-1.5 text-[#625BF6]">
                      <Zap className="w-3.5 h-3.5" />
                      Live Club Resilience Score
                    </span>
                    <span className="text-[#16856B] font-bold bg-[#16856B]/10 px-2 py-0.5 rounded-full border border-[#16856B]/20">
                      82 / 100
                    </span>
                  </div>
                  <div className="w-full bg-[#F7F8FC] border border-[#E7E9F1] h-1.5 rounded-full mt-2.5 overflow-hidden">
                    <div className="bg-[#16856B] h-full rounded-full" style={{ width: '82%' }}></div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Live Campus Bulletins (Flutter style) */}
      {announcements.length > 0 && (
        <section className="pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <AnnouncementSlider announcements={announcements} />
        </section>
      )}

      {/* Signature Differentiators Grid */}
      <section ref={cardsRef} className="py-16 bg-white border-y border-[#E7E9F1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#625BF6]">
              Architecture & Differentiators
            </span>
            <h2 className="text-3xl font-bold text-[#171A2B] tracking-tight mt-1.5">
              Built for High-Stakes Campus Operations
            </h2>
            <p className="text-sm text-[#687086] mt-2">
              Three signature capabilities engineered to eliminate common university organization failures.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1: Risk Engine */}
            <div className="gsap-card bg-[#F7F8FC] rounded-2xl p-7 border border-[#E7E9F1] hover:border-[#625BF6]/40 transition-all hover:shadow-lg group">
              <div className="w-12 h-12 rounded-xl bg-[#D9485F]/10 text-[#D9485F] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#171A2B] mb-2">
                Operational Risk Engine
              </h3>
              <p className="text-xs text-[#687086] leading-relaxed mb-4">
                Deterministic rules audit real database records across ledger balances, overdue critical tasks, 
                volunteer shortages, and stock shortages. Never hallucinates scores.
              </p>
              <ul className="text-xs text-[#687086] space-y-1.5">
                <li>• Reserve deficit alerts against minimum policy</li>
                <li>• Unassigned required volunteer role detection</li>
                <li>• Explainable cause & recommended remediation</li>
              </ul>
            </div>

            {/* Feature 2: Simulator */}
            <div className="gsap-card bg-[#F7F8FC] rounded-2xl p-7 border border-[#E7E9F1] hover:border-[#625BF6]/40 transition-all hover:shadow-lg group">
              <div className="w-12 h-12 rounded-xl bg-[#625BF6]/10 text-[#625BF6] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <SlidersHorizontal className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#171A2B] mb-2">
                Live Club Simulator
              </h3>
              <p className="text-xs text-[#687086] leading-relaxed mb-4">
                Stress-test event ticket pricing, member ratios, and attendance yields before sanctioning commitments. 
                Guaranteed zero mutation of live database records during simulation.
              </p>
              <ul className="text-xs text-[#687086] space-y-1.5">
                <li>• Real-time variance vs current baseline plan</li>
                <li>• Break-even ticket price sensitivity suggestions</li>
                <li>• Explicit confirmation workflow to apply changes</li>
              </ul>
            </div>

            {/* Feature 3: Handover Report */}
            <div className="gsap-card bg-[#F7F8FC] rounded-2xl p-7 border border-[#E7E9F1] hover:border-[#625BF6]/40 transition-all hover:shadow-lg group">
              <div className="w-12 h-12 rounded-xl bg-[#16856B]/10 text-[#16856B] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#171A2B] mb-2">
                Semester Handover Engine
              </h3>
              <p className="text-xs text-[#687086] leading-relaxed mb-4">
                Eliminates annual club governance collapse. Generates an instant, verifiable audit trail 
                of opening vs closing cash, outstanding reimbursements, and asset valuations.
              </p>
              <ul className="text-xs text-[#687086] space-y-1.5">
                <li>• 100% derived from integer paise transaction logs</li>
                <li>• Verified event attendance yield summaries</li>
                <li>• Instant executive CSV ledger export</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#E7E9F1] bg-white py-8 text-center text-xs text-[#687086]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-semibold text-[#171A2B]">
            <img src="/logo.png" alt="Skyline" className="w-5 h-5 object-contain" />
            <span>Skyline • Odoo Hackathon 2026</span>
          </div>
          <p>© 2026 Skyline Intelligence Systems. Built with FastAPI, MongoDB Atlas, React & Tailwind.</p>
          <div className="flex items-center gap-4 text-[#687086]">
            <Link to="/events" className="hover:text-[#625BF6]">Events</Link>
            <Link to="/merch" className="hover:text-[#625BF6]">Merchandise</Link>
            <Link to="/login" className="hover:text-[#625BF6]">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
