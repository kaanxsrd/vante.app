'use client';

import { type MouseEvent, memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatPinPosition, type PinPosition, pinFrom } from '@/features/copy/pin';
import { type MapCountry, parseWorldMap, type WorldMap } from '@/features/copy/world-map';

const SAMPLE_STEPS = 32;

const CountryShape = memo(function CountryShape({
  country,
  selected,
}: {
  country: MapCountry;
  selected: boolean;
}) {
  return (
    <g
      data-name={country.name}
      data-selected={selected}
      className="cursor-pointer fill-muted-foreground/30 transition-colors hover:fill-muted-foreground/70 data-[selected=true]:fill-foreground"
    >
      {country.paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
  );
});

function countryGroups(svg: SVGSVGElement) {
  return [...svg.querySelectorAll<SVGGElement>('g[data-name]')];
}

function findCountryAt(svg: SVGSVGElement, map: WorldMap, { x, y }: PinPosition): string | null {
  const extra = map.extras.find((item) => item.x === x && item.y === y);
  if (extra) return extra.name;

  const point = new DOMPoint(map.left + (x / 100) * map.width, map.top + (y / 100) * map.height);
  const shapes = countryGroups(svg).flatMap((group) =>
    [...group.querySelectorAll('path')].map((path) => ({ path, name: group.dataset.name })),
  );
  const hit =
    shapes.find(({ path }) => path.isPointInFill(point)) ??
    shapes.find(({ path }) => path.isPointInStroke(point));
  return hit?.name ?? null;
}

function mostInteriorPoint(path: SVGPathElement): DOMPoint {
  const box = path.getBBox();
  const middle = new DOMPoint(box.x + box.width / 2, box.y + box.height / 2);
  const cell = Math.max(box.width, box.height) / SAMPLE_STEPS;
  const inside: DOMPoint[] = [];
  const outside: DOMPoint[] = [];

  for (let x = box.x + cell / 2; x < box.x + box.width; x += cell) {
    for (let y = box.y + cell / 2; y < box.y + box.height; y += cell) {
      const point = new DOMPoint(x, y);
      (path.isPointInFill(point) ? inside : outside).push(point);
    }
  }

  if (inside.length === 0) return path.getPointAtLength(path.getTotalLength() / 2);

  let best = middle;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const point of inside) {
    let clearance = Math.min(
      point.x - box.x,
      box.x + box.width - point.x,
      point.y - box.y,
      box.y + box.height - point.y,
    );
    for (const other of outside) {
      clearance = Math.min(clearance, Math.hypot(point.x - other.x, point.y - other.y));
    }
    const score = clearance - Math.hypot(point.x - middle.x, point.y - middle.y) / 1000;
    if (score > bestScore) {
      best = point;
      bestScore = score;
    }
  }
  return best;
}

function centerOfCountry(svg: SVGSVGElement, map: WorldMap, name: string): PinPosition | null {
  const group = countryGroups(svg).find((item) => item.dataset.name === name);
  if (!group) return null;

  const area = (path: SVGPathElement) => {
    const box = path.getBBox();
    return box.width * box.height;
  };
  const [largest] = [...group.querySelectorAll('path')].sort((a, b) => area(b) - area(a));
  if (!largest) return null;

  const target = mostInteriorPoint(largest);
  return {
    x: ((target.x - map.left) / map.width) * 100,
    y: ((target.y - map.top) / map.height) * 100,
  };
}

export function MapPinPicker({
  id,
  mapUrl,
  value,
  onChange,
}: {
  id: string;
  mapUrl: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const [map, setMap] = useState<WorldMap | null | undefined>(undefined);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const position = pinFrom(value);

  useEffect(() => {
    if (!mapUrl) return;
    let cancelled = false;
    setMap(undefined);
    fetch(mapUrl)
      .then((response) => (response.ok ? response.text() : ''))
      .then((text) => {
        if (!cancelled) setMap(text ? parseWorldMap(text) : null);
      })
      .catch(() => {
        if (!cancelled) setMap(null);
      });
    return () => {
      cancelled = true;
    };
  }, [mapUrl]);

  useEffect(() => {
    if (map && svgRef.current) setSelected(findCountryAt(svgRef.current, map, pinFrom(value)));
  }, [map, value]);

  const names = useMemo(
    () =>
      map
        ? [
            ...map.countries.map((country) => country.name),
            ...map.extras.map((item) => item.name),
          ].sort((a, b) => a.localeCompare(b))
        : [],
    [map],
  );

  function placeAtClick(event: MouseEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    onChange(
      formatPinPosition({
        x: ((event.clientX - box.left) / box.width) * 100,
        y: ((event.clientY - box.top) / box.height) * 100,
      }),
    );
  }

  function placeOnCountry(name: string) {
    if (!map || !svgRef.current) return;
    const place =
      map.extras.find((item) => item.name === name) ?? centerOfCountry(svgRef.current, map, name);
    if (place) onChange(formatPinPosition(place));
  }

  if (!mapUrl) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Add a map image above to place the dot.
      </p>
    );
  }

  const status = hovered
    ? `Click to place the dot on ${hovered}`
    : selected
      ? `The dot is on ${selected}`
      : 'The dot is outside any country';

  return (
    <div className="space-y-3">
      {map && (
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selected ?? ''} onValueChange={placeOnCountry}>
            <SelectTrigger id={id} className="w-full sm:w-72">
              <SelectValue placeholder="Choose a country" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {names.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p role="status" className="text-xs text-muted-foreground">
            {status}
          </p>
        </div>
      )}

      <div
        data-testid="pin-map"
        className="relative cursor-crosshair overflow-hidden rounded-lg border bg-muted/30"
        style={map ? { aspectRatio: `${map.width} / ${map.height}` } : undefined}
        onClick={placeAtClick}
      >
        {map ? (
          <svg
            ref={svgRef}
            viewBox={map.viewBox}
            aria-hidden="true"
            className="block size-full stroke-background"
            strokeWidth={0.5}
            onPointerOver={(event) =>
              setHovered(
                (event.target as Element).closest('g[data-name]')?.getAttribute('data-name') ??
                  null,
              )
            }
            onPointerLeave={() => setHovered(null)}
          >
            {map.countries.map((country) => (
              <CountryShape
                key={country.name}
                country={country}
                selected={country.name === selected}
              />
            ))}
          </svg>
        ) : (
          <img src={mapUrl} alt="" className="block w-full dark:invert" />
        )}

        {map !== undefined && (
          <span
            data-testid="pin-dot"
            aria-hidden="true"
            className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-cyan-500 shadow-[0_0_0_4px_rgb(6_182_212/0.3)]"
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
          />
        )}
      </div>
    </div>
  );
}
