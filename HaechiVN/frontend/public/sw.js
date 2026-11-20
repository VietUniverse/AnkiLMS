// Service worker tối thiểu để trình duyệt coi HaechiVN là ứng dụng cài được.
// Không lưu bộ nhớ đệm: mọi yêu cầu đều đi thẳng ra mạng nên không bao giờ hiện bản cũ.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => new Response("Không có kết nối mạng", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })));
});
