# Script to generate rich, luxury jewelry and precious metal SVG thumbnail assets
import os

images = {
    "temple_necklace.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <radialGradient id="bgN" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#090d16"/>
    </radialGradient>
    <linearGradient id="goldN" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFBEB"/>
      <stop offset="25%" stop-color="#FCD34D"/>
      <stop offset="50%" stop-color="#D97706"/>
      <stop offset="75%" stop-color="#B45309"/>
      <stop offset="100%" stop-color="#78350F"/>
    </linearGradient>
    <filter id="glowN">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="120" height="120" rx="16" fill="url(#bgN)"/>
  <!-- Necklace Arc -->
  <path d="M 28 34 C 30 75, 90 75, 92 34" fill="none" stroke="url(#goldN)" stroke-width="5" stroke-linecap="round" filter="url(#glowN)"/>
  <path d="M 36 38 C 38 68, 82 68, 84 38" fill="none" stroke="url(#goldN)" stroke-width="2.5" stroke-dasharray="2,3"/>
  <!-- Ornate Hanging Drops -->
  <circle cx="60" cy="74" r="5.5" fill="url(#goldN)"/>
  <circle cx="60" cy="74" r="2" fill="#DC2626"/>
  <circle cx="48" cy="68" r="4" fill="url(#goldN)"/>
  <circle cx="72" cy="68" r="4" fill="url(#goldN)"/>
  <circle cx="38" cy="58" r="3.5" fill="url(#goldN)"/>
  <circle cx="82" cy="58" r="3.5" fill="url(#goldN)"/>
  <!-- Center Pendant -->
  <path d="M 60 78 L 66 88 L 60 96 L 54 88 Z" fill="url(#goldN)"/>
  <circle cx="60" cy="87" r="2.5" fill="#059669"/>
</svg>''',

    "solitaire_ring.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <radialGradient id="bgR" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#090d16"/>
    </radialGradient>
    <linearGradient id="platR" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="40%" stop-color="#E2E8F0"/>
      <stop offset="70%" stop-color="#94A3B8"/>
      <stop offset="100%" stop-color="#475569"/>
    </linearGradient>
    <linearGradient id="diaR" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="30%" stop-color="#E0F2FE"/>
      <stop offset="60%" stop-color="#7DD3FC"/>
      <stop offset="100%" stop-color="#0284C7"/>
    </linearGradient>
    <filter id="diaGlow">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="120" height="120" rx="16" fill="url(#bgR)"/>
  <!-- Ring Band -->
  <ellipse cx="60" cy="68" rx="28" ry="24" fill="none" stroke="url(#platR)" stroke-width="6"/>
  <ellipse cx="60" cy="68" rx="28" ry="24" fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-dasharray="20,80"/>
  <!-- Diamond Setting Prongs -->
  <path d="M 52 44 L 60 40 L 68 44" fill="none" stroke="url(#platR)" stroke-width="3"/>
  <!-- Brilliant Cut Diamond -->
  <polygon points="60,22 74,34 68,42 52,42 46,34" fill="url(#diaR)" filter="url(#diaGlow)"/>
  <polygon points="60,22 68,34 60,42 52,34" fill="#FFFFFF" opacity="0.8"/>
  <circle cx="56" cy="30" r="1.5" fill="#FFFFFF"/>
</svg>''',

    "kada_bangles.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <radialGradient id="bgK" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#090d16"/>
    </radialGradient>
    <linearGradient id="goldK" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFBEB"/>
      <stop offset="30%" stop-color="#FCD34D"/>
      <stop offset="60%" stop-color="#D97706"/>
      <stop offset="100%" stop-color="#78350F"/>
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="16" fill="url(#bgK)"/>
  <!-- Bangle 1 (Back) -->
  <ellipse cx="66" cy="54" rx="26" ry="18" fill="none" stroke="url(#goldK)" stroke-width="7" transform="rotate(-15 66 54)"/>
  <!-- Bangle 2 (Front) -->
  <ellipse cx="54" cy="66" rx="26" ry="18" fill="none" stroke="url(#goldK)" stroke-width="8" transform="rotate(-15 54 66)"/>
  <ellipse cx="54" cy="66" rx="26" ry="18" fill="none" stroke="#FFFBEB" stroke-width="1.5" stroke-dasharray="4,6" transform="rotate(-15 54 66)"/>
  <!-- Screws & Carved Texture -->
  <circle cx="34" cy="56" r="3" fill="#B45309"/>
  <circle cx="74" cy="76" r="3" fill="#B45309"/>
</svg>''',

    "gold_coins.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <radialGradient id="bgC" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#090d16"/>
    </radialGradient>
    <linearGradient id="goldC" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFBEB"/>
      <stop offset="25%" stop-color="#FCD34D"/>
      <stop offset="50%" stop-color="#F59E0B"/>
      <stop offset="80%" stop-color="#B45309"/>
      <stop offset="100%" stop-color="#78350F"/>
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="16" fill="url(#bgC)"/>
  <!-- Coin 1 (Left Back) -->
  <ellipse cx="48" cy="62" rx="22" ry="22" fill="url(#goldC)"/>
  <ellipse cx="48" cy="62" rx="18" ry="18" fill="none" stroke="#FFFBEB" stroke-width="1.5" stroke-dasharray="2,3"/>
  <text x="48" y="66" font-size="11" font-weight="bold" fill="#78350F" text-anchor="middle" font-family="sans-serif">999</text>
  <!-- Coin 2 (Right Front) -->
  <ellipse cx="72" cy="58" rx="24" ry="24" fill="url(#goldC)"/>
  <ellipse cx="72" cy="58" rx="20" ry="20" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-dasharray="3,3"/>
  <polygon points="72,44 76,52 84,54 78,60 80,68 72,64 64,68 66,60 60,54 68,52" fill="#78350F" opacity="0.6"/>
  <text x="72" y="62" font-size="9" font-weight="900" fill="#FFFBEB" text-anchor="middle" font-family="sans-serif">24K</text>
</svg>''',

    "rose_gold_chain.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <radialGradient id="bgCh" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#090d16"/>
    </radialGradient>
    <linearGradient id="roseG" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFE4E6"/>
      <stop offset="35%" stop-color="#FDA4AF"/>
      <stop offset="70%" stop-color="#E11D48"/>
      <stop offset="100%" stop-color="#881337"/>
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="16" fill="url(#bgCh)"/>
  <!-- Coiled Box Chain -->
  <circle cx="60" cy="60" r="32" fill="none" stroke="url(#roseG)" stroke-width="5" stroke-dasharray="5,4"/>
  <circle cx="60" cy="60" r="22" fill="none" stroke="url(#roseG)" stroke-width="4.5" stroke-dasharray="4,3"/>
  <circle cx="60" cy="60" r="12" fill="none" stroke="url(#roseG)" stroke-width="4" stroke-dasharray="3,2"/>
  <!-- Gold Clasp -->
  <rect x="56" y="24" width="8" height="6" rx="2" fill="#FDA4AF"/>
</svg>''',

    "diamond_earrings.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <radialGradient id="bgE" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#090d16"/>
    </radialGradient>
    <linearGradient id="diaE" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="40%" stop-color="#BAE6FD"/>
      <stop offset="80%" stop-color="#38BDF8"/>
      <stop offset="100%" stop-color="#0284C7"/>
    </linearGradient>
    <filter id="sparkleE">
      <feGaussianBlur stdDeviation="2.5" result="glow"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="120" height="120" rx="16" fill="url(#bgE)"/>
  <!-- Left Stud -->
  <circle cx="42" cy="60" r="15" fill="url(#diaE)" filter="url(#sparkleE)"/>
  <polygon points="42,47 51,55 48,68 36,68 33,55" fill="#FFFFFF" opacity="0.8"/>
  <circle cx="39" cy="54" r="2" fill="#FFFFFF"/>
  <!-- Right Stud -->
  <circle cx="78" cy="60" r="15" fill="url(#diaE)" filter="url(#sparkleE)"/>
  <polygon points="78,47 87,55 84,68 72,68 69,55" fill="#FFFFFF" opacity="0.8"/>
  <circle cx="75" cy="54" r="2" fill="#FFFFFF"/>
</svg>''',

    "silver_pooja.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <radialGradient id="bgS" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#090d16"/>
    </radialGradient>
    <linearGradient id="slvS" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="30%" stop-color="#E2E8F0"/>
      <stop offset="60%" stop-color="#94A3B8"/>
      <stop offset="100%" stop-color="#475569"/>
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="16" fill="url(#bgS)"/>
  <!-- Pooja Thali (Plate) -->
  <ellipse cx="60" cy="64" rx="36" ry="22" fill="url(#slvS)"/>
  <ellipse cx="60" cy="64" rx="30" ry="17" fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-dasharray="3,3"/>
  <!-- Diya (Lamp) in Center -->
  <ellipse cx="60" cy="60" rx="8" ry="5" fill="#F59E0B"/>
  <path d="M 60 55 C 62 48, 64 48, 60 42 C 56 48, 58 48, 60 55" fill="#EF4444"/>
  <path d="M 60 54 C 61 50, 62 50, 60 46 C 58 50, 59 50, 60 54" fill="#FCD34D"/>
  <!-- Incense Stand -->
  <circle cx="44" cy="62" r="4" fill="url(#slvS)"/>
  <circle cx="76" cy="62" r="4" fill="url(#slvS)"/>
</svg>''',

    "silver_bars.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <radialGradient id="bgSb" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#090d16"/>
    </radialGradient>
    <linearGradient id="slvBar" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="25%" stop-color="#F1F5F9"/>
      <stop offset="60%" stop-color="#94A3B8"/>
      <stop offset="100%" stop-color="#475569"/>
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="16" fill="url(#bgSb)"/>
  <!-- Silver Ingot 1 (Back) -->
  <polygon points="34,36 78,36 70,72 26,72" fill="url(#slvBar)" opacity="0.8"/>
  <!-- Silver Ingot 2 (Front) -->
  <polygon points="46,48 94,48 84,88 36,88" fill="url(#slvBar)"/>
  <polygon points="48,51 91,51 82,85 39,85" fill="none" stroke="#FFFFFF" stroke-width="1.2"/>
  <text x="64" y="65" font-size="8" font-weight="900" fill="#334155" text-anchor="middle" font-family="sans-serif">999 FINE</text>
  <text x="63" y="76" font-size="7" font-weight="bold" fill="#475569" text-anchor="middle" font-family="sans-serif">100g</text>
</svg>''',

    "platinum_band.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <radialGradient id="bgP" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#090d16"/>
    </radialGradient>
    <linearGradient id="platBand" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="35%" stop-color="#E2E8F0"/>
      <stop offset="70%" stop-color="#94A3B8"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="16" fill="url(#bgP)"/>
  <!-- Platinum Band -->
  <ellipse cx="60" cy="60" rx="30" ry="24" fill="none" stroke="url(#platBand)" stroke-width="10"/>
  <ellipse cx="60" cy="60" rx="30" ry="24" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-dasharray="10,60"/>
  <text x="60" y="63" font-size="7" font-weight="bold" fill="#94A3B8" text-anchor="middle" font-family="sans-serif">PT950</text>
</svg>''',

    "gold_bar_50g.svg": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <radialGradient id="bgGb" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#090d16"/>
    </radialGradient>
    <linearGradient id="goldBar" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFBEB"/>
      <stop offset="20%" stop-color="#FCD34D"/>
      <stop offset="50%" stop-color="#F59E0B"/>
      <stop offset="80%" stop-color="#B45309"/>
      <stop offset="100%" stop-color="#78350F"/>
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="16" fill="url(#bgGb)"/>
  <!-- Gold Cast Bar -->
  <polygon points="40,32 90,32 78,88 28,88" fill="url(#goldBar)"/>
  <polygon points="42,35 87,35 76,85 31,85" fill="none" stroke="#FFFBEB" stroke-width="1.5"/>
  <text x="59" y="52" font-size="9" font-weight="900" fill="#78350F" text-anchor="middle" font-family="sans-serif">MMTC-PAMP</text>
  <text x="58" y="64" font-size="9" font-weight="900" fill="#78350F" text-anchor="middle" font-family="sans-serif">999.9</text>
  <text x="56" y="76" font-size="8" font-weight="bold" fill="#92400E" text-anchor="middle" font-family="sans-serif">50 g GOLD</text>
</svg>'''
}

out_dir = 'static/img/assets'
os.makedirs(out_dir, exist_ok=True)

for name, content in images.items():
    filepath = os.path.join(out_dir, name)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Created {filepath}")

print("All luxury jewelry and bullion asset images generated successfully!")
