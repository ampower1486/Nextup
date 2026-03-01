'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AddPartyForm from '@/components/AddPartyForm';
import WaitlistTable from '@/components/WaitlistTable';
import CreateRestaurantForm from '@/components/CreateRestaurantForm';
import { WaitlistEntry } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/client';
import { UtensilsCrossed, ClipboardList, Calendar, Clock, BarChart2, Settings, LogOut, Search, Plus, ArrowLeftRight, ShieldAlert, Globe } from 'lucide-react';

interface Reservation {
    id: string;
    name: string;
    phone_number?: string;
    notes?: string;
    created_at?: string;
    date_time: string;
    size: number;
    is_shared?: boolean;
    local_restaurant_id?: string;
}

const supabase = createClient();

export default function Home() {
    const router = useRouter();
    const [currentTab, setCurrentTab] = useState<'Waitlist' | 'Reservations' | 'Recent' | 'Analytics' | 'Admin'>('Waitlist');
    const [entries, setEntries] = useState<WaitlistEntry[]>([]);
    const [pastEntries, setPastEntries] = useState<WaitlistEntry[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [resFilter, setResFilter] = useState<'week' | 'month'>('month');
    const [externalRestaurants, setExternalRestaurants] = useState<{ id: string, name: string }[]>([]);
    const [externalMappings, setExternalMappings] = useState<{ user_id: string, external_restaurant_id: string, external_restaurant_name: string }[]>([]);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isCreateRestoOpen, setIsCreateRestoOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [storeName, setStoreName] = useState('!!! REFRESH BROWSER NOW !!!');
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<'restaurant' | 'admin' | 'staff'>('restaurant');
    const [allProfiles, setAllProfiles] = useState<Record<string, { name: string, email: string, role: string, restaurant_id: string }>>({});
    const [profilesList, setProfilesList] = useState<{ id: string, name: string, email: string, role: string, restaurant_id: string }[]>([]);
    const [allRestaurants, setAllRestaurants] = useState<{ id: string, name: string }[]>([]);
    const [defaultSmsMessage, setDefaultSmsMessage] = useState('Your table is ready! Please head to the host stand.');
    const [authUserEmail, setAuthUserEmail] = useState<string | null>(null);
    const [isResetConfirming, setIsResetConfirming] = useState(false);

    useEffect(() => {
        const getProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setStoreName('Guest');
                    setAuthUserEmail(null);
                    return;
                }

                const email = user.email?.toLowerCase();
                setAuthUserEmail(email || null);
                console.log("[System] Logged in user:", email);

                const { data, error } = await supabase
                    .from('profiles')
                    .select('role, restaurant_id, restaurants(name)')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error("Profile fetch error:", error);
                    setUserRole('staff');
                    setStoreName('My Restaurant');
                    return;
                }

                if (data) {
                    let actualRole = data.role;
                    // Fallback only if profile has strictly no role
                    if (!actualRole && (email === 'ampower14@icloud.com' || email === 'ampower1486@gmail.com')) {
                        actualRole = 'admin';
                    } else if (!actualRole) {
                        actualRole = 'staff';
                    }

                    console.log("Profile data fetched successfully, Role:", actualRole);
                    const r = data.restaurants;
                    let rName = Array.isArray(r) ? r[0]?.name : (r as any)?.name;

                    if (actualRole === 'admin' && !rName) {
                        const { data: allRestos } = await supabase.from('restaurants').select('name').limit(1);
                        if (allRestos && allRestos.length > 0) {
                            rName = allRestos[0].name;
                        }
                    }

                    if (actualRole === 'admin') {
                        setStoreName(rName || 'System Admin');
                        setUserRole('admin');
                    } else {
                        setStoreName(rName || 'My Restaurant');
                        setUserRole(actualRole as any);
                    }

                    setRestaurantId(data.restaurant_id || null);

                    if (actualRole === 'admin') {
                        // Fetch all profiles to map user_id to name and email
                        const { data: profiles } = await supabase
                            .from('profiles')
                            .select('id, full_name, email, role, restaurant_id, restaurants(name)');

                        if (profiles) {
                            const mapping: Record<string, { name: string, email: string, role: string, restaurant_id: string }> = {};
                            const list: { id: string, name: string, email: string, role: string, restaurant_id: string }[] = [];
                            profiles.forEach(p => {
                                const displayName = p.full_name || p.email || 'Unknown';
                                mapping[p.id] = {
                                    name: displayName,
                                    email: (p.email || '').toLowerCase(),
                                    role: p.role || 'restaurant',
                                    restaurant_id: p.restaurant_id || ''
                                };
                                list.push({
                                    id: p.id,
                                    name: displayName,
                                    email: (p.email || '').toLowerCase(),
                                    role: p.role || 'restaurant',
                                    restaurant_id: p.restaurant_id || ''
                                });
                            });
                            setAllProfiles(mapping);
                            setProfilesList(list);
                        }

                        // Fetch restaurant list
                        fetchRestaurants();
                    }
                }
            } catch (err) {
                console.error("Unexpected error in getProfile:", err);
                setStoreName('Error loading');
            }
        };
        getProfile();

        // Safety timeout to ensure Loading... goes away
        const timer = setTimeout(() => {
            setStoreName(prev => prev === 'Loading...' ? 'My Restaurant' : prev);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    async function fetchRestaurants() {
        const { data } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false });
        if (data) setAllRestaurants(data);
    }

    const linkRestaurant = async (tableserveId: string, nextupUserId: string | null) => {
        const { error } = await supabase
            .from('restaurants')
            .update({ linked_user_id: nextupUserId || null })
            .eq('tableserve_id', tableserveId);

        if (!error) {
            fetchRestaurants();
        }
    };

    useEffect(() => {
        const savedMessage = localStorage.getItem('nextup_sms_message');
        if (savedMessage) {
            setDefaultSmsMessage(savedMessage);
        }
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const saveSettings = () => {
        localStorage.setItem('nextup_sms_message', defaultSmsMessage);
        setIsSettingsOpen(false);
    };

    useEffect(() => {
        if (!mounted) return;
        if (!restaurantId && userRole !== 'admin') return;

        fetchEntries();
        fetchPastEntries();
        fetchReservations();
        if (userRole === 'admin') {
            fetchExternalRestaurants();
            fetchExternalMappings();
        }

        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'waitlist_entries' },
                () => {
                    fetchEntries();
                    fetchPastEntries();
                }
            )
            .subscribe();

        const reservationInterval = setInterval(() => {
            fetchReservations();
        }, 10000); // Poll Tableserve reservations every 10 seconds for real-time appearance

        return () => { supabase.removeChannel(channel); clearInterval(reservationInterval); };
    }, [restaurantId, userRole, mounted]);

    useEffect(() => {
        setMounted(true);
    }, []);

    async function fetchEntries() {
        // Enforce isolation: If no restaurant ID and not global admin, return empty immediately
        if (!restaurantId && userRole !== 'admin') {
            setEntries([]);
            return;
        }

        let query = supabase
            .from('waitlist_entries')
            .select('*')
            .in('status', ['Waiting', 'Notified']);

        // RESTRICTIVE FILTERING: 
        if (userRole !== 'admin') {
            // Staff and Restaurant roles MUST have a restaurantId
            if (restaurantId) {
                query = query.eq('restaurant_id', restaurantId);
            } else {
                setEntries([]);
                return;
            }
        } else if (restaurantId && restaurantId !== 'null') {
            // Admin viewing a specific restaurant
            query = query.eq('restaurant_id', restaurantId);
        } else {
            // Admin viewing ALL (Global view)
            // No extra filter
        }

        const { data } = await query.order('created_at', { ascending: true });
        if (data) setEntries(data as WaitlistEntry[]);
    }

    async function fetchPastEntries() {
        if (!restaurantId && userRole !== 'admin') {
            setPastEntries([]);
            return;
        }

        let query = supabase
            .from('waitlist_entries')
            .select('*')
            .or('status.eq.Seated,status.eq.No Show');

        if (userRole !== 'admin') {
            if (restaurantId) {
                query = query.eq('restaurant_id', restaurantId);
            } else {
                setPastEntries([]);
                return;
            }
        } else if (restaurantId && restaurantId !== 'null') {
            query = query.eq('restaurant_id', restaurantId);
        }

        const { data, error } = await query
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) console.error("Error fetching past entries:", error);
        if (data) setPastEntries(data as WaitlistEntry[]);
    }

    const restoreParty = async (id: string) => {
        await supabase.from('waitlist_entries').update({ status: 'Waiting' }).eq('id', id);
        fetchEntries();
        fetchPastEntries();
    };

    const resetWaitlist = async () => {
        console.log("Reset Waitlist triggered");
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error("No user found for reset");
            return;
        }

        console.log("Deleting all visible entries...");
        // Using .neq with a dummy UUID to target all rows (Supabase requires at least one filter for delete)
        const { error } = await supabase
            .from('waitlist_entries')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000')
            .in('status', ['Waiting', 'Notified', 'Seated', 'No Show']);

        if (error) {
            console.error("Reset Error:", error);
            alert("Error resetting waitlist: " + error.message);
        } else {
            console.log("Reset successful");
            fetchEntries();
            fetchPastEntries();
            setIsSettingsOpen(false);
            setIsResetConfirming(false);
        }
    };

    async function fetchExternalRestaurants() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const res = await fetch("/api/external/restaurants");
            const data = await res.json();
            if (data.error) {
                console.error("[System] Error fetching external restaurants:", data.error);
                return;
            }
            if (data.restaurants) {
                console.log("[System] Fetched external restaurants:", data.restaurants.length);
                setExternalRestaurants(data.restaurants);
            }
        } catch (err) {
            console.error("[System] Crash in fetchExternalRestaurants:", err);
        }
    }

    async function fetchExternalMappings() {
        const { data } = await supabase.from('external_mappings').select('*');
        if (data) setExternalMappings(data);
    }

    async function linkExternalRestaurant(userId: string, externalRestId: string) {
        if (!userId) return;

        const restName = externalRestaurants.find(r => r.id === externalRestId)?.name || '';

        const { error } = await supabase
            .from('external_mappings')
            .upsert({
                local_restaurant_id: restaurantId || null,
                external_restaurant_id: externalRestId,
                external_restaurant_name: restName
            }, { onConflict: 'external_restaurant_id' }); // Conflict on external ID ensures we don't duplicate external links

        if (!error) {
            fetchExternalMappings();
        }
    }

    async function fetchReservations() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        console.log("[System] fetchReservations called. restaurantId:", restaurantId);

        let mapQuery = supabase.from('external_mappings').select('local_restaurant_id, external_restaurant_id');

        if (userRole !== 'admin') {
            if (!restaurantId || restaurantId === 'null') {
                setReservations([]);
                return;
            }
            mapQuery = mapQuery.eq('local_restaurant_id', restaurantId);
        } else if (restaurantId && restaurantId !== 'null') {
            // Admin assigned to a specific
            mapQuery = mapQuery.eq('local_restaurant_id', restaurantId);
        }

        const { data: mappings, error: mapError } = await mapQuery;

        if (mapError) {
            console.error("Error fetching mapping for reservations:", mapError);
            return;
        }

        if (mappings && mappings.length > 0) {
            const allExtRes: Reservation[] = [];

            for (const mapping of mappings) {
                try {
                    const res = await fetch(`/api/tableserve?restaurant_id=${mapping.external_restaurant_id}`);
                    const data = await res.json();
                    if (data.reservations) {
                        const mapped: Reservation[] = data.reservations.map((r: any) => ({
                            id: r.id,
                            name: r.guest_name,
                            size: r.party_size,
                            date_time: `${r.date}T${convertToIsoTime(r.time_slot)}`,
                            phone_number: r.guest_phone,
                            notes: r.notes,
                            created_at: r.created_at,
                            is_shared: r.is_shared,
                            local_restaurant_id: mapping.local_restaurant_id
                        }));
                        allExtRes.push(...mapped);
                    }
                } catch (err) {
                    console.error("Error fetching proxy reservations:", err);
                }
            }

            if (allExtRes.length > 0) {
                // Sort combined reservations by date/time
                allExtRes.sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());
                setReservations(allExtRes);
                return;
            }
        }

        setReservations([]);
    }

    function convertToIsoTime(timeSlot: string) {
        // e.g., "5:00 PM" -> "17:00:00"
        const [time, modifier] = timeSlot.split(' ');
        let [hours, minutes] = time.split(':');
        if (hours === '12') hours = '00';
        if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString();
        return `${hours.padStart(2, '0')}:${minutes}:00`;
    }

    async function toggleShareReservation(resId: string, currentStatus: boolean) {
        if (userRole !== 'admin') return;

        try {
            const res = await fetch('/api/external/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggle-share', resId, isShared: !currentStatus })
            });
            if (res.ok) fetchReservations();
        } catch (err) {
            console.error("Error toggling share via proxy:", err);
        }
    }

    async function handleCheckIn(res: Reservation) {
        let assignedRestaurantId = res.local_restaurant_id || restaurantId;

        if (!assignedRestaurantId) {
            alert("No restaurant assigned to this reservation.");
            return;
        }

        await supabase.from('waitlist_entries').insert([{
            party_name: res.name,
            party_size: res.size,
            phone_number: res.phone_number,
            notes: res.notes,
            quoted_time: 0,
            status: 'Waiting',
            is_tableserve: true,
            restaurant_id: assignedRestaurantId,
            user_id: (await supabase.auth.getUser()).data.user?.id
        }]);

        // Sync back to Tableserve: update reservation status to checked_in (or similar)
        try {
            await fetch('/api/external/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update-status', resId: res.id, status: 'checked_in' })
            });
        } catch (err) {
            console.error("Tableserve sync-back error:", err);
        }

        setReservations(prev => prev.filter(r => r.id !== res.id));
    }
    const effectiveAdmin = (userRole === 'admin');

    return (
        <div className="app-container">
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <img src="/nextup_logo_3d.png" alt="Nextup" className="brand-logo" />
                </div>
                <nav className="sidebar-nav">
                    <a href="#" className={`nav-item ${currentTab === 'Waitlist' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentTab('Waitlist'); }}>
                        <div className="icon-wrapper banana-glow banana-blue"><ClipboardList size={22} strokeWidth={2} /></div>
                        <span>Waitlist</span>
                    </a>
                    <a href="#" className={`nav-item ${currentTab === 'Reservations' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentTab('Reservations'); }}>
                        <div className="icon-wrapper banana-glow banana-purple"><Calendar size={22} strokeWidth={2} /></div>
                        <span>Reservations</span>
                    </a>
                    <a href="#" className={`nav-item ${currentTab === 'Recent' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentTab('Recent'); }}>
                        <div className="icon-wrapper banana-glow banana-cyan"><Clock size={22} strokeWidth={2} /></div>
                        <span>Recent</span>
                    </a>
                    <a href="#" className={`nav-item ${currentTab === 'Analytics' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentTab('Analytics'); }}>
                        <div className="icon-wrapper banana-glow banana-green"><BarChart2 size={22} strokeWidth={2} /></div>
                        <span>Analytics</span>
                    </a>
                    <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); setIsSettingsOpen(true); }}>
                        <div className="icon-wrapper banana-glow banana-gray"><Settings size={22} strokeWidth={2} /></div>
                        <span>Settings</span>
                    </a>
                    {effectiveAdmin && (
                        <a href="#" className={`nav-item ${currentTab === 'Admin' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentTab('Admin'); }}>
                            <div className="icon-wrapper banana-glow-urgent banana-orange-pulse"><ShieldAlert size={22} strokeWidth={3} /></div>
                            <span style={{ fontWeight: 900, color: '#f97316' }}>GLOBAL ADMIN</span>
                        </a>
                    )}
                    <a href="#" className="nav-item nav-logout" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
                        <div className="icon-wrapper banana-glow banana-red"><LogOut size={22} strokeWidth={2} /></div>
                        <span>Logout</span>
                    </a>
                </nav>
            </aside>

            <main className="main-area">
                <header className="top-header">
                    <div className="header-column-left">
                        <div className="header-title">
                            <h1>
                                <span style={{ color: '#fff' }}>{storeName}</span>
                                <div className="breadcrumb">
                                    <span style={{ color: '#3b82f6', fontWeight: '800', marginRight: '4px' }}>»</span>
                                    <span>{currentTab}</span>
                                </div>
                            </h1>
                            {effectiveAdmin && (
                                <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: '700', marginTop: '4px', border: '1px solid #10b981', padding: '1px 5px', borderRadius: '4px', display: 'inline-block' }}>
                                    ADMIN ACTIVE
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="header-column-center">
                        <span className="time-display">{mounted ? new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}</span>
                    </div>

                    <div className="header-column-right">
                        <div className="header-actions">
                            <div className="search-container">
                                <input type="text" placeholder="Search parties" />
                                <Search size={16} color="#888" />
                            </div>
                            <button className="btn-add-party-header banana-btn-glow" onClick={() => setIsAddOpen(true)}>
                                <Plus size={18} strokeWidth={3} />
                                <span>Add Party</span>
                            </button>
                        </div>
                    </div>
                </header>

                <div className="content-layout">
                    <div className="left-panel">
                        {currentTab === 'Waitlist' && <WaitlistTable entries={entries} defaultSmsMessage={defaultSmsMessage} />}

                        {currentTab === 'Reservations' && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2rem 2rem 1rem' }}>
                                    <h2 style={{ margin: 0, fontFamily: 'var(--font-playfair)', fontSize: '1.5rem', color: 'var(--text-primary)' }}>
                                        {resFilter === 'week' ? "This Week's" : "This Month's"} Reservations
                                    </h2>
                                    <div className="filter-toggle" style={{ display: 'flex', background: '#f1f5f9', padding: '0.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <button
                                            onClick={() => setResFilter('week')}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                borderRadius: '6px',
                                                border: 'none',
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                background: resFilter === 'week' ? 'white' : 'transparent',
                                                color: resFilter === 'week' ? '#3b82f6' : '#64748b',
                                                boxShadow: resFilter === 'week' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            Week
                                        </button>
                                        <button
                                            onClick={() => setResFilter('month')}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                borderRadius: '6px',
                                                border: 'none',
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                background: resFilter === 'month' ? 'white' : 'transparent',
                                                color: resFilter === 'month' ? '#3b82f6' : '#64748b',
                                                boxShadow: resFilter === 'month' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            Month
                                        </button>
                                    </div>
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ padding: '1rem 2rem', borderBottom: '2px solid var(--table-border)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>PARTY</th>
                                            <th style={{ padding: '1rem 2rem', borderBottom: '2px solid var(--table-border)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>SIZE</th>
                                            <th style={{ padding: '1rem 2rem', borderBottom: '2px solid var(--table-border)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>DATE CREATED</th>
                                            <th style={{ padding: '1rem 2rem', borderBottom: '2px solid var(--table-border)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>DATE & TIME</th>
                                            {userRole === 'admin' && <th style={{ padding: '1rem 2rem', borderBottom: '2px solid var(--table-border)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>SHARED</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reservations
                                            .filter(res => {
                                                const resDate = new Date(res.date_time);
                                                const now = new Date();
                                                const diffDays = (resDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                                                if (resFilter === 'week') return diffDays >= -1 && diffDays <= 7;
                                                return diffDays >= -1 && diffDays <= 30;
                                            })
                                            .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime())
                                            .length === 0 ? (
                                            <tr><td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>No reservations for this period.</td></tr>
                                        ) : null}
                                        {reservations
                                            .filter(res => {
                                                const resDate = new Date(res.date_time);
                                                const now = new Date();
                                                const diffDays = (resDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                                                if (resFilter === 'week') return diffDays >= -1 && diffDays <= 7;
                                                return diffDays >= -1 && diffDays <= 30;
                                            })
                                            .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime())
                                            .map(res => (
                                                <tr key={res.id} style={{ borderBottom: '1px solid var(--table-border)' }}>
                                                    <td style={{ padding: '1rem 2rem' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{res.name}</strong>
                                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{res.phone_number || 'No Phone'}</span>
                                                            {res.notes && <span style={{ fontSize: '0.75rem', color: '#8b5cf6', marginTop: '2px', fontStyle: 'italic' }}>Note: {res.notes}</span>}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem 2rem' }}><span style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{res.size}</span></td>
                                                    <td style={{ padding: '1rem 2rem', color: 'var(--text-secondary)' }}>{res.created_at ? new Date(res.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '-'}</td>
                                                    <td style={{ padding: '1rem 2rem', color: 'var(--text-secondary)' }}>{new Date(res.date_time).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
                                                    {userRole === 'admin' && (
                                                        <td style={{ padding: '1rem 2rem' }}>
                                                            <button
                                                                onClick={() => toggleShareReservation(res.id, !!res.is_shared)}
                                                                style={{
                                                                    padding: '0.4rem 0.8rem',
                                                                    borderRadius: '8px',
                                                                    border: 'none',
                                                                    background: res.is_shared ? '#dcfce7' : '#fee2e2',
                                                                    color: res.is_shared ? '#166534' : '#991b1b',
                                                                    fontWeight: '600',
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.75rem'
                                                                }}
                                                            >
                                                                {res.is_shared ? 'SHARED' : 'HIDDEN'}
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {currentTab === 'Recent' && (
                            <div>
                                <h2 style={{ padding: '2rem 2rem 1rem', margin: 0, fontFamily: 'var(--font-playfair)', fontSize: '1.5rem', color: 'var(--text-primary)' }}>Recent Activity</h2>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ padding: '1rem 2rem', borderBottom: '2px solid var(--table-border)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>PARTY</th>
                                            <th style={{ padding: '1rem 2rem', borderBottom: '2px solid var(--table-border)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>SIZE</th>
                                            <th style={{ padding: '1rem 2rem', borderBottom: '2px solid var(--table-border)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>STATUS</th>
                                            <th style={{ padding: '1rem 2rem', borderBottom: '2px solid var(--table-border)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>TIME ADDED</th>
                                            <th style={{ padding: '1rem 2rem', borderBottom: '2px solid var(--table-border)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>TIME SEATED / CANCELED</th>
                                            <th style={{ padding: '1rem 2rem', borderBottom: '2px solid var(--table-border)', color: 'var(--text-primary)', fontSize: '0.85rem', textAlign: 'center' }}>ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pastEntries.length === 0 ? (
                                            <tr><td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>No recent activity.</td></tr>
                                        ) : null}
                                        {pastEntries.map(entry => (
                                            <tr key={entry.id} style={{ borderBottom: '1px solid var(--table-border)' }}>
                                                <td style={{ padding: '1rem 2rem' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{entry.party_name}</strong>
                                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{entry.phone_number || 'No Phone'}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem 2rem' }}><span style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{entry.party_size}</span></td>
                                                <td style={{ padding: '1rem 2rem' }}>
                                                    <span style={{
                                                        padding: '4px 8px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold',
                                                        backgroundColor: entry.status === 'Seated' ? '#dcfce7' : entry.status === 'No Show' ? '#fee2e2' : '#f1f5f9',
                                                        color: entry.status === 'Seated' ? '#166534' : entry.status === 'No Show' ? '#991b1b' : '#475569'
                                                    }}>
                                                        {entry.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem 2rem', color: 'var(--text-secondary)' }}>{new Date(entry.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</td>
                                                <td style={{ padding: '1rem 2rem', color: 'var(--text-secondary)' }}>{new Date(entry.updated_at || entry.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</td>
                                                <td style={{ padding: '1rem 2rem', textAlign: 'center' }}>
                                                    <button onClick={() => restoreParty(entry.id)} style={{ padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)' }}
                                                        onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 15px rgba(59, 130, 246, 0.4)'; }}
                                                        onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(59, 130, 246, 0.3)'; }}
                                                    >Restore</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {currentTab === 'Analytics' && (
                            <div style={{ padding: '2rem' }}>
                                <h2 style={{ margin: '0 0 1.5rem', fontFamily: 'var(--font-playfair)', fontSize: '1.5rem', color: 'var(--text-primary)' }}>Today's Insights</h2>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                    <div className="metric-card banana-glow banana-blue" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--table-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{pastEntries.filter(e => e.status === 'Seated').length}</span>
                                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '0.5rem' }}>Total Seated</span>
                                    </div>
                                    <div className="metric-card banana-glow banana-red" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--table-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{pastEntries.filter(e => e.status === 'No Show').length}</span>
                                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '0.5rem' }}>Total No Shows</span>
                                    </div>
                                    <div className="metric-card banana-glow banana-green" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--table-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{entries.length}</span>
                                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '0.5rem' }}>Currently Waiting</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentTab === 'Admin' && effectiveAdmin && (
                            <div style={{ padding: '0 0 4rem' }}>
                                <div style={{ borderBottom: '1px solid var(--table-border)', marginBottom: '2rem', padding: '2rem 2rem 1.5rem', background: '#f8fafc' }}>
                                    <h2 style={{ margin: 0, fontFamily: 'var(--font-playfair)', fontSize: '1.75rem', color: 'var(--text-primary)' }}>Restaurant & System Management</h2>
                                    <p style={{ margin: '0.5rem 0 1.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Create restaurants and connect them to external reservation systems.</p>

                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                        <button
                                            onClick={() => setIsCreateRestoOpen(true)}
                                            style={{
                                                padding: '0.85rem 1.5rem',
                                                backgroundColor: '#10b981',
                                                color: 'white',
                                                borderRadius: '10px',
                                                fontSize: '1rem',
                                                fontWeight: '800',
                                                border: 'none',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.6rem',
                                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                            onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
                                        >
                                            <UtensilsCrossed size={20} />
                                            + Add New Restaurant
                                        </button>

                                        <Link
                                            href="/admin/mappings"
                                            style={{
                                                padding: '0.85rem 1.5rem',
                                                backgroundColor: '#3b82f6',
                                                color: 'white',
                                                borderRadius: '10px',
                                                fontSize: '1rem',
                                                fontWeight: '800',
                                                border: 'none',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.6rem',
                                                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                                                textDecoration: 'none',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                            onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
                                        >
                                            <ArrowLeftRight size={20} />
                                            Manage Reservation Mappings
                                        </Link>

                                        <button
                                            onClick={async () => {
                                                try {
                                                    const res = await fetch("/api/external/restaurants");
                                                    const data = await res.json();
                                                    if (!data.error) alert("Connection Successful! TableServe proxy is communicating. Found " + (data.restaurants?.length || 0) + " restaurants.");
                                                    else alert("Connection Failed: " + data.error);
                                                } catch (e) {
                                                    alert("Connection Error: " + (e as any).message);
                                                }
                                            }}
                                            style={{
                                                padding: '0.85rem 1.5rem',
                                                backgroundColor: '#8b5cf6',
                                                color: 'white',
                                                borderRadius: '10px',
                                                fontSize: '1rem',
                                                fontWeight: '800',
                                                border: 'none',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.6rem',
                                                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <Globe size={20} />
                                            Test TableServe Sync
                                        </button>
                                    </div>
                                </div>

                                <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                    <div className="metric-card banana-glow banana-blue" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--table-border)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{allRestaurants.length}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Total Stores</span>
                                    </div>
                                    <div className="metric-card banana-glow banana-green" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--table-border)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{profilesList.length}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Active Users</span>
                                    </div>
                                    <div className="metric-card banana-glow banana-orange" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--table-border)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{externalMappings.length}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Tablereserve Links</span>
                                    </div>
                                </div>


                                <div style={{ borderTop: '4px solid var(--table-border)', paddingTop: '2rem', marginBottom: '4rem' }}>
                                    <h2 style={{ padding: '0 2rem 0.5rem', margin: 0, fontFamily: 'var(--font-playfair)', fontSize: '1.5rem', color: 'var(--text-primary)' }}>Staff Management & Restaurant Assignment</h2>
                                    <p style={{ padding: '0 2rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Assign staff and admins to restaurants.</p>

                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ padding: '1rem 2rem', borderBottom: '2px solid var(--table-border)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>STAFF / ADMIN</th>
                                                <th style={{ padding: '1rem 2rem', borderBottom: '2px solid var(--table-border)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>EMAIL</th>
                                                <th style={{ padding: '1rem 2rem', borderBottom: '2px solid var(--table-border)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>ROLE</th>
                                                <th style={{ padding: '1rem 2rem', borderBottom: '2px solid var(--table-border)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>ASSIGNED RESTAURANT</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {profilesList.length === 0 ? (
                                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>No profiles found.</td></tr>
                                            ) : null}
                                            {profilesList.map(profile => (
                                                <tr key={profile.id} style={{ borderBottom: '1px solid var(--table-border)' }}>
                                                    <td style={{ padding: '1.25rem 2rem' }}><strong style={{ color: 'var(--text-primary)' }}>{profile.name}</strong></td>
                                                    <td style={{ padding: '1.25rem 2rem' }}><span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{profile.email}</span></td>
                                                    <td style={{ padding: '1.25rem 2rem' }}>
                                                        <select
                                                            value={profile.role || 'restaurant'}
                                                            onChange={async (e) => {
                                                                const newRole = e.target.value;
                                                                const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', profile.id);
                                                                if (!error) window.location.reload();
                                                            }}
                                                            style={{
                                                                padding: '0.4rem 0.8rem',
                                                                borderRadius: '8px',
                                                                border: '1px solid var(--table-border)',
                                                                background: '#fff',
                                                                fontSize: '0.85rem',
                                                                fontWeight: '600',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <option value="restaurant">Restaurant</option>
                                                            <option value="staff">Staff</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: '1.25rem 2rem' }}>
                                                        <select
                                                            value={profile.restaurant_id || ''}
                                                            onChange={async (e) => {
                                                                const resId = e.target.value || null;
                                                                await supabase.from('profiles').update({ restaurant_id: resId }).eq('id', profile.id);
                                                                window.location.reload();
                                                            }}
                                                            style={{
                                                                padding: '0.5rem 1rem',
                                                                borderRadius: '8px',
                                                                border: '1px solid var(--table-border)',
                                                                background: '#fff',
                                                                fontWeight: '600',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <option value="">-- Unassigned --</option>
                                                            {allRestaurants.map(r => (
                                                                <option key={r.id} value={r.id}>{r.name}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div style={{ borderTop: '4px solid var(--table-border)', paddingTop: '2rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2rem 1.5rem' }}>
                                        <div>
                                            <h2 style={{ margin: 0, fontFamily: 'var(--font-playfair)', fontSize: '1.5rem', color: 'var(--text-primary)' }}>External Connections</h2>
                                            <p style={{ margin: '0.2rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Linked to the Tablereserve project.</p>
                                        </div>
                                    </div>

                                    <div style={{ padding: '0 2rem' }}>
                                        <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                                            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#1e293b' }}>Linked Restaurants ({externalMappings.length})</h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                                {externalRestaurants.map(ext => {
                                                    const isLinked = externalMappings.some(m => m.external_restaurant_id === ext.id);
                                                    return (
                                                        <div key={ext.id} style={{
                                                            padding: '1rem',
                                                            borderRadius: '12px',
                                                            background: 'white',
                                                            border: '1px solid #f1f5f9',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                                        }}>
                                                            <div>
                                                                <strong style={{ display: 'block', color: '#0f172a' }}>{ext.name}</strong>
                                                                <span style={{ fontSize: '0.75rem', color: isLinked ? '#10b981' : '#f59e0b', fontWeight: '600' }}>
                                                                    {isLinked ? '● Connected' : '● Not Connected'}
                                                                </span>
                                                            </div>
                                                            {isLinked ? null : (
                                                                <button
                                                                    onClick={async () => {
                                                                        const matched = allRestaurants.find(r => r.name.toLowerCase().includes(ext.name.toLowerCase()) || ext.name.toLowerCase().includes(r.name.toLowerCase()));
                                                                        if (matched) {
                                                                            await supabase.from('external_mappings').insert({
                                                                                local_restaurant_id: matched.id,
                                                                                external_restaurant_id: ext.id,
                                                                                external_restaurant_name: ext.name
                                                                            });
                                                                            fetchExternalMappings();
                                                                            fetchReservations();
                                                                        } else {
                                                                            alert("Could not find a matching local restaurant for " + ext.name);
                                                                        }
                                                                    }}
                                                                    style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#1e293b', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                                                                >
                                                                    Auto-Link
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                {externalRestaurants.length === 0 && (
                                                    <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#64748b' }}>No external restaurants found.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {currentTab !== 'Admin' && (
                        <aside className="right-panel">
                            <div className="side-card">
                                <h3 style={{ textAlign: 'center' }}>Incoming Reservations</h3>
                                <div className="integration-logo" style={{ justifyContent: 'center' }}>
                                    <div className="logo-circle">
                                        <UtensilsCrossed size={14} color="white" strokeWidth={2.5} />
                                    </div>
                                    <span className="logo-text">Tablereserve</span>
                                </div>
                                <div className="reservation-list">
                                    {reservations.length === 0 && <p style={{ color: '#888', fontStyle: 'italic', fontSize: '0.9rem' }}>No incoming reservations.</p>}
                                    {reservations.map(res => (
                                        <div key={res.id} className="reservation-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div className="res-info" style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                                                <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{res.name}</span>
                                                    <span style={{ flexShrink: 0, color: '#3b82f6', fontSize: '0.85rem' }}>({res.size} Guests)</span>
                                                </strong>
                                                <span style={{ color: '#64748b', display: 'block' }}>{new Date(res.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <button onClick={() => handleCheckIn(res)} className="btn-checkin" style={{ flexShrink: 0 }}>Check-in</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </aside>
                    )}
                </div>

                <footer className="app-footer">
                    <div className="footer-section">
                        <span>Powered by</span>
                        <img src="/conect-r-logo.png" alt="Conect-R" className="footer-logo" />
                    </div>
                    <span className="footer-divider">|</span>
                    <div className="footer-section">
                        <img src="/nextup_logo_3d.png" alt="Nextup" className="footer-logo nextup-footer-logo" />
                        <span>Nextup is a product of Conect-R LLC</span>
                    </div>
                </footer>
            </main>

            {isAddOpen && <AddPartyForm
                onClose={() => setIsAddOpen(false)}
                onCreated={() => {
                    fetchEntries();
                    setIsAddOpen(false);
                }}
                restaurantId={restaurantId}
                isAllAdmin={userRole === 'admin'}
            />}

            {isCreateRestoOpen && (
                <CreateRestaurantForm
                    onClose={() => setIsCreateRestoOpen(false)}
                    onCreated={() => {
                        window.location.reload();
                    }}
                />
            )}

            {isSettingsOpen && (
                <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>Settings</h2>
                        <div className="settings-section">
                            <label>Store Name</label>
                            <input
                                type="text"
                                value={storeName}
                                onChange={(e) => setStoreName(e.target.value)}
                                className="settings-input"
                            />

                            <label>Default Quote Time</label>
                            <select className="settings-input" defaultValue="15">
                                {Array.from({ length: 36 }, (_, i) => (i + 1) * 5).map(min => (
                                    <option key={min} value={min}>
                                        {min >= 60 ? `${Math.floor(min / 60)} hr ${min % 60 > 0 ? min % 60 + ' min' : ''}`.trim() : `${min} min`}
                                    </option>
                                ))}
                            </select>

                            <label>Automated SMS Message</label>
                            <textarea
                                value={defaultSmsMessage}
                                onChange={(e) => setDefaultSmsMessage(e.target.value)}
                                className="settings-input"
                                rows={3}
                            />

                            <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '2px solid #fee2e2' }}>
                                {!isResetConfirming ? (
                                    <button
                                        onClick={() => setIsResetConfirming(true)}
                                        style={{
                                            width: '100%',
                                            padding: '0.85rem',
                                            background: '#ef4444',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = '#dc2626'}
                                        onMouseOut={(e) => e.currentTarget.style.background = '#ef4444'}
                                    >
                                        Reset Today's Waitlist
                                    </button>
                                ) : (
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                            This action can not be undone and all info will be erased
                                        </p>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => setIsResetConfirming(false)}
                                                style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontWeight: '600', cursor: 'pointer' }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={resetWaitlist}
                                                style={{ flex: 2, padding: '0.75rem', borderRadius: '8px', border: 'none', background: '#dc2626', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                                            >
                                                CONFIRM RESET
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => {
                                const saved = localStorage.getItem('nextup_sms_message');
                                if (saved) setDefaultSmsMessage(saved);
                                setIsSettingsOpen(false);
                            }}>Cancel</button>
                            <button className="btn-close" onClick={saveSettings}>Save & Close</button>
                        </div>
                    </div>
                </div>
            )
            }

            <style jsx>{`
        .app-container {
            display: flex;
            height: 100vh;
            overflow: hidden;
            background-color: var(--background-color);
        }
        
        /* Sidebar Styling */
        .sidebar {
            width: 150px;
            background-color: var(--sidebar-bg);
            display: flex;
            flex-direction: column;
            align-items: center;
            padding-top: 1.5rem;
            z-index: 10;
        }
        .sidebar-logo {
            margin-bottom: 2rem;
            display: flex;
            justify-content: center;
            width: 100%;
        }
        .brand-logo {
            width: 100px;
            height: 100px;
            border-radius: 20px;
            object-fit: cover;
            box-shadow: 0 8px 25px rgba(0, 195, 255, 0.5), inset 0 2px 5px rgba(255, 255, 255, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .sidebar-nav {
            display: flex;
            flex-direction: column;
            width: 100%;
            gap: 1rem;
        }
        .nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 0.5rem 0;
            color: var(--sidebar-text);
            text-decoration: none;
            gap: 0.5rem;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .nav-item span {
            font-size: 0.75rem;
            font-weight: 600;
        }
        .icon-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.03);
            transition: all 0.3s;
            border: 1px solid rgba(255,255,255,0.05);
        }
        .nav-item:hover .icon-wrapper {
            transform: translateY(-2px);
            filter: brightness(1.2);
        }
        .nav-item.active .icon-wrapper {
            background: linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(37,99,235,0.4) 100%);
            border-color: rgba(59,130,246,0.5);
            box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4), inset 0 1px 3px rgba(255,255,255,0.2);
            color: white;
        }
        .nav-item.active {
            color: white;
        }
        
        /* Nanobanana Pop-Out Styles */
        .banana-glow.banana-blue     { color: #60a5fa; box-shadow: 0 4px 15px rgba(96, 165, 250, 0.2); }
        .banana-glow.banana-purple   { color: #c084fc; box-shadow: 0 4px 15px rgba(192, 132, 252, 0.2); }
        .banana-glow.banana-cyan     { color: #2dd4bf; box-shadow: 0 4px 15px rgba(45, 212, 191, 0.2); }
        .banana-glow.banana-green    { color: #4ade80; box-shadow: 0 4px 15px rgba(74, 222, 128, 0.2); }
        .banana-glow.banana-gray     { color: #94a3b8; box-shadow: 0 4px 15px rgba(148, 163, 184, 0.2); }
        .banana-glow.banana-red      { color: #f87171; box-shadow: 0 4px 15px rgba(248, 113, 113, 0.2); }

        .nav-logout { margin-top: auto; padding-bottom: 2rem; }

        /* Main Area inside Dashboard */
        .main-area {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* Top Blue Header */
        .top-header {
            background-color: var(--sidebar-bg);
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 2rem;
            height: 150px;
            position: relative;
        }
        .header-column-left {
            flex: 1 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: flex-start !important;
            min-width: 0 !important;
        }
        .header-column-center {
            flex: 0 0 auto !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            width: 350px !important; /* Fixed space for the massive clock */
        }
        .header-column-right {
            flex: 1 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: flex-end !important;
            min-width: 0 !important;
        }
        .header-title {
            display: flex;
            align-items: center;
            gap: 1.5rem;
            min-width: 0;
            overflow: hidden;
        }
        .time-display {
            font-weight: 800;
            font-size: 3.5rem;
            color: #fff;
            text-shadow: 0 0 30px rgba(255, 255, 255, 0.4);
            white-space: nowrap;
        }
        .header-title h1 {
            margin: 0 !important;
            font-size: 1.4rem !important;
            font-weight: 800 !important;
            display: flex !important;
            flex-direction: column !important; /* Stack name and breadcrumb to save horizontal space */
            align-items: flex-start !important;
            gap: 0 !important;
            line-height: 1.2 !important;
        }
        .header-title .breadcrumb {
            font-size: 0.9rem;
            font-weight: 400;
            color: rgba(255,255,255,0.7);
        }
        .waitlist-count {
            background-color: rgba(255,255,255,0.2);
            padding: 0.2rem 0.6rem;
            border-radius: 12px;
            font-size: 0.9rem;
            font-weight: bold;
        }
        .header-actions {
            display: flex;
            align-items: center;
            gap: 1.5rem;
        }
        .search-container {
            display: flex;
            background-color: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 20px;
            padding: 0.5rem 1rem;
            align-items: center;
            width: 250px;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
            transition: all 0.3s;
        }
        .search-container:focus-within {
            background-color: rgba(255,255,255,0.2);
            border-color: rgba(255,255,255,0.4);
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
        }
        .search-container input {
            border: none;
            outline: none;
            background: transparent;
            width: 100%;
            font-size: 0.95rem;
            padding: 0.2rem;
            color: white;
        }
        .search-container input::placeholder {
            color: rgba(255,255,255,0.6);
        }
        .btn-add-party-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            color: white;
            border: none;
            border-radius: 24px;
            padding: 0.6rem 1.2rem;
            font-weight: 700;
            font-size: 1rem;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4), inset 0 2px 4px rgba(255,255,255,0.3);
            text-shadow: 0 1px 2px rgba(0,0,0,0.2);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-add-party-header:hover {
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 6px 20px rgba(34, 197, 94, 0.6), inset 0 2px 4px rgba(255,255,255,0.4);
            filter: brightness(1.1);
        }

        /* Lists and layout */
        .content-layout {
            display: flex;
            flex: 1;
            overflow: hidden;
        }
        .left-panel {
            flex: 1;
            overflow-y: auto;
            position: relative;
            background-color: white;
        }
        .right-panel {
            width: 320px;
            background-color: #f8fafc;
            border-left: 1px solid var(--table-border);
            overflow-y: auto;
            padding: 1.5rem;
        }

        /* Footer */
        .app-footer {
            margin-top: auto;
            padding: 1rem;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 2rem;
            background-color: white;
            border-top: 1px solid var(--table-border);
            font-size: 0.85rem;
            color: #64748b;
        }
        .footer-section {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            font-weight: 500;
        }
        .footer-logo {
            height: 24px;
            object-fit: contain;
        }
        .nextup-footer-logo {
            height: 28px;
            border-radius: 4px;
        }
        .footer-divider {
            color: #cbd5e1;
        }
        /* Removed FAB */

        /* Right Panel Cards */
        .side-card {
          background-color: white;
          border-radius: 8px;
          padding: 1.2rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          border: 1px solid var(--table-border);
        }
        .side-card h3 { margin: 0 0 1rem 0; font-size: 1rem; color: var(--text-primary); }
        .integration-logo {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          margin-bottom: 1rem;
        }
        .logo-circle {
          background-color: #ba3228;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logo-text {
          font-family: var(--font-playfair), serif;
          font-size: 1.1rem;
          font-weight: 700;
          letter-spacing: -0.5px;
          color: #1a1a1a;
        }
        
        .reservation-item { display: flex; justify-content: space-between; align-items: center; padding: 0.8rem 0; border-bottom: 1px solid var(--table-border); }
        .reservation-item:last-child { border-bottom: none; padding-bottom: 0; }
        .res-info { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem; }
        .btn-checkin { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 0.35rem 0.75rem; border: none; border-radius: 6px; font-weight: 600; font-size: 0.8rem; cursor: pointer; box-shadow: 0 2px 5px rgba(59, 130, 246, 0.3); transition: all 0.2s; }
        .btn-checkin:hover { transform: translateY(-1px); box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4); filter: brightness(1.1); }

        /* Modal Settings Override */
        .modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: rgba(15, 23, 42, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        .modal-content {
            background-color: white;
            padding: 2rem;
            border-radius: 12px;
            width: 400px;
            max-width: 90vw;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }
        .modal-content h2 { margin-top: 0; margin-bottom: 1.5rem; }
        .settings-section { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem; }
        .settings-section label { font-weight: 600; font-size: 0.9rem; margin-bottom: -0.5rem; }
        .settings-input { padding: 0.75rem; border: 1px solid var(--table-border); border-radius: 6px; font-family: inherit; width: 100%; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 1rem; }
        .btn-cancel { background: transparent; color: #64748b; padding: 0.75rem 1.5rem; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.2s; }
        .btn-cancel:hover { background: #f1f5f9; color: #475569; }
        .btn-close { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.2s; }
        .btn-close:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 4px 10px rgba(34, 197, 94, 0.3); }
        
        @media (max-width: 1024px) {
            .content-layout {
                flex-direction: column;
                overflow-y: auto;
            }
            .left-panel {
                flex: none;
                overflow-y: visible;
                min-height: 500px;
            }
            .right-panel {
                width: 100%;
                flex: none;
                overflow-y: visible;
                border-left: none;
                border-top: 1px solid var(--table-border);
            }
        }
        
        @media (max-width: 768px) {
            .dashboard-container {
                flex-direction: column;
            }
            .sidebar {
                width: 100%;
                height: auto;
                flex-direction: row;
                padding: 0.5rem;
                justify-content: space-between;
                align-items: center;
                border-right: none;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            .sidebar-logo {
                margin: 0;
                width: auto;
                display: none;
            }
            .sidebar-nav {
                flex-direction: row;
                gap: 0.5rem;
                justify-content: center;
                width: auto;
                flex: 1;
            }
            .nav-item {
                flex: 1;
                max-width: 80px;
            }
            .nav-item span {
                display: none;
            }
            .nav-logout {
                margin: 0;
                padding: 0;
                width: auto;
                flex: 0;
            }
            .top-header {
                height: auto;
                flex-direction: column;
                gap: 1rem;
                align-items: flex-start;
                padding: 1rem;
            }
            .header-actions {
                width: 100%;
                justify-content: space-between;
                flex-wrap: wrap;
            }
            .search-container {
                width: 100%;
                order: 2;
                margin-top: 0.5rem;
            }
            .btn-add-party-header {
                order: 1;
                width: 100%;
                justify-content: center;
            }
            .app-footer {
                flex-direction: column;
                gap: 1rem;
                text-align: center;
            }
            .modal-content {
                padding: 1.5rem;
            }
        }
      `}</style>
            <style jsx global>{`
                .banana-orange-pulse {
                    animation: banana-pulse 2s infinite;
                    border: 2px solid #f97316 !important;
                    background: rgba(249, 115, 22, 0.2) !important;
                }
                .banana-glow-urgent {
                    box-shadow: 0 0 15px rgba(249, 115, 22, 0.6) !important;
                }
                @keyframes banana-pulse {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.7); }
                    70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(249, 115, 22, 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
                }
            `}</style>
        </div>
    );
}
