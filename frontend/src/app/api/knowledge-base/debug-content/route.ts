import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Debug content endpoint called');
    
    const body = await req.json();
    const { fileId, kbType = 'global', agentId, threadId } = body as {
      fileId: string;
      kbType?: 'global' | 'agent' | 'thread';
      agentId?: string;
      threadId?: string;
    };

    console.log('Debug request:', { fileId, kbType, agentId, threadId });

    // Determine the table name based on kbType
    const tableName = 
      kbType === 'thread' ? 'thread_knowledge_base' :
      kbType === 'agent' ? 'agent_knowledge_base_entries' :
      'global_knowledge_base';

    console.log('Using table name:', tableName);

    // Try with regular client first
    const supabase = await createClient();
    
    // Build the query - try both 'id' and 'entry_id' fields
    let query = supabase
      .from(tableName)
      .select('*')
      .eq('id', fileId);

    if (kbType === 'thread' && threadId) {
      query = query.eq('thread_id', threadId);
    } else if (kbType === 'agent' && agentId) {
      query = query.eq('agent_id', agentId);
    }

    console.log('Executing query with id field...');
    let { data: entries, error } = await query;

    console.log('Query result with id field:', { entries, error });

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
        .limit(10);
      
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
      
      if (kbType === 'thread' && threadId) {
        adminQuery = adminQuery.eq('thread_id', threadId);
      } else if (kbType === 'agent' && agentId) {
        adminQuery = adminQuery.eq('agent_id', agentId);
      }
      
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

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!entries || entries.length === 0) {
      console.log('No entries found');
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const entry = entries[0] as any;
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
    let contentType = 'text/plain';
    if (fileName.includes('.json')) {
      contentType = 'application/json';
    } else if (fileName.includes('.md')) {
      contentType = 'text/markdown';
    } else if (fileName.includes('.txt')) {
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
          message: 'No content found in any expected field',
          tableName,
          fileId,
          kbType
        }
      });
    }

    return NextResponse.json({
      content,
      contentType,
      fileName,
      fileSize,
      uploadedAt,
      debug: {
        tableName,
        fileId,
        kbType,
        entryFound: true,
        contentFound: true
      }
    });

  } catch (error: any) {
    console.error('Error in debug content endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
