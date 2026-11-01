// Service worker tối thiểu để trình duyệt coi HaechiVN là ứng dụng cài được.
// Không lưu bộ nhớ đệm: mọi yêu cầu đều đi thẳng ra mạng nên không bao giờ hiện bản cũ.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request));
});
