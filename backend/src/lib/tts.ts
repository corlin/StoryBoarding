export const DEFAULT_TTS_MODEL = "hexgrad/kokoro-82m";
export const DEFAULT_TTS_VOICES = {
  female: "af_heart",
  male: "am_adam",
  narrator: "bf_emma",
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

  // 1. 旁白/画外音 → 旁白音色
  if (/^(旁白|画外音|narrator|voice[- ]?over)$/i.test(name)) {
    return configured.narrator || DEFAULT_TTS_VOICES.narrator;
  }

  // 2. voiceDna 中明确指定了性别特征 → 优先使用
  if (/(^|\W)(male|man|masculine|baritone|tenor|bass)(\W|$)|男声|男中音|男低音|低沉|浑厚|磁性男声/.test(voice)) {
    return configured.male || DEFAULT_TTS_VOICES.male;
  }
  if (/(^|\W)(female|woman|feminine|soprano|alto|mezzo)(\W|$)|女声|女高音|女低音|甜美|温柔女声/.test(voice)) {
    return configured.female || DEFAULT_TTS_VOICES.female;
  }

  // 3. 角色名性别识别（中文常见称谓/名字特征）作为 fallback
  const maleNamePattern = /(先生|哥|叔|爷|伯|舅|父|子|郎|翁|叟|公子|大侠|师傅|师父|道长|法师|将军|大人|员外|掌柜|老板|先生|男士|男孩|男生)/;
  const femaleNamePattern = /(小姐|姐|娘|婆|婶|母|女|妃|姬|姑|姨|嫂|太太|夫人|女士|女孩|女生|公主|娘娘|仙子|仙女|女侠)/;

  if (maleNamePattern.test(name) && !femaleNamePattern.test(name)) {
    return configured.male || DEFAULT_TTS_VOICES.male;
  }
  if (femaleNamePattern.test(name) && !maleNamePattern.test(name)) {
    return configured.female || DEFAULT_TTS_VOICES.female;
  }

  // 4. 默认使用女声（保持向后兼容）
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
