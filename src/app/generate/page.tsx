'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { GenerateForm } from '@/components/generation/generate-form';

function GenerateContent() {
  const searchParams = useSearchParams();

  // Get optional pre-filled values from query params
  const sourceAdId = searchParams.get('adId') || undefined;
  const productUrl = searchParams.get('url') || undefined;
  const imageUrl = searchParams.get('image') || undefined;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Generate Video Ad</h1>
        <p className="text-muted-foreground mt-1">
          Create AI-generated video ads using TopView or Higgsfield
        </p>
      </div>

      <GenerateForm
        sourceAdId={sourceAdId}
        defaultProductUrl={productUrl}
        defaultImageUrl={imageUrl}
      />
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<GeneratePageSkeleton />}>
      <GenerateContent />
    </Suspense>
  );
}

function GeneratePageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-5 w-64 bg-muted rounded mt-2 animate-pulse" />
      </div>

      {/* Platform selector skeleton */}
      <div className="space-y-3">
        <div className="h-5 w-20 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>

      {/* Input type skeleton */}
      <div className="space-y-3">
        <div className="h-5 w-28 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>

      {/* Form fields skeleton */}
      <div className="border rounded-lg p-4 space-y-4">
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        <div className="h-10 bg-muted rounded animate-pulse" />
        <div className="h-24 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}
