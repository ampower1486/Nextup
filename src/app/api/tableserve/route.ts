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
        { id: '8', name: 'Rodriguez Wedding', phone_number: '(916) 555-0199', notes: 'Large party, needs setup', date_time: new Date(now + dayMs * 15).toISOString(), size: 25, created_at: new Date(now - dayMs * 5).toISOString() },
        { id: '9', name: 'Baker Birthday', phone_number: '(916) 555-0122', notes: 'Cake in fridge', date_time: new Date(now + dayMs * 25).toISOString(), size: 8, created_at: new Date(now - dayMs * 10).toISOString() },
        { id: '10', name: 'Future Event', phone_number: '(916) 555-0188', notes: 'Next month prep', date_time: new Date(now + dayMs * 45).toISOString(), size: 4, created_at: new Date(now - dayMs * 12).toISOString() },
    ];

    return NextResponse.json({ reservations: mockReservations });
}
