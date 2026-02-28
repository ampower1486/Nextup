export type WaitlistStatus = 'Waiting' | 'Notified' | 'Seated' | 'No Show' | 'Archived';
export interface WaitlistEntry {
    id: string;
    user_id: string;
    party_name: string;
    party_size: number;
    quoted_time: number;
    created_at: string;
    updated_at?: string;
    notes?: string;
    status: WaitlistStatus;
    phone_number?: string;
    is_tableserve: boolean;
    restaurant_id?: string;
}
