import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

if (import.meta.main) {
  serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const { email, movieTitle, watchUrl, ticketCode, expiresAt, location, price, currency } = await req.json();

      if (!email || !movieTitle || !watchUrl) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: email, movieTitle, watchUrl' }),
          { status: 400, headers: corsHeaders }
        );
      }

      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

      if (!RESEND_API_KEY) {
        // If no Resend key, log and return success (mock mode)
        console.log(`[MOCK EMAIL] To: ${email}, Movie: ${movieTitle}, Watch: ${watchUrl}`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            mock: true, 
            message: `Email would be sent to ${email}. Set RESEND_API_KEY secret to enable real emails.` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const formattedPrice = currency === 'NGN' ? `₦${Number(price).toLocaleString()}` : `$${price}`;
      const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      });

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <!-- Header -->
    <div style="text-align:center;padding:30px 0 20px;">
      <div style="display:inline-block;background:#E53E6B;border-radius:12px;padding:12px 16px;">
        <span style="color:white;font-size:20px;font-weight:800;letter-spacing:-0.5px;">🎬 DeGameTV</span>
      </div>
    </div>

    <!-- Main Card -->
    <div style="background:#1a1a1a;border-radius:16px;overflow:hidden;border:1px solid #333;">
      <!-- Movie Banner -->
      <div style="background:linear-gradient(135deg,#E53E6B,#D4A843);padding:40px 30px;text-align:center;">
        <h1 style="color:white;margin:0 0 8px;font-size:28px;font-weight:800;">🎉 You're In!</h1>
        <p style="color:rgba(255,255,255,0.9);margin:0;font-size:16px;">Your ticket for <strong>${movieTitle}</strong> is confirmed</p>
      </div>

      <div style="padding:30px;">
        <!-- Watch Now Button -->
        <div style="text-align:center;margin-bottom:30px;">
          <a href="${watchUrl}" style="display:inline-block;background:#E53E6B;color:white;text-decoration:none;padding:16px 48px;border-radius:50px;font-size:18px;font-weight:700;letter-spacing:0.5px;">
            ▶ Watch Now
          </a>
        </div>

        <!-- Ticket Details -->
        <div style="background:#111;border-radius:12px;padding:20px;margin-bottom:20px;">
          <h3 style="color:#D4A843;margin:0 0 16px;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Ticket Details</h3>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="color:#888;padding:8px 0;font-size:14px;">Movie</td>
              <td style="color:white;padding:8px 0;text-align:right;font-weight:600;">${movieTitle}</td>
            </tr>
            <tr>
              <td style="color:#888;padding:8px 0;font-size:14px;">Location</td>
              <td style="color:white;padding:8px 0;text-align:right;text-transform:capitalize;">${location}</td>
            </tr>
            <tr>
              <td style="color:#888;padding:8px 0;font-size:14px;">Amount Paid</td>
              <td style="color:#E53E6B;padding:8px 0;text-align:right;font-weight:700;">${formattedPrice}</td>
            </tr>
            <tr>
              <td style="color:#888;padding:8px 0;font-size:14px;">Ticket Code</td>
              <td style="color:white;padding:8px 0;text-align:right;font-family:monospace;font-size:12px;">${ticketCode}</td>
            </tr>
            <tr>
              <td style="color:#888;padding:8px 0;font-size:14px;">Valid Until</td>
              <td style="color:white;padding:8px 0;text-align:right;">${expiryDate}</td>
            </tr>
          </table>
        </div>

        <!-- Access Info -->
        <div style="background:#0d2818;border:1px solid #1a4d2e;border-radius:12px;padding:16px;text-align:center;">
          <p style="color:#4ade80;margin:0;font-size:14px;">
            ✅ You have <strong>90 days</strong> of unlimited replay access
          </p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0;color:#666;font-size:12px;">
      <p style="margin:0 0 8px;">Need help? Reply to this email or visit our support page.</p>
      <p style="margin:0;">© ${new Date().getFullYear()} DeGameTV. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'DeGameTV <noreply@degametv.com>',
          to: [email],
          subject: `🎬 Your ticket for "${movieTitle}" — Watch Now!`,
          html: htmlContent,
        }),
      });

      if (!res.ok) {
        const errorData = await res.text();
        console.error('Resend error:', errorData);
        // Still return success — ticket was created, email is secondary
        return new Response(
          JSON.stringify({ success: true, emailSent: false, error: 'Email delivery failed but ticket is valid' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await res.json();
      return new Response(
        JSON.stringify({ success: true, emailSent: true, emailId: data.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: corsHeaders }
      );
    }
  });
}
