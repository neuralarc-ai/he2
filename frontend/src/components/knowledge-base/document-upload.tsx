'use client';

import React, { useState, useCallback } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { uploadKbFile } from '@/lib/storage/uploadKbFile';
import { createClient } from '@/lib/supabase/client';

interface DocumentUploadProps {
  kbType: 'global' | 'thread' | 'agent';
  threadId?: string;
  agentId?: string;
  accountId?: string; // required for inserting into KB tables
  onUploadComplete?: () => void;
  className?: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  file?: File;
}

const SUPPORTED_FORMATS = [
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown',
  'application/json'
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function DocumentUpload({ 
  kbType, 
  threadId, 
  agentId, 
  accountId,
  onUploadComplete,
  className 
}: DocumentUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();

  const validateFile = (file: File): string | null => {
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      return `File type ${file.type} is not supported. Please upload PDF, CSV, DOC, TXT, MD, or JSON files.`;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds the maximum limit of 50MB.`;
    }
    
    return null;
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const newFiles: UploadedFile[] = Array.from(files).map(file => {
      const error = validateFile(file);
      return {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        status: error ? 'failed' : 'uploading',
        progress: 0,
        error,
        file
      };
    });

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Upload valid files
    newFiles.forEach(fileInfo => {
      if (!fileInfo.error) {
        uploadFile(fileInfo);
      }
    });
  }, []);

  const uploadFile = async (fileInfo: UploadedFile) => {
    try {
      // Simulate file upload progress
      const progressInterval = setInterval(() => {
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileInfo.id 
              ? { ...f, progress: Math.min(f.progress + 10, 90) }
              : f
          )
        );
      }, 200);

      if (!fileInfo.file) {
        throw new Error('Missing File object for upload');
      }

      // Determine folder based on context
      const folderBase =
        kbType === 'thread' && threadId ? `threads/${threadId}` :
        kbType === 'agent' && agentId ? `agents/${agentId}` :
        'global';

      // Allow all currently supported extensions
      const allowedExt = ['pdf', 'csv', 'doc', 'docx', 'txt', 'md', 'json'];

      // Perform Supabase Storage upload
      const uploadResult = await uploadKbFile(fileInfo.file, {
        bucket: 'knowledge-base',
        folder: `${folderBase}`,
        upsert: false,
        allowedExt,
      });

      clearInterval(progressInterval);

      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === fileInfo.id 
            ? { ...f, status: 'processing', progress: 100 }
            : f
        )
      );

      // Persist a KB entry in the appropriate table
      const supabase = createClient();
      const source_metadata = {
        storage_bucket: 'knowledge-base',
        storage_path: uploadResult.path,
        public_url: uploadResult.publicUrl,
        content_type: uploadResult.contentType,
      };

      const baseEntry = {
        name: fileInfo.name,
        description: `Uploaded file stored at ${uploadResult.path}`,
        content: '',
        usage_context: 'always',
        source_metadata,
      };

      // Resolve accountId if not provided via props
      let effectiveAccountId = accountId;
      if (!effectiveAccountId) {
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr || !authData?.user) {
          throw new Error('Authentication required to resolve accountId');
        }
        // Try resolving from members table first
        const { data: member, error: memberErr } = await supabase
          .from('basejump.members')
          .select('account_id')
          .eq('user_id', authData.user.id)
          .limit(1)
          .maybeSingle();
        if (member && member.account_id) {
          effectiveAccountId = member.account_id as unknown as string;
        } else {
          // Fallback to RPC get_accounts and take the first account
          const { data: accounts, error: accountsErr } = await supabase.rpc('get_accounts');
          if (accountsErr || !accounts || accounts.length === 0) {
            throw new Error('Unable to resolve accountId for current user');
          }
          effectiveAccountId = accounts[0]?.id as string;
        }
      }

      const tableName =
        kbType === 'thread' ? 'thread_knowledge_base' :
        kbType === 'agent' ? 'agent_knowledge_base' :
        'global_knowledge_base';

      const payload: Record<string, any> = {
        ...baseEntry,
        account_id: effectiveAccountId,
      };

      if (kbType === 'thread') {
        if (!threadId) throw new Error('threadId is required for thread knowledge uploads');
        payload.thread_id = threadId;
      }

      if (kbType === 'agent') {
        if (!agentId) throw new Error('agentId is required for agent knowledge uploads');
        payload.agent_id = agentId;
      }

      let insertErrorMsg: string | null = null;
      const { error: insertError } = await supabase.from(tableName).insert(payload);
      if (insertError) {
        insertErrorMsg = insertError.message;
      }

      if (insertErrorMsg) {
        // Fallback: use server route with service role to bypass RLS safely
        const res = await fetch('/api/knowledge-base/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: tableName, payload }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(`Failed to save knowledge entry: ${err.error || res.statusText}`);
        }
      }

      // Simulate processing completion
      setTimeout(() => {
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileInfo.id 
              ? { ...f, status: 'completed' }
              : f
          )
        );
        onUploadComplete?.();
        
        toast({
          title: "Upload successful",
          description: `${fileInfo.name} has been uploaded and saved to knowledge base.`,
        });
      }, 1500);

    } catch (error) {
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === fileInfo.id 
            ? { ...f, status: 'failed', error: error instanceof Error ? error.message : 'Upload failed' }
            : f
        )
      );

      toast({
        title: "Upload failed",
        description: `Failed to upload ${fileInfo.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={className}>
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Documents
          </CardTitle>
          <CardDescription>
            Upload PDFs, CSVs, documents, and other files to enhance your {kbType} knowledge base
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              handleFileSelect(e.dataTransfer.files);
            }}
          >
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Upload your documents</h3>
            <p className="text-muted-foreground mb-4">
              Drag and drop files here, or click to browse. Supported formats: PDF, CSV, DOC, TXT, MD, JSON
            </p>
            <Button 
              variant="outline"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              Choose Files
            </Button>
            <input
              id="file-input"
              type="file"
              multiple
              accept=".pdf,.csv,.doc,.docx,.txt,.md,.json"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>

          {/* File List */}
          {uploadedFiles.length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="font-medium">Uploaded Files</h4>
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(file.status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <Badge variant="secondary" className={getStatusColor(file.status)}>
                          {file.status}
                        </Badge>
                      </div>
                      {file.error && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          {file.error}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {file.status === 'uploading' && (
                      <Progress value={file.progress} className="w-20" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
