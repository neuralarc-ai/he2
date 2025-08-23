'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, Brain, CircleDashed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PipedreamUrlDetector } from './pipedream-url-detector';

interface ThinkingAccordionProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
  streamingContent?: string; // Add streaming content prop
  streamHookStatus?: string; // Add stream status prop
}

export const ThinkingAccordion: React.FC<ThinkingAccordionProps> = ({
  content,
  isStreaming = false,
  className,
  streamingContent = '',
  streamHookStatus = 'idle',
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [displayedContent, setDisplayedContent] = useState('');
  const [isStreamingContent, setIsStreamingContent] = useState(false);
  const [hasFinishedThinking, setHasFinishedThinking] = useState(false);
  const [hasBeenAutoClosed, setHasBeenAutoClosed] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const prevStreamingContentRef = useRef<string>('');
  const prevIsStreamingRef = useRef<boolean>(false);
  const prevStreamHookStatusRef = useRef<string>('idle');

  // Function to clean thinking content by removing XML tags
  const cleanThinkingContent = (rawContent: string): string => {
    if (!rawContent) return '';
    
    // Remove <think> opening tag
    let cleaned = rawContent.replace(/<think[^>]*>/gi, '');
    
    // Remove </think> closing tag
    cleaned = cleaned.replace(/<\/think>/gi, '');
    
    // Remove any remaining XML attributes or tags
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    
    return cleaned.trim();
  };

  // Function to detect if thinking has finished
  const hasThinkingFinished = (content: string): boolean => {
    return content.includes('</think>');
  };

  // Handle streaming content
  useEffect(() => {
    const isCurrentlyStreaming = (isStreaming || streamHookStatus === 'streaming') && streamingContent;
    const wasStreaming = prevStreamingContentRef.current && prevStreamingContentRef.current !== streamingContent;
    const wasStreamingStatus = prevIsStreamingRef.current && !isStreaming;
    const wasStreamHookStreaming = prevStreamHookStatusRef.current === 'streaming' && streamHookStatus !== 'streaming';
    
    // Check if thinking has finished in the current content
    const thinkingFinished = hasThinkingFinished(streamingContent);
    
    if (isCurrentlyStreaming && !thinkingFinished && !hasBeenAutoClosed) {
      // Thinking is currently streaming and hasn't been auto-closed yet
      setIsStreamingContent(true);
      setIsOpen(true);
      setHasFinishedThinking(false);
      setDisplayedContent(streamingContent);
    } else if (thinkingFinished || (wasStreaming || wasStreamingStatus || wasStreamHookStreaming) && !isCurrentlyStreaming) {
      // Thinking just finished - auto-close after a brief delay
      setIsStreamingContent(false);
      setHasFinishedThinking(true);
      setHasBeenAutoClosed(true);
      setTimeout(() => {
        setIsOpen(false);
      }, 1000); // Auto-close after 1 second
    } else if (content && !isCurrentlyStreaming && !hasBeenAutoClosed) {
      // Static content (not streaming) and hasn't been auto-closed
      setDisplayedContent(content);
      setIsStreamingContent(false);
    }
    
    // Update previous references
    prevStreamingContentRef.current = streamingContent;
    prevIsStreamingRef.current = isStreaming;
    prevStreamHookStatusRef.current = streamHookStatus;
  }, [content, streamingContent, streamHookStatus, isStreaming, hasBeenAutoClosed]);

  // Update line height when content changes
  useEffect(() => {
    if (contentRef.current) {
      const contentHeight = contentRef.current.scrollHeight;
      // Update any parent container if needed
    }
  }, [displayedContent, isOpen]);

  const toggleAccordion = () => {
    // Only allow manual toggle if it hasn't been auto-closed
    if (hasBeenAutoClosed) {
      setIsOpen(!isOpen);
    } else {
      setIsOpen(!isOpen);
    }
  };

  // Check if we should show streaming content
  const shouldShowStreaming = isStreamingContent && !hasFinishedThinking;
  const finalContent = shouldShowStreaming ? streamingContent : displayedContent;
  
  // Clean the content to remove XML tags
  const cleanContent = cleanThinkingContent(finalContent);

  return (
    <div className={cn('my-4', className)}>
      {/* Accordion Trigger */}
      <button
        onClick={toggleAccordion}
        className="flex items-center gap-1 w-full text-left cursor-pointer"
      >
        <span className="font-medium text-base text-helium-teal chat-markdown">Thinking</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-helium-teal" />
        ) : (
          <ChevronDown className="h-4 w-4 text-helium-teal" />
        )}
      </button>

      {/* Accordion Content */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-100 ease-in-out',
          isOpen ? 'max-h-screen opacity-100 pt-2' : 'max-h-0 opacity-0'
        )}
      >
        <div className="relative mt-2">
          
          {/* Content with left padding for the line */}
          <div
            ref={contentRef}
            className="ml-1 pl-6 pr-4 mb-2 rounded-r-lg border-l-2 border-l-helium-teal/80 relative"
          >
            {/* Top diamond at the start of the border */}
            <div className="absolute left-0 top-0 transform -translate-x-[5px] -translate-y-1/2">
              <div className="w-2 h-2 rounded-full bg-helium-teal rotate-45"></div>
            </div>
            
            {/* Bottom diamond at the end of the border */}
            <div className="absolute left-0 bottom-0 transform -translate-x-[5px] translate-y-1/2">
              <div className="w-2 h-2 rounded-full bg-helium-teal rotate-45"></div>
            </div>
            
            {shouldShowStreaming ? (
              // Show streaming content with real-time updates
              <div className="space-y-3">
                <div className="text-xs italic leading-relaxed prose prose-xs dark:prose-invert max-w-none break-words [&>:first-child]:mt-0 [&>ul]:list-none [&>ul]:pl-0 [&>li]:before:content-none [&>li]:pl-0 [&>ol]:list-none [&>ol]:pl-0 [&>*]:mb-2 [&>*:last-child]:mb-0">
                  {cleanContent.split('\n').map((paragraph, index) => (
                    paragraph.trim() && (
                      <p key={index} className="text-xs leading-relaxed">
                        {paragraph.trim()}
                      </p>
                    )
                  ))}
                </div>
                
                {/* Streaming indicator */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-helium-teal rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1 h-1 bg-helium-teal rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1 h-1 bg-helium-teal rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            ) : (
              // Show static content
              <div className="text-xs italic leading-relaxed prose prose-xs dark:prose-invert max-w-none break-words [&>:first-child]:mt-0 [&>ul]:list-none [&>ul]:pl-0 [&>li]:before:content-none [&>li]:pl-0 [&>ol]:list-none [&>ol]:pl-0 [&>*]:mb-2 [&>*:last-child]:mb-0">
                {cleanContent.split('\n').map((paragraph, index) => (
                  paragraph.trim() && (
                    <p key={index} className="text-xs italic leading-relaxed">
                      {paragraph.trim()}
                    </p>
                  )
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
