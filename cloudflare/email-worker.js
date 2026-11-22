/**
 * Chase Mail - Cloudflare Email Worker
 * 
 * Automatically routes and delivers incoming emails sent to *@chase-studios.org:
 * 1. Reads raw MIME payload first to ensure stream integrity.
 * 2. Forwards a backup copy to destination mailbox (billgaming2424@gmail.com) if sender differs.
 * 3. Dispatches the verified email payload to Supabase Edge Function (inbound-mail)
 *    so it appears directly in Chase Mail's Unified Inbox.
 */

export default {
  async email(message, env, ctx) {
    const fromAddress = message.from || 'unknown@external.net';
    const toAddress = message.to || '';
    const subject = message.headers.get('subject') || '(No subject)';

    // 1. Read raw email content FIRST before any forward stream consumption
    let rawContent = '';
    try {
      rawContent = await new Response(message.raw).text();
    } catch (e) {
      console.error('Could not read raw email body stream:', e);
    }

    // 2. Extract clean text body from MIME content if present
    let textBody = '';
    if (rawContent) {
      const crlfIndex = rawContent.indexOf('\r\n\r\n');
      if (crlfIndex !== -1) {
        textBody = rawContent.slice(crlfIndex + 4);
      } else {
        const lfIndex = rawContent.indexOf('\n\n');
        if (lfIndex !== -1) {
          textBody = rawContent.slice(lfIndex + 2);
        } else {
          textBody = rawContent;
        }
      }
    }

    // 3. Forward backup copy if sender is NOT the destination address (prevents Cloudflare loop error)
    const destinationAddress = env.DESTINATION_EMAIL || 'billgaming2424@gmail.com';
    if (
      destinationAddress &&
      fromAddress &&
      fromAddress.trim().toLowerCase() !== destinationAddress.trim().toLowerCase()
    ) {
      try {
        await message.forward(destinationAddress);
        console.log(`Forwarded incoming mail from ${fromAddress} to ${destinationAddress}`);
      } catch (err) {
        console.warn(`Forward copy skipped or failed for ${destinationAddress}:`, err);
      }
    } else {
      console.log('Skipping forwarding copy because sender is destination address (preventing mail loop)');
    }

    // 4. POST to Supabase Inbound Webhook
    const supabaseUrl = env.SUPABASE_URL || 'https://rvetucuqburqnrgoatui.supabase.co';
    const supabaseAnonKey = env.SUPABASE_ANON_KEY || 'sb_publishable_lObu0hrc0h8j6AaIw4L2_w_Z8P_Q0nD';

    if (supabaseUrl) {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/inbound-mail`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({
            provider: 'cloudflare',
            from: fromAddress,
            to: toAddress,
            subject: subject,
            body: textBody || rawContent || '(Empty message)',
            text: textBody || rawContent || '(Empty message)',
            raw: rawContent
          })
        });
        const resText = await res.text();
        console.log(`Supabase inbound ingestion response status: ${res.status} - ${resText}`);
      } catch (err) {
        console.error('Error posting inbound mail to Supabase webhook:', err);
      }
    }
  }
};
