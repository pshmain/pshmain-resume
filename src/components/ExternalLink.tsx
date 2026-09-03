import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { resume } from '@/data/resume';

interface Props extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: ReactNode;
}

/** Link that opens in a new tab, with a screen-reader notice appended to its name. */
export function ExternalLink({ children, ...rest }: Props) {
  return (
    <a target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
      <span className="sr-only"> {resume.ui.newTab}</span>
    </a>
  );
}
