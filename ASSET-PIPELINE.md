# Wolfenstein 3D Browser Remake - Asset Production Pipeline

**Version**: 1.0.0
**Date**: 2026-03-30
**Project**: 3d-shooter (Wolfenstein 3D-inspired browser remake)
**Pipeline**: fal.ai Flux API via `scripts/generate-asset.sh`

---

## Table of Contents

1. [Art Direction & Color Palette](#1-art-direction--color-palette)
2. [Wall Textures](#2-wall-textures)
3. [Floor & Ceiling Textures](#3-floor--ceiling-textures)
4. [Door Textures](#4-door-textures)
5. [Skybox & Environment](#5-skybox--environment)
6. [UI / HUD Assets](#6-ui--hud-assets)
7. [Sprite Sheets (Billboard Objects)](#7-sprite-sheets-billboard-objects)
8. [OG Image & Marketing](#8-og-image--marketing)
9. [Cinematic Assets](#9-cinematic-assets)
10. [Asset Production Pipeline](#10-asset-production-pipeline)
11. [Batch Generation Scripts](#11-batch-generation-scripts)

---

## 1. Art Direction & Color Palette

### Master Color Palette

The original Wolfenstein 3D (1992) had a restricted VGA palette that gave it its iconic look. Our remake keeps the same color DNA but renders it in modern high-fidelity detail.

| Color Role | Hex Range | Usage |
|-----------|-----------|-------|
| **Castle Grey** | `#4A4A4A` to `#8C8C8C` | Primary stone walls, the backbone of Wolfenstein |
| **Nazi Red** | `#8B0000` to `#CC2222` | Banners, flags, blood, danger elements |
| **Dungeon Blue** | `#2A3A5C` to `#4A6A8C` | Blue stone walls (Episode 1 signature) |
| **Officer Brown** | `#5C3A1A` to `#8C6A3A` | Wood paneling, officer quarters |
| **Steel Grey** | `#6A6A7A` to `#9A9AAA` | Metal walls, mechanical areas, elevators |
| **Purple Stone** | `#4A2A5C` to `#7A4A8C` | Episode 2 signature color |
| **Gold Accent** | `#C8A832` to `#FFD700` | Keys, treasure, locked doors, Nazi eagles |
| **Flesh/Bone** | `#C8A080` to `#E8C8A0` | Bone piles, skull details, face sprites |
| **Dark Green** | `#1A3A1A` to `#3A5A3A` | Outdoor glimpses, vegetation hints |
| **Black** | `#0A0A0A` to `#2A2A2A` | Shadows, deep corners, oppressive atmosphere |

### Consistency Guidelines

Every Flux prompt MUST include this style anchor to maintain visual coherence:

```
STYLE ANCHOR (append to ALL texture prompts):
"high quality seamless tiling game texture, realistic materials with subtle stylization,
dark atmospheric lighting, cinematic game art quality, 8K detail rendered at [RESOLUTION],
consistent with dark oppressive medieval castle aesthetic, no text, no watermarks"
```

```
STYLE ANCHOR (append to ALL sprite prompts):
"high quality digital painting, game asset, dramatic lighting from above-left,
Wolfenstein 3D inspired aesthetic modernized to AAA quality, transparent background PNG,
painterly yet detailed, no text, no watermarks"
```

### Atmosphere Rules

1. **Lighting**: Always imply torchlight or harsh fluorescent. No natural sunlight inside.
2. **Wear & Tear**: Every surface should show age -- cracks, stains, chips, scratches.
3. **Color Temperature**: Interior scenes lean WARM (torchlight amber). Metal areas lean COOL (fluorescent blue-white).
4. **Contrast**: High contrast between lit surfaces and deep shadows. The castle should feel claustrophobic.
5. **Scale Reference**: Textures represent approximately 2m x 2m wall sections in-game.

---

## 2. Wall Textures

All wall textures: **512x512 PNG**, seamless tiling, generated via Flux.

### 2.1 Grey Stone Wall (Classic Castle Stone)

The most iconic Wolfenstein texture. The foundation of the entire visual language.

| Property | Value |
|----------|-------|
| **Filename** | `wall_grey_stone.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 512x512 |
| **Post-processing** | Seamless tiling verification, slight contrast boost |

**Prompt:**
```
Seamless tiling stone wall texture, large hand-cut grey limestone blocks with visible mortar lines,
medieval castle interior wall, the stones are slightly irregular in size with hairline cracks and
centuries of wear, subtle moss traces in the mortar joints, torch-lit warm amber highlights on the
upper portions fading to cool shadow at the bottom, the stone has a rough hewn surface with chisel
marks visible up close, color palette restricted to cool greys (#5A5A5A to #8A8A8A) with warm
highlight accents, high quality seamless tiling game texture, realistic materials with subtle
stylization, dark atmospheric lighting, cinematic game art quality, 8K detail rendered at 512x512,
consistent with dark oppressive medieval castle aesthetic, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Seamless tiling stone wall texture, large hand-cut grey limestone blocks with visible mortar lines, medieval castle interior wall, the stones are slightly irregular in size with hairline cracks and centuries of wear, subtle moss traces in the mortar joints, torch-lit warm amber highlights on the upper portions fading to cool shadow at the bottom, the stone has a rough hewn surface with chisel marks visible up close, color palette restricted to cool greys with warm highlight accents, high quality seamless tiling game texture, realistic materials, dark atmospheric lighting, cinematic game art quality, no text, no watermarks" \
  --output 3d-shooter/assets/textures/ \
  --filename wall_grey_stone.png \
  --size 512x512
```

---

### 2.2 Grey Stone Wall with Nazi Eagle Banner

The stone wall with a large red banner bearing a golden eagle emblem draped across it.

| Property | Value |
|----------|-------|
| **Filename** | `wall_grey_stone_banner.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 512x512 |
| **Post-processing** | Seamless tiling check (banner breaks tiling -- use as feature wall), color match to wall_grey_stone |

**Prompt:**
```
Seamless tiling stone wall texture with a large crimson red fabric banner hanging from an iron rod,
grey limestone castle wall background identical to medieval fortress interior, the banner is aged
and slightly torn at the edges, bearing a large golden heraldic eagle emblem in the center with
spread wings, the banner drapes with natural fabric folds and creases, iron mounting brackets
visible at the top, torch-lit scene with warm amber light catching the gold emblem and making
the red fabric glow, the stone wall behind is partially visible at the sides and bottom,
color palette: grey stone (#5A5A5A-#8A8A8A) with deep crimson red (#8B0000-#CC2222) banner
and gold (#C8A832-#FFD700) eagle, high quality seamless tiling game texture, realistic materials
with subtle stylization, dark atmospheric lighting, cinematic game art quality, 8K detail
rendered at 512x512, consistent with dark oppressive medieval castle aesthetic, no text,
no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Seamless tiling stone wall texture with a large crimson red fabric banner hanging from an iron rod, grey limestone castle wall background, the banner is aged and slightly torn at the edges bearing a large golden heraldic eagle emblem in the center with spread wings, iron mounting brackets visible at top, torch-lit scene with warm amber light catching the gold emblem, stone wall partially visible at sides, high quality seamless tiling game texture, realistic materials, dark atmospheric lighting, cinematic quality, no text, no watermarks" \
  --output 3d-shooter/assets/textures/ \
  --filename wall_grey_stone_banner.png \
  --size 512x512
```

---

### 2.3 Blue Stone Brick Wall

The signature Episode 1 blue stone. Cold, imposing, prison-like.

| Property | Value |
|----------|-------|
| **Filename** | `wall_blue_stone.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 512x512 |
| **Post-processing** | Seamless tiling verification, color balance toward blue |

**Prompt:**
```
Seamless tiling blue-grey stone brick wall texture, uniform rectangular cut stone blocks in a
running bond pattern, the stone has a cold blue-grey coloration like slate or bluestone,
tight mortar joints in a slightly darker shade, the surface has a smooth but weathered finish
with subtle pitting and mineral deposits, fluorescent cool light from above creating sharp
highlights on the upper edges of each brick and deep shadows on the lower edges, the overall
feeling is cold institutional and prison-like, color palette restricted to cold blue-greys
(#2A3A5C to #5A7A9C) with very subtle blue-green mineral staining, high quality seamless tiling
game texture, realistic materials with subtle stylization, dark atmospheric lighting, cinematic
game art quality, 8K detail rendered at 512x512, consistent with dark oppressive medieval castle
aesthetic, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Seamless tiling blue-grey stone brick wall texture, uniform rectangular cut stone blocks in running bond pattern, cold blue-grey coloration like slate or bluestone, tight mortar joints, smooth but weathered finish with subtle pitting and mineral deposits, fluorescent cool light from above, cold institutional prison-like feeling, color palette restricted to cold blue-greys, high quality seamless tiling game texture, realistic materials, dark atmospheric lighting, cinematic quality, no text, no watermarks" \
  --output 3d-shooter/assets/textures/ \
  --filename wall_blue_stone.png \
  --size 512x512
```

---

### 2.4 Blue Stone with Cell Door / Prison Bars

Blue stone wall with embedded iron prison bars or a cell door opening.

| Property | Value |
|----------|-------|
| **Filename** | `wall_blue_stone_cell.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 512x512 |
| **Post-processing** | Non-tiling feature texture, color match to wall_blue_stone |

**Prompt:**
```
Blue-grey stone brick wall with a prison cell door embedded in the center, heavy rusted iron bars
set into a stone archway frame, the bars are thick vertical cylinders with horizontal crossbars,
behind the bars is pitch black darkness suggesting a deep dungeon cell, the stone around the door
frame is reinforced with iron plates bolted to the stone, visible rust streaks running down from
the iron fixtures staining the blue-grey stone orange-brown, a heavy iron lock mechanism on
the right side, the blue-grey stone matches cold slate coloration (#2A3A5C to #5A7A9C),
the iron is dark oxidized (#3A2A1A to #5A4A3A), torch-lit from the corridor side casting long
shadows through the bars into the cell, high quality game texture, realistic materials with
subtle stylization, dark atmospheric lighting, cinematic game art quality, 8K detail rendered
at 512x512, oppressive dungeon atmosphere, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Blue-grey stone brick wall with prison cell door embedded in center, heavy rusted iron bars set into stone archway frame, thick vertical bars with horizontal crossbars, pitch black darkness behind bars, iron plates bolted to stone with rust streaks, heavy iron lock mechanism, cold slate stone coloration, torch-lit from corridor side, high quality game texture, realistic materials, dark atmospheric lighting, cinematic quality, oppressive dungeon atmosphere, no text, no watermarks" \
  --output 3d-shooter/assets/textures/ \
  --filename wall_blue_stone_cell.png \
  --size 512x512
```

---

### 2.5 Wood Paneling (Officer Quarters)

Rich, dark wood paneling for the more luxurious areas of the castle.

| Property | Value |
|----------|-------|
| **Filename** | `wall_wood_paneling.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 512x512 |
| **Post-processing** | Seamless tiling verification, warm color balance |

**Prompt:**
```
Seamless tiling dark wood wall paneling texture, rich mahogany or walnut wood panels in a
traditional wainscoting style with raised rectangular panel frames, the wood has a deep warm
brown color with visible natural grain patterns, the panels are separated by narrow wooden
molding strips, the finish is semi-polished showing years of use with subtle scuff marks and
a slight patina, warm amber torch-light creating a golden sheen on the polished surfaces and
deep shadows in the panel recesses, the overall look suggests wealthy military officer quarters
in a medieval castle, color palette: warm dark browns (#3A2210 to #7A5A30) with golden highlight
accents (#8C7A4A to #B8A060), high quality seamless tiling game texture, realistic materials
with subtle stylization, dark atmospheric lighting, cinematic game art quality, 8K detail
rendered at 512x512, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Seamless tiling dark wood wall paneling texture, rich mahogany or walnut wood panels in traditional wainscoting style with raised rectangular panel frames, deep warm brown color with visible natural grain patterns, panels separated by narrow wooden molding strips, semi-polished finish with years of use and subtle patina, warm amber torch-light creating golden sheen, military officer quarters in medieval castle, warm dark browns with golden highlights, high quality seamless tiling game texture, realistic materials, dark atmospheric lighting, cinematic quality, no text, no watermarks" \
  --output 3d-shooter/assets/textures/ \
  --filename wall_wood_paneling.png \
  --size 512x512
```

---

### 2.6 Wood with Portrait/Painting

Wood paneling with an ornate framed portrait -- used as a distinctive feature wall.

| Property | Value |
|----------|-------|
| **Filename** | `wall_wood_portrait.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 512x512 |
| **Post-processing** | Non-tiling feature texture, color match to wall_wood_paneling |

**Prompt:**
```
Dark wood paneled wall with a large ornate gold-framed oil painting hanging in the center,
the painting depicts a stern medieval military commander in formal dark uniform with medals,
the gold picture frame is baroque style with elaborate scrollwork and leaf motifs, the frame
is slightly tarnished with age, the surrounding wood paneling is rich mahogany wainscoting
identical in style to officer quarters, two small wall-mounted candle sconces flank the painting
casting warm light upward illuminating the portrait, the commander in the painting has cold
piercing eyes and a rigid expression, the overall mood is authoritarian and intimidating,
color palette: dark warm wood browns (#3A2210-#7A5A30), tarnished gold frame (#8A7A3A-#C8A832),
painting in muted dark tones, high quality game texture, realistic materials with subtle
stylization, dark atmospheric lighting, cinematic game art quality, 8K detail rendered
at 512x512, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Dark wood paneled wall with large ornate gold-framed oil painting hanging in center, painting depicts a stern medieval military commander in formal dark uniform with medals, baroque gold picture frame with elaborate scrollwork, slightly tarnished with age, rich mahogany wainscoting surrounding it, two small wall-mounted candle sconces flanking the painting, authoritarian and intimidating mood, dark warm wood browns with tarnished gold frame, high quality game texture, realistic materials, dark atmospheric lighting, cinematic quality, no text, no watermarks" \
  --output 3d-shooter/assets/textures/ \
  --filename wall_wood_portrait.png \
  --size 512x512
```

---

### 2.7 Metal/Steel Wall (Mechanical Areas)

Industrial metal plating for the mechanical and technological sections.

| Property | Value |
|----------|-------|
| **Filename** | `wall_metal_steel.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 512x512 |
| **Post-processing** | Seamless tiling verification, desaturate slightly |

**Prompt:**
```
Seamless tiling industrial metal wall texture, riveted steel plates bolted together in a grid
pattern, each plate is approximately 50cm square with rounded hex-head rivets at each corner,
the steel has a brushed gunmetal finish (#6A6A7A to #8A8A9A) with subtle surface scratches and
tool marks, some plates show slight warping from heat, rust spots forming around the rivets
and along the plate seams, faint oil stains and industrial grime in patches, harsh overhead
fluorescent lighting creating bright specular highlights on the metal surface and deep shadows
in the gaps between plates, the atmosphere is cold industrial and utilitarian, high quality
seamless tiling game texture, realistic materials with subtle stylization, dark atmospheric
lighting, cinematic game art quality, 8K detail rendered at 512x512, consistent with military
bunker or mechanical facility aesthetic, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Seamless tiling industrial metal wall texture, riveted steel plates bolted together in grid pattern, brushed gunmetal finish with subtle surface scratches and tool marks, some plates show slight warping, rust spots around rivets and plate seams, faint oil stains and industrial grime, harsh overhead fluorescent lighting creating bright specular highlights, cold industrial utilitarian atmosphere, high quality seamless tiling game texture, realistic materials, dark atmospheric lighting, cinematic quality, military bunker aesthetic, no text, no watermarks" \
  --output 3d-shooter/assets/textures/ \
  --filename wall_metal_steel.png \
  --size 512x512
```

---

### 2.8 Red Brick Wall

Classic red brick for variation in dungeon and basement areas.

| Property | Value |
|----------|-------|
| **Filename** | `wall_red_brick.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 512x512 |
| **Post-processing** | Seamless tiling verification |

**Prompt:**
```
Seamless tiling red brick wall texture, traditional running bond brickwork pattern with
individual bricks showing slight color variation from dark burgundy to dusty terracotta red,
thick cream-colored mortar joints slightly recessed between bricks, the bricks have a rough
handmade quality with chips and small chunks missing from some edges, black soot staining
on the upper portion suggesting nearby torches or fire, one or two bricks are cracked,
a faint dampness sheen on the lower portion, torch-lit from the side with warm amber light
catching the rough texture and casting tiny shadows from each mortar joint, color palette:
brick reds (#6A2A1A to #9A4A2A) with cream mortar (#B8A890 to #D8C8B0) and soot black
(#1A1A1A to #3A3A3A), high quality seamless tiling game texture, realistic materials
with subtle stylization, dark atmospheric lighting, cinematic game art quality, 8K detail
rendered at 512x512, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Seamless tiling red brick wall texture, traditional running bond brickwork with slight color variation from dark burgundy to dusty terracotta, thick cream mortar joints slightly recessed, rough handmade quality with chips, black soot staining on upper portion, one or two cracked bricks, faint dampness on lower portion, torch-lit from side with warm amber light, high quality seamless tiling game texture, realistic materials, dark atmospheric lighting, cinematic quality, no text, no watermarks" \
  --output 3d-shooter/assets/textures/ \
  --filename wall_red_brick.png \
  --size 512x512
```

---

### 2.9 Purple Stone (Episode 2 Style)

The distinctive purple-tinged stone of Episode 2 areas.

| Property | Value |
|----------|-------|
| **Filename** | `wall_purple_stone.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 512x512 |
| **Post-processing** | Seamless tiling verification, enhance purple tones in post |

**Prompt:**
```
Seamless tiling purple-grey stone wall texture, large rough-cut stone blocks in an ashlar
pattern, the stone has an unusual purple-grey coloration like dark amethyst-veined granite,
the mortar between blocks is nearly black, the stone surface has a slightly crystalline
quality with tiny mineral sparkles visible in the texture, deep cracks running through
some blocks, dark purple staining that suggests something supernatural or alchemical has
seeped into the stone over centuries, lit by a cold bluish-purple ambient light suggesting
magical or otherworldly illumination, the atmosphere is deeply unsettling and alien,
color palette: purple-greys (#4A2A5C to #7A4A8C) with near-black mortar (#1A0A2A) and
subtle crystalline highlights (#9A6AAC), high quality seamless tiling game texture,
realistic materials with subtle stylization, dark atmospheric lighting, cinematic game
art quality, 8K detail rendered at 512x512, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Seamless tiling purple-grey stone wall texture, large rough-cut stone blocks in ashlar pattern, unusual purple-grey coloration like dark amethyst-veined granite, nearly black mortar, slightly crystalline surface with tiny mineral sparkles, deep cracks, dark purple staining suggesting supernatural seepage, cold bluish-purple ambient light, deeply unsettling alien atmosphere, high quality seamless tiling game texture, realistic materials, dark atmospheric lighting, cinematic quality, no text, no watermarks" \
  --output 3d-shooter/assets/textures/ \
  --filename wall_purple_stone.png \
  --size 512x512
```

---

### 2.10 Brown Cave/Dungeon Stone

Rough, primitive brown stone for the deepest dungeon areas.

| Property | Value |
|----------|-------|
| **Filename** | `wall_brown_cave.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 512x512 |
| **Post-processing** | Seamless tiling verification |

**Prompt:**
```
Seamless tiling rough brown cave stone wall texture, irregular natural rock face with minimal
human-worked surfaces, the stone is a warm earthy brown like sandstone or mudstone, deep
crevices and natural fractures create dramatic shadows, patches of damp darker stone where
water has seeped through, tiny stalactite formations beginning to form on overhanging ledges,
a thin layer of gritty dust and small pebbles accumulated in the cracks, the lighting is
sparse and warm from a distant torch creating pools of amber light with large areas of deep
shadow, the surface is rough enough to cast complex micro-shadows, color palette: warm browns
(#4A3020 to #8A6A4A) with damp dark patches (#2A1A10) and dusty highlights (#A08060),
high quality seamless tiling game texture, realistic materials with subtle stylization,
dark atmospheric lighting, cinematic game art quality, 8K detail rendered at 512x512,
no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Seamless tiling rough brown cave stone wall texture, irregular natural rock face with minimal human work, warm earthy brown sandstone, deep crevices and natural fractures, patches of damp darker stone, tiny stalactite formations, gritty dust in cracks, sparse warm torch lighting with deep shadow, rough surface with complex micro-shadows, high quality seamless tiling game texture, realistic materials, dark atmospheric lighting, cinematic quality, no text, no watermarks" \
  --output 3d-shooter/assets/textures/ \
  --filename wall_brown_cave.png \
  --size 512x512
```

---

### 2.11 Elevator Wall Texture

Distinctive elevator interior with mechanical detailing.

| Property | Value |
|----------|-------|
| **Filename** | `wall_elevator.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 512x512 |
| **Post-processing** | Seamless tiling verification (horizontal tiling most important) |

**Prompt:**
```
Seamless tiling elevator interior wall texture, industrial metal panels with a vertical
brushed steel finish, the panels are separated by thin chrome trim strips running vertically,
a narrow horizontal control strip at mid-height with small indicator lights (one glowing
amber, others dark), the metal surface is clean but shows age with minor scratches and
fingerprint smudges, the upper portion has small ventilation grilles with horizontal slats,
the lower portion has a darker kick-plate of thicker steel, overhead fluorescent lighting
creating a clean bright illumination with sharp reflections on the chrome trim, the overall
feeling is functional military technology from the 1940s but well maintained,
color palette: bright steel greys (#7A7A8A to #B0B0C0) with chrome highlights (#C8C8D8)
and dark kick-plate (#3A3A4A), amber indicator (#C8A832), high quality seamless tiling
game texture, realistic materials with subtle stylization, clean industrial lighting,
cinematic game art quality, 8K detail rendered at 512x512, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Seamless tiling elevator interior wall texture, industrial metal panels with vertical brushed steel finish, thin chrome trim strips, narrow horizontal control strip with small indicator lights at mid-height, clean but aged surface with minor scratches, small ventilation grilles with horizontal slats, darker kick-plate of thicker steel, overhead fluorescent lighting with sharp chrome reflections, functional 1940s military technology, bright steel greys with chrome highlights, high quality seamless tiling game texture, realistic materials, clean industrial lighting, cinematic quality, no text, no watermarks" \
  --output 3d-shooter/assets/textures/ \
  --filename wall_elevator.png \
  --size 512x512
```

---

### 2.12 Secret Passage Wall

Identical to grey stone wall but with subtle "pushable" hint -- a hairline crack outline.

| Property | Value |
|----------|-------|
| **Filename** | `wall_secret_passage.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 512x512 |
| **Post-processing** | Must closely match wall_grey_stone; add very subtle rectangular crack in post if Flux does not produce it |

**Prompt:**
```
Seamless tiling stone wall texture nearly identical to a standard grey limestone castle wall,
large hand-cut grey limestone blocks with visible mortar lines, BUT with one extremely subtle
detail: a barely visible hairline rectangular crack outline suggesting a hidden door or pushable
section, the crack is almost invisible at first glance and only noticeable upon close inspection,
it follows the mortar lines of approximately a 2-block-wide section, very faint dust accumulation
along the crack line, otherwise identical to standard medieval castle stone wall, torch-lit
warm amber highlights, rough hewn surface, color palette restricted to cool greys (#5A5A5A to
#8A8A8A) with warm highlight accents, high quality seamless tiling game texture, realistic
materials with subtle stylization, dark atmospheric lighting, cinematic game art quality,
8K detail rendered at 512x512, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Seamless tiling stone wall texture nearly identical to standard grey limestone castle wall, large hand-cut grey limestone blocks with visible mortar lines, with one extremely subtle barely visible hairline rectangular crack outline suggesting a hidden pushable section, the crack follows mortar lines and is almost invisible at first glance, otherwise identical to standard medieval castle stone, torch-lit warm amber highlights, cool greys with warm highlight accents, high quality seamless tiling game texture, realistic materials, dark atmospheric lighting, cinematic quality, no text, no watermarks" \
  --output 3d-shooter/assets/textures/ \
  --filename wall_secret_passage.png \
  --size 512x512
```

---

## 3. Floor & Ceiling Textures

All floor/ceiling textures: **512x512 PNG**, seamless tiling required (these repeat extensively).

### 3.1 Stone Floor (Dungeon)

| Property | Value |
|----------|-------|
| **Filename** | `floor_stone_dungeon.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 512x512 |

**Prompt:**
```
Seamless tiling stone floor texture viewed from directly above top-down perspective,
large irregular flagstone slabs fitted together with dark grout lines, the stone is
cold grey with slight brown undertones, the surface is worn smooth in high-traffic areas
but rough at the edges of each slab, dark staining in the grout lines suggesting age and
damp, occasional small puddle of water reflecting ambient light, tiny bone fragments and
dust accumulated in the grout crevices, no directional lighting bias to maintain top-down
tiling consistency, overall cold damp dungeon atmosphere, color palette: grey-brown stone
(#4A4440 to #7A7470) with dark grout (#1A1A18) and occasional wet highlight (#5A5A58),
high quality seamless tiling game texture, realistic materials, top-down perspective,
flat lighting for tiling, cinematic game art quality, 8K detail rendered at 512x512,
no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Seamless tiling stone floor texture viewed from directly above top-down perspective, large irregular flagstone slabs fitted together with dark grout lines, cold grey stone with slight brown undertones, worn smooth in high-traffic areas, dark staining in grout suggesting damp, tiny bone fragments and dust in crevices, no directional lighting bias, cold damp dungeon atmosphere, high quality seamless tiling game texture, realistic materials, top-down perspective, flat lighting for tiling, cinematic quality, no text, no watermarks" \
  --output 3d-shooter/assets/textures/ \
  --filename floor_stone_dungeon.png \
  --size 512x512
```

---

### 3.2 Wood Floor (Officer Areas)

| Property | Value |
|----------|-------|
| **Filename** | `floor_wood_officer.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 512x512 |

**Prompt:**
```
Seamless tiling dark hardwood floor texture viewed from directly above top-down perspective,
wide oak or walnut planks running in parallel with visible wood grain, the wood has a deep
warm brown polished finish with slight variations in color between planks, narrow gaps between
planks showing dark shadows, the surface shows wear patterns from decades of use with slight
dulling in the center, subtle scratch marks from heavy furniture, a warm golden sheen from
the polish catching ambient light, the overall quality suggests expensive flooring in military
officer quarters, color palette: warm dark browns (#3A2210 to #6A4A28) with golden polish
highlights (#8A7A4A) and dark plank gaps (#1A1008), high quality seamless tiling game texture,
realistic materials, top-down perspective, flat even lighting for tiling, cinematic game art
quality, 8K detail rendered at 512x512, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Seamless tiling dark hardwood floor texture viewed from directly above, wide oak or walnut planks with visible wood grain, deep warm brown polished finish, narrow gaps between planks, wear patterns from decades of use, subtle scratch marks, warm golden sheen from polish, military officer quarters quality, warm dark browns with golden polish highlights, high quality seamless tiling game texture, realistic materials, top-down perspective, flat even lighting, cinematic quality, no text, no watermarks" \
  --output 3d-shooter/assets/textures/ \
  --filename floor_wood_officer.png \
  --size 512x512
```

---

### 3.3 Metal Grating Floor

| Property | Value |
|----------|-------|
| **Filename** | `floor_metal_grating.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 512x512 |

**Prompt:**
```
Seamless tiling industrial metal grating floor texture viewed from directly above top-down
perspective, diamond-pattern expanded metal grating with a grid of rectangular openings showing
darkness below, the metal is dark steel grey with a non-slip raised diamond tread pattern on
the solid sections, bolted frame edges visible at regular intervals, rust forming at the bolt
points and along stress fractures, slight oil sheen on some surfaces, harsh overhead lighting
creating bright highlights on the raised portions and deep black in the open grid sections,
the overall feeling is industrial military facility catwalks and maintenance areas,
color palette: steel grey (#5A5A6A to #8A8A9A) with rust accents (#6A3A2A) and black voids
(#0A0A0A), high quality seamless tiling game texture, realistic materials, top-down perspective,
cinematic game art quality, 8K detail rendered at 512x512, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Seamless tiling industrial metal grating floor texture viewed from directly above, diamond-pattern expanded metal grating with rectangular openings showing darkness below, dark steel grey with non-slip raised diamond tread, bolted frame edges, rust at bolt points, slight oil sheen, harsh overhead lighting, industrial military facility aesthetic, steel grey with rust accents and black voids, high quality seamless tiling game texture, realistic materials, top-down perspective, cinematic quality, no text, no watermarks" \
  --output 3d-shooter/assets/textures/ \
  --filename floor_metal_grating.png \
  --size 512x512
```

---

### 3.4 Red Carpet (Officer Quarters)

| Property | Value |
|----------|-------|
| **Filename** | `floor_carpet_red.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 512x512 |

**Prompt:**
```
Seamless tiling deep red carpet texture viewed from directly above top-down perspective,
rich burgundy red woven carpet with a subtle repeating geometric border pattern in slightly
darker thread, the carpet pile is thick and luxurious but shows wear in the center with
slight flattening, the weave texture is visible with individual fiber strands creating a
soft fuzzy appearance, a thin decorative gold-thread border stripe runs as a repeating element,
the red is deep and saturated like fine wine, even flat lighting for seamless tiling,
the overall quality suggests opulent military commander quarters, color palette: deep
burgundy reds (#5A0A0A to #8A1A1A) with subtle gold thread (#8A7A3A) and shadow areas
in the weave (#3A0808), high quality seamless tiling game texture, realistic materials,
top-down perspective, flat even lighting for tiling, cinematic game art quality, 8K detail
rendered at 512x512, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Seamless tiling deep red carpet texture viewed from directly above, rich burgundy red woven carpet with subtle repeating geometric pattern in slightly darker thread, thick luxurious pile showing wear in center, visible weave texture with individual fibers, thin decorative gold-thread border, deep saturated wine red, opulent military commander quarters, deep burgundy with subtle gold thread, high quality seamless tiling game texture, realistic materials, top-down perspective, flat even lighting, cinematic quality, no text, no watermarks" \
  --output 3d-shooter/assets/textures/ \
  --filename floor_carpet_red.png \
  --size 512x512
```

---

### 3.5 Concrete Ceiling

| Property | Value |
|----------|-------|
| **Filename** | `ceiling_concrete.png` |
| **Model** | Flux Dev (`fal-ai/flux/dev`) |
| **Resolution** | 512x512 |

**Prompt:**
```
Seamless tiling concrete ceiling texture viewed from directly below looking up, flat poured
concrete slab with visible form-board impressions running in parallel lines, the concrete
is medium grey with slight variations in shade where the mix was uneven, hairline cracks
forming a subtle web pattern, patches of dampness creating darker spots, a few small areas
where the surface has spalled revealing coarse aggregate underneath, absolutely no fixtures
or lights just plain concrete, even flat lighting for tiling with no directional bias,
color palette: medium greys (#5A5A58 to #7A7A78) with damp dark spots (#3A3A38) and
aggregate highlights (#8A8A88), high quality seamless tiling game texture, realistic materials,
bottom-up perspective, flat even lighting for tiling, cinematic game art quality, 8K detail
rendered at 512x512, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type sprite \
  --prompt "Seamless tiling concrete ceiling texture viewed from directly below looking up, flat poured concrete with visible form-board impressions, medium grey with slight variations, hairline cracks in web pattern, patches of dampness, no fixtures just plain concrete, even flat lighting, high quality seamless tiling game texture, realistic materials, flat even lighting for tiling, cinematic quality, no text, no watermarks" \
  --output 3d-shooter/assets/textures/ \
  --filename ceiling_concrete.png \
  --size 512x512
```

---

### 3.6 Wood Beam Ceiling

| Property | Value |
|----------|-------|
| **Filename** | `ceiling_wood_beam.png` |
| **Model** | Flux Dev (`fal-ai/flux/dev`) |
| **Resolution** | 512x512 |

**Prompt:**
```
Seamless tiling wooden beam ceiling texture viewed from directly below looking up, heavy dark
oak beams running in one direction with lighter wooden plank boards laid across them perpendicular,
the beams are massive rough-hewn timber with visible axe marks and bark remnants on the edges,
the planks between beams show natural wood grain and slight gaps where they have shrunk with age,
dark cobwebs visible in the corners where beams meet planks, the wood is darkened with centuries
of smoke and soot, warm amber light filtering up from below catching the undersides of the beams,
color palette: dark smoky wood (#2A1A0A to #5A3A1A) with lighter plank wood (#6A4A2A to #8A6A3A)
and deep shadows (#0A0A08), high quality seamless tiling game texture, realistic materials,
bottom-up perspective, flat even lighting for tiling, cinematic game art quality, 8K detail
rendered at 512x512, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type sprite \
  --prompt "Seamless tiling wooden beam ceiling texture viewed from directly below, heavy dark oak beams with lighter wooden planks laid perpendicular, rough-hewn timber with axe marks, natural wood grain with slight gaps, dark cobwebs in corners, wood darkened with centuries of smoke, warm amber light from below, dark smoky wood with lighter planks, high quality seamless tiling game texture, realistic materials, bottom-up perspective, flat even lighting, cinematic quality, no text, no watermarks" \
  --output 3d-shooter/assets/textures/ \
  --filename ceiling_wood_beam.png \
  --size 512x512
```

---

## 4. Door Textures

Doors are non-tiling feature textures. **512x512 PNG** or **256x512 PNG** (portrait) depending on game engine needs.

### 4.1 Wooden Door

| Property | Value |
|----------|-------|
| **Filename** | `door_wood.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 512x512 |

**Prompt:**
```
Heavy medieval wooden door front view, thick oak planks running vertically held together by
three horizontal iron straps with decorative rivets, a large iron ring pull handle on the right
side, the wood is dark aged oak with deep grain lines and a few knot holes, the iron hardware
is black with hints of rust, the door frame is stone with a slight pointed arch at the top,
the door sits slightly recessed in the frame casting a shadow along the edges, scratch marks
and gouges in the wood from centuries of use, a large old-fashioned iron keyhole plate below
the handle, torch-lit from the corridor side with warm amber light, the door surface shows
the texture of hand-adzed planks, this is a single door filling the entire frame,
high quality game texture, realistic materials with subtle stylization, dark atmospheric
lighting, cinematic game art quality, 8K detail rendered at 512x512, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Heavy medieval wooden door front view, thick oak planks held by three horizontal iron straps with decorative rivets, large iron ring pull handle, dark aged oak with deep grain lines, black iron hardware with rust hints, stone door frame with slight pointed arch, scratch marks from centuries of use, large old-fashioned iron keyhole plate, torch-lit with warm amber light, hand-adzed plank texture, single door filling entire frame, high quality game texture, realistic materials, dark atmospheric lighting, cinematic quality, no text, no watermarks" \
  --output 3d-shooter/assets/textures/ \
  --filename door_wood.png \
  --size 512x512
```

---

### 4.2 Steel Door

| Property | Value |
|----------|-------|
| **Filename** | `door_steel.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 512x512 |

**Prompt:**
```
Heavy industrial steel security door front view, single solid steel slab with a raised rectangular
panel pattern pressed into the surface, a robust lever-style handle mechanism on the right side,
the steel is painted dark grey with the paint chipping and flaking in places revealing bare metal
underneath, heavy-duty hinges visible on the left side, a small reinforced window slot at eye
level covered with wire mesh, warning hazard stripes painted yellow and black along the bottom
edge, scuff marks and dents from heavy use, an electronic-style keycard reader mounted beside
the handle (dark screen not lit), harsh fluorescent lighting creating sharp highlights on the
metal surfaces, the door is set in a steel frame with rubber gaskets visible at the edges,
high quality game texture, realistic materials with subtle stylization, industrial lighting,
cinematic game art quality, 8K detail rendered at 512x512, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Heavy industrial steel security door front view, solid steel slab with raised rectangular panel pattern, robust lever-style handle, dark grey paint chipping revealing bare metal, heavy-duty hinges, small reinforced window slot with wire mesh, yellow and black hazard stripes along bottom, scuff marks and dents, harsh fluorescent lighting, steel frame with rubber gaskets, high quality game texture, realistic materials, industrial lighting, cinematic quality, no text, no watermarks" \
  --output 3d-shooter/assets/textures/ \
  --filename door_steel.png \
  --size 512x512
```

---

### 4.3 Elevator Door

| Property | Value |
|----------|-------|
| **Filename** | `door_elevator.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 512x512 |

**Prompt:**
```
Industrial elevator doors front view, two sliding panels meeting in the center with a thin
vertical gap between them, the doors are brushed stainless steel with a vertical grain finish,
each door has a small recessed pull handle near the center gap, the surrounding frame is darker
steel with thick rubber bumper strips on the inner edges, an up/down call button panel mounted
to the right of the doors with two circular buttons (up arrow lit amber, down arrow dark),
a floor indicator display above the doors showing a simple number, the steel surface is clean
but shows usage wear with finger marks around the handles, bright overhead lighting reflecting
off the brushed steel creating long vertical light streaks, military facility elevator aesthetic,
high quality game texture, realistic materials with subtle stylization, clean industrial lighting,
cinematic game art quality, 8K detail rendered at 512x512, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Industrial elevator doors front view, two sliding panels meeting in center with thin vertical gap, brushed stainless steel with vertical grain finish, small recessed pull handles near center, darker steel frame with rubber bumper strips, call button panel to right with circular buttons, floor indicator display above, usage wear with finger marks, bright overhead lighting reflecting off brushed steel, military facility elevator, high quality game texture, realistic materials, clean industrial lighting, cinematic quality, no text, no watermarks" \
  --output 3d-shooter/assets/textures/ \
  --filename door_elevator.png \
  --size 512x512
```

---

### 4.4 Locked Door (Gold Trim)

| Property | Value |
|----------|-------|
| **Filename** | `door_locked_gold.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 512x512 |

**Prompt:**
```
Heavy ornate locked door front view, reinforced dark oak door with elaborate golden metal trim
and decorative elements, a prominent golden lock mechanism in the center with an oversized
ornate keyhole surrounded by engraved scrollwork, golden corner brackets with eagle motif
engravings, three golden horizontal reinforcement bands across the door with rivets, the gold
metalwork has a warm polished gleam but shows some tarnishing, the dark oak between the gold
trim shows deep rich wood grain, the door is clearly meant to guard something valuable or
important, warm torch-light making the gold elements gleam brilliantly, stone door frame with
gold-painted accents, color palette: dark oak (#3A2210-#5A3A1A) with rich gold (#B8922A-#FFD700)
and tarnish (#8A7A3A), high quality game texture, realistic materials with subtle stylization,
warm atmospheric lighting, cinematic game art quality, 8K detail rendered at 512x512,
no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Heavy ornate locked door front view, reinforced dark oak with elaborate golden metal trim, prominent golden lock mechanism in center with oversized ornate keyhole surrounded by engraved scrollwork, golden corner brackets with eagle motif, three golden horizontal reinforcement bands with rivets, polished gold with some tarnishing, deep rich wood grain, warm torch-light making gold gleam, stone door frame with gold accents, high quality game texture, realistic materials, warm atmospheric lighting, cinematic quality, no text, no watermarks" \
  --output 3d-shooter/assets/textures/ \
  --filename door_locked_gold.png \
  --size 512x512
```

---

### 4.5 Locked Door (Silver Trim)

| Property | Value |
|----------|-------|
| **Filename** | `door_locked_silver.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 512x512 |

**Prompt:**
```
Heavy ornate locked door front view, reinforced dark oak door with elaborate silver metal trim
and decorative elements, a prominent silver lock mechanism in the center with an oversized
ornate keyhole surrounded by engraved geometric patterns, silver corner brackets with iron cross
motif engravings, three silver horizontal reinforcement bands across the door with rivets,
the silver metalwork has a cool polished gleam with slight oxidation darkening in the engraved
recesses, the dark oak between the silver trim shows deep rich wood grain, the door guards
a restricted military area, cool fluorescent-tinted torch-light creating sharp reflections on
the silver, stone door frame with silver-painted accents, color palette: dark oak (#3A2210-#5A3A1A)
with bright silver (#8A8A9A-#C8C8D8) and oxidized silver (#5A5A6A), high quality game texture,
realistic materials with subtle stylization, cool atmospheric lighting, cinematic game art quality,
8K detail rendered at 512x512, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Heavy ornate locked door front view, reinforced dark oak with elaborate silver metal trim, prominent silver lock mechanism in center with oversized ornate keyhole with engraved geometric patterns, silver corner brackets with iron cross motif, three silver horizontal reinforcement bands with rivets, cool polished gleam with slight oxidation, deep rich wood grain, cool fluorescent-tinted torch-light, stone door frame with silver accents, high quality game texture, realistic materials, cool atmospheric lighting, cinematic quality, no text, no watermarks" \
  --output 3d-shooter/assets/textures/ \
  --filename door_locked_silver.png \
  --size 512x512
```

---

### 4.6 Exit Sign Texture

| Property | Value |
|----------|-------|
| **Filename** | `sign_exit.png` |
| **Model** | Flux Dev (`fal-ai/flux/dev`) |
| **Resolution** | 512x256 |

**Prompt:**
```
Vintage 1940s military facility exit sign mounted on a stone wall, rectangular metal sign
with the word EXIT in bold block capital letters, the sign is painted olive drab green with
white lettering, the metal is slightly dented and the paint is chipping at the edges revealing
bare steel underneath, a small red arrow pointing to the right, the sign is mounted with
visible bolts at each corner, a single bare incandescent bulb illuminates the sign from above
casting harsh downward light, the surrounding stone wall is dark and barely visible, the sign
has that authentic World War 2 military facility look, high quality game texture, realistic
materials with subtle stylization, dramatic focused lighting, cinematic game art quality,
8K detail rendered at 512x256, transparent background, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Vintage 1940s military facility exit sign mounted on stone wall, rectangular metal sign with word EXIT in bold block capital letters, olive drab green with white lettering, slightly dented with paint chipping at edges, small red arrow pointing right, mounted with visible bolts, single bare incandescent bulb illuminating from above, surrounding dark stone wall, authentic WW2 military facility look, high quality game texture, realistic materials, dramatic focused lighting, cinematic quality, no watermarks" \
  --output 3d-shooter/assets/textures/ \
  --filename sign_exit.png \
  --size 512x256
```

---

## 5. Skybox & Environment

### 5.1 German Castle Exterior (Window View)

| Property | Value |
|----------|-------|
| **Filename** | `skybox_castle_exterior.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 1024x512 |

**Prompt:**
```
View through a narrow stone castle window looking out at a dark mountainous landscape at night,
a menacing medieval German castle complex visible on a distant rocky cliff with towers and
battlements silhouetted against a deep navy blue night sky, searchlight beams sweeping across
the sky from watchtowers, a crescent moon partially obscured by heavy grey clouds, dark pine
forest covering the mountainsides below, the window frame is visible as dark stone edges in
the foreground creating a natural vignette, a few distant guard tower windows glowing with
warm amber light, the atmosphere is oppressive and militaristic, fog rolling through the valley
below the castle, color palette: deep navy sky (#0A0A2A to #1A1A4A), dark forest greens
(#0A1A0A to #1A2A1A), warm guard lights (#C8A832), cold searchlight beams (#B8B8C8),
panoramic wide format, high quality game environment art, cinematic game art quality,
8K detail rendered at 1024x512, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "View through narrow stone castle window at dark mountainous landscape at night, menacing medieval German castle on distant rocky cliff with towers silhouetted against deep navy night sky, searchlight beams sweeping from watchtowers, crescent moon partially obscured by heavy clouds, dark pine forest on mountainsides, stone window frame edges as foreground vignette, distant guard tower windows glowing amber, fog rolling through valley, panoramic wide format, high quality game environment art, cinematic quality, no text, no watermarks" \
  --output 3d-shooter/assets/textures/ \
  --filename skybox_castle_exterior.png \
  --size 1024x512
```

---

### 5.2 Night Sky with Searchlights

| Property | Value |
|----------|-------|
| **Filename** | `skybox_night_sky.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 2048x512 |

**Prompt:**
```
Panoramic night sky suitable for a 360-degree skybox, deep dark navy blue sky graduating from
near-black at the zenith to dark grey-blue at the horizon, heavy dramatic cumulus clouds
backlit by moonlight with silver edges, three powerful searchlight beams crossing the sky at
different angles, the searchlights are yellowish-white cones of light cutting through thin
cloud layers, scattered dim stars visible in the clear patches between clouds, no moon visible
to avoid breaking the tiling, the horizon line shows a dark tree-line silhouette of pine forest,
the overall mood is wartime surveillance and menace, the sky must tile seamlessly horizontally,
color palette: deep navy (#08081A to #1A1A3A) with silver cloud edges (#8A8A9A) and searchlight
beams (#C8C8A8), high quality seamless panoramic skybox texture, cinematic game art quality,
8K detail rendered at 2048x512, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Panoramic night sky for 360-degree skybox, deep dark navy blue sky graduating from near-black at zenith to dark grey-blue at horizon, heavy dramatic cumulus clouds backlit by moonlight with silver edges, three powerful searchlight beams crossing sky at different angles, scattered dim stars in clear patches, dark tree-line silhouette at horizon, wartime surveillance mood, must tile seamlessly horizontally, deep navy with silver cloud edges and searchlight beams, high quality seamless panoramic skybox texture, cinematic quality, no text, no watermarks" \
  --output 3d-shooter/assets/textures/ \
  --filename skybox_night_sky.png \
  --size 2048x512
```

---

## 6. UI / HUD Assets

### 6.1 HUD Bar Design

| Property | Value |
|----------|-------|
| **Filename** | `hud_bar.png` |
| **Model** | Flux Dev (`fal-ai/flux/dev`) |
| **Resolution** | 1024x128 |

**Prompt:**
```
Wide horizontal HUD bar design for a retro FPS game, dark steel grey metallic bar spanning
the full width, the bar has a riveted industrial look with raised border edges, divided into
sections: left section for face portrait (empty square frame with riveted border), center-left
for health display area, center for ammo display area, center-right for score display area,
right section for weapon indicator, small separator rivets between each section, the metal
has a brushed gunmetal finish with subtle wear marks, tiny indicator lights along the top edge
(some green some red), the overall design modernizes the classic Wolfenstein 3D status bar
while keeping its DNA, transparent background above the bar, color palette: gunmetal grey
(#3A3A4A to #6A6A7A) with rivet highlights (#8A8A9A) and brass accents (#8A7A4A),
high quality game UI asset, clean precise design, pixel-perfect edges, cinematic game art
quality, 8K detail rendered at 1024x128, transparent background, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Wide horizontal HUD bar for retro FPS game, dark steel grey metallic bar spanning full width, riveted industrial look with raised border edges, divided into sections for face portrait and stats, small separator rivets between sections, brushed gunmetal finish with subtle wear, tiny indicator lights along top edge, modernizes classic Wolfenstein 3D status bar, transparent background above bar, gunmetal grey with rivet highlights and brass accents, high quality game UI asset, clean precise design, cinematic quality, transparent background, no watermarks" \
  --output 3d-shooter/assets/sprites/ \
  --filename hud_bar.png \
  --size 1024x128
```

---

### 6.2 BJ Blazkowicz Face Sprites

Generate each health state as a separate image. These are iconic to Wolfenstein 3D.

#### Face - 100% Health (Full Health)

| Property | Value |
|----------|-------|
| **Filename** | `face_health_100.png` |
| **Model** | Flux Dev (`fal-ai/flux/dev`) |
| **Resolution** | 128x128 |

**Prompt:**
```
Portrait of a determined male soldier face for a game HUD, square crop tight on the face,
the soldier is a muscular American commando with a strong square jaw, short blonde buzzcut hair,
intense blue eyes looking straight ahead, expression is confident and alert, the face is
clean with no injuries, healthy skin tone with slight stubble, military dog tags visible at
the very bottom of the frame, the lighting is dramatic from above with a dark background,
the style is a high-quality modernization of classic pixel art game portraits,
sharp digital painting style, game HUD face icon, square format 128x128, dark background,
no helmet, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type sprite \
  --prompt "Portrait of determined male soldier face for game HUD, square crop tight on face, muscular American commando with strong square jaw, short blonde buzzcut hair, intense blue eyes looking straight ahead, confident and alert expression, clean face no injuries, healthy skin with slight stubble, dramatic lighting from above with dark background, high-quality modernization of classic pixel art game portraits, sharp digital painting, game HUD face icon, square format, dark background, no helmet, no text, no watermarks" \
  --output 3d-shooter/assets/sprites/ \
  --filename face_health_100.png \
  --size 128x128
```

#### Face - 75% Health

| Property | Value |
|----------|-------|
| **Filename** | `face_health_75.png` |
| **Model** | Flux Dev (`fal-ai/flux/dev`) |
| **Resolution** | 128x128 |

**Prompt:**
```
Portrait of a male soldier face for a game HUD showing minor injuries, square crop tight on face,
muscular American commando with strong square jaw, short blonde buzzcut hair, intense blue eyes
with a slight grimace of pain, a small cut on the left cheek with a trickle of blood, a bruise
forming on the right temple, the expression is determined but showing discomfort, slightly furrowed
brow, skin still mostly healthy but with visible battle damage, dramatic lighting from above with
dark background, high-quality modernized pixel art game portrait style, sharp digital painting,
game HUD face icon, square format 128x128, dark background, no helmet, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type sprite \
  --prompt "Portrait of male soldier face for game HUD showing minor injuries, square crop tight on face, muscular American commando with strong square jaw, short blonde buzzcut, intense blue eyes with slight grimace, small cut on left cheek with blood trickle, bruise on right temple, determined but showing discomfort, slightly furrowed brow, dramatic lighting from above with dark background, modernized pixel art game portrait, sharp digital painting, game HUD face icon, square format, dark background, no helmet, no text, no watermarks" \
  --output 3d-shooter/assets/sprites/ \
  --filename face_health_75.png \
  --size 128x128
```

#### Face - 50% Health

| Property | Value |
|----------|-------|
| **Filename** | `face_health_50.png` |
| **Model** | Flux Dev (`fal-ai/flux/dev`) |
| **Resolution** | 128x128 |

**Prompt:**
```
Portrait of a male soldier face for a game HUD showing moderate injuries, square crop tight on face,
muscular American commando with strong square jaw, short blonde buzzcut hair now mussed and dirty,
blue eyes squinting with pain, a bleeding gash across the forehead with blood running down the left
side of the face, a swollen black eye on the right side, split lip with blood, the expression is
strained but still fighting, gritted teeth visible, skin is pale from blood loss with dirt and
soot smudges, dramatic lighting from above with dark background, high-quality modernized pixel art
game portrait style, sharp digital painting, game HUD face icon, square format 128x128,
dark background, no helmet, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type sprite \
  --prompt "Portrait of male soldier face for game HUD showing moderate injuries, square crop tight on face, muscular American commando with buzzcut now mussed and dirty, blue eyes squinting with pain, bleeding gash across forehead with blood running down left side, swollen black eye on right, split lip with blood, strained but still fighting expression, gritted teeth, pale skin with dirt and soot, dramatic lighting from above with dark background, modernized pixel art game portrait, sharp digital painting, game HUD face icon, square format, dark background, no helmet, no text, no watermarks" \
  --output 3d-shooter/assets/sprites/ \
  --filename face_health_50.png \
  --size 128x128
```

#### Face - 25% Health

| Property | Value |
|----------|-------|
| **Filename** | `face_health_25.png` |
| **Model** | Flux Dev (`fal-ai/flux/dev`) |
| **Resolution** | 128x128 |

**Prompt:**
```
Portrait of a severely injured male soldier face for a game HUD, square crop tight on face,
muscular American commando barely recognizable under heavy injuries, blonde buzzcut matted with
blood, both eyes swollen with one nearly shut, deep lacerations across the face with heavy
bleeding, broken nose, the expression is desperate and barely conscious but still defiant,
jaw clenched with blood between the teeth, skin is deathly pale under layers of blood and grime,
the face shows extreme trauma but the eyes still hold a spark of determination, dramatic lighting
from above with dark background, high-quality modernized pixel art game portrait style,
sharp digital painting, game HUD face icon, square format 128x128, dark background,
no helmet, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type sprite \
  --prompt "Portrait of severely injured male soldier face for game HUD, square crop tight on face, muscular American commando barely recognizable under heavy injuries, blonde buzzcut matted with blood, both eyes swollen with one nearly shut, deep lacerations with heavy bleeding, broken nose, desperate barely conscious but still defiant expression, jaw clenched with blood between teeth, deathly pale under blood and grime, dramatic lighting from above with dark background, modernized pixel art game portrait, sharp digital painting, game HUD face icon, square format, dark background, no helmet, no text, no watermarks" \
  --output 3d-shooter/assets/sprites/ \
  --filename face_health_25.png \
  --size 128x128
```

#### Face - Near Death (< 10% Health)

| Property | Value |
|----------|-------|
| **Filename** | `face_health_critical.png` |
| **Model** | Flux Dev (`fal-ai/flux/dev`) |
| **Resolution** | 128x128 |

**Prompt:**
```
Portrait of a near-death male soldier face for a game HUD, square crop tight on face,
the commando is on the verge of death, blonde hair completely soaked in blood, face is
a mask of blood and injuries with barely any clean skin visible, eyes are half-closed and
glazed with one completely swollen shut, mouth hanging slightly open, the expression is
one of pure survival instinct with no higher thought, skin is grey-white from massive blood
loss visible under the red, the face droops slightly suggesting loss of muscle control,
this is the moment before death, dramatic harsh lighting from above with dark background,
high-quality modernized pixel art game portrait style, sharp digital painting, game HUD face
icon, square format 128x128, dark background, no helmet, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type sprite \
  --prompt "Portrait of near-death male soldier face for game HUD, square crop tight on face, commando on verge of death, blonde hair soaked in blood, face is mask of blood with barely any clean skin, eyes half-closed glazed with one swollen shut, mouth hanging slightly open, pure survival instinct expression, grey-white skin from massive blood loss, face droops slightly, moment before death, dramatic harsh lighting from above with dark background, modernized pixel art game portrait, sharp digital painting, game HUD face icon, square format, dark background, no helmet, no text, no watermarks" \
  --output 3d-shooter/assets/sprites/ \
  --filename face_health_critical.png \
  --size 128x128
```

#### Face - God Mode (Invincibility Grin)

| Property | Value |
|----------|-------|
| **Filename** | `face_god_mode.png` |
| **Model** | Flux Dev (`fal-ai/flux/dev`) |
| **Resolution** | 128x128 |

**Prompt:**
```
Portrait of a male soldier face with an insane wide grin for a game HUD god mode state,
square crop tight on face, muscular American commando with perfect health, short blonde
buzzcut, glowing bright golden-yellow eyes (supernatural invincibility effect), an unnervingly
wide manic grin showing all teeth, the expression is pure gleeful invincible power,
the skin has a faint golden glow suggesting supernatural protection, the lighting is bright
and dramatic with a warm golden tint, veins slightly visible with a golden luminescence,
this is the face of a man who cannot be killed and knows it, dark background with subtle
golden light emanating from the face, high-quality modernized pixel art game portrait style,
sharp digital painting, game HUD face icon, square format 128x128, dark background,
no helmet, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type sprite \
  --prompt "Portrait of male soldier face with insane wide grin for game HUD god mode, square crop tight on face, muscular American commando with perfect health, short blonde buzzcut, glowing bright golden-yellow eyes supernatural invincibility effect, unnervingly wide manic grin showing all teeth, pure gleeful invincible power expression, faint golden glow skin suggesting supernatural protection, bright dramatic golden-tinted lighting, face of a man who cannot be killed, dark background with subtle golden emanation, modernized pixel art game portrait, sharp digital painting, game HUD face icon, square format, dark background, no helmet, no text, no watermarks" \
  --output 3d-shooter/assets/sprites/ \
  --filename face_god_mode.png \
  --size 128x128
```

---

### 6.3 Key Icons

#### Gold Key

| Property | Value |
|----------|-------|
| **Filename** | `icon_key_gold.png` |
| **Model** | Flux Dev (`fal-ai/flux/dev`) |
| **Resolution** | 64x64 |

**Prompt:**
```
Golden ornate skeleton key game icon, antique brass and gold metal key with elaborate bow
featuring an eagle motif, the shaft has decorative grooves, the bit (teeth) are complex,
the key has a warm golden metallic gleam with slight tarnish for age, small subtle glow
effect around the key suggesting it is a special item, viewed from a slight angle to show
depth, transparent background, game pickup icon style, clean sharp edges, 64x64 pixel art
quality but rendered in high detail, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type sprite \
  --prompt "Golden ornate skeleton key game icon, antique brass and gold metal key with elaborate bow featuring eagle motif, decorative shaft grooves, complex bit teeth, warm golden metallic gleam with slight tarnish, small subtle glow effect, viewed from slight angle, transparent background, game pickup icon, clean sharp edges, high detail, no text, no watermarks" \
  --output 3d-shooter/assets/sprites/items/ \
  --filename icon_key_gold.png \
  --size 64x64
```

#### Silver Key

| Property | Value |
|----------|-------|
| **Filename** | `icon_key_silver.png` |
| **Model** | Flux Dev (`fal-ai/flux/dev`) |
| **Resolution** | 64x64 |

**Prompt:**
```
Silver ornate skeleton key game icon, polished silver metal key with elaborate bow featuring
an iron cross motif, the shaft has geometric grooves, the bit (teeth) are complex angular
design, the key has a cool silver metallic gleam with slight oxidation darkening in recesses,
small subtle cool white glow effect around the key suggesting it is a special item, viewed
from a slight angle to show depth, transparent background, game pickup icon style, clean
sharp edges, 64x64 pixel art quality but rendered in high detail, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type sprite \
  --prompt "Silver ornate skeleton key game icon, polished silver metal key with elaborate bow featuring iron cross motif, geometric shaft grooves, complex angular bit teeth, cool silver metallic gleam with slight oxidation, small subtle cool white glow, viewed from slight angle, transparent background, game pickup icon, clean sharp edges, high detail, no text, no watermarks" \
  --output 3d-shooter/assets/sprites/items/ \
  --filename icon_key_silver.png \
  --size 64x64
```

---

### 6.4 Weapon Pickup Icons

| Property | Value |
|----------|-------|
| **Filenames** | `icon_weapon_pistol.png`, `icon_weapon_machinegun.png`, `icon_weapon_chaingun.png`, `icon_weapon_rocketlauncher.png` |
| **Model** | Flux Dev (`fal-ai/flux/dev`) |
| **Resolution** | 128x64 each |

**Pistol Prompt:**
```
WW2 era Luger pistol game pickup icon, side view profile, the pistol is rendered in detailed
gunmetal grey with dark wooden grip, slight gleam on the barrel, resting on invisible surface,
transparent background, game weapon pickup icon, clean precise rendering, slight warm highlight
from ambient light, no hands no holster just the weapon, high quality game asset, no text,
no watermarks
```

**Machine Gun Prompt:**
```
WW2 era MP40 submachine gun game pickup icon, side view profile, the weapon is rendered in
detailed dark blued steel with folding metal stock extended, wooden grip visible, magazine
inserted, slight gleam on the barrel, transparent background, game weapon pickup icon, clean
precise rendering, no hands just the weapon, high quality game asset, no text, no watermarks
```

**Chaingun Prompt:**
```
WW2 era chain gun rotary weapon game pickup icon, side view profile, a multi-barrel rotary
gun with ammo belt feeding from a box, heavy industrial military weapon, dark gunmetal steel
with brass ammunition visible, transparent background, game weapon pickup icon, clean precise
rendering, no hands just the weapon, high quality game asset, no text, no watermarks
```

**Rocket Launcher Prompt:**
```
WW2 era Panzerschreck rocket launcher game pickup icon, side view profile, olive drab tube
launcher with shoulder rest and sight, a rocket projectile visible in the tube end, the weapon
looks heavy and powerful, transparent background, game weapon pickup icon, clean precise rendering,
no hands just the weapon, high quality game asset, no text, no watermarks
```

**Generate commands:**
```bash
./scripts/generate-asset.sh --type sprite --prompt "WW2 era Luger pistol game pickup icon, side view profile, detailed gunmetal grey with dark wooden grip, slight gleam on barrel, transparent background, game weapon pickup icon, clean precise rendering, no hands just weapon, high quality game asset, no text, no watermarks" --output 3d-shooter/assets/sprites/items/ --filename icon_weapon_pistol.png --size 128x64

./scripts/generate-asset.sh --type sprite --prompt "WW2 era MP40 submachine gun game pickup icon, side view profile, dark blued steel with folding metal stock, wooden grip, magazine inserted, transparent background, game weapon pickup icon, clean precise rendering, no hands just weapon, high quality game asset, no text, no watermarks" --output 3d-shooter/assets/sprites/items/ --filename icon_weapon_machinegun.png --size 128x64

./scripts/generate-asset.sh --type sprite --prompt "WW2 era chain gun rotary weapon game pickup icon, side view profile, multi-barrel rotary gun with ammo belt and box, dark gunmetal steel with brass ammunition, transparent background, game weapon pickup icon, clean precise rendering, no hands just weapon, high quality game asset, no text, no watermarks" --output 3d-shooter/assets/sprites/items/ --filename icon_weapon_chaingun.png --size 128x64

./scripts/generate-asset.sh --type sprite --prompt "WW2 era Panzerschreck rocket launcher game pickup icon, side view profile, olive drab tube launcher with shoulder rest and sight, rocket visible in tube end, heavy powerful weapon, transparent background, game weapon pickup icon, clean precise rendering, no hands just weapon, high quality game asset, no text, no watermarks" --output 3d-shooter/assets/sprites/items/ --filename icon_weapon_rocketlauncher.png --size 128x64
```

---

### 6.5 HUD Number Font

| Property | Value |
|----------|-------|
| **Filenames** | `hud_numbers_0.png` through `hud_numbers_9.png` and `hud_percent.png` |
| **Model** | Flux Dev (`fal-ai/flux/dev`) |
| **Resolution** | 32x48 each |
| **Alternative** | Use a bitmap font rendered from a TTF. Recommend: Press Start 2P or Perfect DOS VGA 437 |

**Note:** For HUD numbers, procedural rendering from a web font is strongly recommended over AI generation. Use `Press Start 2P` from Google Fonts or render a custom bitmap font sheet. AI generation of individual numerals is unreliable for consistency.

**Fallback approach:** Generate a single number sheet with all digits:

**Prompt:**
```
Game HUD number font sheet showing digits 0 1 2 3 4 5 6 7 8 9 arranged in a single row,
military stencil style with sharp angular edges, each digit is bright amber-gold on
transparent background, the numbers have a slight 3D embossed metallic look, consistent
size and spacing between all digits, retro FPS game aesthetic, clean pixel-perfect rendering,
high quality game UI asset, transparent background, no other text, no watermarks
```

---

### 6.6 Menu Screens

#### Main Menu Background

| Property | Value |
|----------|-------|
| **Filename** | `menu_main_bg.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 1920x1080 |

**Prompt:**
```
Main menu background for a Wolfenstein 3D inspired FPS game, a dramatic scene showing a dark
medieval castle corridor stretching into the distance with flickering torch light casting
dancing shadows on grey stone walls, the perspective is first-person looking down the corridor,
a trail of spent bullet casings glints on the stone floor, Nazi-era red banners hang from the
walls with golden eagle emblems, the corridor disappears into ominous darkness at the far end,
atmospheric volumetric fog drifts through the hallway, dramatic cinematic lighting with strong
contrast between the warm torch pools and cold dark shadows, the composition leaves the center
and right side relatively dark and uncluttered for menu text overlay, AAA game quality menu
screen, photorealistic with slight painterly stylization, widescreen 16:9 format,
no text, no UI elements, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Main menu background for Wolfenstein 3D inspired FPS game, dramatic dark medieval castle corridor stretching into distance with flickering torch light, first-person perspective, trail of spent bullet casings on stone floor, red banners with golden eagle emblems on walls, corridor disappears into ominous darkness, atmospheric volumetric fog, dramatic cinematic lighting, composition leaves center and right dark for menu overlay, AAA game quality menu screen, photorealistic with slight painterly stylization, widescreen 16:9, no text, no UI elements, no watermarks" \
  --output 3d-shooter/assets/sprites/ \
  --filename menu_main_bg.png \
  --size 1920x1080
```

#### Difficulty Select Screen Backgrounds

| Property | Value |
|----------|-------|
| **Filenames** | `difficulty_easy.png`, `difficulty_medium.png`, `difficulty_hard.png`, `difficulty_nightmare.png` |
| **Model** | Flux Dev (`fal-ai/flux/dev`) |
| **Resolution** | 256x256 each |

**Easy ("Can I Play, Daddy?") Prompt:**
```
Portrait of a scared baby in a military helmet that is way too big, comically oversized helmet
falling over the eyes, the baby has a worried pouty expression, holding a tiny rubber toy pistol,
warm soft lighting, humorous and non-threatening, game difficulty icon, painterly digital art
style, transparent background, no text, no watermarks
```

**Medium ("Don't Hurt Me") Prompt:**
```
Portrait of a nervous young soldier in a WW2 helmet with wide worried eyes, biting his lower lip
anxiously, holding a rifle that he is clearly uncomfortable with, sweat drops on the forehead,
the expression says he would rather be anywhere else, moderate dramatic lighting, game difficulty
icon, painterly digital art style, transparent background, no text, no watermarks
```

**Hard ("Bring 'Em On!") Prompt:**
```
Portrait of a hardened veteran soldier with a fierce confident scowl, square jaw set with
determination, cigar clenched between teeth with smoke curling up, scars across the face from
previous battles, intense narrowed eyes, muscular neck and broad shoulders visible, holding a
machine gun casually, aggressive dramatic lighting from below, game difficulty icon, painterly
digital art style, transparent background, no text, no watermarks
```

**Nightmare ("I Am Death Incarnate!") Prompt:**
```
Portrait of a terrifying demonic skull-faced soldier, glowing red eyes burning with supernatural
fire, the face is half-human half-skeleton with torn flesh revealing bone, wearing a shredded
military uniform, holding dual weapons with skeletal hands, dark smoke and embers swirling around
the figure, hellish red backlighting, the most intense and frightening difficulty level,
game difficulty icon, painterly digital art style, transparent background, no text, no watermarks
```

**Generate commands:**
```bash
./scripts/generate-asset.sh --type sprite --prompt "Portrait of scared baby in oversized military helmet falling over eyes, worried pouty expression, holding tiny rubber toy pistol, warm soft lighting, humorous non-threatening, game difficulty icon, painterly digital art, transparent background, no text, no watermarks" --output 3d-shooter/assets/sprites/ --filename difficulty_easy.png --size 256x256

./scripts/generate-asset.sh --type sprite --prompt "Portrait of nervous young soldier in WW2 helmet with wide worried eyes, biting lower lip anxiously, holding rifle uncomfortably, sweat drops on forehead, moderate dramatic lighting, game difficulty icon, painterly digital art, transparent background, no text, no watermarks" --output 3d-shooter/assets/sprites/ --filename difficulty_medium.png --size 256x256

./scripts/generate-asset.sh --type sprite --prompt "Portrait of hardened veteran soldier with fierce confident scowl, square jaw with cigar clenched between teeth, scars across face, intense narrowed eyes, muscular, holding machine gun casually, aggressive dramatic lighting from below, game difficulty icon, painterly digital art, transparent background, no text, no watermarks" --output 3d-shooter/assets/sprites/ --filename difficulty_hard.png --size 256x256

./scripts/generate-asset.sh --type sprite --prompt "Portrait of terrifying demonic skull-faced soldier, glowing red eyes with supernatural fire, half-human half-skeleton face with torn flesh, shredded military uniform, holding dual weapons with skeletal hands, dark smoke and embers, hellish red backlighting, game difficulty icon, painterly digital art, transparent background, no text, no watermarks" --output 3d-shooter/assets/sprites/ --filename difficulty_nightmare.png --size 256x256
```

---

### 6.7 Loading Screen Art

| Property | Value |
|----------|-------|
| **Filename** | `loading_screen.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 1920x1080 |

**Prompt:**
```
Loading screen art for a Wolfenstein 3D inspired FPS game, a close-up view of stone castle
wall with dramatic side-lighting, a single torch mounted on the wall casting a warm pool of
light, shadows of prison bars cast across the wall from an unseen window, the composition is
simple and moody with large areas of dark shadow suitable for placing a loading bar overlay,
a spent bullet casing lies on the stone floor in the lower foreground catching the torchlight,
atmospheric dust particles visible in the light beam, the mood is tense and foreboding,
the image should work as a background with UI elements on top, widescreen 16:9,
AAA game quality, photorealistic with painterly stylization, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Loading screen art for Wolfenstein 3D inspired FPS game, close-up stone castle wall with dramatic side-lighting, single torch casting warm pool of light, shadows of prison bars cast across wall, simple moody composition with large dark areas for loading bar overlay, spent bullet casing on stone floor catching torchlight, atmospheric dust particles, tense foreboding mood, works as background with UI on top, widescreen 16:9, AAA quality, photorealistic with painterly stylization, no text, no watermarks" \
  --output 3d-shooter/assets/sprites/ \
  --filename loading_screen.png \
  --size 1920x1080
```

---

## 7. Sprite Sheets (Billboard Objects)

All sprites: **PNG with transparent background**. Sized for billboard rendering in the raycasting engine.

### 7.1 Food / Health Items

| Filename | Size | Description |
|----------|------|-------------|
| `item_turkey_leg.png` | 128x128 | Classic turkey leg health pickup |
| `item_dog_food.png` | 128x128 | Dog food bowl (small health) |
| `item_first_aid.png` | 128x128 | First aid kit (medium health) |
| `item_blood_pack.png` | 128x128 | Blood/medical pack (large health) |

**Turkey Leg Prompt:**
```
Cooked turkey leg game pickup item, a large golden-brown roasted turkey drumstick on a small
white plate, the meat is juicy with crispy skin glistening, steam rising from the hot food,
viewed from a 3/4 angle, the item is glowing with a subtle green health aura, game item
pickup sprite, transparent background, clean edges, high quality digital painting, Wolfenstein
3D inspired food pickup, no text, no watermarks
```

**Dog Food Prompt:**
```
Metal dog food bowl game pickup item, a dented aluminum pet bowl filled with brown kibble or
wet dog food, the bowl has visible scratches and wear, viewed from a 3/4 angle above, a tiny
subtle green glow indicating it is a health pickup despite being dog food, game item sprite,
transparent background, clean edges, high quality digital painting, retro FPS food pickup
humor, no text, no watermarks
```

**First Aid Kit Prompt:**
```
Military first aid kit game pickup item, a white metal box with a prominent red cross symbol
on the lid, the box has metal clasps and hinges with a slight dent on one corner, the white
paint is slightly chipped revealing metal underneath, viewed from a 3/4 angle, a subtle green
health glow emanating from the kit, game item pickup sprite, transparent background, clean
edges, high quality digital painting, WW2 era medical supplies, no text, no watermarks
```

**Blood Pack Prompt:**
```
Medical blood bag game pickup item, a red-filled transparent IV blood bag with tubing coiled
beside it, the bag has a white label with a red cross, the blood inside is dark crimson and
the bag is slightly bulging, viewed from a 3/4 angle, a strong green health glow around the
bag indicating major healing, game item pickup sprite, transparent background, clean edges,
high quality digital painting, no text, no watermarks
```

**Generate commands:**
```bash
./scripts/generate-asset.sh --type sprite --prompt "Cooked turkey leg game pickup item, large golden-brown roasted turkey drumstick on small white plate, juicy with crispy glistening skin, steam rising, 3/4 angle view, subtle green health aura glow, game item pickup sprite, transparent background, clean edges, high quality digital painting, Wolfenstein 3D food pickup, no text, no watermarks" --output 3d-shooter/assets/sprites/items/ --filename item_turkey_leg.png --size 128x128

./scripts/generate-asset.sh --type sprite --prompt "Metal dog food bowl game pickup item, dented aluminum pet bowl filled with brown kibble, visible scratches and wear, 3/4 angle view from above, tiny subtle green glow, game item sprite, transparent background, clean edges, high quality digital painting, retro FPS food pickup humor, no text, no watermarks" --output 3d-shooter/assets/sprites/items/ --filename item_dog_food.png --size 128x128

./scripts/generate-asset.sh --type sprite --prompt "Military first aid kit game pickup item, white metal box with prominent red cross symbol, metal clasps and hinges with slight dent, white paint slightly chipped, 3/4 angle view, subtle green health glow, game item pickup sprite, transparent background, clean edges, high quality digital painting, WW2 era medical supplies, no text, no watermarks" --output 3d-shooter/assets/sprites/items/ --filename item_first_aid.png --size 128x128

./scripts/generate-asset.sh --type sprite --prompt "Medical blood bag game pickup item, red-filled transparent IV blood bag with coiled tubing, white label with red cross, dark crimson blood slightly bulging, 3/4 angle view, strong green health glow, game item pickup sprite, transparent background, clean edges, high quality digital painting, no text, no watermarks" --output 3d-shooter/assets/sprites/items/ --filename item_blood_pack.png --size 128x128
```

---

### 7.2 Treasure Items

| Filename | Size | Description |
|----------|------|-------------|
| `item_golden_cross.png` | 128x128 | Gold cross (100 pts) |
| `item_chalice.png` | 128x128 | Gold chalice (500 pts) |
| `item_treasure_chest.png` | 128x128 | Treasure chest (1000 pts) |
| `item_crown.png` | 128x128 | Royal crown (5000 pts) |

**Golden Cross Prompt:**
```
Ornate golden cross game treasure pickup, a solid gold medieval cross with jewel inlays,
small rubies set at each arm terminus, the gold surface is highly polished and reflective
with engraved decorative borders, the cross stands upright, warm golden light radiating
from the cross with a subtle sparkle effect, viewed from slightly above at a 3/4 angle,
game treasure item sprite, transparent background, clean edges, high quality digital painting,
WW2 era looted religious artifact, no text, no watermarks
```

**Chalice Prompt:**
```
Ornate golden chalice game treasure pickup, a tall golden goblet with a wide bowl and
decorative stem with twisted metalwork, jeweled rim with small emeralds and rubies embedded,
the gold surface is polished to a mirror finish, warm golden light emanating from the chalice
with subtle sparkle particles, viewed from a 3/4 angle, game treasure item sprite,
transparent background, clean edges, high quality digital painting, medieval religious
treasure artifact, no text, no watermarks
```

**Treasure Chest Prompt:**
```
Open treasure chest game pickup, a wooden chest with brass corner reinforcements and a
curved lid opened to reveal glinting gold coins, gems, and jewelry spilling out, the wood
is dark aged oak with iron banding, the treasure inside glows with warm golden light,
coins tumbling out the front, viewed from a 3/4 angle above, game treasure item sprite,
transparent background, clean edges, high quality digital painting, classic game loot chest,
no text, no watermarks
```

**Crown Prompt:**
```
Royal golden crown game treasure pickup, an ornate European royal crown with a velvet red
cushion cap, tall golden framework set with large diamonds rubies sapphires and emeralds,
golden cross at the top, the crown has a regal presence with brilliant light reflections off
the gem facets, viewed from a 3/4 angle slightly above, strong golden glow surrounding the
crown with sparkle particles, the highest value treasure in the game, game treasure item sprite,
transparent background, clean edges, high quality digital painting, no text, no watermarks
```

**Generate commands:**
```bash
./scripts/generate-asset.sh --type sprite --prompt "Ornate golden cross game treasure pickup, solid gold medieval cross with jewel inlays, small rubies at each arm terminus, highly polished engraved surface, warm golden light radiating with sparkle effect, 3/4 angle view, game treasure item sprite, transparent background, clean edges, high quality digital painting, no text, no watermarks" --output 3d-shooter/assets/sprites/items/ --filename item_golden_cross.png --size 128x128

./scripts/generate-asset.sh --type sprite --prompt "Ornate golden chalice game treasure pickup, tall golden goblet with decorative twisted stem, jeweled rim with emeralds and rubies, polished mirror finish, warm golden light with sparkle particles, 3/4 angle view, game treasure item sprite, transparent background, clean edges, high quality digital painting, medieval religious treasure, no text, no watermarks" --output 3d-shooter/assets/sprites/items/ --filename item_chalice.png --size 128x128

./scripts/generate-asset.sh --type sprite --prompt "Open treasure chest game pickup, wooden chest with brass reinforcements, curved lid open revealing gold coins gems and jewelry spilling out, dark aged oak with iron banding, treasure glows golden, coins tumbling out front, 3/4 angle view from above, game treasure item sprite, transparent background, clean edges, high quality digital painting, classic game loot chest, no text, no watermarks" --output 3d-shooter/assets/sprites/items/ --filename item_treasure_chest.png --size 128x128

./scripts/generate-asset.sh --type sprite --prompt "Royal golden crown game treasure pickup, ornate European royal crown with velvet red cap, tall golden framework with diamonds rubies sapphires emeralds, golden cross at top, brilliant light reflections off gem facets, strong golden glow with sparkle particles, 3/4 angle from above, highest value game treasure, game treasure item sprite, transparent background, clean edges, high quality digital painting, no text, no watermarks" --output 3d-shooter/assets/sprites/items/ --filename item_crown.png --size 128x128
```

---

### 7.3 Ammo Pickups

| Filename | Size | Description |
|----------|------|-------------|
| `item_ammo_pistol.png` | 128x128 | Pistol ammo clip |
| `item_ammo_machinegun.png` | 128x128 | Machine gun ammo box |

**Pistol Ammo Prompt:**
```
WW2 era pistol ammunition clip game pickup, a single Luger magazine with brass 9mm rounds
visible at the top, the magazine is dark blued steel, 4-5 brass cartridges visible loaded
in the magazine, viewed from a 3/4 angle, slight metallic gleam, game ammo pickup sprite,
transparent background, clean edges, high quality digital painting, military equipment,
no text, no watermarks
```

**Machine Gun Ammo Prompt:**
```
WW2 era machine gun ammunition box game pickup, a small olive drab metal ammo can with a
flip-top lid partially open showing a belt of linked brass cartridges inside, the can has
stamped military markings visible as impressions (not readable text), viewed from a 3/4 angle,
the brass ammo glints warmly, game ammo pickup sprite, transparent background, clean edges,
high quality digital painting, military equipment, no text, no watermarks
```

**Generate commands:**
```bash
./scripts/generate-asset.sh --type sprite --prompt "WW2 era pistol ammunition clip game pickup, single Luger magazine with brass 9mm rounds visible at top, dark blued steel magazine, 4-5 brass cartridges loaded, 3/4 angle view, slight metallic gleam, game ammo pickup sprite, transparent background, clean edges, high quality digital painting, military equipment, no text, no watermarks" --output 3d-shooter/assets/sprites/items/ --filename item_ammo_pistol.png --size 128x128

./scripts/generate-asset.sh --type sprite --prompt "WW2 era machine gun ammunition box game pickup, small olive drab metal ammo can with flip-top lid partially open showing belt of linked brass cartridges, stamped military impressions not readable text, 3/4 angle view, brass ammo glints warmly, game ammo pickup sprite, transparent background, clean edges, high quality digital painting, military equipment, no text, no watermarks" --output 3d-shooter/assets/sprites/items/ --filename item_ammo_machinegun.png --size 128x128
```

---

### 7.4 Decorative / Environment Sprites

| Filename | Size | Description |
|----------|------|-------------|
| `decor_potted_plant.png` | 128x256 | Potted plant (tall) |
| `decor_vase.png` | 128x128 | Decorative vase |
| `decor_table_set.png` | 192x128 | Table with plates/candles |
| `decor_bones_pile.png` | 192x128 | Pile of bones |
| `decor_blood_pool.png` | 192x128 | Pool of blood on floor |
| `decor_barrel.png` | 128x192 | Wooden barrel |
| `decor_armor_stand.png` | 128x256 | Suit of armor on stand |
| `decor_chandelier.png` | 192x128 | Hanging chandelier |

**Potted Plant Prompt:**
```
Tall potted plant in a medieval castle, a large dark clay or stone urn with a wilting green
plant growing from it, the plant has broad dark green leaves that droop slightly from neglect,
a few dead leaves on the floor beside the pot, the urn has simple carved decorative bands,
the plant adds a rare touch of life to the oppressive stone corridors, torch-lit from one side
casting the plant shadow on an invisible wall, game decoration sprite, transparent background,
viewed from front, full height visible, high quality digital painting, no text, no watermarks
```

**Bones Pile Prompt:**
```
Pile of old bones on a dungeon floor game decoration, scattered human skeletal remains including
a skull, ribcage fragments, femur bones, and vertebrae, the bones are yellowed with age and
some are cracked, a rusted iron shackle and chain lies among the bones, small cobwebs connect
some of the bones, dark staining on the floor beneath suggesting long decay, viewed from slightly
above at a 3/4 angle, torch-lit from the side, game decoration sprite, transparent background,
clean edges, high quality digital painting, dungeon horror element, no text, no watermarks
```

**Blood Pool Prompt:**
```
Pool of fresh dark blood on a stone floor game decoration, a large irregular pool of dark
crimson blood spreading across grey flagstones, the blood is thick and viscous with slight
reflections on the surface, darker at the center lighter at the spreading edges, small
splatter drops around the main pool, the blood has seeped into the grout lines between stones,
viewed from directly above, flat top-down perspective, game decoration sprite, transparent
background, clean edges, high quality digital painting, horror element, no text, no watermarks
```

**Generate commands:**
```bash
./scripts/generate-asset.sh --type sprite --prompt "Tall potted plant in medieval castle, large dark clay urn with wilting green plant, broad dark green drooping leaves, few dead leaves beside pot, simple carved decorative bands on urn, rare touch of life in oppressive corridors, torch-lit from one side, game decoration sprite, transparent background, front view full height, high quality digital painting, no text, no watermarks" --output 3d-shooter/assets/sprites/items/ --filename decor_potted_plant.png --size 128x256

./scripts/generate-asset.sh --type sprite --prompt "Decorative ceramic vase in medieval castle, ornate dark glazed pottery vase with painted floral motifs, sits on invisible surface, slight chip on the rim, warm torch-lit, game decoration sprite, transparent background, front view, high quality digital painting, no text, no watermarks" --output 3d-shooter/assets/sprites/items/ --filename decor_vase.png --size 128x128

./scripts/generate-asset.sh --type sprite --prompt "Medieval table set with plates and candles, wooden table with two melted candles in iron holders, tin plates with food remnants, a pewter mug, viewed from 3/4 angle, torch-lit warm lighting, game decoration sprite, transparent background, clean edges, high quality digital painting, castle dining, no text, no watermarks" --output 3d-shooter/assets/sprites/items/ --filename decor_table_set.png --size 192x128

./scripts/generate-asset.sh --type sprite --prompt "Pile of old bones on dungeon floor, scattered human skeletal remains with skull ribcage fragments femurs, yellowed cracked bones, rusted iron shackle and chain among bones, cobwebs connecting some, 3/4 angle view from above, torch-lit, game decoration sprite, transparent background, clean edges, high quality digital painting, dungeon horror, no text, no watermarks" --output 3d-shooter/assets/sprites/items/ --filename decor_bones_pile.png --size 192x128

./scripts/generate-asset.sh --type sprite --prompt "Pool of fresh dark blood on stone floor, large irregular pool of dark crimson blood on grey flagstones, thick viscous with slight reflections, darker at center lighter at edges, splatter drops around, blood seeped into grout lines, top-down perspective, game decoration sprite, transparent background, clean edges, high quality digital painting, horror element, no text, no watermarks" --output 3d-shooter/assets/sprites/items/ --filename decor_blood_pool.png --size 192x128

./scripts/generate-asset.sh --type sprite --prompt "Wooden barrel in medieval castle, old oak barrel with iron hoops slightly rusted, some staves show age cracks, viewed from 3/4 front angle, torch-lit from side, game decoration sprite, transparent background, clean edges, high quality digital painting, castle storage, no text, no watermarks" --output 3d-shooter/assets/sprites/items/ --filename decor_barrel.png --size 128x192

./scripts/generate-asset.sh --type sprite --prompt "Suit of medieval armor on display stand, full plate armor with helmet visor down, standing on wooden cross-shaped base, the armor is dull grey steel with subtle dents and scratches from battle, viewed from front, torch-lit dramatic shadows, game decoration sprite, transparent background, full height, high quality digital painting, castle decoration, no text, no watermarks" --output 3d-shooter/assets/sprites/items/ --filename decor_armor_stand.png --size 128x256

./scripts/generate-asset.sh --type sprite --prompt "Medieval iron chandelier with candles, circular iron frame with six arms each holding a melted dripping candle with warm flames, chains going upward to mounting point, warm candlelight glow, viewed from below at angle, game decoration sprite, transparent background, clean edges, high quality digital painting, castle lighting, no text, no watermarks" --output 3d-shooter/assets/sprites/items/ --filename decor_chandelier.png --size 192x128
```

---

## 8. OG Image & Marketing

### 8.1 Game Banner (Social Sharing)

| Property | Value |
|----------|-------|
| **Filename** | `og_banner.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 1200x630 |

**Prompt:**
```
Epic game banner for a Wolfenstein 3D inspired browser FPS game, dramatic composition showing
a heroic American commando soldier from behind in silhouette standing at the entrance of a dark
medieval castle corridor, the corridor ahead is lit by flickering torches revealing stone walls
with red Nazi banners, the soldier holds a smoking machine gun at his side, spent casings on the
floor, enemy soldiers visible in the distance, the scene is cinematic with volumetric fog and
dramatic lighting, the left third of the image is darker and less cluttered for title text overlay,
warm and cool lighting contrast, AAA game promotional art quality, widescreen banner format,
photorealistic with dramatic painterly stylization, no text, no UI, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type og-image \
  --prompt "Epic game banner for Wolfenstein 3D inspired browser FPS, dramatic composition showing heroic American commando soldier from behind in silhouette at entrance of dark medieval castle corridor, corridor lit by flickering torches revealing stone walls with red banners, soldier holds smoking machine gun, spent casings on floor, enemy soldiers in distance, cinematic volumetric fog and dramatic lighting, left third darker for title text overlay, AAA game promotional art, widescreen banner, photorealistic with dramatic painterly stylization, no text, no UI, no watermarks" \
  --output 3d-shooter/assets/ \
  --filename og_banner.png
```

---

### 8.2 App Icon / Favicon

| Property | Value |
|----------|-------|
| **Filename** | `favicon.png` |
| **Model** | Flux Dev (`fal-ai/flux/dev`) |
| **Resolution** | 512x512 (will be downscaled to 32x32, 64x64, 128x128, 192x192) |

**Prompt:**
```
Game app icon for a Wolfenstein 3D inspired FPS, a simple bold iconic design: a golden eagle
emblem on a dark stone background with a red vertical stripe, the eagle has spread wings in
a heraldic pose, the stone texture is visible behind, the design is bold enough to read at
very small sizes (32x32 pixels), high contrast between the gold eagle and dark background,
square format, game icon design, clean edges, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type sprite \
  --prompt "Game app icon for Wolfenstein 3D inspired FPS, simple bold iconic design: golden eagle emblem on dark stone background with red vertical stripe, eagle has spread wings in heraldic pose, stone texture visible behind, bold enough to read at very small sizes, high contrast between gold eagle and dark background, square format, game icon design, clean edges, no text, no watermarks" \
  --output 3d-shooter/assets/ \
  --filename favicon.png \
  --size 512x512
```

---

### 8.3 Title Screen Art

| Property | Value |
|----------|-------|
| **Filename** | `title_screen.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 1920x1080 |

**Prompt:**
```
Title screen art for a Wolfenstein 3D inspired browser FPS game, a dramatic scene showing the
protagonist American commando facing the viewer in a heroic low-angle pose, standing in a
destroyed castle courtyard at night, fires burning in the background, the castle walls are
crumbling with battle damage, searchlight beams sweep the smoky sky, the commando has a
determined expression holding a machine gun across his chest, his uniform is battle-worn,
Nazi flags are torn and burning in the background, moonlight breaks through the clouds above,
the upper portion of the image has clear space for the game title, cinematic blockbuster
poster composition, AAA game quality, dramatic high-contrast lighting with rim-light on the
protagonist, widescreen 16:9, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Title screen art for Wolfenstein 3D inspired browser FPS, dramatic scene of protagonist American commando facing viewer in heroic low-angle pose, standing in destroyed castle courtyard at night, fires burning in background, crumbling castle walls with battle damage, searchlight beams sweep smoky sky, commando has determined expression holding machine gun, battle-worn uniform, torn burning flags in background, moonlight through clouds, upper portion clear for game title, cinematic blockbuster poster composition, AAA quality, dramatic high-contrast rim-lighting, widescreen 16:9, no text, no watermarks" \
  --output 3d-shooter/assets/ \
  --filename title_screen.png \
  --size 1920x1080
```

---

## 9. Cinematic Assets

### 9.1 Episode Intro Artwork

One artwork per episode. These display as full-screen illustrations between episodes.

#### Episode 1: "Escape from Castle Wolfenstein"

| Property | Value |
|----------|-------|
| **Filename** | `episode1_intro.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 1920x1080 |

**Prompt:**
```
Cinematic illustration for a game episode intro, a prisoner in torn military uniform chained
to a dungeon wall, the dungeon cell has blue-grey stone walls with iron bars on a window
showing moonlight, a dead guard lies on the floor with keys visible on his belt, the prisoner
(our hero) has just broken one chain and is reaching for a pistol on the floor near the guard,
his face shows fierce determination in the moonlight, the scene captures the moment of escape
beginning, dramatic chiaroscuro lighting with moonlight and torch-light, cinematic composition,
AAA game cutscene quality, painterly illustration style with photorealistic detail,
widescreen 16:9, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Cinematic illustration for game episode intro, prisoner in torn military uniform chained to dungeon wall, blue-grey stone cell with iron-barred window showing moonlight, dead guard on floor with keys on belt, prisoner has just broken one chain and reaches for pistol near guard, fierce determination in moonlight, moment of escape beginning, dramatic chiaroscuro with moonlight and torch-light, cinematic composition, AAA game cutscene quality, painterly illustration with photorealistic detail, widescreen 16:9, no text, no watermarks" \
  --output 3d-shooter/assets/sprites/ \
  --filename episode1_intro.png \
  --size 1920x1080
```

#### Episode 2: "Operation Eisenfaust"

| Property | Value |
|----------|-------|
| **Filename** | `episode2_intro.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 1920x1080 |

**Prompt:**
```
Cinematic illustration for a game episode intro, a secret underground laboratory beneath a
castle, strange purple-glowing vats containing grotesque failed experiments, Nazi scientists
in lab coats working at control panels, the scene is viewed from behind a stone pillar
(the hero is spying on them), wires and tubes connect the vats to large electrical generators,
the purple glow illuminates the scene with an eerie supernatural light, one vat in the
center is larger with something massive and terrifying barely visible inside, sparks of
electricity arc between machinery, the atmosphere is horror and mad science combined,
cinematic composition, AAA game cutscene quality, painterly illustration with photorealistic
detail, widescreen 16:9, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Cinematic illustration for game episode intro, secret underground laboratory beneath castle, strange purple-glowing vats containing grotesque experiments, scientists in lab coats at control panels, viewed from behind stone pillar as hero spies, wires and tubes connect vats to electrical generators, eerie purple supernatural glow, one larger vat with something massive inside, electricity sparks between machinery, horror and mad science atmosphere, cinematic composition, AAA game cutscene quality, painterly illustration with photorealistic detail, widescreen 16:9, no text, no watermarks" \
  --output 3d-shooter/assets/sprites/ \
  --filename episode2_intro.png \
  --size 1920x1080
```

#### Episode 3: "Die, Fuhrer, Die!"

| Property | Value |
|----------|-------|
| **Filename** | `episode3_intro.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 1920x1080 |

**Prompt:**
```
Cinematic illustration for a game episode intro, the hero commando soldier stands atop a
hill overlooking a massive fortified castle complex at dawn, the castle is the final enemy
stronghold with watchtowers searchlights and heavily armed guards visible on the battlements,
a vast army camp surrounds the castle with tents and vehicles, the hero is silhouetted against
a dramatic orange-red dawn sky, checking his weapons and ammunition before the final assault,
the mood is epic and decisive -- this is the final battle, dramatic wide establishing shot,
cinematic composition, AAA game cutscene quality, painterly illustration with photorealistic
detail, widescreen 16:9, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Cinematic illustration for game episode intro, hero commando soldier stands atop hill overlooking massive fortified castle complex at dawn, final enemy stronghold with watchtowers searchlights and armed guards on battlements, vast army camp surrounds castle with tents and vehicles, hero silhouetted against dramatic orange-red dawn sky checking weapons, epic and decisive final battle mood, dramatic wide establishing shot, cinematic composition, AAA game cutscene quality, painterly illustration with photorealistic detail, widescreen 16:9, no text, no watermarks" \
  --output 3d-shooter/assets/sprites/ \
  --filename episode3_intro.png \
  --size 1920x1080
```

---

### 9.2 Victory Screen

| Property | Value |
|----------|-------|
| **Filename** | `screen_victory.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 1920x1080 |

**Prompt:**
```
Victory screen art for a Wolfenstein 3D inspired FPS game, the hero commando stands triumphant
on top of a defeated castle, dawn breaking behind him with golden sunlight, his fist raised in
victory, the castle below is in ruins with fires dying out and smoke clearing, enemy flags are
fallen and trampled, freed prisoners emerge from the castle gates below, the sky transitions
from the dark night of battle to a bright hopeful golden dawn, birds fly in the distance,
the mood is triumphant relief and hard-won victory, the lower half of the image has space for
statistics overlay, cinematic heroic composition, AAA game quality, photorealistic with
painterly stylization, widescreen 16:9, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Victory screen art for Wolfenstein 3D FPS game, hero commando stands triumphant on defeated castle, dawn breaking with golden sunlight, fist raised in victory, castle in ruins with fires dying and smoke clearing, enemy flags fallen and trampled, freed prisoners emerge from gates, sky transitions from dark night to bright golden dawn, birds in distance, triumphant relief mood, lower half has space for stats overlay, cinematic heroic composition, AAA quality, photorealistic with painterly stylization, widescreen 16:9, no text, no watermarks" \
  --output 3d-shooter/assets/sprites/ \
  --filename screen_victory.png \
  --size 1920x1080
```

---

### 9.3 Death Screen / Game Over

| Property | Value |
|----------|-------|
| **Filename** | `screen_game_over.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 1920x1080 |

**Prompt:**
```
Game over death screen for a Wolfenstein 3D inspired FPS game, a dramatic first-person view
looking up from the ground as if the player has fallen, the ceiling of a stone castle corridor
is visible above with flickering torchlight, the view is tilted at an angle suggesting the
player has collapsed, blood splatters on the edges of the view creating a red vignette frame,
enemy soldier boots visible at the edge of the frame standing over the fallen hero, the scene
is going dark with heavy black vignetting from the edges as consciousness fades, the torchlight
flickers ominously, the mood is defeat and finality, dramatic dying perspective, widescreen
16:9, AAA game quality, dark and grim, photorealistic with painterly stylization,
no text, no UI, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Game over death screen for Wolfenstein 3D FPS game, dramatic first-person view looking up from ground as if player has fallen, stone castle corridor ceiling with flickering torchlight, tilted angle suggesting collapse, blood splatters on edges creating red vignette, enemy soldier boots visible standing over fallen hero, going dark with heavy black vignetting as consciousness fades, defeat and finality mood, dramatic dying perspective, widescreen 16:9, AAA quality, dark and grim, photorealistic with painterly stylization, no text, no UI, no watermarks" \
  --output 3d-shooter/assets/sprites/ \
  --filename screen_game_over.png \
  --size 1920x1080
```

---

### 9.4 Level Transition Screen

| Property | Value |
|----------|-------|
| **Filename** | `screen_level_complete.png` |
| **Model** | Flux Pro (`fal-ai/flux-pro/v1.1`) |
| **Resolution** | 1920x1080 |

**Prompt:**
```
Level complete transition screen for a Wolfenstein 3D inspired FPS game, the hero commando
walking through a heavy door into a new section of the castle, seen from behind in a corridor,
the door he came through shows battle damage with bullet holes and scorch marks, ahead through
the new door is darkness and unknown danger, the hero pauses at the threshold reloading his
weapon, spent casings and debris on the floor behind him, torch-lit corridor with dramatic
shadows, the composition has a large dark area in the upper half for level statistics overlay,
cinematic composition, AAA game quality, photorealistic with painterly stylization,
widescreen 16:9, no text, no watermarks
```

**Generate command:**
```bash
./scripts/generate-asset.sh \
  --type background \
  --prompt "Level complete transition screen for Wolfenstein 3D FPS, hero commando walking through heavy door into new castle section, seen from behind, door behind shows battle damage with bullet holes and scorch marks, darkness and unknown danger ahead, hero pauses at threshold reloading weapon, spent casings and debris behind, torch-lit corridor with dramatic shadows, large dark area in upper half for stats overlay, cinematic composition, AAA quality, photorealistic with painterly stylization, widescreen 16:9, no text, no watermarks" \
  --output 3d-shooter/assets/sprites/ \
  --filename screen_level_complete.png \
  --size 1920x1080
```

---

## 10. Asset Production Pipeline

### 10.1 Order of Operations

Generate assets in this specific order to establish visual foundations first:

| Phase | Category | Count | Priority | Reason |
|-------|----------|-------|----------|--------|
| **Phase 1** | Wall textures (2.1-2.3, 2.5, 2.7-2.10) | 8 | CRITICAL | Defines the visual language; 90% of what the player sees |
| **Phase 2** | Floor & ceiling textures (3.1-3.6) | 6 | CRITICAL | Completes the environmental shell |
| **Phase 3** | Door textures (4.1-4.6) | 6 | HIGH | Player interacts with these constantly |
| **Phase 4** | Feature wall textures (2.2, 2.4, 2.6, 2.11-2.12) | 5 | HIGH | Adds visual variety and landmarks |
| **Phase 5** | Item sprites -- food & ammo (7.1, 7.3) | 6 | HIGH | Core gameplay loop items |
| **Phase 6** | Item sprites -- treasure & decor (7.2, 7.4) | 12 | MEDIUM | Scoring and atmosphere |
| **Phase 7** | HUD assets (6.1-6.5) | 12 | HIGH | Player interface |
| **Phase 8** | Key icons & weapon icons (6.3-6.4) | 6 | HIGH | Gameplay-critical UI |
| **Phase 9** | Menu screens & loading (6.6-6.7) | 3 | MEDIUM | Polish and presentation |
| **Phase 10** | Marketing assets (8.1-8.3) | 3 | MEDIUM | Needed for deployment |
| **Phase 11** | Cinematic art (9.1-9.4) | 7 | LOW | Narrative polish |
| **Phase 12** | Skybox & environment (5.1-5.2) | 2 | LOW | Only visible through windows |
| **Phase 13** | Difficulty select faces (6.6) | 4 | LOW | Nice-to-have detail |

**Total unique assets: ~80**

### 10.2 Quality Control Checklist

Run these checks on EVERY generated asset before committing:

#### Textures (walls, floors, ceilings)
- [ ] **Seamless tiling test**: Open in image editor, tile 3x3, zoom to seams -- no visible lines
- [ ] **Color consistency**: Compare hex values against master palette (Section 1)
- [ ] **Resolution check**: Exactly 512x512 (or specified size)
- [ ] **File format**: PNG for transparency, JPG for opaque textures (90% quality)
- [ ] **File size**: Under 500KB per texture (optimize if larger)
- [ ] **In-engine test**: Load in the raycaster, check at multiple distances
- [ ] **Darkness check**: Not too dark at 100% brightness -- player must be able to see detail

#### Sprites (items, decorations, UI)
- [ ] **Transparent background**: Verify alpha channel is clean (no white fringing)
- [ ] **Edge quality**: No jagged or aliased edges on the subject
- [ ] **Scale consistency**: Compare against other sprites in the same category
- [ ] **Readability**: Is the item instantly recognizable at game resolution?
- [ ] **Lighting direction**: All sprites lit from upper-left for consistency
- [ ] **File format**: PNG-24 with alpha
- [ ] **File size**: Under 200KB per sprite

#### Cinematic / Marketing Art
- [ ] **Resolution**: Full specified resolution, no upscaling artifacts
- [ ] **Composition**: Space left for text/UI overlays where noted
- [ ] **Mood consistency**: Matches the Wolfenstein dark atmosphere
- [ ] **No text/watermarks**: AI sometimes adds text despite prompts -- verify
- [ ] **No AI artifacts**: Check for extra fingers, melted faces, nonsensical details

### 10.3 Naming Conventions

```
textures/
  wall_{material}[_{variant}].png     # wall_grey_stone.png, wall_grey_stone_banner.png
  floor_{material}[_{room}].png       # floor_stone_dungeon.png, floor_wood_officer.png
  ceiling_{material}[_{variant}].png  # ceiling_concrete.png, ceiling_wood_beam.png
  door_{material}[_{variant}].png     # door_wood.png, door_locked_gold.png
  sign_{type}.png                     # sign_exit.png
  skybox_{scene}.png                  # skybox_castle_exterior.png

sprites/
  items/
    item_{category}_{name}.png        # item_turkey_leg.png, item_ammo_pistol.png
    icon_{type}_{variant}.png         # icon_key_gold.png, icon_weapon_pistol.png
    decor_{name}.png                  # decor_potted_plant.png, decor_bones_pile.png

  face_health_{percent}.png           # face_health_100.png, face_health_25.png
  face_god_mode.png
  difficulty_{level}.png              # difficulty_easy.png, difficulty_nightmare.png
  hud_bar.png
  menu_main_bg.png
  loading_screen.png
  episode{N}_intro.png                # episode1_intro.png
  screen_{type}.png                   # screen_victory.png, screen_game_over.png

# Marketing (root assets/)
  og_banner.png
  favicon.png
  title_screen.png
```

### 10.4 Directory Structure

```
3d-shooter/assets/
  textures/
    wall_grey_stone.png
    wall_grey_stone_banner.png
    wall_blue_stone.png
    wall_blue_stone_cell.png
    wall_wood_paneling.png
    wall_wood_portrait.png
    wall_metal_steel.png
    wall_red_brick.png
    wall_purple_stone.png
    wall_brown_cave.png
    wall_elevator.png
    wall_secret_passage.png
    floor_stone_dungeon.png
    floor_wood_officer.png
    floor_metal_grating.png
    floor_carpet_red.png
    ceiling_concrete.png
    ceiling_wood_beam.png
    door_wood.png
    door_steel.png
    door_elevator.png
    door_locked_gold.png
    door_locked_silver.png
    sign_exit.png
    skybox_castle_exterior.png
    skybox_night_sky.png
  sprites/
    items/
      item_turkey_leg.png
      item_dog_food.png
      item_first_aid.png
      item_blood_pack.png
      item_golden_cross.png
      item_chalice.png
      item_treasure_chest.png
      item_crown.png
      item_ammo_pistol.png
      item_ammo_machinegun.png
      icon_key_gold.png
      icon_key_silver.png
      icon_weapon_pistol.png
      icon_weapon_machinegun.png
      icon_weapon_chaingun.png
      icon_weapon_rocketlauncher.png
      decor_potted_plant.png
      decor_vase.png
      decor_table_set.png
      decor_bones_pile.png
      decor_blood_pool.png
      decor_barrel.png
      decor_armor_stand.png
      decor_chandelier.png
    enemies/
      (existing enemy sprites)
    weapons/
      (existing weapon sprites)
    face_health_100.png
    face_health_75.png
    face_health_50.png
    face_health_25.png
    face_health_critical.png
    face_god_mode.png
    difficulty_easy.png
    difficulty_medium.png
    difficulty_hard.png
    difficulty_nightmare.png
    hud_bar.png
    menu_main_bg.png
    loading_screen.png
    episode1_intro.png
    episode2_intro.png
    episode3_intro.png
    screen_victory.png
    screen_game_over.png
    screen_level_complete.png
  og_banner.png
  favicon.png
  title_screen.png
```

### 10.5 Batch Generation Strategy

The fal.ai API has rate limits. Use this batch approach:

1. **Sequential by phase**: Run each phase completely before moving to the next
2. **Parallel within phase**: Run up to 3 concurrent generations (fal.ai queue handles this)
3. **Review after each phase**: Do QC checks before proceeding
4. **Re-generate failures**: Keep the prompt, adjust if needed, re-run
5. **Estimated time per asset**: ~10-30 seconds for Flux Dev, ~15-45 seconds for Flux Pro
6. **Estimated total time**: ~80 assets x 30 sec average = ~40 minutes pure generation time

**Batch script pattern:**
```bash
# Phase 1: Core wall textures (run 3 at a time)
# Batch 1a
./scripts/generate-asset.sh --type background --prompt "..." --output 3d-shooter/assets/textures/ --filename wall_grey_stone.png --size 512x512 &
./scripts/generate-asset.sh --type background --prompt "..." --output 3d-shooter/assets/textures/ --filename wall_blue_stone.png --size 512x512 &
./scripts/generate-asset.sh --type background --prompt "..." --output 3d-shooter/assets/textures/ --filename wall_wood_paneling.png --size 512x512 &
wait

# Batch 1b
./scripts/generate-asset.sh --type background --prompt "..." --output 3d-shooter/assets/textures/ --filename wall_metal_steel.png --size 512x512 &
./scripts/generate-asset.sh --type background --prompt "..." --output 3d-shooter/assets/textures/ --filename wall_red_brick.png --size 512x512 &
./scripts/generate-asset.sh --type background --prompt "..." --output 3d-shooter/assets/textures/ --filename wall_purple_stone.png --size 512x512 &
wait

# etc.
```

### 10.6 Seamless Tiling Verification Process

After generation, verify tiling for ALL wall/floor/ceiling textures:

1. **Quick visual check**: Use ImageMagick to create a 3x3 tiled preview:
   ```bash
   # Install if needed: brew install imagemagick
   convert wall_grey_stone.png wall_grey_stone.png wall_grey_stone.png +append \
     \( wall_grey_stone.png wall_grey_stone.png wall_grey_stone.png +append \) \
     \( wall_grey_stone.png wall_grey_stone.png wall_grey_stone.png +append \) \
     -append wall_grey_stone_tiled_preview.png
   ```

2. **Seam inspection**: Zoom into where tiles meet. Look for:
   - Color discontinuities at edges
   - Pattern breaks (lines that don't continue)
   - Brightness differences between tiles

3. **Fix non-tiling textures**: Use GIMP/Photoshop:
   - Filter > Other > Offset (50%, 50%) to center the seams
   - Clone/heal the seam lines
   - Re-offset to verify

4. **In-engine final test**: Load in the raycaster at high zoom to verify during gameplay

### 10.7 Asset Manifest

After generation, update the asset manifest at `3d-shooter/assets-generated.json`:

```json
{
  "project": "Wolfenstein 3D Browser Remake",
  "pipeline_version": "1.0.0",
  "generated_date": "2026-03-30",
  "tool": "fal.ai Flux API via generate-asset.sh",
  "total_assets": 80,
  "phases_completed": [],
  "assets": [
    {
      "file": "assets/textures/wall_grey_stone.png",
      "category": "wall_texture",
      "model": "fal-ai/flux-pro/v1.1",
      "size": "512x512",
      "prompt": "Seamless tiling stone wall texture...",
      "status": "pending",
      "qc_passed": false,
      "notes": ""
    }
  ]
}
```

---

## 11. Batch Generation Scripts

### 11.1 Phase 1: Core Wall Textures

Save as `scripts/generate-phase1-walls.sh`:

```bash
#!/bin/bash
# Phase 1: Core Wall Textures
# Run: bash scripts/generate-phase1-walls.sh
set -e

SCRIPT="./scripts/generate-asset.sh"
OUT="3d-shooter/assets/textures"
SIZE="512x512"

echo "=== PHASE 1: Core Wall Textures (8 assets) ==="

echo "[1/8] Grey stone wall..."
$SCRIPT --type background --size $SIZE --output $OUT/ --filename wall_grey_stone.png \
  --prompt "Seamless tiling stone wall texture, large hand-cut grey limestone blocks with visible mortar lines, medieval castle interior wall, stones slightly irregular with hairline cracks and centuries of wear, subtle moss traces in mortar joints, torch-lit warm amber highlights, rough hewn surface with chisel marks, cool greys with warm highlight accents, high quality seamless tiling game texture, realistic materials, dark atmospheric lighting, cinematic quality, no text, no watermarks"

echo "[2/8] Blue stone brick wall..."
$SCRIPT --type background --size $SIZE --output $OUT/ --filename wall_blue_stone.png \
  --prompt "Seamless tiling blue-grey stone brick wall texture, uniform rectangular cut stone blocks in running bond pattern, cold blue-grey coloration like slate or bluestone, tight mortar joints, smooth but weathered finish with subtle pitting and mineral deposits, fluorescent cool light from above, cold institutional prison-like feeling, high quality seamless tiling game texture, realistic materials, dark atmospheric lighting, cinematic quality, no text, no watermarks"

echo "[3/8] Wood paneling..."
$SCRIPT --type background --size $SIZE --output $OUT/ --filename wall_wood_paneling.png \
  --prompt "Seamless tiling dark wood wall paneling texture, rich mahogany panels in traditional wainscoting style with raised rectangular panel frames, deep warm brown with visible natural grain, narrow wooden molding strips, semi-polished showing years of use, warm amber torch-light creating golden sheen, military officer quarters, high quality seamless tiling game texture, realistic materials, dark atmospheric lighting, cinematic quality, no text, no watermarks"

echo "[4/8] Metal steel wall..."
$SCRIPT --type background --size $SIZE --output $OUT/ --filename wall_metal_steel.png \
  --prompt "Seamless tiling industrial metal wall texture, riveted steel plates bolted in grid pattern, brushed gunmetal finish with surface scratches, rust spots around rivets, faint oil stains, harsh overhead fluorescent lighting, cold industrial utilitarian, military bunker aesthetic, high quality seamless tiling game texture, realistic materials, dark atmospheric lighting, cinematic quality, no text, no watermarks"

echo "[5/8] Red brick wall..."
$SCRIPT --type background --size $SIZE --output $OUT/ --filename wall_red_brick.png \
  --prompt "Seamless tiling red brick wall texture, traditional running bond brickwork with color variation from dark burgundy to dusty terracotta, thick cream mortar joints, rough handmade quality with chips, black soot staining upper portion, torch-lit from side, high quality seamless tiling game texture, realistic materials, dark atmospheric lighting, cinematic quality, no text, no watermarks"

echo "[6/8] Purple stone..."
$SCRIPT --type background --size $SIZE --output $OUT/ --filename wall_purple_stone.png \
  --prompt "Seamless tiling purple-grey stone wall texture, large rough-cut blocks in ashlar pattern, unusual purple-grey coloration like dark amethyst-veined granite, nearly black mortar, slightly crystalline surface, deep cracks, dark purple supernatural staining, cold bluish-purple ambient light, unsettling alien atmosphere, high quality seamless tiling game texture, realistic materials, dark atmospheric lighting, cinematic quality, no text, no watermarks"

echo "[7/8] Brown cave stone..."
$SCRIPT --type background --size $SIZE --output $OUT/ --filename wall_brown_cave.png \
  --prompt "Seamless tiling rough brown cave stone wall texture, irregular natural rock face, warm earthy brown sandstone, deep crevices and natural fractures, patches of damp darker stone, tiny stalactite formations, gritty dust in cracks, sparse warm torch lighting with deep shadow, high quality seamless tiling game texture, realistic materials, dark atmospheric lighting, cinematic quality, no text, no watermarks"

echo "[8/8] Elevator wall..."
$SCRIPT --type background --size $SIZE --output $OUT/ --filename wall_elevator.png \
  --prompt "Seamless tiling elevator interior wall texture, industrial metal panels with vertical brushed steel finish, thin chrome trim strips, narrow control strip with indicator lights at mid-height, aged surface with minor scratches, ventilation grilles, darker kick-plate, overhead fluorescent lighting, 1940s military technology, high quality seamless tiling game texture, realistic materials, clean industrial lighting, cinematic quality, no text, no watermarks"

echo ""
echo "=== Phase 1 complete! Run QC checks on all 8 textures ==="
echo "Verify: tiling, color palette, resolution, file size"
```

### 11.2 Full Pipeline Runner

Save as `scripts/generate-all-wolf3d-assets.sh`:

```bash
#!/bin/bash
# Wolfenstein 3D Asset Pipeline - Full Runner
# Generates ALL assets in phase order
# Run: bash scripts/generate-all-wolf3d-assets.sh [phase_number]
set -e

PHASE=${1:-all}

echo "======================================"
echo "  WOLFENSTEIN 3D ASSET PIPELINE"
echo "  Target: 3d-shooter/assets/"
echo "======================================"
echo ""

if [ "$PHASE" = "all" ] || [ "$PHASE" = "1" ]; then
  echo ">>> Phase 1: Core Wall Textures"
  bash scripts/generate-phase1-walls.sh
  echo ""
fi

# Add additional phase scripts as they are created:
# if [ "$PHASE" = "all" ] || [ "$PHASE" = "2" ]; then
#   bash scripts/generate-phase2-floors.sh
# fi

echo "======================================"
echo "  PIPELINE COMPLETE"
echo "======================================"
echo "Next: Run QC checks, update assets-generated.json"
```

---

## Summary

| Category | Asset Count | Model | Est. Generation Time |
|----------|-------------|-------|---------------------|
| Wall textures | 12 | Flux Pro | ~6 min |
| Floor/ceiling textures | 6 | Flux Pro/Dev | ~3 min |
| Door textures | 6 | Flux Pro | ~3 min |
| Skybox/environment | 2 | Flux Pro | ~1 min |
| HUD assets | 1 | Flux Dev | ~30 sec |
| Face sprites | 6 | Flux Dev | ~3 min |
| Key/weapon icons | 6 | Flux Dev | ~3 min |
| Menu/loading screens | 3 | Flux Pro | ~2 min |
| Item sprites (food/ammo) | 6 | Flux Dev | ~3 min |
| Item sprites (treasure) | 4 | Flux Dev | ~2 min |
| Decoration sprites | 8 | Flux Dev | ~4 min |
| Marketing assets | 3 | Flux Pro/Dev | ~2 min |
| Cinematic art | 7 | Flux Pro | ~4 min |
| Difficulty faces | 4 | Flux Dev | ~2 min |
| Exit sign | 1 | Flux Dev | ~30 sec |
| **TOTAL** | **~75** | | **~40 min** |

**Estimated fal.ai API cost**: ~75 images x $0.03-0.05 per image = **$2.25 - $3.75 total**

---

**Document version**: 1.0.0
**Created**: 2026-03-30
**Author**: Asset Generator Agent
**Status**: Ready for execution
