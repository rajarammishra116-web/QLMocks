# ExamTrack - Production Grade Mock Test Platform

A scalable, secure, and feature-rich mock test application built with React, Vite, and Firebase. Designed to handle 1000+ concurrent students with anti-cheating measures and robust analytics.

## 🚀 Key Features

- **Robust Authentication**: Email verification, password reset, and role-based access (Student/Admin).
- **Secure Mock Tests**: 
  - Full-screen enforcement
  - Anti-cheating proctoring (tab switch detection, copy-paste prevention)
  - Auto-submission on time up
- **Scalable Architecture**: 
  - IndexedDB caching for 95% reduction in database reads
  - Optimized for Firebase Free Tier (Spark Plan)
- **Advanced Admin Dashboard**:
  - Creative test scheduling
  - Question bank management
  - Student performance analytics
- **Student Experience**:
  - Detailed result analysis (subject/topic/chapter wise)
  - Leaderboards (with privacy controls)
  - Mobile-responsive design

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend/DB**: Firebase Authentication, Cloud Firestore
- **State/Cache**: React Hooks + IndexedDB (idb)
- **Charts**: Chart.js

## 🧪 Demo Accounts

Since this is a fresh setup, you'll need to create these accounts in your Firebase project (or use the Sign Up page in the app).

| Role | Email | Password (Suggested) |
|------|-------|----------------------|
| **Admin** | `admin@examtrack.com` | `password123` |
| **Student (Class 10)** | `student10@examtrack.com` | `password123` |
| **Student (Class 12)** | `student12@examtrack.com` | `password123` |

> **Note**: After creating the Admin account, you must manually change its `role` to `admin` in your Firestore `users` collection to access the Dashboard.

## 🏁 Getting Started for Open Source

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/examtrack.git
cd examtrack
npm install
```

### 2. Firebase Configuration
This project relies on Firebase. You need to provide your own Firebase configuration keys.

1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Authentication** (Email/Password) and **Firestore Database**
3. Create a `.env.local` file in the root directory (copy from `.env.example`)
4. Fill in your Firebase config keys:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
...
```

### 3. Run Locally
```bash
npm run dev
```

## 🔒 Security & Privacy

- **Data Privacy**: All user data is secured with Firestore Security Rules.
- **Cheating Prevention**: The app monitors visibility changes and focus loss during exams.

## 📄 License

This project is open source. [Add your license here, e.g., MIT]
