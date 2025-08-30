'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface GeneratedPrompt {
  id: number;
  content: string;
}


export default function PromptLibraryPage() {
  const [role, setRole] = useState('');
  const [task, setTask] = useState('');
  const [prompts, setPrompts] = useState<GeneratedPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const generatePrompts = async () => {
    if (!role.trim() || !task.trim()) {
      toast.error('Please fill in both role and task fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/generate-prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role, task }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate prompts');
      }

      const data = await response.json();
      setPrompts(data.prompts);
      toast.success('Prompts generated successfully!');
    } catch (error) {
      console.error('Error generating prompts:', error);
      toast.error('Failed to generate prompts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (content: string, id: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      toast.success('Prompt copied to clipboard!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error('Failed to copy prompt');
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Prompt Library</h1>
        <p className="text-muted-foreground">
          Generate customized prompts based on your role and specific tasks using AI.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Generate Prompts</CardTitle>
          <CardDescription>
            Enter your role and the task you need help with to generate 5 distinct prompts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                placeholder="e.g., Senior Cloud Architect, Marketing Specialist, Data Scientist"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task">Task</Label>
              <Input
                id="task"
                placeholder="e.g., Microservices migration, Campaign optimization, Data analysis"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
          <Button 
            onClick={generatePrompts} 
            disabled={isLoading || !role.trim() || !task.trim()}
            className="w-full md:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Prompts...
              </>
            ) : (
              'Generate Prompts'
            )}
          </Button>
        </CardContent>
      </Card>

      {prompts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold mb-4">Generated Prompts</h2>
          {prompts.map((prompt) => (
            <Card key={prompt.id} className="relative">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start gap-4">
                  <Textarea
                    value={prompt.content}
                    readOnly
                    className="min-h-[120px] resize-none border-none p-0 focus-visible:ring-0 bg-transparent"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(prompt.content, prompt.id)}
                    className="shrink-0"
                  >
                    {copiedId === prompt.id ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {prompts.length === 0 && !isLoading && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">
              Enter your role and task above to generate customized prompts.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
