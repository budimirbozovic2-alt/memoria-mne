function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speak(text: string) {
  if (!("speechSynthesis" in window)) return;

  // Stop any current speech
  window.speechSynthesis.cancel();

  const clean = stripHtml(text);
  if (!clean.trim()) return;

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = "sr-RS"; // Serbian
  utterance.rate = 0.95;
  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
}

export function isSpeaking(): boolean {
  return "speechSynthesis" in window && window.speechSynthesis.speaking;
}
