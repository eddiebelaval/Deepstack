'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  Search,
  Building2,
  ExternalLink,
  Sparkles,
  AlertCircle,
  X,
  Users,
  TrendingUp,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompanyProfile } from '@/lib/stores/perplexity-finance-store';

/**
 * CompanyProfilePanel - AI-powered company deep-dives
 *
 * Features:
 * - Comprehensive company profiles
 * - Executive backgrounds
 * - Risk factors analysis
 * - Competitive landscape
 * - Recent developments
 */

interface CompanyProfilePanelProps {
  className?: string;
  initialEntity?: string;
}

// Section icons
const SECTION_ICONS: Record<string, React.ReactNode> = {
  Overview: <Building2 className="h-3.5 w-3.5" />,
  Executives: <Users className="h-3.5 w-3.5" />,
  'Business Model': <TrendingUp className="h-3.5 w-3.5" />,
  'Risk Factors': <AlertTriangle className="h-3.5 w-3.5" />,
  Competition: <Building2 className="h-3.5 w-3.5" />,
  Financials: <FileText className="h-3.5 w-3.5" />,
  default: <Sparkles className="h-3.5 w-3.5" />,
};

export function CompanyProfilePanel({
  className,
  initialEntity,
}: CompanyProfilePanelProps) {
  const [entity, setEntity] = useState(initialEntity || '');

  const {
    profile,
    profileLoading,
    profileError,
    getCompanyProfile,
    clearProfile,
  } = useCompanyProfile();

  const handleSearch = () => {
    if (!entity.trim()) return;
    getCompanyProfile(entity.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Get icon for section
  const getSectionIcon = (title: string) => {
    return SECTION_ICONS[title] || SECTION_ICONS.default;
  };

  return (
    <div className={cn('h-full flex flex-col p-4 gap-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Company Profile</h2>
        </div>
        {profile && (
          <Button variant="ghost" size="sm" onClick={clearProfile}>
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Search Form */}
      <Card className="flex-shrink-0">
        <CardContent className="py-3 px-3">
          <div className="flex gap-2">
            <Input
              placeholder="Company name or ticker (e.g., Apple, AAPL)"
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-9 text-sm"
            />
            <Button
              size="sm"
              onClick={handleSearch}
              disabled={!entity.trim() || profileLoading}
              className="h-9"
            >
              {profileLoading ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5 mr-1" />
              )}
              Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="flex-1 min-h-0">
        {profileError ? (
          <Card className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-destructive">
              <AlertCircle className="h-8 w-8" />
              <span className="text-sm">{profileError}</span>
              <Button variant="outline" size="sm" onClick={handleSearch}>
                Retry
              </Button>
            </div>
          </Card>
        ) : profileLoading ? (
          <Card className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                Building company profile...
              </span>
            </div>
          </Card>
        ) : profile ? (
          <Card className="h-full flex flex-col">
            <CardHeader className="py-2 px-3 flex-shrink-0">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>{profile.entity}</span>
                </div>
                {profile.mock && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded">
                    Mock
                  </span>
                )}
              </CardTitle>
            </CardHeader>

            <Separator />

            {/* Tabs for different sections */}
            {profile.sections && profile.sections.length > 1 ? (
              <Tabs defaultValue="0" className="flex-1 flex flex-col min-h-0">
                <TabsList className="mx-3 mt-2 justify-start h-auto flex-wrap gap-1">
                  {profile.sections.map((section, idx) => (
                    <TabsTrigger
                      key={idx}
                      value={String(idx)}
                      className="text-xs px-2 py-1 h-7"
                    >
                      <span className="mr-1">{getSectionIcon(section.title)}</span>
                      {section.title}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {profile.sections.map((section, idx) => (
                  <TabsContent
                    key={idx}
                    value={String(idx)}
                    className="flex-1 mt-0 data-[state=active]:flex flex-col min-h-0"
                  >
                    <ScrollArea className="flex-1 p-3">
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {section.content}
                      </p>
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <ScrollArea className="flex-1 p-3">
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {profile.content}
                </p>
              </ScrollArea>
            )}

            {/* Citations */}
            {profile.citations && profile.citations.length > 0 && (
              <div className="px-3 py-2 border-t">
                <div className="flex flex-wrap gap-2">
                  {profile.citations.slice(0, 4).map((citation, idx) => (
                    <a
                      key={idx}
                      href={citation}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                      Source {idx + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-3 py-2 border-t flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" />
                AI-generated by Perplexity Finance
              </span>
            </div>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Building2 className="h-12 w-12 opacity-50" />
              <div className="text-center">
                <p className="text-sm font-medium">Company Profile Builder</p>
                <p className="text-xs">
                  Enter a company name or ticker to get an AI-generated deep-dive
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default CompanyProfilePanel;
