'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DocSection {
  id: string;
  title: string;
  description: string;
  icon: string;
}

const DOC_SECTIONS: DocSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    description: 'What is Ad Scraper and how does it work',
    icon: '📖',
  },
  {
    id: 'platforms',
    title: 'Platforms',
    description: 'TikTok, Instagram, and Meta Ads Library details',
    icon: '📱',
  },
  {
    id: 'scraping',
    title: 'Scraping Guide',
    description: 'How to run effective scrapes step by step',
    icon: '🔍',
  },
  {
    id: 'telegram',
    title: 'Telegram Automation',
    description: 'Mother-slave funnel architecture and setup',
    icon: '📨',
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    description: 'Fix common issues and errors',
    icon: '🔧',
  },
  {
    id: 'api',
    title: 'API Reference',
    description: 'Technical documentation for developers',
    icon: '⚙️',
  },
  {
    id: 'changelog',
    title: 'Changelog',
    description: "What's new and what's changed",
    icon: '📝',
  },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDoc() {
      setLoading(true);
      try {
        const res = await fetch(`/api/docs/${activeSection}`);
        if (res.ok) {
          const data = await res.json();
          setContent(data.content);
        } else {
          setContent('# Error\n\nCould not load documentation.');
        }
      } catch {
        setContent('# Error\n\nCould not load documentation.');
      } finally {
        setLoading(false);
      }
    }
    loadDoc();
  }, [activeSection]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Documentation</h1>
        <p className="text-muted-foreground mt-1">
          Learn how to use Ad Scraper effectively
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Sections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {DOC_SECTIONS.map((section) => (
                <Button
                  key={section.id}
                  variant={activeSection === section.id ? 'secondary' : 'ghost'}
                  className="w-full justify-start text-left h-auto py-3"
                  onClick={() => setActiveSection(section.id)}
                >
                  <span className="mr-2">{section.icon}</span>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{section.title}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {section.description}
                    </span>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">System Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platforms</span>
                <Badge variant="outline">3</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scrape Timeout</span>
                <Badge variant="outline">15 min</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Items</span>
                <Badge variant="outline">200</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data Retention</span>
                <Badge variant="outline">7 days</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-6">
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-8 bg-muted rounded w-1/3"></div>
                  <div className="h-4 bg-muted rounded w-full"></div>
                  <div className="h-4 bg-muted rounded w-5/6"></div>
                  <div className="h-4 bg-muted rounded w-4/6"></div>
                </div>
              ) : (
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <MarkdownRenderer content={content} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Simple markdown renderer component
function MarkdownRenderer({ content }: { content: string }) {
  // Parse markdown to HTML (simple implementation)
  const html = parseMarkdown(content);

  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      className="docs-content"
    />
  );
}

// Simple markdown parser
function parseMarkdown(md: string): string {
  let html = md;

  // Escape HTML
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (before other processing)
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="bg-muted p-4 rounded-lg overflow-x-auto text-sm"><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm">$1</code>');

  // Headers
  html = html.replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-6 mb-3">$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-8 mb-4 pb-2 border-b">$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-4">$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener">$1</a>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="my-8 border-border" />');

  // Tables
  html = html.replace(/^\|(.+)\|$/gm, (match, content) => {
    const cells = content.split('|').map((c: string) => c.trim());
    return `<tr>${cells.map((c: string) => `<td class="border border-border px-4 py-2">${c}</td>`).join('')}</tr>`;
  });
  html = html.replace(/(<tr>.*<\/tr>\n?)+/g, (match) => {
    // Check if first row is header (contains ---)
    const rows = match.split('\n').filter(r => r.trim());
    if (rows.length > 1 && rows[1].includes('---')) {
      const header = rows[0].replace(/<td/g, '<th').replace(/<\/td>/g, '</th>');
      const body = rows.slice(2).join('\n');
      return `<table class="w-full border-collapse my-4"><thead class="bg-muted">${header}</thead><tbody>${body}</tbody></table>`;
    }
    return `<table class="w-full border-collapse my-4"><tbody>${match}</tbody></table>`;
  });

  // Lists
  html = html.replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>');
  html = html.replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc list-inside my-4 space-y-1">$&</ul>');

  // Numbered lists
  html = html.replace(/^\d+\. (.*$)/gm, '<li class="ml-4">$1</li>');

  // Paragraphs (lines not already tagged)
  html = html.replace(/^(?!<[a-z])(.*[^\s].*)$/gm, (match) => {
    if (match.startsWith('<')) return match;
    return `<p class="my-3">${match}</p>`;
  });

  // Clean up empty paragraphs
  html = html.replace(/<p class="my-3"><\/p>/g, '');

  return html;
}
