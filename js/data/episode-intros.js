/**
 * episode-intros.js — Cinematic Data for Episode Introductions
 *
 * Pre-written cinematic beat sequences for all 6 Wolfenstein 3D episodes.
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
        { type: 'text', text: 'Before Castle Wolfenstein.\nBefore the prison cell.\nThis is how it began.', style: 'narration', duration: 5 },
        { type: 'pause', duration: 1 },
        { type: 'text', text: 'EPISODE 4', style: 'episode', duration: 2 },
        { type: 'text', text: 'A Dark Secret', style: 'subtitle', duration: 3 },
        { type: 'fade', color: 'transparent', duration: 1 },
    ],
    5: [
        { type: 'fade', color: '#000', duration: 0.5 },
        { type: 'text', text: 'Hans Grosse is dead.\nBut his sister Gretel has sworn vengeance.\nShe is hunting you.', style: 'narration', duration: 5 },
        { type: 'pause', duration: 1 },
        { type: 'text', text: 'EPISODE 5', style: 'episode', duration: 2 },
        { type: 'text', text: 'Trail of the Madman', style: 'subtitle', duration: 3 },
        { type: 'fade', color: 'transparent', duration: 1 },
    ],
    6: [
        { type: 'fade', color: '#000', duration: 0.5 },
        { type: 'text', text: 'One final stronghold remains.\nGeneral Fettgesicht commands the last\nof the Nazi war machine.', style: 'narration', duration: 5 },
        { type: 'text', text: 'This ends now.', style: 'narration', duration: 2 },
        { type: 'pause', duration: 1 },
        { type: 'text', text: 'EPISODE 6', style: 'episode', duration: 2 },
        { type: 'text', text: 'Confrontation', style: 'subtitle', duration: 3 },
        { type: 'fade', color: 'transparent', duration: 1 },
    ],
};
