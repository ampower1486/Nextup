import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const type = requestUrl.searchParams.get('type')
    const next = requestUrl.searchParams.get('next') ?? (type === 'recovery' ? '/reset-password' : '/')

    try {
        if (code) {
            const supabase = await createClient()
            const { error } = await supabase.auth.exchangeCodeForSession(code)
            if (!error) {
                // Return to the absolute URL to ensure origin is correct
                return NextResponse.redirect(`${requestUrl.origin}${next}`)
            }
            console.error('Auth error in exchange:', error)
        } else {
            console.error('No code provided in callback')
        }
    } catch (err) {
        console.error('Unexpected callback error:', err)
    }

    // Return to login with error if anything failed
    return NextResponse.redirect(`${requestUrl.origin}/login?message=Authentication failed. Please try again or use a newer link.`)
}
