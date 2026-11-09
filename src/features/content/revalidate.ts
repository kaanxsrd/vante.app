import 'server-only';
import { revalidatePath } from 'next/cache';

export function revalidatePublicContent(): void {
  revalidatePath('/', 'layout');
}
