'use client';

import { WaitlistEntry } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/client';
import { differenceInSeconds } from 'date-fns';
import { useEffect, useState } from 'react';
import { MessageSquare, Phone, Check, X, Edit2 } from 'lucide-react';

function formatElapsed(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h > 0 ? h + 'h ' : ''}${m} min`;
}

function formatQuotedTimeDisplay(createdAt: string, quotedMinutes: number) {
    const projectedTime = new Date(new Date(createdAt).getTime() + quotedMinutes * 60000);
    return projectedTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const TimerDisplay = ({ createdAt, quotedTime, status }: { createdAt: string, quotedTime: number, status: string }) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const start = new Date(createdAt);
        const update = () => {
            setElapsed(differenceInSeconds(new Date(), start));
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [createdAt]);

    if (status !== 'Waiting') {
        return <>{formatElapsed(elapsed)}</>;
    }

    const elapsedMinutes = elapsed / 60;
    const remainingMinutes = quotedTime - Math.floor(elapsedMinutes);
    let timerClass = 'timer-green';

    if (elapsedMinutes >= quotedTime) {
        timerClass = 'timer-red';
    } else if (elapsedMinutes >= quotedTime * 0.75) {
        timerClass = 'timer-orange';
    }

    return (
        <div className="time-group">
            <span className="quoted-time">{formatQuotedTimeDisplay(createdAt, quotedTime)}</span>
            <span className={`time-subtext ${timerClass}`}>
                ({remainingMinutes > 0 ? remainingMinutes : 0} min)
            </span>
        </div>
    );
};

const ElapsedWait = ({ createdAt, status }: { createdAt: string, status: string }) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const start = new Date(createdAt);
        const update = () => {
            setElapsed(differenceInSeconds(new Date(), start));
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [createdAt]);

    if (status !== 'Waiting') return <span>-</span>;
    return <span>{Math.floor(elapsed / 60)} min</span>;
};

export default function WaitlistTable({ entries, defaultSmsMessage }: { entries: WaitlistEntry[], defaultSmsMessage?: string }) {
    const [editingEntry, setEditingEntry] = useState<WaitlistEntry | null>(null);
    const [editName, setEditName] = useState('');
    const [editSize, setEditSize] = useState(1);
    const [editPhone, setEditPhone] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [chattingEntry, setChattingEntry] = useState<WaitlistEntry | null>(null);
    const [chatMessage, setChatMessage] = useState('');

    const openEdit = (entry: WaitlistEntry) => {
        setEditingEntry(entry);
        setEditName(entry.party_name);
        setEditSize(entry.party_size);
        setEditPhone(entry.phone_number || '');
        setEditNotes(entry.notes || '');
    };

    const saveEdit = async () => {
        if (!editingEntry) return;
        const supabase = createClient();
        await supabase.from('waitlist_entries').update({
            party_name: editName,
            party_size: editSize,
            phone_number: editPhone,
            notes: editNotes.trim() || null
        }).eq('id', editingEntry.id);
        setEditingEntry(null);
    };

    const openChat = (entry: WaitlistEntry) => {
        setChattingEntry(entry);
        setChatMessage(defaultSmsMessage || `Hi ${entry.party_name}, this is Nextup checking in on your reservation.`);
    };

    const sendChat = async () => {
        if (!chattingEntry) return;
        try {
            const res = await fetch('/api/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: chattingEntry.phone_number || '+1234567890',
                    partyName: chattingEntry.party_name,
                    customMessage: chatMessage
                })
            });
            const data = await res.json();
            if (!data.success) {
                alert('Failed to send SMS: ' + data.error);
            }
        } catch (err) {
            console.error(err);
        }
        setChattingEntry(null);
    };

    const handleUpdateStatus = async (entry: WaitlistEntry, newStatus: string) => {
        if (newStatus === 'Notified') {
            try {
                const res = await fetch('/api/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: entry.phone_number || '+1234567890',
                        partyName: entry.party_name,
                        customMessage: defaultSmsMessage
                    })
                });
                const data = await res.json();
                if (!data.success) {
                    alert('Failed to send SMS: ' + data.error);
                }
            } catch (err) {
                console.error(err);
            }
        }
        const supabase = createClient();
        await supabase.from('waitlist_entries').update({
            status: newStatus,
            updated_at: new Date().toISOString()
        }).eq('id', entry.id);
    };

    return (
        <div className="table-container">
            <table className="waitlist-table">
                <thead>
                    <tr>
                        <th>PARTY</th>
                        <th>SIZE</th>
                        <th>QUOTED</th>
                        <th>WAIT</th>
                        <th style={{ textAlign: 'center' }}>NOTIFY</th>
                        <th style={{ textAlign: 'center' }}>ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    {entries.length === 0 ? (
                        <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
                                No active parties waiting.
                            </td>
                        </tr>
                    ) : null}
                    {entries.map((entry) => (
                        <tr key={entry.id} className={entry.is_tableserve ? 'tableserve-row' : ''}>
                            <td>
                                <div className="party-info">
                                    <strong className="party-name">{entry.party_name}</strong>
                                    <span className="party-phone">{entry.phone_number || 'No Phone'}</span>
                                    <span className="party-time" style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '2px' }}>Added: {new Date(entry.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                                    {entry.notes && <span className="source-label" style={{ color: '#8b5cf6', marginTop: '4px' }}>Note: {entry.notes}</span>}
                                    {entry.is_tableserve && <span className="source-label">TableServe</span>}
                                </div>
                            </td>
                            <td>
                                <span className="size-text">{entry.party_size}</span>
                            </td>
                            <td>
                                <TimerDisplay createdAt={entry.created_at} quotedTime={entry.quoted_time} status={entry.status} />
                            </td>
                            <td>
                                <span className="wait-text">
                                    <ElapsedWait createdAt={entry.created_at} status={entry.status} />
                                </span>
                            </td>
                            <td>
                                <div className="notify-actions">
                                    <button className="btn-action btn-message" title="Chat" onClick={() => openChat(entry)}>
                                        <MessageSquare size={16} />
                                    </button>
                                </div>
                            </td>
                            <td>
                                <div className="actions-cell">
                                    <button onClick={() => handleUpdateStatus(entry, 'Seated')} className="btn-action btn-seat" title="Seat Party">
                                        <Check size={18} />
                                    </button>
                                    <button onClick={() => handleUpdateStatus(entry, 'No Show')} className="btn-action btn-cancel" title="Cancel/No Show">
                                        <X size={18} />
                                    </button>
                                    <button className="btn-action btn-edit" title="Edit" onClick={() => openEdit(entry)}>
                                        <Edit2 size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {
                editingEntry && (
                    <div className="modal-overlay" onClick={() => setEditingEntry(null)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <h2>Edit {editingEntry.party_name}</h2>
                            <div className="form-group">
                                <label>Party Name</label>
                                <input value={editName} onChange={e => setEditName(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Party Size</label>
                                <input type="number" min="1" value={editSize} onChange={e => setEditSize(parseInt(e.target.value))} />
                            </div>
                            <div className="form-group">
                                <label>Phone Number (Optional)</label>
                                <input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+1234567890" />
                            </div>
                            <div className="form-group">
                                <label>Notes (Optional)</label>
                                <textarea rows={2} value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="e.g. High chair needed" style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', fontFamily: 'inherit', resize: 'vertical' }} />
                            </div>
                            <div className="modal-actions">
                                <button className="btn-cancel-modal" onClick={() => setEditingEntry(null)}>Cancel</button>
                                <button className="btn-save-modal" onClick={saveEdit}>Save Changes</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                chattingEntry && (
                    <div className="modal-overlay" onClick={() => setChattingEntry(null)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <h2>Message {chattingEntry.party_name}</h2>
                            <div className="form-group">
                                <label>Custom Message</label>
                                <textarea rows={4} value={chatMessage} onChange={e => setChatMessage(e.target.value)} />
                            </div>
                            <div className="modal-actions">
                                <button className="btn-cancel-modal" onClick={() => setChattingEntry(null)}>Cancel</button>
                                <button className="btn-save-modal" onClick={sendChat}>Send SMS</button>
                            </div>
                        </div>
                    </div>
                )
            }

            <style jsx>{`
        .table-container {
          background-color: white;
          overflow: hidden;
          padding-bottom: 6rem; /* space for FAB */
        }
        .waitlist-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        th {
          background-color: white;
          color: var(--text-primary);
          padding: 1rem 1.5rem;
          font-weight: 700;
          font-size: 0.85rem;
          letter-spacing: 0.5px;
          border-bottom: 2px solid var(--table-border);
          text-transform: uppercase;
        }
        td {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--table-border);
          vertical-align: top;
        }
        
        /* Alternating row colors */
        tbody tr:nth-child(even) {
            background-color: #f8fafc;
        }
        .tableserve-row {
          background-color: #dbeafe !important;
        }

        .party-info {
            display: flex;
            flex-direction: column;
            gap: 0.2rem;
        }
        .party-name {
            font-size: 1.05rem;
            color: var(--text-primary);
        }
        .party-phone {
            font-size: 0.85rem;
            color: var(--text-secondary);
        }
        .source-label {
            font-size: 0.75rem;
            color: #64748b;
            font-style: italic;
        }
        .size-text {
            font-size: 1rem;
            color: var(--text-primary);
        }
        .wait-text {
            font-size: 0.95rem;
            color: var(--text-secondary);
        }

        /* Time Display */
        .time-group {
            display: flex;
            flex-direction: column;
            gap: 0.2rem;
        }
        .quoted-time {
            font-size: 0.95rem;
            color: var(--text-secondary);
        }
        .time-subtext {
            font-size: 0.9rem;
            font-weight: 600;
        }
        
        /* Dynamic Timer Colors */
        .timer-green { color: #22c55e; }
        .timer-orange { color: #f59e0b; }
        .timer-red { color: #ef4444; }

        /* Action Buttons */
        .notify-actions {
            display: flex;
            gap: 0.5rem;
        }

        /* Modal Styles */
        .modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        .modal-content {
            background-color: white;
            padding: 2.5rem;
            border-radius: 16px;
            width: 450px;
            max-width: 90vw;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            position: relative;
        }
        .modal-content h2 {
            margin-top: 0;
            margin-bottom: 1.5rem;
            font-size: 1.5rem;
            color: var(--text-primary);
        }
        .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            margin-bottom: 1.25rem;
        }
        .form-group label {
            font-weight: 600;
            font-size: 0.9rem;
            color: var(--text-secondary);
        }
        .form-group input, .form-group textarea {
            padding: 0.75rem;
            border: 1px solid var(--table-border);
            border-radius: 8px;
            font-family: inherit;
            font-size: 1rem;
            transition: all 0.2s;
        }
        .form-group input:focus, .form-group textarea:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
            margin-top: 2rem;
        }
        .btn-cancel-modal {
            background: transparent;
            color: #64748b;
            border: 1px solid #cbd5e1;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-cancel-modal:hover {
            background: #f1f5f9;
            color: #475569;
        }
        .btn-save-modal {
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            color: white;
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 10px rgba(34, 197, 94, 0.3);
            transition: all 0.2s;
        }
        .btn-save-modal:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 15px rgba(34, 197, 94, 0.4);
            filter: brightness(1.05);
        }
        .actions-cell {
            display: flex;
            justify-content: center;
            gap: 0.6rem;
        }
        .btn-action {
            border-radius: 10px;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            background: white;
            border: 1px solid transparent;
        }
        
        .btn-seat { 
            border-color: rgba(74, 222, 128, 0.3);
            color: #22c55e;
            box-shadow: 0 4px 10px rgba(74, 222, 128, 0.15), inset 0 2px 4px rgba(255,255,255,0.5);
            background: linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%);
        }
        .btn-seat:hover { 
            transform: translateY(-3px);
            box-shadow: 0 6px 15px rgba(74, 222, 128, 0.3), inset 0 2px 4px rgba(255,255,255,0.8);
            border-color: #4ade80;
        }
        
        .btn-cancel { 
            border-color: rgba(248, 113, 113, 0.3);
            color: #ef4444; 
            box-shadow: 0 4px 10px rgba(248, 113, 113, 0.15), inset 0 2px 4px rgba(255,255,255,0.5);
            background: linear-gradient(180deg, #ffffff 0%, #fef2f2 100%);
        }
        .btn-cancel:hover { 
            transform: translateY(-3px);
            box-shadow: 0 6px 15px rgba(248, 113, 113, 0.3), inset 0 2px 4px rgba(255,255,255,0.8);
            border-color: #f87171;
        }
        
        .btn-edit { 
            border-color: rgba(148, 163, 184, 0.3);
            color: #64748b; 
            box-shadow: 0 4px 10px rgba(148, 163, 184, 0.15), inset 0 2px 4px rgba(255,255,255,0.5);
            background: linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%);
        }
        .btn-edit:hover { 
            transform: translateY(-3px);
            box-shadow: 0 6px 15px rgba(148, 163, 184, 0.3), inset 0 2px 4px rgba(255,255,255,0.8);
            border-color: #94a3b8;
        }
        
        .btn-message { 
            border-color: rgba(59, 130, 246, 0.3);
            color: #3b82f6; 
            box-shadow: 0 4px 10px rgba(59, 130, 246, 0.15), inset 0 2px 4px rgba(255,255,255,0.5);
            background: linear-gradient(180deg, #ffffff 0%, #eff6ff 100%);
        }
        .btn-message:hover { 
            transform: translateY(-3px);
            box-shadow: 0 6px 15px rgba(59, 130, 246, 0.3), inset 0 2px 4px rgba(255,255,255,0.8);
            border-color: #60a5fa;
        }
        
        .btn-call { 
            border-color: rgba(16, 185, 129, 0.3);
            color: #10b981; 
            box-shadow: 0 4px 10px rgba(16, 185, 129, 0.15), inset 0 2px 4px rgba(255,255,255,0.5);
            background: linear-gradient(180deg, #ffffff 0%, #ecfdf5 100%);
        }
        .btn-call:hover { 
            transform: translateY(-3px);
            box-shadow: 0 6px 15px rgba(16, 185, 129, 0.3), inset 0 2px 4px rgba(255,255,255,0.8);
            border-color: #34d399;
        }
      `}</style>
        </div >
    );
}
