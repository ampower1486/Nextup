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
            const { error, data } = await supabase.auth.exchangeCodeForSession(code)

            if (!error && data.session) {
                return NextResponse.redirect(`${requestUrl.origin}${next}`)
            }
        }
    } catch (err) {
        console.error('Callback error:', err)
    }

    const message = encodeURIComponent('Invalid or expired reset link. Please try again.')
    return NextResponse.redirect(`${requestUrl.origin}/login?message=${message}`)
}
