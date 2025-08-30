import { NextRequest, NextResponse } from 'next/server';
import { createAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    console.log('Test upload endpoint called');
    
    const body = await req.json();
    const { fileName, content } = body as {
      fileName: string;
      content: string;
    };

    // Use admin client to bypass RLS
    const admin = createAdmin();
    
    // Create a test entry
    const { data, error } = await admin
      .from('global_knowledge_base')
      .insert({
        name: fileName,
        description: 'Test entry created for debugging',
        content: content,
        usage_context: 'always',
        is_active: true,
        account_id: '00000000-0000-0000-0000-000000000000', // Dummy account ID
        source_type: 'manual'
      })
      .select('*')
      .single();
    
    if (error) {
      console.error('Error creating test entry:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    console.log('Test entry created:', data);
    
    return NextResponse.json({
      success: true,
      entry: data
    });
    
  } catch (error: any) {
    console.error('Error in test upload endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}




