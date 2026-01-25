'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useGenerationJobsCount } from '@/hooks/useGenerationJobs';

const NAV_ITEMS = [
  { href: '/ads', label: 'Library' },
  { href: '/creators', label: 'Creators' },
  { href: '/intelligence', label: 'Intelligence', highlight: true },
  { href: '/scrape', label: 'New Scrape' },
  { href: '/jobs', label: 'Scrape Jobs' },
  { href: '/generate', label: 'Generate' },
  { href: '/queue', label: 'Queue', showBadge: true },
  { href: '/docs', label: 'Docs' },
];

export function NavLinks() {
  const pathname = usePathname();
  const reviewCount = useGenerationJobsCount('review');

  return (
    <nav className="flex items-center gap-6">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'text-sm transition-colors flex items-center gap-1',
              isActive
                ? 'text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground',
              item.highlight && !isActive && 'text-primary hover:text-primary/80'
            )}
          >
            {item.label}
            {item.showBadge && reviewCount > 0 && (
              <Badge
                variant="default"
                className="ml-1 text-xs px-1.5 py-0 min-w-[1.25rem] h-5"
              >
                {reviewCount}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
