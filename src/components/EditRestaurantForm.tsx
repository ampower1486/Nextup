'use client';

import { useState, useEffect } from 'react';
import { X, UtensilsCrossed, MapPin, Phone, FileText, Edit, Loader2 } from 'lucide-react';
import { updateRestaurantAction } from '@/app/actions/restaurant';

export default function EditRestaurantForm({ restaurant, externalId, onClose, onUpdated }: { restaurant: any, externalId?: string | null, onClose: () => void, onUpdated: () => void }) {
    const [name, setName] = useState(restaurant?.name || '');
    const [address, setAddress] = useState(restaurant?.address || '');
    const [phone, setPhone] = useState(restaurant?.phone || '');
    const [description, setDescription] = useState(restaurant?.description || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (restaurant) {
            setName(restaurant.name || '');
            setAddress(restaurant.address || '');
            setPhone(restaurant.phone || '');
            setDescription(restaurant.description || '');
        }
    }, [restaurant]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !restaurant?.id) return;

        setLoading(true);
        setError(null);

        try {
            const result = await updateRestaurantAction(restaurant.id, {
                name,
                address: address || undefined,
                phone: phone || undefined,
                description: description || undefined,
                externalId: externalId
            });

            if (result.success) {
                if (result.warning) {
                    alert(result.warning);
                }
                onUpdated();
                onClose();
            } else {
                setError(result.error || 'Failed to update restaurant');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-wrapper">
            <div className="modal-overlay" onClick={onClose} />
            <div className="modal-card">
                <div className="modal-header">
                    <div className="header-icon" style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}>
                        <Edit size={24} />
                    </div>
                    <div className="header-text">
                        <h2>Edit Restaurant</h2>
                        <p>Modify local and synced Tablereserve info</p>
                    </div>
                    <button onClick={onClose} className="close-btn">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {error && <div className="error-banner">{error}</div>}

                    <div className="form-group">
                        <label><UtensilsCrossed size={14} /> Restaurant Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Carmelitas Mexican Restaurant"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group flex-1">
                            <label><MapPin size={14} /> Address</label>
                            <input
                                type="text"
                                placeholder="123 Main St, Fair Oaks, CA"
                                value={address}
                                onChange={e => setAddress(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label><Phone size={14} /> Phone Number</label>
                        <input
                            type="tel"
                            placeholder="(555) 000-0000"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label><FileText size={14} /> Description (Optional)</label>
                        <textarea
                            placeholder="Brief description of the restaurant"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading || !name.trim()}>
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </button>
                    </div>
                </form>
            </div>
            <style jsx>{`
                .modal-wrapper {
                    position: fixed;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    padding: 1rem;
                }
                .modal-overlay {
                    position: absolute;
                    inset: 0;
                    background-color: rgba(15, 23, 42, 0.4);
                    backdrop-filter: blur(4px);
                }
                .modal-card {
                    position: relative;
                    background: white;
                    border-radius: 24px;
                    width: 100%;
                    max-width: 500px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                /* Reuse same styles from CreateRestaurantForm */
                .modal-header { padding: 2rem 2rem 1.5rem; display: flex; align-items: flex-start; gap: 1rem; position: relative; border-bottom: 1px solid #f1f5f9; }
                .header-icon { width: 48px; height: 48px; border-radius: 12px; background: #fdf4ff; color: #d946ef; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .header-text h2 { margin: 0 0 0.25rem 0; font-size: 1.5rem; color: #0f172a; font-family: var(--font-playfair); font-weight: 700; }
                .header-text p { margin: 0; color: #64748b; font-size: 0.95rem; }
                .close-btn { position: absolute; top: 1.5rem; right: 1.5rem; width: 32px; height: 32px; border-radius: 50%; border: none; background: #f1f5f9; color: #64748b; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
                .close-btn:hover { background: #e2e8f0; color: #0f172a; }
                .modal-form { padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem; }
                .error-banner { background: #fef2f2; color: #991b1b; padding: 1rem; border-radius: 12px; font-size: 0.9rem; border: 1px solid #fecaca; }
                .form-row { display: flex; gap: 1rem; }
                .flex-1 { flex: 1; }
                .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
                .form-group label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; font-weight: 600; color: #334155; }
                .form-group input, .form-group textarea { width: 100%; padding: 0.75rem 1rem; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 1rem; color: #0f172a; background: #fff; transition: all 0.2s; font-family: inherit; }
                .form-group input:focus, .form-group textarea:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
                .modal-footer { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; padding-top: 1.5rem; border-top: 1px solid #f1f5f9; }
                .btn-secondary, .btn-primary { padding: 0.75rem 1.5rem; border-radius: 12px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.5rem; font-family: inherit; }
                .btn-secondary { background: #f1f5f9; color: #475569; border: none; }
                .btn-secondary:hover:not(:disabled) { background: #e2e8f0; color: #0f172a; }
                .btn-primary { background: #3b82f6; color: white; border: none; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2); }
                .btn-primary:hover:not(:disabled) { background: #2563eb; transform: translateY(-1px); box-shadow: 0 6px 8px -1px rgba(59, 130, 246, 0.3); }
                .btn-primary:disabled, .btn-secondary:disabled { opacity: 0.7; cursor: not-allowed; transform: none; box-shadow: none; }
                @keyframes modalSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
            `}</style>
        </div>
    );
}
