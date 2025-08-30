import { NextRequest, NextResponse } from 'next/server';
import { createAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    console.log('Test endpoint called');
    
    // Try with admin client (bypasses RLS)
    const admin = createAdmin();
    const { data: adminData, error: adminError } = await admin
      .from('global_knowledge_base')
      .select('*')
      .limit(5)
      .execute();
    
    console.log('Admin client result:', { adminData, adminError });
    
    // Try with server client (respects RLS)
    const supabase = await createClient();
    const { data: serverData, error: serverError } = await supabase
      .from('global_knowledge_base')
      .select('*')
      .limit(5);
    
    console.log('Server client result:', { serverData, serverError });
    
    // Try to get the specific entry from the snapshot
    const testId = '920592d7-cc30-4d3e-9ac7-8cf5ddcc6de';
    const { data: specificData, error: specificError } = await admin
      .from('global_knowledge_base')
      .select('*')
      .eq('id', testId)
      .execute();
    
    console.log('Specific entry result:', { specificData, specificError });
    
    // Try with entry_id field as well
    const { data: entryIdData, error: entryIdError } = await admin
      .from('global_knowledge_base')
      .select('*')
      .eq('entry_id', testId)
      .execute();
    
    console.log('entry_id query result:', { entryIdData, entryIdError });
    
    return NextResponse.json({
      admin: { data: adminData, error: adminError },
      server: { data: serverData, error: serverError },
      specific: { data: specificData, error: specificError },
      entryId: { data: entryIdData, error: entryIdError }
    });
    
  } catch (error: any) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
