'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';

const slides = [
  {
    id: 'dashboard',
    title: 'Command Center',
    subtitle: 'Your pipeline at a glance',
    description: 'Track prospects, leads, and costs in real-time. See recent activity and jump straight into action.',
    highlight: '58 analyses in the last day',
  },
  {
    id: 'prospecting',
    title: 'AI Prospecting',
    subtitle: 'Find your ideal clients',
    description: '3 AI agents work together to discover businesses, extract contact info, and score how well they match your ICP.',
    highlight: 'Fully automated discovery',
  },
  {
    id: 'leads',
    title: 'Lead Intelligence',
    subtitle: 'Know exactly what\'s wrong',
    description: 'Every website gets graded A-F with a priority score. Click any lead to see detailed issues with screenshots.',
    highlight: 'Grades + Priority scores',
  },
  {
    id: 'analytics',
    title: 'ROI Dashboard',
    subtitle: 'Numbers that matter',
    description: 'Visualize your funnel from prospects to contacts. Track conversion rates and project your revenue.',
    highlight: '+207,267% projected ROI',
  },
  {
    id: 'outreach',
    title: 'Ready-to-Send',
    subtitle: 'Messages that convert',
    description: 'AI writes personalized emails and social messages based on each lead\'s specific website issues.',
    highlight: '3 emails + 9 social per lead',
  },
];

function useTheme() {
  const [isDark, setIsDark] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();

    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return { isDark, mounted };
}

export function ScreenshotCarousel() {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const { isDark, mounted } = useTheme();

  React.useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Auto-advance every 6 seconds
  React.useEffect(() => {
    if (!api) return;

    const interval = setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [api]);

  const getImageSrc = (id: string) => {
    const theme = mounted && isDark ? 'dark' : 'light';
    return `/screenshots/${id}_${theme}.png`;
  };

  return (
    <div className="w-full">
      <Carousel
        setApi={setApi}
        opts={{
          align: 'center',
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent>
          {slides.map((slide, index) => (
            <CarouselItem key={slide.id}>
              <div className="p-2">
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  {/* Screenshot */}
                  <div className="relative aspect-[16/10] w-full">
                    <Image
                      src={getImageSrc(slide.id)}
                      alt={slide.title}
                      fill
                      className="object-cover object-top"
                      priority={index === 0}
                    />
                    {/* Gradient overlay for depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                  </div>

                  {/* Caption - left aligned */}
                  <div className="p-5 border-t border-border">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">
                          {slide.subtitle}
                        </p>
                        <h3 className="text-lg font-bold text-foreground mb-1">
                          {slide.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {slide.description}
                        </p>
                      </div>
                      {slide.highlight && (
                        <div className="flex-shrink-0 hidden sm:block">
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                            {slide.highlight}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex -left-4 md:-left-14 h-10 w-10" />
        <CarouselNext className="hidden md:flex -right-4 md:-right-14 h-10 w-10" />
      </Carousel>

      {/* Dots navigation */}
      <div className="flex justify-center gap-2 mt-6">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            onClick={() => api?.scrollTo(index)}
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              current === index
                ? 'bg-primary w-8'
                : 'bg-muted-foreground/20 hover:bg-muted-foreground/40 w-2'
            )}
            aria-label={`Go to ${slide.title}`}
          />
        ))}
      </div>
    </div>
  );
}
