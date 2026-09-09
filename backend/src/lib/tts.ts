export const DEFAULT_TTS_MODEL = "hexgrad/kokoro-82m";
export const DEFAULT_TTS_VOICES = {
  female: "zf_xiaoxiao",
  male: "zm_yunxi",
  narrator: "zf_xiaobei",
} as const;

export function spokenTextFromDialogue(text: string, speaker = "") {
  let spoken = (text || "").trim();
  if (!spoken) return "";
  const escapedSpeaker = speaker.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (escapedSpeaker) {
    spoken = spoken.replace(new RegExp(`^${escapedSpeaker}\\s*[：:]\\s*`), "");
  } else {
    spoken = spoken.replace(/^[^：“”]{1,20}[：:]\s*/, "");
  }
  return spoken.replace(/^[“\"]|[”\"]$/g, "").trim();
}

export function chooseTtsVoice(
  speaker: string,
  voiceDna: string,
  configured: { female?: string; male?: string; narrator?: string },
) {
  const name = (speaker || "").trim();
  const voice = (voiceDna || "").toLowerCase();
  if (/^(旁白|画外音|narrator|voice[- ]?over)$/i.test(name)) {
    return configured.narrator || DEFAULT_TTS_VOICES.narrator;
  }
  if (/(^|\W)(male|man|masculine|baritone|tenor)(\W|$)|男声|男中音|男低音|低沉|浑厚/.test(voice)) {
    return configured.male || DEFAULT_TTS_VOICES.male;
  }
  return configured.female || DEFAULT_TTS_VOICES.female;
}

export function buildOpenRouterTtsRequest(model: string, input: string, voice: string, speed: number) {
  return {
    model,
    input,
    voice,
    response_format: "mp3" as const,
    speed,
  };
}

export function dialogueIdFromTakeMetadata(metadata: string | null | undefined) {
  try {
    const parsed = JSON.parse(metadata || "{}");
    return typeof parsed.dialogue_id === "string" ? parsed.dialogue_id : "";
  } catch {
    return "";
  }
}
