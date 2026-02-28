import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') ?? '/'

    try {
        if (code) {
            const supabase = await createClient()
            const { error } = await supabase.auth.exchangeCodeForSession(code)
            if (!error) {
                return NextResponse.redirect(`${requestUrl.origin}${next}`)
            }
            console.error('Auth error:', error)
        }
    } catch (err) {
        console.error('Callback error:', err)
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${requestUrl.origin}/login?message=Could not authenticate user`)
}
