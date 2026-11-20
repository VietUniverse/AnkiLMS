/** Speak Korean with a Korean voice supplied by the learner's browser/device. */
export function stopKoreanSpeech() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

export function speakKorean(text: string, rate = 0.82) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.trim());
  utterance.lang = "ko-KR";
  utterance.rate = rate;
  const voice = window.speechSynthesis.getVoices().find((item) => item.lang.toLowerCase().startsWith("ko"));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}
