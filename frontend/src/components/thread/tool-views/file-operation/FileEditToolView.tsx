import React, { useState } from 'react';
import {
  FileDiff,
  AlertTriangle,
  Loader2,
  File,
  Minus,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  extractFileEditData,
  generateLineDiff,
  calculateDiffStats,
  LineDiff,
  DiffStats
} from './_utils';
import { formatTimestamp, getToolTitle } from '../utils';
import { ToolViewProps } from '../types';
import { LoadingState } from '../shared/LoadingState';
import ReactDiffViewer from 'react-diff-viewer-continued';

const UnifiedDiffView: React.FC<{ oldCode: string; newCode: string }> = ({ oldCode, newCode }) => (
  <ReactDiffViewer
    oldValue={oldCode}
    newValue={newCode}
    splitView={false}
    hideLineNumbers={true}
    useDarkTheme={document.documentElement.classList.contains('dark')}
    styles={{
      variables: {
        dark: {
          diffViewerColor: '#e2e8f0',
          diffViewerBackground: '#09090b',
          addedBackground: '#1f2937',
          addedColor: '#e2e8f0',
          removedBackground: '#5c1a2e',
          removedColor: '#fca5a5',
        },
      },
      diffContainer: {
        backgroundColor: 'var(--card)',
        border: 'none',
      },
      diffRemoved: {
        display: 'none',
      },
      line: {
        fontFamily: 'monospace',
      },
    }}
  />
);

const FinalContentView: React.FC<{ content: string }> = ({ content }) => {
  // Function to process content and apply styling
  const processContent = (text: string) => {
    // Split content into lines
    const lines = text.split('\n');
    
    return lines.map((line, index) => {
      // Check if line starts with ** (markdown bold)
      if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
        // Extract the text between **
        const headerText = line.trim().replace(/\*\*/g, '');
        return (
          <div key={index} className="mb-4 mt-4">
            <span className="text-[#E36209]">*</span>
            <span className="text-[#24292E] font-bold">{headerText}</span>
            <span className="text-[#E36209]">*</span>
          </div>
        );
      }
      
      // Check if line starts with # (markdown headers)
      if (line.trim().startsWith('#')) {
        const headerText = line.trim().replace(/^#+\s*/, '');
        return (
          <div key={index} className="mb-4">
            <span className="text-[#E36209]">*</span>
            <span className="text-[#24292E] font-bold">{headerText}</span>
            <span className="text-[#E36209]">*</span>
          </div>
        );
      }
      
      // Check if line starts with a number followed by a dot (numbered headers)
      if (/^\d+\./.test(line.trim())) {
        const headerText = line.trim();
        return (
          <div key={index} className="mb-4">
            <span className="text-[#E36209]">*</span>
            <span className="text-[#24292E] font-bold">{headerText}</span>
            <span className="text-[#E36209]">*</span>
          </div>
        );
      }
      
      // Regular text - check for inline ** bold text
      const processedLine = line.replace(/\*\*(.*?)\*\*/g, (match, boldText) => {
        return `<bold>${boldText}</bold>`;
      });
      
      if (processedLine.includes('<bold>')) {
        const parts = processedLine.split(/(<bold>.*?<\/bold>)/);
        return (
          <div key={index} className="mb-1">
            {parts.map((part, partIndex) => {
              if (part.startsWith('<bold>') && part.endsWith('</bold>')) {
                const boldText = part.replace(/<\/?bold>/g, '');
                return <span key={partIndex} className="font-bold">{boldText}</span>;
              }
              return <span key={partIndex}>{part}</span>;
            })}
          </div>
        );
      }
      
      // Regular text
      return (
        <div key={index} className="mb-1">
          {line}
        </div>
      );
    });
  };

  return (
    <div className="bg-white dark:bg-zinc-950 font-mono text-sm overflow-x-auto p-4">
      <div className="whitespace-pre-wrap break-words text-zinc-700 dark:text-zinc-300">
        {processContent(content)}
      </div>
    </div>
  );
};

const ErrorState: React.FC<{ message?: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center h-full py-12 px-6 bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-950 dark:to-zinc-900">
    <div className="text-center w-full max-w-xs">
      <AlertTriangle className="h-16 w-16 mx-auto mb-6 text-amber-500" />
      <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
        Invalid File Edit
      </h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {message || "Could not extract the file changes from the tool result."}
      </p>
    </div>
  </div>
);

export function FileEditToolView({
  name = 'edit-file',
  assistantContent,
  toolContent,
  assistantTimestamp,
  toolTimestamp,
  isSuccess = true,
  isStreaming = false,
}: ToolViewProps): JSX.Element {
  const [viewMode, setViewMode] = useState<'unified' | 'final'>('final');

  const {
    filePath,
    originalContent,
    updatedContent,
    actualIsSuccess,
    actualToolTimestamp,
    errorMessage,
  } = extractFileEditData(
    assistantContent,
    toolContent,
    isSuccess,
    toolTimestamp,
    assistantTimestamp
  );

  const toolTitle = getToolTitle(name);

  const lineDiff = originalContent && updatedContent ? generateLineDiff(originalContent, updatedContent) : [];
  const stats: DiffStats = calculateDiffStats(lineDiff);

  const shouldShowError = !isStreaming && (!actualIsSuccess || (actualIsSuccess && (originalContent === null || updatedContent === null)));

  return (
    <Card className="gap-0 flex border shadow-none p-0 rounded-lg flex-col h-full overflow-hidden bg-card">
      <CardHeader className="h-9 w-full flex items-center bg-gradient-to-t from-zinc-50/80 to-zinc-200/70 dark:from-zinc-900/90 dark:to-zinc-800/90 text-center backdrop-blur-lg border-b p-2 px-4 rounded-t-lg">
        <div className="flex mt-4 h-full items-center w-full justify-center gap-1">
          <FileDiff className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            {toolTitle}
          </CardTitle>
        </div>

        {/* {!isStreaming && (
          <Badge
            variant="secondary"
            className={
              actualIsSuccess
                ? "bg-white/60 text-emerald-700 border-white/50 mt-4"
                : "bg-white/60 text-rose-700 border-white/50 mt-4"
            }
          >
            {actualIsSuccess ? (
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            )}
            {actualIsSuccess ? 'Edit applied' : 'Edit failed'}
          </Badge>
        )} */}
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col min-h-0">
        {isStreaming && !updatedContent ? (
          <LoadingState
            icon={FileDiff}
            iconColor="text-blue-500 dark:text-blue-400"
            bgColor="bg-gradient-to-b from-blue-100 to-blue-50 shadow-inner dark:from-blue-800/40 dark:to-blue-900/60 dark:shadow-blue-950/20"
            title="Applying File Edit"
            filePath={filePath || 'Processing file...'}
            progressText="Analyzing changes"
            subtitle="Please wait while the file is being modified"
          />
        ) : shouldShowError ? (
          <ErrorState message={errorMessage} />
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="shrink-0 p-2 py-1 border-b border-zinc-200 dark:border-zinc-800 bg-accent flex items-center justify-between">
              <div className="flex items-center">
                <File className="h-4 w-4 mr-2 text-zinc-500 dark:text-zinc-400" />
                <code className="text-sm font-mono text-zinc-700 dark:text-zinc-300">
                  {filePath || 'Unknown file'}
                </code>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center text-xs text-zinc-500 dark:text-zinc-400 gap-3">
                  {stats.additions === 0 && stats.deletions === 0 ? (
                    <Badge variant="outline" className="text-xs font-normal">No changes</Badge>
                  ) : (
                    <>
                      <div className="flex items-center">
                        <Plus className="h-3.5 w-3.5 text-emerald-500 mr-1" />
                        <span>{stats.additions}</span>
                      </div>
                      <div className="flex items-center">
                        <Minus className="h-3.5 w-3.5 text-red-500 mr-1" />
                        <span>{stats.deletions}</span>
                      </div>
                    </>
                  )}
                </div>
                {isStreaming && (
                  <Badge className="bg-blue-500/90 text-white border-none shadow-lg animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Streaming...
                  </Badge>
                )}
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'unified' | 'final')} className="w-auto">
                  <TabsList className="h-7 p-0.5">
                    <TabsTrigger value="final" className="text-xs h-6 px-2">Final</TabsTrigger>
                    <TabsTrigger value="unified" className="text-xs h-6 px-2">Unified</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
            <div className="flex-1 overflow-auto min-h-0">
              {viewMode === 'final' ? (
                <FinalContentView content={updatedContent || originalContent || ''} />
              ) : (
                <UnifiedDiffView oldCode={originalContent!} newCode={updatedContent!} />
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}