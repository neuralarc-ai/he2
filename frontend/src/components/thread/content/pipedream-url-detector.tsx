import React from 'react';
import { Markdown } from '@/components/ui/markdown';
import { PipedreamConnectButton } from './pipedream-connect-button';

import { Components } from 'react-markdown';

interface PipedreamUrlDetectorProps {
  content: string;
  className?: string;
  components?: Partial<Components>;
}

interface PipedreamUrl {
  url: string;
  appSlug: string | null;
  startIndex: number;
  endIndex: number;
}

function extractAppSlugFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'pipedream.com' && urlObj.pathname === '/_static/connect.html') {
      const params = new URLSearchParams(urlObj.search);
      return params.get('app');
    }
  } catch (e) {
  }
  return null;
}

function detectPipedreamUrls(content: string): PipedreamUrl[] {
  const pipedreamUrlRegex = /https:\/\/pipedream\.com\/_static\/connect\.html\?[^\s)]+/g;
  const urls: PipedreamUrl[] = [];
  let match;

  while ((match = pipedreamUrlRegex.exec(content)) !== null) {
    const url = match[0];
    const appSlug = extractAppSlugFromUrl(url);
    
    urls.push({
      url,
      appSlug,
      startIndex: match.index,
      endIndex: match.index + url.length
    });
  }

  return urls;
}

function hasConnectionLinkPattern(content: string, url: PipedreamUrl): boolean {
  const beforeUrl = content.substring(Math.max(0, url.startIndex - 50), url.startIndex);
  return /Connection\s+Link:\s*$/i.test(beforeUrl);
}

export function PipedreamUrlDetector({
  content,
  className,
  components,
}: PipedreamUrlDetectorProps) {
  const pipedreamUrls = detectPipedreamUrls(content);

    if (pipedreamUrls.length === 0) {
    return (
      <Markdown className={className} components={components}>
        {content}
      </Markdown>
    );
  }

  const contentParts: React.ReactNode[] = [];
  let lastIndex = 0;

  pipedreamUrls.forEach((pipedreamUrl, index) => {
    if (pipedreamUrl.startIndex > lastIndex) {
      const textBefore = content.substring(lastIndex, pipedreamUrl.startIndex);
      
      const cleanedTextBefore = hasConnectionLinkPattern(content, pipedreamUrl)
        ? textBefore.replace(/Connection\s+Link:\s*$/i, '').trim()
        : textBefore;

      if (cleanedTextBefore.trim()) {
        contentParts.push(
          <Markdown key={`text-${index}`} className={className} components={components}>
            {cleanedTextBefore}
          </Markdown>
        );
      }
    }

    contentParts.push(
      <PipedreamConnectButton
        key={`pipedream-${index}`}
        url={pipedreamUrl.url}
        appSlug={pipedreamUrl.appSlug || undefined}
      />
    );

    lastIndex = pipedreamUrl.endIndex;
  });

  if (lastIndex < content.length) {
    const remainingText = content.substring(lastIndex);
    if (remainingText.trim()) {
      contentParts.push(
        <Markdown key="text-end" className={className} components={components}>
          {remainingText}
        </Markdown>
      );
    }
  }

  return <>{contentParts}</>;
}; 