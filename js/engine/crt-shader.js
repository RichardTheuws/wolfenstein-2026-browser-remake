/**
 * crt-shader.js — CRT Monitor Post-Processing Shader
 *
 * A Three.js ShaderPass-compatible shader that applies retro CRT monitor effects:
 * - Scanlines (subtle horizontal lines)
 * - Barrel distortion (curved screen effect)
 * - Chromatic aberration (subtle RGB offset)
 * - Film grain (very subtle animated noise)
 * - Vignette (edge darkening)
 *
 * Designed to enhance the retro Wolfenstein feel without being distracting.
 */

export const CRTShader = {

    name: 'CRTShader',

    uniforms: {
        tDiffuse:           { value: null },
        time:               { value: 0.0 },
        scanlineIntensity:  { value: 0.03 },
        scanlineCount:      { value: 400.0 },
        distortion:         { value: 0.01 },
        chromaticAberration:{ value: 0.001 },
        grainIntensity:     { value: 0.015 },
        vignetteStrength:   { value: 0.15 },
        resolution:         { value: null },
    },

    vertexShader: /* glsl */`
        varying vec2 vUv;

        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,

    fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform float time;
        uniform float scanlineIntensity;
        uniform float scanlineCount;
        uniform float distortion;
        uniform float chromaticAberration;
        uniform float grainIntensity;
        uniform float vignetteStrength;
        uniform vec2 resolution;

        varying vec2 vUv;

        // Barrel distortion — bends UV coords outward from center
        vec2 barrelDistort(vec2 uv) {
            vec2 centered = uv - 0.5;
            float r2 = dot(centered, centered);
            float f = 1.0 + r2 * distortion;
            return centered * f + 0.5;
        }

        // Pseudo-random hash for film grain
        float rand(vec2 co) {
            return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
            // Apply barrel distortion
            vec2 uv = barrelDistort(vUv);

            // Discard pixels outside the screen after distortion
            if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                return;
            }

            // Chromatic aberration — offset R and B channels slightly
            float aberration = chromaticAberration;
            vec2 dir = normalize(uv - 0.5);
            float r = texture2D(tDiffuse, uv + dir * aberration).r;
            float g = texture2D(tDiffuse, uv).g;
            float b = texture2D(tDiffuse, uv - dir * aberration).b;
            vec3 color = vec3(r, g, b);

            // Scanlines — horizontal lines that pulse subtly
            float scanline = sin(uv.y * scanlineCount * 3.14159) * 0.5 + 0.5;
            scanline = pow(scanline, 1.5);
            color *= 1.0 - scanlineIntensity * (1.0 - scanline);

            // Film grain — subtle animated noise
            float grain = rand(uv * resolution + vec2(time * 173.3, time * 291.7));
            grain = (grain - 0.5) * grainIntensity;
            color += grain;

            // Vignette — darken edges
            vec2 vigUv = vUv - 0.5;
            float vignette = 1.0 - dot(vigUv, vigUv) * vignetteStrength * 2.0;
            vignette = clamp(vignette, 0.0, 1.0);
            color *= vignette;

            // Brightness compensation to offset darkening from scanlines/vignette
            color *= 1.15;

            gl_FragColor = vec4(color, 1.0);
        }
    `,
};
