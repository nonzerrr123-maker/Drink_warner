self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "ถึงเวลาดื่มน้ำแล้ว 💧";
  const options = {
    body: data.body || "พักสักครู่แล้วเติมน้ำให้ร่างกายกัน",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "drink-warner-reminder",
    renotify: true,
    data: {
      url: data.url || "/",
    },
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);

      if (self.navigator && typeof self.navigator.setAppBadge === "function") {
        try {
          await self.navigator.setAppBadge(1);
        } catch {
          // Badging is optional.
        }
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      if (self.navigator && typeof self.navigator.clearAppBadge === "function") {
        try {
          await self.navigator.clearAppBadge();
        } catch {
          // Badging is optional.
        }
      }

      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(targetUrl);
          return;
        }
      }

      if (self.clients.openWindow) await self.clients.openWindow(targetUrl);
    })(),
  );
});
