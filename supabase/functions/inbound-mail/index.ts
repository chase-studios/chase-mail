// Supabase Edge Function: inbound-mail
// Secure server-side receiver for inbound external email webhooks (e.g. Resend / Postmark / SendGrid).
// Uses SUPABASE_SERVICE_ROLE_KEY to safely insert verified external mail into mail_external_messages.

import { createClient } from 'npm:@supabase/supabase-js@2.57.0';

Deno.serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, svix-id, svix-timestamp, svix-signature, x-webhook-secret'
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const webhookSecret = Deno.env.get('INBOUND_WEBHOOK_SECRET');

    // Webhook token / secret verification
    const incomingSecret = req.headers.get('x-webhook-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
    if (webhookSecret && incomingSecret !== webhookSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized webhook signature or secret.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!supabaseServiceKey) {
      return new Response(JSON.stringify({
        error: 'SUPABASE_SERVICE_ROLE_KEY is required for server-side inbound mail ingestion.'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const payload = await req.json();

    // Standardize incoming payload (handles Resend inbound or raw webhook format)
    const fromAddress = payload.from || payload.sender || payload.data?.from || 'unknown@external.net';
    let toAddress = payload.to || payload.recipient || payload.data?.to;
    if (Array.isArray(toAddress)) toAddress = toAddress[0];
    toAddress = String(toAddress || '').trim().toLowerCase();

    const subject = payload.subject || payload.data?.subject || '(No Subject)';
    const bodyText = payload.text || payload.body || payload.data?.text || payload.html?.replace(/<[^>]+>/g, ' ') || '';

    if (!toAddress) {
      return new Response(JSON.stringify({ error: 'Missing recipient address in webhook payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Extract base handle from toAddress (e.g. "bill@chase-studios.org" -> "bill", "bill.exec" -> "bill")
    const localPart = toAddress.split('@')[0];
    const baseHandle = localPart.split('.')[0];

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Look up destination Chase Mail user in mail_accounts
    let { data: matchedAccount, error: accError } = await adminClient
      .from('mail_accounts')
      .select('user_id, handle')
      .ilike('handle', localPart)
      .maybeSingle();

    if (!matchedAccount && baseHandle !== localPart) {
      const fallback = await adminClient
        .from('mail_accounts')
        .select('user_id, handle')
        .ilike('handle', baseHandle)
        .maybeSingle();
      if (fallback.data) matchedAccount = fallback.data;
    }

    // If still not matched, route to primary admin or earliest registered user so no email is ever lost
    if (!matchedAccount) {
      const adminAcc = await adminClient
        .from('mail_accounts')
        .select('user_id, handle')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (adminAcc.data) matchedAccount = adminAcc.data;
    }

    if (accError || !matchedAccount) {
      // Record unrouted / bounced delivery event
      await adminClient.from('mail_delivery_events').insert({
        event_type: 'bounced',
        details: {
          reason: `No Chase Mail account found for handle: ${handleMatch}`,
          to: toAddress,
          from: fromAddress,
          subject
        }
      });

      return new Response(JSON.stringify({
        status: 'unrouted',
        message: `Recipient handle "${handleMatch}" is not registered on Chase Mail.`
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Insert into mail_external_messages with owner_id
    const { data: insertedMsg, error: insertError } = await adminClient
      .from('mail_external_messages')
      .insert({
        owner_id: matchedAccount.user_id,
        direction: 'inbound',
        provider: payload.provider || 'cloudflare',
        provider_message_id: payload.message_id || payload.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        from_address: fromAddress,
        to_address: toAddress,
        subject,
        body_text: bodyText || '(Empty message)',
        received_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (insertError) {
      throw insertError;
    }

    // Log delivery event (optional audit telemetry)
    try {
      await adminClient.from('mail_delivery_events').insert({
        owner_id: matchedAccount.user_id,
        message_id: insertedMsg.id,
        event_type: 'delivered',
        details: {
          to: toAddress,
          from: fromAddress,
          subject,
          delivered_at: new Date().toISOString()
        }
      });
    } catch (e) {
      console.warn('Could not log delivery event telemetry:', e);
    }

    return new Response(JSON.stringify({
      success: true,
      delivered_to: matchedAccount.handle,
      message_id: insertedMsg.id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Inbound mail processing failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
