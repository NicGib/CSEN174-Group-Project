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
    //console.log(`Using alternative path: ${envPath}`);
  }
}

// Check if .env file exists and log the path for debugging
if (!fs.existsSync(envPath)) {
  //console.warn(`WARNING: .env file not found at: ${envPath}`);
  //console.warn(`   __dirname: ${__dirname}`);
  //console.warn(`   Current working directory: ${process.cwd()}`);
  //console.warn(`   Trying alternative: ${path.resolve(process.cwd(), 'secrets/.env')}`);
} else {
  //console.log(`Loading .env from: ${envPath}`);
  
  // Verify file is readable and has content
  try {
    const stats = fs.statSync(envPath);
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
    //console.log(`   File size: ${stats.size} bytes, ${lines.length} non-empty lines`);
  } catch (err) {
    console.warn(`Could not read file: ${err.message}`);
  }
}

// Load environment variables from the secrets folder
// Use dotenv.config() with override to ensure it loads properly
const result = dotenv.config({ path: envPath, override: false });

// Log if loading failed
if (result.error) {
  console.error(`Error loading .env file:`, result.error);
} else {
  //console.log(`dotenv loaded successfully`);
  if (result.parsed) {
    //console.log(`   Loaded ${Object.keys(result.parsed).length} variables`);
  }
}

// Configuration file paths for persistent API URL storage
const apiUrlConfigPaths = [
  path.resolve(__dirname, '../../secrets/api-url.txt'),  // Project root secrets
  path.resolve(__dirname, '../secrets/api-url.txt'),    // From trailmix directory
  path.resolve(__dirname, 'secrets/api-url.txt'),       // App directory secrets
  path.resolve(process.cwd(), 'secrets/api-url.txt')    // Current working directory
];

// Check for tunnel URL file (created by start-tunnel script or docker entrypoint)
// Try multiple locations: project root, app directory (for Docker)
const tunnelUrlPaths = [
  path.resolve(__dirname, '../../.tunnel-url'),  // Project root
  path.resolve(__dirname, '.tunnel-url'),        // App directory (Docker)
  path.resolve(process.cwd(), '.tunnel-url')     // Current working directory
];

// Function to read API URL from persistent config file
function readPersistedApiUrl() {
  for (const configPath of apiUrlConfigPaths) {
    if (fs.existsSync(configPath)) {
      try {
        const url = fs.readFileSync(configPath, 'utf8').trim();
        if (url) {
          return url;
        }
      } catch (err) {
        console.warn(`Could not read API URL config file: ${err.message}`);
      }
    }
  }
  return null;
}

// Function to write API URL to persistent config file
function writePersistedApiUrl(url) {
  // Use the first writable path (project root secrets directory)
  const writePath = apiUrlConfigPaths[0];
  try {
    // Ensure directory exists
    const dir = path.dirname(writePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(writePath, url, 'utf8');
    //console.log(`Persisted API URL to: ${writePath}`);
  } catch (err) {
    console.warn(`Could not write API URL config file: ${err.message}`);
  }
}

let tunnelUrl = null;
let tunnelUrlSource = null;
for (const tunnelUrlPath of tunnelUrlPaths) {
  if (fs.existsSync(tunnelUrlPath)) {
    try {
      const url = fs.readFileSync(tunnelUrlPath, 'utf8').trim();
      if (url) {
        tunnelUrl = url;
        tunnelUrlSource = tunnelUrlPath;
        console.log(`Found tunnel URL from: ${tunnelUrlPath}`);
        console.log(`  URL: ${tunnelUrl}`);
        break;
      }
    } catch (err) {
      console.warn(`Could not read tunnel URL file ${tunnelUrlPath}: ${err.message}`);
    }
  }
}

// Determine API base URL
// Priority: tunnel URL > EXPO_PUBLIC_API_BASE_URL env var > persisted config file > default localhost
let apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
if (tunnelUrl) {
  // Always use tunnel URL if available (cloudflared)
  apiBaseUrl = `${tunnelUrl}/api/v1`;
  console.log(`Using cloudflared tunnel API URL: ${apiBaseUrl}`);
  console.log(`  Source: ${tunnelUrlSource}`);
  // Persist the tunnel URL for future use
  writePersistedApiUrl(apiBaseUrl);
} else if (apiBaseUrl) {
  console.log(`Using API URL from environment: ${apiBaseUrl}`);
  // Persist the environment variable for future use
  writePersistedApiUrl(apiBaseUrl);
} else {
  // Try to read from persisted config file
  const persistedUrl = readPersistedApiUrl();
  if (persistedUrl) {
    apiBaseUrl = persistedUrl;
    console.log(`Using persisted API URL: ${apiBaseUrl}`);
    console.warn(`  WARNING: Using cached API URL. If tunnel URL changed, delete secrets/api-url.txt and restart.`);
  } else {
    apiBaseUrl = "http://localhost:8000/api/v1";
    console.warn(`Using default localhost API URL: ${apiBaseUrl}`);
    console.warn(`   (No tunnel URL or persisted config found - make sure cloudflared is running or set EXPO_PUBLIC_API_BASE_URL)`);
  }
}

// Debug: Log all Firebase-related env vars
/*console.log('\nEnvironment Variables Check:');
const firebaseVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];*/

/*firebaseVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`   ${varName}: ${value.substring(0, 15)}...`);
  } else {
    console.log(`   ${varName}: NOT FOUND`);
  }
});*/
/*console.log('');*/

// Build Firebase config object with explicit value assignment
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY?.trim() || undefined,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN?.trim() || undefined,
  projectId: process.env.FIREBASE_PROJECT_ID?.trim() || undefined,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET?.trim() || undefined,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID?.trim() || undefined,
  appId: process.env.FIREBASE_APP_ID?.trim() || undefined
};

// Log the config values being set (without exposing full API key)
/*console.log('\nBuilding Firebase Config Object:');
console.log(`   apiKey: ${firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 15)}...` : 'UNDEFINED'}`);
console.log(`   authDomain: ${firebaseConfig.authDomain || 'UNDEFINED'}`);
console.log(`   projectId: ${firebaseConfig.projectId || 'UNDEFINED'}`);
console.log(`   storageBucket: ${firebaseConfig.storageBucket || 'UNDEFINED'}`);
console.log(`   messagingSenderId: ${firebaseConfig.messagingSenderId || 'UNDEFINED'}`);
console.log(`   appId: ${firebaseConfig.appId || 'UNDEFINED'}`);
console.log('');*/

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
      supportsTablet: true,
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "This app uses your location to show nearby hiking trails and provide navigation features.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "This app uses your location to track your hiking activities and provide navigation features.",
        NSLocationAlwaysUsageDescription: "This app uses your location to track your hiking activities and provide navigation features.",
      }
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION"
      ]
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "This app uses your location to track your hiking activities and provide navigation features.",
          locationAlwaysPermission: "This app uses your location to track your hiking activities and provide navigation features.",
          locationWhenInUsePermission: "This app uses your location to show nearby hiking trails and provide navigation features.",
        }
      ],
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
      firebase: firebaseConfig,
      apiBaseUrl: apiBaseUrl,
      // Geocoding provider configuration
      // Options: 'nominatim' (free, default), 'geoapify', 'placekit'
      geocodingProvider: process.env.EXPO_PUBLIC_GEOCODING_PROVIDER || 'nominatim',
      geoapifyApiKey: process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY || undefined,
      placekitApiKey: process.env.EXPO_PUBLIC_PLACEKIT_API_KEY || undefined,
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || undefined,
    }
  }
};

// Validate Firebase config before exporting
const exportedConfig = module.exports.expo.extra.firebase;
const missingKeys = Object.entries(exportedConfig)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

/*if (missingKeys.length > 0) {
  console.error(`Missing Firebase environment variables: ${missingKeys.join(', ')}`);
  console.error(`   Make sure the .env file exists at: ${envPath}`);
  console.error(`   Required variables: FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET, FIREBASE_MESSAGING_SENDER_ID, FIREBASE_APP_ID`);
} else {
  console.log(`Firebase config validation passed - all required fields present`);
}*/
