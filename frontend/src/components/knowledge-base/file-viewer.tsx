import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText, Download, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface FileViewerProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  fileId?: string;
  kbType: 'global' | 'agent' | 'thread';
  agentId?: string;
  threadId?: string;
}

interface FileContent {
  content: string;
  contentType: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
}

export function FileViewer({
  isOpen,
  onClose,
  fileName,
  fileId,
  kbType,
  agentId,
  threadId,
}: FileViewerProps) {
  const [content, setContent] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && fileId) {
      fetchFileContent();
    }
  }, [isOpen, fileId]);

  const fetchFileContent = async () => {
    if (!fileId) return;
    
    setLoading(true);
    try {
      console.log('Fetching file content for:', { fileId, kbType, agentId, threadId });
      
      const response = await fetch(`/api/knowledge-base/debug-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          kbType,
          agentId,
          threadId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response not ok:', response.status, errorText);
        throw new Error(`Failed to fetch file content: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('Received file content data:', data);
      
      // Check if we have actual content
      const hasContent = typeof data?.content === 'string' && data.content.length > 0;
      const contentFoundFlag = data?.debug?.contentFound === true;
      
      // Only show error if content is truly missing
      if (!hasContent && !contentFoundFlag) {
        console.log('Debug information received:', data.debug);
        toast.error('No content found. Check console for debug info.');
      }
      
      setContent(data);
    } catch (error) {
      console.error('Error fetching file content:', error);
      toast.error('Failed to load file content');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!content) return;
    
    try {
      await navigator.clipboard.writeText(content.content);
      setCopied(true);
      toast.success('Content copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy content');
    }
  };

  const downloadFile = () => {
    if (!content) return;
    
    const blob = new Blob([content.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = content.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderContent = () => {
    if (!content) return null;

    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    
    // For CSV files, render as a table
    if (fileExtension === 'csv') {
      const lines = content.content.split('\n');
      const headers = lines[0]?.split(',') || [];
      const data = lines.slice(1).filter(line => line.trim());
      
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">
                {content.fileSize} bytes • {new Date(content.uploadedAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={downloadFile}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <ScrollArea className="h-[400px] border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {headers.map((header, index) => (
                    <th key={index} className="px-3 py-2 text-left font-medium">
                      {header.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, rowIndex) => {
                  const cells = row.split(',');
                  return (
                    <tr key={rowIndex} className="border-t">
                      {cells.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-3 py-2">
                          {cell.trim()}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      );
    }

    // For JSON files, pretty print
    if (fileExtension === 'json') {
      try {
        const parsed = JSON.parse(content.content);
        const formatted = JSON.stringify(parsed, null, 2);
        
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm text-muted-foreground">
                  {content.fileSize} bytes • {new Date(content.uploadedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm" onClick={downloadFile}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <ScrollArea className="h-[400px] border rounded-md">
              <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
                {formatted}
              </pre>
            </ScrollArea>
          </div>
        );
      } catch (error) {
        // Fallback to plain text if JSON parsing fails
      }
    }

    // For text files, render as plain text
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="text-sm text-muted-foreground">
              {content.fileSize} bytes • {new Date(content.uploadedAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={downloadFile}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="h-[400px] border rounded-md">
          <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
            {content.content}
          </pre>
        </ScrollArea>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {fileName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading file content...</span>
            </div>
          ) : content ? (
            renderContent()
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              No content available
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
