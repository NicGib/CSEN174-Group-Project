import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import Constants from "expo-constants";

const config = (Constants.expoConfig?.extra as any)?.firebase;
if (!config) throw new Error("Missing extra.firebase in app.json");

const app = getApps().length ? getApps()[0] : initializeApp(config);
export const auth = getAuth(app);
