import type { Metadata } from 'next';
import { Playfair_Display } from 'next/font/google';
import './globals.css';

export const metadata: Metadata = {
    title: 'Nextup Waitlist',
    description: 'Restaurant Waitlist Application',
};

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={playfair.variable}>
            <body>{children}</body>
        </html>
    );
}
