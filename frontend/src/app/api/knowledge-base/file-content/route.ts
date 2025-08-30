import { NextRequest, NextResponse } from 'next/server';
import { createAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileId, kbType, agentId, threadId } = body as {
      fileId: string;
      kbType: 'global' | 'agent' | 'thread';
      agentId?: string;
      threadId?: string;
    };

    console.log('File content API called with:', { fileId, kbType, agentId, threadId });

    if (!fileId || !kbType) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get user session
    const supabaseServer = await createClient();
    const { data: userRes, error: userErr } = await supabaseServer.auth.getUser();
    
    if (userErr || !userRes?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Try with regular client first
    const supabase = await createClient();

    // Determine the table name based on kbType
    const tableName = 
      kbType === 'thread' ? 'thread_knowledge_base' :
      kbType === 'agent' ? 'agent_knowledge_base_entries' :
      'global_knowledge_base';

    console.log('Using table name:', tableName);

    // Build the query - try both 'id' and 'entry_id' fields
    let query = supabase
      .from(tableName)
      .select('*')
      .eq('id', fileId);

    // Add additional filters based on kbType
    if (kbType === 'thread' && threadId) {
      query = query.eq('thread_id', threadId);
    } else if (kbType === 'agent' && agentId) {
      query = query.eq('agent_id', agentId);
    }

    let { data: entries, error } = await query;

    // If no data found with 'id', try with 'entry_id'
    if ((!entries || entries.length === 0) && !error) {
      console.log('No data found with id field, trying entry_id field...');
      query = supabase
        .from(tableName)
        .select('*')
        .eq('entry_id', fileId);
      
      if (kbType === 'thread' && threadId) {
        query = query.eq('thread_id', threadId);
      } else if (kbType === 'agent' && agentId) {
        query = query.eq('agent_id', agentId);
      }
      
      const entryIdResult = await query;
      entries = entryIdResult.data as any[] | null;
      error = entryIdResult.error;
      console.log('entry_id query result:', { entries, error });
    }

    // If still no data found, try without any filters (for debugging)
    if ((!entries || entries.length === 0) && !error) {
      console.log('No data found with filters, trying to get all entries...');
      const allEntriesResult = await supabase
        .from(tableName)
        .select('*')
        .limit(5);
      
      console.log('All entries in table:', allEntriesResult.data);
      
      // Try to find the entry by matching the fileId with any field
      if (allEntriesResult.data) {
        const matchingEntry = (allEntriesResult.data as any[]).find(entry => 
          entry.id === fileId || 
          entry.entry_id === fileId ||
          entry.name === fileId
        );
        
        if (matchingEntry) {
          console.log('Found matching entry:', matchingEntry);
          entries = [matchingEntry];
        }
      }
    }

    // If still no data found, try with admin client
    if ((!entries || entries.length === 0) && !error) {
      console.log('No data found with regular client, trying admin client...');
      const admin = createAdmin();
      
      // Try with 'id' field first
      let adminQuery = admin
        .from(tableName)
        .select('*')
        .eq('id', fileId);
      
      const adminResult = await adminQuery;
      entries = adminResult.data as any[] | null;
      error = adminResult.error;
      
      // If still no data, try with 'entry_id' field
      if ((!entries || entries.length === 0) && !error) {
        console.log('Admin client: trying entry_id field...');
        adminQuery = admin
          .from(tableName)
          .select('*')
          .eq('entry_id', fileId);
        
        const adminEntryIdResult = await adminQuery;
        entries = adminEntryIdResult.data as any[] | null;
        error = adminEntryIdResult.error;
      }
      
      console.log('Admin client result:', { entries, error });
    }

    console.log('Query result:', { entries, error, tableName });

    if (error) {
      console.error('Error fetching file content:', error);
      return NextResponse.json(
        { error: 'Failed to fetch file content' },
        { status: 500 }
      );
    }

    if (!entries || entries.length === 0) {
      console.log('No entries found for fileId:', fileId);
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const entry = (entries as any[])[0];

    console.log('Found entry:', entry);

    // Extract content from the entry - try multiple possible fields
    let content = '';
    let fileName = 'Unknown file';
    
    // Try different possible content fields
    if (entry.content) {
      content = entry.content;
    } else if (entry.file_content) {
      content = entry.file_content;
    } else if (entry.data) {
      content = entry.data;
    } else if (entry.text) {
      content = entry.text;
    }
    
    // Try different possible name fields
    if (entry.name) {
      fileName = entry.name;
    } else if (entry.file_name) {
      fileName = entry.file_name;
    } else if (entry.title) {
      fileName = entry.title;
    }
    
    const fileSize = content.length;
    const uploadedAt = entry.created_at || entry.uploaded_at || new Date().toISOString();

    console.log('Extracted content:', { 
      content: content.substring(0, 100) + '...', 
      fileName, 
      fileSize, 
      uploadedAt,
      hasContent: !!content,
      contentLength: content.length
    });

    // Determine content type based on file extension
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    let contentType = 'text/plain';
    
    if (fileExtension === 'csv') {
      contentType = 'text/csv';
    } else if (fileExtension === 'json') {
      contentType = 'application/json';
    } else if (fileExtension === 'md') {
      contentType = 'text/markdown';
    } else if (fileExtension === 'txt') {
      contentType = 'text/plain';
    }

    // If no content found, return the raw entry data for debugging
    if (!content) {
      console.log('No content found, returning raw entry data for debugging');
      return NextResponse.json({
        content: '',
        contentType: 'text/plain',
        fileName,
        fileSize: 0,
        uploadedAt,
        debug: {
          rawEntry: entry,
          message: 'No content found in any expected field'
        }
      });
    }

    return NextResponse.json({
      content,
      contentType,
      fileName,
      fileSize,
      uploadedAt,
    });

  } catch (error: any) {
    console.error('Error in file-content API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
