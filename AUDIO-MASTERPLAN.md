# AUDIO-MASTERPLAN.md

# Infernal Assault — Definitive Audio Bible

**Version**: 1.0.0
**Date**: 2026-03-30
**Author**: Audio Director Agent
**Project**: Infernal Assault (Wolfenstein 3D Browser Remake)
**Engine**: Three.js + Web Audio API

---

## Table of Contents

1. [Audio Vision](#1-audio-vision)
2. [ElevenLabs Voice Acting — Enemy Voice Lines](#2-elevenlabs-voice-acting--enemy-voice-lines)
3. [Sound Effects (ElevenLabs SFX + Web Audio API)](#3-sound-effects-elevenlabs-sfx--web-audio-api)
4. [Music via Suno AI](#4-music-via-suno-ai)
5. [Web Audio API Architecture](#5-web-audio-api-architecture)
6. [Audio Production Pipeline](#6-audio-production-pipeline)
7. [Cinematic Audio](#7-cinematic-audio)
8. [Asset Directory Structure & Naming](#8-asset-directory-structure--naming)
9. [Implementation Priority & Timeline](#9-implementation-priority--timeline)
10. [Quality Control & Testing](#10-quality-control--testing)

---

## 1. Audio Vision

Wolfenstein 3D (1992) pioneered voice acting in first-person shooters. The German soldiers shouting "Mein Leben!" as they died became one of gaming's most iconic audio moments. Our remake must honor that legacy while elevating every sound to cinema quality.

**Core principles:**

- **Authenticity first.** German voice lines are non-negotiable. They ARE Wolfenstein.
- **Spatial immersion.** Hear enemies through walls. Footsteps approaching. Doors creaking in the distance.
- **Dynamic scoring.** Music shifts seamlessly between exploration, alert, combat, and boss states.
- **Retro soul, modern fidelity.** The spirit of Bobby Prince's MIDI compositions reborn as orchestral metal.
- **Performance budget.** All audio must run smoothly at 60 FPS in a browser. No exceptions.

**Audio budget targets:**
- Total audio assets: < 50 MB compressed (OGG/MP3)
- Max simultaneous SFX: 16 channels
- Music: 2 simultaneous streams (crossfade)
- Voice lines: Priority over SFX, max 4 simultaneous
- Latency target: < 50ms from trigger to playback

---

## 2. ElevenLabs Voice Acting — Enemy Voice Lines

### 2.1 Guard (Brown Uniform — Basic Soldier)

**Voice character description (ElevenLabs):**
Young German male, age 20-25. Clear but gruff voice. Slightly nervous energy -- he is a conscript, not a fanatic. Medium pitch. Slight breathiness when alarmed. Think: young soldier doing his duty, not expecting to encounter an Allied spy.

**Voice settings:**
- Stability: 0.45 (some variation for realism)
- Similarity Boost: 0.75
- Style: 0.30 (moderate expressiveness)

| ID | German Text | English Translation | Emotion/Delivery | Trigger Condition |
|----|-------------|--------------------|--------------------|-------------------|
| GRD-ALERT-01 | "Achtung!" | "Attention!" | Sharp, startled. Quick intake of breath before the word. | Enemy enters ALERT state (hears noise but hasn't seen player) |
| GRD-ALERT-02 | "Was war das?" | "What was that?" | Confused, slightly worried. Questioning tone. | Alternative alert line (random 50/50 with GRD-ALERT-01) |
| GRD-ALERT-03 | "Wer ist da?" | "Who's there?" | Nervous, voice slightly raised. | Alternative alert line (random 33/33/33 rotation) |
| GRD-SPOT-01 | "Halt!" | "Stop!" | Commanding, aggressive. Sharp and loud. | Enemy visually spots player for first time |
| GRD-SPOT-02 | "Halt! Stehenbleiben!" | "Stop! Stand still!" | Authoritative, shouting. Full military bark. | Alternative spot line |
| GRD-SPOT-03 | "Du da! Halt!" | "You there! Stop!" | Aggressive, pointing. Rising intonation on "Halt!" | Alternative spot line |
| GRD-ATK-01 | [combat grunt] | — | Short, aggressive. Exhaling with force. "Hah!" | Every 3rd-5th attack shot fired |
| GRD-ATK-02 | [combat grunt] | — | Louder, more strained. "Hyah!" | Random attack grunt variant |
| GRD-ATK-03 | "Stirb!" | "Die!" | Vicious, personal. Through gritted teeth. | Rare attack line (10% chance) |
| GRD-PAIN-01 | [pain grunt] | — | Sharp intake of breath + short cry. "Aagh!" | Player hits enemy (health > 50%) |
| GRD-PAIN-02 | [heavy pain grunt] | — | Deeper, more agonized. "Uungh!" | Player hits enemy (health < 50%) |
| GRD-DEATH-01 | **"Mein Leben!"** | **"My life!"** | **THE iconic line.** Drawn out, agonized, fading. Disbelief mixed with pain. Voice trails off. This MUST be perfect. | **Enemy dies (guaranteed on every guard death)** |
| GRD-DEATH-02 | "Nein...!" | "No...!" | Desperate, cut short by death. Weak, fading. | Rare death variant (15% chance, plays AFTER Mein Leben occasionally) |

**Production notes for "Mein Leben!":**
This is the single most important voice line in the entire game. Generate at least 8 variations. Select the best 3. The delivery must convey:
1. Genuine surprise — he did not expect to die today
2. Pain — he has been shot
3. Existential weight — "my life" is his final thought
4. Fade — voice weakens and trails off at the end

Duration: 1.0 - 1.8 seconds. NOT too fast, NOT too dramatic. Somewhere between a whisper and a scream.

---

### 2.2 SS Soldier (Blue Uniform — Elite)

**Voice character description (ElevenLabs):**
German male, age 28-35. Deep, authoritative voice with menacing calm. This is a true believer -- fanatical, disciplined, deadly. Lower pitch than the guard. Controlled aggression. He does not panic; he hunts.

**Voice settings:**
- Stability: 0.55 (more consistent, controlled)
- Similarity Boost: 0.80
- Style: 0.40 (expressive but controlled)

| ID | German Text | English Translation | Emotion/Delivery | Trigger Condition |
|----|-------------|--------------------|--------------------|-------------------|
| SS-ALERT-01 | "Schutzstaffel!" | "SS!" | Pride mixed with threat. A declaration: the elite are here. | Enemy enters ALERT state |
| SS-ALERT-02 | "Eindringling!" | "Intruder!" | Cold, professional. Like reporting a fact. | Alternative alert |
| SS-ALERT-03 | "Er ist hier." | "He is here." | Quiet menace. Almost a whisper. Chilling. | Alternative alert (close range detection) |
| SS-SPOT-01 | "Du!" | "You!" | Sharp, accusatory. One syllable loaded with lethal intent. | Spots player |
| SS-SPOT-02 | "Feuer!" | "Fire!" | Barking order to attack. Military precision. | Alternative spot (when multiple enemies present) |
| SS-SPOT-03 | "Keine Gnade!" | "No mercy!" | Zealous, almost gleeful. Battle cry. | Alternative spot |
| SS-ATK-01 | [aggressive battle cry] | — | Sustained, intimidating. "Raaah!" Low and powerful. | During sustained fire |
| SS-ATK-02 | "Fur das Reich!" | "For the Reich!" | Fanatical battle cry. Full commitment. | Rare attack line (8% chance) |
| SS-ATK-03 | [short battle bark] | — | Sharp. "Hah!" Punctuating each burst. | Every 4th attack |
| SS-PAIN-01 | [pain grunt] | — | Controlled. He absorbs pain. Short, suppressed grunt. | Hit at health > 50% |
| SS-PAIN-02 | [heavy pain] | — | Breaking through his composure. Longer, involuntary cry. | Hit at health < 50% |
| SS-DEATH-01 | [death scream] | — | **Defiant to the end.** A roar that becomes a gurgle. He dies fighting. 1.5-2.5 seconds. | Enemy death (primary) |
| SS-DEATH-02 | "Nein... das kann nicht..." | "No... this cannot..." | Disbelief. The elite do not fall. Fading, broken. | Death variant (20% chance) |
| SS-DEATH-03 | [violent death scream] | — | Pure rage. A scream of fury, not fear. Cut short. | Death variant (20% chance) |

---

### 2.3 Officer (White Uniform — Fast and Dangerous)

**Voice character description (ElevenLabs):**
German male, age 35-45. Aristocratic, sharp, clipped speech. Upper-class Prussian accent. High intelligence, low patience. He speaks quickly and precisely. Higher pitch than the SS, but with cutting authority. Think: a Gestapo interrogator who carries a pistol.

**Voice settings:**
- Stability: 0.50
- Similarity Boost: 0.75
- Style: 0.50 (high expressiveness -- officers are theatrical)

| ID | German Text | English Translation | Emotion/Delivery | Trigger Condition |
|----|-------------|--------------------|--------------------|-------------------|
| OFF-ALERT-01 | [sharp whistle] | — | Two-note descending whistle. Military alert signal. Piercing. | ALERT state |
| OFF-ALERT-02 | "Alarm!" | "Alarm!" | Crisp, urgent. Clipped pronunciation. Rolling the R slightly. | Alternative alert |
| OFF-ALERT-03 | "Sicherheitsbruch!" | "Security breach!" | Professional urgency. Reporting to an imagined command structure. | Alternative alert |
| OFF-SPOT-01 | "Spion!" | "Spy!" | Accusatory, disgusted. Spitting the word. Personal offense. | Spots player |
| OFF-SPOT-02 | "Ergreift ihn!" | "Seize him!" | Commanding, directing troops. Even alone, he gives orders. | Alternative spot |
| OFF-SPOT-03 | "Da bist du!" | "There you are!" | Satisfied, predatory. He has been looking for you. | Alternative spot (if player was hiding) |
| OFF-ATK-01 | [rapid fire yelling] | — | Rapid, staccato. "Ha! Ha! Ha!" matching his fast pistol shots. | During rapid fire attack |
| OFF-ATK-02 | "Verschwinde!" | "Disappear! / Get lost!" | Contemptuous. He is annoyed you exist. | Rare attack line (12% chance) |
| OFF-PAIN-01 | "Argh!" | — | Surprised more than pained. Officers are not supposed to get shot. | Hit at health > 50% |
| OFF-PAIN-02 | "Verdammt!" | "Damn!" | Frustrated, angry. Pain mixed with indignation. | Hit at health < 50% |
| OFF-DEATH-01 | [dramatic death cry] | — | Theatrical. A gasp, then a cry that cracks. He falls with drama. 1.5-2.0 seconds. | Death (primary) |
| OFF-DEATH-02 | "Das... Vaterland..." | "The... Fatherland..." | Final patriotic whisper. Fading, almost poetic. | Death variant (15% chance) |

---

### 2.4 Dogs (Attack Dogs)

**Voice character description (ElevenLabs SFX generation):**
German Shepherd. Aggressive, territorial. Deep chest resonance. These are trained military guard dogs -- not pets.

**Generation approach:** Use ElevenLabs Sound Effects API for these. Supplement with Web Audio API pitch-shifting for variation.

| ID | Description | Emotion/Delivery | Trigger Condition |
|----|-------------|-------------------|-------------------|
| DOG-ALERT-01 | Low growl, sustained | Deep chest growl. Menacing. 1.5-2.5 seconds. Rumbling. | ALERT state (senses player nearby) |
| DOG-ALERT-02 | Warning bark + growl | Single sharp bark followed by sustained growl. | Alternative alert |
| DOG-ATK-01 | Aggressive rapid barking | Frantic, explosive. 3-5 rapid barks. Snarling between barks. | Charging at player |
| DOG-ATK-02 | Snarling lunge | Short, violent snarl. The sound of jaws snapping. 0.3-0.5 seconds. | Melee attack lands |
| DOG-ATK-03 | Sustained vicious barking | Continuous aggressive barking. Looping. For chase sequences. | Extended pursuit |
| DOG-DEATH-01 | Yelp + whimper | Sharp high yelp of pain, trailing into a fading whimper. 1.0-1.5 seconds. | Dog killed |
| DOG-DEATH-02 | Short yelp | Quick yelp, cut short. Instant death from powerful weapon. 0.3-0.5 seconds. | Dog killed by high-damage weapon |

---

### 2.5 Mutants (Frankenstein's Creations)

**Voice character description (ElevenLabs):**
Inhuman. These are undead soldiers brought back to life by Dr. Schabbs' experiments. Voice should be wet, guttural, distorted. Imagine a human voice played through a broken speaker underwater. Use ElevenLabs with heavy post-processing: pitch shift down 30%, add reverb + distortion in Audacity.

**Voice settings:**
- Stability: 0.20 (maximum variation -- they are unstable creatures)
- Similarity Boost: 0.60
- Style: 0.60

| ID | German Text | English Translation | Emotion/Delivery | Trigger Condition |
|----|-------------|--------------------|--------------------|-------------------|
| MUT-ALERT-01 | [guttural moan] | — | Deep, wet, gurgling. Rising pitch. 1.5-2.0 seconds. Like air escaping a corpse. | ALERT state |
| MUT-ALERT-02 | [rasping groan] | — | Dry, rattling. Like broken vocal cords trying to speak. | Alternative alert |
| MUT-ALERT-03 | "Toooot..." | Attempting "Tod" (Death) | Broken, slurred attempt at speech. Haunting. The word never fully forms. | Rare alert (15% chance) |
| MUT-ATK-01 | [inhuman screech] | — | High-pitched, distorted. Metal scraping on metal quality. 0.5-1.0 seconds. | Attack/lunge |
| MUT-ATK-02 | [guttural roar] | — | Low, rumbling, building to a crescendo. Wet and thick. | Sustained attack |
| MUT-ATK-03 | [rapid clicking/chattering] | — | Jaw chattering rapidly. Teeth clacking. Mechanical and disturbing. | Close range attack |
| MUT-PAIN-01 | [distorted yelp] | — | Electronic distortion mixed with organic pain sound. Glitchy. | Taking damage |
| MUT-DEATH-01 | [extended death rattle] | — | **2.0-3.5 seconds.** Starts as a roar, degrades into wet gurgling, ends with a sigh of release. The creature finally finds peace. | Death (primary) |
| MUT-DEATH-02 | [mechanical whine-down] | — | Like a machine powering off. Electronic hum descending in pitch. Mixed with organic gasp. | Death variant (25% chance) |

**Post-processing pipeline for Mutant voices:**
1. Generate base voice line with ElevenLabs (male voice, low pitch setting)
2. In Audacity: pitch shift down 20-30%
3. Add "Reverb" preset: large hall, wet 60%
4. Add "Distortion" at 30-40%
5. Layer with a second copy pitch-shifted UP 15% at 20% volume (creates eerie harmonic)
6. Normalize to -3dB

---

### 2.6 Boss: Hans Grosse (Episode 1 Boss)

**Voice character description (ElevenLabs):**
Massive man. Deepest voice in the game. Slow, deliberate speech. Every word has weight. He is a wall of muscle wielding dual chainguns. He speaks like he has all the time in the world because he knows you cannot stop him. Bass-heavy. Slight echo to convey his enormous frame resonating.

**Voice settings:**
- Stability: 0.65 (consistent, confident)
- Similarity Boost: 0.85
- Style: 0.35

| ID | German Text | English Translation | Emotion/Delivery | Trigger Condition |
|----|-------------|--------------------|--------------------|-------------------|
| HG-INTRO-01 | "Guten Tag." | "Good day." | **Terrifyingly calm.** Pleasant greeting delivered with zero warmth. Pause before speaking. 2 seconds of silence, then... "Guten Tag." | Boss room entered (one-time cinematic) |
| HG-INTRO-02 | "Du bist also der Spion. Wie... enttauschend." | "So you are the spy. How... disappointing." | Contemptuous. Slow, measured. The pause before "enttauschend" is deliberate. | After intro line (cinematic sequence) |
| HG-ATK-01 | "Komm her!" | "Come here!" | Taunting, inviting. Almost playful. He WANTS you to get closer. | Phase transition (starts attacking) |
| HG-ATK-02 | [deep battle roar] | — | Low, sustained, building. Like a diesel engine revving. 2-3 seconds. | Chaingun spin-up |
| HG-ATK-03 | "Zu langsam!" | "Too slow!" | Mocking. He sees you trying to dodge. | Player narrowly avoids damage |
| HG-ATK-04 | "Ist das alles?" | "Is that all?" | Bored, unimpressed. | When player deals low damage |
| HG-PAIN-01 | [short grunt] | — | Barely registers pain. More surprised than hurt. "Hmph." | Hit at health > 75% |
| HG-PAIN-02 | "Nicht schlecht." | "Not bad." | Grudging respect. Still calm. | Hit at health 50-75% |
| HG-PAIN-03 | [angry growl] | — | Finally feeling it. Anger building. | Hit at health 25-50% |
| HG-PAIN-04 | "GENUG!" | "ENOUGH!" | Explosive rage. Voice cracks with fury. Triggers enrage phase. | Hit at health < 25% |
| HG-DEATH-01 | [extended death] | — | **3-4 seconds.** Starts with disbelief gasp, transitions to a deep groan, body hits floor with an exhale. The room feels empty after he falls. | Boss killed |
| HG-DEATH-02 | "Unmog... lich..." | "Impos... sible..." | Broken whisper. He cannot comprehend defeat. Last breath. | Overlaps with death sequence |

---

### 2.7 Boss: Dr. Schabbs (Episode 2 Boss)

**Voice character description (ElevenLabs):**
Mad scientist archetype. Thin, reedy voice with manic energy. Speaks too fast, giggles at inappropriate moments. German accent with an academic quality -- he enunciates precisely despite his insanity. Higher pitch, nasal. Think: a university professor who went insane.

**Voice settings:**
- Stability: 0.25 (very unstable -- he is unhinged)
- Similarity Boost: 0.70
- Style: 0.70 (maximum expression)

| ID | German Text | English Translation | Emotion/Delivery | Trigger Condition |
|----|-------------|--------------------|--------------------|-------------------|
| DS-INTRO-01 | "Ahh, ein neues Versuchskaninchen!" | "Ahh, a new guinea pig!" | Delighted, giggling. Rubbing hands together energy. | Boss room entered |
| DS-INTRO-02 | "Mein Experiment braucht... frisches Material." | "My experiment needs... fresh material." | Sinister calm. The pause is him looking you up and down. | After intro line |
| DS-ATK-01 | "Mein Experiment!" | "My experiment!" | Proud, possessive. He gestures at his mutant creations. Battle cry. | Sends mutants to attack |
| DS-ATK-02 | [mad cackling] | — | Unhinged laughter. High-pitched, breaking into wheezing. 2-3 seconds. | After throwing syringe attack |
| DS-ATK-03 | "Wunderbar! Wunderbar!" | "Wonderful! Wonderful!" | Ecstatic. He is enjoying the violence. Clapping energy. | Player takes significant damage |
| DS-ATK-04 | "Die Wissenschaft triumphiert!" | "Science triumphs!" | Grandiose declaration. Arms spread wide. | Phase 2 transition |
| DS-PAIN-01 | "Nein! Meine Arbeit!" | "No! My work!" | Panicked. His experiments matter more than his body. | Hit at health > 50% |
| DS-PAIN-02 | [angry shriek] | — | High-pitched, cracking. Indignant. How DARE you interrupt science? | Hit at health < 50% |
| DS-DEATH-01 | "Meine... Kreationen... leben... weiter..." | "My... creations... live... on..." | Dying whisper. Satisfied even in death. His legacy continues. 3-4 seconds. | Boss killed |
| DS-DEATH-02 | [maniacal dying laughter] | — | Laughing even as he dies. Fading into silence. Deeply unsettling. | Death variant layered with DS-DEATH-01 at 40% volume |

---

### 2.8 Boss: Hitler in Mech Suit (Episode 3 Boss — Phase 1)

**Voice character description (ElevenLabs):**
The voice is processed through a mechanical suit. Apply heavy band-pass filter (300Hz-3kHz), add metallic reverb, slight radio crackle. The voice underneath is high-strung, ranting, hysterical. Phase 1 is the mech suit; the voice is filtered and booming.

**Voice settings (base, before post-processing):**
- Stability: 0.30
- Similarity Boost: 0.65
- Style: 0.80

| ID | German Text | English Translation | Emotion/Delivery | Trigger Condition |
|----|-------------|--------------------|--------------------|-------------------|
| HM-INTRO-01 | "Die Wunderwaffe vernichtet alles!" | "The wonder weapon destroys everything!" | Megalomania. Voice booming through speakers. Distorted. | Boss room entered |
| HM-ATK-01 | "Stirb, Allierter Schweinehund!" | "Die, Allied pig-dog!" | Ranting fury. Classic villain energy. Spitting rage through metal. | Primary attack |
| HM-ATK-02 | "Meine Maschine ist unbesiegbar!" | "My machine is invincible!" | Arrogant pride. Patting the inside of his mech. | After blocking damage |
| HM-ATK-03 | [mechanical roar + voice] | — | Voice layered with hydraulic sounds and servo motors. A scream of metal and man. | Heavy weapon attack |
| HM-PAIN-01 | "Unmoeglich!" | "Impossible!" | Shocked. The mech IS supposed to be invincible. | Mech takes damage |
| HM-PAIN-02 | [sparking electronics + pain] | — | Mech voice glitching. Syllables repeating. "N-n-nein!" | Mech at low health |
| HM-DEATH-01 | [mech explosion + scream] | — | Metallic explosion. Voice emerges from the wreckage, screaming. Transition to Phase 2. | Mech destroyed |

**Post-processing for mech voice:**
1. Generate base voice line with ElevenLabs
2. Apply band-pass filter: 300Hz low cut, 3kHz high cut
3. Add metallic convolution reverb (small metal room impulse response)
4. Layer with servo motor hum at 15% volume
5. Add subtle radio crackle between words (amplitude modulation at 20Hz)

---

### 2.9 Boss: Hitler Without Mech (Episode 3 Boss — Phase 2)

**Voice character description (ElevenLabs):**
Now the voice is raw, unfiltered. He is wounded, enraged, desperate. The calm authority is gone -- pure hysteria. Voice cracks, goes between screaming and whimpering. This is a man who just had his invincibility ripped away.

**Voice settings:**
- Stability: 0.15 (maximum instability)
- Similarity Boost: 0.65
- Style: 0.90 (extreme expressiveness)

| ID | German Text | English Translation | Emotion/Delivery | Trigger Condition |
|----|-------------|--------------------|--------------------|-------------------|
| HP-INTRO-01 | "NEIN! NEIN! NEIN!" | "NO! NO! NO!" | Screaming, unhinged. Three escalating "Nein!"s. Each louder. | Phase 2 begins (mech destroyed) |
| HP-ATK-01 | "Ich vernichte dich mit blossen Handen!" | "I'll destroy you with my bare hands!" | Deranged rage. Voice breaking. | Starts attacking in Phase 2 |
| HP-ATK-02 | [enraged screaming] | — | Incoherent fury. Wordless screaming. Like a cornered animal. | During sustained attack |
| HP-ATK-03 | "Du wirst BRENNEN!" | "You will BURN!" | Prophetic rage. Voice drops low on "brennen" -- momentary cold fury. | Special attack |
| HP-PAIN-01 | [pain + rage] | — | Cannot separate pain from anger. Each hit makes him MORE aggressive. Growl-scream. | Taking damage |
| HP-DEATH-01 | "Eva..." | "Eva..." | **Sudden quiet.** A whisper. His last word is a name. Heartbreaking despite everything. 2 seconds of silence after. | Final death |
| HP-DEATH-02 | [extended death sequence] | — | **4-5 seconds.** Body collapses. Labored breathing. One final exhale. Silence. | Layered with HP-DEATH-01 |

---

### 2.10 Boss: Otto Giftmacher (Episode 4 Boss)

**Voice character description (ElevenLabs):**
Military commander. Baritone, barking. Every sentence is an order. He runs his domain like a military operation because that is exactly what it is. Crisp, efficient, no wasted words. Prussian precision.

**Voice settings:**
- Stability: 0.60
- Similarity Boost: 0.80
- Style: 0.40

| ID | German Text | English Translation | Emotion/Delivery | Trigger Condition |
|----|-------------|--------------------|--------------------|-------------------|
| OG-INTRO-01 | "Stellung halten! Feind gesichtet!" | "Hold position! Enemy sighted!" | Military bark. He is giving orders to his troops AND himself. | Boss room entered |
| OG-ATK-01 | "Feuer frei!" | "Open fire!" | Sharp command. Zero hesitation. | Attack begins |
| OG-ATK-02 | "Sektor sichern!" | "Secure the sector!" | Barking orders between attacks. Even in a duel, he commands. | Mid-fight |
| OG-ATK-03 | "Giftgas! Atmen Sie tief ein!" | "Poison gas! Breathe deeply!" | Dark humor. Cold smile in his voice. He IS the Giftmacher (poison maker). | Poison attack |
| OG-PAIN-01 | "Taktischer Ruckzug!" | "Tactical retreat!" | Even pain is military. He relabels retreating as strategy. | Hit at health > 50% |
| OG-PAIN-02 | [suppressed pain bark] | — | Short, disciplined. He will not show weakness to the enemy. | Hit at health < 50% |
| OG-DEATH-01 | "Mission... gescheitert..." | "Mission... failed..." | Final report. Even dying is a status update. Fading to nothing. | Boss killed |

---

### 2.11 Boss: Gretel Grosse (Episode 5 Boss)

**Voice character description (ElevenLabs):**
Hans Grosse's sister. Fierce, athletic female voice. Deep for a woman -- alto range. She is faster and more aggressive than her brother. Her voice drips with contempt for the player. She fights with personal vendetta if Hans was killed first. Slight breathiness from constant movement.

**Voice settings:**
- Stability: 0.40
- Similarity Boost: 0.75
- Style: 0.55

| ID | German Text | English Translation | Emotion/Delivery | Trigger Condition |
|----|-------------|--------------------|--------------------|-------------------|
| GG-INTRO-01 | "Du hast meinen Bruder getotet. Jetzt bist du dran." | "You killed my brother. Now it's your turn." | Cold fury. Controlled rage. Every word is a death sentence. | Boss room entered |
| GG-INTRO-02 | "Die Grosse-Familie vergisst nicht." | "The Grosse family does not forget." | Threatening promise. Family honor. | After intro line |
| GG-ATK-01 | "Fur Hans!" | "For Hans!" | Battle cry. Raw emotion breaking through discipline. | Attack begins |
| GG-ATK-02 | [fierce combat cry] | — | Powerful female warrior shout. Not a scream -- a roar. | During chaingun fire |
| GG-ATK-03 | "Zu langsam, Spion!" | "Too slow, spy!" | Taunting, enjoying the hunt. She is faster than you. | Player dodges |
| GG-PAIN-01 | [sharp pain hiss] | — | Hissing through teeth. Refuses to cry out. | Hit at health > 50% |
| GG-PAIN-02 | "Das wirst du bereuen!" | "You will regret that!" | Angry, intensified. Pain feeds her fury. | Hit at health < 50% |
| GG-DEATH-01 | "Hans... ich komme..." | "Hans... I am coming..." | Gentle, sad. She reunites with her brother. All fury gone. A whisper. | Boss killed |

---

### 2.12 Boss: General Fettgesicht (Episode 6 Boss)

**Voice character description (ElevenLabs):**
The deepest, most booming voice in the game. This man fills a room with his presence before he even speaks. Bass so low you feel it in your chest. Slow, deliberate, each word a hammer blow. He is the final boss-tier general -- corpulent, powerful, unmovable.

**Voice settings:**
- Stability: 0.70 (rock-solid confidence)
- Similarity Boost: 0.85
- Style: 0.30 (understated -- power speaks quietly)

| ID | German Text | English Translation | Emotion/Delivery | Trigger Condition |
|----|-------------|--------------------|--------------------|-------------------|
| GF-INTRO-01 | "Ich habe auf dich gewartet." | "I have been waiting for you." | Deep, resonant. Patient predator. He KNEW you were coming. | Boss room entered |
| GF-INTRO-02 | "Niemand verlasst mein Schloss lebendig." | "No one leaves my castle alive." | Statement of fact. Not a threat -- a historical observation. | After intro line |
| GF-ATK-01 | "VERNICHTUNG!" | "ANNIHILATION!" | Full volume. Walls shake. Single word that fills the arena. | Heavy weapon attack |
| GF-ATK-02 | [booming laughter] | — | Deep belly laugh. He ENJOYS this. Rumbling like distant thunder. 2-3 seconds. | Player deals minimal damage |
| GF-ATK-03 | "Wie eine Fliege." | "Like a fly." | Dismissive. You are an insect to him. | Swatting at player with area attack |
| GF-PAIN-01 | [surprised grunt] | — | First sign of surprise. Low "Hmm." He felt that one. | Hit at health > 60% |
| GF-PAIN-02 | "Beeindruckend." | "Impressive." | Genuine respect. Deep nod energy. | Hit at health 30-60% |
| GF-PAIN-03 | [thunderous roar] | — | The general finally unleashes. Earthquake in vocal form. | Hit at health < 30% (enrage) |
| GF-DEATH-01 | [titanic collapse] | — | **4-5 seconds.** Deep groan that shakes the room. Slow collapse. Impact thud. Final exhale like wind leaving a cave. | Boss killed |
| GF-DEATH-02 | "Das... Reich... fallt..." | "The... Reich... falls..." | Whispered. He speaks for more than himself. Historical weight. | Layered with GF-DEATH-01 |

---

### 2.13 Voice Line Implementation Summary

**Total unique voice lines:**

| Enemy Type | Alert | Spot | Attack | Pain | Death | Intro | TOTAL |
|------------|-------|------|--------|------|-------|-------|-------|
| Guard | 3 | 3 | 3 | 2 | 2 | - | **13** |
| SS Soldier | 3 | 3 | 3 | 2 | 3 | - | **14** |
| Officer | 3 | 3 | 2 | 2 | 2 | - | **12** |
| Dogs | 2 | - | 3 | - | 2 | - | **7** |
| Mutants | 3 | - | 3 | 1 | 2 | - | **9** |
| Hans Grosse | - | - | 4 | 4 | 2 | 2 | **12** |
| Dr. Schabbs | - | - | 4 | 2 | 2 | 2 | **10** |
| Hitler (Mech) | - | - | 3 | 2 | 1 | 1 | **7** |
| Hitler (No Mech) | - | - | 3 | 1 | 2 | 1 | **7** |
| Otto Giftmacher | - | - | 3 | 2 | 1 | 1 | **7** |
| Gretel Grosse | - | - | 3 | 2 | 1 | 2 | **8** |
| General Fettgesicht | - | - | 3 | 3 | 2 | 2 | **10** |
| **TOTAL** | **14** | **9** | **37** | **23** | **22** | **11** | **116** |

**ElevenLabs cost estimate (at ~$0.30/1000 characters):**
- Average line: 20 characters
- 116 lines x 5 variations each = 580 generations
- 580 x 20 chars = 11,600 characters
- Estimated cost: ~$3.50 (negligible)
- Budget buffer for re-takes: $15 total

---

## 3. Sound Effects (ElevenLabs SFX + Web Audio API)

### 3.1 Weapons

| ID | Sound | Description | Duration | Source | Priority |
|----|-------|-------------|----------|--------|----------|
| WPN-KNIFE-01 | Knife slash | Sharp metallic slash through air. Thin, quick. Slight "shing" quality. | 0.2-0.4s | ElevenLabs SFX | HIGH |
| WPN-KNIFE-02 | Knife stab/hit | Meaty impact. Blade entering flesh. Dull thud + wet detail. | 0.2-0.3s | ElevenLabs SFX | HIGH |
| WPN-PISTOL-01 | Luger pistol shot | **Crisp, punchy, authoritative.** Single shot. Sharp crack + slight echo. The Luger has a distinctive high-pitched snap. Not boomy -- precise. | 0.3-0.5s | ElevenLabs SFX | CRITICAL |
| WPN-PISTOL-02 | Luger dry fire/reload | Metallic click of toggle mechanism. Subtle but satisfying. | 0.2-0.3s | ElevenLabs SFX | MEDIUM |
| WPN-MP40-01 | MP40 burst fire | **Rapid, metallic, rhythmic.** The MP40 has a distinctive 500 RPM rate -- slower than modern SMGs. Each shot should be individually audible in the burst. Metallic bolt cycling between shots. | 0.5-0.8s (3-5 round burst) | ElevenLabs SFX | CRITICAL |
| WPN-MP40-02 | MP40 single shot (component) | Single MP40 round for procedural burst generation. Sharp crack + bolt cycle. | 0.1-0.15s | ElevenLabs SFX | HIGH |
| WPN-GATLING-01 | Gatling gun sustained fire | **Heavy, intimidating, relentless.** Deep, thumping rate of fire. Mechanical spinning sound underlaying the shots. Barrel rotation whine. This should feel POWERFUL. | 2.0-3.0s (looping) | ElevenLabs SFX | CRITICAL |
| WPN-GATLING-02 | Gatling gun spin-up | Barrel begins rotating. Whine building in pitch. No shots yet -- pure anticipation. | 0.5-0.8s | ElevenLabs SFX | HIGH |
| WPN-GATLING-03 | Gatling gun spin-down | Barrel decelerating. Whine descending. Last few shots spacing out. | 0.5-1.0s | ElevenLabs SFX | MEDIUM |
| WPN-PICKUP-01 | Weapon pickup | Satisfying metallic grab. Weight of metal in hands. Click of safety. | 0.3-0.5s | ElevenLabs SFX | HIGH |
| WPN-AMMO-01 | Ammo pickup | Bullets rattling in magazine/box. Lighter than weapon pickup. Metallic jingle. | 0.2-0.4s | ElevenLabs SFX | HIGH |
| WPN-EMPTY-01 | Empty click (no ammo) | Dry, impotent click. The worst sound in an FPS. Trigger mechanism with no round chambered. | 0.1-0.2s | Web Audio synthesis | CRITICAL |

### 3.2 Environment

| ID | Sound | Description | Duration | Source | Priority |
|----|-------|-------------|----------|--------|----------|
| ENV-DOOR-WOOD-01 | Wooden door opening | Heavy oak creak. Medieval castle quality. Hinges protesting. Gradual opening. | 1.0-1.5s | ElevenLabs SFX | CRITICAL |
| ENV-DOOR-WOOD-02 | Wooden door closing | Same door, reverse energy. Solid thud at the end. Latch catching. | 0.8-1.2s | ElevenLabs SFX | HIGH |
| ENV-DOOR-METAL-01 | Metal door sliding | Industrial metal scraping on metal. Hydraulic-assisted. Heavier than wood. | 1.0-1.5s | ElevenLabs SFX | CRITICAL |
| ENV-DOOR-METAL-02 | Metal door closing | Metal slam. Reverberating echo. Locks engaging. | 0.8-1.2s | ElevenLabs SFX | HIGH |
| ENV-SECRET-01 | Secret wall grinding | **Stone on stone.** Slow, grinding, heavy. Ancient mechanism activating. Dust falling. This sound should make the player feel they discovered something hidden for decades. | 2.0-3.0s | ElevenLabs SFX | CRITICAL |
| ENV-SECRET-02 | Secret wall reveal chime | Subtle mystical tone. Layered on top of the grinding. Player reward sound. | 0.5-1.0s | Web Audio synthesis | HIGH |
| ENV-ELEVATOR-01 | Elevator moving | Mechanical hum. Chains and pulleys. Slow, steady. Castle-era technology. Looping. | 2.0-4.0s (loop) | ElevenLabs SFX | HIGH |
| ENV-ELEVATOR-02 | Elevator stop | Mechanical clunk. Chains settling. Halt with a jolt. | 0.3-0.5s | ElevenLabs SFX | MEDIUM |
| ENV-SWITCH-01 | Switch/lever activation | Mechanical lever pull. Click + gears engaging. Solid, satisfying. | 0.3-0.5s | ElevenLabs SFX | HIGH |
| ENV-FOOTSTEP-STONE-01 | Footstep on stone (player) | Hard sole on stone floor. Echoing in corridor. Need 4 variants for variation. | 0.2-0.3s | ElevenLabs SFX x4 variants | CRITICAL |
| ENV-FOOTSTEP-STONE-02 | Footstep on stone (running) | Faster, lighter steps. More echo from speed. 4 variants. | 0.15-0.2s | ElevenLabs SFX x4 variants | HIGH |
| ENV-FOOTSTEP-WOOD-01 | Footstep on wood | Wooden floor creak. Warmer, softer than stone. 4 variants. | 0.2-0.3s | ElevenLabs SFX x4 variants | MEDIUM |
| ENV-FOOTSTEP-ENEMY-01 | Enemy footstep (approaching) | **Builds tension.** Heavier boots on stone. Slightly slower cadence than player. Must be audible THROUGH WALLS for spatial awareness. 4 variants. | 0.2-0.35s | ElevenLabs SFX x4 variants | CRITICAL |
| ENV-FOOTSTEP-DOG-01 | Dog claws on stone | Rapid clicking of claws on stone. Light, fast. 4 variants. | 0.1-0.15s | ElevenLabs SFX x4 variants | HIGH |
| ENV-AMBIENT-CASTLE-01 | Castle ambient loop | Wind through corridors. Distant dripping water. Creaking wood. Oppressive silence. | 30-60s (loop) | ElevenLabs SFX + layering | HIGH |
| ENV-AMBIENT-DUNGEON-01 | Dungeon ambient loop | Dripping, chains rattling softly, rats skittering, distant moans. | 30-60s (loop) | ElevenLabs SFX + layering | HIGH |
| ENV-AMBIENT-LAB-01 | Laboratory ambient (Dr. Schabbs) | Electrical hum, bubbling liquids, machinery, heart monitor beeping. | 30-60s (loop) | Web Audio synthesis + SFX | MEDIUM |

### 3.3 Player

| ID | Sound | Description | Duration | Source | Priority |
|----|-------|-------------|----------|--------|----------|
| PLR-DAMAGE-01 | Damage taken grunt (light) | Short, sharp male grunt. "Ugh!" Controlled. | 0.3-0.5s | ElevenLabs | CRITICAL |
| PLR-DAMAGE-02 | Damage taken grunt (heavy) | Deeper, more pained. "AAGH!" Body impact quality. | 0.4-0.6s | ElevenLabs | CRITICAL |
| PLR-DAMAGE-03 | Damage taken grunt (critical) | Desperate, strained. Near-death energy. Gasping. | 0.5-0.7s | ElevenLabs | HIGH |
| PLR-HEARTBEAT-01 | Low health heartbeat | **Rhythmic bass thump.** Increasing tempo as health decreases. BPM 60 at 25% health, BPM 120 at 10% health. Generates visceral urgency. | Continuous (procedural) | Web Audio API synthesis | CRITICAL |
| PLR-DEATH-01 | Player death scream | Full death cry. Agonized, dramatic, final. American accent (B.J. Blazkowicz). | 1.5-2.5s | ElevenLabs | CRITICAL |
| PLR-DEATH-02 | Player death fall | Body hitting stone floor. Armor/equipment rattling. | 0.5-1.0s | ElevenLabs SFX | HIGH |
| PLR-BREATH-01 | Heavy breathing (low health) | Labored, panting. Layered under heartbeat. Procedurally speeds up. | Continuous (looping) | ElevenLabs + procedural | MEDIUM |

### 3.4 Pickups & Items

| ID | Sound | Description | Duration | Source | Priority |
|----|-------|-------------|----------|--------|----------|
| ITEM-HEALTH-01 | Health pickup (small) | Soft, warm chime. Healing energy. Glass vial quality. | 0.3-0.5s | Web Audio synthesis | HIGH |
| ITEM-HEALTH-02 | Health pickup (large) | Fuller, richer version. Multiple chimes ascending. More satisfying. | 0.5-0.7s | Web Audio synthesis | HIGH |
| ITEM-HEALTH-03 | Full health restore | **Triumphant.** Orchestral sting. Choir "ahhh." Player feels invincible briefly. | 0.8-1.2s | ElevenLabs SFX + Web Audio | MEDIUM |
| ITEM-EXTRALIFE-01 | Extra life pickup | **THE reward sound.** Triumphant 5-note ascending jingle. Fanfare quality. Unmistakable. Player pumps fist. | 1.0-1.5s | Web Audio synthesis | CRITICAL |
| ITEM-TREASURE-CROSS-01 | Cross pickup | Small treasure chime. Bright, metallic. "Ting!" | 0.2-0.3s | Web Audio synthesis | HIGH |
| ITEM-TREASURE-CHALICE-01 | Chalice pickup | Richer than cross. Goblet quality. Reverberant "toong." | 0.3-0.4s | Web Audio synthesis | HIGH |
| ITEM-TREASURE-CHEST-01 | Treasure chest pickup | Full treasure sound. Coins cascading. Gold quality. Satisfying. | 0.4-0.6s | ElevenLabs SFX | HIGH |
| ITEM-TREASURE-CROWN-01 | Crown pickup (max treasure) | **Royal fanfare.** Short but majestic. Player found the jackpot. | 0.5-0.8s | Web Audio synthesis + SFX | HIGH |
| ITEM-KEY-GOLD-01 | Gold key pickup | Metallic key jingle + importance chime. You NEED this. | 0.4-0.6s | Web Audio synthesis | CRITICAL |
| ITEM-KEY-SILVER-01 | Silver key pickup | Similar to gold but slightly different tone. Higher pitch. | 0.4-0.6s | Web Audio synthesis | CRITICAL |
| ITEM-AMMO-01 | Ammo box pickup | Bullets rattling in box. Satisfying weight. | 0.3-0.5s | ElevenLabs SFX | HIGH |
| ITEM-FOOD-01 | Food pickup (dog food, meals) | Crunching/eating. Quick. Slightly comical for dog food. | 0.3-0.5s | ElevenLabs SFX | MEDIUM |
| ITEM-ONEUP-01 | 1-Up/Extra Life chime | Ascending 5-note melody: C-E-G-C'-E'. Pure tones. Iconic. | 1.0-1.5s | Web Audio synthesis | CRITICAL |

### 3.5 UI Sounds

| ID | Sound | Description | Duration | Source | Priority |
|----|-------|-------------|----------|--------|----------|
| UI-SELECT-01 | Menu option highlight | Subtle click. Cursor movement. Light, non-intrusive. | 0.05-0.1s | Web Audio synthesis | HIGH |
| UI-CONFIRM-01 | Menu confirm | Deeper click/thunk. Decision made. Satisfying. | 0.1-0.2s | Web Audio synthesis | HIGH |
| UI-BACK-01 | Menu back/cancel | Softer, descending tone. Undoing. | 0.1-0.15s | Web Audio synthesis | MEDIUM |
| UI-LEVELCOMPLETE-01 | Level complete fanfare | **3-5 second orchestral fanfare.** Triumphant brass. Drums. Clear victory energy. Based on original Wolf3D end-of-level music. | 3.0-5.0s | Suno AI (short clip) | CRITICAL |
| UI-GAMEOVER-01 | Game over sting | **Dark, somber.** Descending brass. Drums of doom. Player has failed. Dramatic but short enough to not annoy on repeat deaths. | 2.0-3.0s | Suno AI (short clip) | CRITICAL |
| UI-EPISODECOMPLETE-01 | Episode complete music | **Extended victory theme.** 15-20 seconds. Full orchestral celebration. Building to climax. Used sparingly -- player earned this. | 15-20s | Suno AI | HIGH |
| UI-SCORE-TICK-01 | Score counting up | Rapid ticking. Slot machine energy. Points accumulating. | 0.05s (looping rapidly) | Web Audio synthesis | MEDIUM |
| UI-PAUSE-01 | Pause game | All audio pitch-shifts down briefly. Time stopping quality. | 0.3s | Web Audio effect | LOW |
| UI-UNPAUSE-01 | Unpause game | Reverse of pause. Everything snaps back. | 0.3s | Web Audio effect | LOW |

### 3.6 Sound Effects Summary

**Total unique sound effects: 76**

| Category | Count | Source Breakdown |
|----------|-------|-----------------|
| Weapons | 12 | 10 ElevenLabs SFX, 2 Web Audio |
| Environment | 17 assets (68 with variants) | 13 ElevenLabs SFX, 4 Web Audio |
| Player | 7 | 4 ElevenLabs, 3 Web Audio |
| Pickups/Items | 14 | 5 ElevenLabs SFX, 9 Web Audio |
| UI | 9 | 2 Suno AI, 7 Web Audio |

**ElevenLabs SFX cost estimate:**
- ~32 unique SFX generations + ~16 footstep variants = ~48 generations
- At $0.50 per generation: ~$24 total
- Budget buffer for re-takes: $40 total

---

## 4. Music via Suno AI

### 4.1 Track List

All tracks reference the original Bobby Prince compositions while creating a modern cinematic reimagining. Target format: 128-192 kbps MP3, stereo, with clean loop points.

---

#### Track 1: Main Menu Theme — "Castle Wolfenstein"

**Where it plays:** Main menu screen, title screen.

**Suno prompt:**
```
Epic orchestral military march, dark and foreboding, brass fanfare opening,
timpani drums, minor key, slow tempo 80 BPM, cinematic film score quality,
World War 2 atmosphere, castle at night, building tension, strings tremolo,
French horns melody, snare drum military cadence, no vocals, looping,
Hans Zimmer meets classic video game music
```

**Mood:** Anticipation. Dread. Something terrible awaits inside the castle. But also heroism -- you are going in anyway.

**Instruments:** Full orchestra. Brass (French horns, trumpets muted). Timpani. Military snare. Low strings. Subtle choir "ooh."

**Duration:** 120-180 seconds. Seamless loop.

**Loop notes:** Must loop seamlessly. End on the same chord/texture as it begins. Crossfade point at 115-175s mark. Leave 5 seconds of tail for the engine to blend.

---

#### Track 2: Episode 1 Combat Theme — "Escape from Wolfenstein"

**Where it plays:** Episode 1 levels during active combat. Replaces exploration music when enemies are alerted.

**Suno prompt:**
```
Fast aggressive orchestral metal hybrid, 140 BPM, driving double bass drums,
distorted electric guitar riffs, brass stabs, intense action movie score,
World War 2 shooter game combat music, relentless energy, minor key,
palm-muted guitar chugging, orchestral hits, no vocals, looping,
Mick Gordon meets John Williams military score, adrenaline-pumping
```

**Mood:** Adrenaline. Fight-or-flight. The guards know you are here. Run, shoot, survive.

**Instruments:** Electric guitar (palm-muted chugging + lead riffs). Double bass drums. Orchestral brass stabs. Strings for tension. Crash cymbals on beat changes.

**Duration:** 150-240 seconds. Seamless loop.

**Loop notes:** Track should have multiple intensity layers that can be mixed up/down procedurally if possible. At minimum: clean loop point.

---

#### Track 3: Episode 1 Exploration Theme — "Shadows in the Castle"

**Where it plays:** Episode 1 levels when no enemies are alerted. Stealth/exploration state.

**Suno prompt:**
```
Tense atmospheric dark ambient, slow tempo 70 BPM, minimal instrumentation,
suspenseful strings, occasional piano notes, World War 2 stealth game music,
creeping through a dark castle, footsteps in shadows, threatening undertone,
low brass drones, subtle heartbeat pulse, no vocals, looping, quiet menace,
film noir meets survival horror ambience
```

**Mood:** You are alone in an enemy castle. Every shadow could hide a soldier. The quiet is worse than the fighting.

**Instruments:** Low strings drone. Solo piano (sparse, minor key). Subtle synthesizer pad. Occasional brass sting (when you turn a corner). Ambient wind/drip sounds baked in.

**Duration:** 120-180 seconds. Seamless loop.

**Loop notes:** This track should feel like it could play forever. No strong melody -- texture and atmosphere.

---

#### Track 4: Episode 2 Theme — "Dark Experiments"

**Where it plays:** Episode 2 levels (Dr. Schabbs' laboratories). Both exploration and combat, with layers.

**Suno prompt:**
```
Dark horror orchestral with industrial elements, 110 BPM, unsettling,
distorted synths, eerie choir, mechanical percussion, laboratory horror,
mad scientist atmosphere, Frankenstein experiments, dissonant strings,
pipe organ stabs, metallic clanking rhythm, no vocals, looping,
horror film score meets industrial metal, deeply unsettling
```

**Mood:** Wrong. Everything here is wrong. The experiments, the mutants, the sounds coming from behind locked doors. Horror mixed with industrial precision.

**Instruments:** Pipe organ (classic horror). Industrial percussion (metal clanking, hammer on anvil). Dissonant string clusters. Synthesizer pads (wet, organic). Distorted bass guitar. Eerie children's choir (single sustained note).

**Duration:** 150-240 seconds. Seamless loop.

---

#### Track 5: Episode 3 Theme — "March on Berlin"

**Where it plays:** Episode 3 levels (approaching Hitler's bunker). The most intense main-level music.

**Suno prompt:**
```
Epic intense military orchestral, 130 BPM, massive scale, full orchestra,
war drums thundering, brass fanfare heroic and desperate, strings racing,
final battle approaching, World War 2 climax, D-Day intensity,
timpani rolls, trumpet calls to arms, no vocals, looping,
building toward ultimate confrontation, Hans Zimmer Dunkirk energy
```

**Mood:** The end approaches. This is the final push. Everything has led to this. Heroic desperation.

**Instruments:** Full orchestra at maximum power. War drums (taiko-style). Brass fanfare (heroic trumpet melody). Rapid strings. Choir joining in final sections. Cymbal crashes.

**Duration:** 180-240 seconds. Seamless loop.

---

#### Track 6: Boss Battle Theme — "Endkampf"

**Where it plays:** All boss encounters. Immediately replaces level music when boss room is entered.

**Suno prompt:**
```
Epic cinematic boss battle theme, 150 BPM, massive orchestral metal,
heavy distorted guitar riffs, thundering war drums, latin choir chanting,
life-or-death struggle, video game final boss energy, dynamic shifts,
breakdown sections with solo instruments, builds to climactic peaks,
no lyrics, looping, Mick Gordon Doom soundtrack meets epic film score,
brass fanfare between heavy sections, relentless intensity
```

**Mood:** This is it. One of you dies here. The room is sealed. There is no retreat. The music says: FIGHT.

**Instruments:** Heavy electric guitar (drop-tuned). Orchestral brass at full blast. Latin/Germanic choir chanting. Double bass drums. Timpani. String runs. Everything.

**Duration:** 180-240 seconds. Seamless loop.

**Special:** Track should have two intensity phases. First half: building. Second half: maximum intensity. The engine crossfades to the intense section when boss health drops below 50%.

---

#### Track 7: Stealth/Exploration (Generic) — "Corridors"

**Where it plays:** Any level in exploration mode (no enemies alerted). Generic fallback when episode-specific exploration music is not available.

**Suno prompt:**
```
Minimal atmospheric tension, 60 BPM, almost silent, sparse piano,
low drone, subtle breath-like synthesizer, dark empty corridors,
footsteps echoing, World War 2 stealth espionage, whisper-quiet,
occasional dissonant string pluck, no drums, no vocals, looping,
sound design more than music, liminal space horror ambience
```

**Mood:** Pure tension. The music is barely there -- and that makes it worse.

**Duration:** 120 seconds. Seamless loop.

---

#### Track 8: Victory Fanfare — "Mission Complete"

**Where it plays:** End of each level when touching the exit elevator trigger.

**Suno prompt:**
```
Short triumphant military fanfare, brass trumpets and French horns,
heroic ascending melody, snare drum roll into cymbal crash,
World War 2 victory celebration, relief and triumph, major key,
orchestral, 6 seconds total, no vocals, no looping needed,
classic video game level complete jingle, punchy and satisfying
```

**Mood:** Relief. Pride. You survived. But there is more ahead.

**Duration:** 5-7 seconds. No loop (one-shot).

---

#### Track 9: Death/Game Over — "Fallen"

**Where it plays:** Player death screen. Immediate cut to this from whatever was playing.

**Suno prompt:**
```
Dark somber orchestral sting, descending brass melody, timpani doom hits,
funeral atmosphere, defeat and failure, slow tempo 50 BPM, minor key,
World War 2 memorial, 4 seconds of darkness then silence,
no vocals, no looping needed, heavy emotional weight, film score quality
```

**Mood:** You failed. The mission is lost. Germany wins. The weight of that.

**Duration:** 3-5 seconds. No loop (one-shot). Followed by silence.

---

#### Track 10: Secret Level Theme — "Verboten"

**Where it plays:** Secret/bonus levels accessible through hidden exits.

**Suno prompt:**
```
Quirky mysterious orchestral, 100 BPM, playful but dark, harpsichord melody,
pizzicato strings, xylophone, music box quality mixed with military brass,
hidden treasure discovered, secret passage exploration, curiosity and danger,
minor key with occasional major lifts, whimsical yet threatening,
no vocals, looping, Tim Burton film score meets retro game music
```

**Mood:** You found something you were not supposed to find. Curiosity. Delight. Underlying danger.

**Instruments:** Harpsichord (old-fashioned, hidden rooms). Pizzicato strings. Xylophone/glockenspiel. Music box tones. Subtle brass undertone reminding you this is still a war.

**Duration:** 120-180 seconds. Seamless loop.

---

#### Track 11: Credits Theme — "Return of the Hero"

**Where it plays:** End credits after completing the final episode.

**Suno prompt:**
```
Epic cinematic orchestral finale, starting quiet and building to massive climax,
recap of main theme melody, 90 BPM building to 130 BPM, full orchestra,
triumphant brass melody restating earlier themes, war drums celebration,
strings soaring, choir singing triumphantly, World War 2 victory,
emotional journey from reflection to celebration, 3 minutes,
no lyrics, film score quality, John Williams Star Wars end credits energy
```

**Mood:** You did it. Castle Wolfenstein has fallen. The hero returns. Every theme from the game returns in fragments, building to a final triumphant statement. Goosebumps.

**Duration:** 180 seconds. No loop (plays once during credits scroll).

---

### 4.2 Music Summary

| # | Track Name | Duration | Loop | Game State | Priority |
|---|-----------|----------|------|-----------|----------|
| 1 | Castle Wolfenstein (Menu) | 120-180s | Yes | Main menu | CRITICAL |
| 2 | Escape from Wolfenstein (E1 Combat) | 150-240s | Yes | E1 combat | CRITICAL |
| 3 | Shadows in the Castle (E1 Explore) | 120-180s | Yes | E1 stealth | HIGH |
| 4 | Dark Experiments (E2) | 150-240s | Yes | E2 all states | HIGH |
| 5 | March on Berlin (E3) | 180-240s | Yes | E3 all states | HIGH |
| 6 | Endkampf (Boss Battle) | 180-240s | Yes | All bosses | CRITICAL |
| 7 | Corridors (Generic Explore) | 120s | Yes | Fallback explore | MEDIUM |
| 8 | Mission Complete (Victory) | 5-7s | No | Level end | CRITICAL |
| 9 | Fallen (Game Over) | 3-5s | No | Player death | CRITICAL |
| 10 | Verboten (Secret Level) | 120-180s | Yes | Secret levels | MEDIUM |
| 11 | Return of the Hero (Credits) | 180s | No | End credits | HIGH |

**Suno AI cost estimate:**
- 11 tracks x ~5 generations each (to get the right one) = 55 generations
- At current Suno Pro pricing ($10/month for 500 songs): well within budget
- Total: 1 month of Suno Pro = $10

---

## 5. Web Audio API Architecture

### 5.1 Audio Engine Design

The existing `AudioManager` in `/src/engine/audio.js` provides a solid foundation. The architecture below extends it for cinema-quality Wolfenstein audio.

```
AudioEngine (Singleton)
|
|-- AudioContext (Web Audio API)
|   |-- ListenerNode (follows camera/player)
|   |
|   |-- MasterGainNode (master volume)
|       |
|       |-- MusicBus (GainNode)
|       |   |-- MusicTrackA (for crossfading)
|       |   |-- MusicTrackB (for crossfading)
|       |   |-- ConvolverNode (castle reverb on music)
|       |
|       |-- VoiceBus (GainNode) -- PRIORITY: voices over SFX
|       |   |-- VoiceChannel[0..3] (max 4 simultaneous)
|       |   |   |-- GainNode (per-voice volume)
|       |   |   |-- PannerNode (3D positioning)
|       |
|       |-- SFXBus (GainNode)
|       |   |-- SFXChannel[0..15] (max 16 simultaneous)
|       |   |   |-- GainNode (per-sound volume)
|       |   |   |-- PannerNode (3D positioning)
|       |   |   |-- ConvolverNode (room reverb, optional)
|       |
|       |-- AmbientBus (GainNode)
|           |-- AmbientLoop (looping background)
|           |-- ConvolverNode (environment reverb)
```

### 5.2 Sound Priority System

When the channel limit is reached, sounds are prioritized and the lowest-priority sound is replaced.

**Priority tiers (highest to lowest):**

| Priority | Category | Max Channels | Examples |
|----------|----------|-------------|----------|
| 1 (CRITICAL) | Player sounds | 2 | Damage grunt, death, heartbeat |
| 2 (HIGH) | Boss voice lines | 2 | Boss intro, taunts, death |
| 3 (HIGH) | Enemy voice lines | 4 | Alert, spot, death cries |
| 4 (MEDIUM) | Weapon fire (player) | 2 | Player's gun shots |
| 5 (MEDIUM) | Enemy weapon fire | 4 | Enemy gunshots (3D positioned) |
| 6 (LOW) | Environment | 2 | Doors, switches, secrets |
| 7 (LOW) | Pickups | 1 | Item/treasure sounds |
| 8 (LOWEST) | Footsteps | 2 | Player + nearest enemy |

**Culling rules:**
- If all 16 SFX channels are full: stop the oldest LOWEST priority sound
- Never interrupt Priority 1-2 sounds
- Same-sound deduplication: if the same sound ID is playing within 50ms, skip the new one (prevents machine gun stacking)
- Distance culling: sounds beyond `maxDistance` (50 units) are not played at all

### 5.3 Distance-Based Volume Falloff

```javascript
// Panner configuration for all 3D sounds
const pannerConfig = {
    panningModel: 'HRTF',          // Head-Related Transfer Function for realistic 3D
    distanceModel: 'inverse',       // Realistic inverse-square falloff
    refDistance: 1.0,               // Distance at which volume is 100%
    maxDistance: 50.0,              // Beyond this, sound is silent
    rolloffFactor: 1.5,            // How quickly sound fades (1.0 = realistic, higher = faster)
    coneInnerAngle: 360,           // Full sphere for most sounds
    coneOuterAngle: 360,
    coneOuterGain: 0               // Not used with full sphere
};

// SPECIAL: Enemy footsteps use lower rolloff for "hearing through walls" effect
const footstepPannerConfig = {
    ...pannerConfig,
    rolloffFactor: 0.8,            // Slower falloff -- hear them approaching from far away
    maxDistance: 30.0               // But still limited range
};

// SPECIAL: Boss voices have extended range
const bossVoicePannerConfig = {
    ...pannerConfig,
    rolloffFactor: 0.5,            // Very slow falloff -- boss voice fills the arena
    maxDistance: 100.0              // Heard from anywhere in the level
};
```

### 5.4 Reverb for Indoor Castle Environments

Use a ConvolverNode with an impulse response to simulate the acoustics of a stone castle interior.

**Reverb presets:**

| Preset | Description | Impulse Response | Use Case |
|--------|-------------|-----------------|----------|
| `castle_corridor` | Medium stone corridor | 1.2s RT60, moderate diffusion | Standard hallways |
| `castle_hall` | Large stone hall | 2.5s RT60, high diffusion | Boss arenas, large rooms |
| `castle_dungeon` | Small damp cell | 0.8s RT60, low diffusion, dampened highs | Dungeon areas |
| `castle_outdoor` | Courtyard/open area | 0.3s RT60, minimal | Outdoor sections |
| `lab_sterile` | Dr. Schabbs' lab | 1.0s RT60, bright, metallic | Episode 2 lab areas |

**Implementation:** Generate impulse responses procedurally using Web Audio API:
```javascript
function generateImpulseResponse(context, duration, decay, reverse = false) {
    const sampleRate = context.sampleRate;
    const length = sampleRate * duration;
    const impulse = context.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            const n = reverse ? length - i : i;
            channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
        }
    }
    return impulse;
}
```

### 5.5 Music State Machine & Crossfading

Music transitions are driven by a state machine that responds to gameplay events.

```
                        +-----------+
                        |   MENU    | (Track 1: Castle Wolfenstein)
                        +-----+-----+
                              |
                              | [Start Game]
                              v
                    +------------------+
               +--->|   EXPLORATION    |<---+   (Track 3/7: Stealth/Explore)
               |    +--------+---------+    |
               |             |              |
               |    [Enemy spots player]    | [All enemies dead/lost]
               |             |              |
               |             v              |
               |    +------------------+    |
               |    |     COMBAT       |----+   (Track 2/4/5: Episode Combat)
               |    +--------+---------+
               |             |
               |    [Enter boss room]
               |             |
               |             v
               |    +------------------+
               |    |   BOSS BATTLE    |        (Track 6: Endkampf)
               |    +--------+---------+
               |             |
               |    [Boss killed]
               |             |
               |             v
               |    +------------------+
               +----|    VICTORY       |        (Track 8: Mission Complete)
                    +------------------+
                             |
                    [Player dies at any point]
                             |
                             v
                    +------------------+
                    |   GAME OVER      |        (Track 9: Fallen)
                    +------------------+
```

**Crossfade implementation:**

```javascript
class MusicStateManager {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.currentState = 'MENU';
        this.crossfadeDuration = 2.0;  // seconds
        this.activeTrack = 'A';        // A or B for crossfading
    }

    transition(newState) {
        if (newState === this.currentState) return;

        const track = this.getTrackForState(newState);
        const fadeDuration = this.getFadeDuration(this.currentState, newState);

        // Crossfade: fade out current, fade in new
        this.audioEngine.crossfadeMusic(track, fadeDuration);
        this.currentState = newState;
    }

    getFadeDuration(from, to) {
        // Instant transitions for dramatic moments
        if (to === 'BOSS_BATTLE') return 0.5;    // Quick cut to boss music
        if (to === 'GAME_OVER') return 0.0;       // Instant silence then sting
        if (to === 'VICTORY') return 0.5;          // Quick cut to fanfare

        // Smooth transitions for gameplay flow
        if (from === 'EXPLORATION' && to === 'COMBAT') return 1.5;
        if (from === 'COMBAT' && to === 'EXPLORATION') return 3.0;  // Slow fade back to calm

        return this.crossfadeDuration;  // Default
    }
}
```

### 5.6 Audio Sprite Sheets

For frequently-used short sounds (footsteps, UI clicks, bullet impacts), pack multiple sounds into a single audio file and play specific time ranges. This reduces HTTP requests and improves load time.

**Sprite sheet design:**

| Sprite Sheet | Contents | Total Duration |
|-------------|----------|----------------|
| `sfx_footsteps.mp3` | 16 footstep variants (stone x4, wood x4, metal x4, dog x4) | ~5s |
| `sfx_ui.mp3` | All UI sounds (select, confirm, back, score tick) | ~2s |
| `sfx_pickups.mp3` | All pickup sounds (health, ammo, treasure, keys) | ~8s |
| `sfx_impacts.mp3` | Bullet impacts, knife hits, damage variants | ~4s |

**Manifest format (JSON):**
```json
{
    "sfx_footsteps": {
        "src": "assets/audio/sprites/sfx_footsteps.mp3",
        "sprites": {
            "footstep_stone_01": { "start": 0.0, "end": 0.25 },
            "footstep_stone_02": { "start": 0.3, "end": 0.55 },
            "footstep_stone_03": { "start": 0.6, "end": 0.85 },
            "footstep_stone_04": { "start": 0.9, "end": 1.15 }
        }
    }
}
```

### 5.7 Mobile Audio Unlock Strategy (iOS)

iOS Safari requires user interaction before playing audio. This is a hard platform restriction.

**Strategy:**

1. **First interaction capture:** On the title/menu screen, the first tap/click triggers `AudioContext.resume()` and plays a silent buffer to unlock the context.

2. **Audio unlock overlay:**
```javascript
class MobileAudioUnlock {
    constructor(audioContext) {
        this.context = audioContext;
        this.unlocked = false;

        // Show "Tap to start" overlay on iOS
        if (this.isIOSSafari()) {
            this.showUnlockOverlay();
        }
    }

    isIOSSafari() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) &&
               !window.MSStream;
    }

    showUnlockOverlay() {
        // Overlay is part of the game's "Press Start" screen
        // First touch both dismisses overlay AND unlocks audio
        document.addEventListener('touchstart', () => this.unlock(), { once: true });
        document.addEventListener('click', () => this.unlock(), { once: true });
    }

    async unlock() {
        if (this.unlocked) return;

        // Resume suspended context
        if (this.context.state === 'suspended') {
            await this.context.resume();
        }

        // Play silent buffer to fully unlock
        const buffer = this.context.createBuffer(1, 1, 22050);
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.connect(this.context.destination);
        source.start(0);

        this.unlocked = true;
    }
}
```

3. **Audio element pool (iOS workaround):** On iOS, reuse `HTMLAudioElement` instances instead of creating new ones. Pre-create a pool of 8 audio elements on first touch.

4. **Fallback:** If Web Audio API is completely unavailable, fall back to `HTMLAudioElement` with `preload="auto"`. Fewer simultaneous sounds but functional.

---

## 6. Audio Production Pipeline

### 6.1 ElevenLabs Voice Generation Workflow

**Step-by-step process for each voice character:**

1. **Create Voice Profile**
   - Go to ElevenLabs Voice Library or Voice Design
   - Use the character description from Section 2 as the voice design prompt
   - Generate sample and evaluate against character description
   - Save the voice for consistency across all lines for that character

2. **Generate Lines**
   - Input each German text line from the tables in Section 2
   - Use the emotion/delivery notes to guide the generation settings
   - Generate 5 variations of each line
   - Rate each on a 1-5 scale for authenticity, emotion, and clarity

3. **Select Best Takes**
   - Choose top 2-3 takes per line (primary + alternates)
   - Ensure variation between takes (no two death screams sound identical)

4. **Post-Processing (in Audacity)**
   - Normalize all lines to -3dB peak
   - Trim silence at start/end (leave 50ms padding)
   - Apply character-specific processing (see Mutant, Mech Hitler notes)
   - Add subtle room reverb matching castle environment (0.5s, 20% wet)
   - Export as OGG Vorbis, quality 6 (~128 kbps)

5. **Quality Gate**
   - Play each line in context (with game ambient audio underneath)
   - Verify German pronunciation with native speaker or reference
   - Confirm emotional tone matches the trigger condition
   - Verify file size is under 100KB per line

### 6.2 Suno Music Generation Workflow

**Step-by-step process for each track:**

1. **Generate First Draft**
   - Use the Suno prompt from Section 4 verbatim
   - Generate 5 variations
   - Listen to each fully -- do not judge by the first 10 seconds

2. **Evaluate Against Criteria**
   - Does it match the mood description?
   - Is the tempo correct?
   - Are the instruments appropriate?
   - Does it loop cleanly? (Check by playing the last 10s + first 10s back to back)
   - Would Bobby Prince approve?

3. **Refine**
   - If no generation is right: modify the prompt, add/remove instrument specifications
   - Generate 5 more variations with refined prompt
   - Maximum 3 rounds of refinement per track (15 generations)

4. **Post-Processing (in Audacity)**
   - Trim to exact loop point (find zero-crossing)
   - Apply 50ms crossfade at loop boundary
   - Normalize to -6dB peak (music should sit under SFX)
   - Verify the loop plays seamlessly for 10 minutes without audible jump
   - Export as MP3 128 kbps for music tracks, 192 kbps for credits theme

5. **Quality Gate**
   - Play in-game at intended volume while performing gameplay actions
   - Music should enhance, not dominate -- you should still hear enemies approaching
   - Verify no frequency clashes with weapon sounds (especially 1-3kHz range)
   - Test on laptop speakers, headphones, and phone speaker

### 6.3 Sound Effect Sourcing and Processing

**Sources in order of preference:**

1. **ElevenLabs Sound Effects API** (primary for organic sounds)
   - Best for: voices, creature sounds, mechanical doors, weapon shots
   - Prompt structure: `"[descriptive adjective] [noun] [action], [duration], [quality]"`
   - Example: `"heavy medieval wooden door creaking open slowly, 1.5 seconds, castle interior"`

2. **Web Audio API Synthesis** (for UI and musical sounds)
   - Best for: chimes, clicks, heartbeat, score ticking, pickup jingles
   - Use oscillators (sine, square, triangle) with envelope shaping
   - Advantages: zero file size, infinite variation, no loading

3. **Freesound.org** (fallback for specific hard-to-generate sounds)
   - Filter by Creative Commons 0 license
   - Best for: ambient backgrounds, specific mechanical sounds
   - Always post-process to match game aesthetic

**Processing chain for ALL sound effects:**
1. Normalize to -3dB peak
2. High-pass filter at 80Hz (remove room rumble from recordings)
3. Trim silence (50ms padding)
4. Apply game reverb preset (or leave dry if close-proximity sound)
5. Convert to target format

### 6.4 File Formats

| Content Type | Format | Codec | Quality | Reason |
|-------------|--------|-------|---------|--------|
| Music (looping) | .mp3 | MP3 | 128 kbps CBR | Universal support, smaller size for long files |
| Music (one-shot) | .mp3 | MP3 | 192 kbps CBR | Higher quality for memorable moments |
| SFX (individual) | .ogg | Vorbis | Q6 (~128 kbps) | Better quality-per-bit than MP3, good browser support |
| SFX (sprite sheets) | .mp3 | MP3 | 192 kbps CBR | MP3 for maximum compatibility in sprite playback |
| Voice lines | .ogg | Vorbis | Q5 (~112 kbps) | Speech compresses well, OGG handles it better than MP3 |
| Fallback (all) | .mp3 | MP3 | 128 kbps CBR | Safari fallback when OGG is not supported |

**Browser support strategy:**
- Primary: OGG Vorbis (Chrome, Firefox, Edge, Opera)
- Fallback: MP3 (Safari, iOS Safari)
- Detection: `new Audio().canPlayType('audio/ogg; codecs="vorbis"')` at init
- Provide both formats; engine selects at runtime

### 6.5 Audio Asset Directory Structure

```
assets/audio/
|
|-- music/
|   |-- menu_theme.mp3
|   |-- e1_combat.mp3
|   |-- e1_explore.mp3
|   |-- e2_theme.mp3
|   |-- e3_theme.mp3
|   |-- boss_battle.mp3
|   |-- explore_generic.mp3
|   |-- victory_fanfare.mp3
|   |-- game_over.mp3
|   |-- secret_level.mp3
|   |-- credits.mp3
|
|-- voices/
|   |-- guard/
|   |   |-- grd_alert_01.ogg
|   |   |-- grd_alert_02.ogg
|   |   |-- grd_alert_03.ogg
|   |   |-- grd_spot_01.ogg
|   |   |-- grd_spot_02.ogg
|   |   |-- grd_spot_03.ogg
|   |   |-- grd_atk_01.ogg
|   |   |-- grd_atk_02.ogg
|   |   |-- grd_atk_03.ogg
|   |   |-- grd_pain_01.ogg
|   |   |-- grd_pain_02.ogg
|   |   |-- grd_death_01.ogg   (Mein Leben!)
|   |   |-- grd_death_02.ogg
|   |-- ss/
|   |   |-- ss_alert_01.ogg
|   |   |-- ... (same pattern)
|   |-- officer/
|   |   |-- off_alert_01.ogg
|   |   |-- ... (same pattern)
|   |-- dog/
|   |   |-- dog_alert_01.ogg
|   |   |-- ... (same pattern)
|   |-- mutant/
|   |   |-- mut_alert_01.ogg
|   |   |-- ... (same pattern)
|   |-- boss_hans/
|   |   |-- hg_intro_01.ogg
|   |   |-- ... (same pattern)
|   |-- boss_schabbs/
|   |   |-- ds_intro_01.ogg
|   |   |-- ...
|   |-- boss_hitler_mech/
|   |   |-- hm_intro_01.ogg
|   |   |-- ...
|   |-- boss_hitler/
|   |   |-- hp_intro_01.ogg
|   |   |-- ...
|   |-- boss_otto/
|   |   |-- og_intro_01.ogg
|   |   |-- ...
|   |-- boss_gretel/
|   |   |-- gg_intro_01.ogg
|   |   |-- ...
|   |-- boss_fettgesicht/
|   |   |-- gf_intro_01.ogg
|   |   |-- ...
|
|-- sfx/
|   |-- weapons/
|   |   |-- knife_slash.ogg
|   |   |-- knife_hit.ogg
|   |   |-- pistol_fire.ogg
|   |   |-- pistol_reload.ogg
|   |   |-- mp40_burst.ogg
|   |   |-- mp40_single.ogg
|   |   |-- gatling_fire.ogg
|   |   |-- gatling_spinup.ogg
|   |   |-- gatling_spindown.ogg
|   |   |-- weapon_pickup.ogg
|   |   |-- ammo_pickup.ogg
|   |   |-- empty_click.ogg
|   |-- environment/
|   |   |-- door_wood_open.ogg
|   |   |-- door_wood_close.ogg
|   |   |-- door_metal_open.ogg
|   |   |-- door_metal_close.ogg
|   |   |-- secret_wall.ogg
|   |   |-- secret_chime.ogg
|   |   |-- elevator_move.ogg
|   |   |-- elevator_stop.ogg
|   |   |-- switch_activate.ogg
|   |-- footsteps/
|   |   |-- stone_01.ogg
|   |   |-- stone_02.ogg
|   |   |-- stone_03.ogg
|   |   |-- stone_04.ogg
|   |   |-- stone_run_01.ogg
|   |   |-- stone_run_02.ogg
|   |   |-- stone_run_03.ogg
|   |   |-- stone_run_04.ogg
|   |   |-- wood_01.ogg
|   |   |-- wood_02.ogg
|   |   |-- wood_03.ogg
|   |   |-- wood_04.ogg
|   |   |-- enemy_01.ogg
|   |   |-- enemy_02.ogg
|   |   |-- enemy_03.ogg
|   |   |-- enemy_04.ogg
|   |   |-- dog_01.ogg
|   |   |-- dog_02.ogg
|   |   |-- dog_03.ogg
|   |   |-- dog_04.ogg
|   |-- player/
|   |   |-- damage_light.ogg
|   |   |-- damage_heavy.ogg
|   |   |-- damage_critical.ogg
|   |   |-- death.ogg
|   |   |-- death_fall.ogg
|   |-- pickups/
|   |   |-- health_small.ogg
|   |   |-- health_large.ogg
|   |   |-- health_full.ogg
|   |   |-- extra_life.ogg
|   |   |-- treasure_cross.ogg
|   |   |-- treasure_chalice.ogg
|   |   |-- treasure_chest.ogg
|   |   |-- treasure_crown.ogg
|   |   |-- key_gold.ogg
|   |   |-- key_silver.ogg
|   |   |-- ammo.ogg
|   |   |-- food.ogg
|   |-- ui/
|   |   |-- menu_select.ogg
|   |   |-- menu_confirm.ogg
|   |   |-- menu_back.ogg
|   |   |-- score_tick.ogg
|
|-- sprites/                     (audio sprite sheets for performance)
|   |-- sfx_footsteps.mp3
|   |-- sfx_footsteps.json       (sprite map)
|   |-- sfx_ui.mp3
|   |-- sfx_ui.json
|   |-- sfx_pickups.mp3
|   |-- sfx_pickups.json
|
|-- ambient/
|   |-- castle_corridor.ogg
|   |-- castle_dungeon.ogg
|   |-- lab_sterile.ogg
|
|-- impulse/                     (reverb impulse responses, generated)
|   |-- castle_corridor_ir.wav
|   |-- castle_hall_ir.wav
|   |-- castle_dungeon_ir.wav
|   |-- castle_outdoor_ir.wav
|   |-- lab_sterile_ir.wav
|
|-- audio-manifest.json          (master manifest mapping IDs to files)
```

### 6.6 Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Voice lines | `{prefix}_{category}_{number}.ogg` | `grd_alert_01.ogg` |
| SFX | `{descriptive_name}.ogg` | `door_wood_open.ogg` |
| Music | `{descriptive_name}.mp3` | `e1_combat.mp3` |
| Sprite sheets | `sfx_{category}.mp3` + `.json` | `sfx_footsteps.mp3` |
| Ambient loops | `{environment_type}.ogg` | `castle_corridor.ogg` |
| Impulse responses | `{preset_name}_ir.wav` | `castle_hall_ir.wav` |

**Prefixes for voice lines:**

| Enemy | Prefix |
|-------|--------|
| Guard | `grd` |
| SS Soldier | `ss` |
| Officer | `off` |
| Dog | `dog` |
| Mutant | `mut` |
| Hans Grosse | `hg` |
| Dr. Schabbs | `ds` |
| Hitler (Mech) | `hm` |
| Hitler (No Mech) | `hp` |
| Otto Giftmacher | `og` |
| Gretel Grosse | `gg` |
| General Fettgesicht | `gf` |

### 6.7 Quality Control Process

**Per-asset checklist:**

- [ ] Normalized to target dB (-3dB for SFX, -6dB for music)
- [ ] Silence trimmed (50ms padding retained)
- [ ] Correct format (OGG for SFX/voice, MP3 for music)
- [ ] Correct sample rate (44.1 kHz)
- [ ] File size within budget (voice < 100KB, SFX < 200KB, music < 6MB)
- [ ] Plays correctly in Chrome, Firefox, Safari
- [ ] 3D positioning verified (for positional sounds)
- [ ] No clipping or distortion
- [ ] No audible compression artifacts
- [ ] Loop point verified (for looping sounds)
- [ ] Emotional tone matches spec in this document

**Batch testing protocol:**
1. Load all audio assets into the game
2. Play through each level with all sound categories enabled
3. Listen for: volume imbalances, missing sounds, frequency clashes, timing issues
4. Verify music transitions are smooth
5. Test on: MacBook speakers, headphones, external monitor speakers, iPhone
6. Record gameplay with audio for review

---

## 7. Cinematic Audio

### 7.1 Episode Intro Narrations

Each episode begins with a brief narrated intro over a black screen with text. Use ElevenLabs with a deep, American male narrator voice -- the "movie trailer" archetype.

**Voice character (Narrator):**
Deep American male. Authoritative, grave. Like the voice at the start of a war documentary. Sam Elliott energy. Age 50-60.

**ElevenLabs settings:**
- Stability: 0.75
- Similarity Boost: 0.85
- Style: 0.25 (understated gravity)

---

#### Episode 1 Intro — "Escape from Castle Wolfenstein"

**Text on screen** (typed character by character):
```
Castle Wolfenstein, Germany. 1943.
```

**Narration:**
> "Castle Wolfenstein. Deep behind enemy lines. They said no one has ever escaped.
> But then again... no one ever sent B.J. Blazkowicz."

**Audio direction:**
- Wind howling in background (ambient)
- Distant thunder rumble
- Music: Track 1 (Menu Theme) fading in at 30% volume, building
- Narrator voice: dry, close-mic feel. Intimate. Like he is telling YOU the story.
- Slight reverb on "Castle Wolfenstein" -- echo of the name.
- Music swells on "Blazkowicz" -- hero theme hint.
- Hard cut to black. Silence. Then level starts.

**Duration:** 8-12 seconds of narration + 3 seconds of silence before gameplay.

---

#### Episode 2 Intro — "Operation: Eisenfaust"

**Text on screen:**
```
Dr. Schabbs' Laboratory. Classified Location. 1943.
```

**Narration:**
> "Intelligence reports described experiments. Unspeakable experiments.
> The dead, walking again. One man was sent to end it."

**Audio direction:**
- Laboratory ambient (bubbling, electrical hum) fading in
- Track 4 (Dark Experiments) preview at 20% volume
- Heartbeat pulse under narration
- Narrator voice slightly echoed -- as if spoken in a large empty room
- Music stabs on "walking again"
- Fade to black with lingering heartbeat

---

#### Episode 3 Intro — "Die, Fuhrer, Die!"

**Text on screen:**
```
The Bunker. Berlin. 1943.
```

**Narration:**
> "The bunker. The heart of the Reich. One target. One chance.
> This is what it all comes down to."

**Audio direction:**
- Military march drums in background, muffled (as if heard through bunker walls)
- Track 5 (March on Berlin) preview at 25% volume
- Air raid siren in the far distance
- Narrator voice: most urgent delivery. This is the climax.
- Dramatic pause after "One chance."
- Final line delivered slowly, with weight.

---

### 7.2 Between-Level Transitions

**Score screen audio sequence:**
1. Victory fanfare plays (Track 8: 5-7 seconds)
2. Score counting sounds (UI-SCORE-TICK-01) as numbers tally
3. Bonus score for secrets found: special chime
4. Bonus score for treasure: coin cascade sound
5. Bonus score for time: clock ticking sound accelerating
6. "Par time beaten" alert if applicable: triumphant sting
7. Fade to exploration music of next level

### 7.3 Boss Introduction Audio Stings

When entering a boss room, a specific audio sequence plays:

1. **Door seals behind player** (ENV-DOOR-METAL-02 at high volume -- NO going back)
2. **2 seconds of near-silence** (ambient only, extremely quiet -- tension building)
3. **Boss theme begins** (Track 6 at 30% volume, building)
4. **Boss speaks intro line** (boss-specific INTRO voice lines from Section 2)
5. **Music rises to full volume** after boss finishes speaking
6. **Combat begins**

**Timing for Hans Grosse example:**
```
0.0s    - Door slam (ENV-DOOR-METAL-02)
0.0-2.0s - Near silence (ambient at 10%)
2.0s    - Boss music fades in (0% -> 30% over 2 seconds)
4.0s    - "Guten Tag." (HG-INTRO-01) -- music ducks to 15%
6.5s    - "Du bist also der Spion. Wie... enttauschend." (HG-INTRO-02)
10.0s   - Music rises to 100%
10.0s   - Boss AI activates, combat begins
```

### 7.4 Victory Celebrations

**Episode completion sequence (after final boss of episode):**

1. Boss death sound plays (extended, dramatic)
2. **3 seconds of total silence** (let the death sink in)
3. Single sustained note (low brass, building)
4. UI-EPISODECOMPLETE-01 plays (15-20 second victory theme)
5. Score screen appears with stats
6. Text: "Episode X Complete" with typewriter sound effect
7. Fade to next episode intro or credits

**Final game completion (after General Fettgesicht):**

1. Boss death sequence (longest in the game: 5 seconds)
2. **5 seconds of silence** (the war is over)
3. Track 11 (Credits: Return of the Hero) begins
4. Credits roll with all themes reprised
5. After credits: callback to "Guten Tag." -- Hans Grosse's voice, one final time. Easter egg.

---

## 8. Asset Directory Structure & Naming

See Section 6.5 for the complete directory tree and Section 6.6 for naming conventions.

**Master audio manifest** (`assets/audio/audio-manifest.json`):

This JSON file maps every audio ID used in code to its file path, metadata, and playback properties. The audio engine loads this at startup.

```json
{
    "version": "1.0.0",
    "format_preference": ["ogg", "mp3"],

    "music": {
        "menu_theme":       { "file": "music/menu_theme",       "loop": true,  "volume": 1.0 },
        "e1_combat":        { "file": "music/e1_combat",        "loop": true,  "volume": 1.0 },
        "e1_explore":       { "file": "music/e1_explore",       "loop": true,  "volume": 0.8 },
        "e2_theme":         { "file": "music/e2_theme",         "loop": true,  "volume": 1.0 },
        "e3_theme":         { "file": "music/e3_theme",         "loop": true,  "volume": 1.0 },
        "boss_battle":      { "file": "music/boss_battle",      "loop": true,  "volume": 1.0 },
        "explore_generic":  { "file": "music/explore_generic",  "loop": true,  "volume": 0.7 },
        "victory_fanfare":  { "file": "music/victory_fanfare",  "loop": false, "volume": 1.0 },
        "game_over":        { "file": "music/game_over",        "loop": false, "volume": 1.0 },
        "secret_level":     { "file": "music/secret_level",     "loop": true,  "volume": 0.9 },
        "credits":          { "file": "music/credits",          "loop": false, "volume": 1.0 }
    },

    "voices": {
        "grd_alert":   { "files": ["voices/guard/grd_alert_01", "voices/guard/grd_alert_02", "voices/guard/grd_alert_03"], "positional": true, "priority": 3, "cooldown": 2.0 },
        "grd_spot":    { "files": ["voices/guard/grd_spot_01", "voices/guard/grd_spot_02", "voices/guard/grd_spot_03"], "positional": true, "priority": 3, "cooldown": 5.0 },
        "grd_attack":  { "files": ["voices/guard/grd_atk_01", "voices/guard/grd_atk_02", "voices/guard/grd_atk_03"], "positional": true, "priority": 5, "cooldown": 3.0 },
        "grd_pain":    { "files": ["voices/guard/grd_pain_01", "voices/guard/grd_pain_02"], "positional": true, "priority": 3, "cooldown": 1.0 },
        "grd_death":   { "files": ["voices/guard/grd_death_01", "voices/guard/grd_death_02"], "positional": true, "priority": 2, "cooldown": 0.0 }
    },

    "sfx": {
        "knife_slash":       { "file": "sfx/weapons/knife_slash",     "positional": false, "priority": 4, "volume": 0.8 },
        "pistol_fire":       { "file": "sfx/weapons/pistol_fire",     "positional": false, "priority": 4, "volume": 1.0 },
        "mp40_burst":        { "file": "sfx/weapons/mp40_burst",      "positional": false, "priority": 4, "volume": 1.0 },
        "gatling_fire":      { "file": "sfx/weapons/gatling_fire",    "positional": false, "priority": 4, "volume": 1.0, "loop": true },
        "door_wood_open":    { "file": "sfx/environment/door_wood_open", "positional": true, "priority": 6 },
        "secret_wall":       { "file": "sfx/environment/secret_wall",    "positional": true, "priority": 6 },
        "footstep_stone":    { "sprite": "sprites/sfx_footsteps",     "positional": false, "priority": 8 },
        "player_damage":     { "files": ["sfx/player/damage_light", "sfx/player/damage_heavy", "sfx/player/damage_critical"], "positional": false, "priority": 1 }
    },

    "ambient": {
        "castle_corridor":   { "file": "ambient/castle_corridor",  "loop": true, "volume": 0.3 },
        "castle_dungeon":    { "file": "ambient/castle_dungeon",   "loop": true, "volume": 0.3 },
        "lab_sterile":       { "file": "ambient/lab_sterile",      "loop": true, "volume": 0.25 }
    }
}
```

**Note:** File paths in the manifest omit the extension. The engine appends `.ogg` or `.mp3` based on browser support detection at runtime.

---

## 9. Implementation Priority & Timeline

### Phase 1: Core Audio (Week 1-2) — CRITICAL PATH

**Must have for playable game:**

| Task | Assets | Effort | Dependency |
|------|--------|--------|------------|
| Upgrade AudioManager with bus architecture | Code only | 4 hours | None |
| Weapon SFX (pistol, MP40, gatling, knife) | 8 files | 3 hours | ElevenLabs SFX API |
| Guard voice lines (all 13) | 13 files | 4 hours | ElevenLabs Voice API |
| Player damage + death sounds | 5 files | 2 hours | ElevenLabs Voice API |
| Door open/close SFX | 4 files | 1 hour | ElevenLabs SFX API |
| Menu theme music | 1 track | 2 hours | Suno AI |
| E1 combat music | 1 track | 2 hours | Suno AI |
| Boss battle music | 1 track | 2 hours | Suno AI |
| Victory fanfare + Game over sting | 2 tracks | 1 hour | Suno AI |
| Mobile audio unlock | Code only | 1 hour | None |
| Audio manifest (JSON) | 1 file | 1 hour | None |

**Phase 1 total: ~23 hours, ~34 audio assets**

### Phase 2: Immersion Layer (Week 3-4) — HIGH

| Task | Assets | Effort | Dependency |
|------|--------|--------|------------|
| SS Soldier voice lines (14) | 14 files | 4 hours | ElevenLabs |
| Officer voice lines (12) | 12 files | 3 hours | ElevenLabs |
| Dog sounds (7) | 7 files | 2 hours | ElevenLabs SFX |
| Footstep variants (20 files) | 20 files | 3 hours | ElevenLabs SFX |
| Environment ambient loops (3) | 3 files | 3 hours | ElevenLabs SFX + layering |
| Pickup/item sounds (14) | 14 files | 2 hours | Web Audio synthesis |
| Secret wall + reveal sounds | 2 files | 1 hour | ElevenLabs SFX |
| E1 exploration music | 1 track | 2 hours | Suno AI |
| E2 theme music | 1 track | 2 hours | Suno AI |
| Reverb impulse responses | Code + 5 IR files | 2 hours | Web Audio API |
| Music state machine + crossfading | Code only | 3 hours | Phase 1 AudioManager |
| 3D sound positioning tuning | Code only | 2 hours | Phase 1 AudioManager |

**Phase 2 total: ~29 hours, ~78 audio assets**

### Phase 3: Boss Experience (Week 5) — HIGH

| Task | Assets | Effort | Dependency |
|------|--------|--------|------------|
| Hans Grosse voice lines (12) | 12 files | 4 hours | ElevenLabs |
| Dr. Schabbs voice lines (10) | 10 files | 3 hours | ElevenLabs |
| Hitler (Mech) voice lines (7) + post-processing | 7 files | 4 hours | ElevenLabs + Audacity |
| Hitler (No Mech) voice lines (7) | 7 files | 3 hours | ElevenLabs |
| Boss intro cinematic sequence system | Code only | 3 hours | Phase 2 music system |
| Boss intro audio sequences (timing) | Config only | 2 hours | Boss voice lines |

**Phase 3 total: ~19 hours, ~36 audio assets**

### Phase 4: Polish & Cinematics (Week 6) — MEDIUM

| Task | Assets | Effort | Dependency |
|------|--------|--------|------------|
| Mutant voice lines (9) + post-processing | 9 files | 4 hours | ElevenLabs + Audacity |
| Otto Giftmacher voice lines (7) | 7 files | 2 hours | ElevenLabs |
| Gretel Grosse voice lines (8) | 8 files | 3 hours | ElevenLabs |
| General Fettgesicht voice lines (10) | 10 files | 3 hours | ElevenLabs |
| Episode intro narrations (3) | 3 files | 3 hours | ElevenLabs (narrator voice) |
| E3 theme music | 1 track | 2 hours | Suno AI |
| Secret level music | 1 track | 2 hours | Suno AI |
| Generic exploration music | 1 track | 1 hour | Suno AI |
| Credits theme | 1 track | 2 hours | Suno AI |
| Audio sprite sheet compilation | 4 sheets | 2 hours | All SFX complete |
| Sound priority tuning | Code only | 2 hours | All audio loaded |
| UI sounds (9 synthesized) | 9 files/code | 2 hours | Web Audio API |
| Heartbeat system (procedural) | Code only | 2 hours | Web Audio API |
| Low health breathing loop | 1 file + code | 1 hour | ElevenLabs + Web Audio |

**Phase 4 total: ~31 hours, ~54 audio assets**

### Phase 5: Quality Assurance (Week 7) — CRITICAL

| Task | Effort |
|------|--------|
| Full playthrough audio review (all episodes) | 4 hours |
| Volume balance pass (all assets relative to each other) | 3 hours |
| Frequency clash resolution (SFX vs music) | 2 hours |
| Mobile testing (iOS Safari, Chrome Android) | 3 hours |
| Browser compatibility testing (Chrome, Firefox, Safari, Edge) | 2 hours |
| Loop point verification (all looping assets) | 2 hours |
| Performance profiling (memory, CPU usage) | 2 hours |
| German pronunciation review | 2 hours |
| Bug fixing and final adjustments | 4 hours |

**Phase 5 total: ~24 hours**

### Summary

| Phase | Duration | Audio Assets | Code Changes | Total Effort |
|-------|----------|-------------|--------------|--------------|
| 1: Core Audio | Week 1-2 | 34 | Major (AudioManager upgrade) | 23 hours |
| 2: Immersion | Week 3-4 | 78 | Medium (music system, reverb) | 29 hours |
| 3: Bosses | Week 5 | 36 | Light (cinematic sequences) | 19 hours |
| 4: Polish | Week 6 | 54 | Medium (sprite sheets, heartbeat) | 31 hours |
| 5: QA | Week 7 | 0 | Light (bug fixes) | 24 hours |
| **TOTAL** | **7 weeks** | **~202 assets** | | **~126 hours** |

**Total budget:**
- ElevenLabs: ~$40 (voices + SFX)
- Suno AI: ~$10 (1 month Pro)
- Tools (Audacity, etc.): Free
- **Total: ~$50**

---

## 10. Quality Control & Testing

### 10.1 Audio Test Checklist (per level)

- [ ] All enemy types in this level have working voice lines
- [ ] Voice lines trigger at correct gameplay moments
- [ ] No two identical voice lines play back-to-back (randomization working)
- [ ] Weapon sounds play on every fire, no dropouts
- [ ] Footsteps match movement speed
- [ ] Doors have open/close sounds
- [ ] Ambient loop is seamless (no audible join)
- [ ] Music state transitions are smooth (explore -> combat -> explore)
- [ ] 3D positioning is correct (enemies sound like they are where they are)
- [ ] Volume balance: voices > weapons > music > ambient
- [ ] No audio clipping at any point
- [ ] Performance: no frame drops from audio processing

### 10.2 Boss Encounter Audio Test

- [ ] Door seal sound plays on entry
- [ ] Silence gap before boss music is effective
- [ ] Boss intro voice lines play correctly
- [ ] Music ducks during voice lines, rises after
- [ ] All boss attack/pain/death lines trigger correctly
- [ ] Boss death sequence timing is correct
- [ ] Post-death silence is effective
- [ ] Victory music transition is smooth

### 10.3 Cross-Browser Compatibility Matrix

| Feature | Chrome | Firefox | Safari | Edge | iOS Safari | Chrome Android |
|---------|--------|---------|--------|------|-----------|---------------|
| Web Audio API | Yes | Yes | Yes | Yes | Yes* | Yes |
| OGG Vorbis | Yes | Yes | No** | Yes | No** | Yes |
| MP3 | Yes | Yes | Yes | Yes | Yes | Yes |
| HRTF Panning | Yes | Yes | Partial | Yes | Partial | Yes |
| AudioContext auto-resume | Yes | Yes | No*** | Yes | No*** | Yes |
| Concurrent audio limit | 128+ | 128+ | 16 | 128+ | 8 | 32+ |

\* Requires user interaction to start
\** Falls back to MP3
\*** Requires explicit unlock strategy (Section 5.7)

### 10.4 Performance Budgets

| Metric | Budget | Measurement |
|--------|--------|-------------|
| Total audio memory | < 60 MB | `performance.memory` or dev tools |
| Audio decode time (initial load) | < 3 seconds | Custom timer on asset load |
| Per-frame audio processing | < 2ms | `performance.now()` bracketing |
| Max concurrent AudioNodes | < 32 | Custom counter |
| Audio latency (trigger to playback) | < 50ms | Custom measurement |

---

## Appendix A: Complete Voice Line Quick Reference

For quick lookup during implementation. Format: `ID -> "Text" (Trigger)`

**Guard:** `GRD-ALERT-01:"Achtung!"` | `GRD-ALERT-02:"Was war das?"` | `GRD-ALERT-03:"Wer ist da?"` | `GRD-SPOT-01:"Halt!"` | `GRD-SPOT-02:"Halt! Stehenbleiben!"` | `GRD-SPOT-03:"Du da! Halt!"` | `GRD-ATK-01:[grunt]` | `GRD-ATK-02:[grunt]` | `GRD-ATK-03:"Stirb!"` | `GRD-PAIN-01:[pain]` | `GRD-PAIN-02:[pain]` | `GRD-DEATH-01:"Mein Leben!"` | `GRD-DEATH-02:"Nein...!"`

**SS:** `SS-ALERT-01:"Schutzstaffel!"` | `SS-ALERT-02:"Eindringling!"` | `SS-ALERT-03:"Er ist hier."` | `SS-SPOT-01:"Du!"` | `SS-SPOT-02:"Feuer!"` | `SS-SPOT-03:"Keine Gnade!"` | `SS-ATK-01:[roar]` | `SS-ATK-02:"Fur das Reich!"` | `SS-ATK-03:[bark]` | `SS-PAIN-01:[grunt]` | `SS-PAIN-02:[cry]` | `SS-DEATH-01:[scream]` | `SS-DEATH-02:"Nein... das kann nicht..."` | `SS-DEATH-03:[scream]`

**Officer:** `OFF-ALERT-01:[whistle]` | `OFF-ALERT-02:"Alarm!"` | `OFF-ALERT-03:"Sicherheitsbruch!"` | `OFF-SPOT-01:"Spion!"` | `OFF-SPOT-02:"Ergreift ihn!"` | `OFF-SPOT-03:"Da bist du!"` | `OFF-ATK-01:[yelling]` | `OFF-ATK-02:"Verschwinde!"` | `OFF-PAIN-01:"Argh!"` | `OFF-PAIN-02:"Verdammt!"` | `OFF-DEATH-01:[cry]` | `OFF-DEATH-02:"Das... Vaterland..."`

---

## Appendix B: Suno Prompt Cheat Sheet

Quick copy-paste prompts for all 11 tracks. See Section 4 for full details.

1. **Menu:** `Epic orchestral military march, dark and foreboding, brass fanfare, timpani, minor key, 80 BPM, cinematic, WW2, looping, no vocals`
2. **E1 Combat:** `Fast aggressive orchestral metal hybrid, 140 BPM, double bass drums, distorted guitar, brass stabs, action, WW2, looping, no vocals`
3. **E1 Explore:** `Tense dark ambient, 70 BPM, minimal, suspenseful strings, piano, stealth, dark castle, no vocals, looping`
4. **E2:** `Dark horror orchestral, industrial, 110 BPM, distorted synths, eerie choir, pipe organ, laboratory horror, no vocals, looping`
5. **E3:** `Epic intense military orchestral, 130 BPM, war drums, brass fanfare, final battle, WW2, no vocals, looping`
6. **Boss:** `Epic cinematic boss battle, 150 BPM, orchestral metal, heavy guitar, war drums, latin choir, final boss, no vocals, looping`
7. **Generic Explore:** `Minimal atmospheric tension, 60 BPM, sparse piano, low drone, dark corridors, whisper-quiet, no vocals, looping`
8. **Victory:** `Short triumphant military fanfare, brass, heroic, 6 seconds, no vocals, no loop`
9. **Game Over:** `Dark somber orchestral sting, descending brass, timpani, 4 seconds, no vocals, no loop`
10. **Secret Level:** `Quirky mysterious orchestral, 100 BPM, harpsichord, pizzicato, music box, whimsical dark, no vocals, looping`
11. **Credits:** `Epic cinematic orchestral finale, building, 90-130 BPM, triumphant brass, choir, 3 minutes, no vocals`

---

## Appendix C: Web Audio Synthesis Recipes

For sounds generated procedurally without audio files.

### Heartbeat (Low Health)

```javascript
function createHeartbeat(context, bpm) {
    const beatInterval = 60 / bpm;
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'sine';
    osc.frequency.value = 40;  // Sub-bass thump

    // Envelope: quick attack, medium decay
    const now = context.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.6, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    // Double-beat pattern (lub-dub)
    // Schedule second beat 0.15s after first

    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(now);
    osc.stop(now + 0.4);

    return { interval: beatInterval };
}
```

### Pickup Chime (Treasure)

```javascript
function createPickupChime(context, notes, duration) {
    // notes = [523.25, 659.25, 783.99] for C5-E5-G5 major chord
    const masterGain = context.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(context.destination);

    notes.forEach((freq, i) => {
        const osc = context.createOscillator();
        const gain = context.createGain();

        osc.type = 'triangle';
        osc.frequency.value = freq;

        const startTime = context.currentTime + (i * 0.08);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.5, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(startTime);
        osc.stop(startTime + duration);
    });
}
```

### Extra Life Jingle (1-Up)

```javascript
function createOneUpJingle(context) {
    // C5 - E5 - G5 - C6 - E6 ascending
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    const noteDuration = 0.12;
    const masterGain = context.createGain();
    masterGain.gain.value = 0.4;
    masterGain.connect(context.destination);

    notes.forEach((freq, i) => {
        const osc = context.createOscillator();
        const gain = context.createGain();

        osc.type = 'square';  // Retro feel
        osc.frequency.value = freq;

        const start = context.currentTime + (i * noteDuration);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.6, start + 0.01);
        gain.gain.setValueAtTime(0.6, start + noteDuration * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.01, start + noteDuration);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(start);
        osc.stop(start + noteDuration * 1.5);
    });
}
```

### Empty Click (No Ammo)

```javascript
function createEmptyClick(context) {
    const bufferSize = context.sampleRate * 0.05;  // 50ms
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const data = buffer.getChannelData(0);

    // Sharp transient click
    data[0] = 1.0;
    data[1] = -0.8;
    data[2] = 0.5;
    data[3] = -0.3;

    // Rapid decay
    for (let i = 4; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(0.95, i);
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;  // Thin, metallic

    source.buffer = buffer;
    source.connect(filter);
    filter.connect(context.destination);
    source.start();
}
```

---

*This document is the single source of truth for all audio in Infernal Assault. Every sound in the game should be traceable to an entry in this document. If a sound is not listed here, it does not exist in the game.*

**End of Audio Masterplan.**
