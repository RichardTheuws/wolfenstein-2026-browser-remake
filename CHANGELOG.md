# Changelog

All notable changes to the Infernal Assault project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-06-18 — Visual Quality Pass (Wave 1)

Surgical rendering upgrade on the existing Three.js engine (no rebuild — see ADR
2026-06-18 "Wolfenstein: chirurgisch verbeteren i.p.v. Unreal-rebuild").

### Changed

- ACES filmic tone mapping + exposure, applied via an OutputPass in the composer
- Lighting overhauled: ambient + hemisphere + directional key light replaces the
  flat ambient-only setup, giving walls form and specular response
- World materials switched from MeshLambert to MeshStandard (PBR) for walls, floor,
  ceiling and doors; metallic door types (gold/silver/elevator) now catch the light
- Anisotropic texture filtering on all level textures (sharper grazing-angle floors/walls)
- UnrealBloom post-processing pass (lamps, flames, muzzle flash and highlights glow)
- SMAA edge anti-aliasing (high quality tier only)
- Quality tier selection: heavier passes auto-disabled on touch / small-screen devices

### Notes

- GTAO/SSAO ambient occlusion deferred to a later wave pending real-device validation
  (crashes software-GL test renderers; least visible benefit of the pass set)

## [Unreleased]

### Added

- Multi-room level design with 3 distinct rooms and connecting corridors
- Enemy placement in different rooms providing varied combat scenarios
- Secret areas with rewards
- Level exit to complete the game
- Asset Tester component for visualizing and testing game assets
- Basic 3D scene test environment for asset visualization
- SRP (Single Responsibility Principle) compliant architecture for Asset Tester
- Working sound playback in Asset Tester
- Interactive testing functionality for assets
- 3D scene controls and interaction
- Enhanced visualization for placeholders vs real assets
- 3D model support and preview functionality
- Asset selection and detail viewing interface

### Fixed

- Asset loading issues in 3D scene test
- Audio playback functionality
- Fixed inverted mouse controls for better usability
- Improved asset error handling in the asset tester
- Enhanced texture and sprite loading with better fallbacks

### Changed

- Refactored initial Asset Tester implementation to follow SRP
- Improved 3D scene controls for better user experience

### Security

- No security updates in this version

## [0.1.0] - 2025-03-09

**Author:** Richard Theuws  
**Description:** Initial project setup with basic game architecture and core systems

### Added

- Initial project setup
- Basic game architecture following SOLID principles
- Core rendering system with Three.js
- Basic input handling system
- Placeholder asset generation system
- Asset loading framework with progress tracking
- Initial UI framework
- Game loop implementation
- Camera and scene management
- Development roadmap
- Basic documentation

### Fixed

- No fixes in initial release

### Changed

- No changes in initial release

### Deprecated

- No deprecations in initial release

### Removed

- No removals in initial release

### Security

- No security updates in initial release
