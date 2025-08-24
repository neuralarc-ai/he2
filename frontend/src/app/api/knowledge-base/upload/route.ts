import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Upload endpoint called');
    
    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const kbType = formData.get('kb_type') as string;
    const threadId = formData.get('thread_id') as string;
    const agentId = formData.get('agent_id') as string;

    console.log('Form data received:', { file: file?.name, kbType, threadId, agentId });

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!kbType) {
      return NextResponse.json(
        { error: 'Knowledge base type is required' },
        { status: 400 }
      );
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds the maximum limit of 50MB` },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'application/json'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} is not supported. Allowed types: PDF, CSV, DOC, TXT, MD, JSON` },
        { status: 400 }
      );
    }

    // Get user authentication
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the JWT token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.access_token) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 401 }
      );
    }

    // Forward the request to the backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    console.log('Uploading file:', {
      filename: file.name,
      size: file.size,
      type: file.type,
      kbType,
      threadId,
      agentId,
      backendUrl
    });
    
    const backendFormData = new FormData();
    backendFormData.append('file', file);
    backendFormData.append('kb_type', kbType);
    if (threadId) backendFormData.append('thread_id', threadId);
    if (agentId) backendFormData.append('agent_id', agentId);
    // Add JWT token as form field for backend authentication
    backendFormData.append('auth_token', session.access_token);

    // Since NEXT_PUBLIC_BACKEND_URL already includes /api, we just need to add the knowledge-base path
    const uploadUrl = `${backendUrl}/knowledge-base/upload`;
    console.log('Sending request to backend:', uploadUrl);
    
    const backendResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: backendFormData,
    });
    
    console.log('Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      console.error('Backend upload failed:', {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        errorData
      });
      return NextResponse.json(
        { error: errorData.detail || 'Upload failed' },
        { status: backendResponse.status }
      );
    }

    const result = await backendResponse.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Upload error:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
