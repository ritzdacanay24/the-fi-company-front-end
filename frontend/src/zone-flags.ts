/**
 * Zone.js configuration flags — must be imported BEFORE zone.js loads.
 * Disables zone.js patching of requestAnimationFrame so Quill's internal
 * rAF-based rendering loop does not trigger Angular change detection.
 */
(window as any).__Zone_disable_requestAnimationFrame = true;
