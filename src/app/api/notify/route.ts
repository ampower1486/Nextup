import { NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(req: Request) {
    try {
        const { to, partyName, customMessage } = await req.json();

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromPhone = process.env.TWILIO_PHONE_NUMBER;

        if (!accountSid || !authToken || !fromPhone) {
            console.warn("TWILIO credentials are not set in environment variables. Simulating SMS.");
            return NextResponse.json({ success: true, message: `Simulated SMS to ${to}` });
        }

        const client = twilio(accountSid, authToken);

        const bodyContent = customMessage || `Hi ${partyName}, your table at Nextup is ready! Please head to the host stand.`;

        const message = await client.messages.create({
            body: bodyContent,
            from: fromPhone,
            to,
        });

        return NextResponse.json({ success: true, sid: message.sid });
    } catch (error: any) {
        console.error('Twilio Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
