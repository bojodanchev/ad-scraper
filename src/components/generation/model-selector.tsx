'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Model {
  id: string;
  name: string;
  type: 'image-to-video' | 'text-to-video';
  description: string;
  costTier: 'low' | 'medium' | 'high' | 'premium';
}

const HIGGSFIELD_MODELS: Model[] = [
  {
    id: 'higgsfield-ai/dop/standard',
    name: 'Higgsfield DOP',
    type: 'image-to-video',
    description: 'Standard quality, fast generation',
    costTier: 'low',
  },
  {
    id: 'higgsfield-ai/dop/preview',
    name: 'Higgsfield Preview',
    type: 'image-to-video',
    description: 'Quick previews, lower quality',
    costTier: 'low',
  },
  {
    id: 'bytedance/seedance/v1/pro/image-to-video',
    name: 'Seedance Pro',
    type: 'image-to-video',
    description: 'High quality dance/motion',
    costTier: 'medium',
  },
  {
    id: 'kling-video/v2.1/pro/image-to-video',
    name: 'Kling 2.1 Pro',
    type: 'image-to-video',
    description: 'Cinematic quality, great for UGC',
    costTier: 'high',
  },
  {
    id: 'wan-2.5',
    name: 'WAN 2.5',
    type: 'image-to-video',
    description: 'Good continuity, natural motion',
    costTier: 'medium',
  },
  {
    id: 'minimax/hailuo-02',
    name: 'MiniMax Hailuo',
    type: 'image-to-video',
    description: 'Fast iteration, decent quality',
    costTier: 'low',
  },
  {
    id: 'sora-2',
    name: 'Sora 2 (OpenAI)',
    type: 'text-to-video',
    description: 'Premium quality, slow, expensive',
    costTier: 'premium',
  },
  {
    id: 'veo-3.1',
    name: 'Google Veo 3.1',
    type: 'text-to-video',
    description: 'High realism, good for UGC',
    costTier: 'premium',
  },
];

const COST_COLORS = {
  low: 'text-green-600',
  medium: 'text-yellow-600',
  high: 'text-orange-600',
  premium: 'text-red-600',
};

const COST_LABELS = {
  low: '$',
  medium: '$$',
  high: '$$$',
  premium: '$$$$',
};

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  filterType?: 'image-to-video' | 'text-to-video' | 'all';
  showCards?: boolean;
}

export function ModelSelector({
  value,
  onChange,
  filterType = 'all',
  showCards = false,
}: ModelSelectorProps) {
  const models = HIGGSFIELD_MODELS.filter(
    (m) => filterType === 'all' || m.type === filterType
  );

  const selectedModel = models.find((m) => m.id === value);

  if (showCards) {
    return (
      <div className="space-y-3">
        <label className="text-sm font-medium">Model</label>

        {/* Group by type */}
        {['image-to-video', 'text-to-video'].map((type) => {
          const typeModels = models.filter((m) => m.type === type);
          if (typeModels.length === 0) return null;

          return (
            <div key={type} className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {type === 'image-to-video' ? 'Image to Video' : 'Text to Video'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {typeModels.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => onChange(model.id)}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-all',
                      value === model.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{model.name}</span>
                      <span
                        className={cn(
                          'text-xs font-mono',
                          COST_COLORS[model.costTier]
                        )}
                      >
                        {COST_LABELS[model.costTier]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {model.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Dropdown mode
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Model</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select a model">
            {selectedModel && (
              <div className="flex items-center gap-2">
                <span>{selectedModel.name}</span>
                <span
                  className={cn(
                    'text-xs font-mono',
                    COST_COLORS[selectedModel.costTier]
                  )}
                >
                  {COST_LABELS[selectedModel.costTier]}
                </span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* Image to Video */}
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            Image to Video
          </div>
          {models
            .filter((m) => m.type === 'image-to-video')
            .map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex items-center justify-between w-full">
                  <div>
                    <span className="font-medium">{model.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {model.description}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'text-xs font-mono ml-2',
                      COST_COLORS[model.costTier]
                    )}
                  >
                    {COST_LABELS[model.costTier]}
                  </span>
                </div>
              </SelectItem>
            ))}

          {/* Text to Video */}
          {models.some((m) => m.type === 'text-to-video') && (
            <>
              <div className="px-2 py-1.5 text-xs text-muted-foreground border-t mt-1 pt-2">
                Text to Video (Premium)
              </div>
              {models
                .filter((m) => m.type === 'text-to-video')
                .map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <span className="font-medium">{model.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {model.description}
                        </span>
                      </div>
                      <span
                        className={cn(
                          'text-xs font-mono ml-2',
                          COST_COLORS[model.costTier]
                        )}
                      >
                        {COST_LABELS[model.costTier]}
                      </span>
                    </div>
                  </SelectItem>
                ))}
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

// Input type selector for the form
export type InputType =
  | 'url-to-video'
  | 'image-to-video'
  | 'text-to-video'
  | 'avatar'
  | 'product-avatar'
  | 'remix';

interface InputTypeSelectorProps {
  value: InputType;
  onChange: (type: InputType) => void;
  platform: 'topview' | 'higgsfield' | 'auto';
}

const INPUT_TYPES = {
  topview: [
    {
      id: 'url-to-video' as InputType,
      name: 'URL to Video',
      description: 'Generate from product page URL',
      icon: '🔗',
    },
    {
      id: 'product-avatar' as InputType,
      name: 'Product Avatar',
      description: 'AI presenter holding your product',
      icon: '🛍️',
    },
    {
      id: 'avatar' as InputType,
      name: 'Avatar Video',
      description: 'Use existing cloned avatar',
      icon: '👤',
    },
  ],
  higgsfield: [
    {
      id: 'image-to-video' as InputType,
      name: 'Image to Video',
      description: 'Animate a character image',
      icon: '🖼️',
    },
    {
      id: 'text-to-video' as InputType,
      name: 'Text to Video',
      description: 'Generate from text (Sora/Veo)',
      icon: '✨',
    },
  ],
  auto: [
    {
      id: 'url-to-video' as InputType,
      name: 'URL to Video',
      description: 'Product page → video (TopView)',
      icon: '🔗',
    },
    {
      id: 'image-to-video' as InputType,
      name: 'Image to Video',
      description: 'Animate image (Higgsfield)',
      icon: '🖼️',
    },
    {
      id: 'text-to-video' as InputType,
      name: 'Text to Video',
      description: 'Pure prompt (Sora/Veo)',
      icon: '✨',
    },
    {
      id: 'remix' as InputType,
      name: 'Remix Ad',
      description: 'Remix a winning ad',
      icon: '🔄',
    },
  ],
};

export function InputTypeSelector({
  value,
  onChange,
  platform,
}: InputTypeSelectorProps) {
  const types = INPUT_TYPES[platform] || INPUT_TYPES.auto;

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Generation Type</label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {types.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => onChange(type.id)}
            className={cn(
              'p-3 rounded-lg border text-center transition-all',
              value === type.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
          >
            <div className="text-2xl mb-1">{type.icon}</div>
            <div className="font-medium text-sm">{type.name}</div>
            <div className="text-xs text-muted-foreground">{type.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
