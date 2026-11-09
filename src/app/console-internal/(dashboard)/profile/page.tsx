import type { Metadata } from 'next';
import { requireAdminPage } from '@/features/auth/session';
import { resolveIcons } from '@/features/icons/catalog';
import { DEFAULT_ICONS } from '@/features/icons/types';
import { getSetting } from '@/features/settings/service';
import { ProfileEditor } from './_components/profile-editor';

export const metadata: Metadata = { title: 'Site Profile' };

export default async function ProfilePage() {
  await requireAdminPage();
  const profile = await getSetting('profile');
  const icons = await resolveIcons([
    ...[...profile.skills, ...profile.socials, ...profile.navigation].map((item) => item.icon),
    ...Object.values(DEFAULT_ICONS),
  ]);
  return <ProfileEditor initial={profile} icons={icons} />;
}
