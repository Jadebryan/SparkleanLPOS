# Laundry POS System

A comprehensive Point of Sale (POS) and Management System for laundry businesses, featuring both Admin and Staff applications.

## 🏗️ Project Structure

```
LaundryPos/
├── LaundryPos(ADMIN)/     # Admin web application (React + Vite)
├── LaundryPOS(STAFF)/     # Staff mobile application (React Native + Expo)
├── server/                # Backend API (Node.js + Express + MongoDB)
└── landing-page/          # Public landing page
```

## 🚀 Features

### Admin Application
- Dashboard with analytics and statistics
- Order management
- Customer management
- Employee management
- Service and discount management
- Expense tracking and approval
- Station/branch management
- Reports generation
- RBAC (Role-Based Access Control)
- Audit logging
- Backup and restore functionality

### Staff Application
- Order creation and management
- Customer management
- Expense requests
- Offline support with sync
- Real-time updates
- Receipt printing

## 🛠️ Tech Stack

### Frontend (Admin)
- React 18
- TypeScript
- Vite
- React Router
- React Query
- Recharts

### Mobile (Staff)
- React Native
- Expo
- TypeScript
- Expo Router
- AsyncStorage

### Backend
- Node.js
- Express
- MongoDB
- Mongoose
- JWT Authentication

## 📋 Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- npm or yarn

## 🔧 Installation

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd LaundryPos
```

### 2. Install dependencies

**Admin App:**
```bash
cd LaundryPos(ADMIN)
npm install
```

**Staff App:**
```bash
cd LaundryPOS(STAFF)
npm install
```

**Server:**
```bash
cd server
npm install
```

**Landing Page:**
```bash
cd landing-page
npm install
```

### 3. Environment Setup

**Server (.env):**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/laundrypos
JWT_SECRET=your-secret-key
NODE_ENV=development
```

**Admin App (.env):**
```env
VITE_API_URL=http://localhost:5000/api
```

**Staff App (.env):**
```env
EXPO_PUBLIC_API_URL=http://localhost:5000/api
```

## 🚀 Running the Applications

### Start the Server
```bash
cd server
npm start
```

### Start Admin App
```bash
cd LaundryPos(ADMIN)
npm run dev
```

### Start Staff App
```bash
cd LaundryPOS(STAFF)
npm start
```

## 📱 Development

### Admin App
- Development server: `http://localhost:5173`
- Uses Vite for fast HMR

### Staff App
- Expo development server
- Scan QR code with Expo Go app
- Or run on web: `npm run web`

## 🔐 Default Credentials

**Admin:**
- Email: `admin@example.com`
- Password: (set during first setup)

**Staff:**
- Create via Admin panel

## 📝 API Documentation

API endpoints are available at:
- Base URL: `http://localhost:5000/api`
- Authentication: JWT Bearer token

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software.

## 👥 Authors

- Salahag, Bryan Jade H.
- Pingcas, Jimmy A.

## 🙏 Acknowledgments

- Built with React, React Native, and Node.js
- Uses MongoDB for data storage
- Expo for mobile development

