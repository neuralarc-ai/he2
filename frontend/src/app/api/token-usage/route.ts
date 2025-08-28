import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  console.log('Token usage API called!');
  
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('User not authenticated');
      return NextResponse.json({ used_tokens: 0 });
    }

    // Get the user's account
    const { data: accounts, error: accountsError } = await supabase
      .from('basejump.accounts')
      .select('account_id, name')
      .eq('primary_owner_user_id', user.id)
      .single();

    if (accountsError || !accounts) {
      console.log('Account not found');
      return NextResponse.json({ used_tokens: 0 });
    }

    // Get usage logs from the backend billing API (same as the frontend does)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api';
    console.log('Backend URL:', backendUrl);
    
    // Get the user's session to get the access token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.access_token) {
      console.log('No session or access token, using default');
      return NextResponse.json({ used_tokens: 0 });
    }

    console.log('Making request to backend billing API...');

    const response = await fetch(`${backendUrl}/billing/usage-logs?page=0&items_per_page=1000`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Backend response status:', response.status);

    if (!response.ok) {
      console.log('Backend API not available, using default');
      return NextResponse.json({ used_tokens: 0 });
    }

    const usageData = await response.json();
    console.log('Usage data received, logs count:', usageData?.logs?.length || 0);
    
    if (!usageData?.logs || usageData.logs.length === 0) {
      console.log('No logs in usage data, using default');
      return NextResponse.json({ used_tokens: 0 });
    }

    // Calculate total tokens from usage logs (same logic as frontend)
    let totalTokens = 0;
    for (const log of usageData.logs) {
      try {
        if (log.content?.usage) {
          const promptTokens = log.content.usage.prompt_tokens || 0;
          const completionTokens = log.content.usage.completion_tokens || 0;
          totalTokens += promptTokens + completionTokens;
        }
      } catch (e) {
        console.log('Error parsing log content:', e);
      }
    }
    
    console.log('Calculated total tokens:', totalTokens);
    
    return NextResponse.json({ 
      used_tokens: totalTokens,
      account_id: accounts.account_id 
    });

  } catch (error) {
    console.error('Error in token usage API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
