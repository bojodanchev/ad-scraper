'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlatformSelector, Platform } from './platform-selector';
import { ModelSelector, InputTypeSelector, InputType } from './model-selector';
import { useGenerationJobs } from '@/hooks/useGenerationJobs';

interface GenerateFormProps {
  sourceAdId?: string;
  defaultProductUrl?: string;
  defaultImageUrl?: string;
  defaultScript?: string;
  onSuccess?: (jobId: string) => void;
}

const ASPECT_RATIOS = [
  { value: '9:16', label: '9:16 (Vertical - TikTok/Reels)' },
  { value: '16:9', label: '16:9 (Horizontal - YouTube)' },
  { value: '1:1', label: '1:1 (Square - Feed)' },
  { value: '4:5', label: '4:5 (Portrait - IG Feed)' },
];

const DURATIONS = [
  { value: '5', label: '5 seconds' },
  { value: '10', label: '10 seconds' },
  { value: '15', label: '15 seconds' },
  { value: '30', label: '30 seconds' },
  { value: '60', label: '60 seconds' },
];

export function GenerateForm({
  sourceAdId,
  defaultProductUrl,
  defaultImageUrl,
  defaultScript,
  onSuccess,
}: GenerateFormProps) {
  const router = useRouter();
  const { createJob, error: jobError } = useGenerationJobs();

  // Form state
  const [platform, setPlatform] = useState<Platform>('auto');
  const [inputType, setInputType] = useState<InputType>('url-to-video');
  const [model, setModel] = useState('kling-video/v2.1/pro/image-to-video');

  // Input fields
  const [productUrl, setProductUrl] = useState(defaultProductUrl || '');
  const [imageUrl, setImageUrl] = useState(defaultImageUrl || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [script, setScript] = useState(defaultScript || '');
  const [prompt, setPrompt] = useState('');
  const [offer, setOffer] = useState('');
  const [avatarId, setAvatarId] = useState('');

  // Options
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [duration, setDuration] = useState('15');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle input type changes - reset platform routing
  const handleInputTypeChange = (type: InputType) => {
    setInputType(type);

    // Auto-select appropriate platform
    if (platform === 'auto') {
      // Keep auto
    } else if (type === 'url-to-video' || type === 'avatar' || type === 'product-avatar') {
      setPlatform('topview');
    } else if (type === 'image-to-video' || type === 'text-to-video') {
      setPlatform('higgsfield');
    }
  };

  // Handle image upload
  const handleImageUpload = async (file: File) => {
    setImageFile(file);
    // For now, create object URL - in production, upload to storage
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (inputType === 'url-to-video' && !productUrl) {
        throw new Error('Product URL is required');
      }
      if ((inputType === 'image-to-video' || inputType === 'product-avatar') && !imageUrl) {
        throw new Error('Image is required');
      }
      if (inputType === 'text-to-video' && !prompt) {
        throw new Error('Prompt is required');
      }
      if (inputType === 'avatar' && !avatarId) {
        throw new Error('Avatar ID is required');
      }

      // Determine actual platform
      let actualPlatform = platform;
      if (platform === 'auto') {
        if (inputType === 'url-to-video' || inputType === 'avatar' || inputType === 'product-avatar') {
          actualPlatform = 'topview';
        } else {
          actualPlatform = 'higgsfield';
        }
      }

      // Build job data
      const jobData = {
        sourceAdId,
        platform: actualPlatform,
        model: actualPlatform === 'higgsfield' ? model : undefined,
        inputType,
        productUrl: productUrl || undefined,
        imageUrl: imageUrl || undefined,
        avatarId: avatarId || undefined,
        script: script || undefined,
        prompt: prompt || undefined,
        offer: offer || undefined,
        aspectRatio,
        duration: parseInt(duration),
      };

      const result = await createJob(jobData);

      if (result?.id) {
        onSuccess?.(result.id);
        router.push(`/queue/${result.id}`);
      } else {
        throw new Error(jobError || 'Failed to create job');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get filtered model type based on input
  const getModelFilterType = (): 'image-to-video' | 'text-to-video' | 'all' => {
    if (inputType === 'image-to-video') return 'image-to-video';
    if (inputType === 'text-to-video') return 'text-to-video';
    return 'all';
  };

  // Determine if we should show Higgsfield model selector
  const showModelSelector = platform === 'higgsfield' ||
    (platform === 'auto' && (inputType === 'image-to-video' || inputType === 'text-to-video'));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Platform Selection */}
      <PlatformSelector
        value={platform}
        onChange={setPlatform}
        recommendedPlatform={
          inputType === 'url-to-video' ? 'topview' :
          inputType === 'image-to-video' ? 'higgsfield' :
          inputType === 'text-to-video' ? 'higgsfield' :
          undefined
        }
      />

      {/* Input Type Selection */}
      <InputTypeSelector
        value={inputType}
        onChange={handleInputTypeChange}
        platform={platform}
      />

      {/* Model Selection (for Higgsfield) */}
      {showModelSelector && (
        <ModelSelector
          value={model}
          onChange={setModel}
          filterType={getModelFilterType()}
          showCards
        />
      )}

      {/* Dynamic Input Fields */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Input Details</CardTitle>
          <CardDescription>
            Provide the source content for video generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL Input (for url-to-video) */}
          {inputType === 'url-to-video' && (
            <div className="space-y-2">
              <Label htmlFor="productUrl">Product URL</Label>
              <Input
                id="productUrl"
                type="url"
                placeholder="https://example.com/product"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter the URL of the product page. TopView will extract content automatically.
              </p>
            </div>
          )}

          {/* Image Input (for image-to-video, product-avatar) */}
          {(inputType === 'image-to-video' || inputType === 'product-avatar') && (
            <div className="space-y-2">
              <Label>Character/Product Image</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* URL input */}
                <div className="space-y-2">
                  <Input
                    type="url"
                    placeholder="Image URL"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>
                {/* File upload */}
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                </div>
              </div>
              {/* Preview */}
              {imageUrl && (
                <div className="mt-2">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="max-h-48 rounded-lg border"
                  />
                </div>
              )}
            </div>
          )}

          {/* Avatar ID (for avatar video) */}
          {inputType === 'avatar' && (
            <div className="space-y-2">
              <Label htmlFor="avatarId">Avatar ID</Label>
              <Input
                id="avatarId"
                placeholder="Enter your cloned avatar ID"
                value={avatarId}
                onChange={(e) => setAvatarId(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Use an avatar you've previously cloned in TopView
              </p>
            </div>
          )}

          {/* Text Prompt (for text-to-video) */}
          {inputType === 'text-to-video' && (
            <div className="space-y-2">
              <Label htmlFor="prompt">Video Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="Describe the video you want to generate..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground">
                Be specific about scene, characters, actions, and style
              </p>
            </div>
          )}

          {/* Script (optional, for avatar/product videos) */}
          {(inputType === 'avatar' || inputType === 'product-avatar' || inputType === 'url-to-video') && (
            <div className="space-y-2">
              <Label htmlFor="script">Script (optional)</Label>
              <Textarea
                id="script"
                placeholder="Enter the script for the avatar to speak..."
                value={script}
                onChange={(e) => setScript(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                If blank, TopView will generate a script from the product URL
              </p>
            </div>
          )}

          {/* Offer (optional) */}
          {(inputType === 'url-to-video' || inputType === 'remix') && (
            <div className="space-y-2">
              <Label htmlFor="offer">Offer/CTA (optional)</Label>
              <Input
                id="offer"
                placeholder="e.g., 50% off today only!"
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Video Options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Video Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Aspect Ratio */}
            <div className="space-y-2">
              <Label>Aspect Ratio</Label>
              <Select value={aspectRatio} onValueChange={setAspectRatio}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_RATIOS.map((ratio) => (
                    <SelectItem key={ratio.value} value={ratio.value}>
                      {ratio.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((dur) => (
                    <SelectItem key={dur.value} value={dur.value}>
                      {dur.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
              Creating Job...
            </>
          ) : (
            <>
              <VideoIcon className="w-4 h-4 mr-2" />
              Generate Video
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// Remix Form - simplified version for remixing existing ads
interface RemixFormProps {
  adId: string;
  originalScript?: string;
  originalHook?: string;
  onSuccess?: (jobId: string) => void;
  onCancel?: () => void;
}

export function RemixForm({
  adId,
  originalScript,
  originalHook,
  onSuccess,
  onCancel,
}: RemixFormProps) {
  const router = useRouter();
  const { createJob } = useGenerationJobs();

  const [platform, setPlatform] = useState<Platform>('auto');
  const [model, setModel] = useState('kling-video/v2.1/pro/image-to-video');
  const [imageUrl, setImageUrl] = useState('');
  const [script, setScript] = useState(originalScript || '');
  const [offer, setOffer] = useState('');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [duration, setDuration] = useState('15');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await createJob({
        sourceAdId: adId,
        platform: platform === 'auto' ? 'higgsfield' : platform,
        model: platform !== 'topview' ? model : undefined,
        inputType: 'remix',
        imageUrl: imageUrl || undefined,
        script: script || undefined,
        offer: offer || undefined,
        aspectRatio,
        duration: parseInt(duration),
      });

      if (result?.id) {
        onSuccess?.(result.id);
        router.push(`/queue/${result.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create remix');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Original Hook Preview */}
      {originalHook && (
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs font-medium text-muted-foreground mb-1">Original Hook:</p>
          <p className="text-sm">{originalHook}</p>
        </div>
      )}

      {/* Platform */}
      <div className="space-y-2">
        <Label>Platform</Label>
        <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto Select</SelectItem>
            <SelectItem value="topview">TopView AI</SelectItem>
            <SelectItem value="higgsfield">Higgsfield AI</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Model (for Higgsfield) */}
      {platform !== 'topview' && (
        <ModelSelector
          value={model}
          onChange={setModel}
          filterType="image-to-video"
        />
      )}

      {/* Image for remix */}
      <div className="space-y-2">
        <Label>Character Image (optional)</Label>
        <Input
          type="url"
          placeholder="Image URL for the character"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
      </div>

      {/* Script */}
      <div className="space-y-2">
        <Label>Remixed Script</Label>
        <Textarea
          placeholder="Enter the remixed script..."
          value={script}
          onChange={(e) => setScript(e.target.value)}
          rows={4}
        />
      </div>

      {/* Offer */}
      <div className="space-y-2">
        <Label>Offer/CTA</Label>
        <Input
          placeholder="e.g., Limited time offer!"
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
        />
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Aspect Ratio</Label>
          <Select value={aspectRatio} onValueChange={setAspectRatio}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASPECT_RATIOS.map((ratio) => (
                <SelectItem key={ratio.value} value={ratio.value}>
                  {ratio.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Duration</Label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map((dur) => (
                <SelectItem key={dur.value} value={dur.value}>
                  {dur.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Remix'}
        </Button>
      </div>
    </form>
  );
}

// Icons
function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}
