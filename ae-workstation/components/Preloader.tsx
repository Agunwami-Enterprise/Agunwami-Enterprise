/**
 * Preloader — global loading state.
 *
 * Figma specs (sized down ~20% per review feedback):
 *   Outer circle : 72 × 72 px   fill #f5bd02
 *   Inner dot    : 36 × 36 px   fill #1a1a1a
 *   Orbit radius : 36/2 − 18 = 18 px
 *   Gap          : 22 px
 *   Text         : "Loading AE Hub…"  Inter Semibold 20px/26px  #656565
 *   Background   : #faf8ec (app cream)
 */
export default function Preloader() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center"
      style={{ backgroundColor: '#faf8ec', gap: '22px' }}
    >
      {/* Eclipse icon */}
      <div
        className="relative overflow-hidden rounded-full"
        style={{ width: 72, height: 72, backgroundColor: '#f5bd02' }}
      >
        {/* Orbit wrapper — rotates around its own center (= outer circle center) */}
        <div
          className="absolute inset-0"
          style={{ animation: 'ae-orbit 1.8s linear infinite' }}
        >
          {/*
           * Inner dot offset from wrapper center by orbit radius (18 px upward).
           *   wrapper center  = (36, 36)
           *   dot center      = (36, 36 − 18) = (36, 18)
           *   dot top-left    = (18, 0)
           * Max dot edge from center: 18 + 18 = 36 px = outer circle radius ✓
           */}
          <div
            className="absolute rounded-full"
            style={{ width: 36, height: 36, backgroundColor: '#1a1a1a', top: 0, left: 18 }}
          />
        </div>
      </div>

      {/* Label */}
      <p
        style={{
          fontFamily: 'var(--font-inter), Inter, sans-serif',
          fontWeight: 600,
          fontSize: '20px',
          lineHeight: '26px',
          color: '#656565',
          margin: 0,
        }}
      >
        Loading AE Hub...
      </p>
    </div>
  );
}
