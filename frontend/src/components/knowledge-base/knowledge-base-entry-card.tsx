'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BookOpen, 
  Edit2, 
  Trash2, 
  Settings, 
  Clock, 
  FileText,
  Globe,
  MessageSquare,
  Bot,
  Eye
} from 'lucide-react';
import { KnowledgeBaseEntry } from '@/hooks/react-query/knowledge-base/types';
import { cn } from '@/lib/utils';

interface KnowledgeBaseEntryCardProps {
  entry: KnowledgeBaseEntry;
  kbType: 'global' | 'thread' | 'agent';
  onEdit?: (entry: KnowledgeBaseEntry) => void;
  onDelete?: (entryId: string) => void;
  onSettings?: (entry: KnowledgeBaseEntry) => void;
  onView?: (entry: KnowledgeBaseEntry) => void;
  className?: string;
}

export function KnowledgeBaseEntryCard({
  entry,
  kbType,
  onEdit,
  onDelete,
  onSettings,
  onView,
  className
}: KnowledgeBaseEntryCardProps) {
  const getIcon = () => {
    switch (kbType) {
      case 'global':
        return <Globe className="h-4 w-4" />;
      case 'thread':
        return <MessageSquare className="h-4 w-4" />;
      case 'agent':
        return <Bot className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getIconBgColor = () => {
    switch (kbType) {
      case 'global':
        return 'bg-blue-100 dark:bg-blue-900';
      case 'thread':
        return 'bg-purple-100 dark:bg-purple-900';
      case 'agent':
        return 'bg-green-100 dark:bg-green-900';
      default:
        return 'bg-gray-100 dark:bg-gray-900';
    }
  };

  const getIconTextColor = () => {
    switch (kbType) {
      case 'global':
        return 'text-blue-600 dark:text-blue-400';
      case 'thread':
        return 'text-purple-600 dark:text-purple-400';
      case 'agent':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getUsageContextColor = () => {
    switch (entry.usage_context) {
      case 'always':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'contextual':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'on_request':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    }
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '...';
  };

  return (
    <Card 
      className={cn('hover:shadow-md transition-shadow cursor-pointer', className)}
      onClick={() => onView?.(entry)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', getIconBgColor())}>
              <div className={cn(getIconTextColor())}>
                {getIcon()}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold truncate">
                {entry.name}
              </CardTitle>
              {entry.description && (
                <CardDescription className="text-sm text-muted-foreground line-clamp-2">
                  {entry.description}
                </CardDescription>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {onView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onView(entry);
                }}
                className="h-8 w-8 p-0"
                title="View content"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {onSettings && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSettings(entry);
                }}
                className="h-8 w-8 p-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(entry);
                }}
                className="h-8 w-8 p-0"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(entry.entry_id);
                }}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Content Preview */}
          <div className="text-sm text-muted-foreground">
            <p className="line-clamp-3">
              {truncateContent(entry.content, 200)}
            </p>
          </div>
          
          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatDate(entry.updated_at)}</span>
              </div>
              
              {entry.content_tokens && (
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  <span>{entry.content_tokens.toLocaleString()} tokens</span>
                </div>
              )}
            </div>
            
            <Badge 
              variant="secondary" 
              className={cn('text-xs', getUsageContextColor())}
            >
              {entry.usage_context}
            </Badge>
          </div>
          
          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-2 h-2 rounded-full',
                entry.is_active 
                  ? 'bg-green-500' 
                  : 'bg-gray-400'
              )} />
              <span className="text-xs text-muted-foreground">
                {entry.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            {entry.source_type && entry.source_type !== 'manual' && (
              <Badge variant="outline" className="text-xs">
                {entry.source_type}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
