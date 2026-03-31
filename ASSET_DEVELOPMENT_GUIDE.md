# Asset Development Guide

This document outlines the standards and best practices for creating assets for Infernal Assault.

## File Formats

### 3D Models
- Format: glTF 2.0
- Polycount: 
  - Characters: < 15k triangles
  - Props: < 5k triangles
  - Environment: < 50k triangles per section

### Textures
- Format: PNG
- Resolution: 
  - Characters: 2048x2048
  - Props: 1024x1024
  - Environment: 4096x4096

## Naming Conventions

### General
- Use snake_case for all file names
- Prefix asset type (char_, prop_, env_)

### Examples
- char_main_player.glb
- prop_barrel_01.glb
- env_forest_ground_01.glb

## Optimization Guidelines

### Geometry
- Use efficient topology
- Avoid ngons and triangles where possible
- Keep UV islands organized

### Textures
- Use texture atlases where possible
- Compress textures without visible quality loss
- Use mipmaps for all textures

## Animation Standards
- Frame rate: 30 FPS
- Root motion: Enabled for characters
- Blend shapes: Limited to facial expressions

## Quality Assurance
- Test assets in the Asset Tester
- Verify performance metrics
- Check for visual artifacts
