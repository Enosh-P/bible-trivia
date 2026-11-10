/** Background aurora, film grain, and the SVG filter used for liquid refraction. */
export function Atmosphere() {
  return (
    <>
      <div className="atmosphere" aria-hidden>
        <div className="aurora" />
        {/* Light mode: solid, flat-coloured shapes for the clear glass to blur and bend. */}
        <div className="drops">
          <span className="drop d-pale" />
          <span className="drop d-red" />
          <span className="drop d-steel" />
          <span className="drop d-ink" />
        </div>
      </div>
      <div className="grain" aria-hidden />
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <filter id="liquid-refract" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
          <feDisplacementMap in="SourceGraphic" in2="soft" scale="38" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
    </>
  );
}
