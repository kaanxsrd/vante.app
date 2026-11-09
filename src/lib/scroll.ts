const HEADING_OFFSET_PX = 80;

export function scrollToHeading(id: string): void {
  const element = document.getElementById(id);
  if (!element) return;
  window.scrollTo({
    top: element.getBoundingClientRect().top + window.scrollY - HEADING_OFFSET_PX,
    behavior: 'smooth',
  });
}

export async function linkToHeading(id: string): Promise<void> {
  window.history.pushState({}, '', `#${id}`);
  scrollToHeading(id);
  try {
    await navigator.clipboard.writeText(
      `${window.location.origin}${window.location.pathname}#${id}`,
    );
  } catch {}
}
