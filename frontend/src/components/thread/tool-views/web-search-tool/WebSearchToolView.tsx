import React, { useState } from 'react';
import {
  Search,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Image as ImageIcon,
  Globe,
  FileText,
  Clock,
  BookOpen,
  CalendarDays,
} from 'lucide-react';
import { ToolViewProps } from '../types';
import { cleanUrl, formatTimestamp, getToolTitle } from '../utils';
import { truncateString } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingState } from '../shared/LoadingState';
import { extractWebSearchData } from './_utils';

export function WebSearchToolView({
  name = 'web-search',
  assistantContent,
  toolContent,
  assistantTimestamp,
  toolTimestamp,
  isSuccess = true,
  isStreaming = false,
}: ToolViewProps) {
  const { resolvedTheme } = useTheme();
  const [expandedResults, setExpandedResults] = useState<Record<number, boolean>>({});

  const {
    query,
    searchResults,
    answer,
    images,
    actualIsSuccess,
    actualToolTimestamp,
    actualAssistantTimestamp
  } = extractWebSearchData(
    assistantContent,
    toolContent,
    isSuccess,
    toolTimestamp,
    assistantTimestamp
  );

  const toolTitle = getToolTitle(name);

  const getFavicon = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    } catch (e) {
      return null;
    }
  };

  const getResultType = (result: any) => {
    const { url, title } = result;

    if (url.includes('news') || url.includes('article') || title.includes('News')) {
      return { icon: FileText, label: 'Article' };
    } else if (url.includes('wiki')) {
      return { icon: BookOpen, label: 'Wiki' };
    } else if (url.includes('blog')) {
      return { icon: CalendarDays, label: 'Blog' };
    } else {
      return { icon: Globe, label: 'Website' };
    }
  };

  return (
    <Card className="gap-0 flex border shadow-none p-0 rounded-lg flex-col h-full overflow-hidden bg-card">
      <CardHeader className="h-9 bg-gradient-to-t from-zinc-50/80 to-zinc-200/70 dark:from-zinc-900/90 dark:to-zinc-800/90 text-center backdrop-blur-lg border-b p-2 px-4 space-y-2 rounded-t-lg">
        <div className="flex flex-row items-center justify-between">
          <div className="flex items-center w-full justify-center gap-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                {toolTitle}
              </CardTitle>
            </div>
          </div>

          {/* {!isStreaming && (
            <Badge
              variant="secondary"
              className={
                actualIsSuccess
                  ? "bg-gradient-to-b from-emerald-200 to-emerald-100 text-emerald-700 dark:from-emerald-800/50 dark:to-emerald-900/60 dark:text-emerald-300"
                  : "bg-gradient-to-b from-rose-200 to-rose-100 text-rose-700 dark:from-rose-800/50 dark:to-rose-900/60 dark:text-rose-300"
              }
            >
              {actualIsSuccess ? (
                <CheckCircle className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              {actualIsSuccess ? 'Search completed successfully' : 'Search failed'}
            </Badge>
          )} */}
        </div>
      </CardHeader>

      <CardContent className="p-0 h-full flex-1 overflow-hidden relative">
        {isStreaming && searchResults.length === 0 && !answer ? (
          <LoadingState
            icon={Search}
            iconColor="text-blue-500 dark:text-blue-400"
            bgColor="bg-gradient-to-b from-blue-100 to-blue-50 shadow-inner dark:from-blue-800/40 dark:to-blue-900/60 dark:shadow-blue-950/20"
            title="Searching the web"
            filePath={query}
            showProgress={true}
          />
        ) : searchResults.length > 0 || answer ? (
          <ScrollArea className="h-full w-full">
            <div className="p-4 px-0 py-0">

              <div className="space-y-0">
                {searchResults.map((result, idx) => {
                  const { icon: ResultTypeIcon, label: resultTypeLabel } = getResultType(result);
                  const isExpanded = expandedResults[idx] || false;
                  const favicon = getFavicon(result.url);

                  return (
                    <div key={idx} className="relative">
                      <div className="p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {favicon && (
                              <img
                                src={favicon}
                                alt=""
                                className="w-4 h-4 rounded-full flex-shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            )}
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="prose prose-sm dark:prose-invert chat-markdown text-sm font-medium text-black dark:text-white hover:underline line-clamp-1"
                            >
                              {result.title || truncateString(cleanUrl(result.url), 50)}
                            </a>
                          </div>
                          {result.snippet && (
                            <div className="mt-0.5 prose prose-sm dark:prose-invert chat-markdown text-xs text-zinc-600 dark:text-zinc-400 leading-5">
                              {truncateString(result.snippet, 180)}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Separator line - only show if not the last item */}
                      {idx < searchResults.length - 1 && (
                        <div className="absolute bottom-0 left-0 right-0 h-px bg-zinc-200 dark:bg-zinc-700"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-12 px-6 bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-950 dark:to-zinc-900">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-gradient-to-b from-zinc-100 to-zinc-50 shadow-inner dark:from-zinc-800/40 dark:to-zinc-900/60">
              <Search className="h-10 w-10 text-zinc-400 dark:text-zinc-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-zinc-900 dark:text-zinc-100">
              No Results Found
            </h3>
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 w-full max-w-md text-center mb-4 shadow-sm">
              <code className="text-sm font-mono text-zinc-700 dark:text-zinc-300 break-all">
                {query || 'Unknown query'}
              </code>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Try refining your search query for better results
            </p>
          </div>
        )}
      </CardContent>

      <div className="px-4 py-2 h-fit bg-white dark:bg-zinc-900 backdrop-blur-sm border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center gap-4 rounded-b-lg">
        <div className="h-full flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          {!isStreaming && searchResults.length > 0 && (
            <Badge variant="outline" className="h-6 py-0.5">
              <Globe className="h-3 w-3" />
              {searchResults.length} results
            </Badge>
          )}
        </div>

        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {actualToolTimestamp && !isStreaming
            ? formatTimestamp(actualToolTimestamp)
            : actualAssistantTimestamp
              ? formatTimestamp(actualAssistantTimestamp)
              : ''}
        </div>
      </div>
    </Card>
  );
} 