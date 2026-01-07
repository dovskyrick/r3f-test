The trap in your code (important)

This part:

viewer.scene.postRender.addEventListener(() => {
  const cameraHeight = camera.positionCartographic.height;
  if (cameraHeight > hardMaxZoomDistance) {
    ...
    camera.setView(...)
  }
});

Why this is dangerous

ref callbacks can run multiple times

Viewer can be remounted (viewerKey changes)

Each time this runs, you add another postRender listener

Cesium will now:

run the same logic multiple times per frame

silently degrade performance

be very hard to debug later

This is the classic imperative side-effect leak.

6) Correct way to fix the trap

Move it into a useEffect with cleanup:

useEffect(() => {
  const viewer = viewerRef.current?.cesiumElement;
  if (!viewer) return;

  const handler = () => {
    const cameraHeight = viewer.scene.camera.positionCartographic.height;
    if (cameraHeight > hardMaxZoomDistance) {
      ...
    }
  };

  viewer.scene.postRender.addEventListener(handler);

  return () => {
    viewer.scene.postRender.removeEventListener(handler);
  };
}, [viewerKey]);


Now:

exactly one listener per Viewer

removed when Viewer remounts

predictable, safe, React-aligned

This is exactly why useEffect exists.