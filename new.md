# Homepage Glassmorphism Redesign

## Değişiklikler

### 1. Glassmorphism CSS Sistemi (`globals.css`)
- `.glass`, `.glass-strong`, `.glass-prompt-glow`, `.glass-pill`, `.glass-circle` utility class'ları eklendi
- Hover'da shimmer efekti (`.glass-shimmer`) — ışık dalgası animasyonu
- Floating orb animasyonları (`.animate-float`, `.animate-float-delayed`)
- Gradient aksan çizgileri (`.gradient-line-top`, `.gradient-dot`)
- Staggered fade-in animasyonları
- Light/dark mode desteği tüm glass efektlerde

### 2. Arka Plan Güncellemesi (`background.tsx`)
- Sky blue, violet, teal, amber, rose tonlarında büyük blur gradient orb'lar eklendi
- Glass kartlara derinlik ve iridescent etki sağlıyor
- SVG noise texture overlay

### 3. Font Değişikliği (`layout.tsx`)
- Inter → **Outfit** (geometric sans-serif)

### 4. ProjectLink Kartları (`project-link.tsx`)
- Eski beyaz kartlar → `glass-strong` + `glass-hover` efektli kartlar
- İkon container'ı da glass efektli

### 5. Explore Section Yeniden Tasarım (`page.tsx`)
- Writing, Prompts, Tools kartlarına ikonlar eklendi (PenLine, Sparkles, Wrench)
- **Featured Prompt kartı**: `glass-prompt-glow` + shimmer + gradient line + animated floating orbs
- Sosyal medya → "Connect" başlığı + `glass-circle` ikonlar
- Wrapper div'lerin negatif marginları kaldırılarak overlap sorunu çözüldü

### 6. Section Başlıkları (`section.tsx`)
- Uppercase tracking + gradient dot aksanı

---

# Blog Sayfası Timeline Redesign

## Değişiklikler

### 7. Blog Listing Sayfası (`app/blog/page.tsx`)
- Düz liste → **Chronological Timeline** tasarımına geçildi
- Sol tarafta dikey çizgi (`w-px bg-border`) ile postlar birbirine bağlı
- **Yıl marker'ları**: Büyük `gradient-dot` (mavi-mor gradient) + yıl etiketi + yatay ayırıcı çizgi
- **Post dot'ları**: Küçük siyah nokta (`w-[9px] h-[9px]`), hover'da `scale-[1.6]` büyüme animasyonu
- Her yıl bağımsız timeline — 2026 ve 2025 çizgileri birbirine bağlanmıyor
- Son post'un altına çizgi **sarkımıyor** (posts container'da `bottom-[18px]` ile kesilir)
- Hover efekti: `hover:bg-muted/40` — sade ve temiz
- Tag'ler: `rounded-full bg-muted/60` pill tasarımı, max 2 tag gösterilir
- Header: `animate-fade-in-up stagger-1` animasyonu
- Geri butonu: Ok hover'da sola kayma (`group-hover:-translate-x-1`)
- Staggered reveal: Her yıl section'ı artan `stagger-*` delay ile fade-in

### 8. Blog Loading Skeleton (`app/blog/loading.tsx`)
- Skeleton timeline yapısına uyumlu hale getirildi
- Sol dikey çizgi + dot placeholder'lar
- 2 yıl section × 3 post placeholder

### 9. Profil Resmi Hover Efekti (`app/page.tsx`)
- Resim solda, flex layout ile isim/title yanında
- Köşesiz, doğal aspect ratio (`h-auto`)
- **Hover'da resim parlıyor**: `brightness-110` + `scale-105` + beyaz `drop-shadow` glow
- **Ekran blur oluyor**: `backdrop-blur-[6px]` + `bg-black/5` overlay (fixed, fullscreen)
- Resim `z-50` ile blur'un üstünde net kalıyor
