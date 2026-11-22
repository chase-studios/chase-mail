/**
 * Chase Mail - Cloudflare Email Worker
 * 
 * Automatically routes and delivers incoming emails sent to *@chase-studios.org:
 * 1. Forwards an instantaneous copy directly to destination mailbox (billgaming2424@gmail.com).
 * 2. Simultaneously dispatches the raw MIME payload to Supabase Edge Function (inbound-mail)
 *    so it appears directly in Chase Mail's Unified Inbox.
 */

export default {
  async email(message, env, ctx) {
    // 1. Forward copy to primary verified destination
    const destinationAddress = env.DESTINATION_EMAIL || 'billgaming2424@gmail.com';
    try {
      await message.forward(destinationAddress);
      console.log(`Forwarded incoming mail from ${message.from} to ${destinationAddress}`);
    } catch (err) {
      console.error(`Failed to forward message to ${destinationAddress}:`, err);
    }

    // 2. Parse basic headers
    const fromAddress = message.from;
    const toAddress = message.to;
    const subject = message.headers.get('subject') || '(No subject)';

    // 3. Read raw email content
    let rawContent = '';
    try {
      rawContent = await new Response(message.raw).text();
    } catch (e) {
      console.error('Could not stream raw email body:', e);
    }

    // 4. POST to Supabase Inbound Webhook
    const supabaseUrl = env.SUPABASE_URL || 'https://rvetucuqburqnrgoatui.supabase.co';
    const supabaseAnonKey = env.SUPABASE_ANON_KEY || '';

    if (supabaseUrl) {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/inbound-mail`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(supabaseAnonKey ? { 'Authorization': `Bearer ${supabaseAnonKey}` } : {})
          },
          body: JSON.stringify({
            from: fromAddress,
            to: toAddress,
            subject: subject,
            body: rawContent,
            text: rawContent,
            raw: rawContent
          })
        });
        console.log(`Supabase inbound ingestion response status: ${res.status}`);
      } catch (err) {
        console.error('Error posting inbound mail to Supabase webhook:', err);
      }
    }
  }
};
