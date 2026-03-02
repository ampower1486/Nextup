'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { X } from 'lucide-react';

export default function AddPartyForm({ onClose, onCreated, restaurantId, isAllAdmin }: { onClose?: () => void, onCreated?: () => void, restaurantId: string | null, isAllAdmin?: boolean }) {
    const [name, setName] = useState('');
    const [size, setSize] = useState('');
    const [phone, setPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [quotedTime, setQuotedTime] = useState('20');
    const [selectedRestaurantId, setSelectedRestaurantId] = useState(restaurantId || '');
    const [restaurants, setRestaurants] = useState<{ id: string, name: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [customSize, setCustomSize] = useState('');

    // Generate options from 5 to 180 in 5 min intervals
    const timeOptions = Array.from({ length: 36 }, (_, i) => (i + 1) * 5);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value.replace(/\D/g, '').substring(0, 10);
        let formatted = input;
        if (input.length > 6) {
            formatted = `(${input.substring(0, 3)}) ${input.substring(3, 6)}-${input.substring(6, 10)}`;
        } else if (input.length > 3) {
            formatted = `(${input.substring(0, 3)}) ${input.substring(3, 6)}`;
        } else if (input.length > 0) {
            formatted = `(${input.substring(0, 3)}`;
        }
        setPhone(formatted);
    };

    const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, ''); // Number only
        if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 99)) {
            setSize(val);
            setCustomSize(val);
        }
    };

    useState(() => {
        if (isAllAdmin) {
            const supabase = createClient();
            supabase.from('restaurants').select('id, name').then(({ data }) => {
                if (data) setRestaurants(data);
            });
        }
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name || !size || !quotedTime || !phone) {
            alert('Please fill in all mandatory fields (Name, Size, Phone, Quoted Time)');
            return;
        }

        setLoading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('waitlist_entries').insert([{
            party_name: name,
            party_size: parseInt(size, 10),
            phone_number: phone,
            notes: notes.trim() || null,
            quoted_time: parseInt(quotedTime, 10),
            status: 'Waiting',
            restaurant_id: isAllAdmin ? (selectedRestaurantId || null) : restaurantId,
            user_id: user?.id || null
        }]);

        if (!error) {
            if (onCreated) onCreated();
            if (onClose) onClose();
        } else {
            alert('Error adding party: ' + error.message);
        }
        setLoading(false);
    }

    return (
        <div className="form-modal-overlay" onClick={onClose}>
            <div className="form-modal-content" onClick={e => e.stopPropagation()}>
                <div className="form-modal-header">
                    <h2>Add to Waitlist</h2>
                    <button className="btn-close-icon" onClick={onClose}><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="add-party-form">
                    <div className="form-group">
                        <label>Party Name</label>
                        <input
                            type="text"
                            placeholder="e.g. John Doe"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Size</label>
                        <div className="size-selector-grid">
                            {[1, 2, 3, 4, 5, 6].map(num => (
                                <button
                                    type="button"
                                    key={num}
                                    className={`btn-size ${size === num.toString() ? 'selected' : ''}`}
                                    onClick={() => { setSize(num.toString()); setCustomSize(''); }}
                                >
                                    {num}
                                </button>
                            ))}
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder="Other"
                                value={customSize}
                                onChange={handleSizeChange}
                                className={`input-size-other ${customSize !== '' ? 'selected-input' : ''}`}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Phone Number</label>
                        <input
                            type="tel"
                            placeholder="(555) 555-5555"
                            value={phone}
                            onChange={handlePhoneChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Notes (Optional)</label>
                        <textarea
                            placeholder="e.g. Needs high chair, patio seating..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={2}
                            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', fontFamily: 'inherit', resize: 'vertical' }}
                        />
                    </div>
                    <div className="form-group">
                        <label>Quoted Wait Time</label>
                        <select value={quotedTime} onChange={e => setQuotedTime(e.target.value)}>
                            {timeOptions.map(min => (
                                <option key={min} value={min}>
                                    {min >= 60 ? `${Math.floor(min / 60)} hr ${min % 60 > 0 ? min % 60 + ' min' : ''}`.trim() : `${min} min`}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button type="submit" disabled={loading} className="btn-add-submit">
                        {loading ? 'Adding...' : 'Add to Waitlist'}
                    </button>
                </form>
            </div>

            <style jsx>{`
        .form-modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: rgba(15, 23, 42, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        .form-modal-content {
            background-color: white;
            padding: 2rem;
            border-radius: 12px;
            width: 450px;
            max-width: 90vw;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
        }
        .form-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        .form-modal-header h2 {
            margin: 0;
            font-size: 1.5rem;
            color: var(--text-primary);
        }
        .btn-close-icon {
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            padding: 0.25rem;
        }
        .btn-close-icon:hover { color: var(--text-primary); }
        .add-party-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        .form-group label {
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--text-primary);
        }
        input, select {
          padding: 0.85rem 1rem;
          border: 1px solid var(--table-border);
          border-radius: 6px;
          outline: none;
          font-family: inherit;
          font-size: 1rem;
          background-color: #f8fafc;
        }
        input:focus, select:focus {
            border-color: var(--btn-primary-bg);
            background-color: white;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .size-selector-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 0.5rem;
        }
        .btn-size {
            background-color: #f8fafc;
            border: 1px solid var(--table-border);
            border-radius: 6px;
            padding: 0.75rem 0;
            font-size: 1rem;
            font-weight: 600;
            color: var(--text-primary);
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-size:hover {
            background-color: #e2e8f0;
            border-color: #cbd5e1;
        }
        .btn-size.selected {
            background-color: var(--btn-primary-bg);
            color: white;
            border-color: var(--btn-primary-bg);
            box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
        }
        .input-size-other {
            grid-column: span 2;
            text-align: center;
        }
        .input-size-other.selected-input {
            border-color: var(--btn-primary-bg);
            background-color: white;
            box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
            font-weight: bold;
        }
        .btn-add-submit {
          background-color: var(--btn-green);
          color: white;
          padding: 1rem;
          border-radius: 6px;
          font-weight: 600;
          font-size: 1.1rem;
          margin-top: 1rem;
          transition: background-color 0.2s;
        }
        .btn-add-submit:hover {
          background-color: var(--btn-green-hover);
        }
      `}</style>
        </div>
    );
}
