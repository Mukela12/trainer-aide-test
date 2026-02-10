import { NextRequest, NextResponse } from 'next/server';

const ELASTIC_EMAIL_API_URL = 'https://api.elasticemail.com/v4/emails/transactional';

/**
 * POST /api/email/test
 * Quick test endpoint to verify Elastic Email integration is working.
 * Send a POST with { "to": "your@email.com" } to test.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to } = body;

    if (!to) {
      return NextResponse.json({ error: 'Missing "to" email address' }, { status: 400 });
    }

    const apiKey = process.env.ELASTIC_EMAIL_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ELASTIC_EMAIL_API_KEY not configured' }, { status: 500 });
    }

    const fromEmail = process.env.EMAIL_FROM || 'contact@fluxium.dev';
    const fromName = process.env.FROM_NAME || 'AllWondrous';

    const response = await fetch(ELASTIC_EMAIL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ElasticEmail-ApiKey': apiKey,
      },
      body: JSON.stringify({
        Recipients: {
          To: [to],
        },
        Content: {
          From: `${fromName} <${fromEmail}>`,
          Subject: 'AllWondrous - Elastic Email Test',
          Body: [
            {
              ContentType: 'HTML',
              Charset: 'utf-8',
              Content: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px;">
  <div style="max-width: 500px; margin: 0 auto; text-align: center;">
    <div style="background: linear-gradient(135deg, #12229D, #6366f1); color: white; padding: 30px; border-radius: 12px 12px 0 0;">
      <h1 style="margin: 0;">AllWondrous</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
      <h2>Elastic Email Integration Working!</h2>
      <p>This is a test email sent via the Elastic Email API.</p>
      <p style="color: #6b7280; font-size: 14px;">Sent at: ${new Date().toISOString()}</p>
    </div>
  </div>
</body>
</html>`.trim(),
            },
            {
              ContentType: 'PlainText',
              Charset: 'utf-8',
              Content: `AllWondrous - Elastic Email Test\n\nThis is a test email sent via the Elastic Email API.\nSent at: ${new Date().toISOString()}`,
            },
          ],
        },
      }),
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        status: response.status,
        error: responseData,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      status: response.status,
      data: responseData,
    });
  } catch (error) {
    console.error('Email test error:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}
