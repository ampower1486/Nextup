'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { LayoutGrid, ArrowLeftRight, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Restaurant {
    id: string;
    name: string;
}

interface Mapping {
    local_restaurant_id: string;
    external_restaurant_id: string;
}

export default function AdminMappings() {
    const [localRestos, setLocalRestos] = useState<Restaurant[]>([]);
    const [externalRestos, setExternalRestos] = useState<Restaurant[]>([]);
    const [mappings, setMappings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const loadData = async () => {
            const supabase = createClient();

            // Check session and role
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                window.location.href = '/login';
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            const isForcedAdmin = user.email === 'ampower14@icloud.com' || user.email === 'ampower1486@gmail.com';

            if (profile?.role !== 'admin' && !isForcedAdmin) {
                window.location.href = '/';
                return;
            }

            // Fetch Local
            const { data: localData } = await supabase.from('restaurants').select('id, name');

            // Fetch External via Proxy API
            try {
                const res = await fetch('/api/external/restaurants');
                const data = await res.json();
                if (data.restaurants) setExternalRestos(data.restaurants);
            } catch (err) {
                console.error("Failed to fetch external restaurants:", err);
            }

            // Fetch Existing Mappings
            const { data: mappingData } = await supabase.from('external_mappings').select('local_restaurant_id, external_restaurant_id');

            if (localData) setLocalRestos(localData);

            if (mappingData) {
                const map: Record<string, string> = {};
                mappingData.forEach(m => {
                    if (m.local_restaurant_id) map[m.local_restaurant_id] = m.external_restaurant_id;
                });
                setMappings(map);
            }
            setLoading(false);
        };
        loadData();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        const supabase = createClient();

        try {
            // Upsert mappings
            const upsertData = Object.entries(mappings).map(([localId, externalId]) => ({
                local_restaurant_id: localId,
                external_restaurant_id: externalId
            }));

            // Clear old local mappings first (simplified approach)
            await supabase.from('external_mappings').delete().not('local_restaurant_id', 'is', null);

            const { error } = await supabase.from('external_mappings').insert(upsertData);

            if (error) throw error;
            setMessage({ type: 'success', text: 'Mappings saved successfully!' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to save mappings' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Admin Dashboard...</div>;

    return (
        <div className="admin-container">
            <header className="admin-header">
                <div className="header-left">
                    <Link href="/" className="btn-back">
                        <ArrowLeftRight size={18} /> Back to App
                    </Link>
                    <h1>Reservation Mappings</h1>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-save"
                >
                    <Save size={18} /> {saving ? 'Saving...' : 'Save Mappings'}
                </button>
            </header>

            {message && (
                <div className={`alert ${message.type}`}>
                    {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {message.text}
                </div>
            )}

            <div className="mapping-grid">
                <div className="grid-header">
                    <span>Local Restaurant (Nextup)</span>
                    <ArrowLeftRight size={20} className="divider-icon" />
                    <span>External Restaurant (Tablereserve)</span>
                </div>

                {localRestos.map(resto => (
                    <div key={resto.id} className="mapping-row">
                        <div className="local-box">
                            <LayoutGrid size={16} />
                            <strong>{resto.name}</strong>
                        </div>

                        <div className="connector">
                            <div className="line"></div>
                        </div>

                        <select
                            value={mappings[resto.id] || ''}
                            onChange={e => setMappings({ ...mappings, [resto.id]: e.target.value })}
                            className="external-select"
                        >
                            <option value="">-- No Reservation Sync --</option>
                            {externalRestos.map(ext => (
                                <option key={ext.id} value={ext.id}>{ext.name}</option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>

            <style jsx>{`
                .admin-container {
                    max-width: 1000px;
                    margin: 2rem auto;
                    padding: 2rem;
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.05);
                }
                .admin-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                    padding-bottom: 1.5rem;
                    border-bottom: 1px solid #f1f5f9;
                }
                .header-left { display: flex; flex-direction: column; gap: 0.5rem; }
                .btn-back { 
                    font-size: 0.85rem; 
                    color: #64748b; 
                    text-decoration: none;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                h1 { margin: 0; font-size: 1.75rem; color: #0f172a; }
                
                .btn-save {
                    background: #2563eb;
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-save:hover { background: #1d4ed8; transform: translateY(-1px); }
                .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

                .alert {
                    padding: 1rem;
                    border-radius: 8px;
                    margin-bottom: 2rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-weight: 500;
                }
                .alert.success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
                .alert.error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }

                .mapping-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .grid-header {
                    display: grid;
                    grid-template-columns: 1fr 60px 1fr;
                    padding: 1rem;
                    background: #f8fafc;
                    border-radius: 8px;
                    font-weight: 700;
                    font-size: 0.9rem;
                    color: #475569;
                    text-align: center;
                }
                .divider-icon { color: #cbd5e1; place-self: center; }

                .mapping-row {
                    display: grid;
                    grid-template-columns: 1fr 60px 1fr;
                    align-items: center;
                    gap: 1rem;
                }
                .local-box {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 1.25rem;
                    background: #f1f5f9;
                    border-radius: 12px;
                    color: #1e293b;
                }
                .connector { place-self: center; width: 100%; display: flex; justify-content: center; }
                .line { height: 2px; background: #e2e8f0; width: 100%; }
                
                .external-select {
                    padding: 1rem;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    font-size: 1rem;
                    background: white;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .external-select:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
            `}</style>
        </div>
    );
}
