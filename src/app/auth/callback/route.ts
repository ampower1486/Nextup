import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')

    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/'
    const type = searchParams.get('type') as EmailOtpType | null
    const error_description = searchParams.get('error_description')
    const error_name = searchParams.get('error')

    const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
    const finalOrigin = forwardedHost ? `https://${forwardedHost}` : origin

    // Redirect to an error page if Supabase returned an error
    if (error_name || error_description) {
        const errorMsg = encodeURIComponent(error_description || error_name || 'Invalid reset link')
        return NextResponse.redirect(`${finalOrigin}/login?message=${errorMsg}`)
    }

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            return NextResponse.redirect(`${finalOrigin}${next}`)
        } else {
            console.error('Exchange code error:', error?.message)
            const errorMsg = encodeURIComponent(error?.message || 'Exchange code error')
            return NextResponse.redirect(`${finalOrigin}/login?message=${errorMsg}`)
        }
    }

    if (token_hash && type) {
        const supabase = await createClient()
        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        })
        if (!error) {
            return NextResponse.redirect(`${finalOrigin}${next}`)
        } else {
            console.error('Verify OTP error:', error?.message)
            const errorMsg = encodeURIComponent(error?.message || 'Verification link expired')
            return NextResponse.redirect(`${finalOrigin}/login?message=${errorMsg}`)
        }
    }

    // If there's no code but a direct load, possibly a hash fragment recovery flow or missing code entirely.
    // We should pass them to the next page to let the client handle any hash fragments.
    if (type === 'recovery' || next.includes('/reset-password')) {
        return NextResponse.redirect(`${finalOrigin}${next}`)
    }

    const message = encodeURIComponent('Invalid or expired reset link. Please try again.')
    return NextResponse.redirect(`${finalOrigin}/login?message=${message}`)
}
