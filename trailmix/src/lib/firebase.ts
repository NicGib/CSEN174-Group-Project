import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import Constants from "expo-constants";

const config = (Constants.expoConfig?.extra as any)?.firebase;

// Enhanced validation with detailed error messages
if (!config) {
  console.error("❌ Firebase config is missing from Constants.expoConfig.extra");
  console.error("   Constants.expoConfig:", Constants.expoConfig);
  console.error("   Constants.expoConfig?.extra:", Constants.expoConfig?.extra);
  throw new Error("Missing extra.firebase in app.json");
}

// Validate that all required fields are present and non-empty
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingFields = requiredFields.filter(field => !config[field] || config[field].trim() === '');

if (missingFields.length > 0) {
  console.error("❌ Firebase config is missing required fields:", missingFields);
  console.error("   Current config:", {
    apiKey: config.apiKey ? `${config.apiKey.substring(0, 10)}...` : 'MISSING',
    authDomain: config.authDomain || 'MISSING',
    projectId: config.projectId || 'MISSING',
    storageBucket: config.storageBucket || 'MISSING',
    messagingSenderId: config.messagingSenderId || 'MISSING',
    appId: config.appId || 'MISSING'
  });
  throw new Error(`Missing Firebase config fields: ${missingFields.join(', ')}`);
}

// Log successful config (without sensitive data)
console.log("✅ Firebase config loaded successfully");
console.log("   Project ID:", config.projectId);
console.log("   Auth Domain:", config.authDomain);

const app = getApps().length ? getApps()[0] : initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);
