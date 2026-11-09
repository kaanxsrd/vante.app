'use client';

import Link from 'next/link';
import { type ComponentProps, createContext, useContext } from 'react';

const AdminPathContext = createContext('');

export function AdminPathProvider({
  basePath,
  children,
}: {
  basePath: string;
  children: React.ReactNode;
}) {
  return <AdminPathContext.Provider value={basePath}>{children}</AdminPathContext.Provider>;
}

export function useAdminPath(path = ''): string {
  return `${useContext(AdminPathContext)}${path}`;
}

export function AdminLink({
  href,
  ...props
}: Omit<ComponentProps<typeof Link>, 'href'> & { href: string }) {
  return <Link href={useAdminPath(href)} {...props} />;
}
