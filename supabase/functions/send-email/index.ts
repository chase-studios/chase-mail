// Supabase Edge Function: send-email
// Dispatches outbound external email via Resend API (https://resend.com)
// Secure server-side execution: keeps RESEND_API_KEY and SUPABASE_SERVICE_ROLE_KEY private.

import { createClient } from 'npm:@supabase/supabase-js@2.57.0';

Deno.serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey'
      }
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { from, to, subject, body } = await req.json();

    if (!to || !subject || !body) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify authenticated user
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check Resend API Key
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(JSON.stringify({
        error: 'RESEND_API_KEY is not configured on the Supabase Edge Function environment.',
        help: 'Set RESEND_API_KEY in your Supabase Dashboard or via: supabase secrets set RESEND_API_KEY=re_...'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Dispatch via Resend HTTP API
    const senderEmail = from || 'Chase Mail <onboarding@resend.dev>';
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: senderEmail,
        to: [to],
        subject: subject,
        text: body
      })
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      return new Response(JSON.stringify({
        error: resendResult.message || 'Failed to dispatch email via Resend',
        details: resendResult
      }), {
        status: resendResponse.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Record delivery event if service role client is available
    if (supabaseServiceKey) {
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      await adminClient.from('mail_delivery_events').insert({
        owner_id: user.id,
        event_type: 'sent',
        details: {
          to,
          subject,
          resend_id: resendResult.id,
          sent_at: new Date().toISOString()
        }
      });

      await adminClient.from('mail_external_messages').insert({
        owner_id: user.id,
        direction: 'outbound',
        from_address: senderEmail,
        to_address: to,
        subject,
        body_text: body,
        received_at: new Date().toISOString()
      });
    }

    return new Response(JSON.stringify({
      success: true,
      id: resendResult.id,
      to,
      subject
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});
