const fs=require('fs'), path=require('path'), cp=require('child_process');
const root=path.resolve('.gstack/qa-reports/2026-09-08-three-episode-delivery/artifacts');
const payload=JSON.parse(fs.readFileSync(path.join(root,'create-series.json'),'utf8'));
const out=path.join(root,'delivery'); fs.mkdirSync(out,{recursive:true});
const ff='/opt/homebrew/bin/ffmpeg';
const realVideo=process.env.REAL_VIDEO ? path.resolve(process.env.REAL_VIDEO) : null;
function run(args){const r=cp.spawnSync(ff,args,{stdio:'pipe'}); if(r.status!==0) throw new Error(r.stderr.toString().slice(-2000));}
function tc(sec){const ms=Math.round((sec-Math.floor(sec))*1000); const s=Math.floor(sec)%60,m=Math.floor(sec/60)%60,h=Math.floor(sec/3600); return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms).padStart(3,'0')}`;}
function wrap(s,n=18){return (s||'（无对白，环境声）').replace(/[“”]/g,'').match(new RegExp(`.{1,${n}}`,'g'))?.join('\n')||'';}
let fullSrt=[], fullOffset=0, manifest={title:payload.title,format:'technical_animatic_with_one_real_ai_video',aspect_ratio:'9:16',episodes:[]};
for(const ep of payload.episodes){
 const edir=path.join(out,`ep${String(ep.episode_number).padStart(2,'0')}`);fs.mkdirSync(edir,{recursive:true});
 let srt=[], concat=[];
 ep.shots.forEach((shot,i)=>{
  const base=`shot_${String(i+1).padStart(2,'0')}`;
  const text=shot.dialogue||shot.action;
  const aiff=path.join(edir,`${base}.aiff`), audio=path.join(edir,`${base}.m4a`);
  if(shot.dialogue){
   const voice=shot.dialogue.startsWith('周明')?'Reed':'Tingting';
   const spoken=shot.dialogue.replace(/^[^：]+：/,'').replace(/[“”]/g,'');
   cp.execFileSync('/usr/bin/say',['-v',voice,'-r','210','-o',aiff,spoken]);
   run(['-y','-i',aiff,'-af','apad=pad_dur=6','-t','6','-c:a','aac','-b:a','128k',audio]);
  }else run(['-y','-f','lavfi','-i','anullsrc=r=44100:cl=stereo','-t','6','-c:a','aac','-b:a','128k',audio]);
  const clip=path.join(edir,`${base}.mp4`);
  const card=path.join(edir,`${base}.png`);
  if(ep.episode_number===1 && i===0 && realVideo){
   run(['-y','-i',realVideo,'-i',audio,'-filter:v','scale=720:-2,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=0x07101f,tpad=stop_mode=clone:stop_duration=1','-t','6','-r','24','-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p','-c:a','aac','-ar','44100','-movflags','+faststart',clip]);
  }else{
   run(['-y','-loop','1','-i',card,'-i',audio,'-t','6','-r','24','-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p','-c:a','aac','-ar','44100','-movflags','+faststart',clip]);
  }
  concat.push(`file '${clip.replaceAll("'","'\\''")}'`);
  const cue=shot.dialogue||shot.action;
  srt.push(`${i+1}\n${tc(i*6)} --> ${tc((i+1)*6-0.2)}\n${cue}\n`);
  fullSrt.push(`${fullSrt.length+1}\n${tc(fullOffset+i*6)} --> ${tc(fullOffset+(i+1)*6-0.2)}\n【${ep.title}】${cue}\n`);
 });
 fs.writeFileSync(path.join(edir,'subtitles.srt'),srt.join('\n'));
 fs.writeFileSync(path.join(edir,'concat.txt'),concat.join('\n'));
 const epOut=path.join(out,`EP${String(ep.episode_number).padStart(2,'0')}-${ep.title.replace(/^EP\d+\s*/, '')}.mp4`);
 run(['-y','-f','concat','-safe','0','-i',path.join(edir,'concat.txt'),'-c','copy','-movflags','+faststart',epOut]);
 const epSubtitled=epOut.replace(/\.mp4$/,'-带字幕.mp4');
 run(['-y','-i',epOut,'-i',path.join(edir,'subtitles.srt'),'-map','0:v','-map','0:a','-map','1:0','-c:v','copy','-c:a','copy','-c:s','mov_text','-metadata:s:s:0','language=chi','-movflags','+faststart',epSubtitled]);
 manifest.episodes.push({episode_number:ep.episode_number,title:ep.title,duration:48,file:path.basename(epSubtitled),subtitle:`ep${String(ep.episode_number).padStart(2,'0')}/subtitles.srt`});
 fullOffset+=48;
}
fs.writeFileSync(path.join(out,'subtitles-full.srt'),fullSrt.join('\n'));
const rawEpisodes=manifest.episodes.map(e=>`file '${path.join(out,e.file.replace('-带字幕','')).replaceAll("'","'\\''")}'`).join('\n');fs.writeFileSync(path.join(out,'concat-episodes.txt'),rawEpisodes);
const fullRaw=path.join(out,'第二把钥匙-三集完整样片.mp4');
const fullSubtitled=path.join(out,'第二把钥匙-三集完整样片-带字幕.mp4');
run(['-y','-f','concat','-safe','0','-i',path.join(out,'concat-episodes.txt'),'-c','copy','-movflags','+faststart',fullRaw]);
run(['-y','-i',fullRaw,'-i',path.join(out,'subtitles-full.srt'),'-map','0:v','-map','0:a','-map','1:0','-c:v','copy','-c:a','copy','-c:s','mov_text','-metadata:s:s:0','language=chi','-movflags','+faststart',fullSubtitled]);
manifest.total_duration=144;manifest.full_video=path.basename(fullSubtitled);manifest.full_subtitle='subtitles-full.srt';manifest.subtitle_mode='embedded_mov_text_and_external_srt';manifest.note=realVideo?'EP01 SHOT01 uses REAL_VIDEO; the other 23 shots are technical animatic cards.':'All 24 shots are technical animatic cards because REAL_VIDEO was not supplied.';
fs.writeFileSync(path.join(out,'delivery-manifest.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify(manifest,null,2));
