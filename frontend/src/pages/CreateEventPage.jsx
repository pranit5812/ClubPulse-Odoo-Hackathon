import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Users,
  Ticket,
  Coins,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Image as ImageIcon,
  Clock,
  Layers,
  HelpCircle,
  Check,
  Save
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { ImageUploadInput } from '../components/ImageUploadInput';
import { api, formatINR } from '../api/client';

export const CreateEventPage = () => {
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    venue: '',
    startDate: '',
    endDate: '',
    capacity: 100,
    memberPriceInr: 0,
    nonMemberPriceInr: 150,
    estimatedBudgetInr: 25000,
    requiredVolunteers: 5,
    bannerUrl: '',
    tags: 'Hackathon, Tech',
    isPublished: true
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Common quick category tags
  const presetTags = ['Hackathon', 'Workshop', 'AI', 'Coding', 'Web3', 'Design', 'Gala', 'Career'];

  const handleTagToggle = (tag) => {
    const currentTags = formData.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    let newTags;
    if (currentTags.includes(tag)) {
      newTags = currentTags.filter((t) => t !== tag);
    } else {
      newTags = [...currentTags, tag];
    }
    setFormData((prev) => ({ ...prev, tags: newTags.join(', ') }));
  };

  const validate = () => {
    const errs = {};

    if (!formData.title.trim()) {
      errs.title = 'Event title is required.';
    } else if (formData.title.trim().length < 3) {
      errs.title = 'Title must be at least 3 characters.';
    }

    if (!formData.venue.trim()) {
      errs.venue = 'Venue or location is required.';
    }

    if (!formData.startDate) {
      errs.startDate = 'Start date and time are required.';
    }

    if (!formData.endDate) {
      errs.endDate = 'End date and time are required.';
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate).getTime();
      const end = new Date(formData.endDate).getTime();
      if (end <= start) {
        errs.endDate = 'End time must be after start time.';
      }
    }

    if (!formData.capacity || parseInt(formData.capacity, 10) < 1) {
      errs.capacity = 'Capacity must be at least 1 attendee.';
    }

    if (formData.memberPriceInr < 0) {
      errs.memberPriceInr = 'Member price cannot be negative.';
    }

    if (formData.nonMemberPriceInr < 0) {
      errs.nonMemberPriceInr = 'Non-member price cannot be negative.';
    }

    if (formData.estimatedBudgetInr < 0) {
      errs.estimatedBudgetInr = 'Budget cannot be negative.';
    }

    if (
      formData.requiredVolunteers === undefined ||
      formData.requiredVolunteers === '' ||
      parseInt(formData.requiredVolunteers, 10) < 2
    ) {
      errs.requiredVolunteers = 'A minimum of 2 volunteers is required (less than 2 is not permitted).';
    }

    if (formData.bannerUrl && formData.bannerUrl.trim()) {
      const url = formData.bannerUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/') && !url.startsWith('data:image/')) {
        errs.bannerUrl = 'Image must be an uploaded file from your device or a URL starting with http://, https://, or /';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveWithStatus = async (publishImmediately) => {
    setServerError(null);
    setFormData((prev) => ({ ...prev, isPublished: publishImmediately }));

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      const tagsArray = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      // Format ISO or standardized date string
      const formattedStartDate = formData.startDate.replace('T', ' ');
      const formattedEndDate = formData.endDate.replace('T', ' ');

      // Convert Rupee values to integer paise (never float)
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        venue: formData.venue.trim(),
        event_date: formattedStartDate,
        end_date: formattedEndDate,
        capacity: parseInt(formData.capacity, 10),
        member_price_paise: Math.round(Number(formData.memberPriceInr) * 100),
        non_member_price_paise: Math.round(Number(formData.nonMemberPriceInr) * 100),
        estimated_budget_paise: Math.round(Number(formData.estimatedBudgetInr) * 100),
        required_volunteer_count: parseInt(formData.requiredVolunteers, 10),
        banner_url: formData.bannerUrl.trim() || undefined,
        tags: tagsArray,
        is_published: publishImmediately
      };

      const createdEvent = await api.post('/api/events', payload);
      setSuccessMessage(
        publishImmediately
          ? `Event "${createdEvent.title}" published live successfully!`
          : `Event "${createdEvent.title}" saved as draft successfully!`
      );

      // Short delay for visual feedback before redirect
      setTimeout(() => {
        if (publishImmediately) {
          navigate(`/organizer/events/${createdEvent.id}`);
        } else {
          navigate('/organizer/events');
        }
      }, 800);
    } catch (err) {
      console.error('Failed to create event:', err);
      setServerError(err.message || 'Failed to save event. Please verify all details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSaveWithStatus(formData.isPublished);
  };

  return (
    <DashboardLayout
      pageTitle="Create Event"
      breadcrumbs={[
        { label: 'Organizer', link: '/organizer/overview' },
        { label: 'Events & Tickets', link: '/organizer/events' },
        { label: 'New Event' }
      ]}
    >
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        {/* Top Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E9F1]">
          <div>
            <Link
              to="/organizer/events"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#687086] hover:text-[#625BF6] mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Events & Tickets</span>
            </Link>
            <h1 className="text-2xl font-bold text-[#171A2B] tracking-tight">Create New Event</h1>
            <p className="text-xs text-[#687086] mt-0.5">
              Publish upcoming chapter gatherings, hackathons, or workshops with atomic seating and ticketing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSaveWithStatus(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-[#E7E9F1] bg-white hover:bg-[#F7F8FC] text-[#171A2B] transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Save className="w-3.5 h-3.5 text-[#687086]" />
              <span>Save as Draft</span>
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSaveWithStatus(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#625BF6] hover:bg-[#5048E5] text-white transition-colors flex items-center gap-1.5 shadow-md shadow-[#625BF6]/25"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Publish Event</span>
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-4 bg-[#16856B]/10 border border-[#16856B]/30 rounded-xl flex items-center gap-3 text-xs font-semibold text-[#16856B] animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMessage} Redirecting to event workspace...</span>
          </div>
        )}

        {/* Server Error Alert */}
        {serverError && (
          <div className="p-4 bg-[#D9485F]/10 border border-[#D9485F]/30 rounded-xl flex items-center gap-3 text-xs font-semibold text-[#D9485F]">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Basic Information */}
          <div className="bg-white rounded-2xl border border-[#E7E9F1] p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#F0F2F7]">
              <Sparkles className="w-4 h-4 text-[#625BF6]" />
              <h2 className="text-sm font-bold text-[#171A2B] uppercase tracking-wider">
                1. General Information
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#171A2B] mb-1">
                  Event Title <span className="text-[#D9485F]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. ClubPulse HackSprint 2026: AI & Systems"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 ${
                    errors.title
                      ? 'border-[#D9485F] focus:ring-[#D9485F]'
                      : 'border-[#E7E9F1] focus:ring-[#625BF6]'
                  }`}
                />
                {errors.title && <p className="text-[11px] text-[#D9485F] mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#171A2B] mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe the agenda, target attendees, keynote speakers, prerequisites, and prizes..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E7E9F1] bg-white focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#171A2B] mb-1">
                  Category & Tags <span className="text-[#687086] font-normal">(Comma-separated)</span>
                </label>
                <input
                  type="text"
                  placeholder="Hackathon, Tech, AI, Workshop"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E7E9F1] bg-white focus:outline-none focus:ring-2 focus:ring-[#625BF6]"
                />
                {/* Preset tag pills */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[11px] text-[#687086] py-0.5 mr-1">Suggestions:</span>
                  {presetTags.map((tag) => {
                    const isSelected = formData.tags
                      .split(',')
                      .map((t) => t.trim())
                      .includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => handleTagToggle(tag)}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-colors ${
                          isSelected
                            ? 'bg-[#625BF6] text-white border-[#625BF6]'
                            : 'bg-[#F7F8FC] text-[#687086] border-[#E7E9F1] hover:bg-[#EEEDFE]'
                        }`}
                      >
                        +{tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <ImageUploadInput
                value={formData.bannerUrl}
                onChange={(val) => setFormData({ ...formData, bannerUrl: val })}
                error={errors.bannerUrl}
                label="Event Banner Image"
              />
            </div>
          </div>

          {/* Section 2: Venue & Schedule */}
          <div className="bg-white rounded-2xl border border-[#E7E9F1] p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#F0F2F7]">
              <MapPin className="w-4 h-4 text-[#625BF6]" />
              <h2 className="text-sm font-bold text-[#171A2B] uppercase tracking-wider">
                2. Venue & Scheduling
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#171A2B] mb-1">
                  Venue / Location <span className="text-[#D9485F]">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#687086] absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="e.g. Main Auditorium, Campus Hub 4 or Virtual (Zoom)"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    className={`w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 ${
                      errors.venue
                        ? 'border-[#D9485F] focus:ring-[#D9485F]'
                        : 'border-[#E7E9F1] focus:ring-[#625BF6]'
                    }`}
                  />
                </div>
                {errors.venue && <p className="text-[11px] text-[#D9485F] mt-1">{errors.venue}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#171A2B] mb-1">
                  Start Date & Time <span className="text-[#D9485F]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className={`w-full px-3.5 py-2.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 ${
                      errors.startDate
                        ? 'border-[#D9485F] focus:ring-[#D9485F]'
                        : 'border-[#E7E9F1] focus:ring-[#625BF6]'
                    }`}
                  />
                </div>
                {errors.startDate && (
                  <p className="text-[11px] text-[#D9485F] mt-1">{errors.startDate}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#171A2B] mb-1">
                  End Date & Time <span className="text-[#D9485F]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className={`w-full px-3.5 py-2.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 ${
                      errors.endDate
                        ? 'border-[#D9485F] focus:ring-[#D9485F]'
                        : 'border-[#E7E9F1] focus:ring-[#625BF6]'
                    }`}
                  />
                </div>
                {errors.endDate && (
                  <p className="text-[11px] text-[#D9485F] mt-1">{errors.endDate}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Ticketing, Seating Capacity & Pricing */}
          <div className="bg-white rounded-2xl border border-[#E7E9F1] p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#F0F2F7]">
              <Ticket className="w-4 h-4 text-[#625BF6]" />
              <h2 className="text-sm font-bold text-[#171A2B] uppercase tracking-wider">
                3. Seating Capacity & Ticketing (INR)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#171A2B] mb-1">
                  Seating Capacity <span className="text-[#D9485F]">*</span>
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-[#687086] absolute left-3 top-3" />
                  <input
                    type="number"
                    min="1"
                    placeholder="150"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className={`w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 ${
                      errors.capacity
                        ? 'border-[#D9485F] focus:ring-[#D9485F]'
                        : 'border-[#E7E9F1] focus:ring-[#625BF6]'
                    }`}
                  />
                </div>
                {errors.capacity && (
                  <p className="text-[11px] text-[#D9485F] mt-1">{errors.capacity}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#171A2B] mb-1">
                  Member Ticket Price (₹) <span className="text-[#D9485F]">*</span>
                </label>
                <div className="relative">
                  <span className="text-xs font-bold text-[#687086] absolute left-3 top-2.5">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={formData.memberPriceInr}
                    onChange={(e) => setFormData({ ...formData, memberPriceInr: e.target.value })}
                    className={`w-full pl-7 pr-3.5 py-2.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 ${
                      errors.memberPriceInr
                        ? 'border-[#D9485F] focus:ring-[#D9485F]'
                        : 'border-[#E7E9F1] focus:ring-[#625BF6]'
                    }`}
                  />
                </div>
                <p className="text-[10px] text-[#687086] mt-1">
                  Stored as {Math.round(Number(formData.memberPriceInr || 0) * 100)} paise
                </p>
                {errors.memberPriceInr && (
                  <p className="text-[11px] text-[#D9485F] mt-1">{errors.memberPriceInr}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#171A2B] mb-1">
                  Non-Member Price (₹) <span className="text-[#D9485F]">*</span>
                </label>
                <div className="relative">
                  <span className="text-xs font-bold text-[#687086] absolute left-3 top-2.5">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="150"
                    value={formData.nonMemberPriceInr}
                    onChange={(e) =>
                      setFormData({ ...formData, nonMemberPriceInr: e.target.value })
                    }
                    className={`w-full pl-7 pr-3.5 py-2.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 ${
                      errors.nonMemberPriceInr
                        ? 'border-[#D9485F] focus:ring-[#D9485F]'
                        : 'border-[#E7E9F1] focus:ring-[#625BF6]'
                    }`}
                  />
                </div>
                <p className="text-[10px] text-[#687086] mt-1">
                  Stored as {Math.round(Number(formData.nonMemberPriceInr || 0) * 100)} paise
                </p>
                {errors.nonMemberPriceInr && (
                  <p className="text-[11px] text-[#D9485F] mt-1">{errors.nonMemberPriceInr}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Budget & Volunteer Operations */}
          <div className="bg-white rounded-2xl border border-[#E7E9F1] p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#F0F2F7]">
              <Coins className="w-4 h-4 text-[#625BF6]" />
              <h2 className="text-sm font-bold text-[#171A2B] uppercase tracking-wider">
                4. Operational Budget & Volunteer Logistics
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#171A2B] mb-1">
                  Estimated Event Budget (₹)
                </label>
                <div className="relative">
                  <span className="text-xs font-bold text-[#687086] absolute left-3 top-2.5">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="25000"
                    value={formData.estimatedBudgetInr}
                    onChange={(e) =>
                      setFormData({ ...formData, estimatedBudgetInr: e.target.value })
                    }
                    className={`w-full pl-7 pr-3.5 py-2.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 ${
                      errors.estimatedBudgetInr
                        ? 'border-[#D9485F] focus:ring-[#D9485F]'
                        : 'border-[#E7E9F1] focus:ring-[#625BF6]'
                    }`}
                  />
                </div>
                <p className="text-[10px] text-[#687086] mt-1">
                  Format: {formatINR(Math.round(Number(formData.estimatedBudgetInr || 0) * 100))}
                </p>
                {errors.estimatedBudgetInr && (
                  <p className="text-[11px] text-[#D9485F] mt-1">{errors.estimatedBudgetInr}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#171A2B] mb-1">
                  Required Volunteer Count <span className="text-[#D9485F]">* (Min: 2)</span>
                </label>
                <input
                  type="number"
                  min="2"
                  placeholder="2"
                  value={formData.requiredVolunteers}
                  onChange={(e) =>
                    setFormData({ ...formData, requiredVolunteers: e.target.value })
                  }
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 ${
                    errors.requiredVolunteers
                      ? 'border-[#D9485F] focus:ring-[#D9485F]'
                      : 'border-[#E7E9F1] focus:ring-[#625BF6]'
                  }`}
                />
                <p className="text-[10px] text-[#687086] mt-1">
                  Minimum 2 volunteers compulsory. Assigned volunteer slots will be tracked in Task Board & Readiness.
                </p>
                {errors.requiredVolunteers && (
                  <p className="text-[11px] text-[#D9485F] mt-1 font-semibold">{errors.requiredVolunteers}</p>
                )}
              </div>
            </div>

            {/* Publication Status Selection */}
            <div className="pt-3 border-t border-[#F0F2F7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#171A2B]">Publication Status</span>
                <p className="text-[11px] text-[#687086]">
                  {formData.isPublished
                    ? 'Event will be live and immediately visible to chapter members on public calendar.'
                    : 'Event will be saved as an internal draft (hidden from public calendar).'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, isPublished: false }))}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                    !formData.isPublished
                      ? 'bg-[#17182B] text-white border-[#17182B] shadow-2xs'
                      : 'bg-[#F7F8FC] text-[#687086] border-[#E7E9F1] hover:bg-[#EEEDFE]'
                  }`}
                >
                  {!formData.isPublished && <Check className="w-3.5 h-3.5 text-white" />}
                  <span>Draft Mode</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, isPublished: true }))}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                    formData.isPublished
                      ? 'bg-[#16856B] text-white border-[#16856B] shadow-2xs'
                      : 'bg-[#F7F8FC] text-[#687086] border-[#E7E9F1] hover:bg-[#EEEDFE]'
                  }`}
                >
                  {formData.isPublished && <Check className="w-3.5 h-3.5 text-white" />}
                  <span>Published Mode</span>
                </button>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-[#E7E9F1]">
            <Link
              to="/organizer/events"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#E7E9F1] text-xs font-semibold text-[#687086] hover:bg-[#F7F8FC] text-center transition-colors"
            >
              Cancel
            </Link>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSaveWithStatus(false)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#2B2E4E] bg-[#17182B] hover:bg-[#23253E] text-white text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting && !formData.isPublished ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Draft...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-[#A6ACBE]" />
                  <span>Save as Draft</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSaveWithStatus(true)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#625BF6] hover:bg-[#5048E5] text-white text-xs font-bold shadow-md shadow-[#625BF6]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting && formData.isPublished ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Publishing Event...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Publish Event</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default CreateEventPage;
