'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export type Platform = 'topview' | 'higgsfield' | 'auto';

interface PlatformSelectorProps {
  value: Platform;
  onChange: (platform: Platform) => void;
  topviewAvailable?: boolean;
  higgsfieldAvailable?: boolean;
  recommendedPlatform?: Platform;
}

const PLATFORM_INFO = {
  topview: {
    name: 'TopView AI',
    description: 'Best for product URLs and avatar videos',
    features: [
      'URL-to-Video (one-click)',
      'Avatar cloning',
      'Product presenter',
    ],
    color: 'bg-blue-500',
  },
  higgsfield: {
    name: 'Higgsfield AI',
    description: 'Multi-model access (Sora, Veo, Kling)',
    features: [
      'Image-to-video',
      'Text-to-video (Sora/Veo)',
      '8+ AI models',
    ],
    color: 'bg-purple-500',
  },
  auto: {
    name: 'Auto Select',
    description: 'Let the system choose the best platform',
    features: [
      'Smart routing',
      'Based on input type',
      'Optimal results',
    ],
    color: 'bg-gray-500',
  },
};

export function PlatformSelector({
  value,
  onChange,
  topviewAvailable = true,
  higgsfieldAvailable = true,
  recommendedPlatform,
}: PlatformSelectorProps) {
  const platforms: Platform[] = ['auto', 'topview', 'higgsfield'];

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Platform</label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {platforms.map((platform) => {
          const info = PLATFORM_INFO[platform];
          const isSelected = value === platform;
          const isDisabled =
            (platform === 'topview' && !topviewAvailable) ||
            (platform === 'higgsfield' && !higgsfieldAvailable);
          const isRecommended = recommendedPlatform === platform;

          return (
            <button
              key={platform}
              type="button"
              onClick={() => !isDisabled && onChange(platform)}
              disabled={isDisabled}
              className={cn(
                'relative p-4 rounded-lg border-2 text-left transition-all',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50',
                isDisabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {/* Selection indicator */}
              <div
                className={cn(
                  'absolute top-3 right-3 w-4 h-4 rounded-full border-2',
                  isSelected
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground'
                )}
              >
                {isSelected && (
                  <svg
                    className="w-full h-full text-primary-foreground p-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>

              {/* Platform indicator */}
              <div className="flex items-center gap-2 mb-2">
                <div className={cn('w-2 h-2 rounded-full', info.color)} />
                <span className="font-medium">{info.name}</span>
                {isRecommended && (
                  <Badge variant="secondary" className="text-xs">
                    Recommended
                  </Badge>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground mb-3">
                {info.description}
              </p>

              {/* Features */}
              <ul className="text-xs text-muted-foreground space-y-1">
                {info.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <span className="text-primary">+</span>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Availability warning */}
              {isDisabled && (
                <div className="mt-2 text-xs text-destructive">
                  Not configured
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
