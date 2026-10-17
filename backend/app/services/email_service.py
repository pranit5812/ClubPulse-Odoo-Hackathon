import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings

logger = logging.getLogger("clubpulse.email")

class EmailService:
    @staticmethod
    def send_otp_email(to_email: str, otp: str, student_name: str = "Student") -> bool:
        """
        Sends registration verification OTP via Gmail SMTP.
        """
        smtp_host = settings.SMTP_HOST
        smtp_port = settings.SMTP_PORT
        sender_email = settings.SMTP_EMAIL
        sender_password = settings.SMTP_PASSWORD.replace(" ", "")

        subject = f"{otp} is your Skyline Verification Code"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F7F8FC; margin: 0; padding: 24px; color: #171A2B; }}
            .container {{ max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #E7E9F1; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
            .brand {{ display: flex; align-items: center; gap: 8px; margin-bottom: 24px; }}
            .logo-text {{ font-size: 20px; font-weight: 800; color: #625BF6; }}
            .title {{ font-size: 18px; font-weight: 700; color: #171A2B; margin-bottom: 12px; }}
            .desc {{ font-size: 13px; line-height: 1.6; color: #687086; margin-bottom: 24px; }}
            .otp-box {{ background: #F3F4FD; border: 2px dashed #625BF6; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px; }}
            .otp-code {{ font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #625BF6; font-family: monospace; }}
            .expiry {{ font-size: 11px; color: #8F95B2; margin-top: 6px; }}
            .footer {{ font-size: 11px; color: #8F95B2; text-align: center; border-top: 1px solid #E7E9F1; pt: 16px; margin-top: 24px; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="brand">
              <span class="logo-text">Skyline Organization</span>
            </div>
            <div class="title">Verify Your Student Registration</div>
            <p class="desc">
              Hello {student_name},<br>
              Thank you for registering on the Skyline Campus Intelligence Platform. Use the one-time verification code below to verify your email and activate your account:
            </p>
            <div class="otp-box">
              <div class="otp-code">{otp}</div>
              <div class="expiry">Valid for 10 minutes. Do not share this code with anyone.</div>
            </div>
            <p class="desc" style="font-size: 12px; margin-bottom: 0;">
              If you did not request this verification code, you can safely ignore this email.
            </p>
            <div class="footer">
              Skyline Student Organization Intelligence Platform &copy; 2026
            </div>
          </div>
        </body>
        </html>
        """

        text_body = f"""Skyline Student Organization Intelligence
Verify Your Student Registration

Hello {student_name},
Your verification code is: {otp}

This code is valid for 10 minutes. Do not share this code with anyone.

If you did not request this, you can ignore this email.
"""

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"Skyline Platform <{sender_email}>"
            msg["To"] = to_email

            part1 = MIMEText(text_body, "plain")
            part2 = MIMEText(html_body, "html")
            msg.attach(part1)
            msg.attach(part2)

            server = smtplib.SMTP(smtp_host, smtp_port, timeout=12)
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, [to_email], msg.as_string())
            server.quit()
            logger.info(f"Verification OTP email sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send OTP email to {to_email}: {e}")
            # Also log clearly in console for easy development testing
            print(f"[OTP-FALLBACK] OTP for {to_email} is {otp}. (SMTP error: {e})")
            return False

    @staticmethod
    def send_ticket_qr_email(ticket: dict, user: dict, event: dict) -> bool:
        """
        Sends the event registration pass with the embedded QR code to the user's email.
        """
        import io
        import base64
        import qrcode
        from email.mime.image import MIMEImage

        to_email = user.get("email") or ticket.get("user_email")
        if not to_email:
            logger.warning("No recipient email provided for ticket pass email.")
            return False

        smtp_host = settings.SMTP_HOST
        smtp_port = settings.SMTP_PORT
        sender_email = settings.SMTP_EMAIL
        sender_password = settings.SMTP_PASSWORD.replace(" ", "")

        attendee_name = ticket.get("user_name") or user.get("full_name") or "Student Attendee"
        roll_number = ticket.get("user_roll_number") or user.get("roll_number") or "STU-VERIFIED"
        department = ticket.get("user_department") or user.get("department") or "General"
        phone = ticket.get("user_phone") or user.get("phone") or ""
        event_title = ticket.get("event_title") or event.get("title") or "Campus Event"
        event_date = ticket.get("event_date") or event.get("event_date") or "TBD"
        venue = ticket.get("venue") or event.get("venue") or "Campus Main Hall"
        qr_token = ticket.get("qr_token") or ticket.get("id") or ""
        is_member = (ticket.get("membership_status") or user.get("membership_status")) == "active"
        membership_text = "Active Club Member" if is_member else "General Attendee"
        role_track = ticket.get("role_track", "participant")
        track_text = "Volunteer Operations Pass" if role_track == "volunteer" else "Participant Attendee Pass"

        # Build readable QR text payload
        qr_lines = [
            "🎓 ClubPulse Verified Event Pass",
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            f"👤 Attendee: {attendee_name}",
            f"🆔 Roll No: {roll_number}",
            f"🏛️ Department: {department}",
            f"📧 Email: {to_email}"
        ]
        if phone:
            qr_lines.append(f"📞 Phone: {phone}")
        qr_lines.extend([
            f"⭐ Membership: {membership_text}",
            f"🎟️ Pass Track: {track_text}",
            "",
            f"📅 Event: {event_title}",
            f"🕒 Date & Time: {event_date}",
            f"📍 Venue: {venue}",
            f"🎫 Pass Token: {qr_token}",
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            "Official Gate Credential • Present for Entry"
        ])
        qr_text_payload = "\n".join(qr_lines)

        # Generate QR code PNG image bytes
        qr_bytes = None
        qr_b64 = None
        try:
            qr = qrcode.QRCode(
                version=None,
                error_correction=qrcode.constants.ERROR_CORRECT_M,
                box_size=8,
                border=2,
            )
            qr.add_data(qr_text_payload)
            qr.make(fit=True)
            img = qr.make_image(fill_color="#171A2B", back_color="#FFFFFF")
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            qr_bytes = buf.getvalue()
            qr_b64 = base64.b64encode(qr_bytes).decode("ascii")
        except Exception as e:
            logger.error(f"Failed to generate QR image for email: {e}")

        subject = f"🎟️ Event Pass Confirmed: {event_title} [QR Code Attached]"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F7F8FC; margin: 0; padding: 24px; color: #171A2B; }}
            .container {{ max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #E7E9F1; padding: 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }}
            .badge {{ display: inline-block; padding: 4px 12px; background: #EEEDFE; color: #625BF6; border: 1px solid #D4D1FD; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }}
            .title {{ font-size: 22px; font-weight: 800; color: #171A2B; margin-bottom: 6px; line-height: 1.3; }}
            .subtitle {{ font-size: 13px; color: #687086; margin-bottom: 24px; }}
            
            .event-card {{ background: #F7F8FC; border: 1px solid #E7E9F1; border-radius: 14px; padding: 18px; margin-bottom: 24px; }}
            .event-title {{ font-size: 15px; font-weight: 700; color: #171A2B; margin-bottom: 8px; }}
            .event-meta {{ font-size: 12px; color: #687086; line-height: 1.6; }}
            
            .qr-container {{ text-align: center; background: #FAFBFD; border: 2px dashed #D4D1FD; border-radius: 16px; padding: 24px; margin-bottom: 24px; }}
            .qr-image {{ width: 210px; height: 210px; border-radius: 12px; border: 1px solid #E7E9F1; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }}
            .qr-token {{ font-family: monospace; font-size: 12px; font-weight: 700; color: #625BF6; background: #EEEDFE; padding: 6px 14px; border-radius: 8px; display: inline-block; margin-top: 14px; letter-spacing: 0.5px; }}
            .qr-hint {{ font-size: 11px; color: #8F95B2; margin-top: 8px; }}

            .details-table {{ width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }}
            .details-table td {{ padding: 8px 0; border-bottom: 1px solid #F0F2F7; }}
            .details-table td.label {{ color: #8F95B2; width: 40%; font-weight: 500; }}
            .details-table td.val {{ color: #171A2B; font-weight: 700; text-align: right; }}

            .instructions {{ background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 14px; font-size: 12px; color: #166534; line-height: 1.5; margin-bottom: 24px; }}
            .footer {{ font-size: 11px; color: #8F95B2; text-align: center; border-top: 1px solid #E7E9F1; padding-top: 18px; line-height: 1.5; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div>
              <span class="badge">Official Event Entry Pass</span>
            </div>
            <div class="title">{event_title}</div>
            <div class="subtitle">Hello {attendee_name}, your event registration is confirmed!</div>

            <!-- QR Code Section -->
            <div class="qr-container">
              <div>
                <img src="cid:event_qr_image" alt="Event QR Pass" class="qr-image" />
              </div>
              <div>
                <span class="qr-token">{qr_token}</span>
              </div>
              <div class="qr-hint">Scan this QR code with any camera scanner to view your attendee profile credentials.</div>
            </div>

            <!-- Event Details -->
            <div class="event-card">
              <div class="event-title">Event Schedule & Location</div>
              <div class="event-meta">
                📅 <strong>Date & Time:</strong> {event_date}<br>
                📍 <strong>Venue:</strong> {venue}<br>
                🎟️ <strong>Pass Type:</strong> {track_text}
              </div>
            </div>

            <!-- Attendee Profile Credentials -->
            <table class="details-table">
              <tr>
                <td class="label">Attendee Name</td>
                <td class="val">{attendee_name}</td>
              </tr>
              <tr>
                <td class="label">Roll Number / Student ID</td>
                <td class="val">{roll_number}</td>
              </tr>
              <tr>
                <td class="label">Department / Branch</td>
                <td class="val">{department}</td>
              </tr>
              <tr>
                <td class="label">Registered Email</td>
                <td class="val">{to_email}</td>
              </tr>
              <tr>
                <td class="label">Membership Status</td>
                <td class="val">{membership_text}</td>
              </tr>
            </table>

            <div class="instructions">
              <strong>Entry Checklist:</strong> Please keep this email handy or save the attached QR code image to your phone gallery. Present it to the gate turnstile for fast verification.
            </div>

            <div class="footer">
              ClubPulse Campus Intelligence Platform &copy; 2026<br>
              Automatic notification for verified ticket booking.
            </div>
          </div>
        </body>
        </html>
        """

        plain_text = f"""ClubPulse Verified Event Pass
Event Registration Confirmed!

Hello {attendee_name},
You are registered for: {event_title}

Event Date & Time: {event_date}
Venue: {venue}
Pass Token: {qr_token}

Attendee: {attendee_name}
Roll Number: {roll_number}
Department: {department}
Membership: {membership_text}
Track: {track_text}

Your digital entry QR code has been attached to this email as an image (Pass_{qr_token}.png).
Present this QR code at the check-in desk for entry.

ClubPulse Campus Intelligence Platform © 2026
"""

        try:
            msg = MIMEMultipart("related")
            msg["Subject"] = subject
            msg["From"] = f"ClubPulse Events <{sender_email}>"
            msg["To"] = to_email

            # Alternative plain and html text
            msg_alt = MIMEMultipart("alternative")
            msg_alt.attach(MIMEText(plain_text, "plain"))
            msg_alt.attach(MIMEText(html_body, "html"))
            msg.attach(msg_alt)

            if qr_bytes:
                # 1. Inline Image for cid:event_qr_image
                img_inline = MIMEImage(qr_bytes, "png")
                img_inline.add_header("Content-ID", "<event_qr_image>")
                img_inline.add_header("Content-Disposition", "inline", filename="event_qr_pass.png")
                msg.attach(img_inline)

                # 2. Downloadable attachment
                img_attach = MIMEImage(qr_bytes, "png")
                img_attach.add_header("Content-Disposition", "attachment", filename=f"Pass_{qr_token}.png")
                msg.attach(img_attach)

            server = smtplib.SMTP(smtp_host, smtp_port, timeout=14)
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, [to_email], msg.as_string())
            server.quit()
            logger.info(f"Event Pass with QR code successfully sent to {to_email} for event {event_title}")
            return True
        except Exception as e:
            logger.error(f"Failed to send Event QR pass email to {to_email}: {e}")
            print(f"[TICKET-EMAIL-FALLBACK] QR Pass email to {to_email} failed: {e}")
            return False
