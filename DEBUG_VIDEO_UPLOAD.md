# Debugging Video Upload Issues

## What Was Fixed

The video upload process had a critical issue where:
1. **Course was saved to Firestore FIRST**
2. **Video upload happened AFTER** 
3. If upload failed, course was orphaned without video

### Changes Made:
- ✅ Added real-time progress feedback to the UI
- ✅ Added detailed error messages explaining what went wrong
- ✅ Added console logging for debugging
- ✅ Improved error handling in `uploadCourseAsset()` function
- ✅ Better validation before starting the upload process

## How to Test the Fix

### 1. Open Browser Developer Console
Press `F12` or `Ctrl+Shift+I` to open DevTools and go to the **Console** tab.

### 2. Try Creating a Course with Video
1. Go to Admin → Courses → Create New Course
2. Fill in course details
3. Add a video section with a small test video (~5MB)
4. Click "Create Course"
5. Watch the console and UI for progress messages

### Expected Messages (in order):
```
Creating course document...
Uploading media files...
Uploading video for section 1/1...
✓ Successfully uploaded video: https://firebasestorage.googleapis.com/...
Saving course content...
Course created successfully...
```

## Troubleshooting Guide

### ❌ Error: "Permission denied" / "Unauthorized"
**Cause:** Your admin user doesn't have write permission to Firebase Storage

**Fix:**
1. Go to Firebase Console → Storage → Rules
2. Verify rules allow your admin user to write:
   ```
   allow write: if request.auth != null && 
     firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'admin';
   ```
3. In Firestore → users collection, verify your user has `role: "admin"`
4. Try logging out and logging back in

### ❌ Error: "quota-exceeded"
**Cause:** Storage quota exceeded

**Fix:**
1. Check Firebase plan (Spark plan = 5GB free)
2. Go to Firebase Console → Storage → Files
3. Delete old test videos to free up space
4. Upgrade to Blaze plan if needed

### ❌ Error: "Upload failed: Unknown error"
**Cause:** Various network or file issues

**Fix:**
1. Check browser console (F12) for detailed error
2. Verify file is a valid video format (MP4, WebM, OGG, MOV)
3. Try with a smaller file (<100MB recommended)
4. Check internet connection

### ✅ Video Uploaded But Course Not in List
**Cause:** Course document wasn't created properly

**Fix:**
1. Check Firestore → courses collection
2. Verify course document exists with proper fields:
   - `title`, `slug`, `description`, `price`, `published`
3. Check courses/{courseId}/content subcollection has content items

### ⏱️ Process Hung/Stuck
**This is now fixed!** 

Previously, the upload dialog could hang indefinitely. Now you'll see progress messages. If it still hangs:

1. **Check the upload size:**
   - For Spark plan: max ~200MB per file
   - For Blaze plan: typically 5GB max
   
2. **Check the network:**
   - Large videos on slow connections might time out
   - Try uploading in a different network or with a smaller file

3. **Force refresh after fix:**
   - Hard refresh: `Ctrl+Shift+R` or `Cmd+Shift+R`
   - Clear browser cache if needed

## Checking Your Setup

### 1. Verify Admin User
In **Firestore Console**:
```
Collection: users
Document ID: [your-user-id]
Fields:
  - role: "admin" ✅ (should be exact string "admin")
  - email: "your@email.com"
  - displayName: "Your Name"
```

### 2. Verify Storage Rules
In **Firebase Console → Storage → Rules**:
```
match /courses/{courseId}/{asset} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && 
    firestore.exists(/databases/(default)/documents/users/$(request.auth.uid)) &&
    firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'admin';
  allow delete: if request.auth != null && 
    firestore.exists(/databases/(default)/documents/users/$(request.auth.uid)) &&
    firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

### 3. Check Firebase Config
In `src/lib/firebase.ts`:
- All environment variables should be set in `.env.local`:
  ```
  NEXT_PUBLIC_FIREBASE_API_KEY=...
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
  NEXT_PUBLIC_FIREBASE_APP_ID=...
  ```

## Console Commands for Testing

Once in the browser console, you can test manually:

```javascript
// Check current user
firebase.auth().currentUser

// Get user profile
db.collection('users').doc(firebase.auth().currentUser.uid).get()

// List courses
db.collection('courses').get()

// List storage files
```

## Files Modified
- `src/app/admin/courses/new/page.tsx` - Better error handling and progress feedback
- `src/app/admin/courses/[id]/edit/page.tsx` - Same improvements for editing
- `src/lib/course.ts` - Improved `uploadCourseAsset()` with detailed error messages

## Testing Checklist
- [ ] Admin user has `role: "admin"` in Firestore
- [ ] Storage rules are deployed correctly
- [ ] Tried creating course with small test video
- [ ] Checked browser console for error messages
- [ ] Verified course appears in admin course list
- [ ] Verified video URL is correct in Firestore
- [ ] Video is accessible from course page
