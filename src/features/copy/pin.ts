import { z } from 'zod';

export interface PinPosition {
  x: number;
  y: number;
}

export const DEFAULT_PIN: PinPosition = { x: 51.54, y: 16.76 };

const POSITION = /^(\d{1,3}(?:\.\d{1,2})?),(\d{1,3}(?:\.\d{1,2})?)$/;

export function parsePinPosition(value: string): PinPosition | null {
  const match = POSITION.exec(value);
  if (!match) return null;
  const x = Number(match[1]);
  const y = Number(match[2]);
  return x <= 100 && y <= 100 ? { x, y } : null;
}

const percent = (value: number) => Math.min(100, Math.max(0, value)).toFixed(2);

export function formatPinPosition({ x, y }: PinPosition): string {
  return `${percent(x)},${percent(y)}`;
}

export function pinFrom(value: string): PinPosition {
  return parsePinPosition(value) ?? DEFAULT_PIN;
}

export const pinPositionSchema = z
  .string()
  .trim()
  .refine((value) => value === '' || parsePinPosition(value) !== null, 'Choose a place on the map');
