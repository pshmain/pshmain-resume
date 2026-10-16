import { resume, rolesForGroup, showcaseRoles } from '@/data/resume';

/** Sections of the page that a piece of hardware stands for. */
export type SectionId = 'overview' | 'career' | 'education';

/**
 * A part of the engine model: a cylinder (index into resume.skills), a configuration (index into
 * showcaseRoles), or a piece of hardware that stands for a section of the page.
 */
export type Part =
  | { kind: 'layer'; index: number }
  | { kind: 'project'; index: number }
  | { kind: 'section'; id: SectionId };

export const samePart = (a: Part | null, b: Part | null): boolean => {
  if (a === b) return true;
  if (!a || !b || a.kind !== b.kind) return false;
  return a.kind === 'section' ? a.id === (b as typeof a).id : a.index === (b as Exclude<Part, { kind: 'section' }>).index;
};

/** For each project, whether it used each layer (any skill in the group lists the project). */
export const usage: boolean[][] = showcaseRoles.map((role) =>
  resume.skills.map((group) => rolesForGroup(group.label).includes(role.id)),
);

export const layerParts: Part[] = resume.skills.map((_, index) => ({ kind: 'layer', index }));
export const projectParts: Part[] = showcaseRoles.map((_, index) => ({ kind: 'project', index }));
/** The hardware with a meaning, top of the engine to bottom. */
export const sectionParts: Part[] = (['overview', 'education', 'career'] as const).map((id) => ({ kind: 'section', id }));

/** A piece of hardware's name, and the section of the page it stands for. */
export function sectionName(id: SectionId): { part: string; section: string } {
  const { ui, sections } = resume;
  const part = { overview: ui.partHead, education: ui.partBlock, career: ui.partCrank }[id];
  return { part, section: sections[id].title };
}
