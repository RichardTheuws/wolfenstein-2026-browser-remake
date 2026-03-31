# Wolfenstein 3D (1992) -- Complete Gameplay Analysis

**Purpose**: Exhaustive reference document for faithfully recreating the original Wolfenstein 3D (id Software, May 5, 1992) as a browser-based game.
**Source**: Original id Software source code (GitHub: id-Software/wolf3d), Wolfenstein Wiki, community research, and technical documentation.

---

## Table of Contents

1. [Enemy Types](#1-enemy-types)
2. [Weapons](#2-weapons)
3. [Level Design Patterns](#3-level-design-patterns)
4. [Game Mechanics](#4-game-mechanics)
5. [Visual Style](#5-visual-style)
6. [What Made It Iconic](#6-what-made-it-iconic)

---

## 1. Enemy Types

### Overview

Wolfenstein 3D features **5 regular enemy types** and **7 boss enemies** across 6 episodes (plus Pac-Man ghosts as an Easter egg). Enemy health is defined in the source code via the `starthitpoints[4][NUMENEMIES]` array in `WL_ACT2.C`, indexed by four difficulty levels.

### 1.1 Regular Enemies

---

#### Guard (Brown Soldier)

| Property | Value |
|----------|-------|
| **Appearance** | Brown uniform, steel helmet, armed with a pistol. The most common enemy in the game. |
| **Health** | 25 HP (all difficulties) |
| **Score** | 100 points |
| **Weapon** | Pistol (hitscan) |
| **Drop** | Ammo clip (4 bullets) |
| **First Appears** | Episode 1, Floor 1 |
| **Speed Multiplier** | 3x base speed when alerted |

**AI Behavior**:
- Can be found standing still (stationary) or patrolling set routes (4-frame walk cycle).
- When alerted, enters chase mode and pursues the player using `SelectChaseDir()` pathfinding.
- Fires single pistol shots with damage scaled by distance.
- Reaction time after spotting player: `1 + US_RndT()/4` tics (variable delay).
- Opens doors to pursue the player through rooms.
- Takes double damage from first hit if not yet alerted ("assassination bonus").

**Voice Lines & Sounds**:
| Event | Sound | Translation |
|-------|-------|-------------|
| Alert (spot player) | "Halt!" | "Stop!" |
| Alert (alternate) | "Achtung!" | "Attention!" / "Warning!" |
| Death | Generic death scream | -- |
| Firing | Pistol shot SFX | -- |

---

#### Officer (White Uniform)

| Property | Value |
|----------|-------|
| **Appearance** | White uniform, officer's cap. Faster and more dangerous than guards. |
| **Health** | 50 HP (all difficulties) |
| **Score** | 400 points |
| **Weapon** | Pistol (hitscan, more accurate than guard) |
| **Drop** | Ammo clip (4 bullets) |
| **First Appears** | Episode 1, Floor 2 |
| **Speed Multiplier** | 5x base speed when alerted (fastest regular enemy) |

**AI Behavior**:
- Same patrol/chase behavior as guards but significantly faster.
- Higher accuracy at range due to officer-class hit calculation.
- Reaction time: fixed at 2 tics (faster than guards, more predictable).
- Very dangerous in groups due to combined speed and accuracy.
- Opens doors to pursue the player.

**Voice Lines & Sounds**:
| Event | Sound | Translation |
|-------|-------|-------------|
| Alert | "Spion!" | "Spy!" |
| Death | "Mein Leben!" | "My life!" |
| Firing | Pistol shot SFX | -- |

**Note**: "Mein Leben!" became one of the most iconic sound bites in gaming history. The phrase is often misattributed to the SS trooper, but it is the Officer's death cry in the original game. (Some sources attribute it to the SS -- there is ongoing community debate as the low-quality audio makes it ambiguous. Both enemy types use it in various ports.)

---

#### SS Trooper (Blue Uniform)

| Property | Value |
|----------|-------|
| **Appearance** | Blue uniform with SS insignia, armed with a machine gun. Elite soldiers. |
| **Health** | 100 HP (all difficulties) |
| **Score** | 500 points |
| **Weapon** | Machine gun (hitscan, rapid fire) |
| **Drop** | Machine Gun + 6 bullets (if player lacks MG), otherwise Ammo clip (4 bullets) |
| **First Appears** | Episode 1, Floor 3 |
| **Speed Multiplier** | 4x base speed when alerted |

**AI Behavior**:
- Patrol and chase behavior similar to guards.
- Fires in rapid bursts, dealing significantly more damage than guards or officers.
- More resilient -- requires multiple hits to kill even with the machine gun.
- Uses `SSFIRESND` distinct from standard `NAZIFIRESND`.

**Voice Lines & Sounds**:
| Event | Sound | Translation |
|-------|-------|-------------|
| Alert | "Schutzstaffel!" | "Protection Squadron!" (name of the SS organization) |
| Death | Death scream (distinct from guard) | -- |
| Firing | Machine gun burst SFX | -- |

---

#### Dog (German Shepherd)

| Property | Value |
|----------|-------|
| **Appearance** | Brown German Shepherd attack dog. Small, fast, and aggressive. |
| **Health** | 1 HP (all difficulties) |
| **Score** | 200 points |
| **Weapon** | Bite (melee only, must be adjacent) |
| **Drop** | Nothing |
| **First Appears** | Episode 1, Floor 1 |
| **Speed Multiplier** | 2x base speed when alerted |

**AI Behavior**:
- Uses specialized `T_DogChase` function (different from human enemies).
- Can only attack when in the same tile or adjacent tile as the player (`MINACTORDIST`).
- Extremely fast approach but dies in a single hit from any weapon.
- Uses `T_Bite` jump-attack when within striking range.
- Reaction time: `1 + US_RndT()/8` tics (very fast reactions).
- Cannot open doors (unlike human enemies).
- Often placed behind doors as ambush surprises.
- No ranged attack -- pure melee threat.
- Silent approach (no alert vocalization other than barking).

**Voice Lines & Sounds**:
| Event | Sound | Translation |
|-------|-------|-------------|
| Alert | Bark/growl SFX | -- |
| Attack | Bite SFX | -- |
| Death | Yelp/whimper SFX | -- |

---

#### Mutant (Green/Pale)

| Property | Value |
|----------|-------|
| **Appearance** | Pale/green-skinned soldier with a pistol grafted into their chest. Created by Dr. Schabbs' experiments. Wears ragged green clothing. |
| **Health (by difficulty)** | Baby: 45, Easy: 55, Normal: 55, Hard: 65 |
| **Score** | 700 points |
| **Weapon** | Chest-mounted pistol (hitscan) |
| **Drop** | Ammo clip (4 bullets) |
| **First Appears** | Episode 2 (associated with Dr. Schabbs' experiments) |
| **Speed Multiplier** | 3x base speed when alerted |

**AI Behavior**:
- **Silent alert** -- unlike other enemies, Mutants make no sound when they spot the player. This makes them extremely dangerous as ambush enemies.
- HP scales with difficulty (the only regular enemy with difficulty-scaled health besides bosses).
- Same general chase/attack pattern as guards but without the audio warning.
- Often placed in unexpected locations to surprise the player.
- Marked with `FL_AMBUSH` flag in many placements.

**Voice Lines & Sounds**:
| Event | Sound | Translation |
|-------|-------|-------------|
| Alert | **Silent** (no alert sound!) | -- |
| Death | Gurgling/moaning death SFX | -- |
| Firing | Pistol shot SFX | -- |

---

### 1.2 Boss Enemies

Bosses appear on Floor 9 (the boss floor) of each episode. Boss HP scales significantly with difficulty. All bosses have unique sprites, voice lines, and attack patterns.

---

#### Hans Grosse -- Episode 1 Boss

| Property | Value |
|----------|-------|
| **Appearance** | Massive soldier in grey/brown armor with a bald head. Extremely imposing figure. The first boss the player encounters. |
| **Health** | Baby: 850, Easy: 950, Normal: 1050, Hard: 1200 |
| **Score** | 5,000 points |
| **Weapon** | Dual chain guns (hitscan, devastating rate of fire) |
| **Episode** | 1: Escape from Castle Wolfenstein |

**AI Behavior**:
- Speed multiplier: 3x base speed.
- Fires two chain guns simultaneously in rapid bursts.
- Pursues player aggressively through the boss arena.
- No projectile attacks -- pure hitscan with extreme volume of fire.
- Boss arena is typically a large open room providing minimal cover.

**Voice Lines & Sounds**:
| Event | Sound | Translation |
|-------|-------|-------------|
| Alert | "Guten Tag!" | "Good day!" |
| Death | "Mutti!" | "Mommy!" |

---

#### Dr. Schabbs -- Episode 2 Boss

| Property | Value |
|----------|-------|
| **Appearance** | Obese mad scientist in a white lab coat. Creator of the Mutant army. Bald with round glasses. |
| **Health** | Baby: 850, Easy: 950, Normal: 1550, Hard: 2400 |
| **Score** | 5,000 points |
| **Weapon** | Hypodermic syringes (projectile -- "needles") |
| **Episode** | 2: Operation Eisenfaust |

**AI Behavior**:
- Throws syringes as projectiles (not hitscan -- can be dodged).
- Needle damage formula: `(US_RndT()/8) + 20` (20-51 damage per hit).
- Highest HP scaling of any boss (850 to 2400 from Baby to Hard).
- Moves slowly but his projectiles are dangerous.
- Uses `T_SchabbThrow` with calculated angles toward the player.
- **Special death effect**: If BJ is killed by Dr. Schabbs' needles, the BJ face on the HUD transforms into a Mutant face (unique death graphic: `MUTANTBJPIC`).

**Voice Lines & Sounds**:
| Event | Sound | Translation |
|-------|-------|-------------|
| Alert | Evil laugh | -- |
| Death | "Mein Gott in Himmel!" | "My God in Heaven!" |

---

#### Fake Hitler (Mech Decoys) -- Episode 3 Mini-Boss

| Property | Value |
|----------|-------|
| **Appearance** | Hitler lookalike robots in mech suits. Multiple copies appear as decoys before the real Hitler fight. Green/grey mech suit with visible mechanical components. |
| **Health** | Baby: 200, Easy: 300, Normal: 400, Hard: 500 |
| **Score** | 2,000 points |
| **Weapon** | Flamethrower (fireball projectile) |
| **Episode** | 3: Die, Fuhrer, Die! (Floor 9 only) |

**AI Behavior**:
- Shoots fireballs as projectiles.
- Fireball damage: `US_RndT()/8` (0-31 damage, relatively low).
- Multiple Fake Hitlers can appear in the same level.
- Serve as a gauntlet before the real Hitler encounter.
- Upon death, the mech suit "breaks apart" revealing nothing inside (they are robots).

**Voice Lines & Sounds**:
| Event | Sound | Translation |
|-------|-------|-------------|
| Alert | Mechanical sounds | -- |
| Death | Mechanical destruction SFX | -- |

---

#### Adolf Hitler (Mech Suit) -- Episode 3 Boss (Phase 1)

| Property | Value |
|----------|-------|
| **Appearance** | Hitler inside a large grey mechanical battle suit with 4 chain guns mounted on the arms. The mech suit is bulky and imposing. |
| **Health** | Baby: 800, Easy: 950, Normal: 1050, Hard: 1200 |
| **Score** | 5,000 points (mech phase) |
| **Weapon** | 4x chain guns (hitscan, extreme fire rate) |
| **Episode** | 3: Die, Fuhrer, Die! |

**AI Behavior**:
- Phase 1 of a two-phase boss fight.
- Fires 4 chain guns simultaneously (highest hitscan DPS in the game).
- Produces distinct mechanical sound effects (`A_MechaSound`).
- When mech suit HP is depleted, triggers `A_HitlerMorph` -- the mech suit breaks apart and Hitler emerges on foot for Phase 2.

**Voice Lines & Sounds**:
| Event | Sound | Translation |
|-------|-------|-------------|
| Alert | "Die, Allied Schweinhund!" | "Die, Allied pig-dog!" |
| Mech destroyed | "Scheisse!" | "Shit!" |

---

#### Adolf Hitler (On Foot) -- Episode 3 Boss (Phase 2)

| Property | Value |
|----------|-------|
| **Appearance** | Hitler without the mech suit, wearing his brown uniform with Nazi armband. Smaller and faster than the mech form. Recognizable mustache and hairstyle. |
| **Health** | Approximately 400-500 (separate health pool after mech destruction) |
| **Score** | 5,000 points |
| **Weapon** | Dual chain guns (hitscan) |
| **Episode** | 3: Die, Fuhrer, Die! |

**AI Behavior**:
- Emerges from destroyed mech suit.
- Much faster movement than the mech phase.
- High-speed chase with rapid shooting sequences.
- Still very dangerous despite lower HP than the mech.

**Voice Lines & Sounds**:
| Event | Sound | Translation |
|-------|-------|-------------|
| Death (final) | "Eva, auf Wiedersehen!" | "Eva, goodbye!" (referring to Eva Braun) |

---

#### Otto Giftmacher -- Episode 4 Boss

| Property | Value |
|----------|-------|
| **Appearance** | Military officer/scientist. Creator of chemical weapons. Armed with a rocket launcher. |
| **Health** | Baby: 850, Easy: 950, Normal: 1050, Hard: 1200 |
| **Score** | 5,000 points |
| **Weapon** | Rocket launcher (projectile) |
| **Episode** | 4: A Dark Secret |

**AI Behavior**:
- Fires rockets as projectiles (can be dodged by strafing).
- Rocket damage: `(US_RndT()/8) + 30` (30-61 damage per hit).
- Uses `T_GiftThrow` function with angle calculation.
- Name translates to "Otto Poison-Maker."

**Voice Lines & Sounds**:
| Event | Sound | Translation |
|-------|-------|-------------|
| Alert | "Eine kleine Amerikaner!" | "A little American!" |
| Death | "Donnerwetter!" | "Thunderstorm!" (exclamation, like "Good heavens!") |

---

#### Gretel Grosse -- Episode 5 Boss

| Property | Value |
|----------|-------|
| **Appearance** | Large female soldier, sister of Hans Grosse. Similar imposing build to her brother. Armed with dual chain guns. |
| **Health** | Baby: 850, Easy: 950, Normal: 1050, Hard: 1200 |
| **Score** | 5,000 points |
| **Weapon** | Dual chain guns (hitscan) -- fires 6 bullets per volley |
| **Episode** | 5: Trail of the Madman |

**AI Behavior**:
- Similar to Hans Grosse but with 6-bullet volleys.
- Guards the plans for the "Giftkrieg" (poison war).
- Aggressive pursuit behavior.

**Voice Lines & Sounds**:
| Event | Sound | Translation |
|-------|-------|-------------|
| Alert | "Kein Durchgang!" | "No trespassing!" |
| Death | "Mein Busse!" | "My repentance!" |

---

#### General Fettgesicht -- Episode 6 Boss

| Property | Value |
|----------|-------|
| **Appearance** | Large, imposing general. Name translates to "Fat Face." Armed with both a chain gun and a rocket launcher. The final boss of the full Wolfenstein 3D game. |
| **Health** | Baby: 850, Easy: 950, Normal: 1050, Hard: 1200 |
| **Score** | 5,000 points |
| **Weapon** | Chain gun (hitscan) + Rocket launcher (projectile) -- dual wielding |
| **Episode** | 6: Confrontation |

**AI Behavior**:
- Most versatile boss -- combines hitscan and projectile attacks.
- Can hit you at any range with the chain gun while also launching rockets.
- Uses both `T_Fat` (rocket throw) and standard shooting.
- The final challenge of the game.

**Voice Lines & Sounds**:
| Event | Sound | Translation |
|-------|-------|-------------|
| Alert | "Erlauben Sie, bitte!" | "Allow me, please!" |
| Death | "Rosenknospe!" | "Rosebud!" (a Citizen Kane reference) |

---

### 1.3 Special / Easter Egg Enemies

#### Pac-Man Ghosts (Episode 3, Secret Level)

| Property | Value |
|----------|-------|
| **Types** | Blinky (red), Pinky (pink), Clyde (orange), Inky (cyan) |
| **Health** | 25 HP each (all difficulties) |
| **Behavior** | Use `T_Ghosts` for movement -- simple directional chase, no attack capability |
| **Episode** | Episode 3, Secret Floor (Floor 10) |

The secret level of Episode 3 features a Pac-Man themed maze with the four classic ghosts. They chase the player but cannot attack. This is one of gaming's earliest Easter eggs in an FPS.

#### Spectre (Spear of Destiny)

| Property | Value |
|----------|-------|
| **Health** | Baby: 5, Easy: 10, Normal: 15, Hard: 25 |
| **Behavior** | Nearly invisible enemy, partially transparent sprite |

**Note**: The Spectre appears in Spear of Destiny. Include only if implementing SoD content.

---

### 1.4 Complete Hitpoints Reference Table

| Enemy | Baby | Easy | Normal | Hard | Score |
|-------|------|------|--------|------|-------|
| Guard | 25 | 25 | 25 | 25 | 100 |
| Officer | 50 | 50 | 50 | 50 | 400 |
| SS | 100 | 100 | 100 | 100 | 500 |
| Dog | 1 | 1 | 1 | 1 | 200 |
| Mutant | 45 | 55 | 55 | 65 | 700 |
| Hans Grosse | 850 | 950 | 1050 | 1200 | 5,000 |
| Dr. Schabbs | 850 | 950 | 1550 | 2400 | 5,000 |
| Fake Hitler | 200 | 300 | 400 | 500 | 2,000 |
| Mecha Hitler | 800 | 950 | 1050 | 1200 | 5,000 |
| Otto Giftmacher | 850 | 950 | 1050 | 1200 | 5,000 |
| Gretel Grosse | 850 | 950 | 1050 | 1200 | 5,000 |
| Gen. Fettgesicht | 850 | 950 | 1050 | 1200 | 5,000 |
| Pac-Man Ghosts | 25 | 25 | 25 | 25 | -- |
| Spectre (SoD) | 5 | 10 | 15 | 25 | -- |

**Spear of Destiny bosses** (for reference, if scope expands):

| Enemy | Baby | Easy | Normal | Hard |
|-------|------|------|--------|------|
| Trans Grosse | 850 | 950 | 1050 | 1200 |
| Barnacle Wilhelm | 950 | 1050 | 1150 | 1300 |
| Ubermutant | 1050 | 1150 | 1250 | 1400 |
| Death Knight | 1250 | 1350 | 1450 | 1600 |
| Angel of Death | 1450 | 1550 | 1650 | 2000 |

---

## 2. Weapons

### Overview

Wolfenstein 3D has exactly **4 weapons**. All ranged weapons share the same ammo pool (bullets). There are no alternate ammo types. The weapon system is simple but effective.

### 2.1 Knife

| Property | Value |
|----------|-------|
| **Type** | Melee |
| **Ammo** | None (unlimited use) |
| **Damage** | `US_RndT() >> 4` = 0-15 HP per hit |
| **Average Damage** | ~8 HP |
| **Range** | Adjacent tile only (distance < `0x18000` units, roughly 1.5 tiles) |
| **Fire Rate** | Single swing per press (cannot hold fire button) |
| **Available From** | Start of game (always equipped) |

**Behavior**:
- Starting weapon, always available as backup.
- Extremely risky to use -- requires being within melee range.
- Silent attack (does not alert distant enemies).
- Useful for stealth kills on unaware guards (deals double damage to unalerted enemies).
- Visual: BJ's arm extends forward with a combat knife.

### 2.2 Pistol

| Property | Value |
|----------|-------|
| **Type** | Hitscan ranged |
| **Ammo** | 1 bullet per shot |
| **Damage** | Distance-dependent (see formula below) |
| **Fire Rate** | Semi-automatic (single shot per press, cannot hold fire button for auto) |
| **Available From** | Start of game (always equipped) |

**Damage Formula** (same for all hitscan weapons):
- Distance < 2 tiles: `US_RndT() / 4` = 0-63 damage
- Distance 2-4 tiles: `US_RndT() / 6` = 0-42 damage
- Distance > 4 tiles: Hit chance = `US_RndT()/12 >= distance` causes miss; if hit: `US_RndT() / 6` = 0-42 damage

**Behavior**:
- Starting weapon alongside the knife.
- Adequate for single guards at close range.
- Inefficient against groups or high-HP enemies.
- Visual: Luger-style pistol held in right hand.

### 2.3 Machine Gun (Submachine Gun)

| Property | Value |
|----------|-------|
| **Type** | Hitscan ranged, automatic |
| **Ammo** | 1 bullet per shot |
| **Damage** | Same formula as pistol (distance-dependent) |
| **Fire Rate** | Automatic (hold fire button for continuous fire, slow burst) |
| **Obtained** | Dropped by first SS trooper killed (if player doesn't have it), or found in levels |

**Behavior**:
- First automatic weapon available.
- Same per-bullet damage as the pistol, but can fire continuously.
- Good balance between damage output and ammo conservation.
- More efficient than the chain gun for ammo management.
- Visual: MP40-style submachine gun.

### 2.4 Chain Gun (Gatling Gun)

| Property | Value |
|----------|-------|
| **Type** | Hitscan ranged, automatic |
| **Ammo** | 2 bullets per shot (fires twice per frame) |
| **Damage** | Same formula per bullet, but fires 2 bullets per attack frame |
| **Fire Rate** | Fastest in the game (continuous rapid fire) |
| **Obtained** | Found in levels (often in secret rooms), never dropped by enemies |

**Behavior**:
- Most powerful weapon in the game -- effectively double the DPS of the machine gun.
- Consumes ammo at twice the rate (2 bullets per frame vs. 1).
- Essential for boss fights.
- Can chew through ammo reserves quickly if used carelessly.
- Visual: Large multi-barrel Gatling gun.

### 2.5 Weapon Switching

- Player cycles through weapons using number keys (1-4) or weapon pickup auto-switches.
- No weapon wheel or selection menu -- direct key mapping.
- Picking up a new weapon auto-switches to it.
- Weapons can only fire if sufficient ammo is available (except knife).
- When ammo reaches 0, auto-switches to knife.

### 2.6 Ammo System

| Property | Value |
|----------|-------|
| **Max Ammo** | 99 bullets |
| **Starting Ammo** | 8 bullets |
| **Ammo Clip (floor pickup)** | +8 bullets |
| **Enemy Drop (standard)** | +4 bullets |
| **SS Machine Gun Drop** | +6 bullets (if player gets the weapon) |
| **Full Heal Pickup** | +25 bullets (plus health) |

### 2.7 Hit Chance System

The hitscan system performs **two calculations**:
1. **Hit determination**: Random number (0-255) compared to distance threshold
2. **Damage calculation**: Random number (0-255) divided by distance factor

Hit chance formula for enemies (reversed):
- `hitchance = 160 - dist * 16` (when player is visible and running)
- `hitchance = 160 - dist * 8` (when player is partially hidden)

Player weapons always hit if there's line-of-sight and the distance check passes (no accuracy stat per weapon -- they all use the same formula).

---

## 3. Level Design Patterns

### 3.1 Level Structure

| Property | Value |
|----------|-------|
| **Total Episodes** | 6 |
| **Levels per Episode** | 10 (Floors 1-8 regular, Floor 9 boss, Floor 10 secret) |
| **Total Levels** | 60 |
| **Map Grid Size** | 64 x 64 tiles per level |
| **Max Actors** | 150 per level |
| **Max Static Objects** | 400 per level |
| **Max Doors** | 64 per level |

#### Episode Guide

| Episode | Name | Boss | Setting |
|---------|------|------|---------|
| 1 | Escape from Castle Wolfenstein | Hans Grosse | Prison fortress -- BJ escapes captivity |
| 2 | Operation: Eisenfaust | Dr. Schabbs | Castle Nuremberg -- Stop the mutant experiments |
| 3 | Die, Fuhrer, Die! | Adolf Hitler (mech + foot) | Hitler's bunker -- Assassinate the Fuhrer |
| 4 | A Dark Secret | Otto Giftmacher | Chemical factory -- Stop chemical weapons |
| 5 | Trail of the Madman | Gretel Grosse | Castle Erlangen -- Retrieve the poison war plans |
| 6 | Confrontation | General Fettgesicht | Castle Offenbach -- Kill General Fettgesicht |

**Episodes 1-3** ("The Original Missions") were the initial commercial release.
**Episodes 4-6** ("The Nocturnal Missions") were released later as a separate product.

#### Secret Level Access

| Episode | Secret Exit Location | Notable Feature |
|---------|---------------------|-----------------|
| 1 | Floor 1 | -- |
| 2 | Floor 1 | -- |
| 3 | Floor 7 | Features Pac-Man ghosts in a maze |
| 4 | Floor 3 | -- |
| 5 | Floor 5 | -- |
| 6 | Floor 3 | -- |

Secret levels are accessed by finding a hidden elevator (push wall leading to a secret elevator tile). They do not have par times and do not count toward episode completion statistics.

### 3.2 Wall Textures

Wall textures are 64x64 pixel images stored in VSWAP.WL6. The game includes approximately **50 unique wall textures**, each with a dark (shaded) variant for depth perception. Wall IDs occupy values 1-63 in Plane 0 of the map data.

#### Primary Wall Texture Categories

| Category | Description | Typical Use |
|----------|-------------|-------------|
| **Grey Stone** | Standard grey brick/stone walls | Most common wall type, general corridors |
| **Blue Stone** | Dark blue/grey stone bricks | Dark dungeon areas, basement levels, cold areas |
| **Brown Stone** | Brown/tan stone walls | Castle interiors |
| **Red Brick** | Red brick walls | Industrial areas, furnace rooms |
| **Purple/Dark Stone** | Dark purple/maroon stone | Deep dungeon areas |
| **Wood Panels** | Brown wood paneling with trim | Officer quarters, living spaces |
| **Metal/Steel** | Grey metal walls | High-security areas, bunkers |
| **Eagle Emblem** | Stone wall with Nazi eagle relief | Prominent display walls, boss areas |
| **Flag/Banner** | Wall with Nazi flag/swastika banner | Ceremonial rooms, command centers |
| **Dirty/Mossy Stone** | Stone with stains or moss | Underground, neglected areas |
| **Elevator** | Elevator walls with up/down arrows | Level exit areas |
| **Cell Walls** | Prison cell bar textures | Starting areas of Episode 1 |
| **Wooden Door Frame** | Wood frame around door openings | Standard door surrounds |
| **Blue Brick with Skeleton** | Blue stone with embedded skeleton | Dungeon atmosphere |
| **Brown Marble** | Polished brown marble | High-status rooms |
| **Cement/Concrete** | Plain grey concrete | Utilitarian areas |

Each wall texture has both a **light** (directly lit) and **dark** (shaded) variant. The engine automatically selects the dark variant for walls facing North/South and the light variant for East/West, creating a simple but effective lighting illusion.

### 3.3 Door Types

| Door Type | Map Values | Description |
|-----------|-----------|-------------|
| Normal (unlocked) | 090-091 | Standard wooden doors, can be opened by any player |
| Gold Lock | 092-093 | Grey metal door requiring gold key |
| Silver Lock | 094-095 | Grey metal door requiring silver key |
| Elevator | 100-101 | Level exit elevator door |

- Even-numbered values = North/South orientation (player walks through East/West).
- Odd-numbered values = East/West orientation (player walks through North/South).
- Doors animate open (slide into the wall) and auto-close after a timer.
- Enemies can open unlocked doors to pursue the player.
- Locked doors display as a distinct grey metal texture with a keyhole.

### 3.4 Secret Walls (Push Walls)

- Push walls look identical to regular walls but slide backward when activated (pressing the "use" key).
- They reveal hidden rooms containing treasure, ammo, health, or secret passages.
- The push wall slides exactly 2 tiles backward and stops.
- Push walls can only be activated from one side.
- They are a major gameplay element -- finding all secrets is tracked in end-level stats.
- Secret rooms typically contain high-value treasure (crowns, chests) and sometimes extra lives.

### 3.5 Decorative Objects (Static Sprites)

Decorative objects are sprite-based and fall into two categories: **blocking** (collision, cannot walk through) and **non-blocking** (walkable, purely visual).

#### Blocking Objects (Solid)

| Object | Sprite ID | Description |
|--------|-----------|-------------|
| Green Barrel | 24 | Green oil drum |
| Table with Chairs | 25 | Wooden dining table with two chairs |
| Floor Lamp | 26 | Standing floor lamp (light source) |
| Hanged Man | 28 | Skeleton hanging from ceiling |
| White Column/Pillar | 30 | Stone support pillar |
| Tree/Plant | 31 | Green potted tree |
| Sink | 33 | White porcelain sink |
| Potted Plant | 34 | Small potted plant |
| Urn/Vase | 35 | Decorative urn |
| Bare Table | 36 | Empty wooden table |
| Suit of Armor | 39 | Medieval standing armor |
| Hanging Cage | 40 | Metal cage hanging from ceiling |
| Skeleton in Cage | 41 | Cage with skeleton remains |
| Bed | 45 | Prison/barracks bed |
| Barrel | 58 | Standard brown barrel |
| Well (water) | 59 | Stone well with water |
| Well (empty) | 60 | Stone well, dry |
| Flag on Stand | 62 | Small Nazi flag on a stand |
| Stove/Furnace | 68 | Metal stove |
| Spears | 69 | Crossed spears (rack) |

#### Non-Blocking Objects (Walk-through)

| Object | Description |
|--------|-------------|
| Chandelier | Ceiling-mounted light fixture |
| Ceiling Light | Simple overhead light |
| Water Puddle | Small floor puddle |
| Bones/Skull Pile | Scattered bone remains on floor |
| Blood Pool | Dried blood on the floor |
| Dead Guard | Slumped dead soldier body |
| Gibs | Gore/remains on floor |
| Pots and Pans | Kitchen utensils |
| Stove Pipe | Metal chimney pipe |
| Rack/Shelf | Wall-mounted rack |
| Cage (ceiling) | Empty hanging cage variant |
| Vine/Moss | Wall vegetation |

### 3.6 Pickup Items

#### Health Pickups

| Item | Health Restored | Notes |
|------|----------------|-------|
| Dog Food | +4 HP | Small tin bowl, common |
| Plate of Food (Dinner) | +10 HP | Turkey dinner plate |
| First Aid Kit (Medkit) | +25 HP | White box with red cross |
| Blood/Gibs | +1 HP | Only when health is 11 or below |
| One-Up / Full Heal | +99 HP (full heal), +1 life, +25 ammo | Found only in secret areas, extremely rare |

**Note**: Health cannot exceed 100 except through the Full Heal pickup which sets it to 100. Health pickups cannot be collected if already at 100 HP (except gibs at 11 or below).

#### Ammo Pickups

| Item | Ammo Gained | Notes |
|------|-------------|-------|
| Ammo Clip (floor) | +8 bullets | Grey clip found in levels |
| Ammo Clip (enemy drop) | +4 bullets | Half-used magazine dropped by killed enemies |
| Machine Gun (pickup) | +6 bullets + weapon | Dropped by SS if player lacks MG |
| Chain Gun (pickup) | +6 bullets + weapon | Found in levels/secret rooms |

**Max ammo**: 99 bullets.

#### Key Items

| Key | Color | Use |
|-----|-------|-----|
| Gold Key | Gold/Yellow | Opens gold-locked doors |
| Silver Key | Silver/Grey | Opens silver-locked doors |

Keys persist within a single level. Both key slots are shown on the HUD. Keys are consumed when used to unlock a door and are lost between levels.

#### Treasure (Score Items)

| Item | Points | Appearance |
|------|--------|------------|
| Cross | 100 | Small golden cross |
| Chalice | 500 | Gold chalice/goblet |
| Chest | 1,000 | Treasure chest full of gold |
| Crown | 5,000 | Gold royal crown with jewels |

Treasure collection is tracked for end-of-level statistics (Treasure Ratio %).

### 3.7 Common Level Design Patterns

- **Maze corridors**: Long, winding passages with right-angle turns (no diagonal walls).
- **Ambush rooms**: Large rooms where multiple enemies are waiting behind the door.
- **Guard stations**: Small alcoves with standing guards facing doorways.
- **Treasure rooms**: Hidden rooms behind push walls filled with treasure and sometimes extra lives.
- **Dog kennels**: Small rooms with multiple dogs that rush out when the door opens.
- **Key-gated progression**: Players must find gold/silver keys to access deeper areas of the level.
- **Boss arenas**: Floor 9 of each episode is a relatively open room with the boss.
- **Symmetrical layouts**: Many levels feature symmetrical or near-symmetrical room designs.
- **Fake walls**: Dead-end corridors that contain push walls, rewarding exploration.
- **Elevator rooms**: End-of-level elevator with distinct textures and the elevator door.

---

## 4. Game Mechanics

### 4.1 Player Movement

| Property | Value |
|----------|-------|
| **Forward Speed** | `PLAYERSPEED = 3000` units per tic (approximately 11.2 tiles/second) |
| **Run Speed** | `RUNSPEED = 6000` units per tic (only for internal code reference, player always moves at PLAYERSPEED) |
| **Strafe Speed** | Same as forward speed, movement at 45 degrees |
| **Turn Speed** | Mouse or keyboard rotation |
| **Tic Rate** | 70 tics per second |
| **Tile Size** | ~3 meters equivalent (at running speed, BJ moves ~121 km/h / 75 mph) |

**Movement notes**:
- No vertical look (up/down) -- the game is fully horizontal.
- No jumping or crouching.
- Diagonal movement (forward + strafe) is faster than straight movement due to vector addition (the classic "strafe run" exploit).
- Player collision size: `PLAYERSIZE = MINDIST = 0x5800` units.
- Map grid: 64 x 64 tiles.

### 4.2 Health System

| Property | Value |
|----------|-------|
| **Max Health** | 100 HP |
| **Starting Health** | 100 HP |
| **Min Health** | 0 (death) |
| **Difficulty Damage Modifier** | Baby: damage / 4, Easy: damage / 2, Normal: full damage, Hard: full damage |

- Health is displayed both numerically and via BJ's face on the HUD.
- When health reaches 0, BJ dies and loses a life.
- Health pickups cannot exceed 100 (ceiling).

### 4.3 Lives System

| Property | Value |
|----------|-------|
| **Starting Lives** | 3 |
| **Extra Life via Score** | Every 40,000 points (`EXTRAPOINTS = 40000`) |
| **Extra Life via Pickup** | One-Up item (rare, in secret areas only) |
| **On Death** | Lose current level progress, restart floor with: pistol, knife, 8 ammo, 100 HP, no keys |
| **Game Over** | 0 lives remaining + death |

When losing a life, the player:
- Restarts the current floor from the beginning.
- Loses all collected weapons (resets to pistol + knife).
- Loses all ammo (resets to 8 bullets).
- Loses all keys collected on that floor.
- Keeps their score and life count.

### 4.4 Scoring System

#### Kill Points

| Enemy | Points |
|-------|--------|
| Guard | 100 |
| Dog | 200 |
| Officer | 400 |
| SS | 500 |
| Mutant | 700 |
| Fake Hitler | 2,000 |
| Hans Grosse | 5,000 |
| Dr. Schabbs | 5,000 |
| Hitler (total) | 5,000 (mech) + 5,000 (on foot) |
| Otto Giftmacher | 5,000 |
| Gretel Grosse | 5,000 |
| Gen. Fettgesicht | 5,000 |

#### Treasure Points

| Item | Points |
|------|--------|
| Cross | 100 |
| Chalice | 500 |
| Chest (Bible) | 1,000 |
| Crown | 5,000 |

#### End-of-Level Bonuses

| Category | Bonus |
|----------|-------|
| 100% Kill Ratio | 10,000 points |
| 100% Secret Ratio | 10,000 points |
| 100% Treasure Ratio | 10,000 points |
| Under Par Time | 500 points per second under par |
| **Maximum Ratio Bonus** | **30,000 points** |

#### Extra Life Threshold
- Every **40,000 points** accumulated grants an extra life.
- This is tracked via `gamestate.nextextra` which increments by 40,000 each time.

### 4.5 End-of-Level Statistics Screen

After completing each floor (except boss/secret floors in some cases), the player sees a statistics screen displaying:

1. **Floor Completed**: Which floor was just finished.
2. **Kill Ratio**: Percentage of enemies killed (X%).
3. **Secret Ratio**: Percentage of secret push walls found (X%).
4. **Treasure Ratio**: Percentage of treasure items collected (X%).
5. **Time**: How long the floor took to complete.
6. **Par Time**: The target time for the floor.
7. **Bonus**: Points awarded for 100% ratios and par time performance.

The statistics screen tallies up from 0% to the actual percentage with a counting animation and sound effect. Achieving 100% in any category triggers a "Perfect!" bonus notification.

**Par Times**: Boss floors (Floor 9) and secret floors (Floor 10) have no par time. For regular floors (1-8), par times vary by level, typically ranging from 30 seconds to 10+ minutes. Completing a floor under par awards 500 points per second of difference.

### 4.6 Difficulty Levels

| Level | Name | Internal | Effects |
|-------|------|----------|---------|
| 1 | "Can I play, Daddy?" | `gd_baby` | Damage taken / 4, fewer enemies spawned |
| 2 | "Don't hurt me." | `gd_easy` | Damage taken / 2, standard enemy count |
| 3 | "Bring 'em on!" | `gd_medium` | Full damage, more enemies spawned |
| 4 | "I am Death incarnate!" | `gd_hard` | Full damage, maximum enemies, mutant/boss HP increased |

**Difficulty affects**:
- **Damage taken by player**: Baby = 1/4 damage, Easy = 1/2 damage, Medium/Hard = full damage.
- **Enemy count**: Higher difficulties place more enemies on each floor (enemies are tagged with difficulty flags in the map data -- separate map values for each difficulty tier).
- **Boss/Mutant HP**: Bosses and mutants have scaling hitpoints (see hitpoints table above). Regular enemy HP is NOT affected by difficulty.
- **Enemy AI**: Behavior is identical across difficulties (same reaction times, same attack patterns). The difficulty comes purely from numbers and damage.

**Difficulty selection** happens at the start of each new game and cannot be changed mid-game. Each difficulty has a unique face icon on the menu:
1. BJ with a baby bonnet (Can I play, Daddy?)
2. BJ looking concerned (Don't hurt me)
3. BJ looking determined (Bring 'em on!)
4. BJ looking fierce/bloody (I am Death incarnate!)

### 4.7 Enemy AI Deep Dive

#### State Machine

Every enemy follows a state machine with these primary states:

```
STAND -> PATROL -> [player detected] -> CHASE -> ATTACK -> CHASE (loop)
                                              \-> PAIN -> CHASE
                                              \-> DEATH
```

#### Detection System

- **Line-of-sight**: `CheckSight()` traces a ray from the enemy to the player, blocked by walls and closed doors (partially open doors may allow detection).
- **Distance threshold**: Enemies auto-detect the player if within `0x18000` units (~1.5 tiles).
- **Facing direction**: Enemies must be facing roughly toward the player to detect them (not behind them).
- **Sound propagation**: Gunfire alerts all enemies in connected rooms (same "area" in map data). Knife attacks are silent.

#### Movement Types

| Function | Behavior |
|----------|----------|
| `T_Path` | Patrol -- follow predetermined waypoints |
| `T_Chase` / `SelectChaseDir()` | Direct pursuit toward player position |
| `SelectDodgeDir()` | Evasive lateral movement (randomized) |
| `SelectRunDir()` | Flee behavior (inverse of chase) |
| `T_DogChase` | Dog-specific faster chase |
| `T_Ghosts` | Ghost-specific simple directional chase |

#### Attack Behavior

- Enemies evaluate attack opportunity each chase cycle.
- Attack probability: `US_RndT() < chance` determines whether to fire.
- If direct line to player exists, enemies are more likely to shoot.
- After firing, enemies re-enter chase state.
- **Dodge mechanic**: When an enemy has a direct line of fire, they may choose to dodge instead of shoot (randomized).

#### Assassination Bonus

Enemies that have not yet been alerted take **double damage** from the first hit. This is calculated in `DamageActor()` which checks the `FL_ATTACKMODE` flag.

#### Door Interaction

- All human enemies (guards, officers, SS, mutants) can open doors.
- Dogs CANNOT open doors.
- Enemies open doors during chase pathfinding when a door blocks their path.

#### Ambush Flag

- Enemies with the `FL_AMBUSH` flag do NOT patrol and do NOT make alert sounds.
- They stand still until the player enters their direct line of sight.
- Common in "ambush tile" positions (map data value designates ambush spots).

---

## 5. Visual Style

### 5.1 Technical Specifications

| Property | Value |
|----------|-------|
| **Resolution** | 320x200 (VGA Mode 13h) |
| **Color Depth** | 256 colors (8-bit VGA palette) |
| **Rendering** | Ray casting (walls), sprite-based (enemies, objects) |
| **Texture Size** | 64x64 pixels (walls), variable (sprites) |
| **Floor/Ceiling** | Solid color (NOT textured in original -- this is a key distinction from DOOM) |
| **Frame Rate Target** | 70 tics/second (actual FPS varies by hardware) |

### 5.2 Color Palette

The Wolfenstein 3D palette is a fixed 256-color VGA palette with these characteristics:

- **Originally designed for EGA** (16 colors) and converted to VGA four months before release. This means many textures still show EGA-influenced color choices.
- **Limited black/grey range**: The palette is notably lacking in dark grey tones, leading to creative use of blue tones for "dark" areas.
- **Heavy brown/grey dominance**: Castle environments use predominantly earth tones.
- **Bright accent colors**: Red (blood, Nazi imagery), blue (SS uniforms, cold stone), gold (treasure, keys), green (barrels, mutants).
- **No true black**: The darkest color is a very dark blue-grey.

#### Key Color Groups

| Color Range | Use |
|-------------|-----|
| Browns (warm) | Castle walls, wood, furniture, guard uniforms |
| Greys (cool) | Stone walls, metal, armor, concrete |
| Blues (dark) | Cold dungeon walls, SS uniforms, night areas |
| Reds (warm) | Blood, Nazi flags, brick, damage flash |
| Greens (muted) | Barrels, mutants, plants, outdoors |
| Golds/Yellows | Treasure, keys, officer uniforms, lights |
| Whites | Officer uniforms, lab coats (Dr. Schabbs), pillars |
| Flesh tones | Character sprites, BJ's face |

### 5.3 The Iconic Wolfenstein Aesthetic

The visual identity is defined by:
- **Nazi imagery**: Eagle emblems, swastika banners, red/black/white color scheme on walls and flags.
- **Medieval castle meets WWII bunker**: Stone dungeon corridors alongside steel doors and military equipment.
- **Oppressive atmosphere**: Repetitive grey/brown corridors, pools of blood, hanging skeletons, cages.
- **Contrast through color**: Blue dungeon sections feel cold and damp; brown wood sections feel warmer and more "civilized."
- **Flat floors and ceilings**: The solid-color floor/ceiling (typically grey floor, grey ceiling) creates a distinctive "floating corridor" look unique to Wolf3D.

### 5.4 HUD Layout

The status bar occupies the bottom portion of the screen and displays:

```
+-------+-------+--------+--------+-------+-------+--------+-------+
| FLOOR | SCORE |  LIVES | [FACE] | HEALTH|  AMMO |  KEYS  |  ARMS |
|  01   | 00000 |   3    |  :-D   |  100% |  008  | [G][S] |  2    |
+-------+-------+--------+--------+-------+-------+--------+-------+
```

| Element | Position | Description |
|---------|----------|-------------|
| Floor Number | Far left | Current floor (1-10) |
| Score | Left-center | Running point total |
| Lives | Left of face | Remaining extra lives (number + small BJ head) |
| BJ's Face | Center | Health indicator face graphic |
| Health | Right of face | Numerical health percentage (0-100%) |
| Ammo | Right-center | Current bullet count |
| Keys | Right | Gold/Silver key indicators (filled when held) |
| Current Weapon | Far right | Current weapon number (1-4) |

The status bar background is a dark blue/grey metal texture. All text is rendered in white or light grey. The layout is compact but extremely readable.

### 5.5 BJ Blazkowicz Face States

The face is the emotional core of the HUD. It serves as both a health indicator and player avatar.

#### Health-Based Face States

The face graphic is calculated using: `FACE1APIC + 3 * ((100 - health) / 16) + faceframe`

This creates approximately **7 health tiers**, each 16 health points apart:

| Health Range | Face State |
|-------------|------------|
| 85-100 | Healthy -- bright eyes, alert expression, slight smile |
| 69-84 | Minor damage -- small scratches, still alert |
| 53-68 | Moderate damage -- visible bruises, concerned expression |
| 37-52 | Significant damage -- bloody nose, worried expression |
| 21-36 | Heavy damage -- heavily bloodied, swelling, pained expression |
| 5-20 | Near death -- severely beaten, blood covering face, desperate expression |
| 1-4 | Critical -- barely conscious appearance |

Within each tier, `faceframe` (0-2) provides **3 directional variants**: looking forward, looking left, looking right. The face direction indicates where BJ last took damage from (the face looks toward the damage source).

#### Special Face States

| State | Trigger | Description |
|-------|---------|-------------|
| **Ouch Face** | Taking 30+ damage in one hit (non-baby difficulty) | BJ winces with mouth open, eyes squinting |
| **Grin Face** | Picking up a new weapon | BJ grins widely with an excited expression |
| **God Mode Face** | `MLI` cheat code active | BJ has golden/glowing eyes, invincible expression |
| **Mutant Death Face** | Killed by Dr. Schabbs' needles | BJ's face transforms into a mutant (unique `MUTANTBJPIC`) |
| **Dead Face** | Health reaches 0 | BJ's face shows death state (`FACE8APIC`) |
| **Idle Animation** | 30 seconds of no input | BJ either crosses his eyes or sticks his tongue out |

Face animation updates every 70 tics (1 second) with randomized frame selection when no gatling sound is playing.

### 5.6 Screen Effects

| Effect | Trigger | Visual |
|--------|---------|--------|
| **Damage Flash** | Taking damage | Screen briefly tints red |
| **Pickup Flash** | Collecting an item | Screen briefly tints gold/white |
| **Bonus Flash** | Extra life awarded | Screen flash |
| **Death Fade** | BJ dies | Screen fades to red |
| **Level Complete** | Reaching elevator | Transition to statistics screen |

### 5.7 Weapon Viewmodels

The weapon is drawn at the bottom-center of the screen as a first-person sprite:

| Weapon | Visual Description |
|--------|--------------------|
| Knife | BJ's right arm extending forward with a combat knife, thrust animation |
| Pistol | Luger P08-style pistol, recoil animation on fire |
| Machine Gun | MP40-style submachine gun, rapid recoil animation |
| Chain Gun | Four-barrel Gatling/minigun, rotation animation during fire |

Weapon sprites bob slightly during walking to simulate movement. When firing, the weapon sprite shows a muzzle flash and recoil frame.

---

## 6. What Made It Iconic

### 6.1 Historical Significance

Wolfenstein 3D, released May 5, 1992, by id Software (John Carmack, John Romero, Tom Hall, Adrian Carmack), is widely considered the **grandfather of the first-person shooter genre**. While not technically the first FPS (Ultima Underworld preceded it by weeks, and id's own Catacomb 3-D came before), Wolfenstein 3D was the game that defined the genre's core identity: fast-paced, visceral, combat-focused first-person action.

### 6.2 Key Design Decisions That Made It Groundbreaking

1. **Speed over everything**: id Software deliberately removed stealth mechanics that slowed gameplay. The game was designed to be played at full speed, guns blazing. This "always moving forward" philosophy became the DNA of the FPS genre.

2. **Shareware distribution model**: Episode 1 was distributed for free. Players who enjoyed it could purchase the remaining episodes. This model, pioneered by Apogee Software (who published Wolf3D), was revolutionary and directly led to the distribution strategies of DOOM and Quake.

3. **Technical innovation via ray casting**: John Carmack's ray casting engine rendered pseudo-3D environments at playable frame rates on consumer hardware. The technique of casting rays from the player's viewpoint to calculate wall distances was computationally efficient and visually convincing.

4. **Visceral satisfaction**: The combination of immediate feedback (enemies react to being hit, blood splatters, death screams) with the power fantasy of mowing down Nazis created an unprecedented sense of immersion and satisfaction.

5. **Positional audio**: As you moved and rotated, enemy sounds changed in stereo position and volume. Hearing a guard shout "Achtung!" from your left before you saw them was revolutionary.

6. **Secret discovery**: Push walls created a metagame of exploration. The reward loop of discovering hidden rooms with treasure and supplies encouraged players to interact with every wall.

7. **Controversial content as feature**: Nazi imagery, violence, and fighting Hitler himself generated controversy that also generated interest. The game leaned into its premise rather than sanitizing it.

8. **Enemy personality through audio**: Each enemy type was immediately identifiable by their sound. The German voice lines (however grammatically incorrect) gave enemies personality and made encounters more memorable.

### 6.3 The FEELING of Playing Wolfenstein 3D

The experience of playing Wolf3D is characterized by:

- **Constant tension**: You never know what is behind the next door. The game creates anxiety through corridor-based level design where enemies can appear from any direction.
- **Power escalation**: Starting with a knife and ending a level with the chain gun creates a satisfying power curve within each episode.
- **Resource anxiety**: Ammo management is real. The chain gun is powerful but burns through bullets. Deciding when to use which weapon is a constant micro-decision.
- **Exploration reward**: The push wall mechanic rewards curiosity. Players develop a habit of pressing every wall they see, and the dopamine hit of finding a secret room full of treasure is addictive.
- **Audio-driven awareness**: You play as much with your ears as your eyes. Hearing a dog bark, a guard shout, or the mechanical sound of a door opening creates spatial awareness before visual confirmation.
- **Boss dread**: The transition from regular floors to boss floors (Floor 9) creates genuine dread. The boss theme music signals danger, and the boss arena's open design contrasts sharply with the tight corridors of regular floors.
- **Satisfaction of completion**: The end-of-level statistics screen creates a completionist drive. Seeing 100% on all three ratios is deeply satisfying.

### 6.4 Elements That MUST Be Preserved for Authenticity

These elements are non-negotiable for a faithful recreation:

1. **Movement speed and responsiveness**: The game must feel FAST. Sluggish movement kills the Wolf3D experience.
2. **Sound design**: Enemy alert sounds, "Mein Leben!", door opening sounds, weapon sounds, pickup sounds -- these ARE Wolfenstein 3D.
3. **Push walls**: The secret discovery mechanic is central to the game's identity.
4. **BJ's face**: The HUD face that degrades with damage is one of gaming's most iconic UI elements.
5. **End-of-level statistics**: Kill/Secret/Treasure ratios drive replayability.
6. **Nazi aesthetic**: Eagle emblems, grey stone corridors, blue dungeon areas -- the visual identity must be maintained.
7. **Enemy variety through behavior**: Dogs rushing you, silent mutants, officers shouting "Spion!" -- enemy personality through audio and behavior.
8. **The four weapons**: Knife/Pistol/Machine Gun/Chain Gun with shared ammo pool and distance-based damage.
9. **Damage direction on BJ's face**: The face looking toward the damage source is a subtle but important feedback mechanism.
10. **Solid color floors/ceilings**: This is what distinguishes Wolf3D from DOOM. Textured floors/ceilings would make it look like a DOOM clone, not a Wolf3D recreation.
11. **64x64 tile grid**: The chunky grid-based level design with 90-degree angles is fundamental to the game's character.
12. **Door mechanics**: Sliding doors that auto-close, locked doors requiring specific keys, elevator doors for level exit.
13. **Enemy alert propagation**: Gunfire alerts connected rooms, creating chain reactions of alerted enemies.

### 6.5 Elements That Can Be Enhanced Without Losing the Soul

These can be modernized while preserving authenticity:

| Element | Original | Possible Enhancement |
|---------|----------|---------------------|
| Resolution | 320x200 | Higher resolution with pixel-art scaling |
| Frame rate | Variable (target 70 fps) | Locked 60fps with smooth interpolation |
| Texture filtering | None (nearest neighbor) | Optional bilinear, but default to crisp pixels |
| Lighting | Two-shade wall darkening only | Subtle distance fog / darkness falloff |
| Sound | 8-bit mono samples | Higher quality samples maintaining the same character |
| Music | AdLib/SoundBlaster OPL | OPL emulation or enhanced FM synthesis covers |
| Mouse control | Basic mouse look | Smooth mouse look with sensitivity options |
| UI scaling | Fixed 320x200 | Responsive scaling for modern displays |
| Screen shake | None | Subtle weapon recoil camera shake (optional) |
| Death animations | 4-frame death | Slightly more frames, same pixel art style |
| Minimap | None | Optional overlay minimap showing explored areas |
| Saving | Per-level saves | Quick save/load at any point |

**Critical rule**: Enhancements should be **additive options**, not replacements. The game should always be playable in a mode that closely matches the 1992 original.

### 6.6 What to AVOID

These would break the Wolfenstein 3D identity:

- **Textured floors and ceilings** (that is DOOM territory)
- **Height differences or stairs** (Wolf3D is perfectly flat)
- **Diagonal walls or non-90-degree angles** (the grid is 90 degrees only)
- **Jumping or crouching** (no vertical gameplay)
- **Inventory or RPG systems** (pure action, no complexity)
- **Regenerating health** (health pickups are essential resource management)
- **Cover systems or leaning** (no modern shooter mechanics)
- **Reloading** (weapons fire instantly, no reload animations)
- **Ironsights or zoom** (no aiming down sights)
- **Sprinting** (BJ always runs at full speed)
- **Weapon modifications or upgrades** (the 4 weapons are the 4 weapons)

---

## Appendix A: Sound Effect Reference

### Enemy Sounds

| Sound ID | Enemy | Event | Description |
|----------|-------|-------|-------------|
| HALTSND | Guard | Alert | "Halt!" shout |
| ABORDSND | Guard | Alert (alt) | "Achtung!" |
| DEATHSCREAM1SND | Guard | Death | Generic scream |
| SPABORDSND | Officer | Alert | "Spion!" |
| MABORDSND | Officer/SS | Death | "Mein Leben!" |
| SSABORDSND | SS | Alert | "Schutzstaffel!" |
| NAZIFIRESND | Guard/Officer | Fire | Pistol shot |
| SSFIRESND | SS | Fire | Machine gun burst |
| DOGBARKSND | Dog | Alert | Bark |
| DOGDEATHSND | Dog | Death | Yelp |
| MECHSTEPSND | Mecha Hitler | Movement | Mechanical footsteps |
| BOSSFIRESND | Bosses | Fire | Boss weapon fire |

### Boss Voice Lines Summary

| Boss | Alert Line | Translation | Death Line | Translation |
|------|-----------|-------------|------------|-------------|
| Hans Grosse | "Guten Tag!" | "Good day!" | "Mutti!" | "Mommy!" |
| Dr. Schabbs | (Evil laugh) | -- | "Mein Gott in Himmel!" | "My God in Heaven!" |
| Fake Hitler | (Mechanical) | -- | (Destruction SFX) | -- |
| Mecha Hitler | "Die, Allied Schweinhund!" | "Die, Allied pig-dog!" | "Scheisse!" | "Shit!" |
| Hitler (on foot) | -- | -- | "Eva, auf Wiedersehen!" | "Eva, goodbye!" |
| Otto Giftmacher | "Eine kleine Amerikaner!" | "A little American!" | "Donnerwetter!" | "Thunderweather!" (exclamation) |
| Gretel Grosse | "Kein Durchgang!" | "No trespassing!" | "Mein Busse!" | "My repentance!" |
| Gen. Fettgesicht | "Erlauben Sie, bitte!" | "Allow me, please!" | "Rosenknospe!" | "Rosebud!" |

**Note on audio quality**: The original voice recordings were low-quality 8-bit samples, likely recorded by an American voice actor. The German pronunciation and grammar are intentionally (or unintentionally) poor, which has become part of the game's charm. Exact transcriptions vary across sources due to the audio quality.

---

## Appendix B: Source Code Reference

All technical values in this document are derived from or verified against the original Wolfenstein 3D source code released by id Software:

- **Repository**: https://github.com/id-Software/wolf3d
- **Key files**:
  - `WL_ACT2.C` -- Enemy hitpoints (`starthitpoints` array), enemy attack behavior, boss AI, damage calculations
  - `WL_ACT1.C` -- Static objects, door mechanics, push walls
  - `WL_AGENT.C` -- Player weapon damage (`KnifeAttack`, `GunAttack`), pickup handling, face state logic
  - `WL_STATE.C` -- Enemy state machine, patrol/chase/dodge logic, movement functions
  - `WL_DEF.H` -- All game constants, enums, speed values, entity types
  - `WL_MAIN.C` -- Game initialization, difficulty handling
  - `WL_DRAW.C` -- Rendering engine, weapon viewmodel drawing

---

## Appendix C: Enemy Damage Output (Technical)

### Hitscan Enemies (Guards, Officers, SS, Mutants)

Enemy hit chance formula:
```
hitchance = 160 - (dist * 16)   // when player is visible and moving
hitchance = 160 - (dist * 8)    // when player is partially obscured
```

If `US_RndT() < hitchance`, the attack hits. Damage on hit varies by distance.

### Projectile Enemies

| Projectile Type | Used By | Damage Formula |
|----------------|---------|----------------|
| Needle (syringe) | Dr. Schabbs | `(US_RndT() / 8) + 20` = 20-51 damage |
| Rocket | Otto Giftmacher, Gen. Fettgesicht | `(US_RndT() / 8) + 30` = 30-61 damage |
| Fireball | Fake Hitler | `US_RndT() / 8` = 0-31 damage |

### Dog Bite

| Attack | Damage |
|--------|--------|
| Dog bite | Random value (low, but at melee range, attacks are rapid) |

### Difficulty Damage Modifiers (Applied to Player)

| Difficulty | Damage Multiplier |
|------------|-------------------|
| Can I play, Daddy? | x0.25 (damage / 4) |
| Don't hurt me | x0.50 (damage / 2) |
| Bring 'em on! | x1.00 (full damage) |
| I am Death incarnate! | x1.00 (full damage) |

---

*Document compiled from original id Software source code, Wolfenstein Wiki, DieHard Wolfers community, and extensive game analysis. This serves as the authoritative reference for the browser-based Wolfenstein 3D recreation project.*
