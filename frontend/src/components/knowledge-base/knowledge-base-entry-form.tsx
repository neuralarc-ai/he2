'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Save, X } from 'lucide-react';
import { KnowledgeBaseEntry, CreateKnowledgeBaseEntryRequest } from '@/hooks/react-query/knowledge-base/types';

interface KnowledgeBaseEntryFormProps {
  entry?: KnowledgeBaseEntry;
  kbType: 'global' | 'thread' | 'agent';
  threadId?: string;
  agentId?: string;
  onSubmit: (data: CreateKnowledgeBaseEntryRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function KnowledgeBaseEntryForm({
  entry,
  kbType,
  threadId,
  agentId,
  onSubmit,
  onCancel,
  isLoading = false
}: KnowledgeBaseEntryFormProps) {
  const [formData, setFormData] = useState<CreateKnowledgeBaseEntryRequest>({
    name: '',
    description: '',
    content: '',
    usage_context: 'always'
  });

  useEffect(() => {
    if (entry) {
      setFormData({
        name: entry.name,
        description: entry.description || '',
        content: entry.content,
        usage_context: entry.usage_context
      });
    }
  }, [entry]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: keyof CreateKnowledgeBaseEntryRequest, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getTitle = () => {
    if (entry) {
      return 'Edit Knowledge Base Entry';
    }
    
    switch (kbType) {
      case 'global':
        return 'Create Global Knowledge Entry';
      case 'thread':
        return 'Create Thread Knowledge Entry';
      case 'agent':
        return 'Create Agent Knowledge Entry';
      default:
        return 'Create Knowledge Entry';
    }
  };

  const getDescription = () => {
    if (entry) {
      return 'Update the knowledge base entry information below.';
    }
    
    switch (kbType) {
      case 'global':
        return 'This knowledge will be available across all your threads and agents.';
      case 'thread':
        return 'This knowledge will be specific to the current thread.';
      case 'agent':
        return 'This knowledge will be specific to the selected agent.';
      default:
        return 'Create a new knowledge base entry.';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          {getTitle()}
        </CardTitle>
        <CardDescription>
          {getDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter a descriptive name for this knowledge"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Optional description of what this knowledge contains"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="Enter the knowledge content here..."
              rows={8}
              required
            />
            <p className="text-sm text-muted-foreground">
              This content will be used to provide context to AI responses.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="usage_context">Usage Context</Label>
            <Select
              value={formData.usage_context}
              onValueChange={(value) => handleInputChange('usage_context', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="always">Always - Include in every response</SelectItem>
                <SelectItem value="contextual">Contextual - Include when relevant</SelectItem>
                <SelectItem value="on_request">On Request - Include only when asked</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Controls when this knowledge is automatically included in AI responses.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.name.trim() || !formData.content.trim()}
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : entry ? 'Update Entry' : 'Create Entry'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
