// services/notificationService.js
import nodemailer from 'nodemailer';
import cron from 'cron';
import Booking from '../models/Booking.js';
import User from '../models/User.js';

// Email configuration
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendBookingConfirmation = async (booking) => {
  try {
    const client = await User.findById(booking.client);
    const provider = await User.findById(booking.provider);

    const clientMailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: client.email,
      subject: 'Booking Confirmation',
      html: `
        <h2>Booking Confirmed!</h2>
        <p>Hello ${client.name},</p>
        <p>Your booking has been confirmed for ${booking.eventDetails.date}.</p>
        <p><strong>Event:</strong> ${booking.eventDetails.title}</p>
        <p><strong>Provider:</strong> ${provider.name}</p>
        <p><strong>Total Amount:</strong> $${booking.pricing.totalAmount}</p>
        <p>We'll send you more details soon!</p>
      `
    };

    const providerMailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: provider.email,
      subject: 'New Booking Received',
      html: `
        <h2>New Booking!</h2>
        <p>Hello ${provider.name},</p>
        <p>You have a new booking for ${booking.eventDetails.date}.</p>
        <p><strong>Client:</strong> ${client.name}</p>
        <p><strong>Event:</strong> ${booking.eventDetails.title}</p>
        <p><strong>Total Amount:</strong> $${booking.pricing.totalAmount}</p>
        <p>Please log in to your dashboard to view details.</p>
      `
    };

    await Promise.all([
      transporter.sendMail(clientMailOptions),
      transporter.sendMail(providerMailOptions)
    ]);

    console.log('Booking confirmation emails sent');
  } catch (error) {
    console.error('Email sending error:', error);
  }
};

export const sendBookingReminder = async (booking) => {
  try {
    const client = await User.findById(booking.client);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: client.email,
      subject: 'Upcoming Event Reminder',
      html: `
        <h2>Event Reminder</h2>
        <p>Hello ${client.name},</p>
        <p>This is a reminder that your event is scheduled for tomorrow:</p>
        <p><strong>Event:</strong> ${booking.eventDetails.title}</p>
        <p><strong>Date:</strong> ${booking.eventDetails.date}</p>
        <p><strong>Time:</strong> ${booking.eventDetails.startTime}</p>
        <p><strong>Location:</strong> ${booking.eventDetails.location.address}</p>
        <p>We look forward to capturing your special moments!</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Booking reminder sent');
  } catch (error) {
    console.error('Reminder email error:', error);
  }
};

// Initialize scheduled tasks
export const initializeScheduledTasks = () => {
  // Daily reminder job - runs at 9 AM every day
  const reminderJob = new cron.CronJob('0 9 * * *', async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const endOfTomorrow = new Date(tomorrow);
      endOfTomorrow.setHours(23, 59, 59, 999);

      const upcomingBookings = await Booking.find({
        'eventDetails.date': {
          $gte: tomorrow,
          $lte: endOfTomorrow
        },
        status: 'confirmed'
      });

      for (const booking of upcomingBookings) {
        await sendBookingReminder(booking);
      }

      console.log(`Sent ${upcomingBookings.length} booking reminders`);
    } catch (error) {
      console.error('Reminder job error:', error);
    }
  });

  reminderJob.start();
  console.log('Scheduled tasks initialized');
};
