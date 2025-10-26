# TrailMix Backend Setup Guide

## 🔧 Environment Variables Setup

### 1. Create Backend .env File

Create a `.env` file in the `backend/` directory with the following content:

```env
# Firebase Configuration
FIREBASE_API_KEY=AIzaSyBOt1BYpqlPxYajlhHUqDRNqaFYvuFpfAA
FIREBASE_AUTH_DOMAIN=trailmix-1da3c.firebaseapp.com
FIREBASE_PROJECT_ID=trailmix-1da3c
FIREBASE_STORAGE_BUCKET=trailmix-1da3c.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=902468001555
FIREBASE_APP_ID=1:902468001555:web:6da6b6ba90812872ac44e6
```

### 2. Install Required Dependencies

```bash
cd backend
pip install firebase-admin requests python-dotenv
```

## 🔑 How to Get Service Account Key

### Step 1: Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `trailmix-1da3c`

### Step 2: Navigate to Project Settings
1. Click the gear icon (⚙️) in the top left
2. Select "Project settings"

### Step 3: Go to Service Accounts Tab
1. Click on the "Service accounts" tab
2. You should see "Firebase Admin SDK" section

### Step 4: Generate New Private Key
1. Click "Generate new private key"
2. A dialog will appear asking for confirmation
3. Click "Generate key"
4. A JSON file will be downloaded (usually named something like `trailmix-1da3c-firebase-adminsdk-xxxxx.json`)

### Step 5: Rename and Place the File
1. Rename the downloaded file to `serviceAccountKey.json`
2. Place it in the `backend/accounts/` directory
3. Your file structure should look like:
   ```
   backend/
   ├── accounts/
   │   ├── serviceAccountKey.json  ← Place it here
   │   ├── signups.py
   │   └── README.md
   ├── .env
   └── test_auth.py
   ```

## 🚀 Testing the Setup

### 1. Test Environment Variables
```bash
cd backend/accounts
python -c "from dotenv import load_dotenv; import os; load_dotenv(); print('API Key:', os.getenv('FIREBASE_API_KEY'))"
```

### 2. Test Service Account Key
```bash
cd backend/accounts
python -c "import firebase_admin; from firebase_admin import credentials; cred = credentials.Certificate('serviceAccountKey.json'); print('Service account key is valid!')"
```

### 3. Run the Authentication System
```bash
cd backend/accounts
python signups.py
```

### 4. Run the Test Suite
```bash
cd backend
python test_auth.py
```

## 🔒 Security Notes

### Important Security Considerations:
1. **Never commit `serviceAccountKey.json` to version control**
2. **Add `serviceAccountKey.json` to your `.gitignore`**
3. **Keep your `.env` files secure**
4. **The service account key gives full admin access to your Firebase project**

### Add to .gitignore:
```gitignore
# Firebase
serviceAccountKey.json
*.json
.env
```

## 🐛 Troubleshooting

### Common Issues:

1. **"Service account key file not found"**
   - Make sure `serviceAccountKey.json` is in `backend/accounts/`
   - Check the filename is exactly `serviceAccountKey.json`

2. **"FIREBASE_API_KEY not found"**
   - Make sure `.env` file exists in `backend/`
   - Check the `.env` file has the correct variable names

3. **"Permission denied" errors**
   - Make sure the service account has the right permissions
   - Check that Authentication and Firestore are enabled in Firebase Console

4. **"Project not found" errors**
   - Verify the project ID in your `.env` file matches your Firebase project
   - Check that the service account key is for the correct project

## 📋 Verification Checklist

- [ ] `.env` file created in `backend/` directory
- [ ] `serviceAccountKey.json` downloaded and placed in `backend/accounts/`
- [ ] Dependencies installed (`firebase-admin`, `requests`, `python-dotenv`)
- [ ] Firebase project has Authentication enabled
- [ ] Firebase project has Firestore enabled
- [ ] Service account has proper permissions
- [ ] Test script runs successfully

## 🎯 Next Steps

Once everything is set up:
1. Run the interactive test: `python signups.py`
2. Test user creation and login
3. Verify data appears in Firebase Console
4. Integrate with your Flask API (when ready)

## 📞 Need Help?

If you encounter issues:
1. Check the Firebase Console for any error messages
2. Verify all file paths are correct
3. Make sure all environment variables are set
4. Check that the service account key is valid and not expired
