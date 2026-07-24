// Give the service worker access to Firebase Messaging.
// Note: We use Firebase v8 syntax in the service worker for maximum service worker environment compatibility.
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// Initialize the Firebase app in the service worker.
firebase.initializeApp({
  apiKey: "AIzaSyCKGjyP2HqDqGdwHOly64fUZD1VeNGECv4",
  authDomain: "rohingya-connect.firebaseapp.com",
  projectId: "rohingya-connect",
  storageBucket: "rohingya-connect.firebasestorage.app",
  messagingSenderId: "1026356851341",
  appId: "1:1026356851341:web:51abe07bc4876ec57228c4"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.data?.title || payload.notification?.title || 'RohingyaConnect Alert';
  
  // Custom sounds, vibration, and badge counts mapped from FCM data payload
  const notificationOptions = {
    body: payload.data?.body || payload.notification?.body || 'You have a new update.',
    icon: payload.data?.image || payload.notification?.image || '/icon.png',
    badge: '/icon.png',
    tag: payload.data?.announcementId || 'rohingyaconnect-notification',
    vibrate: payload.data?.vibration === 'true' ? [100, 50, 100] : undefined,
    data: {
      click_action: payload.data?.click_action || payload.notification?.click_action || '/notifications',
      announcementId: payload.data?.announcementId || null,
      recipientId: payload.data?.recipientId || null
    },
    actions: payload.data?.actionLabel ? [
      {
        action: 'explore',
        title: payload.data.actionLabel
      }
    ] : []
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click to support click analytics and redirection
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const clickAction = event.notification.data?.click_action || '/';
  const announcementId = event.notification.data?.announcementId;
  const recipientId = event.notification.data?.recipientId;

  // Attempt to open the deep link url and log the click
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Find open windows and focus, or open a new one
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        const clientPath = new URL(client.url).pathname;
        const actionPath = new URL(clickAction, self.location.origin).pathname;
        if (clientPath === actionPath && 'focus' in client) {
          // Send message to open client to track click if active
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            announcementId,
            recipientId
          });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        // Append query params to deep link for client-side auto click logging
        const urlToOpen = announcementId && recipientId 
          ? `${clickAction}?notif_click=true&ann_id=${announcementId}&rec_id=${recipientId}`
          : clickAction;
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
