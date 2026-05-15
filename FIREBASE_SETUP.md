# Firebase Integration Guide

This project is integrated with Firebase for authentication, database, and storage services.

## Setup Instructions

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Enable Google Analytics if desired
4. Once created, go to Project Settings (gear icon)

### 2. Get Your Firebase Credentials

1. In Project Settings, scroll down to "Your apps"
2. Click the web icon (</>) to create a web app
3. Copy your Firebase config object
4. You'll see something like this:

```javascript
{
  apiKey: "AIzaSyDXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
  measurementId: "G-XXXXXXXXX"
}
```

### 3. Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Replace the placeholder values in `.env.local` with your Firebase credentials:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXX
   ```

### 4. Enable Authentication

1. In Firebase Console, go to **Build** → **Authentication**
2. Click "Get started"
3. Enable **Email/Password** sign-in method:
   - Click on Email/Password
   - Toggle "Enabled" on
   - Save

### 5. (Optional) Set up Firestore Database

1. In Firebase Console, go to **Build** → **Firestore Database**
2. Click "Create database"
3. Choose location and security rules
4. For development, you can use test mode (allows all reads/writes)
5. For production, set up proper security rules

### 6. (Optional) Set up Cloud Storage

1. In Firebase Console, go to **Build** → **Storage**
2. Click "Get started"
3. Set security rules for file uploads

## Environment Variables

All Firebase configuration values start with `NEXT_PUBLIC_` because they need to be accessible in the browser. **Never add secrets or API keys that should remain private without this prefix.**

- `.env.local` - Your actual credentials (ignored by git)
- `.env.local.example` - Template for other developers

## Using Firebase in Your Code

### Authentication

```typescript
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

// Sign up
await createUserWithEmailAndPassword(auth, email, password);

// Sign in
await signInWithEmailAndPassword(auth, email, password);
```

### Firestore Database

```typescript
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

// Add document
await addDoc(collection(db, "users"), { name: "John" });

// Get documents
const snapshot = await getDocs(collection(db, "users"));
```

### Cloud Storage

```typescript
import { storage } from "@/lib/firebase";
import { ref, uploadBytes } from "firebase/storage";

// Upload file
const storageRef = ref(storage, "files/myfile.txt");
await uploadBytes(storageRef, file);
```

## Security Rules

### Firestore Security Rules (Development)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Cloud Storage Rules (Development)
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Troubleshooting

1. **"Firebase: Auth (auth/operation-not-supported-in-this-environment)"**
   - This happens during SSR. Make sure Firebase operations are only in client components (`"use client"`)

2. **"Missing environment variables"**
   - Check that `.env.local` exists and contains all required variables
   - Restart the development server after changes

3. **Authentication not persisting**
   - Firebase Auth persists by default. Check browser localStorage is enabled

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firestore Database](https://firebase.google.com/docs/firestore)
- [Cloud Storage](https://firebase.google.com/docs/storage)
