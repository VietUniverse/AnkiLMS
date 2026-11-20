type YouTubeApi = { Player: new (element: string, options: Record<string, unknown>) => unknown };

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YouTubeApi> | null = null;

export function loadYouTubeIframeApi(): Promise<YouTubeApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("YouTube chỉ có thể tải trên trình duyệt."));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    let settled = false;
    let script: HTMLScriptElement | null = null;
    const timeout = window.setTimeout(() => finish(new Error("Hết thời gian tải YouTube Player.")), 15000);
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      if (error) {
        script?.remove();
        apiPromise = null;
        reject(error);
      } else if (window.YT?.Player) {
        resolve(window.YT);
      } else {
        apiPromise = null;
        reject(new Error("YouTube Player chưa sẵn sàng."));
      }
    };

    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      finish();
    };

    script = document.querySelector<HTMLScriptElement>('script[src*="youtube.com/iframe_api"]');
    const nonce = Array.from(document.scripts).find((candidate) => candidate.nonce)?.nonce;
    if (!script) {
      script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      if (nonce) script.nonce = nonce;
      script.addEventListener("error", () => finish(new Error("Không thể tải YouTube Player.")), { once: true });
      document.head.appendChild(script);
    } else if (!script.nonce && nonce) {
      // Cloudflare's nonce-based CSP must authorize dynamically injected scripts.
      script.nonce = nonce;
    }
  });

  return apiPromise;
}
