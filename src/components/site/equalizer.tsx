import type { CSSProperties } from 'react';

const BARS = [
  { min: 0.2, max: 0.9, delay: 0 },
  { min: 0.25, max: 1, delay: 0.12 },
  { min: 0.2, max: 0.95, delay: 0.24 },
  { min: 0.3, max: 0.85, delay: 0.36 },
];

export function Equalizer() {
  return (
    <span aria-hidden="true" className="equalizer">
      {BARS.map((bar) => (
        <span
          key={bar.delay}
          className="equalizer-bar"
          style={
            {
              animationDelay: `${bar.delay}s`,
              '--eq-min': `${bar.min}`,
              '--eq-max': `${bar.max}`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
