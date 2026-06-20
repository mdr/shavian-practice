// Text-to-speech via the browser's built-in Web Speech API (no download).
// Used to pronounce the revealed word in reading practice.

export const canSpeak = () =>
  typeof window !== "undefined" && "speechSynthesis" in window;

export function speak(text: string) {
  if (!canSpeak()) return;
  // Cancel anything still speaking so rapid reveals don't queue up.
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  // The Read Lexicon follows RP, so prefer a British English voice when present.
  u.lang = "en-GB";
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}
