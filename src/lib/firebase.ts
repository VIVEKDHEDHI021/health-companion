import { initializeApp, getApp, getApps } from "firebase/app";
import { getMessaging, type Messaging } from "firebase/messaging";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyChFMJEzPJeCr8EeZYsqgNLA5B3QoXXzIY",
  authDomain: "glucolab-1ad86.firebaseapp.com",
  projectId: "glucolab-1ad86",
  storageBucket: "glucolab-1ad86.firebasestorage.app",
  messagingSenderId: "345207046556",
  appId: "1:345207046556:web:c6eb5e5754fc907e38c859",
  measurementId: "G-BQ4DNDMHDS",
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Analytics is only initialized in the browser
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

// Messaging is only initialized in the browser
export const messaging =
  typeof window !== "undefined" ? getMessaging(app) : (null as unknown as Messaging);

export const vapidKey =
  "BJPDjHoQjwz5oUHediJuyaWTvkgr4AVFHCv6KeMWra1caVHs01QKfdbCZ4gJpp2BYqo_bla5E_K_QnkKqe-za90";
