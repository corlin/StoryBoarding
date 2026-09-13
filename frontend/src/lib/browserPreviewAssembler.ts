import type { PreviewAssemblyPlan } from "@/lib/productionKanban";
import { buildPreviewClipCommands, previewSubtitlesToSrt } from "@/lib/productionKanban";

export type PreviewAssemblyProgress = {
  phase: "loading" | "downloading" | "encoding" | "finalizing";
  percent: number;
  message: string;
};

const CORE_BASE_URL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

export async function assemblePreviewMp4(
  plan: PreviewAssemblyPlan,
  aspectRatio: string,
  onProgress?: (progress: PreviewAssemblyProgress) => void,
): Promise<Blob> {
  if (!plan.clips.length) throw new Error("没有可合成的镜头");
  const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([
    import("@ffmpeg/ffmpeg"),
    import("@ffmpeg/util"),
  ]);
  const ffmpeg = new FFmpeg();
  onProgress?.({ phase: "loading", percent: 2, message: "正在加载视频合成引擎（首次约 31MB）" });
  await ffmpeg.load({
    coreURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  try {
    const clipOutputs: string[] = [];
    for (let index = 0; index < plan.clips.length; index++) {
      const clip = plan.clips[index];
      const commands = buildPreviewClipCommands(clip, index, aspectRatio);
      const basePercent = 5 + Math.round((index / plan.clips.length) * 80);
      onProgress?.({ phase: "downloading", percent: basePercent, message: `正在读取镜头 ${index + 1}/${plan.clips.length}` });
      await ffmpeg.writeFile(commands.visualInput, await fetchFile(clip.visualUrl));
      for (let audioIndex = 0; audioIndex < clip.audioUrls.length; audioIndex++) {
        await ffmpeg.writeFile(`audio_${commands.key}_${audioIndex}.input`, await fetchFile(clip.audioUrls[audioIndex]));
      }

      onProgress?.({ phase: "encoding", percent: basePercent + 3, message: `正在统一镜头 ${index + 1}/${plan.clips.length} 的画幅与声音` });
      if (await ffmpeg.exec(commands.visual) !== 0) {
        throw new Error(clip.preserveSourceAudio
          ? `镜头 ${index + 1} 未检测到可用原生音轨，不能按原生音视频合并`
          : `镜头 ${index + 1} 画面编码失败`);
      }
      if (commands.audio.length && await ffmpeg.exec(commands.audio) !== 0) throw new Error(`镜头 ${index + 1} 配音编码失败`);
      if (await ffmpeg.exec(commands.mux) !== 0) throw new Error(`镜头 ${index + 1} 音画合并失败`);
      clipOutputs.push(commands.output);

      await ffmpeg.deleteFile(commands.visualInput).catch(() => {});
      await ffmpeg.deleteFile(commands.silentVideo).catch(() => {});
      if (commands.audio.length) await ffmpeg.deleteFile(commands.audioOutput).catch(() => {});
      for (let audioIndex = 0; audioIndex < clip.audioUrls.length; audioIndex++) {
        await ffmpeg.deleteFile(`audio_${commands.key}_${audioIndex}.input`).catch(() => {});
      }
    }

    onProgress?.({ phase: "finalizing", percent: 90, message: "正在拼接镜头并写入字幕" });
    const concatText = clipOutputs.map((name) => `file '${name}'`).join("\n");
    await ffmpeg.writeFile("concat.txt", new TextEncoder().encode(concatText));
    if (await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "concat.txt", "-c", "copy", "joined.mp4"]) !== 0) {
      throw new Error("镜头拼接失败");
    }

    const srt = previewSubtitlesToSrt(plan.subtitles);
    if (srt) {
      await ffmpeg.writeFile("subtitles.srt", new TextEncoder().encode(srt));
      if (await ffmpeg.exec(["-i", "joined.mp4", "-i", "subtitles.srt", "-map", "0", "-map", "1", "-c", "copy", "-c:s", "mov_text", "-metadata:s:s:0", "language=chi", "-movflags", "+faststart", "preview.mp4"]) !== 0) {
        throw new Error("字幕写入失败");
      }
    } else if (await ffmpeg.exec(["-i", "joined.mp4", "-c", "copy", "-movflags", "+faststart", "preview.mp4"]) !== 0) {
      throw new Error("预演片封装失败");
    }

    const output = await ffmpeg.readFile("preview.mp4");
    if (typeof output === "string") throw new Error("合成引擎返回了无效视频数据");
    onProgress?.({ phase: "finalizing", percent: 100, message: "预演片合成完成" });
    return new Blob([new Uint8Array(output)], { type: "video/mp4" });
  } finally {
    ffmpeg.terminate();
  }
}
