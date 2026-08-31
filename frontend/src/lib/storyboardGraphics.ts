// Storyboard Visual Graphics Generator for Cinematic Preview Frames

export function generateStoryboardSvgUrl(shot: {
  order: number;
  shot_size: string;
  camera_angle: string;
  action: string;
  subject?: string;
  theme?: string;
}): string {
  const width = 640;
  const height = 360;
  const shotNo = String(shot.order).padStart(2, "0");
  const sizeUpper = shot.shot_size.replace(/_/g, " ").toUpperCase();
  const angleUpper = shot.camera_angle.replace(/_/g, " ").toUpperCase();

  // Color schemes based on scene mood (Matrix Neon Cyberpunk)
  let accentColor = "#10b981"; // Emerald green
  let glowColor = "rgba(16, 185, 129, 0.4)";
  let motifSvg = "";

  // Dynamic visual motifs tailored for the 12 scene beats
  if (shot.order === 1) {
    // Shot 1: Tea House Roof & Neon Rain (EWS)
    motifSvg = `
      <path d="M120 220 L320 140 L520 220" stroke="#059669" stroke-width="4" fill="none"/>
      <path d="M100 225 Q320 120 540 225" stroke="#34d399" stroke-width="3" fill="none"/>
      <rect x="220" y="220" width="200" height="90" fill="#0f172a" stroke="#10b981" stroke-width="2"/>
      <circle cx="250" cy="245" r="14" fill="#ef4444" opacity="0.8"/>
      <circle cx="390" cy="245" r="14" fill="#ef4444" opacity="0.8"/>
      <line x1="80" y1="40" x2="80" y2="160" stroke="#10b981" stroke-dasharray="8 12" opacity="0.6"/>
      <line x1="160" y1="20" x2="160" y2="180" stroke="#10b981" stroke-dasharray="6 14" opacity="0.4"/>
      <line x1="480" y1="30" x2="480" y2="170" stroke="#10b981" stroke-dasharray="10 10" opacity="0.5"/>
      <line x1="560" y1="50" x2="560" y2="200" stroke="#10b981" stroke-dasharray="7 12" opacity="0.4"/>
    `;
  } else if (shot.order === 2) {
    // Shot 2: Master walking in rain (WS)
    motifSvg = `
      <circle cx="280" cy="140" r="18" fill="#38bdf8"/>
      <path d="M280 158 L280 260 L240 310 M280 260 L310 310" stroke="#38bdf8" stroke-width="5" stroke-linecap="round"/>
      <path d="M250 180 L310 180 M280 180 L230 270 L330 270 Z" fill="#0284c7" opacity="0.6"/>
      <ellipse cx="280" cy="315" rx="50" ry="10" fill="none" stroke="#38bdf8" stroke-width="2" opacity="0.7"/>
      <ellipse cx="280" cy="315" rx="90" ry="18" fill="none" stroke="#0284c7" stroke-width="1.5" opacity="0.4"/>
    `;
    accentColor = "#38bdf8";
  } else if (shot.order === 3) {
    // Shot 3: Agent Fox emerging (MS)
    motifSvg = `
      <circle cx="360" cy="130" r="22" fill="#ef4444"/>
      <path d="M320 170 L400 170 L390 280 L330 280 Z" fill="#1e293b" stroke="#ef4444" stroke-width="2"/>
      <path d="M400 200 L470 190" stroke="#38bdf8" stroke-width="6" stroke-linecap="round"/>
      <polygon points="465,185 490,190 465,195" fill="#38bdf8"/>
      <line x1="330" y1="125" x2="390" y2="125" stroke="#f43f5e" stroke-width="4"/>
    `;
    accentColor = "#ef4444";
  } else if (shot.order === 4) {
    // Shot 4: Wing Chun stance (MCU)
    motifSvg = `
      <circle cx="320" cy="120" r="26" fill="#10b981"/>
      <path d="M280 170 L360 170 L350 300 L290 300 Z" fill="#0f172a" stroke="#10b981" stroke-width="2"/>
      <path d="M300 180 L230 210 L250 160" stroke="#34d399" stroke-width="6" stroke-linecap="round" fill="none"/>
      <path d="M340 180 L410 200 L390 150" stroke="#34d399" stroke-width="6" stroke-linecap="round" fill="none"/>
      <circle cx="250" cy="160" r="6" fill="#34d399"/>
      <circle cx="390" cy="150" r="6" fill="#34d399"/>
    `;
    accentColor = "#34d399";
  } else if (shot.order === 5) {
    // Shot 5: Explosive Dash (FS)
    motifSvg = `
      <path d="M100 280 L480 180" stroke="#f59e0b" stroke-width="4" stroke-dasharray="16 8"/>
      <polygon points="480,180 430,160 450,210" fill="#f59e0b"/>
      <circle cx="440" cy="170" r="20" fill="#f59e0b"/>
      <line x1="200" y1="100" x2="350" y2="280" stroke="#fbbf24" stroke-width="3" opacity="0.8"/>
      <line x1="280" y1="80" x2="420" y2="250" stroke="#f59e0b" stroke-width="2" opacity="0.6"/>
    `;
    accentColor = "#f59e0b";
  } else if (shot.order === 6) {
    // Shot 6: Close-up parrying sparks (CU)
    motifSvg = `
      <circle cx="320" cy="180" r="35" fill="#f59e0b" opacity="0.2"/>
      <path d="M220 220 L310 180 M420 210 L330 180" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>
      <polygon points="320,150 330,175 355,180 330,185 320,210 310,185 285,180 310,175" fill="#fbbf24"/>
      <circle cx="350" cy="160" r="4" fill="#ef4444"/>
      <circle cx="290" cy="200" r="5" fill="#38bdf8"/>
    `;
    accentColor = "#fbbf24";
  } else if (shot.order === 7) {
    // Shot 7: Gun draw extreme close up (ECU)
    motifSvg = `
      <rect x="220" y="150" width="180" height="50" rx="6" fill="#1e293b" stroke="#ef4444" stroke-width="3"/>
      <circle cx="400" cy="175" r="22" fill="none" stroke="#38bdf8" stroke-width="4" stroke-dasharray="6 4"/>
      <circle cx="400" cy="175" r="10" fill="#38bdf8"/>
      <line x1="420" y1="175" x2="560" y2="175" stroke="#38bdf8" stroke-width="6" stroke-linecap="round"/>
    `;
    accentColor = "#ef4444";
  } else if (shot.order === 8) {
    // Shot 8: Bullet Time Orbit Dodge (MS)
    motifSvg = `
      <ellipse cx="320" cy="180" rx="200" ry="70" fill="none" stroke="#10b981" stroke-width="3" stroke-dasharray="12 8" transform="rotate(-15 320 180)"/>
      <path d="M220 220 Q320 290 420 220" stroke="#38bdf8" stroke-width="8" stroke-linecap="round" fill="none"/>
      <circle cx="320" cy="240" r="20" fill="#38bdf8"/>
      <line x1="100" y1="180" x2="540" y2="180" stroke="#f59e0b" stroke-width="5" stroke-linecap="round"/>
      <polygon points="530,170 560,180 530,190" fill="#f59e0b"/>
      <text x="320" y="130" fill="#10b981" font-family="monospace" font-weight="bold" font-size="16" text-anchor="middle">★ BULLET TIME 360° ORBIT ★</text>
    `;
    accentColor = "#10b981";
  } else if (shot.order === 9) {
    // Shot 9: Sunglasses Reflection (MCU)
    motifSvg = `
      <rect x="220" y="130" width="80" height="45" rx="8" fill="#0f172a" stroke="#38bdf8" stroke-width="3"/>
      <rect x="340" y="130" width="80" height="45" rx="8" fill="#0f172a" stroke="#38bdf8" stroke-width="3"/>
      <line x1="300" y1="145" x2="340" y2="145" stroke="#38bdf8" stroke-width="3"/>
      <circle cx="260" cy="152" r="14" fill="#ef4444" opacity="0.8"/>
      <circle cx="380" cy="152" r="14" fill="#ef4444" opacity="0.8"/>
      <path d="M320 280 L320 200" stroke="#34d399" stroke-width="5" marker-end="url(#arrow)"/>
    `;
    accentColor = "#38bdf8";
  } else if (shot.order === 10) {
    // Shot 10: Flying Kick (FS)
    motifSvg = `
      <path d="M180 140 L380 200" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>
      <circle cx="170" cy="130" r="18" fill="#38bdf8"/>
      <circle cx="420" cy="210" r="28" fill="none" stroke="#ef4444" stroke-width="4"/>
      <circle cx="420" cy="210" r="50" fill="none" stroke="#f59e0b" stroke-width="3" opacity="0.6"/>
      <line x1="390" y1="210" x2="490" y2="210" stroke="#ef4444" stroke-width="6" stroke-linecap="round"/>
    `;
    accentColor = "#38bdf8";
  } else if (shot.order === 11) {
    // Shot 11: Shattering Wooden Screen (WS)
    motifSvg = `
      <rect x="180" y="90" width="280" height="180" fill="none" stroke="#d97706" stroke-width="4"/>
      <line x1="220" y1="120" x2="310" y2="240" stroke="#fbbf24" stroke-width="4"/>
      <line x1="340" y1="100" x2="420" y2="220" stroke="#fbbf24" stroke-width="4"/>
      <polygon points="300,160 340,140 330,190" fill="#b45309"/>
      <polygon points="370,180 410,160 390,210" fill="#b45309"/>
      <circle cx="440" cy="260" r="20" fill="#ef4444"/>
    `;
    accentColor = "#f59e0b";
  } else {
    // Shot 12: Master Poised Outro (MS)
    motifSvg = `
      <circle cx="320" cy="120" r="20" fill="#10b981"/>
      <path d="M320 140 L320 270 L280 320 M320 270 L360 320" stroke="#10b981" stroke-width="6" stroke-linecap="round"/>
      <path d="M290 170 L350 170 M320 170 L270 280 L370 280 Z" fill="#065f46" opacity="0.7"/>
      <line x1="80" y1="20" x2="80" y2="340" stroke="#10b981" stroke-dasharray="4 8" opacity="0.3"/>
      <line x1="560" y1="20" x2="560" y2="340" stroke="#10b981" stroke-dasharray="4 8" opacity="0.3"/>
    `;
    accentColor = "#10b981";
  }

  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0b0f19" />
          <stop offset="100%" stop-color="#1e1b4b" />
        </linearGradient>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" stroke-width="1" opacity="0.4"/>
        </pattern>
      </defs>

      <!-- Background Slate & Grid -->
      <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
      <rect width="${width}" height="${height}" fill="url(#grid)" />

      <!-- Rule of Thirds Guides -->
      <line x1="${width / 3}" y1="10" x2="${width / 3}" y2="${height - 10}" stroke="#334155" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>
      <line x1="${(2 * width) / 3}" y1="10" x2="${(2 * width) / 3}" y2="${height - 10}" stroke="#334155" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>
      <line x1="10" y1="${height / 3}" x2="${width - 10}" y2="${height / 3}" stroke="#334155" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>
      <line x1="10" y1="${(2 * height) / 3}" x2="${width - 10}" y2="${(2 * height) / 3}" stroke="#334155" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>

      <!-- Safe Area Frame -->
      <rect x="12" y="12" width="${width - 24}" height="${height - 24}" rx="8" fill="none" stroke="${accentColor}" stroke-width="1.5" opacity="0.5" />

      <!-- Scene Motif Visuals -->
      ${motifSvg}

      <!-- Center Reticle Focal Mark -->
      <circle cx="${width / 2}" cy="${height / 2}" r="6" fill="none" stroke="${accentColor}" stroke-width="2" opacity="0.7"/>
      <line x1="${width / 2 - 14}" y1="${height / 2}" x2="${width / 2 + 14}" y2="${height / 2}" stroke="${accentColor}" stroke-width="1.5" opacity="0.7"/>
      <line x1="${width / 2}" y1="${height / 2 - 14}" x2="${width / 2}" y2="${height / 2 + 14}" stroke="${accentColor}" stroke-width="1.5" opacity="0.7"/>

      <!-- Header Banner Badge -->
      <rect x="24" y="24" width="220" height="28" rx="6" fill="#020617" fill-opacity="0.85" stroke="#334155" stroke-width="1" />
      <text x="36" y="43" fill="${accentColor}" font-family="ui-monospace, monospace" font-weight="bold" font-size="13">
        SHOT #${shotNo} · ${sizeUpper}
      </text>
      <text x="180" y="43" fill="#94a3b8" font-family="ui-monospace, monospace" font-size="11">
        ${angleUpper.slice(0, 5)}
      </text>

      <!-- Bottom Subtitle Action Box -->
      <rect x="24" y="${height - 54}" width="${width - 48}" height="32" rx="6" fill="#020617" fill-opacity="0.9" stroke="#1e293b" stroke-width="1" />
      <text x="36" y="${height - 33}" fill="#f1f5f9" font-family="system-ui, sans-serif" font-size="11.5" font-weight="500">
        ${shot.action.slice(0, 48)}${shot.action.length > 48 ? "..." : ""}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent.trim())}`;
}
