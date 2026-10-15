// All page copy, typed. Components read from this object and never hardcode text.
// Source: design/handoff.md, updated to match public/Peter_Shmain_Resume.docx (the downloadable
// résumé, revised 2026-09-02 after the handoff). See design/DEVIATIONS.md, "Copy". Layout and
// the dashboard-only copy (stats, diagrams, slide labels, UI strings): design/dashboard.md.

export interface Contact {
  email: string;
  phone: { display: string; href: string };
  linkedin: { display: string; short: string; href: string };
}

export type RoleId = 'provenance' | 'codriverhq' | 'sneakerhead' | 'shmizzys';

/** A headline number on the At a glance row. */
export interface Stat {
  /** A "→" is drawn as an SVG arrow (neither face carries U+2192). */
  value: string;
  label: string;
  /** The role the number comes from; omitted for a number that spans roles. */
  roleId?: RoleId;
  /** Index into that role's bullets, marked when the tile is clicked. */
  bullet?: number;
}

export interface DiagramNode {
  label: string;
  note?: string;
}

export interface DiagramLane {
  label: string;
  /** muted: a "before" state. accent: the system that was built. plain: supporting parts. */
  tone: 'muted' | 'accent' | 'plain';
  /** flow: arrows between nodes. loop: flow plus a return arrow. set: no arrows. */
  layout: 'flow' | 'loop' | 'set';
  nodes: DiagramNode[];
}

/** The "how it works" flow for a role, shown as a gallery slide. */
export interface Diagram {
  lanes: DiagramLane[];
  outcome?: string;
}

/** A gallery slide of one captured page. Files come from src/assets/shots (see shots.ts). */
export interface ShotSlide {
  kind: 'shot';
  /** Matches `page` in src/assets/shots/manifest.json. */
  page: string;
  label: string;
  alt: { desktop: string; phone: string };
}

export interface DiagramSlide {
  kind: 'diagram';
  label: string;
}

export type Slide = ShotSlide | DiagramSlide;

export interface Role {
  id: RoleId;
  title: string;
  /** Short role name for the tab card kicker and the timeline label. */
  kicker: string;
  company: string;
  formerName?: string;
  href?: string;
  domain?: string;
  location: string;
  /** "Mon YYYY". */
  start: string;
  /** "Mon YYYY" or ui.present. */
  end: string;
  bullets: string[];
  /** What the Work explorer shows. Roles without it appear only on the career timeline. */
  showcase?: Showcase;
}

export interface Showcase {
  /** Short outcome chips at the top of the panel. */
  impact: string[];
  /** Two-letter mark drawn on the tab card if its screenshot is missing. */
  monogram: string;
  slides: Slide[];
  diagram: Diagram;
}

export interface Skill {
  name: string;
  /** Roles this skill was used in. Drives the highlight and each panel's stack chips. */
  roles: RoleId[];
}

export interface SkillGroup {
  label: string;
  skills: Skill[];
}

export interface Education {
  school: string;
  credential: string;
  date: string;
}

export interface SectionMeta {
  id: string;
  numeral: string;
  title: string;
}

export interface Resume {
  name: string;
  headline: string;
  location: string;
  contact: Contact;
  sections: {
    overview: SectionMeta;
    work: SectionMeta;
    career: SectionMeta;
    skills: SectionMeta;
    education: SectionMeta;
  };
  profile: string;
  stats: Stat[];
  /** Newest first; the first with a showcase is selected on load. */
  roles: Role[];
  skills: SkillGroup[];
  education: Education;
  download: { label: string; short: string; href: string; filename: string };
  /** Footer line explaining the ruins. */
  colophon: string;
  ui: {
    /** Screen-reader suffix appended to every link that opens a new tab. */
    newTab: string;
    /** Between headline and city in the hero. */
    headlineSeparator: string;
    /** Between role and company in headings. */
    roleSeparator: string;
    /** Between start and end dates. */
    dateSeparator: string;
    /** Spoken in place of the arrow in a stat like "3 → 1". */
    arrowTo: string;
    present: string;
    formerly: string;
    visit: string;
    email: string;
    copyEmail: string;
    copied: string;
    phone: string;
    quickLinks: string;
    workTabs: string;
    impact: string;
    stack: string;
    gallery: string;
    previous: string;
    next: string;
    openFull: string;
    close: string;
    /** "{n} of {total}" in the lightbox. */
    slideCount: string;
    desktopView: string;
    phoneView: string;
    timeline: string;
    /** Duration units in the timeline tooltip. */
    year: string;
    years: string;
    month: string;
    months: string;
    usedAt: string;
    skillHint: string;
  };
}

export const resume: Resume = {
  name: 'Peter Shmain',
  headline: 'Full-Stack Engineer',
  location: 'Los Angeles, CA',
  contact: {
    email: 'petershmain@gmail.com',
    phone: { display: '(323) 422-4866', href: 'tel:+13234224866' },
    linkedin: {
      display: 'linkedin.com/in/peter-shmain',
      short: 'LinkedIn',
      href: 'https://www.linkedin.com/in/peter-shmain',
    },
  },
  sections: {
    // At a glance shows no heading row (the banner introduces it), so numbering starts at Work.
    overview: { id: 'overview', numeral: '', title: 'At a glance' },
    work: { id: 'work', numeral: 'I', title: 'Work' },
    career: { id: 'career', numeral: 'II', title: 'Career' },
    skills: { id: 'skills', numeral: 'III', title: 'Skills' },
    education: { id: 'education', numeral: 'IV', title: 'Education' },
  },
  profile:
    'As a full stack developer on small startup teams, my primary experience has been full ownership from scoping to shipping. I am well versed in AI and have made it my mission to be as efficient and effective with AI tools as possible.',
  stats: [
    { value: '$750K', label: 'Annual revenue line running on the pipeline I rebuilt', roleId: 'provenance', bullet: 0 },
    { value: '~2⁄3', label: 'Less time to process and deliver documents', roleId: 'provenance', bullet: 0 },
    { value: '3 → 1', label: 'Third-party tools merged into one database', roleId: 'provenance', bullet: 2 },
    { value: '3', label: 'Products shipped and live in production' },
  ],
  roles: [
    {
      id: 'provenance',
      title: 'Full-Stack Engineer',
      kicker: 'Full-Stack Engineer',
      company: 'Provenance',
      location: 'Remote',
      start: 'Aug 2025',
      end: 'Present',
      bullets: [
        "Lead developer on the ordination-documents suite. Rebuilt a failing third-party pipeline handling a significant amount of the company's customers and revenue into a first-party system, cutting document processing and delivery time by roughly two-thirds on a $750K annual revenue line.",
        'Scoped and prioritized work directly with the CTO and Head of Product. Continuously cross collaborated across the organization in order to pivot to most needed ongoing product improvements.',
        'Consolidated customer records scattered across three disconnected third-party tools into one first-party database, migrating all historical data and eliminating the duplicate shipments and multi-month backlogs the old system produced.',
        'Created a native intake flow to replace the third-party form, cutting redundant customer service questions and adding the validation, error handling, and data structuring the old form lacked.',
        'Built the admin panel the team now runs the product on, covering order tracking, search, and status management, plus secure customer document uploads.',
        'Rebuilt and optimized a PDF generator to fulfill hardware requirements and improve customer dissatisfaction.',
      ],
      showcase: {
        impact: ['$750K revenue line', 'Delivery time cut ~2⁄3', '3 tools into 1 database'],
        monogram: 'Pv',
        slides: [
          { kind: 'diagram', label: 'What I rebuilt' },
        ],
        diagram: {
          lanes: [
            {
              label: 'Before',
              tone: 'muted',
              layout: 'flow',
              nodes: [
                { label: 'Third-party intake form', note: 'no validation' },
                { label: 'Three disconnected tools' },
                { label: 'Third-party pipeline' },
                { label: 'Duplicate shipments', note: 'multi-month backlogs' },
              ],
            },
            {
              label: 'After',
              tone: 'accent',
              layout: 'flow',
              nodes: [
                { label: 'Native intake flow', note: 'validation, error handling' },
                { label: 'First-party pipeline' },
                { label: 'One database', note: 'all history migrated' },
                { label: 'Admin panel', note: 'tracking, search, status' },
                { label: 'PDF generator', note: 'rebuilt' },
              ],
            },
          ],
          outcome: 'Processing and delivery time cut by roughly two-thirds on a $750K annual revenue line.',
        },
      },
    },
    {
      id: 'codriverhq',
      title: 'Co-Founder & Full-Stack Engineer',
      kicker: 'Co-Founder',
      company: 'CoDriverHQ',
      href: 'https://codriverhq.com/',
      domain: 'codriverhq.com',
      location: 'Los Angeles, CA',
      start: 'Jan 2025',
      end: 'Present',
      bullets: [
        'Co-founded an AI-powered car-buying advisor that educates buyers from research through deal analysis, aggregating data on nearly every vehicle on the market and distilling it into what each buyer actually needs.',
        'Built the product end to end on Next.js, TypeScript, PostgreSQL, Stripe, and the Claude API, covering architecture, data model, authentication, and subscription billing.',
        'Designed the schema and user-profiling system behind the recommendation engine. A guided intake builds a buyer profile, then batched API calls evaluate live listings on price, history, and market trends, returning matches with reasoning.',
        "Wrote a streaming chat assistant that walks buyers through car-buying topics it hasn't covered yet, with guardrails that keep it on-topic and resistant to off-domain misuse.",
      ],
      showcase: {
        impact: ['Built end to end', 'Claude API in production', 'Stripe billing'],
        monogram: 'Co',
        slides: [
          {
            kind: 'shot',
            page: 'home',
            label: 'Home',
            alt: {
              desktop:
                'CoDriverHQ home page: "Buy your next car without the dread", with a sample listing rated a great deal, desktop view.',
              phone: 'CoDriverHQ home page, phone view.',
            },
          },
          {
            kind: 'shot',
            page: 'how-it-works',
            label: 'Buyer journey',
            alt: {
              desktop:
                'CoDriverHQ "How it works" page: a guided path that starts with a short intake on budget, lifestyle and must-haves, desktop view.',
              phone: 'CoDriverHQ "How it works" page, phone view.',
            },
          },
          {
            kind: 'shot',
            page: 'pricing',
            label: 'Pricing',
            alt: {
              desktop: 'CoDriverHQ pricing page: three one-time access passes at $29, $49 and $79, desktop view.',
              phone: 'CoDriverHQ pricing page, phone view.',
            },
          },
          { kind: 'diagram', label: "How it's built" },
        ],
        diagram: {
          lanes: [
            {
              label: 'Recommendation engine',
              tone: 'accent',
              layout: 'flow',
              nodes: [
                { label: 'Guided intake' },
                { label: 'Buyer profile' },
                { label: 'Batched Claude API calls', note: 'over live listings' },
                { label: 'Price, history, market trends' },
                { label: 'Matches with reasoning' },
              ],
            },
            {
              label: 'Around it',
              tone: 'plain',
              layout: 'set',
              nodes: [
                { label: 'Streaming chat assistant', note: 'on-topic guardrails' },
                { label: 'Authentication' },
                { label: 'Stripe billing' },
              ],
            },
          ],
          outcome: 'Architecture, data model, auth and billing, built end to end.',
        },
      },
    },
    {
      id: 'sneakerhead',
      title: 'Full-Stack Engineer',
      kicker: 'Full-Stack Engineer',
      company: 'Sneakerhead',
      href: 'https://sneakerheadmelrose.com/',
      domain: 'sneakerheadmelrose.com',
      location: 'Los Angeles, CA',
      start: 'Oct 2024',
      end: 'Dec 2025',
      bullets: [
        'Designed and built several ecommerce platforms for a brick-and-mortar vintage clothing brand, covering storefront, catalog, search and filtering, cart, and Stripe checkout on a photo-heavy mobile-first catalog.',
        'Set up a real-time inventory sync between the in-store Clover POS and the web catalog, running every 10 minutes so a sale on either channel updates availability on the other.',
        'Maintained an active catalog of thousands of items, handling schema mapping, deduplication, and data integrity across both systems, while owning hosting, deploys, and monitoring.',
      ],
      showcase: {
        impact: ['POS sync every 10 min', 'Thousands of items', 'Stripe checkout'],
        monogram: 'Sh',
        slides: [
          {
            kind: 'shot',
            page: 'home',
            label: 'Storefront',
            alt: {
              desktop: 'Sneakerhead Melrose storefront home page with featured sneakers, desktop view.',
              phone: 'Sneakerhead Melrose storefront home page, phone view.',
            },
          },
          {
            kind: 'shot',
            page: 'catalog',
            label: 'Catalog',
            alt: {
              desktop:
                'Sneakerhead Melrose shoe catalog with collection, condition, brand, size and price filters, desktop view.',
              phone: 'Sneakerhead Melrose shoe catalog, phone view.',
            },
          },
          {
            kind: 'shot',
            page: 'product',
            label: 'Product page',
            alt: {
              desktop:
                'Sneakerhead Melrose product page for a pair of Jordan 1 High Off-White UNC, with photo gallery and size picker, desktop view.',
              phone: 'Sneakerhead Melrose product page, phone view.',
            },
          },
          { kind: 'diagram', label: 'Inventory sync' },
        ],
        diagram: {
          lanes: [
            {
              label: 'Every 10 minutes',
              tone: 'accent',
              layout: 'loop',
              nodes: [
                { label: 'In-store sale', note: 'Clover POS' },
                { label: 'Sync job', note: 'schema mapping, dedupe' },
                { label: 'Web catalog', note: 'thousands of items' },
                { label: 'Online sale', note: 'Stripe checkout' },
              ],
            },
          ],
          outcome: 'A sale on either channel updates availability on the other.',
        },
      },
    },
    {
      id: 'shmizzys',
      title: 'Co-Founder & Operator',
      kicker: 'Co-Founder',
      company: 'Shmizzys Garage',
      location: 'Los Angeles, CA',
      start: 'Aug 2022',
      end: 'Nov 2024',
      bullets: [
        'Co-founded and ran an independent dealership reconditioning and reselling vehicles, applying a mechanical engineering background to scope repairs and performance modifications while running acquisition, pricing, and vendor negotiation.',
        'Automated inventory, cost, and margin tracking to replace manual record-keeping, which became the entry point into software engineering.',
      ],
    },
  ],
  // Which roles used each skill. Résumé-stated or seen on the live site unless marked
  // "confirm", which are guesses awaiting Peter's correction.
  skills: [
    {
      label: 'Frontend',
      skills: [
        { name: 'React', roles: ['provenance', 'codriverhq', 'sneakerhead'] }, // provenance: confirm
        { name: 'Next.js', roles: ['codriverhq', 'sneakerhead'] },
        { name: 'TypeScript', roles: ['codriverhq', 'sneakerhead'] }, // sneakerhead: confirm
        { name: 'JavaScript', roles: ['provenance', 'sneakerhead'] }, // confirm
        { name: 'Tailwind', roles: ['sneakerhead'] },
        { name: 'HTML/CSS', roles: ['provenance', 'codriverhq', 'sneakerhead'] },
      ],
    },
    {
      label: 'Backend',
      skills: [
        { name: 'Node.js', roles: ['provenance', 'codriverhq', 'sneakerhead'] }, // provenance: confirm
        { name: 'Express', roles: ['provenance'] }, // confirm
        { name: 'Sequelize', roles: ['provenance'] }, // confirm
        { name: 'Prisma', roles: ['codriverhq'] }, // confirm
        { name: 'REST APIs', roles: ['provenance', 'codriverhq', 'sneakerhead'] },
      ],
    },
    {
      label: 'Databases',
      skills: [
        { name: 'PostgreSQL', roles: ['provenance', 'codriverhq'] }, // provenance: confirm
        { name: 'MySQL', roles: ['provenance'] }, // confirm
        { name: 'Supabase', roles: ['sneakerhead'] }, // confirm
      ],
    },
    {
      label: 'Cloud & Tools',
      skills: [
        { name: 'AWS S3', roles: ['provenance'] }, // confirm
        { name: 'Vercel', roles: ['codriverhq', 'sneakerhead'] }, // confirm
        { name: 'Docker', roles: ['provenance'] }, // confirm
        { name: 'CircleCI', roles: ['provenance'] }, // confirm
        { name: 'Git', roles: ['provenance', 'codriverhq', 'sneakerhead'] },
        { name: 'Stripe', roles: ['codriverhq', 'sneakerhead'] },
        { name: 'Clover POS API', roles: ['sneakerhead'] },
      ],
    },
    {
      label: 'AI Engineering',
      skills: [
        { name: 'Claude API', roles: ['codriverhq'] },
        { name: 'LLM application architecture', roles: ['codriverhq'] },
        { name: 'Structured outputs', roles: ['codriverhq'] },
        { name: 'Reliability handling', roles: ['codriverhq'] },
      ],
    },
    {
      label: 'AI-Assisted Dev',
      skills: [
        { name: 'Claude Code', roles: ['provenance', 'codriverhq', 'sneakerhead'] },
        { name: 'Cursor', roles: ['provenance', 'codriverhq', 'sneakerhead'] },
      ],
    },
  ],
  education: {
    school: 'California State University, Northridge',
    credential: 'Mechanical Engineering',
    date: 'Class of 2022',
  },
  download: {
    label: 'Download résumé',
    short: 'Résumé',
    href: '/Peter_Shmain_Resume.docx',
    filename: 'Peter_Shmain_Resume.docx',
  },
  colophon:
    'The ruins are deliberate. Rome built infrastructure to last, and rebuilding infrastructure is the work.',
  ui: {
    newTab: '(opens in a new tab)',
    headlineSeparator: ' — ',
    roleSeparator: ' · ',
    dateSeparator: ' — ',
    arrowTo: 'to',
    present: 'Present',
    formerly: 'formerly',
    visit: 'Visit',
    email: 'Email',
    copyEmail: 'Copy email address',
    copied: 'Copied',
    phone: 'Call',
    quickLinks: 'Quick links',
    workTabs: 'Roles',
    impact: 'Impact',
    stack: 'Stack',
    gallery: 'Screens and diagrams',
    previous: 'Previous',
    next: 'Next',
    openFull: 'Open full size',
    close: 'Close',
    slideCount: '{n} of {total}',
    desktopView: 'Desktop',
    phoneView: 'Phone',
    timeline: 'Roles over time',
    year: 'yr',
    years: 'yrs',
    month: 'mo',
    months: 'mos',
    usedAt: 'Used at',
    skillHint: 'Pick a skill to see where it was used.',
  },
};

export type ShowcaseRole = Role & { showcase: Showcase };

/** The roles the Work explorer shows, newest first. */
export const showcaseRoles: ShowcaseRole[] = resume.roles.filter((r): r is ShowcaseRole => !!r.showcase);

/** Roles that list a skill, in page order. */
export function rolesForSkill(name: string): RoleId[] {
  for (const group of resume.skills) {
    const skill = group.skills.find((s) => s.name === name);
    if (skill) return skill.roles;
  }
  return [];
}

/** Skills a role used, in skills-section order. */
export function stackForRole(id: RoleId): string[] {
  return resume.skills.flatMap((g) => g.skills.filter((s) => s.roles.includes(id)).map((s) => s.name));
}
