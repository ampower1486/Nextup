'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Plus, Trash2, CheckCircle2, AlertCircle, Clock, Ban, Settings2, Pencil, MousePointer2 } from 'lucide-react';

const supabase = createClient();

type TableShape = 'rectangle' | 'circle';
type TableStatus = 'available' | 'occupied' | 'dirty' | 'reserved';

interface RestaurantTable {
    id: string;
    table_number: string;
    seats: number;
    shape: TableShape;
    status: TableStatus;
    pos_x: number;
    pos_y: number;
    width: number;
    height: number;
    restaurant_id: string;
    floor_plan_name?: string;
}

interface RestaurantWall {
    id: string;
    start_x: number;
    start_y: number;
    end_x: number;
    end_y: number;
    thickness: number;
    color: string;
    restaurant_id: string;
    floor_plan_name?: string;
}

interface FloorPlanProps {
    restaurantId: string | null;
}

export default function FloorPlan({ restaurantId }: FloorPlanProps) {
    const [tables, setTables] = useState<RestaurantTable[]>([]);
    const [walls, setWalls] = useState<RestaurantWall[]>([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editTool, setEditTool] = useState<'tables' | 'walls'>('tables');
    const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
    const [activePlan, setActivePlan] = useState<string>('Main');
    const [floorPlans, setFloorPlans] = useState<string[]>(['Main']);
    const canvasRef = useRef<HTMLDivElement>(null);

    // Drawing Wall states
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingStart, setDrawingStart] = useState<{ x: number, y: number } | null>(null);
    const [drawingEnd, setDrawingEnd] = useState<{ x: number, y: number } | null>(null);
    const [wallColor, setWallColor] = useState('#334155');
    const [wallThickness, setWallThickness] = useState(8);

    // Form states
    const [newTableNum, setNewTableNum] = useState('');
    const [newTableSeats, setNewTableSeats] = useState(2);
    const [newTableShape, setNewTableShape] = useState<TableShape>('rectangle');

    useEffect(() => {
        if (!restaurantId || restaurantId === 'null') {
            setTables([]);
            return;
        }

        fetchTables();
        fetchWalls();

        const channel = supabase
            .channel('floor-plan-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'restaurant_tables', filter: `restaurant_id=eq.${restaurantId}` },
                () => {
                    fetchTables();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'restaurant_walls', filter: `restaurant_id=eq.${restaurantId}` },
                () => {
                    fetchWalls();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [restaurantId]);

    const fetchWalls = async () => {
        if (!restaurantId) return;
        const { data, error } = await supabase
            .from('restaurant_walls')
            .select('*')
            .eq('restaurant_id', restaurantId);

        if (error) {
            console.error('Error fetching walls:', error);
            return;
        }
        if (data) {
            setWalls(data);
        }
    };

    const fetchTables = async () => {
        if (!restaurantId) return;
        const { data, error } = await supabase
            .from('restaurant_tables')
            .select('*')
            .eq('restaurant_id', restaurantId);

        if (error) {
            console.error('Error fetching tables:', error);
            // If the table doesn't exist yet, we silently ignore.
            return;
        }
        if (data) {
            setTables(data);
            const plans = new Set<string>();
            data.forEach((t: any) => {
                if (t.floor_plan_name) plans.add(t.floor_plan_name);
            });
            if (plans.size === 0) plans.add('Main');

            const plansArray = Array.from(plans);
            setFloorPlans(prev => {
                const combined = new Set([...prev, ...plansArray]);
                return Array.from(combined);
            });
        }
    };

    const handleAddTable = async () => {
        if (!restaurantId || !newTableNum.trim()) return;

        const newTable = {
            table_number: newTableNum.trim(),
            seats: Number(newTableSeats),
            shape: newTableShape,
            status: 'available' as TableStatus,
            pos_x: 50,
            pos_y: 50,
            width: newTableShape === 'circle' ? 80 : 100,
            height: 80,
            restaurant_id: restaurantId,
            floor_plan_name: activePlan
        };

        const { error } = await supabase.from('restaurant_tables').insert([newTable]);
        if (error) {
            if (error.code === '42P01' || error.message?.includes('schema cache')) {
                alert('Table "restaurant_tables" does not exist yet. Please run the provided SQL in your Supabase SQL Editor to create it.');
            } else if (error.code === '42703' || error.message?.includes('floor_plan_name')) {
                alert(`Support for multiple floor plans requires a database update!\n\nPlease run this SQL in your Supabase dashboard:\n\nALTER TABLE restaurant_tables ADD COLUMN floor_plan_name text DEFAULT 'Main';`);
            } else {
                console.error(error);
                alert("Error adding table: " + error.message);
            }
        } else {
            setNewTableNum('');
            fetchTables();
        }
    };

    const handleDeleteTable = async (id: string) => {
        if (!confirm('Are you sure you want to delete this table?')) return;
        await supabase.from('restaurant_tables').delete().eq('id', id);
        if (selectedTable?.id === id) setSelectedTable(null);
        fetchTables();
    };

    const handleDeleteWall = async (id: string) => {
        if (!confirm('Delete this wall?')) return;
        await supabase.from('restaurant_walls').delete().eq('id', id);
        fetchWalls();
    };

    const handleUpdateStatus = async (id: string, status: TableStatus) => {
        // Optimistic UI update
        setTables(prev => prev.map(t => t.id === id ? { ...t, status } : t));
        setSelectedTable(null);

        await supabase.from('restaurant_tables').update({ status }).eq('id', id);
    };

    const handleDragEnd = async (id: string, newX: number, newY: number) => {
        setTables(prev => prev.map(t => t.id === id ? { ...t, pos_x: newX, pos_y: newY } : t));
        await supabase.from('restaurant_tables').update({ pos_x: newX, pos_y: newY }).eq('id', id);
    };

    const getStatusColor = (status: TableStatus) => {
        switch (status) {
            case 'available': return { bg: '#dcfce7', border: '#86efac', text: '#166534' }; // Green
            case 'occupied': return { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' }; // Red
            case 'dirty': return { bg: '#fef3c7', border: '#fde047', text: '#854d0e' }; // Yellow
            case 'reserved': return { bg: '#f3f4f6', border: '#d1d5db', text: '#374151' }; // Gray
            default: return { bg: '#ffffff', border: '#e5e7eb', text: '#000000' };
        }
    };

    if (!restaurantId || restaurantId === 'null') {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                <h2>Floor Plan</h2>
                <p>Please select a restaurant to view the floor plan.</p>
            </div>
        );
    }

    const currentPlanTables = tables.filter(t => (t.floor_plan_name || 'Main') === activePlan);
    const currentPlanWalls = walls.filter(w => (w.floor_plan_name || 'Main') === activePlan);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
            {/* Toolbar */}
            <div style={{
                padding: '1rem 2rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                background: 'white'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 style={{ margin: 0, fontFamily: 'var(--font-playfair)', fontSize: '1.5rem', color: 'var(--text-primary)' }}>
                            Floor Plan
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {isEditMode ? 'Design your layout by dragging tables.' : 'Live view of your dining room status.'}
                        </p>
                    </div>

                    {/* Floor Plan Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '0.5rem' }}>
                        <select
                            value={activePlan}
                            onChange={e => {
                                if (e.target.value === 'NEW_PLAN') {
                                    const name = prompt('Enter a name for the new floor plan (e.g. Patio, Second Floor):');
                                    if (name && name.trim()) {
                                        setFloorPlans(prev => [...prev, name.trim()]);
                                        setActivePlan(name.trim());
                                    } else {
                                        // Reset to previously active plan if cancelled
                                        setActivePlan(activePlan);
                                    }
                                } else {
                                    setActivePlan(e.target.value);
                                    setSelectedTable(null);
                                }
                            }}
                            style={{
                                padding: '0.5rem 0.8rem',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontWeight: 700,
                                color: '#3b82f6',
                                background: '#f8fafc',
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            {floorPlans.map(p => <option key={p} value={p}>{p}</option>)}
                            <option value="NEW_PLAN">+ Create New Plan</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {isEditMode && (
                        <div style={{ display: 'flex', gap: '0.5rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', marginRight: '0.5rem' }}>
                                <button
                                    onClick={() => setEditTool('tables')}
                                    style={{
                                        padding: '0.5rem 0.75rem',
                                        background: editTool === 'tables' ? '#e2e8f0' : 'white',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        fontWeight: editTool === 'tables' ? 'bold' : 'normal'
                                    }}
                                >
                                    <MousePointer2 size={16} /> Tables
                                </button>
                                <button
                                    onClick={() => {
                                        setEditTool('walls');
                                        setSelectedTable(null);
                                    }}
                                    style={{
                                        padding: '0.5rem 0.75rem',
                                        background: editTool === 'walls' ? '#e2e8f0' : 'white',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        fontWeight: editTool === 'walls' ? 'bold' : 'normal'
                                    }}
                                >
                                    <Pencil size={16} /> Walls
                                </button>
                            </div>

                            {editTool === 'tables' ? (
                                <>
                                    <input
                                        type="text"
                                        placeholder="Table #"
                                        value={newTableNum}
                                        onChange={e => setNewTableNum(e.target.value)}
                                        style={{ width: '80px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Seats"
                                        value={newTableSeats}
                                        onChange={e => setNewTableSeats(Number(e.target.value))}
                                        style={{ width: '70px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                        min={1}
                                    />
                                    <select
                                        value={newTableShape}
                                        onChange={e => setNewTableShape(e.target.value as TableShape)}
                                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                    >
                                        <option value="rectangle">Rectangle</option>
                                        <option value="circle">Circle</option>
                                    </select>
                                    <button
                                        onClick={handleAddTable}
                                        style={{
                                            background: '#3b82f6',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '0.5rem 1rem',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <Plus size={16} /> Add Table
                                    </button>
                                </>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Color:</span>
                                        <input
                                            type="color"
                                            value={wallColor}
                                            onChange={e => setWallColor(e.target.value)}
                                            style={{ width: '32px', height: '32px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                                            title="Wall Color"
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Thickness:</span>
                                        <input
                                            type="number"
                                            value={wallThickness}
                                            onChange={e => setWallThickness(Number(e.target.value))}
                                            style={{ width: '60px', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                                            min={1}
                                            max={40}
                                            title="Wall Thickness"
                                        />
                                    </div>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b', paddingLeft: '0.5rem', borderLeft: '1px solid #cbd5e1', marginLeft: '0.25rem' }}>
                                        Click and drag to draw a wall, or
                                    </span>
                                    <button
                                        onClick={async () => {
                                            const newWall = {
                                                start_x: 100,
                                                start_y: 100,
                                                end_x: 300,
                                                end_y: 100,
                                                thickness: wallThickness,
                                                color: wallColor,
                                                restaurant_id: restaurantId!,
                                                floor_plan_name: activePlan
                                            };
                                            const { error } = await supabase.from('restaurant_walls').insert([newWall]);
                                            if (error) {
                                                alert("Error adding wall. Ensure your database table is created: " + error.message);
                                            } else {
                                                fetchWalls();
                                            }
                                        }}
                                        style={{
                                            background: '#3b82f6',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '0.4rem 0.8rem',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        <Plus size={14} /> Add Wall
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        onClick={() => {
                            setIsEditMode(!isEditMode);
                            setSelectedTable(null);
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.6rem 1.2rem',
                            borderRadius: '8px',
                            border: '1px solid',
                            borderColor: isEditMode ? '#3b82f6' : '#e2e8f0',
                            background: isEditMode ? '#eff6ff' : 'white',
                            color: isEditMode ? '#3b82f6' : 'var(--text-primary)',
                            cursor: 'pointer',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                    >
                        <Settings2 size={18} />
                        {isEditMode ? 'Exit Edit Mode' : 'Edit Layout'}
                    </button>
                </div>
            </div>

            {/* Canvas Area */}
            <div
                ref={canvasRef}
                style={{
                    flex: 1,
                    position: 'relative',
                    background: '#f1f5f9',
                    backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                    overflow: 'auto',
                    cursor: isEditMode && editTool === 'walls' ? 'crosshair' : 'default',
                    touchAction: isEditMode && editTool === 'walls' ? 'none' : 'auto'
                }}
                onPointerDown={(e) => {
                    if (isEditMode && editTool === 'walls') {
                        e.preventDefault();
                        const rect = canvasRef.current?.getBoundingClientRect();
                        if (!rect) return;
                        const x = e.clientX - rect.left + (canvasRef.current?.scrollLeft || 0);
                        const y = e.clientY - rect.top + (canvasRef.current?.scrollTop || 0);
                        setIsDrawing(true);
                        setDrawingStart({ x, y });
                        setDrawingEnd({ x, y });
                        (e.target as HTMLElement).setPointerCapture(e.pointerId);
                    }
                }}
                onPointerMove={(e) => {
                    if (isDrawing && drawingStart) {
                        e.preventDefault();
                        const rect = canvasRef.current?.getBoundingClientRect();
                        if (!rect) return;
                        const x = e.clientX - rect.left + (canvasRef.current?.scrollLeft || 0);
                        const y = e.clientY - rect.top + (canvasRef.current?.scrollTop || 0);
                        setDrawingEnd({ x, y });
                    }
                }}
                onPointerUp={async (e) => {
                    if (isDrawing && drawingStart && drawingEnd) {
                        setIsDrawing(false);
                        (e.target as HTMLElement).releasePointerCapture(e.pointerId);

                        const dx = drawingEnd.x - drawingStart.x;
                        const dy = drawingEnd.y - drawingStart.y;
                        if (Math.sqrt(dx * dx + dy * dy) > 10) {
                            const newWall = {
                                start_x: Math.round(drawingStart.x),
                                start_y: Math.round(drawingStart.y),
                                end_x: Math.round(drawingEnd.x),
                                end_y: Math.round(drawingEnd.y),
                                thickness: wallThickness,
                                color: wallColor,
                                restaurant_id: restaurantId!,
                                floor_plan_name: activePlan
                            };
                            await supabase.from('restaurant_walls').insert([newWall]);
                            fetchWalls();
                        }
                        setDrawingStart(null);
                        setDrawingEnd(null);
                    }
                }}
                onClick={(e) => {
                    // Click outside tables deselects
                    if (e.target === canvasRef.current && (!isEditMode || editTool === 'tables')) {
                        setSelectedTable(null);
                    }
                }}
            >
                {/* SVG for Walls */}
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 0 }}>
                    {currentPlanWalls.map(wall => (
                        <line
                            key={wall.id}
                            x1={wall.start_x}
                            y1={wall.start_y}
                            x2={wall.end_x}
                            y2={wall.end_y}
                            stroke={wall.color}
                            strokeWidth={wall.thickness}
                            strokeLinecap="round"
                        />
                    ))}
                    {isDrawing && drawingStart && drawingEnd && (
                        <line
                            x1={drawingStart.x}
                            y1={drawingStart.y}
                            x2={drawingEnd.x}
                            y2={drawingEnd.y}
                            stroke={wallColor}
                            strokeWidth={wallThickness}
                            strokeLinecap="round"
                            opacity={0.5}
                        />
                    )}
                </svg>

                {/* Wall Edit Delete Controls */}
                {isEditMode && editTool === 'walls' && currentPlanWalls.map(wall => (
                    <button
                        key={`del-${wall.id}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWall(wall.id);
                        }}
                        style={{
                            position: 'absolute',
                            left: (wall.start_x + wall.end_x) / 2 - 12,
                            top: (wall.start_y + wall.end_y) / 2 - 12,
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            zIndex: 10
                        }}
                    >
                        <Trash2 size={12} />
                    </button>
                ))}

                {currentPlanTables.map(table => (
                    <DraggableTable
                        key={table.id}
                        table={table}
                        isEditMode={isEditMode && editTool === 'tables'}
                        onDragEnd={handleDragEnd}
                        onClick={() => !isEditMode && setSelectedTable(table)}
                        onDelete={() => handleDeleteTable(table.id)}
                        colors={getStatusColor(table.status)}
                    />
                ))}

                {/* Status Modal (Live Mode) */}
                {selectedTable && !isEditMode && (
                    <div style={{
                        position: 'absolute',
                        top: Math.max(0, selectedTable.pos_y - 120),
                        left: Math.max(0, selectedTable.pos_x + selectedTable.width / 2 - 100),
                        width: '200px',
                        background: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                        padding: '1rem',
                        zIndex: 100,
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <strong style={{ fontSize: '1.1rem' }}>Table {selectedTable.table_number}</strong>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{selectedTable.seats} seats</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <StatusButton icon={<CheckCircle2 size={16} />} label="Available" color="#166534" bg="#dcfce7" onClick={() => handleUpdateStatus(selectedTable.id, 'available')} />
                            <StatusButton icon={<AlertCircle size={16} />} label="Occupied" color="#991b1b" bg="#fee2e2" onClick={() => handleUpdateStatus(selectedTable.id, 'occupied')} />
                            <StatusButton icon={<Clock size={16} />} label="Dirty" color="#854d0e" bg="#fef3c7" onClick={() => handleUpdateStatus(selectedTable.id, 'dirty')} />
                            <StatusButton icon={<Ban size={16} />} label="Reserved" color="#374151" bg="#f3f4f6" onClick={() => handleUpdateStatus(selectedTable.id, 'reserved')} />
                        </div>
                    </div>
                )}
            </div>

            <div style={{ padding: '0.5rem 2rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#64748b' }}>
                Note: Ensure your <code>restaurant_tables</code> table is created in Supabase with the required columns, including <code>restaurant_id (text)</code>.
            </div>
        </div>
    );
}

function StatusButton({ icon, label, color, bg, onClick }: { icon: any, label: string, color: string, bg: string, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.5rem',
                border: 'none',
                borderRadius: '6px',
                background: bg,
                color: color,
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem',
                transition: 'filter 0.1s'
            }}
            onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(0.95)'}
            onMouseOut={(e) => e.currentTarget.style.filter = 'brightness(1)'}
        >
            {icon}
            {label}
        </button>
    );
}

function DraggableTable({ table, isEditMode, onDragEnd, onClick, onDelete, colors }: {
    table: RestaurantTable,
    isEditMode: boolean,
    onDragEnd: (id: string, x: number, y: number) => void,
    onClick: () => void,
    onDelete: () => void,
    colors: { bg: string, border: string, text: string }
}) {
    const [isDragging, setIsDragging] = useState(false);
    const [pos, setPos] = useState({ x: table.pos_x, y: table.pos_y });

    useEffect(() => {
        if (!isDragging) {
            setPos({ x: table.pos_x, y: table.pos_y });
        }
    }, [table.pos_x, table.pos_y, isDragging]);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!isEditMode) {
            onClick();
            return;
        }

        // Prevent default text selection during drag
        e.preventDefault();

        setIsDragging(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        const startX = e.clientX;
        const startY = e.clientY;
        const startPosX = pos.x;
        const startPosY = pos.y;

        const handlePointerMove = (moveEvent: PointerEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;

            // Snap to grid (10px) optionally, let's just do free transform for now
            setPos({ x: startPosX + dx, y: startPosY + dy });
        };

        const handlePointerUp = (upEvent: PointerEvent) => {
            setIsDragging(false);
            (upEvent.target as HTMLElement).releasePointerCapture(upEvent.pointerId);

            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);

            // Commit position
            const finalDx = upEvent.clientX - startX;
            const finalDy = upEvent.clientY - startY;
            onDragEnd(table.id, startPosX + finalDx, startPosY + finalDy);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    return (
        <div
            onPointerDown={handlePointerDown}
            style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width: table.width,
                height: table.height,
                background: colors.bg,
                border: `2px solid ${isEditMode && isDragging ? '#3b82f6' : colors.border}`,
                color: colors.text,
                borderRadius: table.shape === 'circle' ? '50%' : '12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: isEditMode ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
                boxShadow: isDragging ? '0 10px 20px rgba(0,0,0,0.15)' : '0 4px 6px rgba(0,0,0,0.05)',
                transition: isDragging ? 'none' : 'box-shadow 0.2s, background 0.3s, border-color 0.3s',
                touchAction: 'none',
                userSelect: 'none',
                zIndex: 5
            }}
        >
            <span style={{ fontWeight: '800', fontSize: '1.2rem' }}>{table.table_number}</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{table.seats} seats</span>

            {isEditMode && !isDragging && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    style={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                >
                    <Trash2 size={12} />
                </button>
            )}
        </div>
    );
}
