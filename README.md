# 📸 Lensora API Documentation

**A RESTful API for photography booking platform connecting photographers with clients**

## 🌟 Overview

The Lensora API provides comprehensive backend services for a photography booking platform. It handles user authentication, booking management, payment processing, and review systems for both clients and photographers.

**Base URL:** `http://localhost:5000/api`

---

## ✨ Key Features

### 🔐 **Authentication & Authorization**
- JWT-based secure authentication
- Role-based access control (User/Photographer)
- Password encryption and validation
- Token refresh and session management

### 👥 **User Management**
- User registration and login
- Profile management with image uploads
- Role-specific dashboards
- Account verification and recovery

### 📅 **Booking System**
- Create and manage bookings
- Real-time availability checking
- Booking status updates (Pending/Confirmed/Completed)
- Automated notifications

### 💳 **Payment Processing**
- Secure payment integration
- Transaction history tracking
- Invoice generation
- Refund management

### ⭐ **Review & Rating System**
- Client review submission
- Photographer rating calculation
- Review moderation
- Feedback analytics

### 📊 **Analytics & Reporting**
- Earnings tracking for photographers
- Booking statistics
- Performance metrics
- Revenue analytics with charts

---

## 🚀 Main API Endpoints

### **Authentication**
```
POST /auth/register          # Register new user
POST /auth/login             # User login
GET  /auth/me               # Get current user profile
POST /auth/logout           # Logout user
POST /auth/refresh          # Refresh JWT token
```

### **User Management**
```
GET  /users/profile         # Get user profile
PUT  /users/profile         # Update user profile
GET  /users/bookings        # Get user bookings
GET  /users/bookings-history # Get booking history
```

### **Photographer Services**
```
GET  /photographers         # Get all photographers
GET  /photographers/:id     # Get photographer details
PUT  /photographers/profile # Update photographer profile
GET  /photographers/earnings # Get earnings data
GET  /photographers/analytics # Get performance analytics
```

### **Booking Management**
```
POST /bookings              # Create new booking
GET  /bookings              # Get user bookings
GET  /bookings/:id          # Get booking details
PUT  /bookings/:id/status   # Update booking status
DELETE /bookings/:id        # Cancel booking
```

### **Reviews & Ratings**
```
POST /reviews               # Submit review
GET  /reviews/:photographerId # Get photographer reviews
PUT  /reviews/:id           # Update review
GET  /reviews/stats         # Get rating statistics
```

### **Payments**
```
POST /payments/process      # Process payment
GET  /payments/history      # Get payment history
POST /payments/refund       # Process refund
GET  /payments/analytics    # Get payment analytics
```

---

## 🛡️ Security Features

- **JWT Authentication** - Secure token-based authentication
- **Role-based Authorization** - Different access levels for users and photographers
- **Input Validation** - Comprehensive request validation
- **Rate Limiting** - API call limits to prevent abuse
- **Password Hashing** - Bcrypt encryption for passwords
- **CORS Protection** - Cross-origin request security

---

## 📊 Data Models

### **User Schema**
- Personal information (name, email, phone)
- Authentication credentials
- Role designation (user/photographer)
- Profile settings and preferences

### **Booking Schema**
- Event details (date, time, location)
- Service requirements
- Pricing and payment status
- Photographer assignment

### **Review Schema**
- Rating (1-5 stars)
- Written feedback
- User and photographer references
- Timestamp and verification

---

## 🔧 Technical Specifications

- **Framework:** Node.js with Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens)
- **File Storage:** Cloudinary for image uploads
- **Payment:** Stripe integration
- **Email:** NodeMailer for notifications

---

## 📞 Support

**Team:** CipherBytes  
**Email:** api-support@cipherbytes.com  
**Documentation:** Full API docs available on request

---

*Built with ❤️ by CipherBytes Team*
