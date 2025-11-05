// Load environment variables for Expo
const { config } = require('dotenv');
const path = require('path');
const fs = require('fs');

// Resolve the .env file path (cross-platform compatible)
const envPath = path.resolve(__dirname, '../secrets/.env');

// Check if .env file exists and log the path for debugging
if (!fs.existsSync(envPath)) {
  console.warn(`⚠️  WARNING: .env file not found at: ${envPath}`);
  console.warn(`   __dirname: ${__dirname}`);
  console.warn(`   Current working directory: ${process.cwd()}`);
} else {
  console.log(`✅ Loading .env from: ${envPath}`);
}

// Load environment variables from the secrets folder
const result = config({ path: envPath });

// Log if loading failed
if (result.error) {
  console.error(`❌ Error loading .env file:`, result.error);
} else {
  // Verify Firebase config is loaded
  const firebaseApiKey = process.env.FIREBASE_API_KEY;
  if (!firebaseApiKey) {
    console.warn(`⚠️  WARNING: FIREBASE_API_KEY not found in environment variables`);
  } else {
    console.log(`✅ Firebase API Key loaded: ${firebaseApiKey.substring(0, 10)}...`);
  }
}

module.exports = {
  expo: {
    name: "trailmix",
    slug: "trailmix",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "trailmix",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000"
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    extra: {
      firebase: {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID
      }
    }
  }
};

// Validate Firebase config before exporting
const firebaseConfig = module.exports.expo.extra.firebase;
const missingKeys = Object.entries(firebaseConfig)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  console.error(`❌ Missing Firebase environment variables: ${missingKeys.join(', ')}`);
  console.error(`   Make sure the .env file exists at: ${envPath}`);
  console.error(`   Required variables: FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET, FIREBASE_MESSAGING_SENDER_ID, FIREBASE_APP_ID`);
}
