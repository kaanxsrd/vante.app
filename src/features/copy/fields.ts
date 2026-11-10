export type CopyFieldKind = 'text' | 'long' | 'markdown' | 'image' | 'position';

export interface CopyField {
  key: string;
  label: string;
  kind?: CopyFieldKind;
  hint?: string;
  fallback?: string;
}

export const COPY_GROUPS = [
  {
    id: 'home',
    label: 'Home',
    fields: [
      { key: 'home.todayHeading', label: 'Today heading' },
      { key: 'home.techHeading', label: 'Tech stack heading' },
      { key: 'home.blogsHeading', label: 'Blog section heading' },
      { key: 'home.blogsLink', label: 'Blog section link' },
      { key: 'home.blogsEmpty', label: 'Shown when there are no posts' },
      { key: 'home.projectsHeading', label: 'Projects section heading' },
      { key: 'home.projectsLink', label: 'Projects section link' },
      { key: 'home.projectsEmpty', label: 'Shown when there are no projects' },
      { key: 'home.privacyLink', label: 'Privacy link in the footer' },
    ],
  },
  {
    id: 'blog',
    label: 'Blog',
    fields: [
      { key: 'blog.heading', label: 'Page heading' },
      { key: 'blog.empty', label: 'Shown when there are no posts' },
      { key: 'blog.readMore', label: 'Related posts heading' },
      { key: 'blog.tocHeading', label: 'Table of contents heading' },
      { key: 'blog.metaTitle', label: 'Browser tab title' },
      { key: 'blog.metaDescription', label: 'Search engine description', kind: 'long' },
      { key: 'blog.ogTitle', label: 'Social preview title' },
      { key: 'blog.ogSubtitle', label: 'Social preview subtitle' },
    ],
  },
  {
    id: 'projects',
    label: 'Projects',
    fields: [
      { key: 'projects.heading', label: 'Page heading' },
      { key: 'projects.empty', label: 'Shown when there are no projects' },
      { key: 'projects.technologiesHeading', label: 'Technologies heading on a project' },
      { key: 'projects.metaTitle', label: 'Browser tab title' },
      { key: 'projects.metaDescription', label: 'Search engine description', kind: 'long' },
    ],
  },
  {
    id: 'contact',
    label: 'Contact',
    fields: [
      { key: 'contact.heading', label: 'Heading' },
      { key: 'contact.description', label: 'Description', kind: 'long' },
      { key: 'contact.mapImage', label: 'Map image', kind: 'image' },
      {
        key: 'contact.pinPosition',
        label: 'Map dot location',
        kind: 'position',
        hint: 'Choose a country from the list, or click the exact spot on the map.',
      },
      { key: 'contact.pinLabel', label: 'Map pin label' },
      { key: 'contact.nameLabel', label: 'Name field label' },
      { key: 'contact.namePlaceholder', label: 'Name field example' },
      { key: 'contact.emailLabel', label: 'Email field label' },
      { key: 'contact.emailPlaceholder', label: 'Email field example' },
      { key: 'contact.messageLabel', label: 'Message field label' },
      { key: 'contact.messagePlaceholder', label: 'Message field example' },
      { key: 'contact.continueLabel', label: 'Continue button' },
      { key: 'contact.sendingCodeLabel', label: 'Continue button while sending' },
      { key: 'contact.verifyNote', label: 'Note under the form', kind: 'long' },
      { key: 'contact.verifyHeading', label: 'Code step heading' },
      {
        key: 'contact.verifyBody',
        label: 'Code step text',
        kind: 'long',
        hint: '{email} is replaced with the visitor’s address.',
      },
      { key: 'contact.codeLabel', label: 'Code field label' },
      { key: 'contact.verifySubmit', label: 'Verify button' },
      { key: 'contact.verifySending', label: 'Verify button while sending' },
      { key: 'contact.resendLabel', label: 'Resend link' },
      {
        key: 'contact.resendCountdown',
        label: 'Resend link while waiting',
        hint: '{seconds} is replaced with the time left.',
      },
      { key: 'contact.changeLabel', label: 'Change details link' },
      { key: 'contact.sentHeading', label: 'Success heading' },
      {
        key: 'contact.sentBody',
        label: 'Success text',
        kind: 'long',
        hint: '{name} and {email} are replaced with the visitor’s details.',
      },
      { key: 'contact.sendAnotherLabel', label: 'Send another button' },
      { key: 'contact.metaTitle', label: 'Browser tab title' },
      { key: 'contact.metaDescription', label: 'Search engine description', kind: 'long' },
    ],
  },
  {
    id: 'music',
    label: 'Music',
    fields: [
      {
        key: 'music.username',
        label: 'Last.fm username',
        hint: 'The account whose listening is shown on the music page.',
      },
      { key: 'music.heading', label: 'Page heading', fallback: 'Music' },
      {
        key: 'music.description',
        label: 'Page description',
        kind: 'long',
        fallback: 'What I have been listening to, straight from Last.fm.',
      },
      { key: 'music.profileLink', label: 'Profile link', fallback: 'View on Last.fm' },
      { key: 'music.nowPlaying', label: 'Now playing label', fallback: 'Now playing' },
      { key: 'music.lastPlayed', label: 'Last played label', fallback: 'Last played' },
      { key: 'music.statPlays', label: 'Total plays stat', fallback: 'Scrobbles' },
      { key: 'music.statArtists', label: 'Artists stat', fallback: 'Artists' },
      { key: 'music.statAlbums', label: 'Albums stat', fallback: 'Albums' },
      { key: 'music.statTracks', label: 'Tracks stat', fallback: 'Tracks' },
      { key: 'music.statHours', label: 'Listening time stat', fallback: 'Estimated hours' },
      { key: 'music.statDaily', label: 'Daily average stat', fallback: 'Plays a day' },
      { key: 'music.activityHeading', label: 'Chart heading', fallback: 'Last 14 days' },
      {
        key: 'music.activitySummary',
        label: 'Chart summary',
        hint: '{total} and {average} are replaced with the numbers.',
        fallback: '{total} plays, about {average} a day',
      },
      { key: 'music.chartsHeading', label: 'Top lists heading', fallback: 'Most played' },
      { key: 'music.period7day', label: 'Last 7 days tab', fallback: 'Week' },
      { key: 'music.period1month', label: 'Last month tab', fallback: 'Month' },
      { key: 'music.period12month', label: 'Last year tab', fallback: 'Year' },
      { key: 'music.periodOverall', label: 'All time tab', fallback: 'All time' },
      { key: 'music.topAlbums', label: 'Top albums heading', fallback: 'Top albums' },
      { key: 'music.topArtists', label: 'Top artists heading', fallback: 'Top artists' },
      { key: 'music.topTracks', label: 'Top tracks heading', fallback: 'Top tracks' },
      { key: 'music.recent', label: 'Recent tracks heading', fallback: 'Recently played' },
      { key: 'music.plays', label: 'Word for plays', fallback: 'plays' },
      {
        key: 'music.empty',
        label: 'Shown when a period has no plays',
        fallback: 'Nothing played in this period.',
      },
      {
        key: 'music.unavailable',
        label: 'Shown when stats cannot load',
        kind: 'long',
        fallback: 'Music stats are not available right now. Please check back soon.',
      },
      { key: 'music.metaTitle', label: 'Browser tab title', fallback: 'Music' },
      {
        key: 'music.metaDescription',
        label: 'Search engine description',
        kind: 'long',
        fallback: 'What I have been listening to.',
      },
    ],
  },
  {
    id: 'privacy',
    label: 'Privacy',
    fields: [
      { key: 'privacy.heading', label: 'Page heading' },
      { key: 'privacy.content', label: 'Page content', kind: 'markdown' },
      { key: 'privacy.optOut', label: 'Opt out button' },
      { key: 'privacy.allow', label: 'Allow button' },
      { key: 'privacy.statusOut', label: 'Status when opted out' },
      { key: 'privacy.statusIn', label: 'Status when analytics are on' },
      { key: 'privacy.metaTitle', label: 'Browser tab title' },
      { key: 'privacy.metaDescription', label: 'Search engine description', kind: 'long' },
    ],
  },
  {
    id: 'notFound',
    label: 'Not found',
    fields: [
      { key: 'notFound.heading', label: 'Heading' },
      { key: 'notFound.body', label: 'Text', kind: 'long' },
      { key: 'notFound.button', label: 'Button' },
    ],
  },
  {
    id: 'navigation',
    label: 'Navigation',
    fields: [{ key: 'nav.themeLabel', label: 'Theme button tooltip' }],
  },
] as const satisfies readonly { id: string; label: string; fields: readonly CopyField[] }[];

export type CopyGroupId = (typeof COPY_GROUPS)[number]['id'];
export type CopyKey = (typeof COPY_GROUPS)[number]['fields'][number]['key'];
export type SiteCopy = Record<CopyKey, string>;
