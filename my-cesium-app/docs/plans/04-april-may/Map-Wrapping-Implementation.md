# Implementing Seamless Map Wrapping in React Three Fiber

This document outlines different approaches to achieve a seamless wrapping effect for a world map in React Three Fiber. The goal is to create an infinite scrolling effect where objects that move off one edge of the map appear on the opposite edge, without duplicating meshes or textures.

## Problem Statement

When viewing a 2D representation of Earth on a flat map, longitude wraps around at the 180° meridian (the international date line). In a traditional implementation:

1. When panning past the right edge (180° E), the view shows empty space
2. When panning past the left edge (180° W), the view also shows empty space
3. Objects (like satellites) disappear when they cross these boundaries

To create a realistic, continuous world map experience, we need to make the map wrap seamlessly, as if it's placed on a cylinder.

## Technical Approaches

### 1. Shader-Based Approach (Advanced)

**Concept:** Modify the fragment shader to sample the texture with wrapped coordinates.

**How it works:**
- Create a custom shader material for the map plane
- In the fragment shader, use modulo arithmetic to wrap texture coordinates
- The texture sampling wraps automatically, creating the illusion of continuity

**Pros:**
- Most performant option
- Single mesh and texture instance
- Works with any object placed on the map

**Cons:**
- Requires GLSL shader knowledge
- More complex to implement
- May need custom handling for non-texture objects

### 2. Three.js RepeatWrapping + Camera Teleportation

**Concept:** Configure the map texture to repeat and teleport the camera when it reaches boundaries.

**How it works:**
- Set the map texture's `wrapS` property to `THREE.RepeatWrapping`
- Monitor camera position and teleport it when crossing boundaries
- Adjust object positions to match the camera teleportation

**Pros:**
- Relatively straightforward implementation
- Works well for purely visual exploration
- No need to duplicate map geometry

**Cons:**
- May cause visual jumps during teleportation
- Requires careful tracking of object positions
- Interaction can become complex at boundaries

### 3. Virtual Space Transformation

**Concept:** Use a transformation that maps infinite scrolling onto a finite view space.

**How it works:**
- Create a mapping function that converts "world space" to "render space"
- All position calculations go through this mapping
- Rendering is done in the transformed space

**Pros:**
- Mathematically elegant
- Can handle any number of objects
- No visual discontinuities

**Cons:**
- Complex to implement correctly
- May have edge cases with interactions
- Could affect performance with many objects

### 4. Multiple Instances with Position Syncing

**Concept:** Create three instances of each object (main, left clone, right clone) and sync their positions.

**How it works:**
- Create the main map in the center
- Create clones positioned exactly one map width to the left and right
- Sync positions for any interactive elements across all three instances
- Optionally hide instances that are completely out of view

**Pros:**
- Conceptually simpler to implement
- Works well with existing Three.js knowledge
- Reliable interaction behavior

**Cons:**
- Triples the number of rendered objects
- Higher memory and processing requirements
- May have performance impact

## Recommended Approach: Modulo Position Calculation

The most practical approach combines aspects of methods 2 and 3, using modulo arithmetic for positions without complex shaders:

### Implementation Overview

1. **Define a Virtual Coordinate System:**
   - Map longitude (-180° to 180°) to a continuous coordinate space
   - When objects exceed boundaries, wrap their positions using modulo

2. **Position Calculation Function:**
   - Create a position transformation function that applies wrapping
   - Apply this function to all objects that should wrap around

3. **Map Texture Configuration:**
   - Set the map texture to use `THREE.RepeatWrapping`
   - This allows the texture to repeat seamlessly

4. **Camera Constraint & Position Mapping:**
   - When camera moves beyond map boundaries, apply the same wrapping function
   - Adjust the wrapped view so objects appear in their correct wrapped positions

## Example Pseudocode

```typescript
// Define map width in world units
const MAP_WIDTH = 10;

// Position wrapping function
function wrapPosition(position: Vector3): Vector3 {
  const wrapped = position.clone();
  
  // Apply wrapping to X coordinate (longitude)
  wrapped.x = ((position.x + MAP_WIDTH/2) % MAP_WIDTH) - MAP_WIDTH/2;
  
  return wrapped;
}

// In render loop:
// 1. Update all object positions normally
// 2. Apply wrapping function to all positions
// 3. If object is near edge, create temporary clone on opposite edge
```

## Visual Wrapping Logic for Objects

For visual objects like the satellite, we need to consider three cases:
1. **Object is fully visible** - Render normally
2. **Object is partially off the left edge** - Render normally and create clone on right edge
3. **Object is partially off the right edge** - Render normally and create clone on left edge

The cloning only happens when needed, and is handled programmatically rather than duplicating the actual meshes.

## Next Steps for Implementation

1. Create the position wrapping function
2. Modify the camera controls to work with wrapped positions
3. Create a component that handles object wrapping
4. Adjust the existing map rendering to use wrapping

This approach provides a good balance between implementation complexity and performance while achieving the seamless wrapping effect. 