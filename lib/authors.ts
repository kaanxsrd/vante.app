export interface Author {
  name: string;
  position: string;
  avatar: string;
}

export const authors: Record<string, Author> = {
  vante: {
    name: "Kaan 'Vante' Karahanlı",
    position: 'Junior Full-Stack Developer',
    avatar: '/authors/vante.png',
  },
} as const;

export type AuthorKey = keyof typeof authors;

export function getAuthor(key: AuthorKey): Author {
  return authors[key];
}

export function isValidAuthor(key: string): key is AuthorKey {
  return key in authors;
}
