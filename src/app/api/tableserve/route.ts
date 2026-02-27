import { NextResponse } from 'next/server';

export async function GET() {
    // Mocking TableServe API Response with some today and some later in week
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const mockReservations = [
        { id: '1', name: 'Thompson', date_time: new Date(now + 15 * 60000).toISOString(), size: 4 },
        { id: '2', name: 'Marcstenson', date_time: new Date(now + 30 * 60000).toISOString(), size: 2 },
        { id: '3', name: 'Mitilamson', date_time: new Date(now + 45 * 60000).toISOString(), size: 6 },
        { id: '4', name: 'Alvarez Family', date_time: new Date(now + dayMs * 1 + 2 * 3600000).toISOString(), size: 5 },
        { id: '5', name: 'Smith Party', date_time: new Date(now + dayMs * 2 + 1 * 3600000).toISOString(), size: 3 },
        { id: '6', name: 'Johnson', date_time: new Date(now + dayMs * 3 + 3 * 3600000).toISOString(), size: 2 },
        { id: '7', name: 'Chen Event', date_time: new Date(now + dayMs * 5 + 4 * 3600000).toISOString(), size: 12 },
    ];

    return NextResponse.json({ reservations: mockReservations });
}
