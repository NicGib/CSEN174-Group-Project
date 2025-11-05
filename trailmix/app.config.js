// Load environment variables for Expo
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Resolve the .env file path (cross-platform compatible)
// Try multiple possible paths to handle different execution contexts
let envPath = path.resolve(__dirname, '../secrets/.env');

// If not found, try from project root
if (!fs.existsSync(envPath)) {
  const altPath = path.resolve(process.cwd(), 'secrets/.env');
  if (fs.existsSync(altPath)) {
    envPath = altPath;
    console.log(`📁 Using alternative path: ${envPath}`);
  }
}

// Check if .env file exists and log the path for debugging
if (!fs.existsSync(envPath)) {
  console.warn(`⚠️  WARNING: .env file not found at: ${envPath}`);
  console.warn(`   __dirname: ${__dirname}`);
  console.warn(`   Current working directory: ${process.cwd()}`);
  console.warn(`   Trying alternative: ${path.resolve(process.cwd(), 'secrets/.env')}`);
} else {
  console.log(`✅ Loading .env from: ${envPath}`);
  
  // Verify file is readable and has content
  try {
    const stats = fs.statSync(envPath);
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
    console.log(`   File size: ${stats.size} bytes, ${lines.length} non-empty lines`);
  } catch (err) {
    console.warn(`   ⚠️  Could not read file: ${err.message}`);
  }
}

// Load environment variables from the secrets folder
// Use dotenv.config() with override to ensure it loads properly
const result = dotenv.config({ path: envPath, override: false });

// Log if loading failed
if (result.error) {
  console.error(`❌ Error loading .env file:`, result.error);
} else {
  console.log(`✅ dotenv loaded successfully`);
  if (result.parsed) {
    console.log(`   Loaded ${Object.keys(result.parsed).length} variables`);
  }
}

// Debug: Log all Firebase-related env vars
console.log('\n📋 Environment Variables Check:');
const firebaseVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

firebaseVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`   ✅ ${varName}: ${value.substring(0, 15)}...`);
  } else {
    console.log(`   ❌ ${varName}: NOT FOUND`);
  }
});
console.log('');

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
