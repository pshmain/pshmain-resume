// All page copy, typed. Components read from this object and never hardcode text.
// Source: design/handoff.md, updated to match public/Peter_Shmain_Resume.docx (the downloadable
// résumé, revised 2026-09-02 after the handoff). See design/DEVIATIONS.md, "Copy".

export interface Contact {
  email: string;
  phone: { display: string; href: string };
  linkedin: { display: string; short: string; href: string };
}

export interface WorkCard {
  kicker: string;
  title: string;
  blurb: string;
  href: string;
  domain: string;
}

export interface Role {
  title: string;
  company: string;
  href?: string;
  location: string;
  start: string;
  end: string;
  bullets: string[];
}

export interface SkillRow {
  label: string;
  value: string;
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

export interface GateNudge {
  /** Normalised guesses (lowercase letters only) that earn this reply instead of `miss`. */
  match: string[];
  text: string;
}

/** The riddle that locks the page until it is solved or skipped. See src/components/Gate.tsx. */
export interface Gate {
  kicker: string;
  /** One entry per line. */
  riddle: string[];
  inputLabel: string;
  placeholder: string;
  submit: string;
  hint: string;
  hintLines: string[];
  skip: string;
  miss: string;
  /** Normalised accepted answers (lowercase letters only). */
  answers: string[];
  nudges: GateNudge[];
  /** The answer, shown as the kicker once the riddle is solved or skipped. */
  answerKicker: string;
  /** Body lines of the explanation. */
  reveal: string[];
  /** Closing lines, set in the riddle's display face. */
  closing: string[];
  enter: string;
}

export interface Resume {
  name: string;
  headline: string;
  location: string;
  contact: Contact;
  sections: {
    profile: SectionMeta;
    work: SectionMeta;
    experience: SectionMeta;
    skills: SectionMeta;
    education: SectionMeta;
  };
  profile: string;
  work: WorkCard[];
  experience: Role[];
  skills: SkillRow[];
  education: Education;
  download: { label: string; href: string; filename: string };
  gate: Gate;
  /** Footer line explaining the ruins, for anyone who arrives past the gate. */
  colophon: string;
  ui: {
    scrollCue: string;
    visit: string;
    /** Screen-reader suffix appended to every link that opens a new tab. */
    newTab: string;
    /** Between headline and city in the hero. */
    headlineSeparator: string;
    /** Between role and company in Experience headings. */
    roleSeparator: string;
    /** Between start and end dates. */
    dateSeparator: string;
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
    profile: { id: 'profile', numeral: 'I', title: 'Profile' },
    work: { id: 'selected-work', numeral: 'II', title: 'Selected Work' },
    experience: { id: 'experience', numeral: 'III', title: 'Experience' },
    skills: { id: 'skills', numeral: 'IV', title: 'Technical Skills' },
    education: { id: 'education', numeral: 'V', title: 'Education' },
  },
  profile:
    'As a full stack developer on small startup teams, my primary experience has been full ownership from scoping to shipping. I am well versed in AI and have made it my mission to be as efficient and effective with AI tools as possible.',
  work: [
    {
      kicker: 'Full-Stack Engineer',
      title: 'Provenance',
      blurb:
        'Ordination-documents suite rebuilt as a first-party pipeline, cutting delivery time by two-thirds on a $750K revenue line.',
      href: 'https://provenance.co/',
      domain: 'provenance.co',
    },
    {
      kicker: 'Co-Founder',
      title: 'CoDriverHQ',
      blurb:
        'AI car-buying advisor on Next.js, PostgreSQL, Stripe, and the Claude API — from buyer profiling to live listing analysis.',
      href: 'https://codriverhq.com/',
      domain: 'codriverhq.com',
    },
    {
      kicker: 'Full-Stack Engineer',
      title: 'Sneakerhead',
      blurb:
        'Ecommerce storefront with Stripe checkout and a real-time Clover POS inventory sync for a Melrose vintage clothing brand.',
      href: 'https://sneakerheadmelrose.com/',
      domain: 'sneakerheadmelrose.com',
    },
  ],
  experience: [
    {
      title: 'Full-Stack Engineer',
      company: 'Provenance',
      href: 'https://provenance.co/',
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
    },
    {
      title: 'Co-Founder & Full-Stack Engineer',
      company: 'CoDriverHQ',
      href: 'https://codriverhq.com/',
      location: 'Los Angeles, CA',
      start: 'Jan 2025',
      end: 'Present',
      bullets: [
        'Co-founded an AI-powered car-buying advisor that educates buyers from research through deal analysis, aggregating data on nearly every vehicle on the market and distilling it into what each buyer actually needs.',
        'Built the product end to end on Next.js, TypeScript, PostgreSQL, Stripe, and the Claude API, covering architecture, data model, authentication, and subscription billing.',
        'Designed the schema and user-profiling system behind the recommendation engine. A guided intake builds a buyer profile, then batched API calls evaluate live listings on price, history, and market trends, returning matches with reasoning.',
        "Wrote a streaming chat assistant that walks buyers through car-buying topics it hasn't covered yet, with guardrails that keep it on-topic and resistant to off-domain misuse.",
      ],
    },
    {
      title: 'Full-Stack Engineer',
      company: 'Sneakerhead LLC',
      href: 'https://sneakerheadmelrose.com/',
      location: 'Los Angeles, CA',
      start: 'Oct 2024',
      end: 'Dec 2025',
      bullets: [
        'Designed and built several ecommerce platforms for a brick-and-mortar vintage clothing brand, covering storefront, catalog, search and filtering, cart, and Stripe checkout on a photo-heavy mobile-first catalog.',
        'Set up a real-time inventory sync between the in-store Clover POS and the web catalog, running every 10 minutes so a sale on either channel updates availability on the other.',
        'Maintained an active catalog of thousands of items, handling schema mapping, deduplication, and data integrity across both systems, while owning hosting, deploys, and monitoring.',
      ],
    },
    {
      title: 'Co-Founder & Operator',
      company: 'Shmizzys Garage LLC',
      location: 'Los Angeles, CA',
      start: 'Aug 2022',
      end: 'Nov 2024',
      bullets: [
        'Co-founded and ran an independent dealership reconditioning and reselling vehicles, applying a mechanical engineering background to scope repairs and performance modifications while running acquisition, pricing, and vendor negotiation.',
        'Automated inventory, cost, and margin tracking to replace manual record-keeping, which became the entry point into software engineering.',
      ],
    },
  ],
  skills: [
    { label: 'Frontend', value: 'React, Next.js, TypeScript, JavaScript, Tailwind, HTML/CSS' },
    { label: 'Backend', value: 'Node.js, Express, Sequelize, Prisma, REST APIs' },
    { label: 'Databases', value: 'PostgreSQL, MySQL, Supabase' },
    { label: 'Cloud & Tools', value: 'AWS S3, Vercel, Docker, CircleCI, Git, Stripe, Clover POS API' },
    {
      label: 'AI Engineering',
      value: 'Claude API, LLM application architecture, structured outputs, reliability handling',
    },
    { label: 'AI-Assisted Dev', value: 'Claude Code and Cursor in daily production work' },
  ],
  education: {
    school: 'California State University, Northridge',
    credential: 'Mechanical Engineering',
    date: 'Class of 2022',
  },
  download: {
    label: 'Download résumé',
    href: '/Peter_Shmain_Resume.docx',
    filename: 'Peter_Shmain_Resume.docx',
  },
  gate: {
    kicker: 'Why the ruins, and why Rome?',
    riddle: ['I stand by leaning on myself.', 'Remove one piece, and I may fall.'],
    inputLabel: 'Your answer',
    placeholder: 'one word',
    submit: 'Enter',
    hint: 'Hint',
    hintLines: [
      'Romans put me everywhere, from bridges to monuments.',
      'I am a core part of the architecture.',
      'I am round and vaulted in appearance.',
    ],
    skip: 'Skip the riddle',
    miss: 'Not quite.',
    answers: ['arch', 'arches', 'archway', 'archways'],
    nudges: [
      { match: ['keystone'], text: "That's the stone that locks me. What am I?" },
      { match: ['bridge', 'aqueduct', 'viaduct'], text: 'Warm. What holds them up?' },
      { match: ['dome', 'vault'], text: "Close. That's me, spun around." },
      { match: ['column', 'pillar', 'tower', 'wall'], text: "Straight up won't do it. I curve." },
      {
        match: ['ladder', 'tent', 'tripod', 'easel', 'cards', 'houseofcards', 'pyramid'],
        text: 'Warm. Now make it stone, and Roman.',
      },
      { match: ['rome', 'ruins', 'ruin', 'colosseum'], text: 'Not the place. The shape it was built with.' },
    ],
    answerKicker: 'Arch',
    reveal: ["Rome wasn't built in a day.", 'Rome built infrastructure that outlasted the empire.'],
    closing: ['An arch stands by leaning on itself.', 'So does good software.'],
    enter: 'Enter',
  },
  colophon:
    'The ruins are deliberate. Rome built infrastructure to last, and rebuilding infrastructure is the work.',
  ui: {
    scrollCue: 'Scroll',
    visit: 'Visit',
    newTab: '(opens in a new tab)',
    headlineSeparator: ' — ',
    roleSeparator: ' · ',
    dateSeparator: ' — ',
  },
};
