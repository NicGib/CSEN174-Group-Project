# TrailMix Development Troubleshooting Guide

## Current Issues Summary

1. ✅ App works on localhost in browser
2. ❌ Can't connect phone to app (no internet connection)
3. ❌ Maps shows "React Native WebView does not support this platform"
4. ❌ Events shows "Network Error: Failed to fetch"
5. ❌ Discover matching tab is blank
6. ❌ `npx expo tunnel` fails with ngrok timeout

---

## Solutions

### 1. Connecting Phone to App (Without Internet)

**Option A: Use LAN Mode (Recommended if on same WiFi)**
```bash
# Make sure phone and computer are on the same WiFi network
npx expo start --lan -c
```
- Scan the QR code with Expo Go app
- The app will connect via your local network
- **Note**: Your backend API must also be accessible. If backend is on `localhost:8000`, you need to:
  - Find your computer's local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
  - Update API URL to use your local IP instead of localhost
  - Example: `http://192.168.1.100:8000/api/v1`

**Option B: Use Cloudflared Tunnel (Recommended for remote access)**
The project already has cloudflared setup! Instead of `npx expo tunnel`, use:
```bash
# From project root
./start-tunnel.sh
```
This will:
- Start the backend in Docker
- Create a cloudflared tunnel
- Configure Expo to use the tunnel URL
- Start Expo automatically

**Option C: Manual Cloudflared Setup**
If the script doesn't work, manually:
```bash
# Terminal 1: Start backend
cd backend
# (start your backend server)

# Terminal 2: Start cloudflared tunnel
cloudflared tunnel --url http://localhost:8000
# Copy the https://xxxx.trycloudflare.com URL

# Terminal 3: Start Expo with tunnel URL
cd trailmix
EXPO_PUBLIC_API_BASE_URL="https://xxxx.trycloudflare.com/api/v1" npx expo start --lan -c
```

---

### 2. Maps WebView Error (Expected Behavior)

**Issue**: "React Native WebView does not support this platform"

**Explanation**: This is **normal** when running on web. React Native WebView doesn't work in web browsers - it only works on iOS and Android devices.

**Solutions**:
- ✅ **Test on actual device**: The maps will work fine on your phone (iOS/Android)
- ✅ **Work on other features**: You can design/edit other screens that don't use maps
- ⚠️ **For web development**: You'd need to create a web-specific map component using Google Maps JavaScript API or similar

**What you can do**:
- Design the UI/UX for map screens
- Work on other tabs (Profile, Events list, Match cards, etc.)
- Test map functionality on your phone once connected

---

### 3. Network Errors (API Connection Issues)

**Issue**: "Network Error: Failed to fetch" for Events and Discover tab

**Root Cause**: The app is trying to connect to `http://localhost:8000/api/v1`, but:
- From phone: `localhost` refers to the phone itself, not your computer
- From web browser: Works because browser runs on same machine as backend

**Solutions**:

**A. Use LAN with Local IP** (Same WiFi network)
1. Find your computer's local IP address:
   ```bash
   # Windows
   ipconfig
   # Look for IPv4 Address (e.g., 192.168.1.100)
   
   # Mac/Linux
   ifconfig
   # Look for inet address
   ```

2. Set environment variable:
   ```bash
   # Windows PowerShell
   $env:EXPO_PUBLIC_API_BASE_URL="http://192.168.1.100:8000/api/v1"
   npx expo start --lan -c
   
   # Mac/Linux
   EXPO_PUBLIC_API_BASE_URL="http://192.168.1.100:8000/api/v1" npx expo start --lan -c
   ```

3. Make sure backend is accessible:
   - Backend should bind to `0.0.0.0:8000` (not just `localhost:8000`)
   - Check firewall allows connections on port 8000

**B. Use Cloudflared Tunnel** (Works from anywhere)
```bash
./start-tunnel.sh
# This automatically sets up everything
```

**C. Work Offline with Mock Data** (For frontend development)
See section 4 below.

---

### 4. Discover Tab Blank

**Issue**: Discover matching tab shows nothing

**Root Cause**: The `getPotentialMatches()` API call is failing due to network error.

**Quick Fix**: The app already has caching! If you've loaded matches before, they might be cached. But if the API call fails, it shows blank.

**Solutions**:
- Fix network connection (see section 3)
- Or add mock data for development (see below)

---

### 5. Working Without Backend (Frontend Development)

If you want to work on UI/UX without backend connectivity, you can add mock data:

**Option A: Add Mock Data Mode**

Create a file `trailmix/src/utils/mockData.ts`:
```typescript
export const MOCK_POTENTIAL_MATCHES = [
  {
    uid: 'mock1',
    name: 'Alex',
    username: 'alex_hiker',
    profilePicture: null,
    bio: 'Love hiking on weekends!',
    hikingLevel: 'intermediate',
    similarity: 0.85,
  },
  // Add more mock matches...
];

export const MOCK_EVENTS = [
  {
    event_id: 'mock1',
    title: 'Sunset Hike',
    location: 'Mountain Trail',
    event_date: '2024-12-25',
    description: 'Beautiful sunset hike',
    max_attendees: 10,
    difficulty_level: 'beginner',
    organizer_uid: 'org1',
    attendees: [],
  },
  // Add more mock events...
];
```

Then modify API calls to use mocks when offline (check the existing code - there might already be error handling you can extend).

**Option B: Use Browser for Development**
- Work on screens that don't require backend
- Test UI components in browser
- Use browser DevTools for styling
- Test on device later when network is fixed

---

## Recommended Workflow

### For Your Friend (Working from Home)

**Best Approach**: Use Cloudflared Tunnel
```bash
# 1. Make sure Docker is running
# 2. From project root:
./start-tunnel.sh
```

**If Cloudflared Fails**:
1. Work on frontend components that don't need backend:
   - Profile screen UI
   - Card designs for matching
   - Event list UI (with mock data)
   - Navigation and routing
   - Styling and theming

2. Test on device later when:
   - You're on same network, OR
   - Tunnel is working, OR
   - Backend is deployed

**Alternative**: Use Browser Development
- Most UI work can be done in browser
- Maps won't work (expected - use device for that)
- API calls will work if backend is on localhost
- Great for styling, layout, and component development

---

## Quick Reference Commands

```bash
# Start with LAN (same WiFi network)
npx expo start --lan -c

# Start with localhost only (browser only)
npx expo start --localhost -c

# Start with cloudflared tunnel (project script)
./start-tunnel.sh

# Manual cloudflared
cloudflared tunnel --url http://localhost:8000

# Set API URL manually
EXPO_PUBLIC_API_BASE_URL="http://YOUR_IP:8000/api/v1" npx expo start --lan -c
```

---

## What You CAN Work On Without Backend

✅ **UI/UX Design**:
- Profile screen layout and styling
- Match card designs
- Event list/card designs
- Navigation flows
- Color schemes and theming
- Typography and spacing

✅ **Component Development**:
- Reusable UI components
- Form inputs and validation UI
- Loading states and skeletons
- Error message displays
- Empty states

✅ **Browser Testing**:
- All screens except maps
- Navigation between screens
- Form interactions
- Styling and responsive design

❌ **What Needs Backend**:
- Loading real data (events, matches)
- User authentication flows
- API-dependent features
- Maps (needs device anyway)

---

## Next Steps

1. **Try cloudflared tunnel first** (`./start-tunnel.sh`)
2. **If that fails**, work on frontend UI components in browser
3. **For maps testing**, connect phone via LAN when on same network
4. **For API testing**, ensure backend is accessible (local IP or tunnel)

---

## Need Help?

- Check if backend is running: `curl http://localhost:8000/docs`
- Check your local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- Check Expo logs for connection errors
- Verify firewall isn't blocking port 8000

