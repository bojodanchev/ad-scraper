import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const VALID_SECTIONS = ['overview', 'platforms', 'scraping', 'troubleshooting', 'api', 'changelog'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  try {
    const { section } = await params;

    // Validate section to prevent path traversal
    if (!VALID_SECTIONS.includes(section)) {
      return NextResponse.json(
        { error: 'Invalid section' },
        { status: 400 }
      );
    }

    // Read the markdown file
    const docsPath = path.join(process.cwd(), 'docs', `${section}.md`);
    const content = await readFile(docsPath, 'utf-8');

    return NextResponse.json({
      section,
      content,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error reading docs:', error);
    return NextResponse.json(
      { error: 'Documentation not found' },
      { status: 404 }
    );
  }
}
