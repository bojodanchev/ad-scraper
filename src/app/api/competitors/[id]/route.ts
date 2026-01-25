import { NextRequest, NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/db/client';
import { getCompetitorTracker } from '@/lib/intelligence';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureInitialized();

    const { id } = await params;

    const tracker = getCompetitorTracker();
    const summary = await tracker.getCompetitorSummary(id);

    if (!summary) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
    }

    const competitor = await tracker.getCompetitor(id);

    return NextResponse.json({
      competitor: {
        ...competitor,
        tags: competitor?.tags ? JSON.parse(competitor.tags) : [],
        alertConfig: competitor?.alertConfig ? JSON.parse(competitor.alertConfig) : null,
      },
      summary,
    });
  } catch (error) {
    console.error('Get competitor error:', error);
    return NextResponse.json(
      { error: 'Failed to get competitor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureInitialized();

    const { id } = await params;
    const body = await request.json();
    const { notes, tags, alertsEnabled } = body;

    const tracker = getCompetitorTracker();

    if (notes !== undefined) {
      await tracker.updateNotes(id, notes);
    }

    if (tags !== undefined) {
      await tracker.updateTags(id, tags);
    }

    if (alertsEnabled !== undefined) {
      await tracker.toggleAlerts(id, alertsEnabled);
    }

    const updated = await tracker.getCompetitor(id);

    return NextResponse.json({
      message: 'Competitor updated',
      competitor: updated,
    });
  } catch (error) {
    console.error('Update competitor error:', error);
    return NextResponse.json(
      { error: 'Failed to update competitor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureInitialized();

    const { id } = await params;

    const tracker = getCompetitorTracker();
    await tracker.removeCompetitor(id);

    return NextResponse.json({
      message: 'Competitor removed',
    });
  } catch (error) {
    console.error('Delete competitor error:', error);
    return NextResponse.json(
      { error: 'Failed to remove competitor' },
      { status: 500 }
    );
  }
}
