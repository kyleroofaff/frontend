self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = String(payload?.title || "Notification");
  const body = String(payload?.body || "");
  const route = String(payload?.route || "/account");
  const lang = String(payload?.lang || "en");

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      lang,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: {
        route
      }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const route = String(event.notification?.data?.route || "/account");
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(route);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(route);
      }
      return undefined;
    })
  );
});
