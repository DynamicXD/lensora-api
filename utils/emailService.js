// utils/emailService.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Email transporter configuration error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Generic send email function
export const sendEmail = async ({ to, subject, text, html, attachments = [] }) => {
  try {
    const mailOptions = {
      from: `Photography Booking <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
      attachments
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send email');
  }
};

// Welcome email template
export const sendWelcomeEmail = async (user) => {
  const subject = 'Welcome to Photography Booking Platform!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2c3e50; margin: 0;">Welcome ${user.name}!</h1>
          <p style="color: #7f8c8d; font-size: 16px;">Thank you for joining our photography booking platform</p>
        </div>
        
        ${user.role !== 'user' ? `
          <div style="background-color: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h2 style="color: #34495e; margin-top: 0;">Next Steps for ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}s:</h2>
            <ul style="color: #2c3e50; line-height: 1.6;">
              <li>Complete your profile with portfolio and services</li>
              <li>Add team members and equipment inventory</li>
              <li>Set your availability and pricing structure</li>
              <li>Wait for admin approval to start receiving bookings</li>
              <li>Upload high-quality portfolio samples</li>
            </ul>
          </div>
        ` : `
          <div style="background-color: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h2 style="color: #27ae60; margin-top: 0;">What you can do now:</h2>
            <ul style="color: #2c3e50; line-height: 1.6;">
              <li>Browse photographer and videographer profiles</li>
              <li>Book sessions for your events and special occasions</li>
              <li>Save your favorite providers to your wishlist</li>
              <li>Read reviews and ratings from other clients</li>
              <li>Track your booking history and upcoming events</li>
            </ul>
          </div>
        `}
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
          <p style="color: #7f8c8d;">If you have any questions, feel free to contact our support team.</p>
          <p style="color: #2c3e50; margin: 0;">
            Best regards,<br>
            <strong>Photography Booking Team</strong>
          </p>
        </div>
      </div>
    </div>
  `;

  return await sendEmail({
    to: user.email,
    subject,
    html
  });
};

// Booking confirmation email
export const sendBookingConfirmationEmail = async (booking, recipient, isProvider = false) => {
  const subject = isProvider ? 'New Booking Received!' : 'Booking Confirmation';
  const eventDate = new Date(booking.eventDetails.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: ${isProvider ? '#e74c3c' : '#27ae60'}; margin: 0;">
            ${isProvider ? '📸 New Booking Received!' : '✅ Booking Confirmed!'}
          </h1>
        </div>
        
        <div style="background-color: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h2 style="color: #2c3e50; margin-top: 0;">Event Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #34495e;">Event:</td>
              <td style="padding: 8px 0; color: #2c3e50;">${booking.eventDetails.title}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #34495e;">Date:</td>
              <td style="padding: 8px 0; color: #2c3e50;">${eventDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #34495e;">Time:</td>
              <td style="padding: 8px 0; color: #2c3e50;">${booking.eventDetails.startTime} - ${booking.eventDetails.endTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #34495e;">Location:</td>
              <td style="padding: 8px 0; color: #2c3e50;">${booking.eventDetails.location.venue}<br>${booking.eventDetails.location.address}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #34495e;">Total Amount:</td>
              <td style="padding: 8px 0; color: #27ae60; font-weight: bold; font-size: 18px;">$${booking.pricing.totalAmount}</td>
            </tr>
          </table>
        </div>

        ${isProvider ? `
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              <strong>Action Required:</strong> Please log in to your dashboard to view full details and confirm this booking.
            </p>
          </div>
        ` : `
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #155724;">
              <strong>What's Next:</strong> You'll receive updates as your booking is processed. We'll send you details about preparation and delivery timeline.
            </p>
          </div>
        `}
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
          <p style="color: #7f8c8d;">
            Booking ID: <strong>${booking._id}</strong><br>
            Questions? Contact us at support@photographybooking.com
          </p>
        </div>
      </div>
    </div>
  `;

  return await sendEmail({
    to: recipient.email,
    subject,
    html
  });
};

// Booking reminder email
export const sendBookingReminderEmail = async (booking, recipient) => {
  const subject = 'Upcoming Event Reminder - Tomorrow!';
  const eventDate = new Date(booking.eventDetails.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f39c12; margin: 0;">⏰ Event Reminder</h1>
          <p style="color: #e67e22; font-size: 18px; font-weight: bold;">Your event is tomorrow!</p>
        </div>
        
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 5px solid #f39c12;">
          <h2 style="color: #2c3e50; margin-top: 0;">Event Details</h2>
          <p style="color: #2c3e50; font-size: 16px; line-height: 1.6;">
            <strong>Event:</strong> ${booking.eventDetails.title}<br>
            <strong>Date:</strong> ${eventDate}<br>
            <strong>Time:</strong> ${booking.eventDetails.startTime} - ${booking.eventDetails.endTime}<br>
            <strong>Location:</strong> ${booking.eventDetails.location.venue}<br>
            <strong>Address:</strong> ${booking.eventDetails.location.address}
          </p>
        </div>

        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #27ae60; margin-top: 0;">Preparation Tips</h3>
          <ul style="color: #2c3e50; line-height: 1.6;">
            <li>Confirm the exact meeting point with your photographer/videographer</li>
            <li>Prepare any specific shots or moments you want captured</li>
            <li>Ensure good lighting conditions if possible</li>
            <li>Have contact information readily available</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
          <p style="color: #7f8c8d;">We look forward to capturing your special moments!</p>
          <p style="color: #2c3e50; margin: 0;">
            Best regards,<br>
            <strong>Photography Booking Team</strong>
          </p>
        </div>
      </div>
    </div>
  `;

  return await sendEmail({
    to: recipient.email,
    subject,
    html
  });
};

// Password reset email
export const sendPasswordResetEmail = async (user, resetToken) => {
  const subject = 'Password Reset Request';
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #e74c3c; margin: 0;">🔐 Password Reset</h1>
        </div>
        
        <p style="color: #2c3e50; font-size: 16px; line-height: 1.6;">
          Hello ${user.name},
        </p>
        
        <p style="color: #2c3e50; font-size: 16px; line-height: 1.6;">
          You requested a password reset for your account. Click the button below to reset your password:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="display: inline-block; background-color: #e74c3c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;">
            <strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.
          </p>
        </div>
        
        <p style="color: #7f8c8d; font-size: 14px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${resetUrl}" style="color: #3498db;">${resetUrl}</a>
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: user.email,
    subject,
    html
  });
};

// Profile approval notification
export const sendProfileApprovalEmail = async (user, approved, reason = '') => {
  const subject = `Profile ${approved ? 'Approved' : 'Rejected'} - Action Required`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: ${approved ? '#27ae60' : '#e74c3c'}; margin: 0;">
            ${approved ? '✅ Profile Approved!' : '❌ Profile Rejected'}
          </h1>
        </div>
        
        <p style="color: #2c3e50; font-size: 16px; line-height: 1.6;">
          Hello ${user.name},
        </p>
        
        <div style="background-color: ${approved ? '#d4edda' : '#f8d7da'}; border: 1px solid ${approved ? '#c3e6cb' : '#f5c6cb'}; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p style="color: ${approved ? '#155724' : '#721c24'}; font-size: 16px; line-height: 1.6; margin: 0;">
            Your ${user.role} profile has been <strong>${approved ? 'approved' : 'rejected'}</strong>.
            ${reason ? `<br><br><strong>Reason:</strong> ${reason}` : ''}
          </p>
        </div>
        
        ${approved ? `
          <div style="background-color: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #27ae60; margin-top: 0;">What's Next?</h3>
            <ul style="color: #2c3e50; line-height: 1.6;">
              <li>You can now start receiving booking requests</li>
              <li>Your profile is visible to potential clients</li>
              <li>Complete your availability calendar</li>
              <li>Add more portfolio samples to attract clients</li>
            </ul>
          </div>
        ` : `
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #856404; margin-top: 0;">Next Steps</h3>
            <ul style="color: #2c3e50; line-height: 1.6;">
              <li>Review and update your profile information</li>
              <li>Add more portfolio samples</li>
              <li>Ensure all required fields are completed</li>
              <li>Resubmit for approval when ready</li>
            </ul>
          </div>
        `}
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
          <p style="color: #7f8c8d;">
            Questions? Contact us at support@photographybooking.com
          </p>
        </div>
      </div>
    </div>
  `;

  return await sendEmail({
    to: user.email,
    subject,
    html
  });
};

// Bulk notification email
export const sendBulkNotificationEmail = async (user, subject, message) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3498db; margin: 0;">📢 ${subject}</h1>
        </div>
        
        <p style="color: #2c3e50; font-size: 16px; line-height: 1.6;">
          Hello ${user.name},
        </p>
        
        <div style="color: #2c3e50; font-size: 16px; line-height: 1.6; margin: 20px 0;">
          ${message}
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
          <p style="color: #2c3e50; margin: 0;">
            Best regards,<br>
            <strong>Photography Booking Team</strong>
          </p>
        </div>
      </div>
    </div>
  `;

  return await sendEmail({
    to: user.email,
    subject,
    html
  });
};

export default {
  sendEmail,
  sendWelcomeEmail,
  sendBookingConfirmationEmail,
  sendBookingReminderEmail,
  sendPasswordResetEmail,
  sendProfileApprovalEmail,
  sendBulkNotificationEmail
};
