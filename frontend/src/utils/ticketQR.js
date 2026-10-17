/**
 * Constructs clean, human-readable user profile & event pass information
 * encoded inside the QR code so that any camera scan shows user-friendly text
 * instead of raw JSON code.
 */
export const buildTicketQRData = (ticket, user) => {
  if (!ticket) return '';

  const attendeeName = ticket.user_name || user?.full_name || 'Verified Student';
  const rollNumber = ticket.user_roll_number || user?.roll_number || 'STU-VERIFIED';
  const department = ticket.user_department || user?.department || 'General';
  const email = ticket.user_email || user?.email || 'N/A';
  const phone = ticket.user_phone || user?.phone;
  const isMember = (ticket.membership_status || user?.membership_status) === 'active';
  const membershipText = isMember ? 'Active Club Member' : 'General Attendee';
  const trackText = ticket.role_track === 'volunteer' ? 'Volunteer Operations' : 'Participant Attendee';
  const eventTitle = ticket.event_title || 'Campus Event';
  const eventDate = ticket.event_date || 'TBD';
  const venue = ticket.venue || 'Campus Main Hall';
  const qrToken = ticket.qr_token || ticket.id || '';

  const lines = [
    '🎓 ClubPulse Verified Event Pass',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `👤 Attendee: ${attendeeName}`,
    `🆔 Roll No: ${rollNumber}`,
    `🏛️ Department: ${department}`,
    `📧 Email: ${email}`
  ];

  if (phone) {
    lines.push(`📞 Phone: ${phone}`);
  }

  lines.push(
    `⭐ Membership: ${membershipText}`,
    `🎟️ Pass Track: ${trackText}`,
    '',
    `📅 Event: ${eventTitle}`,
    `🕒 Date & Time: ${eventDate}`,
    `📍 Venue: ${venue}`,
    `🎫 Pass Token: ${qrToken}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'Official Gate Credential • Present for Entry'
  );

  return lines.join('\n');
};

/**
 * Extracts the gate pass token and attendee profile from any scanned QR text,
 * supporting formatted text, JSON strings, or plain token IDs.
 */
export const parseQRContent = (text) => {
  if (!text) return { token: '', profile: {} };
  const trimmed = text.trim();
  let token = trimmed;
  const profile = {};

  // 1. Try matching "Pass Token: <token>"
  const tokenMatch = trimmed.match(/Pass Token:\s*([A-Za-z0-9_-]+)/i);
  if (tokenMatch) {
    token = tokenMatch[1].trim();
  }

  // 2. Extract attendee fields from formatted text lines
  const nameMatch = trimmed.match(/(?:👤\s*)?Attendee:\s*(.+)$/m);
  if (nameMatch) profile.attendee_name = nameMatch[1].trim();

  const rollMatch = trimmed.match(/(?:🆔\s*)?Roll No:\s*(.+)$/m);
  if (rollMatch) profile.roll_number = rollMatch[1].trim();

  const deptMatch = trimmed.match(/(?:🏛️\s*)?Department:\s*(.+)$/m);
  if (deptMatch) profile.department = deptMatch[1].trim();

  const emailMatch = trimmed.match(/(?:📧\s*)?Email:\s*(.+)$/m);
  if (emailMatch) profile.email = emailMatch[1].trim();

  const eventMatch = trimmed.match(/(?:📅\s*)?Event:\s*(.+)$/m);
  if (eventMatch) profile.event_title = eventMatch[1].trim();

  // 3. Fallback: Parse as JSON if formatted as JSON
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.qr_token) token = parsed.qr_token;
      Object.assign(profile, parsed);
    } catch {}
  }

  // 4. Fallback: If token still looks like full text, grab CP-TKT-... pattern
  if (token.includes('\n') || token.length > 50) {
    const cpMatch = token.match(/(CP-TKT-[A-Za-z0-9_-]+)/i);
    if (cpMatch) token = cpMatch[1];
  }

  return { token, profile };
};
