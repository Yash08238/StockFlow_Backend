# StockFlow Backend 📦

A robust inventory management and ERP system backend built with Node.js, Express, and MongoDB. Features real-time stock tracking, sales management, automated bill generation, and intelligent forecasting.

## ✨ Features

### Core Functionality

- **Product Management** - CRUD operations with image upload to Cloudinary
- **Sales Management** - Create sales, auto-generate PDF bills, email receipts
- **Category System** - Organize products with customizable categories
- **Inventory Tracking** - Real-time stock updates and restock logging
- **User Management** - JWT authentication with Google OAuth integration

### Automation & Intelligence

- **Automated Bill Generation** - PDF creation with email delivery
- **Cron Jobs** - Scheduled tasks for:
  - Daily sales average calculation (2:00 AM)
  - Dead stock detection (2:30 AM)
  - Forecast warnings (3:00 AM)
  - Low stock alerts (3:30 AM)
  - Hourly bill retry for failed emails

### Notifications & Analytics

- **Smart Notifications** - Low stock, forecast warnings, dead stock alerts
- **Audit Logging** - Track all system changes
- **Reports** - Sales reports, inventory insights, performance metrics

## 🛠️ Tech Stack

- **Runtime:** Node.js (v18+)
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT, Passport.js (Google OAuth 2.0)
- **File Storage:** Cloudinary
- **Email Service:** Brevo API
- **PDF Generation:** PDFKit
- **Scheduling:** node-cron
- **Security:** bcryptjs for password hashing

## 📋 Prerequisites

- Node.js >= 18.x
- MongoDB (Atlas or local)
- Cloudinary account
- Brevo account (for emails)
- Google Cloud Console (for OAuth)

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/Yash08238/StockFlow_Backend.git
cd StockFlow_Backend/backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the `backend/` directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/stockflow

# Authentication
JWT_SECRET=your-secret-key-here

# Server
PORT=3000

# Email (Brevo)
BREVO_API_KEY=xkeysib-your-api-key-here
EMAIL_FROM=your-email@example.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000

# Environment
NODE_ENV=development
```

### 4. Run the server

**Development:**

```bash
npm run dev
```

**Production:**

```bash
npm start
```

Server will run on `http://localhost:3000`

## 📚 API Documentation

### Base URL

```
http://localhost:3000/api
```

### Authentication Endpoints

- `POST /api/user/register` - Register new user
- `POST /api/user/login` - Login user
- `GET /api/user/google` - Google OAuth login
- `GET /api/user/profile` - Get user profile (protected)

### Product Endpoints

- `GET /api/products/getproducts` - Get all products
- `POST /api/products/create` - Create product
- `PUT /api/products/update/:id` - Update product
- `DELETE /api/products/delete/:id` - Delete product

### Sales Endpoints

- `GET /api/sales` - Get all sales
- `POST /api/sales/create` - Create sale & generate bill
- `GET /api/sales/download/:id` - Download bill PDF

### Category Endpoints

- `GET /api/categories` - Get all categories
- `POST /api/categories/create` - Create category
- `PUT /api/categories/update/:id` - Update category
- `DELETE /api/categories/delete/:id` - Delete category

### Notification Endpoints

- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read

### Report Endpoints

- `GET /api/reports/sales` - Sales reports
- `GET /api/reports/inventory` - Inventory reports

## 🔐 Environment Setup Guide

### MongoDB Atlas

1. Create account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get connection string
4. Add to `MONGODB_URI`

### Cloudinary

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Get credentials from dashboard
3. Add to `.env`

### Brevo (Email)

1. Create account at [brevo.com](https://www.brevo.com)
2. Go to SMTP & API → Create API Key (Standard)
3. Add to `BREVO_API_KEY`

### Google OAuth

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project → Enable Google+ API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URI: `http://localhost:3000/api/user/google/callback`
5. Add credentials to `.env`

## 🚢 Deployment (Railway)

### 1. Configure Railway

- Set **Root Directory**: `backend`
- **Build Command**: Auto-detected
- **Start Command**: `npm start`

### 2. Environment Variables

Add all variables from `.env` to Railway dashboard:

- Use MongoDB Atlas connection string
- Update `BACKEND_URL` to Railway domain
- Update `FRONTEND_URL` to your deployed frontend
- Set `NODE_ENV=production`

### 3. Google OAuth Update

Add Railway URL to authorized redirect URIs:

```
https://your-app.up.railway.app/api/user/google/callback
```

## 📁 Project Structure

```
backend/
├── api/              # API route aggregator
├── config/           # Configuration files
├── controller/       # Business logic
├── db/               # Database connection
├── jobs/             # Cron jobs
├── middlewares/      # Custom middlewares
├── models/           # Mongoose schemas
├── routes/           # API routes
├── src/              # Core services (email, PDF)
├── utils/            # Utility functions
└── app.js            # Entry point
```

## 🔄 Cron Jobs Schedule

| Time    | Task        | Description                     |
| ------- | ----------- | ------------------------------- |
| Hourly  | Retry Bills | Retry failed email deliveries   |
| 2:00 AM | Sales Avg   | Recalculate daily sales average |
| 2:30 AM | Dead Stock  | Check for dead stock items      |
| 3:00 AM | Forecast    | Check forecast warnings         |
| 3:30 AM | Low Stock   | Check low stock alerts          |

## 🧪 Testing

```bash
# Health check
curl http://localhost:3000/health

# Test endpoint
curl http://localhost:3000/
```

## 🙏 Acknowledgments

- MongoDB for excellent database documentation
- Cloudinary for image hosting
- Brevo for reliable email delivery
- Railway for seamless deployment
