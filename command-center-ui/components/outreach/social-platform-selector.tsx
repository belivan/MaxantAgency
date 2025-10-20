'use client';

/**
 * Social Platform Selector
 * Choose social media platform for outreach
 */

import { useState } from 'react';
import { Instagram, Facebook, Linkedin } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin';

interface SocialPlatformSelectorProps {
  selectedPlatform?: SocialPlatform;
  onPlatformChange: (platform: SocialPlatform) => void;
  disabled?: boolean;
}

const PLATFORMS = [
  {
    id: 'instagram' as const,
    name: 'Instagram',
    icon: Instagram,
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-100 dark:bg-pink-950/20',
    description: 'Direct messages on Instagram',
    charLimit: 1000,
    features: ['Visual-focused', 'Casual tone', 'Emoji-friendly']
  },
  {
    id: 'facebook' as const,
    name: 'Facebook',
    icon: Facebook,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-950/20',
    description: 'Messenger DMs',
    charLimit: 2000,
    features: ['Conversational', 'Community-focused', 'Multimedia support']
  },
  {
    id: 'linkedin' as const,
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'text-blue-700 dark:text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-950/20',
    description: 'Professional InMail messages',
    charLimit: 1900,
    features: ['Professional tone', 'Business-focused', 'Credential-aware']
  }
];

export function SocialPlatformSelector({
  selectedPlatform,
  onPlatformChange,
  disabled
}: SocialPlatformSelectorProps) {
  const currentPlatform = PLATFORMS.find(p => p.id === selectedPlatform);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Social Platform</CardTitle>
        <CardDescription>
          Choose the platform for your social outreach
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <RadioGroup
          value={selectedPlatform}
          onValueChange={(value) => onPlatformChange(value as SocialPlatform)}
          disabled={disabled}
          className="space-y-3"
        >
          {PLATFORMS.map(platform => {
            const Icon = platform.icon;
            const isSelected = selectedPlatform === platform.id;

            return (
              <div
                key={platform.id}
                className={`relative flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem
                  value={platform.id}
                  id={platform.id}
                  className="mt-1"
                />
                <Label
                  htmlFor={platform.id}
                  className="flex-1 cursor-pointer space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${platform.bgColor}`}>
                      <Icon className={`w-5 h-5 ${platform.color}`} />
                    </div>
                    <div>
                      <div className="font-medium">{platform.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {platform.description}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="space-y-2 pl-12">
                      <div className="flex flex-wrap gap-1.5">
                        {platform.features.map(feature => (
                          <Badge key={feature} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Character limit: {platform.charLimit.toLocaleString()}
                      </div>
                    </div>
                  )}
                </Label>
              </div>
            );
          })}
        </RadioGroup>

        {currentPlatform && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <p className="text-sm font-medium mb-2">Platform Guidelines</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Keep messages concise and engaging</li>
              <li>• Personalize based on their business</li>
              <li>• Include a clear call-to-action</li>
              <li>• Respect {currentPlatform.charLimit} character limit</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SocialPlatformSelector;
