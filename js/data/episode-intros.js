/**
 * episode-intros.js — Cinematic Data for Episode Introductions
 *
 * Pre-written cinematic beat sequences for all 7 Wolfenstein 3D episodes.
 * Each entry is an array of beats consumed by the Cinematics system.
 */

export const EPISODE_INTROS = {
    1: [
        { type: 'fade', color: '#000', duration: 0.5 },
        { type: 'text', text: '1943', style: 'title', duration: 2 },
        { type: 'text', text: 'Castle Wolfenstein, deep in the Bavarian Alps.\nA medieval fortress, repurposed by the SS\nas a high-security prison.', style: 'narration', duration: 5 },
        { type: 'text', text: 'No one has ever escaped.', style: 'narration', duration: 3 },
        { type: 'pause', duration: 1 },
        { type: 'text', text: 'EPISODE 1', style: 'episode', duration: 2 },
        { type: 'text', text: 'Escape from Castle Wolfenstein', style: 'subtitle', duration: 3 },
        { type: 'fade', color: 'transparent', duration: 1 },
    ],
    2: [
        { type: 'fade', color: '#000', duration: 0.5 },
        { type: 'text', text: 'The OSA has intercepted disturbing reports.\nA Dr. Schabbs is conducting horrific experiments\nbeneath a secret laboratory.', style: 'narration', duration: 5 },
        { type: 'text', text: 'The dead are being made to walk again.', style: 'narration', duration: 3 },
        { type: 'pause', duration: 1 },
        { type: 'text', text: 'EPISODE 2', style: 'episode', duration: 2 },
        { type: 'text', text: 'Operation Eisenfaust', style: 'subtitle', duration: 3 },
        { type: 'fade', color: 'transparent', duration: 1 },
    ],
    3: [
        { type: 'fade', color: '#000', duration: 0.5 },
        { type: 'text', text: 'The ultimate mission.\nInfiltrate the bunker beneath the Reichstag.\nConfront the tyrant himself.', style: 'narration', duration: 5 },
        { type: 'text', text: 'This is the mission that ends the war.', style: 'narration', duration: 3 },
        { type: 'pause', duration: 1 },
        { type: 'text', text: 'EPISODE 3', style: 'episode', duration: 2 },
        { type: 'text', text: 'Die, F\u00FChrer, Die!', style: 'subtitle', duration: 3 },
        { type: 'fade', color: 'transparent', duration: 1 },
    ],
    4: [
        { type: 'fade', color: '#000', duration: 0.5 },
        { type: 'text', text: 'THREE WEEKS EARLIER', style: 'title', duration: 2 },
        { type: 'text', text: 'Before Castle Wolfenstein.\nBefore the prison cell.\nThis is how it began.', style: 'narration', duration: 5 },
        { type: 'text', text: 'SS-Oberf\u00FChrer Otto Giftmacher runs\na chemical weapons program beneath the castle.\nThe Allies need it destroyed.', style: 'narration', duration: 5 },
        { type: 'pause', duration: 1 },
        { type: 'text', text: 'EPISODE 4', style: 'episode', duration: 2 },
        { type: 'text', text: 'A Dark Secret', style: 'subtitle', duration: 3 },
        { type: 'fade', color: 'transparent', duration: 1 },
    ],
    5: [
        { type: 'fade', color: '#000', duration: 0.5 },
        { type: 'text', text: 'Hans Grosse is dead.\nBut his sister Gretel has sworn vengeance.\nShe is hunting you.', style: 'narration', duration: 5 },
        { type: 'text', text: 'Three OSA agents are already dead.\nShe knows you are coming.\nCastle Erlangen is a trap.', style: 'narration', duration: 5 },
        { type: 'text', text: '"Let\'s not disappoint her."', style: 'narration', duration: 3 },
        { type: 'pause', duration: 1 },
        { type: 'text', text: 'EPISODE 5', style: 'episode', duration: 2 },
        { type: 'text', text: 'Trail of the Madman', style: 'subtitle', duration: 3 },
        { type: 'fade', color: 'transparent', duration: 1 },
    ],
    6: [
        { type: 'fade', color: '#000', duration: 0.5 },
        { type: 'text', text: 'Fortress Hollehammer.\nThe mountain that swallowed an army.', style: 'narration', duration: 4 },
        { type: 'text', text: 'General Fettgesicht — the man behind the curtain.\nHe funded Schabbs. He armed Hans.\nHe mentored Gretel.', style: 'narration', duration: 5 },
        { type: 'text', text: 'Every nightmare traces back to this man.\nOne name left on the list.', style: 'narration', duration: 4 },
        { type: 'text', text: 'This ends now.', style: 'narration', duration: 2 },
        { type: 'pause', duration: 1 },
        { type: 'text', text: 'EPISODE 6', style: 'episode', duration: 2 },
        { type: 'text', text: 'Confrontation', style: 'subtitle', duration: 3 },
        { type: 'fade', color: 'transparent', duration: 1 },
    ],
    7: [
        { type: 'fade', color: '#000', duration: 0.5 },
        { type: 'text', text: 'You\'ve killed them all.\nEvery boss. Every soldier. Every abomination.', style: 'narration', duration: 4 },
        { type: 'text', text: 'But in the ruins of Hollehammer,\nthe Allies found one more secret.\nProject \u00DCbersoldat.', style: 'narration', duration: 5 },
        { type: 'text', text: 'The perfect soldier.\nEvery weapon. Every tactic.\nEvery nightmare — combined into one.', style: 'narration', duration: 5 },
        { type: 'pause', duration: 1 },
        { type: 'text', text: 'BONUS EPISODE', style: 'episode', duration: 2 },
        { type: 'text', text: 'The Nightmare', style: 'subtitle', duration: 3 },
        { type: 'fade', color: 'transparent', duration: 1 },
    ],
};
