let activeAudio: HTMLAudioElement | null = null;
let activeUrl: string | null = null;

export function stopNaverTts() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = "";
    activeAudio = null;
  }
  if (activeUrl) {
    URL.revokeObjectURL(activeUrl);
    activeUrl = null;
  }
}

export async function playNaverTts(text: string): Promise<void> {
  stopNaverTts();
  const response = await fetch("/api/tts/naver", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ text }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || "Không tải được giọng đọc Naver.");
  }
  const blob = await response.blob();
  activeUrl = URL.createObjectURL(blob);
  const audio = new Audio(activeUrl);
  activeAudio = audio;
  audio.onended = stopNaverTts;
  audio.onerror = stopNaverTts;
  await audio.play();
}
