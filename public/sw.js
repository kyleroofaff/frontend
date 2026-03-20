self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const type = String(payload?.type || "").trim().toLowerCase();
  const defaultTitleByType = {
    message: "New message",
    order_shipped: "Order update",
    order_delivered: "Order delivered",
    order_paid: "Payment received",
    custom_request: "Custom request update",
    engagement: "Account activity",
    admin_ops: "Admin alert",
  };
  const title = String(payload?.title || defaultTitleByType[type] || "Notification");
  const body = String(payload?.body || "");
  const route = String(payload?.route || "/account");
  const lang = String(payload?.lang || "en");
  const icon = String(payload?.icon || "/favicon.svg");
  const badge = String(payload?.badge || "/favicon.svg");

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      lang,
      icon,
      badge,
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
