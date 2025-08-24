'use client';

import React, { useState } from 'react';
import { BookOpen, Database, Globe, MessageSquare, Plus, Upload, Search, FileText, Bot, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { KnowledgeBaseEntryForm } from '@/components/knowledge-base/knowledge-base-entry-form';
import { KnowledgeBaseEntryCard } from '@/components/knowledge-base/knowledge-base-entry-card';
import { DocumentUpload } from '@/components/knowledge-base/document-upload';
import { useGlobalKnowledgeBase, useCreateGlobalKnowledgeBaseEntry, useUpdateGlobalKnowledgeBaseEntry, useDeleteGlobalKnowledgeBaseEntry } from '@/hooks/react-query/knowledge-base/use-global-knowledge-base';
import { KnowledgeBaseEntry, CreateKnowledgeBaseEntryRequest } from '@/hooks/react-query/knowledge-base/types';

export default function KnowledgeBasePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeBaseEntry | null>(null);
  const [activeTab, setActiveTab] = useState('global');

  // Hooks for global knowledge base
  const { data: globalKb, isLoading: globalLoading, error: globalError } = useGlobalKnowledgeBase();
  const createGlobalEntry = useCreateGlobalKnowledgeBaseEntry();
  const updateGlobalEntry = useUpdateGlobalKnowledgeBaseEntry();
  const deleteGlobalEntry = useDeleteGlobalKnowledgeBaseEntry();

  // Debug logging
  console.log('Knowledge base data:', globalKb);
  console.log('Loading state:', globalLoading);
  console.log('Error state:', globalError);

  const handleCreateEntry = async (data: CreateKnowledgeBaseEntryRequest) => {
    if (editingEntry) {
      await updateGlobalEntry.mutateAsync({ entryId: editingEntry.entry_id, entryData: data });
    } else {
      await createGlobalEntry.mutateAsync(data);
    }
    setShowCreateDialog(false);
    setEditingEntry(null);
  };

  const handleEditEntry = (entry: KnowledgeBaseEntry) => {
    setEditingEntry(entry);
    setShowCreateDialog(true);
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (confirm('Are you sure you want to delete this knowledge base entry?')) {
      await deleteGlobalEntry.mutateAsync(entryId);
    }
  };

  const filteredGlobalEntries = globalKb?.entries.filter(entry =>
    entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground">
            Manage your global and thread-specific knowledge bases for enhanced AI responses
          </p>
        </div>
        <Button 
          className="flex items-center gap-2"
          onClick={() => {
            setEditingEntry(null);
            setShowCreateDialog(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add Knowledge
        </Button>
      </div>

      {/* Error Display */}
      {globalError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="font-medium">Error loading knowledge base</span>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
            {globalError.message || 'Failed to load knowledge base data. Please try refreshing the page.'}
          </p>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search knowledge base entries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="global" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Global Knowledge Base
          </TabsTrigger>
          <TabsTrigger value="threads" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Thread Knowledge Bases
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-6">
          {/* Global Knowledge Base Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {globalLoading ? '...' : globalKb?.total_count || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {globalKb?.entries.length || 0} active entries
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {globalLoading ? '...' : (globalKb?.total_tokens || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {globalKb?.total_tokens ? `${Math.round(globalKb.total_tokens / 1000)}K tokens` : 'No tokens'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Queries</CardTitle>
                <Bot className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {globalLoading ? '...' : '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  No recent queries
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Global Knowledge Base Entries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Global Knowledge Entries
              </CardTitle>
              <CardDescription>
                Knowledge that's available across all your threads and agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {globalLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-32"></div>
                          <div className="h-3 bg-gray-200 rounded w-48"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredGlobalEntries.length > 0 ? (
                <div className="space-y-4">
                  {filteredGlobalEntries.map((entry) => (
                    <KnowledgeBaseEntryCard
                      key={entry.entry_id}
                      entry={entry}
                      kbType="global"
                      onEdit={handleEditEntry}
                      onDelete={handleDeleteEntry}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No knowledge base entries yet</h3>
                  <p className="text-sm">
                    {searchQuery ? 'No entries match your search.' : 'Create your first knowledge base entry to get started.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="threads" className="space-y-6">
          {/* Thread Knowledge Base Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Threads</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">
                  With knowledge bases
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">42</div>
                <p className="text-xs text-muted-foreground">
                  Across all threads
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                <Bot className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">89</div>
                <p className="text-xs text-muted-foreground">
                  Queries this week
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Thread Knowledge Bases */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Thread Knowledge Bases
              </CardTitle>
              <CardDescription>
                Knowledge specific to individual conversation threads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Sample Thread */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-medium">Project Alpha Discussion</h4>
                      <p className="text-sm text-muted-foreground">
                        3 knowledge entries • Last updated 2 hours ago
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">5.2K tokens</Badge>
                        <span className="text-xs text-muted-foreground">Active</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>

                {/* Another Sample Thread */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                      <MessageSquare className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h4 className="font-medium">Customer Support Thread</h4>
                      <p className="text-sm text-muted-foreground">
                        7 knowledge entries • Last updated 1 day ago
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">12.8K tokens</Badge>
                        <span className="text-xs text-muted-foreground">Active</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Thread Upload Section */}
          <DocumentUpload 
            kbType="thread"
            onUploadComplete={() => {
              // Refresh the knowledge base data after upload
              window.location.reload();
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Upload Section */}
      <DocumentUpload 
        kbType="global"
        onUploadComplete={() => {
          // Refresh the knowledge base data after upload
          window.location.reload();
        }}
      />

      {/* Create/Edit Entry Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? 'Edit Knowledge Base Entry' : 'Create New Knowledge Base Entry'}
            </DialogTitle>
          </DialogHeader>
          <KnowledgeBaseEntryForm
            entry={editingEntry || undefined}
            kbType="global"
            onSubmit={handleCreateEntry}
            onCancel={() => {
              setShowCreateDialog(false);
              setEditingEntry(null);
            }}
            isLoading={createGlobalEntry.isPending || updateGlobalEntry.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
