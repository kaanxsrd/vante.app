'use client';

import { ArrowDown, ArrowUp, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Field, ImageField, TagInput } from '@/components/admin/content-fields';
import { IconPicker } from '@/components/admin/icon-picker';
import { PageHeader } from '@/components/admin/page-header';
import { useAction } from '@/components/admin/use-action';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { suggestIconAction } from '@/features/icons/actions';
import { DEFAULT_ICONS, type IconData, type IconMap } from '@/features/icons/types';
import { saveProfileAction } from '@/features/profile/actions';
import { isSafeLinkUrl, type SiteProfile } from '@/features/profile/schema';

type Skill = SiteProfile['skills'][number];
type Social = SiteProfile['socials'][number];
type NavItem = SiteProfile['navigation'][number];
type Keyed<T> = T & { key: number };

function moved<T>(items: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  const a = items[index];
  const b = items[target];
  if (a === undefined || b === undefined) return items;
  const next = [...items];
  next[index] = b;
  next[target] = a;
  return next;
}

function RowControls({
  name,
  index,
  count,
  onMove,
  onRemove,
}: {
  name: string;
  index: number;
  count: number;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}) {
  const label = name || 'this row';
  return (
    <div className="flex shrink-0 gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label={`Move ${label} up`}
        disabled={index === 0}
        onClick={() => onMove(-1)}
      >
        <ArrowUp className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label={`Move ${label} down`}
        disabled={index === count - 1}
        onClick={() => onMove(1)}
      >
        <ArrowDown className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label={`Remove ${label}`}
        onClick={onRemove}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

export function ProfileEditor({
  initial,
  icons: initialIcons,
}: {
  initial: SiteProfile;
  icons: IconMap;
}) {
  const nextKey = useRef(0);
  const withKey = <T,>(item: T): Keyed<T> => {
    nextKey.current += 1;
    return { ...item, key: nextKey.current };
  };

  const [name, setName] = useState(initial.name);
  const [title, setTitle] = useState(initial.title);
  const [intro, setIntro] = useState(initial.intro);
  const [about, setAbout] = useState(initial.about);
  const [skills, setSkills] = useState<Keyed<Skill>[]>(() => initial.skills.map(withKey));
  const [socials, setSocials] = useState<Keyed<Social>[]>(() => initial.socials.map(withKey));
  const [siteName, setSiteName] = useState(initial.siteName);
  const [initials, setInitials] = useState(initial.initials);
  const [description, setDescription] = useState(initial.description);
  const [keywords, setKeywords] = useState(initial.keywords);
  const [avatar, setAvatar] = useState(initial.avatar);
  const [logo, setLogo] = useState(initial.logo);
  const [favicon, setFavicon] = useState(initial.favicon);
  const [navigation, setNavigation] = useState<Keyed<NavItem>[]>(() =>
    initial.navigation.map(withKey),
  );
  const [icons, setIcons] = useState(initialIcons);
  const [dirty, setDirty] = useState(false);

  const save = useAction(saveProfileAction, {
    success: 'Profile saved. The public site is updated.',
    onSuccess: () => setDirty(false),
  });

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const touch = <A extends unknown[]>(fn: (...args: A) => void) => {
    return (...args: A) => {
      setDirty(true);
      fn(...args);
    };
  };

  const updateSkill = touch((key: number, patch: Partial<Skill>) =>
    setSkills((items) => items.map((item) => (item.key === key ? { ...item, ...patch } : item))),
  );
  const updateSocial = touch((key: number, patch: Partial<Social>) =>
    setSocials((items) => items.map((item) => (item.key === key ? { ...item, ...patch } : item))),
  );

  const updateNavItem = touch((key: number, patch: Partial<NavItem>) =>
    setNavigation((items) =>
      items.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    ),
  );

  const remember = (id: string, data: IconData) =>
    setIcons((current) => ({ ...current, [id]: data }));

  function suggest(name: string, current: string, generic: string, apply: (id: string) => void) {
    if (current !== generic || !name.trim()) return;
    void suggestIconAction({ name }).then((result) => {
      if (!result.ok || !result.data) return;
      remember(result.data.id, result.data.data);
      apply(result.data.id);
    });
  }

  function submit() {
    save.run({
      name,
      title,
      intro,
      about,
      siteName,
      initials,
      description,
      keywords,
      avatar,
      logo,
      favicon,
      navigation: navigation.map(({ label, href, icon }) => ({ label, href, icon })),
      skills: skills.map(({ name: skillName, icon }) => ({ name: skillName, icon })),
      socials: socials.map(({ name: socialName, url, icon }) => ({
        name: socialName,
        url,
        icon,
      })),
    });
  }

  return (
    <>
      <PageHeader
        title="Site Profile"
        description="What visitors see on your home page and in the navigation."
        actions={
          <>
            <Button asChild variant="outline">
              <a href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink />
                View website
              </a>
            </Button>
            <Button disabled={save.pending || !dirty} onClick={submit}>
              {dirty ? 'Save changes' : 'Saved'}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
            <CardDescription>Also used in page titles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field id="profile-name" label="Name">
              <Input
                id="profile-name"
                value={name}
                maxLength={80}
                onChange={(event) => touch(setName)(event.target.value)}
              />
            </Field>
            <Field id="profile-title" label="Title">
              <Input
                id="profile-title"
                value={title}
                maxLength={80}
                onChange={(event) => touch(setTitle)(event.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today</CardTitle>
            <CardDescription>Leave both empty to hide this section.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field id="profile-intro" label="First paragraph">
              <Textarea
                id="profile-intro"
                rows={3}
                value={intro}
                maxLength={1000}
                onChange={(event) => touch(setIntro)(event.target.value)}
              />
            </Field>
            <Field id="profile-about" label="Second paragraph">
              <Textarea
                id="profile-about"
                rows={2}
                value={about}
                maxLength={1000}
                onChange={(event) => touch(setAbout)(event.target.value)}
              />
            </Field>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            Your images, how search engines describe the site, and the name used in emails and in
            authenticator apps.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field id="profile-site-name" label="Site name">
            <Input
              id="profile-site-name"
              value={siteName}
              maxLength={80}
              onChange={(event) => touch(setSiteName)(event.target.value)}
            />
          </Field>
          <Field id="profile-initials" label="Initials" hint="Shown when the photo cannot load.">
            <Input
              id="profile-initials"
              value={initials}
              maxLength={4}
              onChange={(event) => touch(setInitials)(event.target.value)}
            />
          </Field>
          <div className="md:col-span-2 xl:col-span-3">
            <Field id="profile-description" label="Site description">
              <Textarea
                id="profile-description"
                rows={2}
                value={description}
                maxLength={300}
                onChange={(event) => touch(setDescription)(event.target.value)}
              />
            </Field>
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <Field id="profile-keywords" label="Search keywords">
              <TagInput id="profile-keywords" value={keywords} onChange={touch(setKeywords)} />
            </Field>
          </div>
          <Field id="profile-avatar" label="Photo">
            <ImageField id="profile-avatar" value={avatar} onChange={touch(setAvatar)} />
          </Field>
          <Field id="profile-logo" label="Logo">
            <ImageField id="profile-logo" value={logo} onChange={touch(setLogo)} />
          </Field>
          <Field id="profile-favicon" label="Browser tab icon">
            <ImageField id="profile-favicon" value={favicon} onChange={touch(setFavicon)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Menu</CardTitle>
          <CardDescription>
            The page links in the navigation dock. Use a path such as /blog, or a full link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2">
            {navigation.map((item, index) => (
              <li key={item.key} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <IconPicker
                  label={`Icon for ${item.label || 'this menu item'}`}
                  value={item.icon}
                  data={icons[item.icon]}
                  purpose="menu"
                  onChange={(icon, data) => {
                    remember(icon, data);
                    updateNavItem(item.key, { icon });
                  }}
                />
                <Input
                  aria-label="Menu label"
                  placeholder="Label"
                  className="sm:w-44"
                  value={item.label}
                  maxLength={40}
                  onChange={(event) => updateNavItem(item.key, { label: event.target.value })}
                />
                <Input
                  aria-label={`Link for ${item.label || 'this menu item'}`}
                  placeholder="/page"
                  value={item.href}
                  aria-invalid={Boolean(item.href) && !isSafeLinkUrl(item.href.trim())}
                  onChange={(event) => updateNavItem(item.key, { href: event.target.value })}
                />
                <RowControls
                  name={item.label}
                  index={index}
                  count={navigation.length}
                  onMove={touch((delta) => setNavigation((items) => moved(items, index, delta)))}
                  onRemove={touch(() =>
                    setNavigation((items) => items.filter((entry) => entry.key !== item.key)),
                  )}
                />
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={touch(() =>
              setNavigation((items) => [
                ...items,
                withKey<NavItem>({ label: '', href: '', icon: DEFAULT_ICONS.menu }),
              ]),
            )}
          >
            <Plus />
            Add menu item
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tech stack</CardTitle>
          <CardDescription>Shown in this order. Leave empty to hide the section.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="grid gap-x-6 gap-y-2 lg:grid-cols-2">
            {skills.map((skill, index) => (
              <li key={skill.key} className="flex items-center gap-2">
                <IconPicker
                  label={`Icon for ${skill.name || 'this technology'}`}
                  value={skill.icon}
                  data={icons[skill.icon]}
                  purpose="tech"
                  onChange={(icon, data) => {
                    remember(icon, data);
                    updateSkill(skill.key, { icon });
                  }}
                />
                <Input
                  aria-label="Technology name"
                  placeholder="Technology"
                  value={skill.name}
                  maxLength={40}
                  onChange={(event) => updateSkill(skill.key, { name: event.target.value })}
                  onBlur={() =>
                    suggest(skill.name, skill.icon, DEFAULT_ICONS.tech, (icon) =>
                      updateSkill(skill.key, { icon }),
                    )
                  }
                />
                <RowControls
                  name={skill.name}
                  index={index}
                  count={skills.length}
                  onMove={touch((delta) => setSkills((items) => moved(items, index, delta)))}
                  onRemove={touch(() =>
                    setSkills((items) => items.filter((item) => item.key !== skill.key)),
                  )}
                />
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={touch(() =>
              setSkills((items) => [
                ...items,
                withKey<Skill>({ name: '', icon: DEFAULT_ICONS.tech }),
              ]),
            )}
          >
            <Plus />
            Add technology
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social links</CardTitle>
          <CardDescription>
            The icons in the navigation dock. Use https://, mailto: or a path such as /contact.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2">
            {socials.map((social, index) => (
              <li key={social.key} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <IconPicker
                  label={`Icon for ${social.name || 'this link'}`}
                  value={social.icon}
                  data={icons[social.icon]}
                  purpose="social"
                  onChange={(icon, data) => {
                    remember(icon, data);
                    updateSocial(social.key, { icon });
                  }}
                />
                <Input
                  aria-label="Link name"
                  placeholder="Name"
                  className="sm:w-44"
                  value={social.name}
                  maxLength={40}
                  onChange={(event) => updateSocial(social.key, { name: event.target.value })}
                  onBlur={() =>
                    suggest(social.name, social.icon, DEFAULT_ICONS.social, (icon) =>
                      updateSocial(social.key, { icon }),
                    )
                  }
                />
                <Input
                  aria-label={`URL for ${social.name || 'this link'}`}
                  placeholder="https://"
                  value={social.url}
                  aria-invalid={Boolean(social.url) && !isSafeLinkUrl(social.url.trim())}
                  onChange={(event) => updateSocial(social.key, { url: event.target.value })}
                />
                <RowControls
                  name={social.name}
                  index={index}
                  count={socials.length}
                  onMove={touch((delta) => setSocials((items) => moved(items, index, delta)))}
                  onRemove={touch(() =>
                    setSocials((items) => items.filter((item) => item.key !== social.key)),
                  )}
                />
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={touch(() =>
              setSocials((items) => [
                ...items,
                withKey<Social>({ name: '', url: '', icon: DEFAULT_ICONS.social }),
              ]),
            )}
          >
            <Plus />
            Add link
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
