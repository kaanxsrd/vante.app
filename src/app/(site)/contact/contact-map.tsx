import Image from 'next/image';
import type { CSSProperties } from 'react';
import type { PinPosition } from '@/features/copy/pin';

function labelShift(x: number): string {
  if (x < 14) return '42%';
  if (x > 86) return '-42%';
  return '0%';
}

export function ContactMap({
  src,
  pin,
  label,
  className,
}: {
  src: string;
  pin: PinPosition | null;
  label: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="map-stage">
        <div className="map-plane">
          <Image
            alt=""
            unoptimized
            loading="eager"
            width={2000}
            height={857}
            src={src}
            className="h-auto w-full select-none dark:[filter:invert(1)_brightness(2.2)]"
          />
          {pin && (
            <span
              className="map-pin"
              style={
                {
                  left: `${pin.x}%`,
                  top: `${pin.y}%`,
                  '--label-shift': labelShift(pin.x),
                } as CSSProperties
              }
            >
              <span className="map-pin-ring" />
              <span className="map-pin-ring map-pin-ring-late" />
              <span className="map-pin-dot" />
              <span className="map-pin-stand">
                <span className="map-pin-beam" />
                {label && <span className="map-pin-label">{label}</span>}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
