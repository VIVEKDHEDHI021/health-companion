importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyChFMJEzPJeCr8EeZYsqgNLA5B3QoXXzI",
  authDomain: "glucolab-1ad86.firebaseapp.com",
  projectId: "glucolab-1ad86",
  storageBucket: "glucolab-1ad86.firebasestorage.app",
  messagingSenderId: "345207046556",
  appId: "1:345207046556:web:c6eb5e5754fc907e38c859",
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message ", payload);

  const notificationTitle = payload.notification?.title || "New Message";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/logo.png",
    data: JSON.stringify(payload.data),
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
