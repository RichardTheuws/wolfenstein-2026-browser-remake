# Infernal Assault - Asset Creation Guide

This guide provides detailed specifications for all assets required for the Infernal Assault game, along with AI tool recommendations and creation tips to streamline your workflow.

## Table of Contents
1. [AI Tools Overview](#ai-tools-overview)
2. [Textures](#textures)
3. [Sprites](#sprites)
   - [Enemy Sprites](#enemy-sprites)
   - [Weapon Sprites](#weapon-sprites)
   - [Item Sprites](#item-sprites)
4. [Audio](#audio)
   - [Weapon Sounds](#weapon-sounds)
   - [Enemy Sounds](#enemy-sounds)
   - [Player Sounds](#player-sounds)
   - [Item Sounds](#item-sounds)
   - [Environment Sounds](#environment-sounds)
   - [UI Sounds](#ui-sounds)
   - [Music](#music)
5. [Fonts](#fonts)
6. [Asset Organization Tips](#asset-organization-tips)
7. [Quality Control Checklist](#quality-control-checklist)

## AI Tools Overview

Here are the recommended AI tools for creating different types of game assets:

| Asset Type | Recommended AI Tools | Best For |
|------------|----------------------|----------|
| Textures | Midjourney, Stable Diffusion, DALL-E 3 | Midjourney for detailed textures, DALL-E 3 for specific elements |
| Character Sprites | Midjourney, Stable Diffusion | Midjourney for consistent style, SD for customization |
| Weapon Sprites | Midjourney, DALL-E 3 | First-person perspective weapons |
| Item Sprites | DALL-E 3, Stable Diffusion | Simple items with clear silhouettes |
| Sound Effects | AudioCraft, ElevenLabs SFX | Custom sound effects with specific parameters |
| Music | Suno AI, Soundraw, AIVA | Thematic background music |
| Fonts | No AI needed - use free fonts | N/A |

## Textures

All textures should be tileable, at 512x512 pixels in JPG or PNG format.

| Filename    | Description                                      | AI Tool       | Prompt Tips |
|-------------|--------------------------------------------------|---------------|-------------|
| wall1.jpg   | Basic gray wall texture with subtle details      | Midjourney    | "Seamless tiling concrete wall texture, gray with subtle cracks, sci-fi facility, 512x512, top-down game asset" |
| wall2.jpg   | Alternative wall texture, more brown/orange tint | Midjourney    | "Seamless rusty metallic wall texture, industrial warm tones, tiling pattern for game, 512x512, top-down view" |
| floor.jpg   | Floor texture, concrete or stone material        | Stable Diffusion | "Seamless concrete floor texture, slightly worn, clean industrial, tiling pattern, 512x512, top-down game asset" |
| ceiling.jpg | Ceiling texture, darker than floor               | Stable Diffusion | "Seamless dark ceiling texture with vents and panels, industrial sci-fi, dim lighting, 512x512, top-down game asset" |

**Texture Creation Tips:**
1. **Midjourney**: Use the `--tile` parameter to create seamless textures directly
2. **Stable Diffusion**: Use "seamless" in your prompt and select models like "Seamless Textures" for best results
3. **Post-Processing**: Use GIMP or Photoshop with the "Offset" filter (Shift+Ctrl+O) to check and fix seams

To make textures tileable after AI generation:
1. Import the texture into GIMP or Photoshop
2. Apply Filters > Map > Make Seamless
3. Adjust contrast and brightness to match tone 
4. Save as JPG with 90-95% quality

## Sprites

### Enemy Sprites

All enemy sprites should use transparent backgrounds (PNG format) and should have both idle and attack animation frames.

| Filename          | Description                          | Size (px)  | AI Tool | Prompt Tips |
|-------------------|--------------------------------------|------------|---------|-------------|
| soldier_idle.png  | Basic enemy soldier - idle stance    | 256x256    | Midjourney | "Pixel art military soldier enemy sprite, front view, doom-style, transparent background, single frame" |
| soldier_attack.png| Soldier - attack animation           | 256x256    | Midjourney | "Pixel art military soldier attacking with gun, doom-style enemy sprite, action pose, transparent background" |
| demon_idle.png    | Melee demon enemy - idle stance      | 320x320    | Midjourney | "Retro-style demon monster sprite, front view, Doom-inspired enemy, pixelated, transparent background" |
| demon_attack.png  | Demon enemy - attack animation       | 320x320    | Midjourney | "Retro-style demon monster attacking pose, Doom-inspired enemy sprite, aggressive stance, pixelated, transparent background" |
| turret_idle.png   | Stationary turret - idle stance      | 256x256    | DALL-E 3 | "Pixel art automated gun turret, top-down view, retro Doom-style, facing forward, transparent background" |
| turret_attack.png | Turret - attack animation            | 256x256    | DALL-E 3 | "Pixel art automated gun turret firing, muzzle flash effect, retro Doom-style, transparent background" |
| boss_idle.png     | Level boss enemy - idle stance       | 512x512    | Stable Diffusion | "Massive cyberdemon boss sprite, Doom-style pixel art, menacing stance, front view, transparent background" |
| boss_attack.png   | Boss enemy - attack animation        | 512x512    | Stable Diffusion | "Massive cyberdemon boss sprite attacking, Doom-style pixel art, firing rockets, action pose, transparent background" |

**Enemy Sprite Tips:**
1. Request transparent backgrounds in every prompt
2. For consistent style, use the same AI model and similar prompt structure for related sprites
3. To remove backgrounds in post-processing:
   - Use [Remove.bg](https://www.remove.bg/) for quick automatic removal
   - Use GIMP/Photoshop for more precise control
4. For animation frames, generate multiple images with slight variations and compile them

### Weapon Sprites

Weapon sprites should be from a first-person perspective with transparent backgrounds (PNG format).

| Filename            | Description                       | Size (px)  | AI Tool | Prompt Tips |
|---------------------|-----------------------------------|------------|---------|-------------|
| pistol_idle.png     | Pistol in idle position           | 512x256    | Midjourney | "First-person view of pixelated pistol, Doom-style weapon sprite, bottom of frame, transparent background, game asset" |
| pistol_fire.png     | Pistol firing animation           | 512x256    | Midjourney | "First-person view of pixelated pistol firing with muzzle flash, Doom-style weapon sprite, transparent background" |
| shotgun_idle.png    | Shotgun in idle position          | 512x256    | DALL-E 3 | "First-person view of pixelated shotgun, Doom-style weapon sprite, positioned at bottom of frame, transparent background" |
| shotgun_fire.png    | Shotgun firing animation          | 512x256    | DALL-E 3 | "First-person view of pixelated shotgun firing with large muzzle flash, Doom-style weapon sprite, recoil animation, transparent background" |
| machinegun_idle.png | Machine gun in idle position      | 512x256    | Midjourney | "First-person view of heavy machine gun, Doom-style pixel art, bottom of frame, transparent background" |
| machinegun_fire.png | Machine gun firing animation      | 512x256    | Midjourney | "First-person view of heavy machine gun firing with muzzle flash, Doom-style pixel art, transparent background" |
| rocket_idle.png     | Rocket launcher in idle position  | 512x256    | DALL-E 3 | "First-person view of pixel art rocket launcher, Doom-style weapon sprite, transparent background" |
| rocket_fire.png     | Rocket launcher firing animation  | 512x256    | DALL-E 3 | "First-person view of pixel art rocket launcher firing, showing exhaust plume, Doom-style weapon sprite, transparent background" |
| plasma_idle.png     | Plasma gun in idle position       | 512x256    | Stable Diffusion | "First-person view of futuristic plasma gun, glowing blue elements, Doom-style pixel art, transparent background" |
| plasma_fire.png     | Plasma gun firing animation       | 512x256    | Stable Diffusion | "First-person view of futuristic plasma gun firing blue energy, Doom-style pixel art, transparent background" |
| chainsaw_idle.png   | Chainsaw in idle position         | 512x256    | Midjourney | "First-person view of pixel art chainsaw weapon, Doom-style, transparent background" |
| chainsaw_fire.png   | Chainsaw attack animation         | 512x256    | Midjourney | "First-person view of pixel art chainsaw weapon in use, blur motion effect, Doom-style, transparent background" |

**Weapon Sprite Tips:**
1. Position weapons at bottom of frame for proper first-person perspective
2. Keep weapon scale consistent between idle and firing frames
3. For weapon sprites, specify "first-person view" in every prompt
4. Use the same AI model for idle and firing variants of the same weapon

### Item Sprites

Item sprites should use transparent backgrounds (PNG format).

| Filename         | Description                     | Size (px) | AI Tool | Prompt Tips |
|------------------|---------------------------------|-----------|---------|-------------|
| health_small.png | Small health pack               | 128x128   | DALL-E 3 | "Small medical kit pickup sprite, red cross design, Doom-style pixel art, transparent background" |
| health_large.png | Large health pack               | 128x128   | DALL-E 3 | "Large medical kit pickup sprite, glowing red cross design, Doom-style pixel art, transparent background" |
| armor_small.png  | Small armor shard               | 128x128   | DALL-E 3 | "Small blue armor shard pickup sprite, Doom-style pixel art, transparent background" |
| armor_large.png  | Large armor plate               | 128x128   | DALL-E 3 | "Large blue body armor pickup sprite, Doom-style pixel art, metallic appearance, transparent background" |
| ammo_pistol.png  | Pistol ammo pickup              | 128x128   | Stable Diffusion | "Pistol ammo box pickup sprite, small bullets container, Doom-style pixel art, transparent background" |
| ammo_shotgun.png | Shotgun shells pickup           | 128x128   | Stable Diffusion | "Shotgun shells box pickup sprite, red shells, Doom-style pixel art, transparent background" |
| ammo_machinegun.png | Machine gun bullets pickup   | 128x128   | Stable Diffusion | "Machine gun ammo belt pickup sprite, Doom-style pixel art, transparent background" |
| ammo_rocket.png  | Rocket ammunition pickup        | 128x128   | Stable Diffusion | "Rocket launcher ammo pickup sprite, missile container, Doom-style pixel art, transparent background" |
| ammo_plasma.png  | Plasma cell pickup              | 128x128   | Stable Diffusion | "Glowing blue plasma cell pickup sprite, energy container, Doom-style pixel art, transparent background" |
| key_red.png      | Red key card/skull              | 128x128   | DALL-E 3 | "Red key card pickup sprite, glowing red, Doom-style pixel art, transparent background" |
| key_blue.png     | Blue key card/skull             | 128x128   | DALL-E 3 | "Blue key card pickup sprite, glowing blue, Doom-style pixel art, transparent background" |
| key_yellow.png   | Yellow key card/skull           | 128x128   | DALL-E 3 | "Yellow key card pickup sprite, glowing yellow, Doom-style pixel art, transparent background" |

**Item Sprite Tips:**
1. Make pickup items visually distinct with bright colors
2. Add subtle glow or highlight effects to make items stand out
3. Keep a consistent scale between similar item types
4. Use DALL-E 3 for precise item designs with specific details

## Audio

All audio files should be in MP3 format with 44.1kHz sample rate. Stereo for music, mono for sound effects.

### Weapon Sounds

| Filename          | Description                    | Length (sec) | AI Tool | Creation Tips |
|-------------------|--------------------------------|--------------|---------|---------------|
| pistol_fire.mp3   | Pistol firing sound            | 0.5 - 1.0    | AudioCraft | Generate "quick pistol shot, slight echo, metallic click" |
| shotgun_fire.mp3  | Shotgun firing sound           | 0.5 - 1.0    | ElevenLabs SFX | Generate "powerful shotgun blast with mechanical pump action" |
| machinegun_fire.mp3 | Machine gun firing sound     | 0.5 - 1.0    | AudioCraft | Generate "rapid machine gun fire, metallic and punchy" |
| rocket_fire.mp3   | Rocket launcher firing sound   | 0.5 - 1.0    | ElevenLabs SFX | Generate "rocket launcher firing with whoosh and explosion" |
| plasma_fire.mp3   | Plasma gun firing sound        | 0.5 - 1.0    | AudioCraft | Generate "energy weapon discharge, electric hum and blast" |
| chainsaw_idle.mp3 | Chainsaw idling sound (looping)| 2.0 - 3.0    | AudioCraft | Generate "chainsaw engine idling, steady mechanical noise" |
| chainsaw_attack.mp3 | Chainsaw attack sound        | 0.5 - 1.0    | AudioCraft | Generate "chainsaw cutting through material, revving high" |

**Alternative to AI:** [Freesound.org](https://freesound.org/) - search for "retro game weapon" sounds or "8-bit weapon"

### Enemy Sounds

| Filename         | Description                 | Length (sec) | AI Tool | Creation Tips |
|------------------|-----------------------------|--------------|---------|---------------|
| soldier_alert.mp3 | Soldier spotting player    | 0.5 - 1.5    | ElevenLabs | Generate "male soldier alert grunt or short phrase" |
| soldier_death.mp3 | Soldier death sound        | 1.0 - 2.0    | ElevenLabs | Generate "male soldier death cry, pained and dramatic" |
| demon_alert.mp3  | Demon spotting player       | 0.5 - 1.5    | AudioCraft | Generate "monster growl, deep and threatening" |
| demon_death.mp3  | Demon death sound           | 1.0 - 2.0    | AudioCraft | Generate "monster death roar, gurgling and pained" |
| turret_alert.mp3 | Turret activation sound     | 0.5 - 1.0    | AudioCraft | Generate "mechanical turret powering up, hydraulic and electronic" |
| turret_death.mp3 | Turret destruction sound    | 1.0 - 2.0    | AudioCraft | Generate "mechanical explosion, electrical failure" |
| boss_alert.mp3   | Boss enemy spotting player  | 1.0 - 2.0    | ElevenLabs | Generate "deep demonic roar, threatening and powerful" |
| boss_death.mp3   | Boss death sound            | 2.0 - 4.0    | ElevenLabs | Generate "extended demonic death cry, explosions and collapse" |

**Post-processing tip:** Use Audacity to add distortion, reverb, or pitch-shifting to make AI-generated sounds more game-appropriate

### Player Sounds

| Filename        | Description                 | Length (sec) | AI Tool | Creation Tips |
|-----------------|--------------------------|--------------|---------|---------------|
| player_pain.mp3 | Player taking damage sound  | 0.5 - 1.0    | ElevenLabs | Generate "male grunt of pain, quick and responsive" |
| player_death.mp3 | Player death sound         | 1.0 - 2.0    | ElevenLabs | Generate "male death cry, dramatic but not too long" |

### Item Sounds

| Filename         | Description               | Length (sec) | AI Tool | Creation Tips |
|------------------|---------------------------|--------------|---------|---------------|
| pickup_health.mp3 | Health pickup sound      | 0.3 - 0.7    | AudioCraft | Generate "positive pickup sound, medical tone, brief" |
| pickup_armor.mp3 | Armor pickup sound        | 0.3 - 0.7    | AudioCraft | Generate "metallic pickup sound, armor clinking" |
| pickup_ammo.mp3  | Ammo pickup sound         | 0.3 - 0.7    | AudioCraft | Generate "ammunition pickup, bullets rattling" |
| pickup_weapon.mp3 | Weapon pickup sound      | 0.5 - 1.0    | AudioCraft | Generate "heavy weapon pickup sound, metallic with impact" |
| pickup_key.mp3   | Key pickup sound          | 0.3 - 0.7    | AudioCraft | Generate "key pickup sound, important item chime" |

**Alternative approach:** Use a sound pack like ["Essential 8-bit Sounds"](https://assetstore.unity.com/packages/audio/sound-fx/essential-8-bit-sounds-151250) and adapt to your needs

### Environment Sounds

| Filename       | Description             | Length (sec) | AI Tool | Creation Tips |
|----------------|-------------------------|--------------|---------|---------------|
| door_open.mp3  | Door opening sound      | 0.5 - 1.5    | AudioCraft | Generate "heavy metal door sliding open, mechanical" |
| door_close.mp3 | Door closing sound      | 0.5 - 1.5    | AudioCraft | Generate "heavy metal door slamming shut" |
| switch.mp3     | Switch activation sound | 0.3 - 0.7    | AudioCraft | Generate "mechanical switch being flipped, click and power up" |
| explosion.mp3  | Explosion sound         | 1.0 - 2.0    | ElevenLabs SFX | Generate "powerful explosion with debris and echo" |

### UI Sounds

| Filename        | Description              | Length (sec) | AI Tool | Creation Tips |
|-----------------|--------------------------|--------------|---------|---------------|
| menu_select.mp3 | Menu option selection    | 0.1 - 0.3    | AudioCraft | Generate "UI menu selection click, digital and clean" |
| menu_confirm.mp3 | Menu option confirmation | 0.2 - 0.5    | AudioCraft | Generate "UI confirmation sound, positive tone" |

### Music

| Filename           | Description                | Length (sec) | AI Tool | Creation Tips |
|--------------------|----------------------------|--------------|---------|---------------|
| menu_theme.mp3     | Main menu background music | 60 - 180     | Suno AI | Generate "dark atmospheric synth theme, mysterious, slow tempo, looping" |
| level1.mp3         | Background music for level 1 | 120 - 240  | Suno AI | Generate "industrial action music, medium tempo, ominous, build-up and tension" |
| level2.mp3         | Background music for level 2 | 120 - 240  | Suno AI | Generate "intense combat music, faster tempo, aggressive percussion, dark synths" |
| boss.mp3           | Boss fight music           | 60 - 180     | Suno AI | Generate "epic boss battle theme, heavy drums, high intensity, menacing choir" |

**Music Creation Tips:**
1. Use Suno AI with detailed prompts specifying:
   - Mood (dark, intense, suspenseful)
   - Instruments (synths, drums, bass)
   - Tempo (slow for atmosphere, fast for action)
   - References (Doom soundtrack, industrial metal)

2. Alternatives to Suno:
   - [Soundraw](https://soundraw.io/) - AI music generation with genre control
   - [AIVA](https://www.aiva.ai/) - AI composer for video game music
   
3. For music editing:
   - Use Audacity to trim and loop sections
   - Add fade-in/fade-out for smooth looping
   - Normalize volume to -3dB for consistent levels

## Fonts

| Filename    | Description                                | Format    | Source |
|-------------|--------------------------------------------|-----------|--------|
| doom.woff2  | Main game font, inspired by classic Doom UI| WOFF2     | [Google Fonts - Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) or [Dafont - Perfect DOS VGA 437](https://www.dafont.com/perfect-dos-vga-437.font) |

**Font Tips:**
1. Use web-optimized formats (WOFF2) for best performance
2. Convert fonts using [Transfonter](https://transfonter.org/) if needed
3. For the authentic Doom look, try these free alternatives:
   - [Return to Doom](https://www.1001fonts.com/return-to-doom-font.html)
   - [Perfect DOS VGA 437](https://www.dafont.com/perfect-dos-vga-437.font)

## Asset Organization Tips

### Folder Structure
Maintain this strict folder structure for all assets:
```
/assets/
├── textures/       # All wall/floor/ceiling textures (JPG/PNG)
├── sprites/
│   ├── enemies/    # Enemy sprite sheets
│   ├── weapons/    # Weapon sprites (first-person view)
│   └── items/      # Pickup and collectible sprites
├── audio/
│   ├── weapons/    # Weapon sound effects
│   ├── enemies/    # Enemy vocalizations and sounds
│   ├── player/     # Player sounds (pain, death)
│   ├── items/      # Pickup sounds
│   ├── environment/# Doors, switches, explosions
│   ├── ui/         # Interface sounds
│   └── music/      # Background music tracks
├── fonts/          # Game fonts (WOFF2 format)
└── levels/         # JSON level definitions
```

### File Naming Conventions
1. Use lowercase with underscores for all filenames
2. Keep consistent naming patterns:
   - `[type]_[variant].extension` - e.g., `health_small.png`
   - `[enemy]_[state].extension` - e.g., `soldier_idle.png`

### Asset Creation Workflow

1. **Planning Phase**
   - Create a spreadsheet tracking all required assets
   - Group similar assets for batch creation
   - Prioritize core gameplay assets first

2. **Creation Phase**
   - Create textures first (walls, floors, ceilings)
   - Then create enemy sprites
   - Then create weapon sprites
   - Create item sprites
   - Generate audio assets
   - Test assets in game as you go

3. **Quality Control**
   - Check all textures for seamless tiling
   - Ensure sprites have transparent backgrounds
   - Verify audio files have consistent volume levels
   - Test in different browsers and devices

## Quality Control Checklist

- [ ] All textures are 512x512 pixels and tile seamlessly
- [ ] All sprites have transparent backgrounds
- [ ] Sprites are correctly sized and positioned
- [ ] Audio files are in MP3 format, 44.1kHz
- [ ] Music loops smoothly without audible breaks
- [ ] Sound effects have consistent volume levels
- [ ] Font is loaded correctly and displays properly
- [ ] All assets follow naming conventions
- [ ] Files are organized in the correct folders
- [ ] Total asset size is optimized for web delivery

## Quick Start Guide

1. **Generate Textures**
   - Use Midjourney with `--tile` parameter for wall textures
   - Create 4 basic textures first: wall1, wall2, floor, ceiling
   - Process in GIMP/Photoshop to ensure seamless tiling

2. **Create Sprite Assets**
   - Start with weapon sprites (most visible to player)
   - Use DALL-E 3 for item pickups with transparent backgrounds
   - Create enemy sprites with Midjourney or Stable Diffusion

3. **Generate Audio**
   - Use AudioCraft or ElevenLabs SFX for sound effects
   - Create music with Suno AI
   - Process audio in Audacity to normalize and add effects

4. **Test Assets In-Game**
   - Add assets progressively and test in the game environment
   - Adjust and refine as needed based on in-game appearance

## Additional Resources

- [Remove.bg](https://www.remove.bg/) - Automatic background removal for sprites
- [Audacity](https://www.audacityteam.org/) - Free audio editor for processing sounds
- [GIMP](https://www.gimp.org/) - Free image editor for texture work
- [Piskel](https://www.piskelapp.com/) - Free online sprite editor
- [TinyPNG](https://tinypng.com/) - Optimize PNG files without quality loss
- [Online Audio Converter](https://online-audio-converter.com/) - Convert audio to MP3
