/**
 * Fixed film-grain overlay — gives the ivory paper and espresso ink a
 * printed, tactile warmth. Purely decorative: aria-hidden, no pointer
 * events, and automatically still for reduced-motion users (the CSS
 * keyframe is disabled globally in that case).
 */
export function Grain() {
  return <div aria-hidden="true" className="grain-overlay" />;
}
