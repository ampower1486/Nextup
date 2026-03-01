'use client';

import { useState } from 'react';
import { X, UtensilsCrossed, MapPin, Phone, FileText, Plus, Loader2 } from 'lucide-react';
import { createRestaurantAction } from '@/app/actions/restaurant';

export default function CreateRestaurantForm({ onClose, onCreated }: { onClose: () => void, onCreated: () => void }) {
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        setLoading(true);
        setError(null);

        try {
            const result = await createRestaurantAction({
                name,
                address: address || undefined,
                phone: phone || undefined,
                description: description || undefined
            });

            if (result.success) {
                if (result.warning) {
                    alert(result.warning);
                }
                onCreated();
                onClose();
            } else {
                setError(result.error || 'Failed to create restaurant');
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
                    <div className="header-icon">
                        <UtensilsCrossed size={24} />
                    </div>
                    <div className="header-text">
                        <h2>New Restaurant</h2>
                        <p>Sync across Nextup & Tablereserve</p>
                    </div>
                    <button onClick={onClose} className="close-btn">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {error && <div className="error-banner">{error}</div>}

                    <div className="form-group">
                        <label><Plus size={14} /> Restaurant Name</label>
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
                            placeholder="Briefly describe this location..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="cancel-btn">Cancel</button>
                        <button type="submit" disabled={loading} className="submit-btn shadow-glow">
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Create & Sync Restaurant'}
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
                    z-index: 10000;
                    padding: 1.5rem;
                }
                .modal-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.4);
                    backdrop-filter: blur(8px);
                    animation: fadeIn 0.3s ease-out;
                }
                .modal-card {
                    position: relative;
                    background: white;
                    width: 100%;
                    max-width: 500px;
                    border-radius: 24px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
                    overflow: hidden;
                    animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                }
                .modal-header {
                    padding: 1.5rem 2rem;
                    background: linear-gradient(to right, #f8fafc, #ffffff);
                    border-bottom: 1px solid #f1f5f9;
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                }
                .header-icon {
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    color: white;
                    padding: 0.75rem;
                    border-radius: 16px;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
                }
                .header-text h2 {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: #0f172a;
                    letter-spacing: -0.025em;
                }
                .header-text p {
                    margin: 0;
                    font-size: 0.875rem;
                    color: #64748b;
                    font-weight: 500;
                }
                .close-btn {
                    margin-left: auto;
                    color: #94a3b8;
                    padding: 0.5rem;
                    border-radius: 50%;
                    transition: all 0.2s;
                    border: none;
                    background: none;
                    cursor: pointer;
                }
                .close-btn:hover {
                    background: #f1f5f9;
                    color: #0f172a;
                    transform: rotate(90deg);
                }
                .modal-form {
                    padding: 2rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .error-banner {
                    background: #fef2f2;
                    color: #b91c1c;
                    padding: 0.75rem 1rem;
                    border-radius: 12px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    border: 1px solid #fee2e2;
                }
                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .form-group label {
                    font-size: 0.875rem;
                    font-weight: 700;
                    color: #334155;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .form-group input, .form-group textarea {
                    padding: 0.875rem 1.25rem;
                    border-radius: 14px;
                    border: 2px solid #f1f5f9;
                    background: #f8fafc;
                    font-size: 1rem;
                    transition: all 0.2s;
                    outline: none;
                    color: #0f172a;
                }
                .form-group input:focus, .form-group textarea:focus {
                    background: white;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
                }
                .form-group textarea {
                    height: 100px;
                    resize: none;
                }
                .modal-footer {
                    display: flex;
                    gap: 1rem;
                    padding-top: 1rem;
                }
                .cancel-btn {
                    flex: 1;
                    padding: 0.875rem;
                    border-radius: 14px;
                    font-weight: 700;
                    color: #64748b;
                    background: #f1f5f9;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .cancel-btn:hover {
                    background: #e2e8f0;
                    color: #475569;
                }
                .submit-btn {
                    flex: 2;
                    padding: 0.875rem;
                    border-radius: 14px;
                    font-weight: 800;
                    color: white;
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    border: none;
                    cursor: pointer;
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .submit-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3);
                }
                .submit-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .shadow-glow {
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}
