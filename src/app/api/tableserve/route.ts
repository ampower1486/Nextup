import { NextResponse } from 'next/server';

export async function GET() {
    // Mocking TableServe API Response with some today and some later in week
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const mockReservations = [
        { id: '1', name: 'Thompson', phone_number: '(916) 123-4567', notes: 'Window seat requested', date_time: new Date(now + 15 * 60000).toISOString(), size: 4, created_at: new Date(now - 2 * 3600000).toISOString() },
        { id: '2', name: 'Marcstenson', phone_number: '(874) 987-6543', notes: '', date_time: new Date(now + 30 * 60000).toISOString(), size: 2, created_at: new Date(now - 5 * 3600000).toISOString() },
        { id: '3', name: 'Mitilamson', phone_number: '', notes: 'High chair needed', date_time: new Date(now + 45 * 60000).toISOString(), size: 6, created_at: new Date(now - 24 * 3600000).toISOString() },
        { id: '4', name: 'Alvarez Family', phone_number: '(555) 111-2222', notes: 'Birthday dinner', date_time: new Date(now + dayMs * 1 + 2 * 3600000).toISOString(), size: 5, created_at: new Date(now - 48 * 3600000).toISOString() },
        { id: '5', name: 'Smith Party', phone_number: '', notes: '', date_time: new Date(now + dayMs * 2 + 1 * 3600000).toISOString(), size: 3, created_at: new Date(now - 72 * 3600000).toISOString() },
        { id: '6', name: 'Johnson', phone_number: '(444) 333-5555', notes: 'Allergy: peanuts', date_time: new Date(now + dayMs * 3 + 3 * 3600000).toISOString(), size: 2, created_at: new Date(now - 80 * 3600000).toISOString() },
        { id: '7', name: 'Chen Event', phone_number: '(222) 999-8888', notes: 'Corporate event', date_time: new Date(now + dayMs * 5 + 4 * 3600000).toISOString(), size: 12, created_at: new Date(now - 120 * 3600000).toISOString() },
    ];

    return NextResponse.json({ reservations: mockReservations });
}
