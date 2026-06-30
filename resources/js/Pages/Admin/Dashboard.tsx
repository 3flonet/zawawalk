import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PublicFooter from '@/Components/PublicFooter';
import axios from 'axios';
import { Html5Qrcode } from 'html5-qrcode';
import ExcelJS from 'exceljs';
// @ts-ignore
import { saveAs } from 'file-saver';
import { 
    Settings, 
    Layers, 
    Users, 
    CreditCard, 
    Mail, 
    CheckSquare, 
    Upload, 
    Sparkles, 
    Power,
    Check,
    X,
    FileText,
    Calendar,
    MapPin,
    AlertCircle,
    Camera,
    Search,
    BarChart2,
    TrendingUp,
    Wallet,
    Package,
    Gift,
    Share2,
    Link as LinkIcon,
    Download,
    Monitor,
    RefreshCcw,
    Zap,
    ZapOff,
    Info,
    WifiOff,
    Send,
    Megaphone,
    Trash
} from 'lucide-react';

interface Plugin {
    id: string;
    name: string;
    is_active: boolean;
    version: string;
    settings: any;
}

interface Form {
    id: number;
    title: string;
    is_active: boolean;
    ticket_price: string;
    fields_schema?: any[];
    max_participants?: number | null;
    closed_at?: string | null;
    attendees_count?: number;
    additional_fees?: any[];
}

interface BroadcastTemplate {
    id: number;
    name: string;
    subject: string | null;
    body: string;
    whatsapp_body?: string | null;
    email_subject?: string | null;
    email_body?: string | null;
    email_narrative?: string | null;
    email_banner?: string | null;
    created_at?: string;
    updated_at?: string;
}

interface BroadcastLog {
    id: number;
    attendee_id: number;
    recipient: string | null;
    channel: 'email' | 'whatsapp_me' | 'whatsapp_fonnte';
    status: 'pending' | 'sent' | 'failed';
    error_message: string | null;
    sent_at: string | null;
    created_at: string;
    attendee?: any;
}

interface DashboardProps {
    auth: {
        user: {
            id: number;
            name: string;
            email: string;
            role: 'admin' | 'staff';
        };
    };
    users?: any[];
    stats: {
        total_registered: number;
        checked_in: number;
        pending_payment: number;
        paid_payment: number;
    };
    settings: {
        [key: string]: string;
    };
    forms: Form[];
    plugins: Plugin[];
    attendees: any[];
    broadcastTemplates: BroadcastTemplate[];
    broadcastLogs: BroadcastLog[];
    vouchers: any[];
}

interface TagInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type: 'phone' | 'email';
}

function TagInput({ value, onChange, placeholder = '', type }: TagInputProps) {
    const [inputValue, setInputValue] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Parse value (comma-separated string) into array of tags
    const tags = useMemo(() => {
        if (!value) return [];
        return value.split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);
    }, [value]);

    const addTag = (tagText: string) => {
        let cleaned = tagText.trim();
        if (cleaned.endsWith(',')) {
            cleaned = cleaned.slice(0, -1).trim();
        }
        if (!cleaned) return;

        // Validation based on type
        if (type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(cleaned)) {
                return;
            }
        } else if (type === 'phone') {
            const phoneRegex = /^[0-9+\-\s]+$/;
            if (!phoneRegex.test(cleaned)) {
                return;
            }
        }

        // Prevent duplicates
        if (tags.includes(cleaned)) {
            setInputValue('');
            return;
        }

        const newTags = [...tags, cleaned];
        onChange(newTags.join(', '));
        setInputValue('');
    };

    const removeTag = (indexToRemove: number) => {
        const newTags = tags.filter((_, idx) => idx !== indexToRemove);
        onChange(newTags.join(', '));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            removeTag(tags.length - 1);
        }
    };

    const handleBlur = () => {
        addTag(inputValue);
    };

    return (
        <div 
            onClick={() => inputRef.current?.focus()}
            className="flex flex-wrap gap-2 w-full border border-slate-200 p-2 bg-slate-50/50 rounded-xl focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all text-xs text-slate-800 cursor-text min-h-[46px] items-center"
            ref={containerRef}
        >
            {tags.map((tag, idx) => (
                <span 
                    key={idx} 
                    className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-lg border border-indigo-100 transition-all hover:bg-indigo-100 duration-150 ease-in-out select-none animate-fadeIn"
                >
                    {tag}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            removeTag(idx);
                        }}
                        className="text-indigo-400 hover:text-indigo-600 transition-colors focus:outline-none"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </span>
            ))}
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                placeholder={tags.length === 0 ? placeholder : ''}
                className="flex-1 min-w-[120px] bg-transparent border-none p-1 focus:outline-none focus:ring-0 text-xs font-bold text-slate-800"
            />
        </div>
    );
}

const getTemplateMetadata = (name: string) => {
    switch (name) {
        case 'Notifikasi Pendaftaran Baru (Admin)':
            return {
                type: 'Sistem (Admin)',
                badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
                desc: 'Pesan notifikasi otomatis ke WhatsApp & Email Admin saat ada pendaftar baru dengan Transfer Manual.'
            };
        case 'Konfirmasi Pendaftaran Awal':
            return {
                type: 'Sistem (Peserta)',
                badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
                desc: 'Email konfirmasi otomatis ke peserta sesaat setelah menyelesaikan pendaftaran (pembayaran pending).'
            };
        case 'Konfirmasi Tiket / E-Ticket':
            return {
                type: 'Sistem (Peserta)',
                badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                desc: 'Tiket/E-Ticket QR code otomatis dikirim ke peserta via WA & Email ketika status pembayaran diverifikasi LUNAS (PAID).'
            };
        case 'Konfirmasi Check-In':
            return {
                type: 'Sistem (Peserta)',
                badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
                desc: 'Ucapan terima kasih pengambilan racepack otomatis dikirim ke peserta via WA & Email saat berhasil check-in.'
            };
        case 'Pembayaran Gagal / Ditolak':
            return {
                type: 'Broadcast / Manual',
                badgeBg: 'bg-slate-50 text-slate-700 border-slate-200',
                desc: 'Template pengumuman pembayaran pendaftaran yang ditolak/gagal (dikirim manual oleh admin).'
            };
        case 'Pengingat Pembayaran / Reminder':
            return {
                type: 'Broadcast / Manual',
                badgeBg: 'bg-slate-50 text-slate-700 border-slate-200',
                desc: 'Template pengingat bagi pendaftar yang status bayarnya masih pending agar segera transfer (dikirim manual).'
            };
        default:
            return {
                type: 'Broadcast / Manual',
                badgeBg: 'bg-slate-50 text-slate-700 border-slate-200',
                desc: 'Template pesan umum kustom untuk pengumuman manual.'
            };
    }
};

const formatWhatsApp = (text: string) => {
    if (!text) return '<span class="text-slate-400 italic">Pesan kosong</span>';
    
    // HTML Escape to prevent XSS
    let formatted = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // 1. Monospace: ```text```
    formatted = formatted.replace(/```([^`]+)```/g, '<code class="font-mono bg-black/5 px-1 py-0.5 rounded text-[10px]">$1</code>');

    // 2. Bold: *text*
    formatted = formatted.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');

    // 3. Italic: _text_
    formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');

    // 4. Strikethrough: ~text~
    formatted = formatted.replace(/~([^~]+)~/g, '<del>$1</del>');

    // 5. Links: http/https
    formatted = formatted.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-sky-600 hover:underline break-all">$1</a>');

    return formatted;
};

export default function Dashboard({ auth, users = [], stats, settings, forms, plugins, attendees, broadcastTemplates, broadcastLogs, vouchers }: DashboardProps) {
    const isAdmin = auth.user.role === 'admin';
    const [activeTab, setActiveTab] = useState<'event' | 'payment' | 'plugins' | 'forms' | 'attendees' | 'checkin' | 'report' | 'seo' | 'realtime' | 'broadcast' | 'users' | 'vouchers'>(
        auth.user.role === 'staff' ? 'checkin' : 'event'
    );
    const [reportTab, setReportTab] = useState<'revenue' | 'checkin'>('revenue');

    const [bannerLoading, setBannerLoading] = useState(false);
    const [logoLoading, setLogoLoading] = useState(false);
    const [faviconLoading, setFaviconLoading] = useState(false);
    const [routeLoading, setRouteLoading] = useState(false);
    const [racepackLoading, setRacepackLoading] = useState(false);
    const [ogImageLoading, setOgImageLoading] = useState(false);

    // Previews of selected files before save
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
    const [routePreview, setRoutePreview] = useState<string | null>(null);
    const [racepackPreview, setRacepackPreview] = useState<string | null>(null);
    const [ogImagePreview, setOgImagePreview] = useState<string | null>(null);

    const handleFileChange = (field: 'event_banner' | 'event_logo' | 'event_favicon' | 'funwalk_route_image' | 'funwalk_racepack_image' | 'og_image', file: File | null) => {
        if (!file) {
            setData(field, null);
            if (field === 'event_banner') setBannerPreview(null);
            if (field === 'event_logo') setLogoPreview(null);
            if (field === 'event_favicon') setFaviconPreview(null);
            if (field === 'funwalk_route_image') setRoutePreview(null);
            if (field === 'funwalk_racepack_image') setRacepackPreview(null);
            if (field === 'og_image') setOgImagePreview(null);
            return;
        }
        
        if (field === 'event_banner') setBannerLoading(true);
        if (field === 'event_logo') setLogoLoading(true);
        if (field === 'event_favicon') setFaviconLoading(true);
        if (field === 'funwalk_route_image') setRouteLoading(true);
        if (field === 'funwalk_racepack_image') setRacepackLoading(true);
        if (field === 'og_image') setOgImageLoading(true);

        // Simulated file processing reader
        setTimeout(() => {
            setData(field, file);

            const reader = new FileReader();
            reader.onloadend = () => {
                if (field === 'event_banner') setBannerPreview(reader.result as string);
                if (field === 'event_logo') setLogoPreview(reader.result as string);
                if (field === 'event_favicon') setFaviconPreview(reader.result as string);
                if (field === 'funwalk_route_image') setRoutePreview(reader.result as string);
                if (field === 'funwalk_racepack_image') setRacepackPreview(reader.result as string);
                if (field === 'og_image') setOgImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);

            if (field === 'event_banner') setBannerLoading(false);
            if (field === 'event_logo') setLogoLoading(false);
            if (field === 'event_favicon') setFaviconLoading(false);
            if (field === 'funwalk_route_image') setRouteLoading(false);
            if (field === 'funwalk_racepack_image') setRacepackLoading(false);
            if (field === 'og_image') setOgImageLoading(false);
        }, 1200);
    };

    // Attendees & Check-in states
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('all');

    // User CRUD states
    const [userModalOpen, setUserModalOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {}
    });

    const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                onConfirm();
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const [alertDialog, setAlertDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
    }>({
        isOpen: false,
        title: '',
        message: ''
    });

    const triggerAlert = (title: string, message: string) => {
        setAlertDialog({
            isOpen: true,
            title,
            message
        });
    };
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [userFormName, setUserFormName] = useState('');
    const [userFormEmail, setUserFormEmail] = useState('');
    const [userFormPassword, setUserFormPassword] = useState('');
    const [userFormRole, setUserFormRole] = useState<'admin' | 'staff'>('staff');
    const [userFormProcessing, setUserFormProcessing] = useState(false);

    const openAddUserModal = () => {
        setEditingUser(null);
        setUserFormName('');
        setUserFormEmail('');
        setUserFormPassword('');
        setUserFormRole('staff');
        setUserModalOpen(true);
    };

    const openEditUserModal = (u: any) => {
        setEditingUser(u);
        setUserFormName(u.name);
        setUserFormEmail(u.email);
        setUserFormPassword(''); // blank means do not update
        setUserFormRole(u.role);
        setUserModalOpen(true);
    };

    const handleSaveUser = (e: React.FormEvent) => {
        e.preventDefault();
        setUserFormProcessing(true);

        const payload = {
            name: userFormName,
            email: userFormEmail,
            password: userFormPassword,
            role: userFormRole,
        };

        const url = editingUser 
            ? route('admin.users.update', editingUser.id) 
            : route('admin.users.store');

        axios.post(url, payload)
            .then(res => {
                setUserModalOpen(false);
                router.reload({ only: ['users'] });
            })
            .catch(err => {
                alert(err.response?.data?.message || 'Gagal menyimpan user.');
            })
            .finally(() => {
                setUserFormProcessing(false);
            });
    };

    const handleDeleteUser = (id: number) => {
        triggerConfirm(
            'Hapus User',
            'Apakah Anda yakin ingin menghapus user ini? Tindakan ini tidak dapat dibatalkan.',
            () => {
                axios.delete(route('admin.users.destroy', id))
                    .then(res => {
                        router.reload({ only: ['users'] });
                    })
                    .catch(err => {
                        alert(err.response?.data?.message || 'Gagal menghapus user.');
                    });
            }
        );
    };

    const exportToExcel = async () => {
        // filter attendees first
        const filteredAttendees = attendees.filter(att => {
            let name = att.registration_data?.fullname || '';
            if (!name) {
                const nameKey = Object.keys(att.registration_data || {}).find(k => k.toLowerCase().includes('nama') || k.toLowerCase().includes('name'));
                if (nameKey) name = String(att.registration_data[nameKey]);
            }
            const code = att.ticket_code || '';
            const uCode = att.registration_data?.unique_code ? String(att.registration_data.unique_code) : '';
            const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  uCode.includes(searchTerm);
            const matchesPayment = paymentFilter === 'all' || att.payment_status === paymentFilter;
            return matchesSearch && matchesPayment;
        });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Attendees');

        // Define columns dynamically based on forms or standard fields
        const columns = [
            { header: 'KODE TIKET', key: 'ticket_code', width: 20 },
            { header: 'NAMA LENGKAP', key: 'name', width: 30 },
            { header: 'WHATSAPP', key: 'whatsapp', width: 20 },
            { header: 'STATUS PEMBAYARAN', key: 'payment_status', width: 25 },
            { header: 'STATUS CHECK-IN', key: 'checked_in', width: 20 },
            { header: 'MODE KEHADIRAN', key: 'attendance_mode', width: 20 },
            { header: 'TOTAL BAYAR', key: 'total_price', width: 20 },
            { header: 'MERCHANDISE', key: 'merchandise', width: 45 },
        ];
        
        // Add dynamic headers
        const extraKeys = new Set<string>();
        filteredAttendees.forEach(att => {
            Object.keys(att.registration_data || {}).forEach(k => {
                if (!['fullname', 'whatsapp', 'attendance_mode', 'ticket_price', 'total_price', 'merchandise_total', 'donation_amount', 'selected_merchandise', 'snap_token', 'snap_redirect_url', 'additional_fees', 'additional_fees_breakdown', 'unique_code', 'discount_amount', 'voucher_code', 'voucher_type', 'voucher_value'].includes(k)) {
                    extraKeys.add(k);
                }
            });
        });
        
        extraKeys.forEach(k => {
            columns.push({ header: k.toUpperCase(), key: k, width: 25 });
        });

        worksheet.columns = columns;

        // Styling headers (Retro theme: yellow background, black border, bold font)
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FF000000' } };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFDE00' } // Retro yellow
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: {style:'medium'},
                left: {style:'medium'},
                bottom: {style:'medium'},
                right: {style:'medium'}
            };
        });

        // Add rows
        filteredAttendees.forEach(att => {
            let name = att.registration_data?.fullname;
            if (!name) {
                const nameKey = Object.keys(att.registration_data || {}).find(k => k.toLowerCase().includes('nama') || k.toLowerCase().includes('name'));
                if (nameKey) name = att.registration_data[nameKey];
            }
            let phone = att.registration_data?.whatsapp;
            if (!phone) {
                const phoneKey = Object.keys(att.registration_data || {}).find(k => k.toLowerCase().includes('whatsapp') || k.toLowerCase().includes('wa') || k.toLowerCase().includes('telp') || k.toLowerCase().includes('phone') || k.toLowerCase().includes('hp'));
                if (phoneKey) phone = att.registration_data[phoneKey];
            }

            let merchStr = '';
            if (att.registration_data?.selected_merchandise) {
                merchStr = Object.entries(att.registration_data.selected_merchandise)
                    .map(([k, item]: [string, any]) => {
                        let itemName = item.name;
                        let details = [];
                        if (item.size) details.push(`Ukuran: ${item.size}`);
                        if (item.nickname) details.push(`Nama: ${item.nickname}`);
                        if (details.length > 0) itemName += ` (${details.join(', ')})`;
                        return itemName;
                    }).join(' | ');
            }

            const rowData: any = {
                ticket_code: att.ticket_code,
                name: name || 'Peserta',
                whatsapp: phone || '-',
                payment_status: att.payment_status.toUpperCase(),
                checked_in: att.checked_in ? 'CHECKED IN' : 'OUT',
                attendance_mode: att.registration_data?.attendance_mode || 'OFFLINE',
                total_price: att.registration_data?.total_price || 0,
                merchandise: merchStr,
            };

            extraKeys.forEach(k => {
                let val = att.registration_data?.[k] || '';
                if (typeof val === 'string' && val.startsWith('/storage/')) {
                    val = window.location.origin + val;
                }
                rowData[k] = val;
            });

            worksheet.addRow(rowData);
        });

        // Add border to all cells
        worksheet.eachRow((row, rowNumber) => {
            if(rowNumber > 1) {
                row.eachCell((cell) => {
                    cell.border = {
                        top: {style:'thin'},
                        left: {style:'thin'},
                        bottom: {style:'thin'},
                        right: {style:'thin'}
                    };
                });
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Attendees_Export_${new Date().getTime()}.xlsx`);
    };
    const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
    const [scanInput, setScanInput] = useState('');
    const [scanResult, setScanResult] = useState<{ success: boolean; message: string; name?: string; code?: string } | null>(null);
    const scanInputRef = useRef<HTMLInputElement>(null);
    const lastScannedCodeRef = useRef<{code: string, time: number} | null>(null);
    const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Clear timeout on unmount
    useEffect(() => {
        return () => {
            if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
        };
    }, []);

    const [useCamera, setUseCamera] = useState(false);

    // Automatically focus the input for handheld scanner
    useEffect(() => {
        if (activeTab === 'checkin' && !useCamera) {
            scanInputRef.current?.focus();
            const keepFocus = () => scanInputRef.current?.focus();
            document.addEventListener('click', keepFocus);
            return () => document.removeEventListener('click', keepFocus);
        }
    }, [activeTab, useCamera]);

    const processScan = (code: string) => {
        if (!code) return;
        setScanInput(''); // Clear immediately so next scan doesn't append!
        axios.post(route('admin.attendees.checkin_scan'), { ticket_code: code })
            .then(response => {
                const regData = response.data.attendee?.registration_data || {};
                let attendeeName = regData.fullname || '';
                if (!attendeeName) {
                    const nameKey = Object.keys(regData).find(k => k.toLowerCase().includes('nama') || k.toLowerCase().includes('name'));
                    if (nameKey) attendeeName = String(regData[nameKey]);
                }
                attendeeName = attendeeName || 'Peserta';

                setScanResult({
                    success: true,
                    message: `${response.data.message} - ${attendeeName}`,
                    name: attendeeName,
                    code: response.data.attendee.ticket_code
                });
                setScanInput('');
                router.reload({ only: ['attendees'] });
                
                if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
                scanTimeoutRef.current = setTimeout(() => {
                    setScanResult(null);
                }, 5000);
            })
            .catch(error => {
                const regData = error.response?.data?.attendee?.registration_data || {};
                let attendeeName = regData.fullname || '';
                if (!attendeeName) {
                    const nameKey = Object.keys(regData).find(k => k.toLowerCase().includes('nama') || k.toLowerCase().includes('name'));
                    if (nameKey) attendeeName = String(regData[nameKey]);
                }
                
                setScanResult({
                    success: false,
                    message: `${error.response?.data?.message || 'Check-in gagal!'} ${attendeeName ? `(${attendeeName})` : ''}`,
                    name: attendeeName || undefined,
                    code: error.response?.data?.attendee?.ticket_code
                });
                setScanInput('');
                
                if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
                scanTimeoutRef.current = setTimeout(() => {
                    setScanResult(null);
                }, 5000);
            });
    };

    useEffect(() => {
        if (scanResult) {
            setTimeout(() => {
                document.getElementById('scan-result-card')?.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 100);
        }
    }, [scanResult]);

    const handleScanSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        processScan(scanInput);
    };

    useEffect(() => {
        if (activeTab === 'checkin' && useCamera) {
            const html5QrCode = new Html5Qrcode("reader");
            
            html5QrCode.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                },
                (decodedText) => {
                    const now = Date.now();
                    const lastScan = lastScannedCodeRef.current;
                    // Ignore if same code scanned within 3 seconds
                    if (lastScan && lastScan.code === decodedText && (now - lastScan.time) < 3000) {
                        return; 
                    }
                    lastScannedCodeRef.current = { code: decodedText, time: now };
                    processScan(decodedText);
                },
                (error) => {
                    // ignore frame errors
                }
            ).catch(err => {
                console.error("Camera start failed", err);
            });

            return () => {
                // Must handle state where it might not have fully started yet
                if (html5QrCode.isScanning) {
                    html5QrCode.stop().then(() => {
                        html5QrCode.clear();
                    }).catch(error => {
                        console.error("Failed to stop scanner. ", error);
                    });
                } else {
                    html5QrCode.clear();
                }
            };
        }
    }, [activeTab, useCamera]);

    // Real-time Report calculations
    const reportData = useMemo(() => {
        let totalRevenue = 0;
        let ticketRevenue = 0;
        let merchRevenue = 0;
        let donationRevenue = 0;
        
        let offlineCount = 0;
        let onlineCount = 0;
        let checkedInCount = 0;
        let merchBreakdown: Record<string, { count: number, revenue: number }> = {};
        
        const validAttendees = attendees.filter(att => att.payment_status === 'paid');

        validAttendees.forEach(att => {
            const data = att.registration_data || {};
            
            // Stats
            if (data.attendance_mode?.toLowerCase() === 'online') {
                onlineCount++;
            } else {
                offlineCount++;
            }
            if (att.checked_in) checkedInCount++;

            // Revenues
            const total = parseFloat(data.total_price) || 0;
            const donation = parseFloat(data.donation_amount) || 0;
            const ticket = parseFloat(data.ticket_price) || 0;
            let merch = 0;
            
            if (data.selected_merchandise) {
                Object.entries(data.selected_merchandise).forEach(([k, m]: [string, any]) => {
                    const price = parseFloat(m.price) || 0;
                    merch += price;
                    
                    const name = m.name || k;
                    if (!merchBreakdown[name]) {
                        merchBreakdown[name] = { count: 0, revenue: 0 };
                    }
                    merchBreakdown[name].count += 1;
                    merchBreakdown[name].revenue += price;
                });
            }

            totalRevenue += total;
            ticketRevenue += ticket;
            merchRevenue += merch;
            donationRevenue += donation;
        });

        return {
            totalRevenue, ticketRevenue, merchRevenue, donationRevenue, merchBreakdown,
            offlineCount, onlineCount, checkedInCount, validAttendees
        };
    }, [attendees]);

    const exportReportToExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Revenue Report');

        // Main Title
        worksheet.mergeCells('A1:F1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'REAL-TIME REVENUE REPORT';
        titleCell.font = { bold: true, size: 14, color: { argb: 'FF000000' } };
        titleCell.alignment = { horizontal: 'center' };

        // Summary Section
        worksheet.addRow(['']); // spacing
        
        const summaryRows = [
            ['Total Revenue', `Rp ${reportData.totalRevenue.toLocaleString('id-ID')}`],
            ['Ticket Sales', `Rp ${reportData.ticketRevenue.toLocaleString('id-ID')} (${reportData.validAttendees.length} Tiket)`],
            ['Merchandise', `Rp ${reportData.merchRevenue.toLocaleString('id-ID')}`],
            ['Donations', `Rp ${reportData.donationRevenue.toLocaleString('id-ID')}`]
        ];

        summaryRows.forEach(row => {
            const addedRow = worksheet.addRow(row);
            addedRow.getCell(1).font = { bold: true };
        });

        worksheet.addRow(['']); // spacing
        
        // Detailed Table Header
        worksheet.mergeCells('A8:F8');
        const tableTitle = worksheet.getCell('A8');
        tableTitle.value = 'DETAILED PARTICIPANT BREAKDOWN (PAID ONLY)';
        tableTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
        tableTitle.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        tableTitle.alignment = { horizontal: 'center', vertical: 'middle' };

        // Columns for Details
        const headerRow = worksheet.addRow(['KODE TIKET', 'NAMA PESERTA', 'TIKET', 'MERCHANDISE', 'DONASI', 'TOTAL BAYAR']);
        headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FF000000' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFDE00' } };
            cell.border = { top: {style:'medium'}, left: {style:'medium'}, bottom: {style:'medium'}, right: {style:'medium'} };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        worksheet.columns = [
            { width: 15 }, // KODE TIKET
            { width: 30 }, // NAMA PESERTA
            { width: 20 }, // TIKET
            { width: 45 }, // MERCHANDISE
            { width: 20 }, // DONASI
            { width: 20 }, // TOTAL BAYAR
        ];

        // Detailed Rows
        if (reportData.validAttendees.length === 0) {
            worksheet.addRow(['Belum ada peserta lunas.']);
        } else {
            reportData.validAttendees.forEach(att => {
                const data = att.registration_data || {};
                let name = data.fullname;
                if (!name) {
                    const nameKey = Object.keys(data).find(k => k.toLowerCase().includes('nama') || k.toLowerCase().includes('name'));
                    if (nameKey) name = data[nameKey];
                }
                name = name || 'Peserta';

                const ticket = parseFloat(data.ticket_price) || 0;
                const donation = parseFloat(data.donation_amount) || 0;
                const total = parseFloat(data.total_price) || 0;
                
                let merchStr = '';
                if (data.selected_merchandise) {
                    merchStr = Object.values(data.selected_merchandise).map((m: any) => {
                        let detailText = m.name;
                        if (m.size) detailText += ` (Size: ${m.size})`;
                        return `${detailText} - Rp ${(parseFloat(m.price) || 0).toLocaleString('id-ID')}`;
                    }).join('\n');
                }

                const row = worksheet.addRow([
                    att.ticket_code,
                    name,
                    `Rp ${ticket.toLocaleString('id-ID')}`,
                    merchStr,
                    `Rp ${donation.toLocaleString('id-ID')}`,
                    `Rp ${total.toLocaleString('id-ID')}`
                ]);

                row.eachCell(cell => {
                    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin' } };
                    cell.alignment = { wrapText: true, vertical: 'top' };
                });
            });

            // Add Grand Total row at the end
            const grandTotalRow = worksheet.addRow([
                '', '', '', '', 'GRAND TOTAL REVENUE', `Rp ${reportData.totalRevenue.toLocaleString('id-ID')}`
            ]);
            
            grandTotalRow.getCell(5).font = { bold: true };
            grandTotalRow.getCell(5).alignment = { horizontal: 'right' };
            grandTotalRow.getCell(6).font = { bold: true };
            grandTotalRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFDE00' } };
            grandTotalRow.getCell(6).border = { top: {style:'thick'}, left: {style:'thick'}, bottom: {style:'thick'}, right: {style:'thick' } };
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Revenue_Report_${new Date().getTime()}.xlsx`);
    };

    const [copySuccess, setCopySuccess] = useState(false);
    const [copyLiveSuccess, setCopyLiveSuccess] = useState(false);

    const copyPublicReportLink = () => {
        const url = window.location.origin + '/report';
        navigator.clipboard.writeText(url).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 3000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            alert('Failed to copy link. The URL is: ' + url);
        });
    };

    const copyLiveCheckInLink = () => {
        const url = window.location.origin + '/live-checkin';
        navigator.clipboard.writeText(url).then(() => {
            setCopyLiveSuccess(true);
            setTimeout(() => setCopyLiveSuccess(false), 3000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            alert('Failed to copy link. The URL is: ' + url);
        });
    };

    // Testing states for SMTP and Fonnte
    const [testEmail, setTestEmail] = useState('');
    const [testWhatsapp, setTestWhatsapp] = useState('');
    const [isTestingSmtp, setIsTestingSmtp] = useState(false);
    const [isTestingFonnte, setIsTestingFonnte] = useState(false);
    const [testSmtpResult, setTestSmtpResult] = useState<{ success: boolean; message: string } | null>(null);
    const [testFonnteResult, setTestFonnteResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleTestSmtp = () => {
        if (!testEmail) {
            alert('Harap masukkan email tujuan uji coba!');
            return;
        }
        setIsTestingSmtp(true);
        setTestSmtpResult(null);

        axios.post(route('admin.test_smtp'), {
            email: testEmail,
            smtp_host: data.smtp_host,
            smtp_port: data.smtp_port,
            smtp_username: data.smtp_username,
            smtp_password: data.smtp_password,
            smtp_from_address: data.smtp_from_address,
            smtp_from_name: data.smtp_from_name
        })
        .then(response => {
            setTestSmtpResult({
                success: true,
                message: response.data.message
            });
        })
        .catch(error => {
            setTestSmtpResult({
                success: false,
                message: error.response?.data?.message || 'Gagal mengirim email uji coba.'
            });
        })
        .finally(() => {
            setIsTestingSmtp(false);
        });
    };

    const handleTestFonnte = () => {
        if (!testWhatsapp) {
            alert('Harap masukkan nomor WhatsApp tujuan uji coba!');
            return;
        }
        setIsTestingFonnte(true);
        setTestFonnteResult(null);

        axios.post(route('admin.test_fonnte'), {
            whatsapp: testWhatsapp,
            fonnte_token: data.fonnte_token
        })
        .then(response => {
            setTestFonnteResult({
                success: true,
                message: response.data.message
            });
        })
        .catch(error => {
            setTestFonnteResult({
                success: false,
                message: error.response?.data?.message || 'Gagal mengirim pesan WhatsApp uji coba.'
            });
        })
        .finally(() => {
            setIsTestingFonnte(false);
        });
    };

    const handleVerifyPayment = (id: number, status: 'paid' | 'pending' | 'failed') => {
        router.post(route('admin.attendees.verify_payment', id), { payment_status: status }, {
            preserveScroll: true
        });
    };

    const handleToggleCheckIn = (id: number) => {
        router.post(route('admin.attendees.toggle_checkin', id), {}, {
            preserveScroll: true
        });
    };

    const handleSendTicket = (id: number) => {
        router.post(route('admin.attendees.send_ticket', id), {}, {
            preserveScroll: true
        });
    };

    // Form builder states
    const [isBuildingForm, setIsBuildingForm] = useState(false);
    
    // Voucher states
    const [voucherMode, setVoucherMode] = useState<'single' | 'bulk'>('single');
    const [voucherCode, setVoucherCode] = useState('');
    const [voucherPrefix, setVoucherPrefix] = useState('ZAWA-');
    const [voucherQty, setVoucherQty] = useState('5');
    const [voucherType, setVoucherType] = useState<'percentage' | 'fixed'>('fixed');
    const [voucherValue, setVoucherValue] = useState('50000');
    const [voucherCategory, setVoucherCategory] = useState<'group' | 'personal'>('personal');
    const [voucherMaxUses, setVoucherMaxUses] = useState('1');
    const [isSavingVoucher, setIsSavingVoucher] = useState(false);

    const [editingFormId, setEditingFormId] = useState<number | null>(null);
    const [newFormTitle, setNewFormTitle] = useState('');
    const [newFormPrice, setNewFormPrice] = useState('150000');
    const [newFormMaxParticipants, setNewFormMaxParticipants] = useState<string>('');
    const [newFormClosedAt, setNewFormClosedAt] = useState<string>('');
    const [newFormFields, setNewFormFields] = useState<any[]>([]);
    const [newFormAdditionalFees, setNewFormAdditionalFees] = useState<any[]>([]);

    const [tempLabel, setTempLabel] = useState('');
    const [tempType, setTempType] = useState<'text' | 'number' | 'email' | 'select' | 'signature' | 'textarea' | 'image' | 'date' | 'datetime' | 'multiselect' | 'title' | 'description' | 'phone' | 'url' | 'rating' | 'checkbox'>('text');
    const [tempRequired, setTempRequired] = useState(true);
    const [tempOptions, setTempOptions] = useState('');
    const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const dragFromIndex = useRef<number | null>(null);
    const [tempAllowOther, setTempAllowOther] = useState(false);
    const [tempPlaceholder, setTempPlaceholder] = useState('');
    const [tempHelpText, setTempHelpText] = useState('');
    const [tempDescription, setTempDescription] = useState('');

    const handleAddField = () => {
        if (!tempLabel && tempType !== 'description') return;
        const name = tempLabel ? tempLabel.toLowerCase().trim().replace(/[^a-z0-9]/g, '_') : 'desc_' + Math.random().toString(36).substr(2, 9);

        const newFieldData = {
            name,
            label: tempLabel,
            type: tempType,
            required: ['title', 'description'].includes(tempType) ? false : tempRequired,
            options: ['select', 'multiselect'].includes(tempType) ? tempOptions.split(',').map((o: string) => o.trim()).filter(Boolean) : [],
            allow_other: tempType === 'select' ? tempAllowOther : false,
            placeholder: ['text', 'number', 'email', 'textarea', 'phone', 'url'].includes(tempType) ? tempPlaceholder : '',
            help_text: tempHelpText,
            description: tempType === 'description' ? tempDescription : '',
        };

        if (editingFieldIndex !== null) {
            // Update existing field
            const updated = [...newFormFields];
            updated[editingFieldIndex] = newFieldData;
            setNewFormFields(updated);
            setEditingFieldIndex(null);
        } else {
            // Prevent duplicate field names when adding new (if input field)
            if (!['title', 'description'].includes(tempType) && newFormFields.some(f => f.name === name)) {
                alert('Field dengan nama label serupa sudah ada!');
                return;
            }
            setNewFormFields([...newFormFields, newFieldData]);
        }

        setTempLabel('');
        setTempType('text');
        setTempRequired(true);
        setTempOptions('');
        setTempAllowOther(false);
        setTempPlaceholder('');
        setTempHelpText('');
        setTempDescription('');
    };

    const handleEditFieldStart = (index: number) => {
        const field = newFormFields[index];
        setTempLabel(field.label || '');
        setTempType(field.type);
        setTempRequired(!!field.required);
        setTempOptions(Array.isArray(field.options) ? field.options.join(', ') : '');
        setTempAllowOther(field.allow_other === true);
        setTempPlaceholder(field.placeholder || '');
        setTempHelpText(field.help_text || '');
        setTempDescription(field.description || '');
        setEditingFieldIndex(index);
    };

    const handleCancelFieldEdit = () => {
        setTempLabel('');
        setTempType('text');
        setTempRequired(true);
        setTempOptions('');
        setTempAllowOther(false);
        setTempPlaceholder('');
        setTempHelpText('');
        setTempDescription('');
        setEditingFieldIndex(null);
    };

    const handleRemoveField = (index: number) => {
        if (editingFieldIndex === index) handleCancelFieldEdit();
        setNewFormFields(newFormFields.filter((_, i) => i !== index));
    };

    const handleDragStart = (idx: number) => {
        dragFromIndex.current = idx;
    };

    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        setDragOverIndex(idx);
    };

    const handleDrop = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        const from = dragFromIndex.current;
        if (from === null || from === idx) return;
        const updated = [...newFormFields];
        const [moved] = updated.splice(from, 1);
        updated.splice(idx, 0, moved);
        setNewFormFields(updated);
        // Adjust editingFieldIndex if necessary
        if (editingFieldIndex !== null) {
            if (editingFieldIndex === from) setEditingFieldIndex(idx);
            else if (from < idx && editingFieldIndex > from && editingFieldIndex <= idx) setEditingFieldIndex(editingFieldIndex - 1);
            else if (from > idx && editingFieldIndex < from && editingFieldIndex >= idx) setEditingFieldIndex(editingFieldIndex + 1);
        }
        dragFromIndex.current = null;
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        dragFromIndex.current = null;
        setDragOverIndex(null);
    };

    const handleEditForm = (form: Form) => {
        setEditingFormId(form.id);
        setNewFormTitle(form.title);
        setNewFormPrice(String(Math.round(parseFloat(form.ticket_price))));
        setNewFormMaxParticipants(form.max_participants ? String(form.max_participants) : '');
        // closed_at from server comes as ISO, convert to local datetime-local input format
        if (form.closed_at) {
            const d = new Date(form.closed_at);
            const pad = (n: number) => String(n).padStart(2, '0');
            setNewFormClosedAt(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
        } else {
            setNewFormClosedAt('');
        }
        setNewFormFields(form.fields_schema || []);
        setNewFormAdditionalFees(form.additional_fees || []);
        setIsBuildingForm(true);
    };

    const handleSaveFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFormTitle) {
            alert('Judul Form wajib diisi!');
            return;
        }
        if (newFormFields.length === 0) {
            alert('Harap tambahkan minimal satu field!');
            return;
        }

        const payload: any = {
            title: newFormTitle,
            ticket_price: parseFloat(newFormPrice),
            fields_schema: newFormFields,
            max_participants: newFormMaxParticipants ? parseInt(newFormMaxParticipants) : null,
            closed_at: newFormClosedAt || null,
            additional_fees: newFormAdditionalFees,
        };

        const resetFormStates = () => {
            setIsBuildingForm(false);
            setEditingFormId(null);
            setNewFormTitle('');
            setNewFormPrice('150000');
            setNewFormMaxParticipants('');
            setNewFormClosedAt('');
            setNewFormFields([]);
            setNewFormAdditionalFees([]);
        };

        if (editingFormId !== null) {
            router.post(route('admin.forms.update', editingFormId), payload, {
                onSuccess: resetFormStates
            });
        } else {
            router.post(route('admin.forms.store'), payload, {
                onSuccess: resetFormStates
            });
        }
    };

    const handleToggleForm = (formId: number) => {
        router.post(route('admin.forms.toggle', formId), {}, {
            preserveScroll: true
        });
    };

    const handleDeleteForm = (formId: number) => {
        triggerConfirm(
            'Hapus Form',
            'Apakah Anda yakin ingin menghapus form ini? Semua data pendaftar yang berkaitan dengan form ini mungkin akan terpengaruh.',
            () => {
                router.delete(route('admin.forms.destroy', formId), {
                    preserveScroll: true
                });
            }
        );
    };

    const initialSocialLinks = React.useMemo(() => {
        try {
            return settings.social_media_links ? JSON.parse(settings.social_media_links) : [];
        } catch (e) {
            return [];
        }
    }, [settings.social_media_links]);

    const initialSponsors = React.useMemo(() => {
        try {
            const list = settings.event_sponsors ? JSON.parse(settings.event_sponsors) : [];
            return list.map((sp: any) => ({
                ...sp,
                is_custom: !['Platinum', 'Gold', 'Silver', 'Bronze', 'Media Partner', 'Supported By'].includes(sp.category)
            }));
        } catch (e) {
            return [];
        }
    }, [settings.event_sponsors]);

    // Form helper for Settings
    const { data, setData, post, processing, errors } = useForm({
        event_title: settings.event_title || '',
        ticket_prefix: settings.ticket_prefix || 'ZWF',
        event_description: settings.event_description || '',
        event_date: settings.event_date || '',
        social_media_links: initialSocialLinks,
        event_sponsors: initialSponsors,
        event_organized_by: settings.event_organized_by || '',
        event_developed_by: settings.event_developed_by || '',
        event_organized_by_url: settings.event_organized_by_url || '',
        event_developed_by_url: settings.event_developed_by_url || '',
        event_time: settings.event_time || '',
        event_location: settings.event_location || '',
        event_location_map: settings.event_location_map || '',
        event_venue_name: settings.event_venue_name || '',
        event_venue_address: settings.event_venue_address || '',
        event_dresscode: settings.event_dresscode || '',
        event_type: settings.event_type || 'offline',
        event_platform: settings.event_platform || 'zoom',
        event_platform_url: settings.event_platform_url || '',
        event_platform_id: settings.event_platform_id || '',
        event_platform_passcode: settings.event_platform_passcode || '',
        event_platform_custom_name: settings.event_platform_custom_name || '',
        online_ticket_type: settings.online_ticket_type || 'free',
        online_ticket_price: settings.online_ticket_price || '0',
        event_banner: null as File | null,
        event_favicon: null as File | null,
        event_logo: null as File | null,
        wa_admin_number: settings.wa_admin_number || '',
        wa_custom_message: settings.wa_custom_message || '',
        ticket_sending_method: settings.ticket_sending_method || 'manual',
        auto_send_ticket_email: settings.auto_send_ticket_email === '1' || settings.auto_send_ticket_email === 'true',
        auto_send_ticket_whatsapp: settings.auto_send_ticket_whatsapp === '1' || settings.auto_send_ticket_whatsapp === 'true',
        smtp_host: settings.smtp_host || '',
        smtp_port: settings.smtp_port || '',
        smtp_username: settings.smtp_username || '',
        smtp_password: settings.smtp_password || '',
        smtp_from_address: settings.smtp_from_address || '',
        smtp_from_name: settings.smtp_from_name || '',
        enable_payment_manual: settings.enable_payment_manual === '1' || settings.enable_payment_manual === 'true' || settings.enable_payment_manual === '',
        enable_payment_midtrans: settings.enable_payment_midtrans === '1' || settings.enable_payment_midtrans === 'true',
        midtrans_client_key: settings.midtrans_client_key || '',
        midtrans_server_key: settings.midtrans_server_key || '',
        midtrans_is_production: settings.midtrans_is_production === '1' || settings.midtrans_is_production === 'true',
        enable_fonnte: settings.enable_fonnte === '1' || settings.enable_fonnte === 'true',
        fonnte_token: settings.fonnte_token || '',
        payment_manual_bank_name: settings.payment_manual_bank_name || '',
        payment_manual_account_number: settings.payment_manual_account_number || '',
        payment_manual_account_name: settings.payment_manual_account_name || '',
        admin_passcode: settings.admin_passcode || '',
        notification_wa_numbers: settings.notification_wa_numbers || '',
        notification_emails: settings.notification_emails || '',
        meta_description: settings.meta_description || '',
        meta_keywords: settings.meta_keywords || '',
        og_title: settings.og_title || '',
        og_description: settings.og_description || '',
        og_image: null as File | null,
        funwalk_route_image: null as File | null,
        funwalk_route_description: settings.funwalk_route_description || '',
        funwalk_racepack_image: null as File | null,
        funwalk_racepack_info: settings.funwalk_racepack_info || '',
        funwalk_schedule: settings.funwalk_schedule || '',
        funwalk_faq: settings.funwalk_faq || '',
        funwalk_terms: settings.funwalk_terms || '',
        funwalk_contact: settings.funwalk_contact || '',
        funwalk_map_center: settings.funwalk_map_center || '',
        funwalk_map_zoom: settings.funwalk_map_center ? settings.funwalk_map_zoom || '13' : '',
        funwalk_map_route: settings.funwalk_map_route || '',
        funwalk_map_markers: settings.funwalk_map_markers || '',
    });

    // Separate form for Realtime Settings
    const { data: realtimeData, setData: setRealtimeData, post: postRealtime, processing: realtimeProcessing } = useForm({
        realtime_enabled: settings.realtime_enabled === '0' ? '0' : '1',
        realtime_stop_at: settings.realtime_stop_at || '',
        broadcaster_type: settings.broadcaster_type || 'reverb',
        pusher_app_id: settings.pusher_app_id || '',
        pusher_app_key: settings.pusher_app_key || '',
        pusher_app_secret: settings.pusher_app_secret || '',
        pusher_app_cluster: settings.pusher_app_cluster || '',
    });

    const handleSaveRealtimeSettings = (e: React.FormEvent) => {
        e.preventDefault();
        postRealtime(route('admin.settings.realtime'));
    };

    const handleSaveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.settings.update'), {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    const handleAddSocialLink = () => {
        const currentLinks = [...(data.social_media_links || [])];
        currentLinks.push({ name: '', username: '', url: '', icon_path: '', icon_file: null });
        setData('social_media_links', currentLinks);
    };

    const handleRemoveSocialLink = (index: number) => {
        const currentLinks = [...(data.social_media_links || [])];
        currentLinks.splice(index, 1);
        setData('social_media_links', currentLinks);
    };

    const handleSocialLinkChange = (index: number, key: 'name' | 'username' | 'url' | 'icon_file', value: any) => {
        const currentLinks = [...(data.social_media_links || [])];
        if (key === 'icon_file') {
            currentLinks[index] = {
                ...currentLinks[index],
                icon_file: value,
                icon_preview: value ? URL.createObjectURL(value) : null
            };
        } else {
            currentLinks[index] = {
                ...currentLinks[index],
                [key]: value
            };
        }
        setData('social_media_links', currentLinks);
    };

    const handleAddSponsor = () => {
        const current = [...(data.event_sponsors || [])];
        current.push({ category: 'Platinum', name: '', url: '', logo_path: '', logo_file: null, is_custom: false });
        setData('event_sponsors', current);
    };

    const handleToggleSponsorCustom = (index: number) => {
        const current = [...(data.event_sponsors || [])];
        const nextVal = !current[index].is_custom;
        current[index] = {
            ...current[index],
            is_custom: nextVal,
            category: nextVal ? '' : 'Platinum'
        };
        setData('event_sponsors', current);
    };

    const handleRemoveSponsor = (index: number) => {
        const current = [...(data.event_sponsors || [])];
        current.splice(index, 1);
        setData('event_sponsors', current);
    };

    const handleSponsorChange = (index: number, key: 'category' | 'name' | 'url' | 'logo_file', value: any) => {
        const current = [...(data.event_sponsors || [])];
        if (key === 'logo_file') {
            current[index] = {
                ...current[index],
                logo_file: value,
                logo_preview: value ? URL.createObjectURL(value) : null
            };
        } else {
            current[index] = {
                ...current[index],
                [key]: value
            };
        }
        setData('event_sponsors', current);
    };

    const handleTogglePlugin = (pluginId: string) => {
        router.post(route('admin.plugins.toggle', pluginId), {}, {
            preserveScroll: true
        });
    };

    const handleSaveVoucher = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (voucherType === 'percentage' && parseFloat(voucherValue) > 100) {
            triggerAlert('Validasi Voucher', 'Nilai potongan persentase tidak boleh melebihi 100%!');
            return;
        }

        setIsSavingVoucher(true);

        const payload = {
            mode: voucherMode,
            type: voucherType,
            value: parseFloat(voucherValue),
            category: voucherCategory,
            code: voucherCode,
            max_uses: parseInt(voucherMaxUses),
            prefix: voucherPrefix,
            quantity: parseInt(voucherQty),
        };

        router.post(route('admin.vouchers.store'), payload, {
            preserveScroll: true,
            onSuccess: () => {
                setVoucherCode('');
                setIsSavingVoucher(false);
            },
            onError: () => {
                setIsSavingVoucher(false);
            }
        });
    };

    const handleToggleVoucher = (id: number) => {
        router.post(route('admin.vouchers.toggle', id), {}, {
            preserveScroll: true
        });
    };

    const handleDeleteVoucher = (id: number) => {
        triggerConfirm(
            'Hapus Voucher',
            'Apakah Anda yakin ingin menghapus voucher ini?',
            () => {
                router.delete(route('admin.vouchers.destroy', id), {
                    preserveScroll: true
                });
            }
        );
    };

    const handleTogglePluginAdditional = (pluginId: string) => {
        router.post(route('admin.plugins.toggle_additional', pluginId), {}, {
            preserveScroll: true
        });
    };

    // Broadcast feature states
    const [selectedTemplate, setSelectedTemplate] = useState<BroadcastTemplate | null>(() => {
        if (typeof window !== 'undefined') {
            const savedId = localStorage.getItem('admin_selected_template_id');
            if (savedId) {
                const found = broadcastTemplates.find(t => t.id === parseInt(savedId));
                if (found) return found;
            }
        }
        return broadcastTemplates[0] || null;
    });
    const [editorSubTab, setEditorSubTab] = useState<'whatsapp' | 'email'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('admin_editor_sub_tab') as 'whatsapp' | 'email') || 'whatsapp';
        }
        return 'whatsapp';
    });
    const [emailEditMode, setEmailEditMode] = useState<'editor' | 'preview'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('admin_email_edit_mode') as 'editor' | 'preview') || 'editor';
        }
        return 'editor';
    });
    const [whatsappEditMode, setWhatsappEditMode] = useState<'editor' | 'preview'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('admin_whatsapp_edit_mode') as 'editor' | 'preview') || 'editor';
        }
        return 'editor';
    });
    const editablePreviewRef = useRef<HTMLDivElement>(null);

    const templateForm = useForm<{
        whatsapp_body: string;
        email_subject: string;
        email_body: string;
        email_narrative: string;
        email_banner_file: File | null;
    }>({
        whatsapp_body: selectedTemplate?.whatsapp_body || selectedTemplate?.body || '',
        email_subject: selectedTemplate?.email_subject || selectedTemplate?.subject || '',
        email_body: selectedTemplate?.email_body || selectedTemplate?.body || '',
        email_narrative: selectedTemplate?.email_narrative || '',
        email_banner_file: null,
    });

    useEffect(() => {
        if (selectedTemplate) {
            templateForm.setData({
                whatsapp_body: selectedTemplate.whatsapp_body || selectedTemplate.body || '',
                email_subject: selectedTemplate.email_subject || selectedTemplate.subject || '',
                email_body: selectedTemplate.email_body || selectedTemplate.body || '',
                email_narrative: selectedTemplate.email_narrative || '',
                email_banner_file: null,
            });
            // Use setTimeout to ensure DOM element is mounted when switching tabs
            setTimeout(() => {
                if (editablePreviewRef.current) {
                    editablePreviewRef.current.innerHTML = selectedTemplate.email_narrative || '';
                }
            }, 50);
        }
    }, [selectedTemplate, editorSubTab, emailEditMode]);

    // Sync selectedTemplate when props change after save
    useEffect(() => {
        if (selectedTemplate) {
            const updated = broadcastTemplates.find(t => t.id === selectedTemplate.id);
            if (updated) {
                setSelectedTemplate(updated);
            }
        }
    }, [broadcastTemplates]);

    const handleSaveTemplate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTemplate) return;
        
        // Since we have a file upload, we must submit it as a standard POST request
        templateForm.post(route('admin.broadcast.update_template', selectedTemplate.id), {
            preserveScroll: true,
            onSuccess: () => {
                // Reset file input
                templateForm.setData('email_banner_file', null);
            }
        });
    };

    const [filterPayment, setFilterPayment] = useState<string>('all');
    const [filterAttendance, setFilterAttendance] = useState<string>('all');
    const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<number[]>([]);
    const [broadcastTemplateId, setBroadcastTemplateId] = useState<number>(broadcastTemplates[0]?.id || 0);
    const [broadcastChannel, setBroadcastChannel] = useState<'email' | 'whatsapp_me' | 'whatsapp_fonnte'>('email');

    const broadcastStats = useMemo(() => {
        const total = broadcastLogs.length;
        const sent = broadcastLogs.filter(log => log.status === 'sent').length;
        const failed = broadcastLogs.filter(log => log.status === 'failed').length;
        const pending = broadcastLogs.filter(log => log.status === 'pending').length;

        return {
            total,
            sent,
            failed,
            pending,
            sentPct: total > 0 ? (sent / total) * 100 : 0,
            failedPct: total > 0 ? (failed / total) * 100 : 0,
            pendingPct: total > 0 ? (pending / total) * 100 : 0,
        };
    }, [broadcastLogs]);

    const parseClientTemplate = (text: string, attendee: any) => {
        if (!text) return '';
        const name = attendee.registration_data?.fullname || attendee.registration_data?.nama || attendee.registration_data?.name || 'Peserta';
        const ticketCode = attendee.ticket_code;
        const attendanceMode = attendee.registration_data?.attendance_mode || 'OFFLINE';
        const paymentStatus = attendee.payment_status;
        const paymentMethod = attendee.payment_method;
        
        const placeholders: { [key: string]: string } = {
            '{nama}': name,
            '{ticket_code}': ticketCode,
            '{attendance_mode}': attendanceMode.toUpperCase(),
            '{payment_status}': paymentStatus.toUpperCase(),
            '{payment_method}': paymentMethod ? paymentMethod.toUpperCase() : '',
            '{ticket_url}': `${window.location.origin}/registration-success/${ticketCode}`,
            '{event_title}': settings.event_title || 'Zawawalk 2026',
            '{event_date}': settings.event_date || '',
            '{event_time}': settings.event_time || '',
            '{event_location}': settings.event_location || '',
            '{wa_admin_number}': settings.wa_admin_number || '',
        };
        
        let parsed = text;
        Object.keys(placeholders).forEach(key => {
            parsed = parsed.replace(new RegExp(key, 'g'), placeholders[key]);
        });
        return parsed;
    };

    const filteredAttendees = useMemo(() => {
        return attendees.map(att => {
            const formSchema = forms.find(f => f.id === att.registration_form_id);
            const emailField = (formSchema?.fields_schema || []).find((f: any) => f.type === 'email');
            const email = emailField ? (att.registration_data[emailField.name] ?? null) : null;
            
            let phone = att.registration_data.whatsapp || att.registration_data.wa || att.registration_data.telp || att.registration_data.phone || att.registration_data.hp || '';
            if (!phone) {
                // fallback scan
                for (const key of Object.keys(att.registration_data)) {
                    if (key.includes('wa') || key.includes('phone') || key.includes('telp') || key.includes('hp')) {
                        phone = att.registration_data[key];
                        break;
                    }
                }
            }

            let name = att.registration_data.fullname || att.registration_data.nama || att.registration_data.name || '';
            if (!name) {
                // fallback scan
                for (const key of Object.keys(att.registration_data)) {
                    if (key.includes('nama') || key.includes('name')) {
                        name = att.registration_data[key];
                        break;
                    }
                }
            }
            if (!name) name = 'Peserta';

            return {
                ...att,
                _email: email,
                _phone: phone,
                _name: name
            };
        }).filter(att => {
            const matchPayment = filterPayment === 'all' || att.payment_status === filterPayment;
            const matchAttendance = filterAttendance === 'all' || (att.registration_data?.attendance_mode || 'offline') === filterAttendance;
            return matchPayment && matchAttendance;
        });
    }, [attendees, filterPayment, filterAttendance, forms]);

    const handleSelectAll = () => {
        if (selectedAttendeeIds.length === filteredAttendees.length) {
            setSelectedAttendeeIds([]);
        } else {
            setSelectedAttendeeIds(filteredAttendees.map(a => a.id));
        }
    };

    const handleToggleSelectAttendee = (id: number) => {
        if (selectedAttendeeIds.includes(id)) {
            setSelectedAttendeeIds(prev => prev.filter(x => x !== id));
        } else {
            setSelectedAttendeeIds(prev => [...prev, id]);
        }
    };

    const handleSendBulk = () => {
        if (selectedAttendeeIds.length === 0) {
            alert('Pilih minimal 1 peserta untuk melakukan broadcast.');
            return;
        }
        if (!confirm(`Apakah Anda yakin ingin mengirim broadcast ke ${selectedAttendeeIds.length} peserta?`)) {
            return;
        }
        router.post(route('admin.broadcast.send_bulk'), {
            attendee_ids: selectedAttendeeIds,
            template_id: broadcastTemplateId,
            channel: broadcastChannel,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                alert('Proses broadcast selesai.');
            }
        });
    };

    const handleSendIndividual = (attendeeId: number, channel: 'email' | 'whatsapp_me' | 'whatsapp_fonnte') => {
        if (channel === 'whatsapp_me') {
            const attendee = filteredAttendees.find(a => a.id === attendeeId);
            const template = broadcastTemplates.find(t => t.id === broadcastTemplateId);
            if (!attendee || !template) return;

            const phone = attendee._phone;
            if (!phone) {
                alert('Nomor WhatsApp tidak ditemukan pada peserta ini.');
                return;
            }

            const parsedBody = parseClientTemplate(template.body, attendee);
            let cleanPhone = phone.replace(/\D/g, '');
            if (cleanPhone.startsWith('0')) {
                cleanPhone = '62' + cleanPhone.slice(1);
            }

            const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(parsedBody)}`;
            window.open(waUrl, '_blank');

            router.post(route('admin.broadcast.send_individual'), {
                attendee_id: attendeeId,
                template_id: broadcastTemplateId,
                channel: 'whatsapp_me',
            }, { preserveScroll: true });
        } else {
            router.post(route('admin.broadcast.send_individual'), {
                attendee_id: attendeeId,
                template_id: broadcastTemplateId,
                channel: channel,
            }, { 
                preserveScroll: true,
                onSuccess: () => {
                    alert('Broadcast berhasil dikirim.');
                }
            });
        }
    };

    const merchandisePluginData = plugins.find(p => p.id === 'merchandise');
    const initialMerchSettings: any = {
        title: merchandisePluginData?.settings?.title || '',
        description: merchandisePluginData?.settings?.description || '',
        kaos: merchandisePluginData?.settings?.kaos || { enabled: false, required: false, price: 75000, description: '', sizes: 'S,M,L,XL,XXL', image: '', enable_nickname: false, max_nickname_chars: 12, enable_colors: false, colors_list: '', enable_sleeves: false, long_sleeve_surcharge: 0, variant_images: {}, size_charts: {} },
        jaket: merchandisePluginData?.settings?.jaket || { enabled: false, required: false, price: 250000, description: '', sizes: 'M,L,XL', image: '', enable_nickname: false, max_nickname_chars: 12 },
        jersey: merchandisePluginData?.settings?.jersey || { enabled: false, required: false, price: 100000, description: '', sizes: 'S,M,L,XL,XXL', image: '', enable_nickname: false, max_nickname_chars: 12 },
        emoney: merchandisePluginData?.settings?.emoney || { enabled: false, required: false, price: 50000, description: '', image: '' },
        tumbler: merchandisePluginData?.settings?.tumbler || { enabled: false, required: false, price: 50000, description: '', image: '' }
    };

    // Ensure clothes items have sizes_prices mapped
    ['kaos', 'jaket', 'jersey'].forEach(item => {
        if (initialMerchSettings[item]) {
            if (!initialMerchSettings[item].sizes_prices) {
                const sizesStr = initialMerchSettings[item].sizes || '';
                const sizesArr = sizesStr ? String(sizesStr).split(',').map((s: string) => s.trim()) : [];
                initialMerchSettings[item].sizes_prices = sizesArr.map((sz: string) => ({
                    size: sz,
                    price: initialMerchSettings[item].price || 0
                }));
            }
        }
    });

    const [merchForm, setMerchForm] = useState(initialMerchSettings);

    const donationPluginData = plugins.find(p => p.id === 'donation');
    const [donationForm, setDonationForm] = useState({
        title: donationPluginData?.settings?.title || '',
        description: donationPluginData?.settings?.description || ''
    });

    useEffect(() => {
        const donationData = plugins.find(p => p.id === 'donation');
        setDonationForm({
            title: donationData?.settings?.title || '',
            description: donationData?.settings?.description || ''
        });

        const merchandiseData = plugins.find(p => p.id === 'merchandise');
        if (merchandiseData?.settings) {
            setMerchForm({
                title: merchandiseData.settings.title || '',
                description: merchandiseData.settings.description || '',
                kaos: merchandiseData.settings.kaos || { enabled: false, required: false, price: 75000, description: '', sizes: 'S,M,L,XL,XXL', image: '', enable_nickname: false, max_nickname_chars: 12, enable_colors: false, colors_list: '', enable_sleeves: false, long_sleeve_surcharge: 0, variant_images: {}, size_charts: {} },
                jaket: merchandiseData.settings.jaket || { enabled: false, required: false, price: 250000, description: '', sizes: 'M,L,XL', image: '', enable_nickname: false, max_nickname_chars: 12 },
                jersey: merchandiseData.settings.jersey || { enabled: false, required: false, price: 100000, description: '', sizes: 'S,M,L,XL,XXL', image: '', enable_nickname: false, max_nickname_chars: 12 },
                emoney: merchandiseData.settings.emoney || { enabled: false, required: false, price: 50000, description: '', image: '' },
                tumbler: merchandiseData.settings.tumbler || { enabled: false, required: false, price: 50000, description: '', image: '' }
            });
        }
    }, [plugins]);

    const handleSaveDonationSettings = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('settings[title]', donationForm.title);
        formData.append('settings[description]', donationForm.description);

        router.post(route('admin.plugins.settings', 'donation'), formData as any, {
            forceFormData: true,
            preserveScroll: true
        });
    };

    const handleUpdateSizePrice = (item: string, idx: number, key: 'size' | 'price', value: any) => {
        setMerchForm((prev: any) => {
            const currentItem = prev[item] || {};
            const sizesPrices = [...(currentItem.sizes_prices || [])];
            sizesPrices[idx] = {
                ...sizesPrices[idx],
                [key]: value
            };
            return {
                ...prev,
                [item]: {
                    ...currentItem,
                    sizes_prices: sizesPrices
                }
            };
        });
    };

    const handleRemoveSizePrice = (item: string, idx: number) => {
        setMerchForm((prev: any) => {
            const currentItem = prev[item] || {};
            const sizesPrices = (currentItem.sizes_prices || []).filter((_: any, i: number) => i !== idx);
            return {
                ...prev,
                [item]: {
                    ...currentItem,
                    sizes_prices: sizesPrices
                }
            };
        });
    };

    const handleAddSizePrice = (item: string) => {
        setMerchForm((prev: any) => {
            const currentItem = prev[item] || {};
            const sizesPrices = [...(currentItem.sizes_prices || [])];
            sizesPrices.push({ size: '', price: currentItem.price || 75000 });
            return {
                ...prev,
                [item]: {
                    ...currentItem,
                    sizes_prices: sizesPrices
                }
            };
        });
    };
    const [merchImages, setMerchImages] = useState<{ [key: string]: File | null }>({});
    const [merchPreviews, setMerchPreviews] = useState<{ [key: string]: string | null }>({
        kaos: initialMerchSettings.kaos?.image || null,
        jaket: initialMerchSettings.jaket?.image || null,
        jersey: initialMerchSettings.jersey?.image || null,
        emoney: initialMerchSettings.emoney?.image || null,
        tumbler: initialMerchSettings.tumbler?.image || null
    });
    
    const [merchSizeChartImages, setMerchSizeChartImages] = useState<{ [key: string]: File | null }>({});
    const [merchSizeChartPreviews, setMerchSizeChartPreviews] = useState<{ [key: string]: string | null }>({
        kaos: initialMerchSettings.kaos?.size_chart_image || null,
        jaket: initialMerchSettings.jaket?.size_chart_image || null,
        jersey: initialMerchSettings.jersey?.size_chart_image || null
    });

    const getKaosCombinations = (config: any) => {
        const enableColors = config.enable_colors === true || String(config.enable_colors) === 'true';
        const enableSleeves = config.enable_sleeves === true || String(config.enable_sleeves) === 'true';
        const colors = enableColors && config.colors_list
            ? String(config.colors_list).split(',').map((c: string) => c.trim()).filter(Boolean)
            : [];
        const sleeves = enableSleeves ? ['Lengan Pendek', 'Lengan Panjang'] : [];
        
        const combinations: string[] = [];
        if (enableColors && colors.length > 0 && enableSleeves && sleeves.length > 0) {
            colors.forEach(c => {
                sleeves.forEach(s => {
                    combinations.push(`${c}_${s}`);
                });
            });
        } else if (enableColors && colors.length > 0) {
            colors.forEach(c => {
                combinations.push(`${c}_Lengan Pendek`);
            });
        } else if (enableSleeves && sleeves.length > 0) {
            sleeves.forEach(s => {
                combinations.push(`Default_${s}`);
            });
        } else {
            combinations.push('Default');
        }
        return combinations;
    };

    const [kaosVariantImages, setKaosVariantImages] = useState<{ [combination: string]: File | null }>({});
    const [kaosVariantPreviews, setKaosVariantPreviews] = useState<{ [combination: string]: string | null }>(initialMerchSettings.kaos?.variant_images || {});
    const [kaosSizeCharts, setKaosSizeCharts] = useState<{ [sleeve: string]: File | null }>({});
    const [kaosSizeChartPreviews, setKaosSizeChartPreviews] = useState<{ [sleeve: string]: string | null }>(initialMerchSettings.kaos?.size_charts || {});

    const handleKaosVariantImageChange = (combination: string, file: File | null) => {
        if (!file) {
            setKaosVariantImages(prev => ({ ...prev, [combination]: null }));
            setKaosVariantPreviews(prev => ({ ...prev, [combination]: null }));
            return;
        }
        setKaosVariantImages(prev => ({ ...prev, [combination]: file }));
        const reader = new FileReader();
        reader.onloadend = () => {
            setKaosVariantPreviews(prev => ({ ...prev, [combination]: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const handleKaosSizeChartChange = (sleeve: string, file: File | null) => {
        if (!file) {
            setKaosSizeCharts(prev => ({ ...prev, [sleeve]: null }));
            setKaosSizeChartPreviews(prev => ({ ...prev, [sleeve]: null }));
            return;
        }
        setKaosSizeCharts(prev => ({ ...prev, [sleeve]: file }));
        const reader = new FileReader();
        reader.onloadend = () => {
            setKaosSizeChartPreviews(prev => ({ ...prev, [sleeve]: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const handleMerchFieldChange = (item: string, field: string, value: any) => {
        setMerchForm((prev: any) => ({
            ...prev,
            [item]: {
                ...(prev[item] || {}),
                [field]: value
            }
        }));
    };

    const handleMerchImageChange = (item: string, file: File | null) => {
        if (!file) {
            setMerchImages((prev: any) => ({ ...prev, [item]: null }));
            setMerchPreviews((prev: any) => ({ ...prev, [item]: null }));
            return;
        }

        setMerchImages((prev: any) => ({ ...prev, [item]: file }));
        const reader = new FileReader();
        reader.onloadend = () => {
            setMerchPreviews((prev: any) => ({ ...prev, [item]: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const handleMerchSizeChartImageChange = (item: string, file: File | null) => {
        if (!file) {
            setMerchSizeChartImages((prev: any) => ({ ...prev, [item]: null }));
            setMerchSizeChartPreviews((prev: any) => ({ ...prev, [item]: null }));
            return;
        }

        setMerchSizeChartImages((prev: any) => ({ ...prev, [item]: file }));
        const reader = new FileReader();
        reader.onloadend = () => {
            setMerchSizeChartPreviews((prev: any) => ({ ...prev, [item]: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const handleSaveMerchSettings = (e: React.FormEvent) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('settings[title]', merchForm.title || '');
        formData.append('settings[description]', merchForm.description || '');

        ['kaos', 'jaket', 'jersey', 'emoney', 'tumbler'].forEach(item => {
            const config = merchForm[item] || {};
            formData.append(`settings[${item}][enabled]`, String(config.enabled ?? false));
            formData.append(`settings[${item}][required]`, String(config.required ?? false));
            formData.append(`settings[${item}][price]`, String(config.price ?? 0));
            formData.append(`settings[${item}][description]`, config.description ?? '');
            formData.append(`settings[${item}][name]`, config.name || (item === 'kaos' ? 'Kaos Retro' : item === 'jaket' ? 'Jaket Varsity' : item === 'jersey' ? 'Jersey Premium' : item === 'emoney' ? 'E-Money Edisi Khusus' : 'Tumbler Reuni'));
            
            if (['kaos', 'jaket', 'jersey'].includes(item)) {
                const spList = config.sizes_prices || [];
                spList.forEach((sp: any, idx: number) => {
                    formData.append(`settings[${item}][sizes_prices][${idx}][size]`, sp.size || '');
                    formData.append(`settings[${item}][sizes_prices][${idx}][price]`, String(sp.price || 0));
                });
                const sizesStr = spList.map((sp: any) => sp.size).filter(Boolean).join(',');
                formData.append(`settings[${item}][sizes]`, sizesStr);
                formData.append(`settings[${item}][enable_nickname]`, String(config.enable_nickname ?? false));
                formData.append(`settings[${item}][max_nickname_chars]`, String(config.max_nickname_chars ?? 12));

                if (item === 'kaos') {
                    formData.append(`settings[${item}][enable_colors]`, String(config.enable_colors ?? false));
                    formData.append(`settings[${item}][colors_list]`, config.colors_list ?? '');
                    formData.append(`settings[${item}][enable_sleeves]`, String(config.enable_sleeves ?? false));
                    formData.append(`settings[${item}][long_sleeve_surcharge]`, String(config.long_sleeve_surcharge ?? 0));

                    // Append variant images
                    const combinations = getKaosCombinations(config);
                    combinations.forEach(comb => {
                        if (kaosVariantImages[comb]) {
                            formData.append(`settings[${item}][variant_images][${comb}]`, kaosVariantImages[comb]!);
                        }
                    });

                    // Append size charts
                    const enableSleeves = config.enable_sleeves === true || String(config.enable_sleeves) === 'true';
                    const sleevesToSave = enableSleeves ? ['Lengan Pendek', 'Lengan Panjang'] : ['Lengan Pendek'];
                    sleevesToSave.forEach(s => {
                        if (kaosSizeCharts[s]) {
                            formData.append(`settings[${item}][size_charts][${s}]`, kaosSizeCharts[s]!);
                        }
                    });
                }
            }
            
            if (item !== 'kaos' && merchImages[item]) {
                formData.append(`settings[${item}][image]`, merchImages[item]);
            }
            
            if (item !== 'kaos' && ['kaos', 'jaket', 'jersey'].includes(item) && merchSizeChartImages[item]) {
                formData.append(`settings[${item}][size_chart_image]`, merchSizeChartImages[item]);
            }
        });

        router.post(route('admin.plugins.settings', 'merchandise'), formData as any, {
            forceFormData: true,
            preserveScroll: true
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        <Sparkles className="h-7 w-7 text-orange-500 fill-orange-100 animate-pulse" />
                        Zawawalk Admin Control
                    </h2>
                    <span className="bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold px-4 py-1.5 text-xs rounded-full shadow-md uppercase tracking-wider">
                        Vibrant Edition
                    </span>
                </div>
            }
        >
            <Head title="Admin Control Dashboard" />

            <div className="py-6 px-4 max-w-7xl mx-auto space-y-8 text-black">
                
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Stat Card 1 */}
                    <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-6 rounded-2xl shadow-lg shadow-orange-100/30 relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-xl">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-white/80">Total Registered</p>
                                <h3 className="text-4xl font-extrabold mt-2">{stats.total_registered}</h3>
                            </div>
                            <div className="p-3 bg-white/10 text-white border border-white/20 rounded-xl backdrop-blur-sm shadow-inner">
                                <Users className="h-6 w-6" />
                            </div>
                        </div>
                        <div className="absolute right-0 bottom-0 translate-y-4 translate-x-2 text-white/5 text-7xl font-black select-none">ZAWA</div>
                    </div>

                    {/* Stat Card 2 */}
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-6 rounded-2xl shadow-lg shadow-teal-100/30 relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-xl">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-white/80">Racepack Diambil</p>
                                <h3 className="text-4xl font-extrabold mt-2">{stats.checked_in}</h3>
                            </div>
                            <div className="p-3 bg-white/10 text-white border border-white/20 rounded-xl backdrop-blur-sm shadow-inner">
                                <CheckSquare className="h-6 w-6" />
                            </div>
                        </div>
                    </div>

                    {/* Stat Card 3 */}
                    <div className="bg-gradient-to-br from-rose-500 to-pink-600 text-white p-6 rounded-2xl shadow-lg shadow-rose-100/30 relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-xl">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-white/80">Pending Verification</p>
                                <h3 className="text-4xl font-extrabold mt-2">{stats.pending_payment}</h3>
                            </div>
                            <div className="p-3 bg-white/10 text-white border border-white/20 rounded-xl backdrop-blur-sm shadow-inner">
                                <CreditCard className="h-6 w-6" />
                            </div>
                        </div>
                    </div>

                    {/* Stat Card 4 */}
                    <div className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white p-6 rounded-2xl shadow-lg shadow-indigo-100/30 relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-xl">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-white/80">Total Paid Attendees</p>
                                <h3 className="text-4xl font-extrabold mt-2">{stats.paid_payment}</h3>
                            </div>
                            <div className="p-3 bg-white/10 text-white border border-white/20 rounded-xl backdrop-blur-sm shadow-inner">
                                <Sparkles className="h-6 w-6" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Configuration Area */}
                <div className="bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-150/30 overflow-hidden">
                    {/* Navigation Tabs */}
                    <div className="flex overflow-x-auto whitespace-nowrap border-b border-slate-100 bg-slate-50/50 scrollbar-hide">
                        {isAdmin && (
                            <>
                                <button
                                    onClick={() => setActiveTab('event')}
                                    className={`flex items-center gap-2 px-6 py-4 font-bold text-xs uppercase transition-all shrink-0 ${
                                        activeTab === 'event' 
                                            ? 'bg-white text-indigo-650 border-b-2 border-indigo-600 font-extrabold' 
                                            : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-800'
                                    }`}
                                >
                                    <Settings className="h-4 w-4" />
                                    Event Details
                                </button>
                                <button
                                    onClick={() => setActiveTab('payment')}
                                    className={`flex items-center gap-2 px-6 py-4 font-bold text-xs uppercase transition-all shrink-0 ${
                                        activeTab === 'payment' 
                                            ? 'bg-white text-indigo-650 border-b-2 border-indigo-600 font-extrabold' 
                                            : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-800'
                                    }`}
                                >
                                    <Mail className="h-4 w-4" />
                                    Payment & SMTP
                                </button>
                                <button
                                    onClick={() => setActiveTab('forms')}
                                    className={`flex items-center gap-2 px-6 py-4 font-bold text-xs uppercase transition-all shrink-0 ${
                                        activeTab === 'forms' 
                                            ? 'bg-white text-indigo-650 border-b-2 border-indigo-600 font-extrabold' 
                                            : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-800'
                                    }`}
                                >
                                    <FileText className="h-4 w-4" />
                                    Dynamic Forms
                                </button>
                                <button
                                    onClick={() => setActiveTab('plugins')}
                                    className={`flex items-center gap-2 px-6 py-4 font-bold text-xs uppercase transition-all shrink-0 ${
                                        activeTab === 'plugins' 
                                            ? 'bg-white text-indigo-650 border-b-2 border-indigo-600 font-extrabold' 
                                            : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-800'
                                    }`}
                                >
                                    <Layers className="h-4 w-4" />
                                    Modular Plugins
                                </button>
                                {plugins.find(p => p.id === 'voucher')?.is_active && (
                                    <button
                                        onClick={() => setActiveTab('vouchers')}
                                        className={`flex items-center gap-2 px-6 py-4 font-bold text-xs uppercase transition-all shrink-0 ${
                                            activeTab === 'vouchers' 
                                                ? 'bg-white text-indigo-650 border-b-2 border-indigo-600 font-extrabold' 
                                                : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-800'
                                        }`}
                                    >
                                        <Gift className="h-4 w-4 text-emerald-500" />
                                        Voucher
                                    </button>
                                )}
                            </>
                        )}
                        <button
                            onClick={() => setActiveTab('attendees')}
                            className={`flex items-center gap-2 px-6 py-4 font-bold text-xs uppercase transition-all shrink-0 ${
                                activeTab === 'attendees' 
                                    ? 'bg-white text-indigo-650 border-b-2 border-indigo-600 font-extrabold' 
                                    : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-800'
                            }`}
                        >
                            <Users className="h-4 w-4" />
                            Attendees
                        </button>
                        <button
                            onClick={() => setActiveTab('checkin')}
                            className={`flex items-center gap-2 px-6 py-4 font-bold text-xs uppercase transition-all shrink-0 ${
                                activeTab === 'checkin' 
                                    ? 'bg-white text-indigo-650 border-b-2 border-indigo-600 font-extrabold' 
                                    : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-800'
                            }`}
                        >
                            <Camera className="h-4 w-4" />
                            Scanner Racepack
                        </button>
                        {isAdmin && (
                            <>
                                <button
                                    onClick={() => setActiveTab('report')}
                                    className={`flex items-center gap-2 px-6 py-4 font-bold text-xs uppercase transition-all shrink-0 ${
                                        activeTab === 'report' 
                                            ? 'bg-white text-indigo-650 border-b-2 border-indigo-600 font-extrabold' 
                                            : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-800'
                                    }`}
                                >
                                    <BarChart2 className="h-4 w-4" />
                                    Report
                                </button>
                                <button
                                    onClick={() => setActiveTab('seo')}
                                    className={`flex items-center gap-2 px-6 py-4 font-bold text-xs uppercase transition-all shrink-0 ${
                                        activeTab === 'seo' 
                                            ? 'bg-white text-indigo-650 border-b-2 border-indigo-600 font-extrabold' 
                                            : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-800'
                                    }`}
                                >
                                    <Sparkles className="h-4 w-4" />
                                    SEO & Meta
                                </button>
                                <button
                                    onClick={() => setActiveTab('realtime')}
                                    className={`flex items-center gap-2 px-6 py-4 font-bold text-xs uppercase transition-all shrink-0 ${
                                        activeTab === 'realtime' 
                                            ? 'bg-white text-indigo-650 border-b-2 border-indigo-600 font-extrabold' 
                                            : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-800'
                                    }`}
                                >
                                    <Zap className="h-4 w-4" />
                                    Realtime
                                </button>
                                <button
                                    onClick={() => setActiveTab('broadcast')}
                                    className={`flex items-center gap-2 px-6 py-4 font-bold text-xs uppercase transition-all shrink-0 ${
                                        activeTab === 'broadcast' 
                                            ? 'bg-white text-indigo-650 border-b-2 border-indigo-600 font-extrabold' 
                                            : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-800'
                                    }`}
                                >
                                    <Megaphone className="h-4 w-4" />
                                    WA & Email Broadcast
                                </button>
                                <button
                                    onClick={() => setActiveTab('users')}
                                    className={`flex items-center gap-2 px-6 py-4 font-bold text-xs uppercase transition-all shrink-0 ${
                                        activeTab === 'users' 
                                            ? 'bg-white text-indigo-650 border-b-2 border-indigo-600 font-extrabold' 
                                            : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-800'
                                    }`}
                                >
                                    <Users className="h-4 w-4" />
                                    Users
                                </button>
                            </>
                        )}
                    </div>

                    {/* Tab Panels */}
                    <div className="p-8">
                        <div className="space-y-6">
                            
                            {/* TAB 1: Event Config */}
                            {activeTab === 'event' && (
                                <form onSubmit={handleSaveSettings} className="space-y-6">
                                    <div className="border-b border-slate-100 pb-4">
                                        <h4 className="text-xl font-black uppercase flex items-center gap-2">
                                            <Calendar className="h-6 w-6 text-pink-500" />
                                            General Event Information
                                        </h4>
                                        <p className="text-xs text-gray-500 mt-1">Configure your main zawawalk landing page information and branding.</p>
                                    </div>                                    {/* Brand & Fun Walk Images Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                                        {/* Event Banner */}
                                        <div className="bg-slate-50/40 border border-slate-200/50 p-5 rounded-2xl relative shadow-sm min-h-[200px] flex flex-col justify-between">
                                            {bannerLoading && (
                                                <div className="absolute inset-0 bg-yellow-300/90 border border-black flex flex-col items-center justify-center z-10 p-4">
                                                    <div className="w-full bg-white border-2 border-black p-1 shadow-[2px_2px_0px_#000]">
                                                        <div className="bg-emerald-400 h-3 border border-black animate-[pulse_1s_infinite] w-full" />
                                                    </div>
                                                    <span className="font-black text-[10px] uppercase tracking-widest mt-2 animate-pulse">Memproses Banner...</span>
                                                </div>
                                            )}
                                            <label className="block text-xs font-black uppercase tracking-wider mb-2">Event Banner Image</label>
                                            <div className="space-y-4">
                                                {bannerPreview || settings.event_banner ? (
                                                    <div className="border border-slate-150 overflow-hidden bg-white rounded-xl shadow-sm h-24 flex items-center justify-center">
                                                        <img src={bannerPreview || settings.event_banner} alt="Banner Preview" className="object-contain h-20" />
                                                    </div>
                                                ) : (
                                                    <div className="border border-dashed border-slate-200 bg-slate-50/50 rounded-xl h-24 flex flex-col justify-center items-center">
                                                        <Upload className="h-6 w-6 text-gray-400 mb-1" />
                                                        <span className="text-[10px] font-bold text-gray-500">No Banner Configured</span>
                                                    </div>
                                                )}
                                                <input 
                                                    type="file"
                                                    onChange={e => handleFileChange('event_banner', e.target.files ? e.target.files[0] : null)}
                                                    className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded-none file:border-2 file:border-black file:text-[10px] file:font-black file:bg-yellow-300 file:text-black file:uppercase file:cursor-pointer hover:file:bg-yellow-400"
                                                />
                                            </div>
                                        </div>

                                        {/* Event Logo */}
                                        <div className="bg-slate-50/40 border border-slate-200/50 p-5 rounded-2xl relative shadow-sm min-h-[200px] flex flex-col justify-between">
                                            {logoLoading && (
                                                <div className="absolute inset-0 bg-yellow-300/90 border border-black flex flex-col items-center justify-center z-10 p-4">
                                                    <div className="w-full bg-white border-2 border-black p-1 shadow-[2px_2px_0px_#000]">
                                                        <div className="bg-emerald-400 h-3 border border-black animate-[pulse_1s_infinite] w-full" />
                                                    </div>
                                                    <span className="font-black text-[10px] uppercase tracking-widest mt-2 animate-pulse">Memproses Logo...</span>
                                                </div>
                                            )}
                                            <label className="block text-xs font-black uppercase tracking-wider mb-2">Event Logo Image</label>
                                            <div className="space-y-4">
                                                {logoPreview || settings.event_logo ? (
                                                    <div className="border border-slate-150 overflow-hidden bg-white rounded-xl shadow-sm h-24 flex items-center justify-center">
                                                        <img src={logoPreview || settings.event_logo} alt="Logo Preview" className="object-contain h-20" />
                                                    </div>
                                                ) : (
                                                    <div className="border border-dashed border-slate-200 bg-slate-50/50 rounded-xl h-24 flex flex-col justify-center items-center">
                                                        <Upload className="h-6 w-6 text-gray-400 mb-1" />
                                                        <span className="text-[10px] font-bold text-gray-500">No Logo Configured</span>
                                                    </div>
                                                )}
                                                <input 
                                                    type="file"
                                                    onChange={e => handleFileChange('event_logo', e.target.files ? e.target.files[0] : null)}
                                                    className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded-none file:border-2 file:border-black file:text-[10px] file:font-black file:bg-yellow-300 file:text-black file:uppercase file:cursor-pointer hover:file:bg-yellow-400"
                                                />
                                            </div>
                                        </div>

                                        {/* Event Favicon */}
                                        <div className="bg-slate-50/40 border border-slate-200/50 p-5 rounded-2xl relative shadow-sm min-h-[200px] flex flex-col justify-between">
                                            {faviconLoading && (
                                                <div className="absolute inset-0 bg-yellow-300/90 border border-black flex flex-col items-center justify-center z-10 p-4">
                                                    <div className="w-full bg-white border-2 border-black p-1 shadow-[2px_2px_0px_#000]">
                                                        <div className="bg-emerald-400 h-3 border border-black animate-[pulse_1s_infinite] w-full" />
                                                    </div>
                                                    <span className="font-black text-[10px] uppercase tracking-widest mt-2 animate-pulse">Memproses Favicon...</span>
                                                </div>
                                            )}
                                            <label className="block text-xs font-black uppercase tracking-wider mb-2">Event Favicon</label>
                                            <div className="space-y-4">
                                                {faviconPreview || settings.event_favicon ? (
                                                    <div className="border border-slate-150 overflow-hidden bg-white rounded-xl shadow-sm h-24 flex items-center justify-center">
                                                        <img src={faviconPreview || settings.event_favicon} alt="Favicon Preview" className="object-contain h-10 w-10" />
                                                    </div>
                                                ) : (
                                                    <div className="border border-dashed border-slate-200 bg-slate-50/50 rounded-xl h-24 flex flex-col justify-center items-center">
                                                        <Upload className="h-6 w-6 text-gray-400 mb-1" />
                                                        <span className="text-[10px] font-bold text-gray-500">No Favicon Configured</span>
                                                    </div>
                                                )}
                                                <input 
                                                    type="file"
                                                    onChange={e => handleFileChange('event_favicon', e.target.files ? e.target.files[0] : null)}
                                                    className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded-none file:border-2 file:border-black file:text-[10px] file:font-black file:bg-yellow-300 file:text-black file:uppercase file:cursor-pointer hover:file:bg-yellow-400"
                                                />
                                            </div>
                                        </div>

                                        {/* Fun Walk Route Image */}
                                        <div className="bg-slate-50/40 border border-slate-200/50 p-5 rounded-2xl relative shadow-sm min-h-[200px] flex flex-col justify-between">
                                            {routeLoading && (
                                                <div className="absolute inset-0 bg-yellow-300/90 border border-black flex flex-col items-center justify-center z-10 p-4">
                                                    <div className="w-full bg-white border-2 border-black p-1 shadow-[2px_2px_0px_#000]">
                                                        <div className="bg-emerald-400 h-3 border border-black animate-[pulse_1s_infinite] w-full" />
                                                    </div>
                                                    <span className="font-black text-[10px] uppercase tracking-widest mt-2 animate-pulse">Memproses Rute...</span>
                                                </div>
                                            )}
                                            <label className="block text-xs font-black uppercase tracking-wider mb-2">Peta Rute Fun Walk</label>
                                            <div className="space-y-4">
                                                {routePreview || settings.funwalk_route_image ? (
                                                    <div className="border border-slate-150 overflow-hidden bg-white rounded-xl shadow-sm h-24 flex items-center justify-center">
                                                        <img src={routePreview || settings.funwalk_route_image} alt="Route Preview" className="object-contain h-20" />
                                                    </div>
                                                ) : (
                                                    <div className="border border-dashed border-slate-200 bg-slate-50/50 rounded-xl h-24 flex flex-col justify-center items-center">
                                                        <Upload className="h-6 w-6 text-gray-400 mb-1" />
                                                        <span className="text-[10px] font-bold text-gray-500">Belum Ada Rute</span>
                                                    </div>
                                                )}
                                                <input 
                                                    type="file"
                                                    onChange={e => handleFileChange('funwalk_route_image', e.target.files ? e.target.files[0] : null)}
                                                    className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded-none file:border-2 file:border-black file:text-[10px] file:font-black file:bg-yellow-300 file:text-black file:uppercase file:cursor-pointer hover:file:bg-yellow-400"
                                                />
                                            </div>
                                        </div>

                                        {/* Fun Walk Racepack Image */}
                                        <div className="bg-slate-50/40 border border-slate-200/50 p-5 rounded-2xl relative shadow-sm min-h-[200px] flex flex-col justify-between">
                                            {racepackLoading && (
                                                <div className="absolute inset-0 bg-yellow-300/90 border border-black flex flex-col items-center justify-center z-10 p-4">
                                                    <div className="w-full bg-white border-2 border-black p-1 shadow-[2px_2px_0px_#000]">
                                                        <div className="bg-emerald-400 h-3 border border-black animate-[pulse_1s_infinite] w-full" />
                                                    </div>
                                                    <span className="font-black text-[10px] uppercase tracking-widest mt-2 animate-pulse">Memproses Racepack...</span>
                                                </div>
                                            )}
                                            <label className="block text-xs font-black uppercase tracking-wider mb-2">Foto Racepack</label>
                                            <div className="space-y-4">
                                                {racepackPreview || settings.funwalk_racepack_image ? (
                                                    <div className="border border-slate-150 overflow-hidden bg-white rounded-xl shadow-sm h-24 flex items-center justify-center">
                                                        <img src={racepackPreview || settings.funwalk_racepack_image} alt="Racepack Preview" className="object-contain h-20" />
                                                    </div>
                                                ) : (
                                                    <div className="border border-dashed border-slate-200 bg-slate-50/50 rounded-xl h-24 flex flex-col justify-center items-center">
                                                        <Upload className="h-6 w-6 text-gray-400 mb-1" />
                                                        <span className="text-[10px] font-bold text-gray-500">Belum Ada Racepack</span>
                                                    </div>
                                                )}
                                                <input 
                                                    type="file"
                                                    onChange={e => handleFileChange('funwalk_racepack_image', e.target.files ? e.target.files[0] : null)}
                                                    className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded-none file:border-2 file:border-black file:text-[10px] file:font-black file:bg-yellow-300 file:text-black file:uppercase file:cursor-pointer hover:file:bg-yellow-400"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="block text-xs font-black uppercase tracking-wider">Event Title</label>
                                            <input 
                                                type="text" 
                                                value={data.event_title} 
                                                onChange={e => setData('event_title', e.target.value)}
                                                className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-xs font-black uppercase tracking-wider">Ticket Prefix</label>
                                            <input 
                                                type="text" 
                                                value={data.ticket_prefix} 
                                                placeholder="Contoh: ZWF"
                                                onChange={e => setData('ticket_prefix', e.target.value.toUpperCase().replace(/\s/g, ''))}
                                                className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="block text-xs font-black uppercase tracking-wider">Date</label>
                                                <input 
                                                    type="text" 
                                                    value={data.event_date} 
                                                    placeholder="26/09/2026"
                                                    onChange={e => setData('event_date', e.target.value)}
                                                    className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="block text-xs font-black uppercase tracking-wider">Time</label>
                                                <input 
                                                    type="text" 
                                                    value={data.event_time} 
                                                    placeholder="16.00 - 18.00 PM"
                                                    onChange={e => setData('event_time', e.target.value)}
                                                    className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="block text-xs font-black uppercase tracking-wider">Organized By Name</label>
                                            <input 
                                                type="text" 
                                                value={data.event_organized_by} 
                                                onChange={e => setData('event_organized_by', e.target.value)}
                                                placeholder="Contoh: Panitia Zawawalk 2026"
                                                className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-xs font-black uppercase tracking-wider">Organized By URL</label>
                                            <input 
                                                type="url" 
                                                value={data.event_organized_by_url} 
                                                onChange={e => setData('event_organized_by_url', e.target.value)}
                                                placeholder="https://instagram.com/penyelenggara"
                                                className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="block text-xs font-black uppercase tracking-wider">Developed By Name</label>
                                            <input 
                                                type="text" 
                                                value={data.event_developed_by} 
                                                onChange={e => setData('event_developed_by', e.target.value)}
                                                placeholder="Contoh: Zawawalk Dev Team"
                                                className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-xs font-black uppercase tracking-wider">Developed By URL</label>
                                            <input 
                                                type="url" 
                                                value={data.event_developed_by_url} 
                                                onChange={e => setData('event_developed_by_url', e.target.value)}
                                                placeholder="https://github.com/developer"
                                                className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-1 col-span-3">
                                            <label className="block text-xs font-black uppercase tracking-wider">Tipe Event</label>
                                            <select 
                                                value={data.event_type}
                                                onChange={e => setData('event_type', e.target.value)}
                                                className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                            >
                                                <option value="offline">Offline Event</option>
                                                <option value="online">Online Event</option>
                                                <option value="hybrid">Hybrid Event</option>
                                            </select>
                                        </div>
                                    </div>

                                    {(data.event_type === 'offline' || data.event_type === 'hybrid') && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-1">
                                                <label className="block text-xs font-black uppercase tracking-wider">Nama Venue (Lokasi Fisik)</label>
                                                <input 
                                                    type="text" 
                                                    value={data.event_venue_name} 
                                                    placeholder="Contoh: Vilo Puri Indah"
                                                    onChange={e => setData('event_venue_name', e.target.value)}
                                                    className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="block text-xs font-black uppercase tracking-wider">Alamat Venue</label>
                                                <input 
                                                    type="text" 
                                                    value={data.event_venue_address} 
                                                    placeholder="Contoh: Jl. Puri Indah Raya, Kembangan, Jakarta Barat"
                                                    onChange={e => setData('event_venue_address', e.target.value)}
                                                    className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {(data.event_type === 'offline' || data.event_type === 'hybrid') && (
                                        <div className="space-y-1">
                                            <label className="block text-xs font-black uppercase tracking-wider">Google Maps Embed Link / HTML</label>
                                            <input 
                                                type="text" 
                                                value={data.event_location_map} 
                                                placeholder="Masukkan URL sematan Google Maps (src) atau tag <iframe> HTML lengkap"
                                                onChange={e => {
                                                    let val = e.target.value;
                                                    if (val.includes('<iframe') && val.includes('src="')) {
                                                        const match = val.match(/src="([^"]+)"/);
                                                        if (match && match[1]) {
                                                            val = match[1];
                                                        }
                                                    }
                                                    setData('event_location_map', val);
                                                }}
                                                className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                            />
                                            <span className="text-[10px] text-gray-500 block">Sistem akan otomatis mengekstrak URL jika Anda menyalin seluruh kode HTML sematan peta dari Google Maps.</span>
                                        </div>
                                    )}

                                    {(data.event_type === 'online' || data.event_type === 'hybrid') && (
                                        <div className="bg-indigo-50/30 border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                                            <h5 className="font-black text-xs uppercase tracking-wider text-cyan-800">
                                                ⚡ Detail Platform Streaming Online
                                            </h5>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-dashed border-gray-300 pb-4">
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-black uppercase tracking-wider">Tipe Tiket Online</label>
                                                    <select
                                                        value={data.online_ticket_type}
                                                        onChange={e => setData('online_ticket_type', e.target.value)}
                                                        className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                    >
                                                        <option value="free">Gratis (Free)</option>
                                                        <option value="paid">Berbayar (Paid)</option>
                                                    </select>
                                                </div>

                                                {data.online_ticket_type === 'paid' && (
                                                    <div className="space-y-1">
                                                        <label className="block text-xs font-black uppercase tracking-wider">Harga Tiket Online (IDR)</label>
                                                        <input 
                                                            type="number" 
                                                            value={data.online_ticket_price}
                                                            placeholder="50000"
                                                            onChange={e => setData('online_ticket_price', e.target.value)}
                                                            className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-850"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-black uppercase tracking-wider">Pilih Platform</label>
                                                    <select
                                                        value={data.event_platform}
                                                        onChange={e => setData('event_platform', e.target.value)}
                                                        className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                    >
                                                        <option value="zoom">Zoom Meeting</option>
                                                        <option value="google_meet">Google Meet</option>
                                                        <option value="youtube">YouTube Live</option>
                                                        <option value="custom">Lainnya / Custom</option>
                                                    </select>
                                                </div>

                                                {data.event_platform === 'custom' && (
                                                    <div className="space-y-1">
                                                        <label className="block text-xs font-black uppercase tracking-wider">Nama Platform Kustom</label>
                                                        <input 
                                                            type="text" 
                                                            value={data.event_platform_custom_name}
                                                            placeholder="Contoh: Microsoft Teams / Discord"
                                                            onChange={e => setData('event_platform_custom_name', e.target.value)}
                                                            className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-850"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-1">
                                                <label className="block text-xs font-black uppercase tracking-wider">Link / URL Platform</label>
                                                <input 
                                                    type="url" 
                                                    value={data.event_platform_url}
                                                    placeholder="https://..."
                                                    onChange={e => setData('event_platform_url', e.target.value)}
                                                    className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-850"
                                                />
                                            </div>

                                            {data.event_platform === 'zoom' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="block text-xs font-black uppercase tracking-wider">Meeting ID</label>
                                                        <input 
                                                            type="text" 
                                                            value={data.event_platform_id}
                                                            placeholder="Contoh: 123 4567 8910"
                                                            onChange={e => setData('event_platform_id', e.target.value)}
                                                            className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-850"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="block text-xs font-black uppercase tracking-wider">Passcode</label>
                                                        <input 
                                                            type="text" 
                                                            value={data.event_platform_passcode}
                                                            placeholder="Contoh: 90sREUNION"
                                                            onChange={e => setData('event_platform_passcode', e.target.value)}
                                                            className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-850"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="space-y-1">
                                        <label className="block text-xs font-black uppercase tracking-wider">Dress Code</label>
                                        <input 
                                            type="text" 
                                            value={data.event_dresscode} 
                                            placeholder="Jaket Varsity/Flannel, Sneakers Retro"
                                            onChange={e => setData('event_dresscode', e.target.value)}
                                            className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-xs font-black uppercase tracking-wider">Event Description</label>
                                        <textarea 
                                            value={data.event_description} 
                                            onChange={e => setData('event_description', e.target.value)}
                                            rows={4}
                                            className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-xs font-black uppercase tracking-wider">Deskripsi Rute Fun Walk</label>
                                        <textarea 
                                            value={data.funwalk_route_description} 
                                            onChange={e => setData('funwalk_route_description', e.target.value)}
                                            rows={3}
                                            placeholder="Tuliskan petunjuk rute, pos pemeriksaan (checkpoint), titik start, dan finish..."
                                            className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-xs font-black uppercase tracking-wider">Informasi Pengambilan Racepack</label>
                                        <textarea 
                                            value={data.funwalk_racepack_info} 
                                            onChange={e => setData('funwalk_racepack_info', e.target.value)}
                                            rows={3}
                                            placeholder="Detail jadwal pengambilan, tempat pengambilan, dan berkas/syarat yang harus dibawa..."
                                            className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-xs font-black uppercase tracking-wider">Rundown / Jadwal Acara</label>
                                        <textarea 
                                            value={data.funwalk_schedule} 
                                            onChange={e => setData('funwalk_schedule', e.target.value)}
                                            rows={4}
                                            placeholder="Contoh:&#10;06:00 - Kumpul & Registrasi Ulang&#10;06:30 - Flag Off Fun Walk&#10;08:30 - Hiburan & Doorprize"
                                            className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-xs font-black uppercase tracking-wider">Pertanyaan Umum (FAQ)</label>
                                        <textarea 
                                            value={data.funwalk_faq} 
                                            onChange={e => setData('funwalk_faq', e.target.value)}
                                            rows={4}
                                            placeholder="Format pertanyaan dan jawaban. Contoh:&#10;Q: Apakah ada parkir?&#10;A: Ya, tersedia di area parkir utama.&#10;&#10;Q: Apakah boleh membawa hewan peliharaan?&#10;A: Hewan peliharaan tidak diperbolehkan."
                                            className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-xs font-black uppercase tracking-wider">Syarat & Ketentuan (T&C)</label>
                                        <textarea 
                                            value={data.funwalk_terms} 
                                            onChange={e => setData('funwalk_terms', e.target.value)}
                                            rows={4}
                                            placeholder="Syarat & ketentuan yang wajib disetujui peserta (kesehatan, pelepasan tuntutan hukum, kebijakan pengembalian uang, dll.)..."
                                            className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-xs font-black uppercase tracking-wider">Informasi Kontak Panitia / Penyelenggara</label>
                                        <textarea 
                                            value={data.funwalk_contact} 
                                            onChange={e => setData('funwalk_contact', e.target.value)}
                                            rows={3}
                                            placeholder="Tuliskan nomor telepon panitia, email, instagram, atau narahubung yang bisa dihubungi..."
                                            className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                        />
                                    </div>

                                    {/* Leaflet Peta Interaktif Configuration */}
                                    <div className="bg-indigo-50/20 border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                                        <h5 className="font-black text-xs uppercase tracking-wider text-indigo-850">
                                            🗺️ Konfigurasi Peta Rute Interaktif (Leaflet + OpenStreetMap)
                                        </h5>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="block text-xs font-black uppercase tracking-wider">Titik Tengah Peta (Center Koordinat)</label>
                                                <input 
                                                    type="text" 
                                                    value={data.funwalk_map_center}
                                                    placeholder="Contoh: -6.2088, 106.8456 (Lat, Long)"
                                                    onChange={e => setData('funwalk_map_center', e.target.value)}
                                                    className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-850"
                                                />
                                                <span className="text-[9px] text-gray-500 block">Koordinat latitude & longitude awal saat peta pertama kali dibuka.</span>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="block text-xs font-black uppercase tracking-wider">Level Zoom Peta (1 - 18)</label>
                                                <input 
                                                    type="number" 
                                                    min="1" 
                                                    max="18"
                                                    value={data.funwalk_map_zoom}
                                                    placeholder="Contoh: 14"
                                                    onChange={e => setData('funwalk_map_zoom', e.target.value)}
                                                    className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-850"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="block text-xs font-black uppercase tracking-wider">Koordinat Garis Rute (Polyline List)</label>
                                            <textarea 
                                                value={data.funwalk_map_route} 
                                                onChange={e => setData('funwalk_map_route', e.target.value)}
                                                rows={4}
                                                placeholder="Format: Lat,Long per baris. Contoh:&#10;-6.2088, 106.8456&#10;-6.2100, 106.8470&#10;-6.2120, 106.8490"
                                                className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                            />
                                            <span className="text-[9px] text-gray-500 block">Tuliskan titik koordinat rute jalan santai berurutan dari Start sampai Finish.</span>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="block text-xs font-black uppercase tracking-wider">Titik Pos / Marker Informasi</label>
                                            <textarea 
                                                value={data.funwalk_map_markers} 
                                                onChange={e => setData('funwalk_map_markers', e.target.value)}
                                                rows={4}
                                                placeholder="Format: Lat | Long | Judul Pos | Keterangan. Contoh:&#10;-6.2088 | 106.8456 | Titik Start | Kumpul jam 06:00 WIB&#10;-6.2100 | 106.8470 | Pos 1 | Tempat Pengambilan Air Minum"
                                                className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                            />
                                            <span className="text-[9px] text-gray-500 block">Tandai pos/checkpoint, pos medis, dll. Pisahkan menggunakan karakter garis vertikal ( | ).</span>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t-2 border-black flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className="bg-gradient-to-r from-orange-500 to-rose-500 text-white font-extrabold px-8 py-3 text-xs uppercase tracking-wider rounded-xl shadow-md hover:opacity-95 active:translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {processing ? 'Saving...' : 'Save Configuration'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* TAB 2: Payment & SMTP Settings */}
                            {activeTab === 'payment' && (
                                <form onSubmit={handleSaveSettings} className="space-y-8">
                                    {/* WhatsApp Admin & Flow */}
                                    <div className="space-y-4">
                                        <div className="border-b border-slate-100 pb-4">
                                            <h4 className="text-xl font-black uppercase flex items-center gap-2">
                                                <CreditCard className="h-6 w-6 text-cyan-500" />
                                                Offline Payment & WhatsApp Integration
                                            </h4>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-1">
                                                <label className="block text-xs font-black uppercase tracking-wider">WhatsApp Admin Number</label>
                                                <input 
                                                    type="text" 
                                                    value={data.wa_admin_number} 
                                                    placeholder="628123456789 (Use country code)"
                                                    onChange={e => setData('wa_admin_number', e.target.value)}
                                                    className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="block text-xs font-black uppercase tracking-wider">E-Ticket Verification Method</label>
                                                <select 
                                                    value={data.ticket_sending_method}
                                                    onChange={e => setData('ticket_sending_method', e.target.value)}
                                                    className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                >
                                                    <option value="manual">Manual</option>
                                                    <option value="auto">Automatic</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="block text-xs font-black uppercase tracking-wider">Custom WA Message Format</label>
                                            <textarea 
                                                value={data.wa_custom_message} 
                                                placeholder="Halo Admin, saya ingin konfirmasi bukti transfer reuni. Nama: {name}, Tiket: {ticket_code}."
                                                onChange={e => setData('wa_custom_message', e.target.value)}
                                                rows={3}
                                                className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                            />
                                            <span className="text-[10px] text-gray-500">You can use tags like {`{name}`} and {`{ticket_code}`} which will be replaced dynamically.</span>
                                        </div>
                                    </div>

                                    {/* Payment Method Availabilities */}
                                    <div className="space-y-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl shadow-sm">
                                        <h4 className="text-sm font-black uppercase tracking-wider border-b border-black pb-1">⚙️ Pilihan Metode Pembayaran</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="checkbox" 
                                                    id="enable_payment_manual"
                                                    checked={data.enable_payment_manual}
                                                    onChange={e => setData('enable_payment_manual', e.target.checked)}
                                                    className="h-5 w-5 text-black border-2 border-black focus:ring-0"
                                                />
                                                <label htmlFor="enable_payment_manual" className="text-xs font-black uppercase cursor-pointer">
                                                    Aktifkan Transfer Manual (Offline)
                                                </label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="checkbox" 
                                                    id="enable_payment_midtrans"
                                                    checked={data.enable_payment_midtrans}
                                                    onChange={e => setData('enable_payment_midtrans', e.target.checked)}
                                                    className="h-5 w-5 text-black border-2 border-black focus:ring-0"
                                                />
                                                <label htmlFor="enable_payment_midtrans" className="text-xs font-black uppercase cursor-pointer">
                                                    Aktifkan Midtrans (Online Payment)
                                                </label>
                                        </div>
                                    </div>
                                </div>

                                    {/* Manual Payment Configuration */}
                                    {data.enable_payment_manual && (
                                        <div className="space-y-4 bg-yellow-50 border border-slate-100 p-4 rounded-2xl shadow-sm">
                                            <h4 className="text-sm font-black uppercase tracking-wider text-black border-b border-black pb-1">🏦 Informasi Rekening Bank (Transfer Manual)</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-1">
                                                    <label className="block text-[10px] font-black uppercase">Nama Bank</label>
                                                    <input 
                                                        type="text" 
                                                        value={data.payment_manual_bank_name} 
                                                        placeholder="contoh: BANK BCA"
                                                        onChange={e => setData('payment_manual_bank_name', e.target.value)}
                                                        className="w-full border-2 border-black p-2 text-xs font-bold bg-white"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="block text-[10px] font-black uppercase">Nomor Rekening</label>
                                                    <input 
                                                        type="text" 
                                                        value={data.payment_manual_account_number} 
                                                        placeholder="contoh: 1234-5678-90"
                                                        onChange={e => setData('payment_manual_account_number', e.target.value)}
                                                        className="w-full border-2 border-black p-2 text-xs font-bold bg-white"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="block text-[10px] font-black uppercase">Nama Pemilik Rekening</label>
                                                    <input 
                                                        type="text" 
                                                        value={data.payment_manual_account_name} 
                                                        placeholder="contoh: a/n Panitia Reuni"
                                                        onChange={e => setData('payment_manual_account_name', e.target.value)}
                                                        className="w-full border-2 border-black p-2 text-xs font-bold bg-white"
                                                    />
                                                </div>
                                            </div>

                                            <div className="border-t border-dashed border-slate-300 pt-4 mt-4 space-y-4">
                                                <h4 className="text-xs font-black uppercase tracking-wider text-black">🛡️ Keamanan & Notifikasi Admin</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="block text-[10px] font-black uppercase">Passcode Konfirmasi</label>
                                                        <input 
                                                            type="text" 
                                                            value={data.admin_passcode} 
                                                            placeholder="contoh: 123456"
                                                            onChange={e => setData('admin_passcode', e.target.value)}
                                                            className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                        />
                                                        <span className="text-[9px] text-gray-500">Passcode wajib dimasukkan sebelum memverifikasi pembayaran.</span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="block text-[10px] font-black uppercase">No. WA Notifikasi Admin</label>
                                                        <TagInput 
                                                            value={data.notification_wa_numbers} 
                                                            onChange={val => setData('notification_wa_numbers', val)}
                                                            placeholder="Tambah No. WA lalu tekan Enter/Koma"
                                                            type="phone"
                                                        />
                                                        <span className="text-[9px] text-gray-500">Ketik nomor lalu tekan Enter atau koma untuk menambahkan.</span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="block text-[10px] font-black uppercase">Email Notifikasi Admin</label>
                                                        <TagInput 
                                                            value={data.notification_emails} 
                                                            onChange={val => setData('notification_emails', val)}
                                                            placeholder="Tambah Email lalu tekan Enter/Koma"
                                                            type="email"
                                                        />
                                                        <span className="text-[9px] text-gray-500">Ketik email lalu tekan Enter atau koma untuk menambahkan.</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Midtrans Configuration */}
                                    {data.enable_payment_midtrans && (
                                        <div className="space-y-4 bg-cyan-50 border border-slate-100 p-4 rounded-2xl shadow-sm">
                                            <h4 className="text-sm font-black uppercase tracking-wider text-cyan-800 border-b border-cyan-300 pb-1">💳 Midtrans Credentials</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="block text-[10px] font-black uppercase">Client Key</label>
                                                    <input 
                                                        type="text" 
                                                        value={data.midtrans_client_key} 
                                                        onChange={e => setData('midtrans_client_key', e.target.value)}
                                                        className="w-full border-2 border-black p-2 text-xs font-bold bg-white"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="block text-[10px] font-black uppercase">Server Key</label>
                                                    <input 
                                                        type="text" 
                                                        value={data.midtrans_server_key} 
                                                        onChange={e => setData('midtrans_server_key', e.target.value)}
                                                        className="w-full border-2 border-black p-2 text-xs font-bold bg-white"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="checkbox" 
                                                    id="midtrans_is_production"
                                                    checked={data.midtrans_is_production}
                                                    onChange={e => setData('midtrans_is_production', e.target.checked)}
                                                    className="h-5 w-5 text-black border-2 border-black focus:ring-0"
                                                />
                                                <label htmlFor="midtrans_is_production" className="text-xs font-black uppercase cursor-pointer">
                                                    Production Mode (Jika tidak dicentang, menggunakan Sandbox)
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {/* Fonnte WhatsApp API Configuration */}
                                    <div className="space-y-4 bg-emerald-50 border border-slate-100 p-4 rounded-2xl shadow-sm">
                                        <h4 className="text-sm font-black uppercase tracking-wider text-emerald-800 border-b border-emerald-300 pb-1">💬 Integrasi Fonnte WhatsApp API</h4>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="checkbox" 
                                                id="enable_fonnte"
                                                checked={data.enable_fonnte}
                                                onChange={e => setData('enable_fonnte', e.target.checked)}
                                                className="h-5 w-5 text-black border-2 border-black focus:ring-0"
                                            />
                                            <label htmlFor="enable_fonnte" className="text-xs font-black uppercase cursor-pointer">
                                                Aktifkan Kirim Pesan WhatsApp Otomatis via Fonnte
                                            </label>
                                        </div>
                                        {data.enable_fonnte && (
                                            <div className="space-y-1">
                                                <label className="block text-[10px] font-black uppercase">Fonnte API Token</label>
                                                <input 
                                                    type="password" 
                                                    value={data.fonnte_token} 
                                                    onChange={e => setData('fonnte_token', e.target.value)}
                                                    placeholder="Masukkan token Fonnte Anda..."
                                                    className="w-full border-2 border-black p-2 text-xs font-bold bg-white"
                                                />
                                                <span className="text-[9px] text-gray-500 block">Dapatkan API token dari dashboard akun Fonnte Anda.</span>
                                                
                                                <div className="flex items-center gap-2 bg-yellow-50 border-2 border-black p-3 rounded-none my-3 shadow-[2px_2px_0px_#000]">
                                                    <input 
                                                        type="checkbox" 
                                                        id="auto_send_ticket_whatsapp"
                                                        checked={data.auto_send_ticket_whatsapp}
                                                        onChange={e => setData('auto_send_ticket_whatsapp', e.target.checked)}
                                                        className="h-5 w-5 text-black border-2 border-black focus:ring-0"
                                                    />
                                                    <label htmlFor="auto_send_ticket_whatsapp" className="text-xs font-black uppercase tracking-wider cursor-pointer">
                                                        Auto Send E-Ticket via WhatsApp (on Payment Verified)
                                                    </label>
                                                </div>

                                                {/* Testing Fonnte */}
                                                <div className="mt-4 p-3 bg-white border-2 border-black space-y-2 shadow-[2px_2px_0px_#000]">
                                                    <span className="block text-[10px] font-black uppercase text-emerald-850">🧪 Uji Coba WhatsApp Fonnte</span>
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="text" 
                                                            value={testWhatsapp} 
                                                            onChange={e => setTestWhatsapp(e.target.value)}
                                                            placeholder="Format: 628123456789"
                                                            className="flex-1 border-2 border-black p-2 text-xs font-bold"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleTestFonnte}
                                                            disabled={isTestingFonnte || !data.fonnte_token}
                                                            className="bg-emerald-300 border-2 border-black px-3 py-2 text-xs font-black uppercase shadow-[2px_2px_0px_#000] hover:bg-emerald-400 transition-colors"
                                                        >
                                                            {isTestingFonnte ? 'Menguji...' : 'Kirim Uji Coba'}
                                                        </button>
                                                    </div>
                                                    {testFonnteResult && (
                                                        <div className={`p-2 border-2 border-black text-[10px] font-bold ${
                                                            testFonnteResult.success ? 'bg-emerald-100 text-emerald-800' : 'bg-pink-100 text-red-850'
                                                        }`}>
                                                            {testFonnteResult.message}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* SMTP Configuration */}
                                    <div className="space-y-4">
                                        <div className="border-b border-slate-100 pb-4">
                                            <h4 className="text-xl font-black uppercase flex items-center gap-2">
                                                <Mail className="h-6 w-6 text-pink-500" />
                                                SMTP Email Settings
                                            </h4>
                                        </div>
                                        <div className="flex items-center gap-2 bg-yellow-50 border-2 border-black p-3 rounded-none">
                                            <input 
                                                type="checkbox" 
                                                id="auto_send_ticket_email"
                                                checked={data.auto_send_ticket_email}
                                                onChange={e => setData('auto_send_ticket_email', e.target.checked)}
                                                className="h-5 w-5 text-black border-2 border-black focus:ring-0"
                                            />
                                            <label htmlFor="auto_send_ticket_email" className="text-xs font-black uppercase tracking-wider cursor-pointer">
                                                Auto Send E-Ticket via Email (on Payment Verified)
                                            </label>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="space-y-1">
                                                <label className="block text-xs font-black uppercase tracking-wider">SMTP Host</label>
                                                <input 
                                                    type="text" 
                                                    value={data.smtp_host} 
                                                    onChange={e => setData('smtp_host', e.target.value)}
                                                    className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="block text-xs font-black uppercase tracking-wider">SMTP Port</label>
                                                <input 
                                                    type="text" 
                                                    value={data.smtp_port} 
                                                    onChange={e => setData('smtp_port', e.target.value)}
                                                    className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="block text-xs font-black uppercase tracking-wider">SMTP Username</label>
                                                <input 
                                                    type="text" 
                                                    value={data.smtp_username} 
                                                    onChange={e => setData('smtp_username', e.target.value)}
                                                    className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="space-y-1">
                                                <label className="block text-xs font-black uppercase tracking-wider">SMTP Password</label>
                                                <input 
                                                    type="password" 
                                                    value={data.smtp_password} 
                                                    onChange={e => setData('smtp_password', e.target.value)}
                                                    className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="block text-xs font-black uppercase tracking-wider">From Email Address</label>
                                                <input 
                                                    type="email" 
                                                    value={data.smtp_from_address} 
                                                    onChange={e => setData('smtp_from_address', e.target.value)}
                                                    className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="block text-xs font-black uppercase tracking-wider">From Sender Name</label>
                                                <input 
                                                    type="text" 
                                                    value={data.smtp_from_name} 
                                                    onChange={e => setData('smtp_from_name', e.target.value)}
                                                    className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                />
                                            </div>
                                        </div>

                                        {/* Testing SMTP */}
                                        <div className="mt-6 p-4 bg-yellow-50 border-2 border-black space-y-2 shadow-[2px_2px_0px_#000]">
                                            <span className="block text-xs font-black uppercase text-black">🧪 Uji Coba Konfigurasi SMTP</span>
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <input 
                                                    type="email" 
                                                    value={testEmail} 
                                                    onChange={e => setTestEmail(e.target.value)}
                                                    placeholder="Masukkan email tujuan (contoh: anda@domain.com)"
                                                    className="flex-1 border-2 border-black p-3 text-xs font-bold"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleTestSmtp}
                                                    disabled={isTestingSmtp || !data.smtp_host || !data.smtp_from_address}
                                                    className="bg-indigo-600 text-white px-5 py-3 text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:bg-indigo-700 active:translate-y-px transition-all"
                                                >
                                                    {isTestingSmtp ? 'Menguji...' : 'Kirim Email Uji Coba'}
                                                </button>
                                            </div>
                                            {testSmtpResult && (
                                                <div className={`p-3 border-2 border-black text-xs font-bold ${
                                                    testSmtpResult.success ? 'bg-emerald-100 text-emerald-800' : 'bg-pink-100 text-red-850'
                                                }`}>
                                                    {testSmtpResult.message}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="pt-6 border-t-2 border-black flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className="bg-gradient-to-r from-orange-500 to-rose-500 text-white font-extrabold px-8 py-3 text-xs uppercase tracking-wider rounded-xl shadow-md hover:opacity-95 active:translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {processing ? 'Saving...' : 'Save Configuration'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* TAB 3: Dynamic Forms */}
                            {activeTab === 'forms' && (
                                <div className="space-y-6">
                                    {!isBuildingForm ? (
                                        <>
                                            <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
                                                <div>
                                                    <h4 className="text-xl font-black uppercase flex items-center gap-2">
                                                        <FileText className="h-6 w-6 text-yellow-500" />
                                                        Active Dynamic Registration Forms
                                                    </h4>
                                                    <p className="text-xs text-gray-500 mt-1">Manage registration forms and ticket prices.</p>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => setIsBuildingForm(true)}
                                                    className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:opacity-95 active:translate-y-px transition-all"
                                                >
                                                    + Build Form
                                                </button>
                                            </div>

                                            {forms.length === 0 ? (
                                                <div className="border border-dashed border-slate-200 p-12 text-center bg-slate-50/50 rounded-2xl">
                                                    <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                                                    <p className="font-bold text-slate-700">No Custom Registration Forms Configured</p>
                                                    <p className="text-xs text-slate-400 mt-1">Build one to start receiving event sign-ups.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {forms.map(form => {
                                                        // Compute status
                                                        const isQuotaFull = form.max_participants != null && (form.attendees_count ?? 0) >= form.max_participants;
                                                        const isDeadlinePassed = form.closed_at ? new Date() > new Date(form.closed_at) : false;
                                                        const isEffectivelyClosed = !form.is_active || isQuotaFull || isDeadlinePassed;

                                                        let statusBadge = null;
                                                        if (!form.is_active) {
                                                            statusBadge = <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-lg bg-slate-100 text-slate-600 border border-slate-200">⏸ Nonaktif</span>;
                                                        } else if (isQuotaFull) {
                                                            statusBadge = <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-lg bg-amber-50 text-amber-700 border border-amber-200">🎟️ Kuota Penuh</span>;
                                                        } else if (isDeadlinePassed) {
                                                            statusBadge = <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-lg bg-rose-50 text-rose-700 border border-rose-200">⏰ Waktu Habis</span>;
                                                        } else {
                                                            statusBadge = <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Aktif</span>;
                                                        }

                                                        return (
                                                        <div key={form.id} className={`border p-5 bg-white rounded-2xl flex flex-col gap-3 shadow-sm hover:shadow-md transition-all ${isEffectivelyClosed && form.is_active ? 'border-amber-200' : form.is_active ? 'border-emerald-200' : 'border-slate-100'}`}>
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <h5 className="font-black text-slate-800 text-lg">{form.title}</h5>
                                                                        {statusBadge}
                                                                    </div>
                                                                    <p className="text-xs text-slate-500 font-bold mt-0.5">
                                                                        Ticket Price: Rp {parseFloat(form.ticket_price).toLocaleString('id-ID')}
                                                                        {form.additional_fees && form.additional_fees.length > 0 && (
                                                                            <span className="text-[10px] text-slate-450 font-normal ml-2">
                                                                                (+ {form.additional_fees.map((f: any) => `${f.name}: ${f.type === 'percent' ? `${f.value}%` : `Rp ${parseFloat(f.value).toLocaleString('id-ID')}`}`).join(', ')})
                                                                            </span>
                                                                        )}
                                                                    </p>
                                                                    {/* Limit & Deadline info */}
                                                                    <div className="flex flex-wrap gap-3 mt-2">
                                                                        {form.max_participants != null && (
                                                                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                                                👥 Kuota: {form.attendees_count ?? 0} / {form.max_participants} peserta
                                                                            </span>
                                                                        )}
                                                                        {form.closed_at && (
                                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${ isDeadlinePassed ? 'text-rose-700 bg-rose-50 border border-rose-200' : 'text-indigo-700 bg-indigo-50 border border-indigo-200'}`}>
                                                                                ⏰ Tutup: {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(form.closed_at))}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-2 items-center shrink-0">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleToggleForm(form.id)}
                                                                        className={`px-3.5 py-2 text-xs font-black uppercase rounded-xl transition-all ${
                                                                            form.is_active 
                                                                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                                                                                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                                                        }`}
                                                                    >
                                                                        {form.is_active ? 'Active' : 'Inactive (Click to activate)'}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleEditForm(form)}
                                                                        className="bg-indigo-500 border border-indigo-600 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-indigo-600 transition-all"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => handleDeleteForm(form.id)}
                                                                        className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-rose-100 transition-all"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                    })}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="border border-slate-100 p-6 bg-slate-50/30 rounded-2xl space-y-6">
                                            <div className="border-b border-slate-100 pb-3">
                                                <h4 className="text-xl font-black uppercase text-slate-800">
                                                    {editingFormId !== null ? 'Edit Dynamic Registration Form' : 'Create Dynamic Registration Form'}
                                                </h4>
                                            </div>

                                            {/* Form properties */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-black uppercase text-slate-700">Form Title</label>
                                                    <input 
                                                        type="text" 
                                                        value={newFormTitle} 
                                                        onChange={e => setNewFormTitle(e.target.value)}
                                                        placeholder="e.g. Pendaftaran Reuni SMA 78 Angkatan 1996"
                                                        className="w-full border border-slate-200 p-2.5 bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-black uppercase text-slate-700">Ticket Price (IDR)</label>
                                                    <input 
                                                        type="number" 
                                                        value={newFormPrice} 
                                                        onChange={e => setNewFormPrice(e.target.value)}
                                                        className="w-full border border-slate-200 p-2.5 bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-black uppercase text-slate-700">Limit Kuota Peserta <span className="text-slate-400 font-normal normal-case">(opsional)</span></label>
                                                    <input 
                                                        type="number" 
                                                        min="1"
                                                        value={newFormMaxParticipants} 
                                                        onChange={e => setNewFormMaxParticipants(e.target.value)}
                                                        placeholder="Kosongkan = tidak ada limit"
                                                        className="w-full border border-slate-200 p-2.5 bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-xs font-bold text-slate-800"
                                                    />
                                                    <p className="text-[10px] text-slate-400">Pendaftaran otomatis tutup jika peserta mencapai limit ini.</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-black uppercase text-slate-700">Batas Waktu Tutup Otomatis <span className="text-slate-400 font-normal normal-case">(opsional)</span></label>
                                                    <input 
                                                        type="datetime-local" 
                                                        value={newFormClosedAt} 
                                                        onChange={e => setNewFormClosedAt(e.target.value)}
                                                        className="w-full border border-slate-200 p-2.5 bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-xs font-bold text-slate-800"
                                                    />
                                                    <p className="text-[10px] text-slate-400">Pendaftaran otomatis tutup pada tanggal & waktu ini.</p>
                                                </div>
                                            </div>

                                            {/* Additional Fees Configuration */}
                                            <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-2xl space-y-4">
                                                <div className="flex justify-between items-center border-b border-slate-150 pb-2">
                                                    <h5 className="font-black text-sm uppercase text-slate-800 flex items-center gap-1.5">
                                                        <span>💵</span> Biaya Tambahan (Opsional)
                                                    </h5>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setNewFormAdditionalFees(prev => [...prev, { name: '', type: 'fixed', value: 0 }]);
                                                        }}
                                                        className="bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg shadow-sm hover:bg-indigo-700 active:translate-y-px transition-all"
                                                    >
                                                        + Tambah Biaya
                                                    </button>
                                                </div>
                                                {newFormAdditionalFees.length === 0 ? (
                                                    <p className="text-xs text-slate-450 italic">Belum ada biaya tambahan yang diatur.</p>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {newFormAdditionalFees.map((fee, idx) => (
                                                            <div key={idx} className="flex flex-col md:flex-row gap-3 items-end bg-white border border-slate-100 p-3 rounded-xl shadow-sm relative">
                                                                <div className="flex-1 space-y-1">
                                                                    <label className="block text-[10px] font-black uppercase text-slate-500">Nama Biaya</label>
                                                                    <input 
                                                                        type="text" 
                                                                        value={fee.name} 
                                                                        placeholder="e.g. Pajak, Biaya Layanan"
                                                                        onChange={e => {
                                                                            const next = [...newFormAdditionalFees];
                                                                            next[idx] = { ...next[idx], name: e.target.value };
                                                                            setNewFormAdditionalFees(next);
                                                                        }}
                                                                        className="w-full border border-slate-200 p-2 bg-slate-50/30 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                                                                    />
                                                                </div>
                                                                <div className="w-full md:w-32 space-y-1">
                                                                    <label className="block text-[10px] font-black uppercase text-slate-500">Tipe</label>
                                                                    <select 
                                                                        value={fee.type}
                                                                        onChange={e => {
                                                                            const next = [...newFormAdditionalFees];
                                                                            next[idx] = { ...next[idx], type: e.target.value };
                                                                            setNewFormAdditionalFees(next);
                                                                        }}
                                                                        className="w-full border border-slate-200 p-2 bg-white rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                                    >
                                                                        <option value="fixed">Nominal Tetap (Rp)</option>
                                                                        <option value="percent">Persen (%)</option>
                                                                    </select>
                                                                </div>
                                                                <div className="w-full md:w-32 space-y-1">
                                                                    <label className="block text-[10px] font-black uppercase text-slate-500">Nilai</label>
                                                                    <input 
                                                                        type="number" 
                                                                        value={fee.value} 
                                                                        onChange={e => {
                                                                            const next = [...newFormAdditionalFees];
                                                                            next[idx] = { ...next[idx], value: parseFloat(e.target.value) || 0 };
                                                                            setNewFormAdditionalFees(next);
                                                                        }}
                                                                        className="w-full border border-slate-200 p-2 bg-slate-50/30 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                                                                    />
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setNewFormAdditionalFees(prev => prev.filter((_, i) => i !== idx));
                                                                    }}
                                                                    className="bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 p-2 rounded-lg transition-colors flex items-center justify-center shrink-0 mb-0.5"
                                                                    title="Hapus Biaya"
                                                                >
                                                                    <Trash className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Field Creator Card */}
                                            <div className={`border p-5 rounded-2xl shadow-sm space-y-4 transition-all ${editingFieldIndex !== null ? 'bg-cyan-50/40 border-cyan-200' : 'bg-slate-50/50 border-slate-100'}`}>
                                                <div className="flex justify-between items-center border-b border-slate-150 pb-2">
                                                    <h5 className="font-black text-sm uppercase text-slate-800">
                                                        {editingFieldIndex !== null ? `✏️ Edit Field #${editingFieldIndex + 1}` : 'Add Dynamic Field'}
                                                    </h5>
                                                    {editingFieldIndex !== null && (
                                                        <button
                                                            type="button"
                                                            onClick={handleCancelFieldEdit}
                                                            className="text-[10px] font-black uppercase text-slate-400 hover:text-rose-600 underline"
                                                        >
                                                            ✕ Batal Edit
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="block text-[10px] font-black uppercase text-slate-600">
                                                            {tempType === 'description' && !tempLabel ? 'Title (Optional)' : 'Field Label'}
                                                        </label>
                                                        <input 
                                                            type="text" 
                                                            value={tempLabel} 
                                                            onChange={e => setTempLabel(e.target.value)}
                                                            placeholder={tempType === 'title' ? 'e.g. DATA ALAMAT' : tempType === 'description' ? 'e.g. Syarat & Ketentuan' : 'e.g. Tahun Kelulusan'}
                                                            className={`w-full border border-slate-200 p-2.5 bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800 ${editingFieldIndex !== null ? 'border-cyan-500 ring-2 ring-cyan-300/30' : ''}`}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="block text-[10px] font-black uppercase text-slate-600">Field Type</label>
                                                        <select 
                                                            value={tempType} 
                                                            onChange={e => {
                                                                setTempType(e.target.value as any);
                                                                if (['title', 'description'].includes(e.target.value)) {
                                                                    setTempRequired(false);
                                                                }
                                                            }}
                                                            className="w-full border border-slate-200 p-2.5 bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                        >
                                                            <optgroup label="Tipe Teks & Input Standar">
                                                                <option value="text">Text Input</option>
                                                                <option value="number">Number Input</option>
                                                                <option value="email">Email Input</option>
                                                                <option value="textarea">Text Area</option>
                                                                <option value="phone">Phone / WhatsApp</option>
                                                                <option value="url">URL Link</option>
                                                            </optgroup>
                                                            <optgroup label="Pilihan & Pilihan Ganda">
                                                                <option value="select">Select Dropdown (Single)</option>
                                                                <option value="multiselect">Multiple Select Option (Checkbox Group)</option>
                                                                <option value="checkbox">Single Checkbox (Agreement)</option>
                                                                <option value="rating">Rating (1-5 Stars)</option>
                                                            </optgroup>
                                                            <optgroup label="Pencatat Waktu">
                                                                <option value="date">Date Picker</option>
                                                                <option value="datetime">Date & Time Picker</option>
                                                            </optgroup>
                                                            <optgroup label="Unggahan & Media">
                                                                <option value="image">Upload Image</option>
                                                                <option value="signature">Digital Signature</option>
                                                            </optgroup>
                                                            <optgroup label="Pembatas Visual & Kategori">
                                                                <option value="title">Title Separator (Margin Top)</option>
                                                                <option value="description">Description Text Block</option>
                                                            </optgroup>
                                                        </select>
                                                    </div>
                                                    {!['title', 'description'].includes(tempType) && (
                                                        <div className="flex items-center gap-2 pt-6">
                                                            <input 
                                                                type="checkbox" 
                                                                id="tempRequired" 
                                                                checked={tempRequired}
                                                                onChange={e => setTempRequired(e.target.checked)}
                                                                className="h-4 w-4 border-slate-350 rounded text-indigo-650 focus:ring-indigo-500/30 focus:outline-none"
                                                            />
                                                            <label htmlFor="tempRequired" className="text-xs font-black uppercase text-slate-700 cursor-pointer select-none">Required Field</label>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Options for Select and Multiselect */}
                                                {['select', 'multiselect'].includes(tempType) && (
                                                    <div className="space-y-3">
                                                        <div className="space-y-1">
                                                            <label className="block text-[10px] font-black uppercase text-slate-600">Options (Comma separated)</label>
                                                            <input 
                                                                type="text" 
                                                                value={tempOptions} 
                                                                onChange={e => setTempOptions(e.target.value)}
                                                                placeholder="S, M, L, XL, XXL"
                                                                className="w-full border border-slate-200 p-2.5 bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                            />
                                                        </div>
                                                        {tempType === 'select' && (
                                                            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3.5 py-2.5 rounded-xl">
                                                                <input 
                                                                    type="checkbox" 
                                                                    id="tempAllowOther" 
                                                                    checked={tempAllowOther}
                                                                    onChange={e => setTempAllowOther(e.target.checked)}
                                                                    className="h-4 w-4 border-amber-300 rounded text-amber-600 focus:ring-amber-500/30 focus:outline-none"
                                                                />
                                                                <label htmlFor="tempAllowOther" className="text-[10px] font-black uppercase text-amber-800 cursor-pointer select-none">
                                                                    Aktifkan Opsi "Lainnya" — peserta bisa isi teks bebas
                                                                </label>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Description Field Type Specific Textarea */}
                                                {tempType === 'description' && (
                                                    <div className="space-y-1">
                                                        <label className="block text-[10px] font-black uppercase text-slate-600">Description Text Content</label>
                                                        <textarea 
                                                            value={tempDescription} 
                                                            onChange={e => setTempDescription(e.target.value)}
                                                            placeholder="Tulis instruksi tambahan, informasi kategori, atau catatan penting di sini..."
                                                            rows={3}
                                                            className="w-full border border-slate-200 p-2.5 bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                        />
                                                    </div>
                                                )}

                                                {/* Placeholder & Help Text Opsi */}
                                                {!['title', 'description', 'signature', 'image', 'checkbox', 'rating'].includes(tempType) && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <label className="block text-[10px] font-black uppercase text-slate-600">Placeholder Text (Opsional)</label>
                                                            <input 
                                                                type="text" 
                                                                value={tempPlaceholder} 
                                                                onChange={e => setTempPlaceholder(e.target.value)}
                                                                placeholder="e.g. Masukkan nama lengkap Anda..."
                                                                className="w-full border border-slate-200 p-2.5 bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="block text-[10px] font-black uppercase text-slate-600">Help Text / Notes (Opsional)</label>
                                                            <input 
                                                                type="text" 
                                                                value={tempHelpText} 
                                                                onChange={e => setTempHelpText(e.target.value)}
                                                                placeholder="e.g. Tulis nama tanpa gelar, sesuai KTP"
                                                                className="w-full border border-slate-200 p-2.5 bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Help Text for Fields that don't support placeholder (e.g. image, signature, checkbox, rating) */}
                                                {['image', 'signature', 'checkbox', 'rating'].includes(tempType) && (
                                                    <div className="space-y-1">
                                                        <label className="block text-[10px] font-black uppercase text-slate-600">Help Text / Notes (Opsional)</label>
                                                        <input 
                                                            type="text" 
                                                            value={tempHelpText} 
                                                            onChange={e => setTempHelpText(e.target.value)}
                                                            placeholder="e.g. Format JPG/PNG maksimal 4MB"
                                                            className="w-full border border-slate-200 p-2.5 bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                        />
                                                    </div>
                                                )}

                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleAddField}
                                                        className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm transition-all ${
                                                            editingFieldIndex !== null 
                                                                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-95' 
                                                                : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-95'
                                                        }`}
                                                    >
                                                        {editingFieldIndex !== null ? '✓ Update Field' : '+ Add Field'}
                                                    </button>
                                                    {editingFieldIndex !== null && (
                                                        <button
                                                            type="button"
                                                            onClick={handleCancelFieldEdit}
                                                            className="bg-white border border-slate-200 px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-50 text-slate-700 transition-all"
                                                        >
                                                            Batal
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Preview current configured fields */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <h5 className="font-black text-sm uppercase text-slate-800">Configured Fields List:</h5>
                                                    {newFormFields.length > 1 && (
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                                                            ⠿ Drag rows to reorder
                                                        </span>
                                                    )}
                                                </div>
                                                {newFormFields.length === 0 ? (
                                                    <p className="text-xs text-slate-500 font-bold">No custom fields added yet. Default dynamic signature is included automatically.</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {newFormFields.map((field, idx) => (
                                                            <div 
                                                                key={idx}
                                                                draggable
                                                                onDragStart={() => handleDragStart(idx)}
                                                                onDragOver={(e) => handleDragOver(e, idx)}
                                                                onDrop={(e) => handleDrop(e, idx)}
                                                                onDragEnd={handleDragEnd}
                                                                className={`border p-3.5 flex justify-between items-center text-xs rounded-xl transition-all select-none ${
                                                                    dragOverIndex === idx && dragFromIndex.current !== idx
                                                                        ? 'bg-amber-50 border-amber-300 scale-[1.01] shadow-sm'
                                                                        : editingFieldIndex === idx
                                                                        ? 'bg-cyan-50/50 border-cyan-300 shadow-sm'
                                                                        : 'bg-white border-slate-100 hover:bg-slate-50/50 shadow-sm'
                                                                }`}
                                                            >
                                                                {/* Drag Handle */}
                                                                <span 
                                                                    className="text-slate-400 hover:text-slate-700 cursor-grab active:cursor-grabbing mr-2 text-base leading-none select-none shrink-0"
                                                                    title="Drag to reorder"
                                                                >
                                                                    ⠿
                                                                </span>
                                                                <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                                                                    <span className="text-[10px] font-black text-slate-405 w-5 text-center">{idx + 1}.</span>
                                                                    {field.type === 'description' && !field.label ? (
                                                                        <span className="font-semibold italic text-slate-500 max-w-[200px] truncate">({field.description || 'Deskripsi Tanpa Judul'})</span>
                                                                    ) : (
                                                                        <span className="font-black uppercase text-slate-800">{field.label}</span>
                                                                    )}
                                                                    <span className="text-[10px] bg-slate-50 border border-slate-150 text-slate-650 px-2 py-0.5 rounded-md font-bold uppercase">{field.type}</span>
                                                                    {field.required && !['title', 'description'].includes(field.type) && <span className="text-[10px] bg-rose-50 border border-rose-100 text-rose-600 px-2 py-0.5 rounded-md font-bold uppercase">Required</span>}
                                                                    {['select', 'multiselect'].includes(field.type) && field.options?.length > 0 && (
                                                                        <span className="text-[10px] text-slate-450 font-bold">[{field.options.join(', ')}{field.allow_other ? ', Lainnya...' : ''}]</span>
                                                                    )}
                                                                    {field.allow_other && (
                                                                        <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-md font-bold uppercase">+Lainnya</span>
                                                                    )}
                                                                    {field.placeholder && (
                                                                        <span className="text-[9px] text-slate-400 font-medium">Placeholder: "{field.placeholder}"</span>
                                                                    )}
                                                                    {field.help_text && (
                                                                        <span className="text-[9px] text-slate-400 font-medium italic">Help: "{field.help_text}"</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex gap-1.5 shrink-0">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleEditFieldStart(idx)}
                                                                        disabled={editingFieldIndex === idx}
                                                                        className={`border px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-colors ${
                                                                            editingFieldIndex === idx 
                                                                                ? 'bg-cyan-50 border-cyan-100 text-cyan-600 cursor-default' 
                                                                                : 'bg-cyan-50 border-cyan-100 text-cyan-700 hover:bg-cyan-100'
                                                                        }`}
                                                                    >
                                                                        {editingFieldIndex === idx ? '✏️ Editing' : 'Edit'}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveField(idx)}
                                                                        className="bg-rose-50 border border-rose-100 text-rose-650 px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg hover:bg-rose-100 transition-colors"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Save & Cancel Footer */}
                                            <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsBuildingForm(false);
                                                        setEditingFormId(null);
                                                        setNewFormTitle('');
                                                        setNewFormPrice('150000');
                                                        setNewFormMaxParticipants('');
                                                        setNewFormClosedAt('');
                                                        setNewFormFields([]);
                                                    }}
                                                    className="bg-white border border-slate-200 px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-50 text-slate-700 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleSaveFormSubmit}
                                                    className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:opacity-95 active:translate-y-px transition-all"
                                                >
                                                    Save Form Configuration
                                                </button>
                                            </div>                                      
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 4: Modular Plugins Manager */}
                            {activeTab === 'plugins' && (
                                <div className="space-y-6">
                                    <div className="border-b border-slate-100 pb-4">
                                        <h4 className="text-xl font-black uppercase flex items-center gap-2">
                                            <Layers className="h-6 w-6 text-pink-500" />
                                            WordPress-style Modular Plugins
                                        </h4>
                                        <p className="text-xs text-gray-500 mt-1">Activate or deactivate additional packages like Donation modules and Merchandise options dynamically.</p>
                                    </div>

                                    {plugins.length === 0 ? (
                                        <div className="border border-slate-250 p-8 text-center bg-slate-50/50 rounded-2xl">
                                            <p className="font-bold text-slate-700">No dynamic plugins detected in `plugins/` directory.</p>
                                            <p className="text-xs text-slate-400 mt-1">Add modular folders inside your project root /plugins directory to see them here.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {plugins.map(plugin => (
                                                <div 
                                                    key={plugin.id} 
                                                    className={`border border-slate-100 p-6 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden transition-all hover:shadow-md ${
                                                        plugin.is_active ? 'bg-emerald-50/30' : 'bg-slate-50/50'
                                                    }`}
                                                >
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-start">
                                                            <h5 className="text-lg font-black text-slate-800 uppercase">{plugin.name}</h5>
                                                            <span className="text-[10px] bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-md font-bold">v{plugin.version}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 font-bold">
                                                            Provides modular extensions for {plugin.name.toLowerCase()} configuration settings.
                                                        </p>
                                                    </div>
                                                    
                                                    <div className="mt-6 flex justify-between items-center">
                                                        <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 text-slate-700">
                                                            Status: {plugin.is_active ? (
                                                                <span className="text-emerald-700 font-black flex items-center gap-0.5"><Check className="h-4 w-4" /> Active</span>
                                                            ) : (
                                                                <span className="text-rose-700 font-black flex items-center gap-0.5"><X className="h-4 w-4" /> Inactive</span>
                                                            )}
                                                        </span>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleTogglePlugin(plugin.id)}
                                                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm transition-all flex items-center gap-1.5 ${
                                                                plugin.is_active 
                                                                    ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' 
                                                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                            }`}
                                                        >
                                                            <Power className="h-3.5 w-3.5" />
                                                            {plugin.is_active ? 'Deactivate' : 'Activate'}
                                                        </button>
                                                    </div>

                                                    {plugin.is_active && plugin.id !== 'merchandise' && (
                                                        <div className="mt-4 pt-4 border-t border-slate-100/50 flex justify-between items-center">
                                                            <div className="space-y-0.5">
                                                                <span className="text-[10px] font-black uppercase text-slate-700">Tipe Opsional (Additional)</span>
                                                                <p className="text-[9px] text-slate-450 font-bold leading-none">
                                                                    {plugin.settings?.additional !== false ? 'Pilihan Tambahan (Opsional)' : 'Pendaftaran Wajib (Mandatory)'}
                                                                </p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleTogglePluginAdditional(plugin.id)}
                                                                className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg border transition-all ${
                                                                    plugin.settings?.additional !== false
                                                                        ? 'bg-indigo-50 border-indigo-150 text-indigo-700 hover:bg-indigo-100'
                                                                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                                                                }`}
                                                            >
                                                                {plugin.settings?.additional !== false ? 'Set Wajib (Mandatory)' : 'Set Opsional'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Donation Configuration Settings Panel */}
                                    {donationPluginData?.is_active && (
                                        <div className="border border-slate-100 p-6 bg-slate-50/30 rounded-2xl mt-8 space-y-6">
                                            <div className="border-b border-slate-100 pb-3">
                                                <h4 className="text-xl font-black uppercase tracking-wider text-slate-800">
                                                    🎁 Donation Plugin Configuration
                                                </h4>
                                                <p className="text-xs font-bold text-slate-550 mt-1">Configure texts displayed on the Donation step during registration.</p>
                                            </div>

                                            <form onSubmit={handleSaveDonationSettings} className="space-y-4">
                                                <div className="space-y-1.5">
                                                    <label className="block text-xs font-bold uppercase text-slate-655 tracking-wider">Donation Title / Header</label>
                                                    <input 
                                                        type="text" 
                                                        value={donationForm.title}
                                                        onChange={e => setDonationForm(prev => ({ ...prev, title: e.target.value }))}
                                                        className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 bg-white"
                                                        placeholder="🎁 Donasi Sukarela Zawawalk 2026"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="block text-xs font-bold uppercase text-slate-655 tracking-wider">Donation Description</label>
                                                    <textarea 
                                                        rows={3}
                                                        value={donationForm.description}
                                                        onChange={e => setDonationForm(prev => ({ ...prev, description: e.target.value }))}
                                                        className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 bg-white"
                                                        placeholder="Dukung kesuksesan event Zawawalk 2026 dengan donasi sukarela Anda. Setiap kontribusi sangat berarti."
                                                    />
                                                </div>

                                                <div className="flex justify-end pt-2">
                                                    <button 
                                                        type="submit" 
                                                        className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white px-8 py-3 text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:opacity-95 active:translate-y-px transition-all"
                                                    >
                                                        Simpan Donasi
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    )}

                                    {/* Merchandise Configuration Settings Panel */}
                                    {merchandisePluginData?.is_active && (
                                        <div className="border border-slate-100 p-6 bg-slate-50/30 rounded-2xl mt-8 space-y-6">
                                            <div className="border-b border-slate-100 pb-3">
                                                <h4 className="text-xl font-black uppercase tracking-wider text-slate-800">
                                                    🛍️ Merchandise Plugin Configuration
                                                </h4>
                                                <p className="text-xs font-bold text-slate-550 mt-1">Configure products available for purchase during registration.</p>
                                            </div>

                                            <form onSubmit={handleSaveMerchSettings} className="space-y-8">
                                                {/* Custom Title and Description */}
                                                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                                                    <h5 className="font-bold text-sm text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                                                        Teks Pengantar Merchandise
                                                    </h5>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <label className="block text-[10px] font-black uppercase text-slate-500">Judul Pertanyaan</label>
                                                            <input 
                                                                type="text"
                                                                value={merchForm.title || ''}
                                                                placeholder="Contoh: Apakah Anda ingin memesan Merchandise Zawawalk?"
                                                                onChange={e => setMerchForm((prev: any) => ({ ...prev, title: e.target.value }))}
                                                                className="w-full border border-slate-200 p-2.5 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="block text-[10px] font-black uppercase text-slate-500">Deskripsi / Penjelasan</label>
                                                            <input 
                                                                type="text"
                                                                value={merchForm.description || ''}
                                                                placeholder="Contoh: Kami menyediakan Kaos, Jaket, E-Money, dan Tumbler edisi khusus Zawawalk."
                                                                onChange={e => setMerchForm((prev: any) => ({ ...prev, description: e.target.value }))}
                                                                className="w-full border border-slate-200 p-2.5 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                    {['kaos', 'jaket', 'jersey', 'emoney', 'tumbler'].map(item => {
                                                        const config = merchForm[item] || {};
                                                        const isClothes = ['kaos', 'jaket', 'jersey'].includes(item);
                                                        
                                                        return (
                                                            <div key={item} className="border border-slate-100 p-5 bg-white rounded-2xl shadow-sm space-y-4 relative hover:shadow-md transition-all">
                                                                <div className="flex justify-between items-center bg-slate-800 text-white p-3 px-4 rounded-t-2xl -mx-5 -mt-5 mb-3">
                                                                    <span className="font-black uppercase text-sm tracking-wider">{item === 'kaos' ? '👕 Kaos' : item === 'jaket' ? '🧥 Jaket' : item === 'jersey' ? '🎽 Jersey' : item === 'emoney' ? '💳 E-Money' : '🥤 Tumbler'}</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <input 
                                                                            type="checkbox" 
                                                                            id={`merch_${item}_enabled`}
                                                                            checked={config.enabled === true || String(config.enabled) === 'true'}
                                                                            onChange={e => handleMerchFieldChange(item, 'enabled', e.target.checked)}
                                                                            className="h-4 w-4 text-emerald-500 border-white focus:ring-0 cursor-pointer rounded"
                                                                        />
                                                                        <label htmlFor={`merch_${item}_enabled`} className="text-xs font-black uppercase tracking-wider cursor-pointer select-none">Aktifkan</label>
                                                                    </div>
                                                                </div>
                                                                {(config.enabled === true || String(config.enabled) === 'true') && (
                                                                    <div className="space-y-3 pt-2">
                                                                        <div className="grid grid-cols-2 gap-4">
                                                                            <div className="space-y-1">
                                                                                <label className="block text-[10px] font-black uppercase text-slate-500">Harga (IDR)</label>
                                                                                <input 
                                                                                    type="number"
                                                                                    value={config.price || 0}
                                                                                    onChange={e => handleMerchFieldChange(item, 'price', e.target.value)}
                                                                                    className="w-full border border-slate-200 p-2.5 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                                                />
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <label className="block text-[10px] font-black uppercase text-slate-500">Aturan Pembelian</label>
                                                                                <select
                                                                                    value={String(config.required ?? false)}
                                                                                    onChange={e => handleMerchFieldChange(item, 'required', e.target.value === 'true')}
                                                                                    className="w-full border border-slate-200 p-2.5 bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                                                >
                                                                                    <option value="false">Opsional (Bisa dipilih/tidak)</option>
                                                                                    <option value="true">Wajib (Harus dibeli)</option>
                                                                                </select>
                                                                            </div>
                                                                        </div>

                                                                        <div className="space-y-1">
                                                                            <label className="block text-[10px] font-black uppercase text-slate-500">Deskripsi Produk</label>
                                                                            <textarea
                                                                                value={config.description || ''}
                                                                                onChange={e => handleMerchFieldChange(item, 'description', e.target.value)}
                                                                                rows={2}
                                                                                className="w-full border border-slate-200 p-2.5 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                                                placeholder="Spesifikasi bahan, warna, edisi, dll..."
                                                                            />
                                                                        </div>

                                                                        {isClothes && (
                                                                            <>
                                                                                <div className="space-y-2">
                                                                                    <label className="block text-[10px] font-black uppercase text-slate-500">Pilihan Ukuran & Harga per Ukuran</label>
                                                                                    <div className="space-y-2 flex flex-col">
                                                                                        {(config.sizes_prices || []).map((sp: any, idx: number) => (
                                                                                            <div key={idx} className="flex gap-2 items-center">
                                                                                                <input 
                                                                                                    type="text"
                                                                                                    value={sp.size || ''}
                                                                                                    placeholder="S, M, L..."
                                                                                                    onChange={e => handleUpdateSizePrice(item, idx, 'size', e.target.value)}
                                                                                                    className="border border-slate-200 p-2 bg-white rounded-xl focus:outline-none w-20 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-bold text-slate-800"
                                                                                                />
                                                                                                <span className="text-xs font-bold">Rp</span>
                                                                                                <input 
                                                                                                    type="number"
                                                                                                    value={sp.price || 0}
                                                                                                    placeholder="Harga"
                                                                                                    onChange={e => handleUpdateSizePrice(item, idx, 'price', parseInt(e.target.value) || 0)}
                                                                                                    className="border border-slate-200 p-2 bg-white rounded-xl focus:outline-none w-28 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-bold text-slate-800"
                                                                                                />
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => handleRemoveSizePrice(item, idx)}
                                                                                                    className="bg-rose-50 border border-rose-100 text-rose-600 p-2 px-3 text-[10px] font-bold uppercase rounded-lg hover:bg-rose-100 transition-colors"
                                                                                                >
                                                                                                    Hapus
                                                                                                </button>
                                                                                            </div>
                                                                                        ))}
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => handleAddSizePrice(item)}
                                                                                            className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-2 text-[10px] font-bold uppercase rounded-lg hover:bg-indigo-100 transition-all w-fit"
                                                                                        >
                                                                                            + Tambah Ukuran & Harga
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="border-t border-dashed border-slate-150 pt-2 flex flex-col gap-2">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <input 
                                                                                            type="checkbox" 
                                                                                            id={`merch_${item}_enable_nickname`}
                                                                                            checked={config.enable_nickname === true || String(config.enable_nickname) === 'true'}
                                                                                            onChange={e => handleMerchFieldChange(item, 'enable_nickname', e.target.checked)}
                                                                                            className="h-4 w-4 border-slate-300 rounded text-indigo-650 focus:ring-indigo-500/30 focus:outline-none"
                                                                                        />
                                                                                        <label htmlFor={`merch_${item}_enable_nickname`} className="text-xs font-black uppercase tracking-wider cursor-pointer text-slate-700">
                                                                                            Aktifkan Cetak Nama Panggilan
                                                                                        </label>
                                                                                    </div>
                                                                                    {(config.enable_nickname === true || String(config.enable_nickname) === 'true') && (
                                                                                        <div className="space-y-1 pl-6">
                                                                                            <label className="block text-[10px] font-black uppercase text-slate-500">Maksimal Karakter Nama Panggilan</label>
                                                                                            <input 
                                                                                                type="number"
                                                                                                min="1"
                                                                                                value={config.max_nickname_chars || 12}
                                                                                                onChange={e => handleMerchFieldChange(item, 'max_nickname_chars', parseInt(e.target.value) || 12)}
                                                                                                className="w-24 border border-slate-200 p-2 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                                                            />
                                                                                        </div>
                                                                                    )}

                                                                                    {item === 'kaos' && (
                                                                                        <div className="border-t border-dashed border-slate-100 pt-2 flex flex-col gap-2">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <input 
                                                                                                    type="checkbox" 
                                                                                                    id="merch_kaos_enable_colors"
                                                                                                    checked={config.enable_colors === true || String(config.enable_colors) === 'true'}
                                                                                                    onChange={e => handleMerchFieldChange(item, 'enable_colors', e.target.checked)}
                                                                                                    className="h-4 w-4 border-slate-300 rounded text-indigo-650 focus:ring-indigo-500/30 focus:outline-none"
                                                                                                />
                                                                                                <label htmlFor="merch_kaos_enable_colors" className="text-xs font-black uppercase tracking-wider cursor-pointer text-slate-700">
                                                                                                    Aktifkan Pilihan Warna
                                                                                                </label>
                                                                                            </div>
                                                                                            {(config.enable_colors === true || String(config.enable_colors) === 'true') && (
                                                                                                <div className="space-y-1 pl-6">
                                                                                                    <label className="block text-[10px] font-black uppercase text-slate-500">Daftar Warna (pisahkan dengan koma)</label>
                                                                                                    <input 
                                                                                                        type="text"
                                                                                                        value={config.colors_list || ''}
                                                                                                        placeholder="Hitam, Putih, Merah..."
                                                                                                        onChange={e => handleMerchFieldChange(item, 'colors_list', e.target.value)}
                                                                                                        className="w-full border border-slate-200 p-2 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                                                                    />
                                                                                                </div>
                                                                                            )}

                                                                                            <div className="flex items-center gap-2 mt-1">
                                                                                                <input 
                                                                                                    type="checkbox" 
                                                                                                    id="merch_kaos_enable_sleeves"
                                                                                                    checked={config.enable_sleeves === true || String(config.enable_sleeves) === 'true'}
                                                                                                    onChange={e => handleMerchFieldChange(item, 'enable_sleeves', e.target.checked)}
                                                                                                    className="h-4 w-4 border-slate-300 rounded text-indigo-650 focus:ring-indigo-500/30 focus:outline-none"
                                                                                                />
                                                                                                <label htmlFor="merch_kaos_enable_sleeves" className="text-xs font-black uppercase tracking-wider cursor-pointer text-slate-700">
                                                                                                    Aktifkan Pilihan Lengan Panjang/Pendek
                                                                                                </label>
                                                                                            </div>
                                                                                            {(config.enable_sleeves === true || String(config.enable_sleeves) === 'true') && (
                                                                                                <div className="space-y-1 pl-6">
                                                                                                    <label className="block text-[10px] font-black uppercase text-slate-500">Biaya Tambahan Lengan Panjang (IDR)</label>
                                                                                                    <input 
                                                                                                        type="number"
                                                                                                        min="0"
                                                                                                        value={config.long_sleeve_surcharge || 0}
                                                                                                        onChange={e => handleMerchFieldChange(item, 'long_sleeve_surcharge', parseInt(e.target.value) || 0)}
                                                                                                        className="w-36 border border-slate-200 p-2 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                                                                    />
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </>
                                                                        )}

                                                                        {item === 'kaos' ? (
                                                                            <div className="space-y-4 border-t border-slate-100 pt-3">
                                                                                <label className="block text-[10px] font-black uppercase text-slate-500">Gambar Produk per Varian (Warna & Lengan)</label>
                                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                                    {getKaosCombinations(config).map(comb => {
                                                                                        const cleanLabel = comb.replace('_', ' + ');
                                                                                        const preview = kaosVariantPreviews[comb];
                                                                                        return (
                                                                                            <div key={comb} className="border border-slate-100 p-3 bg-slate-55/30 rounded-xl space-y-2">
                                                                                                <span className="block text-[10px] font-extrabold uppercase text-slate-700">{cleanLabel}</span>
                                                                                                {preview && (
                                                                                                    <div className="border border-slate-200 p-1 bg-white max-h-16 rounded-lg overflow-hidden flex items-center justify-center">
                                                                                                        <img src={preview} alt={comb} className="max-h-14 object-contain" />
                                                                                                    </div>
                                                                                                )}
                                                                                                <input 
                                                                                                    type="file"
                                                                                                    accept="image/*"
                                                                                                    onChange={e => handleKaosVariantImageChange(comb, e.target.files ? e.target.files[0] : null)}
                                                                                                    className="w-full text-[10px] file:mr-2 file:py-1 file:px-2.5 file:border file:border-slate-200 file:rounded-md file:text-[9px] file:font-bold file:bg-slate-100 file:text-slate-700 file:uppercase file:cursor-pointer file:hover:bg-slate-200 transition-all"
                                                                                                />
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="space-y-2">
                                                                                <label className="block text-[10px] font-black uppercase text-slate-500">Gambar Produk</label>
                                                                                {merchPreviews[item] && (
                                                                                    <div className="border border-slate-200 p-2 bg-slate-50 max-h-20 rounded-xl overflow-hidden flex items-center justify-center">
                                                                                        <img src={merchPreviews[item]!} alt={`${item} preview`} className="max-h-16 object-contain" />
                                                                                    </div>
                                                                                )}
                                                                                <input 
                                                                                    type="file"
                                                                                    accept="image/*"
                                                                                    onChange={e => handleMerchImageChange(item, e.target.files ? e.target.files[0] : null)}
                                                                                    className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:border file:border-slate-200 file:rounded-lg file:text-[10px] file:font-bold file:bg-slate-100 file:text-slate-700 file:uppercase file:cursor-pointer file:hover:bg-slate-200 transition-all"
                                                                                />
                                                                            </div>
                                                                        )}

                                                                        {isClothes && (
                                                                            <div className="space-y-2 pt-2 border-t border-dashed border-slate-150">
                                                                                {item === 'kaos' ? (
                                                                                    <div className="space-y-4">
                                                                                        <label className="block text-[10px] font-black uppercase text-slate-500">📏 Gambar Panduan Ukuran (Size Chart)</label>
                                                                                        {(() => {
                                                                                            const enableSleeves = config.enable_sleeves === true || String(config.enable_sleeves) === 'true';
                                                                                            const sleevesToChart = enableSleeves ? ['Lengan Pendek', 'Lengan Panjang'] : ['Lengan Pendek'];
                                                                                            return (
                                                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                                                    {sleevesToChart.map(s => {
                                                                                                        const preview = kaosSizeChartPreviews[s];
                                                                                                        return (
                                                                                                            <div key={s} className="border border-slate-100 p-3 bg-slate-55/30 rounded-xl space-y-2">
                                                                                                                <span className="block text-[10px] font-extrabold uppercase text-slate-700">{s}</span>
                                                                                                                {preview && (
                                                                                                                    <div className="border border-slate-200 p-1 bg-white max-h-16 rounded-lg overflow-hidden flex items-center justify-center">
                                                                                                                        <img src={preview} alt={`${s} size chart`} className="max-h-14 object-contain" />
                                                                                                                    </div>
                                                                                                                )}
                                                                                                                <input 
                                                                                                                    type="file"
                                                                                                                    accept="image/*"
                                                                                                                    onChange={e => handleKaosSizeChartChange(s, e.target.files ? e.target.files[0] : null)}
                                                                                                                    className="w-full text-[10px] file:mr-2 file:py-1 file:px-2.5 file:border file:border-slate-200 file:rounded-md file:text-[9px] file:font-bold file:bg-slate-100 file:text-slate-700 file:uppercase file:cursor-pointer file:hover:bg-slate-200 transition-all"
                                                                                                                />
                                                                                                            </div>
                                                                                                        );
                                                                                                    })}
                                                                                                </div>
                                                                                            );
                                                                                        })()}
                                                                                    </div>
                                                                                ) : (
                                                                                    <>
                                                                                        <label className="block text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
                                                                                            📏 Gambar Panduan Ukuran (Size Chart)
                                                                                        </label>
                                                                                        {merchSizeChartPreviews[item] && (
                                                                                            <div className="border border-slate-200 p-2 bg-slate-50 max-h-20 rounded-xl overflow-hidden flex items-center justify-center">
                                                                                                <img src={merchSizeChartPreviews[item]!} alt={`${item} size chart preview`} className="max-h-16 object-contain" />
                                                                                            </div>
                                                                                        )}
                                                                                        <input 
                                                                                            type="file"
                                                                                            accept="image/*"
                                                                                            onChange={e => handleMerchSizeChartImageChange(item, e.target.files ? e.target.files[0] : null)}
                                                                                            className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:border file:border-slate-200 file:rounded-lg file:text-[10px] file:font-bold file:bg-slate-100 file:text-slate-700 file:uppercase file:cursor-pointer file:hover:bg-slate-200 transition-all"
                                                                                        />
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <div className="flex justify-end pt-5 border-t border-slate-150">
                                                    <button
                                                        type="submit"
                                                        className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-3 text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:opacity-95 active:translate-y-px transition-all"
                                                    >
                                                        Simpan Merchandise
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 5: Attendees List */}
                            {activeTab === 'attendees' && (
                                <div className="space-y-6">
                                    <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                                        <div>
                                            <h4 className="text-xl font-black uppercase flex items-center gap-2">
                                                <Users className="h-6 w-6 text-cyan-500" />
                                                Registered Attendees List
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-1">Review registration details, confirm manual transfer receipts, and check-in guests.</p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="relative">
                                                <select
                                                    value={paymentFilter}
                                                    onChange={(e) => setPaymentFilter(e.target.value)}
                                                    className="border border-slate-200 py-2.5 pl-3 pr-9 text-xs font-bold rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer bg-white text-slate-800"
                                                >
                                                    <option value="all">Semua Status</option>
                                                    <option value="paid">Paid</option>
                                                    <option value="pending">Pending</option>
                                                    <option value="failed">Failed</option>
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-450" />
                                                <input 
                                                    type="text" 
                                                    value={searchTerm}
                                                    onChange={e => setSearchTerm(e.target.value)}
                                                    placeholder="Cari kode tiket / nama..."
                                                    className="border border-slate-200 pl-9 pr-4 py-2.5 text-xs font-bold rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-full md:w-auto text-slate-800"
                                                />
                                            </div>
                                            <button
                                                onClick={exportToExcel}
                                                className="bg-emerald-500 text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:opacity-95 active:translate-y-px transition-all flex items-center gap-2"
                                            >
                                                <FileText className="h-4 w-4" />
                                                Export Excel
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Attendees Card Grid */}
                                    {attendees.filter(att => {
                                        let name = att.registration_data?.fullname || '';
                                        if (!name) {
                                            const nameKey = Object.keys(att.registration_data || {}).find(k => k.toLowerCase().includes('nama') || k.toLowerCase().includes('name'));
                                            if (nameKey) name = String(att.registration_data[nameKey]);
                                        }
                                        const code = att.ticket_code || '';
                                        const uCode = att.registration_data?.unique_code ? String(att.registration_data.unique_code) : '';
                                        const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                                              code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                              uCode.includes(searchTerm);
                                        const matchesPayment = paymentFilter === 'all' || att.payment_status === paymentFilter;
                                        return matchesSearch && matchesPayment;
                                    }).length === 0 ? (
                                        <div className="border border-dashed border-slate-200 p-12 text-center bg-slate-50/50 rounded-2xl">
                                            <AlertCircle className="h-12 w-12 text-slate-405 mx-auto mb-2" />
                                            <p className="font-bold text-slate-700">Tidak ada peserta yang ditemukan</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {attendees
                                                .filter(att => {
                                                    let name = att.registration_data?.fullname || '';
                                                    if (!name) {
                                                        const nameKey = Object.keys(att.registration_data || {}).find(k => k.toLowerCase().includes('nama') || k.toLowerCase().includes('name'));
                                                        if (nameKey) name = String(att.registration_data[nameKey]);
                                                    }
                                                    const code = att.ticket_code || '';
                                                    const uCode = att.registration_data?.unique_code ? String(att.registration_data.unique_code) : '';
                                                    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                                                          code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                                          uCode.includes(searchTerm);
                                                    const matchesPayment = paymentFilter === 'all' || att.payment_status === paymentFilter;
                                                    return matchesSearch && matchesPayment;
                                                })
                                                .map(att => {
                                                    const hasProof = !!att.payment_proof_path;
                                                    const isPaid = att.payment_status === 'paid';
                                                    
                                                    let displayFullName = att.registration_data?.fullname;
                                                    if (!displayFullName) {
                                                        const nameKey = Object.keys(att.registration_data || {}).find(k => k.toLowerCase().includes('nama') || k.toLowerCase().includes('name'));
                                                        if (nameKey) displayFullName = att.registration_data[nameKey];
                                                    }
                                                    displayFullName = displayFullName || 'Peserta';

                                                    let displayPhone = att.registration_data?.whatsapp;
                                                    if (!displayPhone) {
                                                        const phoneKey = Object.keys(att.registration_data || {}).find(k => 
                                                            k.toLowerCase().includes('whatsapp') || 
                                                            k.toLowerCase().includes('wa') || 
                                                            k.toLowerCase().includes('telp') || 
                                                            k.toLowerCase().includes('phone') || 
                                                            k.toLowerCase().includes('hp')
                                                        );
                                                        if (phoneKey) displayPhone = att.registration_data[phoneKey];
                                                    }
                                                    displayPhone = displayPhone || '-';
                                                    
                                                    return (
                                                        <div 
                                                            key={att.id} 
                                                            className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all relative flex flex-col h-full"
                                                        >
                                                            <div className="flex-1 flex flex-col">
                                                                {/* Card Header */}
                                                                <div className="flex justify-between items-start gap-2 border-b border-dashed border-slate-200 pb-3.5 mb-4">
                                                                    <div>
                                                                        <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg text-xs font-black uppercase">
                                                                            {att.ticket_code}
                                                                        </span>
                                                                        <div className="text-[10px] text-slate-450 font-bold mt-2.5 uppercase">
                                                                            {att.form?.title || 'Zawawalk'}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-wrap justify-end gap-1.5 max-w-[60%]">
                                                                        <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${
                                                                            isPaid ? 'bg-emerald-50 text-emerald-700' : att.payment_status === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                                                                        }`}>
                                                                            {att.payment_status}
                                                                        </span>
                                                                        <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase bg-cyan-50 text-cyan-700`}>
                                                                            {att.registration_data?.attendance_mode || 'OFFLINE'}
                                                                        </span>
                                                                        <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${
                                                                            att.checked_in ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                                                                        }`}>
                                                                            {att.checked_in ? 'Checked In' : 'Belum Hadir'}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Card Body */}
                                                                <div className="space-y-4 text-xs flex-1">
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <div>
                                                                            <label className="block text-[9px] font-black uppercase text-slate-400">Nama Lengkap</label>
                                                                            <span className="font-black text-sm text-slate-800">{displayFullName}</span>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-[9px] font-black uppercase text-slate-400">WhatsApp / Phone</label>
                                                                            <span className="font-bold text-slate-700">{displayPhone}</span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Dynamic fields schema content */}
                                                                    <div className="border border-slate-100 bg-slate-50/50 p-3.5 rounded-xl space-y-1.5 shadow-inner">
                                                                        <span className="block text-[8px] font-black text-slate-400 uppercase border-b border-slate-150 pb-1 mb-2">Rincian Form Pendaftaran</span>
                                                                        {Object.entries(att.registration_data || {}).map(([key, val]) => {
                                                                            if (['fullname', 'whatsapp', 'attendance_mode', 'ticket_price', 'total_price', 'merchandise_total', 'donation_amount', 'selected_merchandise', 'snap_token', 'snap_redirect_url', 'additional_fees', 'additional_fees_breakdown', 'unique_code', 'discount_amount', 'voucher_code', 'voucher_type', 'voucher_value'].includes(key)) return null;
                                                                            if (val === null || val === undefined || val === '' || String(val).toLowerCase() === 'null') return null;
                                                                            if (typeof val === 'string' && val.startsWith('/storage/')) {
                                                                                return (
                                                                                    <div key={key} className="text-[10px] font-bold">
                                                                                        <span className="text-slate-405 uppercase text-[8px] mr-1">{key}:</span>
                                                                                        <a href={val} target="_blank" rel="noreferrer" className="underline text-indigo-600 font-black">Lihat File</a>
                                                                                    </div>
                                                                                );
                                                                            }
                                                                            return (
                                                                                <div key={key} className="text-[10px] font-bold text-slate-750">
                                                                                    <span className="text-slate-405 uppercase text-[8px] mr-1">{key}:</span> {String(val)}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                        {att.signature_path && (
                                                                            <div className="text-[10px] font-bold">
                                                                                <span className="text-slate-405 uppercase text-[8px] mr-1">Tanda Tangan:</span>
                                                                                <a href={att.signature_path} target="_blank" rel="noreferrer" className="underline text-indigo-600 font-black">Lihat</a>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Merchandise info */}
                                                                    {att.registration_data?.selected_merchandise && Object.keys(att.registration_data.selected_merchandise).length > 0 && (
                                                                        <div className="bg-rose-50/55 border border-rose-100 p-3.5 rounded-xl">
                                                                            <span className="block text-[8px] font-black text-rose-700 uppercase mb-1.5">🛍️ MERCHANDISE</span>
                                                                            {Object.entries(att.registration_data.selected_merchandise).map(([k, item]: [string, any]) => (
                                                                                <div key={k} className="text-[9px] font-bold text-slate-700 leading-relaxed border-b border-rose-100 last:border-0 py-0.5">
                                                                                    • {item.name} {item.size ? `(${item.size}${item.nickname ? `, Nama: ${item.nickname}` : ''})` : ''} - Rp {parseFloat(item.price).toLocaleString('id-ID')}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    {/* Additional Fees info */}
                                                                    {att.registration_data?.additional_fees_breakdown && att.registration_data.additional_fees_breakdown.length > 0 && (
                                                                        <div className="bg-indigo-50/55 border border-indigo-100 p-3.5 rounded-xl mt-2">
                                                                            <span className="block text-[8px] font-black text-indigo-700 uppercase mb-1.5">💵 BIAYA TAMBAHAN</span>
                                                                            {att.registration_data.additional_fees_breakdown.map((fee: any, idx: number) => (
                                                                                <div key={idx} className="flex justify-between text-[9px] font-bold text-slate-700 leading-relaxed border-b border-indigo-100 last:border-0 py-0.5">
                                                                                    <span>• {fee.name}</span>
                                                                                    <span>Rp {parseFloat(fee.calculated).toLocaleString('id-ID')}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}

                                                                    {/* Voucher info */}
                                                                    {att.registration_data?.voucher_code && (
                                                                        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex justify-between items-center mt-2">
                                                                            <div>
                                                                                <span className="block text-[8px] font-black text-emerald-700 uppercase">🎟️ VOUCHER</span>
                                                                                <span className="font-bold text-[10px] text-slate-700 font-mono">{att.registration_data.voucher_code}</span>
                                                                            </div>
                                                                            <span className="font-black text-xs text-emerald-700">- Rp {(parseFloat(att.registration_data.discount_amount) || 0).toLocaleString('id-ID')}</span>
                                                                        </div>
                                                                    )}

                                                                    {/* Total Price & Payments info */}
                                                                    <div className="flex justify-between items-center bg-amber-50/45 border border-amber-100 p-3.5 rounded-xl mt-2">
                                                                        <div>
                                                                            <span className="text-[10px] font-black uppercase text-slate-500 block">Total Bayar:</span>
                                                                            {att.registration_data?.unique_code && att.payment_method === 'manual' && (
                                                                                <span className="text-[9px] text-rose-600 font-bold block">(Termasuk Kode Unik: +{att.registration_data.unique_code})</span>
                                                                            )}
                                                                        </div>
                                                                        <span className="font-black text-sm text-slate-800">Rp {parseFloat(att.registration_data?.total_price || 0).toLocaleString('id-ID')}</span>
                                                                    </div>

                                                                    {hasProof && (
                                                                        <div className="mt-2 text-right">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setSelectedProofUrl(att.payment_proof_path)}
                                                                                className="text-[10px] font-black text-indigo-650 hover:text-indigo-850 underline uppercase"
                                                                            >
                                                                                Lihat Bukti Transfer
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Card Actions Footer */}
                                                            {isAdmin ? (
                                                                <div className="mt-5 pt-4 border-t border-dashed border-slate-150 flex flex-wrap gap-2 justify-end">
                                                                    {att.payment_status === 'pending' && (
                                                                        <>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleVerifyPayment(att.id, 'paid')}
                                                                                className="bg-emerald-50 border border-emerald-250 text-emerald-700 hover:bg-emerald-100 px-3.5 py-2 text-[10px] font-bold uppercase rounded-lg transition-colors"
                                                                            >
                                                                                Verify Paid
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleVerifyPayment(att.id, 'failed')}
                                                                                className="bg-rose-50 border border-rose-250 text-rose-700 hover:bg-rose-100 px-3.5 py-2 text-[10px] font-bold uppercase rounded-lg transition-colors"
                                                                            >
                                                                                Mark Failed
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                    {att.payment_status === 'failed' && (
                                                                        <>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleVerifyPayment(att.id, 'paid')}
                                                                                className="bg-emerald-50 border border-emerald-250 text-emerald-700 hover:bg-emerald-100 px-3.5 py-2 text-[10px] font-bold uppercase rounded-lg transition-colors"
                                                                            >
                                                                                Verify Paid
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleVerifyPayment(att.id, 'pending')}
                                                                                className="bg-amber-50 border border-amber-250 text-amber-700 hover:bg-amber-100 px-3.5 py-2 text-[10px] font-bold uppercase rounded-lg transition-colors"
                                                                            >
                                                                                Mark Pending
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                    {att.payment_status === 'paid' && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleVerifyPayment(att.id, 'pending')}
                                                                            className="bg-orange-50 border border-orange-250 text-orange-700 hover:bg-orange-100 px-3.5 py-2 text-[10px] font-bold uppercase rounded-lg transition-colors"
                                                                        >
                                                                            Mark Pending
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleToggleCheckIn(att.id)}
                                                                        className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3.5 py-2 text-[10px] font-bold uppercase rounded-lg transition-colors"
                                                                    >
                                                                        {att.checked_in ? 'Batalkan Racepack' : 'Serahkan Racepack'}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleSendTicket(att.id)}
                                                                        disabled={!isPaid}
                                                                        className={`px-3.5 py-2 text-[10px] font-bold uppercase rounded-lg border transition-colors ${
                                                                            isPaid ? 'bg-pink-50 border-pink-100 text-pink-700 hover:bg-pink-100 cursor-pointer' : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                                                                        }`}
                                                                    >
                                                                        Kirim E-Tiket
                                                                    </button>
                                                                    <a
                                                                        href={`https://wa.me/${(() => {
                                                                            const clean = displayPhone.replace(/\D/g, '');
                                                                            return clean.startsWith('0') ? '62' + clean.slice(1) : clean;
                                                                        })()}?text=${encodeURIComponent(`Halo ${displayFullName}, berikut adalah link E-Tiket resmi pendaftaran reuni Anda: ${route('event.success', att.ticket_code)}`)}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="bg-cyan-50 border border-cyan-150 text-cyan-700 hover:bg-cyan-100 px-3.5 py-2 text-[10px] font-bold uppercase rounded-lg transition-colors inline-flex items-center"
                                                                    >
                                                                        Kirim WA Manual
                                                                    </a>
                                                                </div>
                                                            ) : (
                                                                <div className="mt-5 pt-4 border-t border-dashed border-slate-150 flex flex-wrap gap-2 justify-end">
                                                                    <span className="text-[10px] text-slate-400 font-bold uppercase py-2">
                                                                        Read-Only Mode (Staff)
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 6: Scanner Check-In (Racepack Pick-Up) */}
                            {activeTab === 'checkin' && (
                                <div className="space-y-8 max-w-xl mx-auto">
                                    <div className="border-b border-slate-100 pb-4 text-center">
                                        <h4 className="text-2xl font-black uppercase flex items-center justify-center gap-2">
                                            <Camera className="h-7 w-7 text-pink-500" />
                                            Zawawalk Racepack Desk
                                        </h4>
                                        <p className="text-xs text-gray-500 mt-1">Place handheld scanner or scan QR code using laptop/tablet camera.</p>
                                    </div>

                                    {/* Scanner input card */}
                                    <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                                        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                                            <h5 className="font-black text-sm uppercase text-slate-800">Pilih Mode Pemindai</h5>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setUseCamera(false)}
                                                    className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${!useCamera ? 'bg-pink-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                                                >
                                                    🔫 Handheld
                                                </button>
                                                <button
                                                    onClick={() => setUseCamera(true)}
                                                    className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${useCamera ? 'bg-pink-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                                                >
                                                    📷 Kamera
                                                </button>
                                            </div>
                                        </div>

                                        {useCamera ? (
                                            <div className="space-y-4">
                                                <h5 className="font-black text-xs uppercase text-center text-pink-600">Arahkan QR Code ke Kamera</h5>
                                                <div className="border border-slate-250 bg-white p-3 rounded-2xl shadow-sm">
                                                    <div id="reader" className="w-full"></div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 pt-2">
                                                <h5 className="font-black text-sm uppercase text-center text-slate-700">Scan Barcode / Input Kode Tiket</h5>
                                                
                                                <div className="flex justify-center">
                                                    <div className="border border-slate-150 p-4 bg-slate-50/50 flex items-center justify-center w-28 h-28 rounded-2xl">
                                                        <Camera className="h-12 w-12 text-slate-400 animate-pulse" />
                                                    </div>
                                                </div>

                                                <form onSubmit={handleScanSubmit} className="space-y-3">
                                                    <input 
                                                        ref={scanInputRef}
                                                        type="text" 
                                                        value={scanInput}
                                                        onChange={e => setScanInput(e.target.value)}
                                                        placeholder="Scan ticket code here..."
                                                        className="w-full border border-slate-200 p-4 font-black text-center text-xl bg-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
                                                        autoFocus
                                                    />
                                                    <span className="text-[10px] text-slate-400 font-bold block text-center">
                                                        (Handheld scanner input focuses automatically. Simply trigger the laser barcode scanner).
                                                    </span>
                                                    <button
                                                        type="submit"
                                                        className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold uppercase p-3.5 rounded-xl shadow-md hover:opacity-95 active:translate-y-px transition-all"
                                                    >
                                                        Konfirmasi Penyerahan Racepack
                                                    </button>
                                                </form>
                                            </div>
                                        )}
                                    </div>

                                    {/* Scan result display */}
                                    {scanResult && (
                                        <div id="scan-result-card" className={`border p-6 rounded-2xl shadow-md text-center space-y-2.5 transition-all ${
                                            scanResult.success ? 'bg-emerald-50 border-emerald-150' : 'bg-rose-50 border-rose-150'
                                        }`}>
                                            <h4 className={`text-xl font-black uppercase ${scanResult.success ? 'text-emerald-800' : 'text-rose-800'}`}>
                                                {scanResult.success ? '✓ PENYERAHAN BERHASIL!' : '✗ PENYERAHAN GAGAL!'}
                                            </h4>
                                            <p className={`text-sm font-bold ${scanResult.success ? 'text-emerald-700' : 'text-rose-700'}`}>{scanResult.message}</p>
                                            
                                            {scanResult.name && (
                                                <div className="bg-white border border-slate-100 p-4 rounded-xl inline-block mt-3 text-left min-w-[220px] shadow-sm">
                                                    <p className="text-[9px] uppercase tracking-wider text-slate-400">Peserta</p>
                                                    <p className="text-xs font-black text-slate-800">{scanResult.name}</p>
                                                    <p className="text-[9px] uppercase tracking-wider text-slate-400 mt-2.5">Kode Tiket</p>
                                                    <p className="text-xs font-black text-slate-800">{scanResult.code}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Scanned attendees list */}
                                    <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0px_#000] space-y-4">
                                        <div className="border-b-2 border-black pb-2 flex justify-between items-center">
                                            <h5 className="font-black text-xs uppercase text-slate-800 flex items-center gap-1.5">
                                                <span>📋</span>
                                                Daftar Ticket Di-Scan ({
                                                    attendees.filter(att => {
                                                        if (!att.checked_in) return false;
                                                        if (auth.user.role === 'admin') return true;
                                                        return att.checked_in_by === auth.user.id;
                                                    }).length
                                                })
                                            </h5>
                                            <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-500 font-extrabold uppercase px-2 py-0.5 rounded">
                                                {auth.user.role === 'admin' ? 'Semua Staff' : 'Oleh Saya'}
                                            </span>
                                        </div>

                                        <div className="overflow-y-auto max-h-80 space-y-2.5">
                                            {(() => {
                                                const scannedList = attendees
                                                    .filter(att => {
                                                        if (!att.checked_in) return false;
                                                        if (auth.user.role === 'admin') return true;
                                                        return att.checked_in_by === auth.user.id;
                                                    })
                                                    .sort((a, b) => {
                                                        const timeA = a.checked_in_at ? new Date(a.checked_in_at).getTime() : 0;
                                                        const timeB = b.checked_in_at ? new Date(b.checked_in_at).getTime() : 0;
                                                        return timeB - timeA;
                                                    });

                                                if (scannedList.length === 0) {
                                                    return <p className="text-xs text-slate-400 italic text-center py-4">Belum ada tiket yang berhasil di-scan.</p>;
                                                }

                                                return scannedList.map((att, idx) => {
                                                    const data = att.registration_data || {};
                                                    let name = data.fullname;
                                                    if (!name) {
                                                        const nameKey = Object.keys(data).find(k => k.toLowerCase().includes('nama') || k.toLowerCase().includes('name'));
                                                        if (nameKey) name = data[nameKey];
                                                    }
                                                    name = name || 'Peserta';

                                                    const isLatest = idx === 0;

                                                    // Extract fields to display
                                                    const excludeKeys = [
                                                        'fullname', 'whatsapp', 'email', 'total_price', 'unique_code', 
                                                        'ticket_price', 'merchandise_total', 'donation_amount', 'attendance_mode', 
                                                        'selected_merchandise', 'payment_method', 'payment_status', 'checked_in', 
                                                        'checked_in_at', 'checked_in_by'
                                                    ];

                                                    const customFields = Object.entries(data)
                                                        .filter(([key]) => !excludeKeys.includes(key) && !key.startsWith('merch_'))
                                                        .map(([key, val]) => {
                                                            const label = key.replace(/_/g, ' ').toUpperCase();
                                                            return (
                                                                <span key={key} className={`px-2 py-0.5 rounded text-[8px] font-black border block sm:inline-block mr-1 mt-1 ${
                                                                    isLatest 
                                                                        ? 'bg-rose-100/60 text-rose-800 border-rose-200' 
                                                                        : 'bg-slate-100 text-slate-500 border-slate-200'
                                                                }`}>
                                                                    {label}: {String(val)}
                                                                </span>
                                                            );
                                                        });

                                                    const merchFields: any[] = [];
                                                    if (data.selected_merchandise) {
                                                        Object.entries(data.selected_merchandise).forEach(([mKey, mVal]: [string, any]) => {
                                                            if (mVal.size) {
                                                                merchFields.push(
                                                                    <span key={`merch-${mKey}`} className={`px-2 py-0.5 rounded text-[8px] font-black border block sm:inline-block mr-1 mt-1 ${
                                                                        isLatest 
                                                                            ? 'bg-orange-100/70 text-orange-850 border-orange-200' 
                                                                            : 'bg-orange-50 text-orange-700 border-orange-100'
                                                                    }`}>
                                                                        📦 {mVal.name}: {mVal.size} {mVal.nickname ? `("${mVal.nickname}")` : ''}
                                                                    </span>
                                                                );
                                                            }
                                                        });
                                                    }

                                                    return (
                                                        <div 
                                                            key={att.id} 
                                                            className={`flex flex-col sm:flex-row sm:items-center justify-between border-2 p-3 rounded-xl text-xs font-bold transition-all ${
                                                                isLatest 
                                                                    ? 'bg-rose-50 border-rose-400 animate-fadeIn' 
                                                                    : 'bg-slate-50/50 border-slate-200'
                                                            }`}
                                                        >
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] font-black border ${
                                                                        isLatest ? 'bg-rose-600 text-white border-black' : 'bg-slate-200 text-slate-800 border-slate-300'
                                                                    }`}>
                                                                        {att.ticket_code}
                                                                    </span>
                                                                    <span className={`truncate ${isLatest ? 'text-rose-955 font-black text-sm' : 'text-slate-850 font-bold'}`}>
                                                                        {name}
                                                                    </span>
                                                                    {isLatest && (
                                                                        <span className="bg-rose-600 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-black animate-pulse">
                                                                            ⚡ TERBARU
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                
                                                                {/* Custom details */}
                                                                <div className="flex flex-wrap items-center mt-1.5">
                                                                    {customFields}
                                                                    {merchFields}
                                                                </div>

                                                                {auth.user.role === 'admin' && att.checked_in_by_user && (
                                                                    <span className={`text-[9px] block mt-1.5 ${isLatest ? 'text-rose-700' : 'text-indigo-650'}`}>
                                                                        Di-scan oleh: <b className="uppercase">{att.checked_in_by_user.name}</b>
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className={`text-[10px] font-extrabold shrink-0 mt-2 sm:mt-0 sm:pl-3 text-right ${isLatest ? 'text-rose-600' : 'text-slate-400'}`}>
                                                                {att.checked_in_at ? new Date(att.checked_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                                                            </span>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 7: Report */}
                            {activeTab === 'report' && (
                                <div className="space-y-6">
                                    <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                                        <div>
                                            <h4 className="text-xl font-black uppercase flex items-center gap-2">
                                                <TrendingUp className="h-6 w-6 text-emerald-500" />
                                                Real-Time Revenue Report
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-1">Laporan pendapatan ini dihitung secara real-time khusus untuk peserta yang berstatus <b>PAID</b> (Lunas).</p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full md:w-auto">
                                            <button
                                                onClick={copyLiveCheckInLink}
                                                className="bg-cyan-50 border border-cyan-150 text-cyan-700 hover:bg-cyan-100 px-4 py-2.5 text-xs font-bold uppercase rounded-xl transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                                            >
                                                {copyLiveSuccess ? (
                                                    <>
                                                        <Check className="h-4 w-4 text-emerald-600" />
                                                        Copied!
                                                    </>
                                                ) : (
                                                    <>
                                                        <Monitor className="h-4 w-4" />
                                                        Live Racepack Link
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                onClick={copyPublicReportLink}
                                                className="bg-amber-50 border border-amber-150 text-amber-700 hover:bg-amber-100 px-4 py-2.5 text-xs font-bold uppercase rounded-xl transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                                            >
                                                {copySuccess ? (
                                                    <>
                                                        <Check className="h-4 w-4 text-emerald-600" />
                                                        Copied!
                                                    </>
                                                ) : (
                                                    <>
                                                        <LinkIcon className="h-4 w-4" />
                                                        Share Link
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                onClick={exportReportToExcel}
                                                className="bg-emerald-500 text-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                                            >
                                                <FileText className="h-4 w-4" />
                                                Export Report Excel
                                            </button>
                                        </div>
                                    </div>

                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="bg-gradient-to-br from-amber-500 to-orange-500 text-white p-5 rounded-2xl shadow-sm">
                                            <div className="flex items-center gap-2 text-white/80 mb-2.5">
                                                <Wallet className="h-5 w-5" />
                                                <h5 className="font-black text-xs uppercase tracking-wider">Total Revenue</h5>
                                            </div>
                                            <p className="text-2xl font-black">Rp {reportData.totalRevenue.toLocaleString('id-ID')}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white p-5 rounded-2xl shadow-sm">
                                            <div className="flex items-center gap-2 text-white/80 mb-2.5">
                                                <Users className="h-5 w-5" />
                                                <h5 className="font-black text-xs uppercase tracking-wider">Ticket Sales</h5>
                                            </div>
                                            <p className="text-2xl font-black">Rp {reportData.ticketRevenue.toLocaleString('id-ID')}</p>
                                            <p className="text-[10px] font-bold mt-1.5 text-white/70">{reportData.validAttendees.length} Tiket Terjual</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-pink-500 to-rose-500 text-white p-5 rounded-2xl shadow-sm">
                                            <div className="flex items-center gap-2 text-white/80 mb-2.5">
                                                <Package className="h-5 w-5" />
                                                <h5 className="font-black text-xs uppercase tracking-wider">Merchandise</h5>
                                            </div>
                                            <p className="text-2xl font-black">Rp {reportData.merchRevenue.toLocaleString('id-ID')}</p>
                                            
                                            {Object.keys(reportData.merchBreakdown).length > 0 && (
                                                <div className="border-t border-white/20 pt-2 space-y-1 mt-2">
                                                    {Object.entries(reportData.merchBreakdown).map(([name, stats]: [string, any]) => (
                                                        <div key={name} className="flex justify-between items-center text-[10px] font-bold text-white/95">
                                                            <span>{stats.count}x {name}</span>
                                                            <span>Rp {stats.revenue.toLocaleString('id-ID')}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white p-5 rounded-2xl shadow-sm">
                                            <div className="flex items-center gap-2 text-white/80 mb-2.5">
                                                <Gift className="h-5 w-5" />
                                                <h5 className="font-black text-xs uppercase tracking-wider">Donations</h5>
                                            </div>
                                            <p className="text-2xl font-black">Rp {reportData.donationRevenue.toLocaleString('id-ID')}</p>
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex justify-between items-center">
                                            <span className="text-[10px] font-black uppercase text-slate-500">Offline Attendees</span>
                                            <span className="font-black text-slate-800">{reportData.offlineCount}</span>
                                        </div>
                                        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex justify-between items-center">
                                            <span className="text-[10px] font-black uppercase text-slate-500">Online Attendees</span>
                                            <span className="font-black text-slate-800">{reportData.onlineCount}</span>
                                        </div>
                                        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex justify-between items-center">
                                            <span className="text-[10px] font-black uppercase text-slate-500">Total Racepack Diambil</span>
                                            <span className="font-black text-slate-800">{reportData.checkedInCount} / {reportData.validAttendees.length}</span>
                                        </div>
                                    </div>

                                    {/* Report Sub-Tabs */}
                                    <div className="flex border-b border-slate-200 mt-6 w-fit bg-slate-50 rounded-xl p-1">
                                        <button 
                                            onClick={() => setReportTab('revenue')}
                                            className={`px-4 py-2 font-bold text-xs uppercase rounded-lg transition-all ${reportTab === 'revenue' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            Detailed Revenue
                                        </button>
                                        <button 
                                            onClick={() => setReportTab('checkin')}
                                            className={`px-4 py-2 font-bold text-xs uppercase rounded-lg transition-all ${reportTab === 'checkin' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            Status Racepack
                                        </button>
                                    </div>

                                    {/* Detailed Breakdown Table */}
                                    {reportTab === 'revenue' && (
                                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden mt-4">
                                        <div className="bg-slate-800 text-white p-4">
                                            <h5 className="font-black text-sm uppercase">Detailed Participant Breakdown (Paid Only)</h5>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                                                        <th className="p-3 border-r border-slate-100">Kode / Peserta</th>
                                                        <th className="p-3 border-r border-slate-100">Tiket</th>
                                                        <th className="p-3 border-r border-slate-100">Merchandise</th>
                                                        <th className="p-3 border-r border-slate-100">Donasi</th>
                                                        <th className="p-3 bg-amber-50/40">Total Bayar</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {reportData.validAttendees.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={5} className="p-6 text-center font-bold text-slate-500 text-xs">Belum ada peserta yang lunas.</td>
                                                        </tr>
                                                    ) : (
                                                        reportData.validAttendees.map(att => {
                                                            const data = att.registration_data || {};
                                                            
                                                            let name = data.fullname;
                                                            if (!name) {
                                                                const nameKey = Object.keys(data).find(k => k.toLowerCase().includes('nama') || k.toLowerCase().includes('name'));
                                                                if (nameKey) name = data[nameKey];
                                                            }
                                                            name = name || 'Peserta';

                                                            const ticket = parseFloat(data.ticket_price) || 0;
                                                            const donation = parseFloat(data.donation_amount) || 0;
                                                            const total = parseFloat(data.total_price) || 0;
                                                            
                                                            let merchTotal = 0;
                                                            let merchDetails: React.ReactNode[] = [];
                                                            
                                                            if (data.selected_merchandise) {
                                                                Object.values(data.selected_merchandise).forEach((m: any, idx: number) => {
                                                                    const price = parseFloat(m.price) || 0;
                                                                    merchTotal += price;
                                                                    
                                                                    let detailText = m.name;
                                                                    if (m.size) detailText += ` (Size: ${m.size})`;
                                                                    
                                                                    merchDetails.push(
                                                                        <div key={idx} className="flex justify-between items-center text-[10px] mt-1 first:mt-0 text-slate-655">
                                                                            <span>- {detailText}</span>
                                                                            <span>Rp {price.toLocaleString('id-ID')}</span>
                                                                        </div>
                                                                    );
                                                                });
                                                            }

                                                            return (
                                                                <tr key={att.id} className="border-b border-slate-100 hover:bg-slate-50/30 text-xs font-bold transition-colors align-top text-slate-700">
                                                                    <td className="p-3 border-r border-slate-100">
                                                                        <span className="block text-[9px] text-slate-400 uppercase">{att.ticket_code}</span>
                                                                        <span className="text-slate-800">{name}</span>
                                                                    </td>
                                                                    <td className="p-3 border-r border-slate-100">Rp {ticket.toLocaleString('id-ID')}</td>
                                                                    <td className="p-3 border-r border-slate-100">
                                                                        {merchDetails.length > 0 ? (
                                                                            <div className="space-y-1">
                                                                                {merchDetails}
                                                                                <div className="border-t border-slate-150 pt-1 mt-1 font-black flex justify-between items-center text-slate-800">
                                                                                    <span>Total:</span>
                                                                                    <span>Rp {merchTotal.toLocaleString('id-ID')}</span>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-slate-400 font-normal">-</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-3 border-r border-slate-100">Rp {donation.toLocaleString('id-ID')}</td>
                                                                    <td className="p-3 bg-amber-50/20">Rp {total.toLocaleString('id-ID')}</td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                                {reportData.validAttendees.length > 0 && (
                                                    <tfoot>
                                                        <tr className="bg-slate-850 text-white text-xs uppercase font-black">
                                                            <td colSpan={4} className="p-3 text-right">Grand Total Revenue:</td>
                                                            <td className="p-3 bg-amber-500 text-white">Rp {reportData.totalRevenue.toLocaleString('id-ID')}</td>
                                                        </tr>
                                                    </tfoot>
                                                )}
                                            </table>
                                        </div>
                                    </div>
                                    )}

                                    {/* Check-In Status Table */}
                                    {reportTab === 'checkin' && (
                                        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden mt-4">
                                            <div className="bg-slate-800 text-white p-4">
                                                <h5 className="font-black text-sm uppercase">Status Pengambilan Racepack (Semua Peserta)</h5>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                                                            <th className="p-3 border-r border-slate-100">Kode Tiket</th>
                                                            <th className="p-3 border-r border-slate-100">Peserta</th>
                                                            <th className="p-3 border-r border-slate-100">Status Pembayaran</th>
                                                            <th className="p-3">Status Racepack</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {attendees.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={4} className="p-6 text-center font-bold text-slate-500 text-xs">Belum ada pendaftar.</td>
                                                            </tr>
                                                        ) : (
                                                            attendees.map(att => {
                                                                const data = att.registration_data || {};
                                                                let name = data.fullname;
                                                                if (!name) {
                                                                    const nameKey = Object.keys(data).find(k => k.toLowerCase().includes('nama') || k.toLowerCase().includes('name'));
                                                                    if (nameKey) name = data[nameKey];
                                                                }
                                                                name = name || 'Peserta';

                                                                return (
                                                                    <tr key={att.id} className="border-b border-slate-100 hover:bg-slate-50/30 text-xs font-bold transition-colors text-slate-700">
                                                                        <td className="p-3 border-r border-slate-100 whitespace-nowrap">
                                                                            <span className="text-slate-800 uppercase font-mono">{att.ticket_code}</span>
                                                                        </td>
                                                                        <td className="p-3 border-r border-slate-100 whitespace-nowrap">
                                                                            {name}
                                                                        </td>
                                                                        <td className="p-3 border-r border-slate-100 whitespace-nowrap">
                                                                            {att.payment_status === 'paid' ? (
                                                                                <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 uppercase text-[10px] rounded-lg border border-emerald-100">Lunas</span>
                                                                            ) : att.payment_status === 'pending' ? (
                                                                                <span className="bg-amber-50 text-amber-700 px-2.5 py-1 uppercase text-[10px] rounded-lg border border-amber-100">Pending</span>
                                                                            ) : (
                                                                                <span className="bg-rose-50 text-rose-700 px-2.5 py-1 uppercase text-[10px] rounded-lg border border-rose-100">{att.payment_status}</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="p-3 whitespace-nowrap">
                                                                            {att.checked_in ? (
                                                                                <div>
                                                                                    <span className="bg-cyan-50 text-cyan-700 px-2.5 py-1 uppercase text-[10px] rounded-lg border border-cyan-100 inline-block mb-1">Sudah Diambil</span>
                                                                                    <span className="text-[9px] text-slate-450 block">{new Date(att.checked_in_at!).toLocaleString('id-ID')}</span>
                                                                                </div>
                                                                            ) : (
                                                                                <span className="bg-slate-50 text-slate-500 px-2.5 py-1 uppercase text-[10px] rounded-lg border border-slate-150">Belum Diambil</span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 8: SEO & Meta Tags */}
                            {activeTab === 'seo' && (
                                <form onSubmit={handleSaveSettings} className="space-y-6">
                                    <div className="border-b border-slate-100 pb-4">
                                        <h4 className="text-xl font-black uppercase flex items-center gap-2">
                                            <Sparkles className="h-6 w-6 text-indigo-500" />
                                            SEO & Meta Tags Configuration
                                        </h4>
                                        <p className="text-xs text-gray-500 mt-1">Sesuaikan informasi meta tag dan Open Graph (OG) secara dinamis untuk meningkatkan visibilitas mesin pencari dan tampilan saat dibagikan ke media sosial.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Meta Tags */}
                                        <div className="space-y-4 bg-white border border-slate-100 p-6 rounded-2xl shadow-xl shadow-slate-100/35">
                                            <h3 className="text-sm font-black uppercase border-b border-slate-100 pb-2">🌐 Standard Meta Tags</h3>
                                            
                                            <div className="space-y-1">
                                                <label className="block text-[10px] font-black uppercase">Meta Description</label>
                                                <textarea 
                                                    value={data.meta_description}
                                                    onChange={e => setData('meta_description', e.target.value)}
                                                    placeholder="Deskripsi singkat tentang event untuk hasil pencarian Google"
                                                    rows={4}
                                                    className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="block text-[10px] font-black uppercase">Meta Keywords</label>
                                                <input 
                                                    type="text"
                                                    value={data.meta_keywords}
                                                    onChange={e => setData('meta_keywords', e.target.value)}
                                                    placeholder="contoh: zawawalk, fun walk, festival, tiket online"
                                                    className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                />
                                                <span className="text-[9px] text-gray-400">Pisahkan setiap kata kunci dengan tanda koma.</span>
                                            </div>
                                        </div>

                                        {/* Open Graph Tags */}
                                        <div className="space-y-4 bg-white border border-slate-100 p-6 rounded-2xl shadow-xl shadow-slate-100/35">
                                            <h3 className="text-sm font-black uppercase border-b border-slate-100 pb-2">📱 Open Graph / Social Sharing</h3>

                                            <div className="space-y-1">
                                                <label className="block text-[10px] font-black uppercase">OG Title</label>
                                                <input 
                                                    type="text"
                                                    value={data.og_title}
                                                    onChange={e => setData('og_title', e.target.value)}
                                                    placeholder="Judul yang tampil saat dibagikan ke medsos"
                                                    className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="block text-[10px] font-black uppercase">OG Description</label>
                                                <textarea 
                                                    value={data.og_description}
                                                    onChange={e => setData('og_description', e.target.value)}
                                                    placeholder="Deskripsi singkat yang tampil saat dibagikan ke medsos"
                                                    rows={3}
                                                    className="w-full border border-slate-200 p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold text-slate-800"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* OG Image Upload */}
                                    <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xl shadow-slate-100/35">
                                        <h3 className="text-sm font-black uppercase border-b border-slate-100 pb-2">🖼️ Open Graph Image (OG Image)</h3>
                                        <div className="mt-4 flex flex-col md:flex-row items-center gap-6">
                                            <div className="relative border-4 border-dashed border-slate-300 w-full md:w-80 aspect-[1.91/1] rounded-2xl flex flex-col items-center justify-center bg-slate-50 overflow-hidden cursor-pointer hover:border-black transition-all">
                                                {ogImagePreview || settings.og_image ? (
                                                    <img 
                                                        src={ogImagePreview || settings.og_image} 
                                                        alt="OG Image Preview" 
                                                        className="w-full h-full object-cover" 
                                                    />
                                                ) : (
                                                    <div className="text-center p-4">
                                                        <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                                                        <span className="text-[10px] font-black uppercase text-slate-500">Pilih Gambar OG</span>
                                                        <span className="block text-[8px] text-slate-400 mt-1">Format: 1200 x 630 px (Rekomendasi)</span>
                                                    </div>
                                                )}
                                                <input 
                                                    type="file" 
                                                    accept="image/*"
                                                    onChange={e => handleFileChange('og_image', e.target.files?.[0] || null)}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                />
                                                {ogImageLoading && (
                                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                                        <RefreshCcw className="h-6 w-6 text-indigo-500 animate-spin" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <p className="text-xs font-black text-slate-700">Pentingnya OG Image</p>
                                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                                    Gambar OG adalah gambar utama yang akan ditampilkan secara otomatis saat Anda membagikan tautan event pendaftaran Anda ke media sosial seperti WhatsApp, Telegram, Facebook, dan X. 
                                                    Jika dikosongkan, sistem secara otomatis akan menggunakan banner event sebagai fallback default.
                                                </p>
                                                {(ogImagePreview || settings.og_image) && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleFileChange('og_image', null)}
                                                        className="text-rose-600 hover:text-rose-800 text-[10px] font-black uppercase mt-2 block"
                                                    >
                                                        Hapus Gambar
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Social Media Links Section */}
                                    <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xl shadow-slate-100/35 space-y-4">
                                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                            <h3 className="text-sm font-black uppercase flex items-center gap-2">
                                                <Share2 className="h-5 w-5 text-indigo-500" />
                                                Tautan Media Sosial
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={handleAddSocialLink}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg transition-all shadow-sm"
                                            >
                                                + Tambah Medsos
                                            </button>
                                        </div>

                                        {(!data.social_media_links || data.social_media_links.length === 0) ? (
                                            <div className="text-center p-8 border border-dashed border-slate-200 rounded-xl text-gray-400 text-xs font-bold bg-slate-50/25">
                                                Belum ada media sosial yang ditambahkan. Klik tombol "+ Tambah Medsos" di atas untuk menambahkan.
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {data.social_media_links.map((link: any, index: number) => (
                                                    <div key={index} className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50/40">
                                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                                                            <div className="space-y-1">
                                                                <label className="block text-[9px] font-black uppercase text-slate-500">Nama Media Sosial</label>
                                                                <input
                                                                    type="text"
                                                                    value={link.name}
                                                                    onChange={e => handleSocialLinkChange(index, 'name', e.target.value)}
                                                                    placeholder="Instagram, Facebook, TikTok, dll."
                                                                    className="w-full border border-slate-200 p-2.5 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-bold text-slate-800"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="block text-[9px] font-black uppercase text-slate-500">Username / ID</label>
                                                                <input
                                                                    type="text"
                                                                    value={link.username || ''}
                                                                    onChange={e => handleSocialLinkChange(index, 'username', e.target.value)}
                                                                    placeholder="@zawawalk"
                                                                    className="w-full border border-slate-200 p-2.5 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-bold text-slate-800"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="block text-[9px] font-black uppercase text-slate-500">URL Tautan</label>
                                                                <input
                                                                    type="url"
                                                                    value={link.url}
                                                                    onChange={e => handleSocialLinkChange(index, 'url', e.target.value)}
                                                                    placeholder="https://instagram.com/akun-anda"
                                                                    className="w-full border border-slate-200 p-2.5 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-bold text-slate-800"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Icon Upload */}
                                                        <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0 shrink-0">
                                                            <div className="relative w-11 h-11 border border-slate-200 rounded-lg flex items-center justify-center bg-white overflow-hidden shadow-sm shrink-0">
                                                                {link.icon_preview || link.icon_path ? (
                                                                    <img
                                                                        src={link.icon_preview || link.icon_path}
                                                                        alt="Social Icon"
                                                                        className="w-6 h-6 object-contain"
                                                                    />
                                                                ) : (
                                                                    <Share2 className="w-5 h-5 text-slate-400" />
                                                                )}
                                                            </div>
                                                            
                                                            <div className="flex-1 md:flex-initial">
                                                                <label className="block text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-800 cursor-pointer bg-slate-100 hover:bg-slate-250 px-2.5 py-1.5 rounded border border-slate-200 transition-all text-center">
                                                                    Pilih SVG
                                                                    <input
                                                                        type="file"
                                                                        accept=".svg,image/svg+xml"
                                                                        onChange={e => handleSocialLinkChange(index, 'icon_file', e.target.files?.[0] || null)}
                                                                        className="hidden"
                                                                    />
                                                                </label>
                                                                <span className="text-[8px] text-gray-400 block mt-1 text-center font-bold">Ikon SVG</span>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveSocialLink(index)}
                                                                className="text-rose-500 hover:text-rose-700 text-[10px] font-black uppercase px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg shadow-sm"
                                                            >
                                                                Hapus
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Sponsors Management Section */}
                                    <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xl shadow-slate-100/35 space-y-4">
                                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                            <h3 className="text-sm font-black uppercase flex items-center gap-2">
                                                <span>🤝</span>
                                                Daftar Sponsor Acara
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={handleAddSponsor}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg transition-all shadow-sm"
                                            >
                                                + Tambah Sponsor
                                            </button>
                                        </div>

                                        {(!data.event_sponsors || data.event_sponsors.length === 0) ? (
                                            <div className="text-center p-8 border border-dashed border-slate-200 rounded-xl text-gray-400 text-xs font-bold bg-slate-50/25">
                                                Belum ada sponsor yang ditambahkan. Klik tombol "+ Tambah Sponsor" di atas untuk menambahkan.
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {data.event_sponsors.map((sponsor: any, index: number) => (
                                                    <div key={index} className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50/40">
                                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                                                            <div className="space-y-1">
                                                                <div className="flex justify-between items-center">
                                                                    <label className="block text-[9px] font-black uppercase text-slate-500">Kategori Sponsor</label>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleToggleSponsorCustom(index)}
                                                                        className="text-[8px] font-black uppercase text-indigo-650 hover:text-indigo-800"
                                                                    >
                                                                        {sponsor.is_custom ? '✍️ Pilih Kategori' : '📝 Ketik Manual'}
                                                                    </button>
                                                                </div>
                                                                {sponsor.is_custom ? (
                                                                    <input
                                                                        type="text"
                                                                        value={sponsor.category}
                                                                        onChange={e => handleSponsorChange(index, 'category', e.target.value)}
                                                                        placeholder="e.g. Sponsor Pendukung, dll."
                                                                        className="w-full border border-slate-200 p-2.5 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-bold text-slate-800"
                                                                    />
                                                                ) : (
                                                                    <select
                                                                        value={sponsor.category}
                                                                        onChange={e => handleSponsorChange(index, 'category', e.target.value)}
                                                                        className="w-full border border-slate-200 p-2.5 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-bold text-slate-800"
                                                                    >
                                                                        <option value="Platinum">🏆 Platinum Sponsor</option>
                                                                        <option value="Gold">🥇 Gold Sponsor</option>
                                                                        <option value="Silver">🥈 Silver Sponsor</option>
                                                                        <option value="Bronze">🥉 Bronze Sponsor</option>
                                                                        <option value="Media Partner">📻 Media Partner</option>
                                                                        <option value="Supported By">🤝 Supported By</option>
                                                                    </select>
                                                                )}
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="block text-[9px] font-black uppercase text-slate-500">Nama Brand / Perusahaan</label>
                                                                <input
                                                                    type="text"
                                                                    value={sponsor.name}
                                                                    onChange={e => handleSponsorChange(index, 'name', e.target.value)}
                                                                    placeholder="e.g. PT Maju Bersama"
                                                                    className="w-full border border-slate-200 p-2.5 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-bold text-slate-800"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="block text-[9px] font-black uppercase text-slate-500">Link Website / Medsos (Opsional)</label>
                                                                <input
                                                                    type="url"
                                                                    value={sponsor.url || ''}
                                                                    onChange={e => handleSponsorChange(index, 'url', e.target.value)}
                                                                    placeholder="https://sponsor.com"
                                                                    className="w-full border border-slate-200 p-2.5 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-bold text-slate-800"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Logo Upload */}
                                                        <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0 shrink-0">
                                                            <div className="relative w-16 h-16 border border-slate-200 rounded-lg flex items-center justify-center bg-white overflow-hidden shadow-sm shrink-0">
                                                                {sponsor.logo_preview || sponsor.logo_path ? (
                                                                    <img
                                                                        src={sponsor.logo_preview || sponsor.logo_path}
                                                                        alt="Sponsor Logo"
                                                                        className="w-full h-full object-contain p-1"
                                                                    />
                                                                ) : (
                                                                    <span className="text-[18px] text-slate-400">🖼️</span>
                                                                )}
                                                            </div>
                                                            
                                                            <div className="flex-1 md:flex-initial">
                                                                <label className="block text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-800 cursor-pointer bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded border border-slate-200 transition-all text-center">
                                                                    Pilih Logo
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={e => handleSponsorChange(index, 'logo_file', e.target.files?.[0] || null)}
                                                                        className="hidden"
                                                                    />
                                                                </label>
                                                                <span className="text-[8px] text-gray-400 block mt-1 text-center font-bold">Gambar/Logo</span>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveSponsor(index)}
                                                                className="text-rose-500 hover:text-rose-700 text-[10px] font-black uppercase px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg shadow-sm"
                                                            >
                                                                Hapus
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end pt-5 border-t border-slate-150">
                                        <button
                                            type="submit"
                                            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-3 text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:opacity-95 active:translate-y-px transition-all"
                                        >
                                            Simpan SEO & Media Sosial
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* TAB 9: Realtime Settings */}
                            {activeTab === 'realtime' && (
                                <form onSubmit={handleSaveRealtimeSettings} className="space-y-6">
                                    <div className="border-b border-slate-100 pb-4">
                                        <h4 className="text-xl font-black uppercase flex items-center gap-2">
                                            <Zap className="h-5 w-5 text-amber-500" />
                                            Pengaturan Realtime WebSocket
                                        </h4>
                                        <p className="text-xs text-slate-400 mt-1 font-medium">Kontrol siaran data realtime ke halaman Live Check-in dan Public Report. Perubahan akan langsung dikirim ke semua layar yang terbuka.</p>
                                    </div>

                                    {/* Status Toggle */}
                                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 space-y-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                                                    {realtimeData.realtime_enabled === '1' ? (
                                                        <><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span> Realtime AKTIF</>
                                                    ) : (
                                                        <><ZapOff className="h-4 w-4 text-slate-400" /> Realtime NONAKTIF</>
                                                    )}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5">Halaman Live Check-in dan Public Report akan menerima data secara instant via WebSocket</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setRealtimeData('realtime_enabled', realtimeData.realtime_enabled === '1' ? '0' : '1')}
                                                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors shadow-inner focus:outline-none ${
                                                    realtimeData.realtime_enabled === '1'
                                                        ? 'bg-emerald-500'
                                                        : 'bg-slate-300'
                                                }`}
                                                aria-label="Toggle realtime"
                                            >
                                                <span
                                                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${
                                                        realtimeData.realtime_enabled === '1' ? 'translate-x-9' : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Broadcaster Type Selection */}
                                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 space-y-4">
                                        <div>
                                            <label className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mb-1">
                                                <Share2 className="h-4 w-4 text-indigo-500" />
                                                Metode Broadcast (WebSocket)
                                            </label>
                                            <p className="text-xs text-slate-500 mb-3">Pilih server WebSocket yang ingin digunakan. Disarankan Pusher untuk shared hosting.</p>
                                            <select
                                                value={realtimeData.broadcaster_type}
                                                onChange={e => setRealtimeData('broadcaster_type', e.target.value)}
                                                className="w-full border border-slate-200 bg-white text-slate-900 text-sm font-semibold rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                                            >
                                                <option value="reverb">Laravel Reverb (Lokal / Port Khusus)</option>
                                                <option value="pusher">Pusher.com (Cloud / Pihak Ketiga Gratis)</option>
                                            </select>
                                        </div>

                                        {realtimeData.broadcaster_type === 'pusher' && (
                                            <div className="pt-4 border-t border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="block text-[10px] font-black uppercase text-slate-500">Pusher App ID</label>
                                                    <input
                                                        type="text"
                                                        value={realtimeData.pusher_app_id}
                                                        onChange={e => setRealtimeData('pusher_app_id', e.target.value)}
                                                        placeholder="1234567"
                                                        className="w-full border border-slate-200 p-2.5 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-bold text-slate-800"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="block text-[10px] font-black uppercase text-slate-500">Pusher Key</label>
                                                    <input
                                                        type="text"
                                                        value={realtimeData.pusher_app_key}
                                                        onChange={e => setRealtimeData('pusher_app_key', e.target.value)}
                                                        placeholder="abcdef0123456789"
                                                        className="w-full border border-slate-200 p-2.5 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-bold text-slate-800"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="block text-[10px] font-black uppercase text-slate-500">Pusher Secret</label>
                                                    <input
                                                        type="password"
                                                        value={realtimeData.pusher_app_secret}
                                                        onChange={e => setRealtimeData('pusher_app_secret', e.target.value)}
                                                        placeholder="••••••••••••••••"
                                                        className="w-full border border-slate-200 p-2.5 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-bold text-slate-800"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="block text-[10px] font-black uppercase text-slate-500">Pusher Cluster</label>
                                                    <input
                                                        type="text"
                                                        value={realtimeData.pusher_app_cluster}
                                                        onChange={e => setRealtimeData('pusher_app_cluster', e.target.value)}
                                                        placeholder="ap1"
                                                        className="w-full border border-slate-200 p-2.5 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-bold text-slate-800"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Auto-Stop Time */}
                                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 space-y-4">
                                        <div>
                                            <label className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mb-1">
                                                <Power className="h-4 w-4 text-rose-500" />
                                                Waktu Berakhir Otomatis
                                            </label>
                                            <p className="text-xs text-slate-500 mb-3">Realtime akan otomatis berhenti pada waktu yang ditentukan. Kosongkan untuk tidak ada batas waktu.</p>
                                            <input
                                                type="datetime-local"
                                                id="realtime_stop_at"
                                                value={realtimeData.realtime_stop_at}
                                                onChange={e => setRealtimeData('realtime_stop_at', e.target.value)}
                                                className="w-full border border-slate-200 bg-white text-slate-900 text-sm font-semibold rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                                            />
                                            {realtimeData.realtime_stop_at && (
                                                <button
                                                    type="button"
                                                    onClick={() => setRealtimeData('realtime_stop_at', '')}
                                                    className="mt-2 text-xs text-rose-500 font-bold hover:underline flex items-center gap-1"
                                                >
                                                    <X className="h-3 w-3" /> Hapus waktu berakhir
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Info Box */}
                                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex gap-3">
                                        <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                        <div className="text-xs text-amber-800 space-y-1">
                                            <p className="font-extrabold">Cara Kerja Realtime WebSocket</p>
                                            <p>• Ketika admin verify payment atau scan racepack → data langsung muncul di layar publik tanpa reload</p>
                                            <p>• Ketika peserta baru mendaftar → Public Report diperbarui secara instant</p>
                                            <p>• Tombol Simpan juga akan langsung mengirim sinyal ke semua layar yang sedang terbuka</p>
                                            <p className="font-bold mt-2">Server Reverb harus berjalan: <code className="bg-amber-100 px-1.5 py-0.5 rounded">php artisan reverb:start</code> (atau gunakan <code className="bg-amber-100 px-1.5 py-0.5 rounded">BROADCAST_CONNECTION=pusher</code> jika di Shared Hosting).</p>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-5 border-t border-slate-150">
                                        <button
                                            type="submit"
                                            disabled={realtimeProcessing}
                                            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-3 text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:opacity-95 active:translate-y-px transition-all disabled:opacity-60 flex items-center gap-2"
                                        >
                                            <Zap className="h-4 w-4" />
                                            {realtimeProcessing ? 'Menyimpan & Mengirim...' : 'Simpan & Broadcast ke Semua Layar'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* TAB 10: WA & Email Broadcast */}
                            {activeTab === 'broadcast' && (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                        
                                        {/* Column 1: Template Editor (5 cols) */}
                                        <div className="lg:col-span-5 bg-white border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0px_#000] space-y-6">
                                            <div className="border-b-2 border-black pb-4">
                                                <h4 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                                                    <Settings className="h-4 w-4 text-indigo-600" />
                                                    Pengaturan Template Pesan
                                                </h4>
                                                <p className="text-[11px] text-slate-400 mt-1 font-bold">Pilih dan edit template pesan dinamis untuk broadcast WhatsApp & Email.</p>
                                            </div>

                                            {/* Template Selector List */}
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black uppercase text-slate-400">Pilih Template</label>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {broadcastTemplates.map(t => {
                                                        const meta = getTemplateMetadata(t.name);
                                                        return (
                                                            <button
                                                                key={t.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedTemplate(t);
                                                                    localStorage.setItem('admin_selected_template_id', t.id.toString());
                                                                }}
                                                                className={`text-left p-3 border-2 text-xs font-bold uppercase rounded-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-2 ${
                                                                    selectedTemplate?.id === t.id
                                                                        ? 'bg-indigo-600 text-white border-black shadow-[2px_2px_0px_#000]'
                                                                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                                                }`}
                                                            >
                                                                <span className="truncate">📢 {t.name}</span>
                                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-wider uppercase border text-center whitespace-nowrap shrink-0 ${
                                                                    selectedTemplate?.id === t.id
                                                                        ? 'bg-indigo-700 text-white border-indigo-500'
                                                                        : meta.badgeBg
                                                                }`}>
                                                                    {meta.type}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {selectedTemplate && (
                                                <div className="space-y-4 pt-2">
                                                    {(() => {
                                                        const meta = getTemplateMetadata(selectedTemplate.name);
                                                        return (
                                                            <div className="bg-indigo-50/50 border-2 border-indigo-200/80 p-4 rounded-xl text-[11px] text-indigo-900 font-semibold space-y-1 animate-fadeIn">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${meta.badgeBg}`}>
                                                                        {meta.type}
                                                                    </span>
                                                                    <span className="font-black text-xs uppercase text-indigo-950">Fungsi Template</span>
                                                                </div>
                                                                <p className="text-slate-600 leading-relaxed font-bold">{meta.desc}</p>
                                                            </div>
                                                        );
                                                    })()}
                                                    {/* Sub-Tabs for WA and Email */}
                                                    <div className="flex border-b-2 border-black">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditorSubTab('whatsapp');
                                                                localStorage.setItem('admin_editor_sub_tab', 'whatsapp');
                                                            }}
                                                            className={`flex-1 py-2 text-xs font-black uppercase border-t-2 border-l-2 border-r-2 border-black transition-all ${
                                                                editorSubTab === 'whatsapp'
                                                                    ? 'bg-orange-500 text-white shadow-[2px_-2px_0px_#000]'
                                                                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                                                            }`}
                                                        >
                                                            🟢 WhatsApp Message
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditorSubTab('email');
                                                                localStorage.setItem('admin_editor_sub_tab', 'email');
                                                            }}
                                                            className={`flex-1 py-2 text-xs font-black uppercase border-t-2 border-l-2 border-r-2 border-black transition-all ${
                                                                editorSubTab === 'email'
                                                                    ? 'bg-indigo-600 text-white shadow-[2px_-2px_0px_#000]'
                                                                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                                                            }`}
                                                        >
                                                            ✉️ Email Mailable (HTML)
                                                        </button>
                                                    </div>

                                                    <form onSubmit={handleSaveTemplate} className="space-y-4 pt-2">
                                                        <div className="space-y-1.5">
                                                            <label className="block text-[10px] font-black uppercase text-slate-400">Nama Template</label>
                                                            <input
                                                                type="text"
                                                                value={selectedTemplate.name}
                                                                disabled
                                                                className="w-full border-2 border-slate-200 p-3 rounded-xl text-xs font-bold text-slate-500 bg-slate-100"
                                                            />
                                                        </div>

                                                        {editorSubTab === 'whatsapp' && (
                                                            <div className="space-y-4 animate-fadeIn">
                                                                {/* WhatsApp Sub-tabs */}
                                                                <div className="flex border-2 border-black bg-slate-100 rounded-xl overflow-hidden p-1 gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setWhatsappEditMode('editor');
                                                                            localStorage.setItem('admin_whatsapp_edit_mode', 'editor');
                                                                        }}
                                                                        className={`flex-1 py-2 px-3 text-[10px] font-black uppercase rounded-lg transition-all ${
                                                                            whatsappEditMode === 'editor'
                                                                                ? 'bg-black text-white shadow-[2px_2px_0px_#000]'
                                                                                : 'text-slate-600 hover:bg-slate-200'
                                                                        }`}
                                                                    >
                                                                        📝 Edit Pesan WhatsApp
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setWhatsappEditMode('preview');
                                                                            localStorage.setItem('admin_whatsapp_edit_mode', 'preview');
                                                                        }}
                                                                        className={`flex-1 py-2 px-3 text-[10px] font-black uppercase rounded-lg transition-all ${
                                                                            whatsappEditMode === 'preview'
                                                                                ? 'bg-black text-white shadow-[2px_2px_0px_#000]'
                                                                                : 'text-slate-600 hover:bg-slate-200'
                                                                        }`}
                                                                    >
                                                                        👁️ Pratinjau Chat WhatsApp
                                                                    </button>
                                                                </div>

                                                                {whatsappEditMode === 'editor' ? (
                                                                    /* Column 1: Textarea Editor */
                                                                    <div className="space-y-3 animate-fadeIn">
                                                                        <div className="space-y-1.5">
                                                                            <label className="block text-[10px] font-black uppercase text-slate-400">Isi Pesan WhatsApp</label>
                                                                            <textarea
                                                                                rows={12}
                                                                                value={templateForm.data.whatsapp_body}
                                                                                onChange={e => templateForm.setData('whatsapp_body', e.target.value)}
                                                                                placeholder="Tulis pesan WhatsApp di sini..."
                                                                                className="w-full border-2 border-black p-3.5 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono shadow-inner"
                                                                            />
                                                                        </div>
                                                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-[10px] text-slate-500 font-bold leading-relaxed">
                                                                            <span className="block text-[9px] font-black text-slate-700 uppercase border-b border-slate-200 pb-1 mb-1.5">💡 Tips Format WhatsApp</span>
                                                                            <p>• Gunakan bintang untuk tebal: <span className="font-extrabold">*teks tebal*</span></p>
                                                                            <p>• Gunakan garis bawah untuk miring: <span className="italic">_teks miring_</span></p>
                                                                            <p>• Gunakan tilde untuk coret: <span className="line-through">~teks coret~</span></p>
                                                                            <p>• Gunakan 3 backticks untuk monospace: <code className="bg-slate-250 px-1 py-0.5 rounded font-mono">```monospaced```</code></p>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    /* Column 2: WhatsApp Phone Live Simulator */
                                                                    <div className="space-y-1.5 animate-fadeIn">
                                                                        <label className="block text-[10px] font-black uppercase text-slate-400">Pratinjau Live WhatsApp Chat</label>
                                                                        <div className="border-2 border-black rounded-2xl overflow-hidden flex flex-col shadow-[4px_4px_0px_#000] min-h-[350px]">
                                                                            {/* Simulated WhatsApp Phone Header */}
                                                                            <div className="bg-[#075e54] text-white p-3.5 flex items-center gap-3 shrink-0 border-b border-black/10">
                                                                                <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center font-extrabold text-sm border border-white/10 shrink-0 overflow-hidden shadow-inner">
                                                                                    {settings.event_logo ? (
                                                                                        <img src={settings.event_logo} className="h-full w-full object-cover" alt="Event Logo" />
                                                                                    ) : (
                                                                                        <span className="text-lg">💬</span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="font-black text-xs uppercase leading-tight truncate">
                                                                                        {settings.event_title || 'Zawawalk 2026'}
                                                                                    </div>
                                                                                    <span className="text-[9px] text-emerald-300 font-bold flex items-center gap-1 mt-0.5">
                                                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                                                                        online
                                                                                    </span>
                                                                                </div>
                                                                            </div>

                                                                            {/* WhatsApp Chat Area Backing */}
                                                                            <div 
                                                                                className="flex-1 p-4 bg-[#efeae2] overflow-y-auto min-h-[220px]"
                                                                                style={{
                                                                                    backgroundImage: `url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')`,
                                                                                    backgroundSize: 'cover',
                                                                                    backgroundBlendMode: 'overlay',
                                                                                    backgroundColor: '#efeae2'
                                                                                }}
                                                                            >
                                                                                {/* Message bubble */}
                                                                                <div className="flex justify-start">
                                                                                    <div className="bg-[#d9fdd3] text-slate-800 text-[11px] p-3 rounded-2xl rounded-tl-none shadow-md max-w-[85%] relative border border-[#c4eab9]/40 leading-relaxed font-sans whitespace-pre-wrap break-words">
                                                                                        <div 
                                                                                            dangerouslySetInnerHTML={{
                                                                                                __html: formatWhatsApp(templateForm.data.whatsapp_body || '')
                                                                                            }}
                                                                                        />
                                                                                        {/* Timestamp & Double checkmark simulator */}
                                                                                        <div className="text-right text-[8px] text-slate-400 mt-1.5 font-bold flex justify-end items-center gap-1 select-none">
                                                                                            <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                                            <span className="text-sky-500 font-extrabold text-[10px]">✓✓</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {editorSubTab === 'email' && (
                                                            <div className="space-y-4 animate-fadeIn">
                                                                <div className="space-y-1.5">
                                                                    <label className="block text-[10px] font-black uppercase text-slate-400">Subjek Email</label>
                                                                    <input
                                                                        type="text"
                                                                        value={templateForm.data.email_subject}
                                                                        onChange={e => templateForm.setData('email_subject', e.target.value)}
                                                                        placeholder="Masukkan subjek email..."
                                                                        className="w-full border-2 border-black p-3 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                                                    />
                                                                </div>

                                                                <div className="space-y-1.5">
                                                                    <label className="block text-[10px] font-black uppercase text-slate-400">Banner Kustom Email (Opsional)</label>
                                                                    {selectedTemplate.email_banner && (
                                                                        <div className="mb-2 border-2 border-black rounded-xl overflow-hidden max-h-24">
                                                                            <img src={selectedTemplate.email_banner} className="w-full h-full object-cover" alt="Current Email Banner" />
                                                                        </div>
                                                                    )}
                                                                    <div className="flex gap-2">
                                                                        <input
                                                                            type="file"
                                                                            accept="image/*"
                                                                            onChange={e => templateForm.setData('email_banner_file', e.target.files?.[0] || null)}
                                                                            className="w-full border-2 border-black p-2 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* Sub-tab selection for Editor (Text & HTML code) vs Preview (Visual WYSIWYG) */}
                                                                <div className="flex border-2 border-black bg-slate-100 rounded-xl overflow-hidden p-1 gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setEmailEditMode('editor');
                                                                            localStorage.setItem('admin_email_edit_mode', 'editor');
                                                                        }}
                                                                        className={`flex-1 py-2 px-3 text-[10px] font-black uppercase rounded-lg transition-all ${
                                                                            emailEditMode === 'editor'
                                                                                ? 'bg-black text-white shadow-[2px_2px_0px_#000]'
                                                                                : 'text-slate-600 hover:bg-slate-200'
                                                                        }`}
                                                                    >
                                                                        📝 Edit Konten & Kode HTML
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setEmailEditMode('preview');
                                                                            localStorage.setItem('admin_email_edit_mode', 'preview');
                                                                        }}
                                                                        className={`flex-1 py-2 px-3 text-[10px] font-black uppercase rounded-lg transition-all ${
                                                                            emailEditMode === 'preview'
                                                                                ? 'bg-black text-white shadow-[2px_2px_0px_#000]'
                                                                                : 'text-slate-600 hover:bg-slate-200'
                                                                        }`}
                                                                    >
                                                                        👁️ Pratinjau Tampilan Email
                                                                    </button>
                                                                </div>

                                                                {emailEditMode === 'editor' ? (
                                                                    <div className="space-y-4 animate-fadeIn">
                                                                        {/* Text/HTML Narrative Content Area */}
                                                                        <div className="space-y-1.5">
                                                                            <label className="block text-[10px] font-black uppercase text-slate-400">Narasi Email (HTML / Teks Sederhana)</label>
                                                                            <textarea
                                                                                rows={8}
                                                                                value={templateForm.data.email_narrative}
                                                                                onChange={e => {
                                                                                    templateForm.setData('email_narrative', e.target.value);
                                                                                    if (editablePreviewRef.current) {
                                                                                        editablePreviewRef.current.innerHTML = e.target.value;
                                                                                    }
                                                                                }}
                                                                                placeholder="Tulis teks atau paragraf narasi email di sini..."
                                                                                className="w-full border-2 border-black p-3 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                                                                            />
                                                                        </div>

                                                                        {/* Advanced Outer HTML Layout Theme Code Area */}
                                                                        <details className="border-2 border-black rounded-xl p-3.5 bg-slate-50 cursor-pointer transition-all">
                                                                            <summary className="text-[10px] font-black uppercase text-slate-500 select-none">
                                                                                🔧 Pengaturan Desain Tema Email (HTML Wrapper)
                                                                            </summary>
                                                                            <div className="mt-3 space-y-1.5 cursor-default">
                                                                                <p className="text-[9px] text-slate-400 font-bold leading-normal">
                                                                                    Tabel pembungkus / layout luar email. Gunakan placeholder <code className="bg-slate-200 px-1 py-0.5 rounded text-indigo-700 font-mono">{'{email_narrative}'}</code> di dalam kode HTML di bawah untuk menentukan posisi narasi email.
                                                                                </p>
                                                                                <textarea
                                                                                    rows={10}
                                                                                    value={templateForm.data.email_body}
                                                                                    onChange={e => templateForm.setData('email_body', e.target.value)}
                                                                                    className="w-full border-2 border-black p-3 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono bg-white"
                                                                                />
                                                                            </div>
                                                                        </details>
                                                                    </div>
                                                                ) : (
                                                                    /* Live HTML Preview Card */
                                                                    <div className="border-2 border-black rounded-xl p-4 bg-slate-100 space-y-2 animate-fadeIn">
                                                                        <label className="block text-[10px] font-black uppercase text-slate-400">Pratinjau Tampilan Email Resmi</label>
                                                                        <p className="text-[9px] text-slate-400 font-bold leading-normal">
                                                                            💡 Anda bisa langsung mengklik teks di dalam kotak pratinjau di bawah untuk mengedit narasi secara WYSIWYG.
                                                                        </p>
                                                                        
                                                                        <div className="bg-slate-200 p-4 rounded-lg overflow-y-auto max-h-80 border border-slate-300">
                                                                            <div className="max-w-[450px] mx-auto bg-white border-2 border-black shadow-[3px_3px_0px_#000] font-sans text-xs text-slate-800">
                                                                                {/* Header banner simulator */}
                                                                                {templateForm.data.email_banner_file ? (
                                                                                    <div className="border-b-2 border-black">
                                                                                        <img 
                                                                                            src={URL.createObjectURL(templateForm.data.email_banner_file)} 
                                                                                            className="w-full h-auto block" 
                                                                                            alt="Preview Banner" 
                                                                                        />
                                                                                    </div>
                                                                                ) : selectedTemplate.email_banner ? (
                                                                                    <div className="border-b-2 border-black">
                                                                                        <img 
                                                                                            src={selectedTemplate.email_banner} 
                                                                                            className="w-full h-auto block" 
                                                                                            alt="Current Banner" 
                                                                                        />
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="bg-black text-white p-4 text-center border-b-2 border-black font-black uppercase tracking-wider text-[10px]">
                                                                                        📢 {settings.event_title || 'Zawawalk 2026: The Fun Walk Festival'}
                                                                                    </div>
                                                                                )}

                                                                                {/* Dynamic merge preview (ContentEditable / Live Sync) */}
                                                                                <div 
                                                                                    ref={editablePreviewRef}
                                                                                    contentEditable={true}
                                                                                    suppressContentEditableWarning={true}
                                                                                    onInput={e => {
                                                                                        templateForm.setData('email_narrative', e.currentTarget.innerHTML);
                                                                                    }}
                                                                                    title="Klik untuk mengedit narasi secara langsung"
                                                                                    className="p-5 font-semibold space-y-2 leading-relaxed focus:outline-dashed focus:outline-2 focus:outline-indigo-500 rounded cursor-text hover:bg-slate-50 transition-colors"
                                                                                />

                                                                                {/* Footer */}
                                                                                <div className="bg-slate-50 p-2.5 text-center border-t-2 border-black text-[8px] font-black text-slate-400 uppercase">
                                                                                    &copy; {new Date().getFullYear()} {settings.event_title || 'Zawawalk 2026'}. All Rights Reserved.
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        <button
                                                            type="submit"
                                                            disabled={templateForm.processing}
                                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white border-2 border-black p-3 rounded-xl text-xs font-bold uppercase tracking-wider shadow-[2px_2px_0px_#000] active:translate-y-px transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                            {templateForm.processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                                                        </button>
                                                    </form>
                                                </div>
                                            )}

                                            {/* Placeholder Guides */}
                                            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 space-y-2">
                                                <p className="text-[10px] font-black uppercase text-slate-500">Panduan Placeholder Dinamis</p>
                                                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 font-bold">
                                                    <div><code className="bg-slate-200 px-1 py-0.5 rounded text-indigo-700">{'{nama}'}</code> : Nama Lengkap</div>
                                                    <div><code className="bg-slate-200 px-1 py-0.5 rounded text-indigo-700">{'{ticket_code}'}</code> : Kode Tiket</div>
                                                    <div><code className="bg-slate-200 px-1 py-0.5 rounded text-indigo-700">{'{attendance_mode}'}</code> : Online/Offline</div>
                                                    <div><code className="bg-slate-200 px-1 py-0.5 rounded text-indigo-700">{'{payment_status}'}</code> : Status Bayar</div>
                                                    <div><code className="bg-slate-200 px-1 py-0.5 rounded text-indigo-700">{'{amount_paid}'}</code> : Total Bayar</div>
                                                    <div><code className="bg-slate-200 px-1 py-0.5 rounded text-indigo-700">{'{ticket_url}'}</code> : URL Link E-Tiket</div>
                                                    <div><code className="bg-slate-200 px-1 py-0.5 rounded text-indigo-700">{'{wa_admin_number}'}</code> : No. WA Admin</div>
                                                    <div><code className="bg-slate-200 px-1 py-0.5 rounded text-indigo-700">{'{email}'}</code> : Alamat Email</div>
                                                    <div><code className="bg-slate-200 px-1 py-0.5 rounded text-indigo-700">{'{phone}'}</code> : No. WhatsApp</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Column 2: Broadcast Controller (7 cols) */}
                                        <div className="lg:col-span-7 bg-white border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0px_#000] space-y-6">
                                            <div className="border-b-2 border-black pb-4">
                                                <h4 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                                                    <Send className="h-4 w-4 text-emerald-600" />
                                                    Kontrol Broadcast
                                                </h4>
                                                <p className="text-[11px] text-slate-400 mt-1 font-bold">Konfigurasi penerima, channel pengiriman, dan jalankan broadcast.</p>
                                            </div>

                                            {/* Filters & Selection Settings */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="block text-[10px] font-black uppercase text-slate-400">Filter Status Pembayaran</label>
                                                    <select
                                                        value={filterPayment}
                                                        onChange={e => { setFilterPayment(e.target.value); setSelectedAttendeeIds([]); }}
                                                        className="w-full border-2 border-black p-3 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                                                    >
                                                        <option value="all">Semua Status Bayar</option>
                                                        <option value="paid">Paid (Lunas)</option>
                                                        <option value="pending">Pending (Menunggu)</option>
                                                        <option value="failed">Failed (Gagal)</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="block text-[10px] font-black uppercase text-slate-400">Filter Kehadiran</label>
                                                    <select
                                                        value={filterAttendance}
                                                        onChange={e => { setFilterAttendance(e.target.value); setSelectedAttendeeIds([]); }}
                                                        className="w-full border-2 border-black p-3 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                                                    >
                                                        <option value="all">Semua Tipe Kehadiran</option>
                                                        <option value="offline">Fisik (Offline)</option>
                                                        <option value="online">Virtual (Online)</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                                <div className="space-y-1.5">
                                                    <label className="block text-[10px] font-black uppercase text-slate-400">Pilih Template Broadcast</label>
                                                    <select
                                                        value={broadcastTemplateId}
                                                        onChange={e => setBroadcastTemplateId(Number(e.target.value))}
                                                        className="w-full border-2 border-black p-3 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                                                    >
                                                        {broadcastTemplates.map(t => (
                                                            <option key={t.id} value={t.id}>{t.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="block text-[10px] font-black uppercase text-slate-400">Pilih Channel Broadcast</label>
                                                    <select
                                                        value={broadcastChannel}
                                                        onChange={e => setBroadcastChannel(e.target.value as any)}
                                                        className="w-full border-2 border-black p-3 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                                                    >
                                                        <option value="email">📧 Email (SMTP Otomatis)</option>
                                                        <option value="whatsapp_fonnte">💬 WhatsApp Fonnte (API Otomatis)</option>
                                                        <option value="whatsapp_me">📱 WhatsApp Me (Manual wa.me)</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Action Box */}
                                            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-5 space-y-4">
                                                <div className="flex justify-between items-center text-xs font-bold text-emerald-800">
                                                    <span>Target Peserta Terfilter:</span>
                                                    <span className="bg-emerald-200 px-3 py-1 rounded-full">{filteredAttendees.length} Orang</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs font-bold text-emerald-800">
                                                    <span>Peserta Dipilih untuk Broadcast:</span>
                                                    <span className="bg-indigo-200 px-3 py-1 rounded-full text-indigo-900">{selectedAttendeeIds.length} Orang</span>
                                                </div>

                                                <div className="flex gap-3 pt-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleSelectAll}
                                                        className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border-2 border-black p-3 rounded-xl text-xs font-bold uppercase tracking-wider shadow-[2px_2px_0px_#000] active:translate-y-px transition-all"
                                                    >
                                                        {selectedAttendeeIds.length === filteredAttendees.length ? 'Batalkan Semua' : 'Pilih Semua Terfilter'}
                                                    </button>
                                                    {broadcastChannel !== 'whatsapp_me' && (
                                                        <button
                                                            type="button"
                                                            onClick={handleSendBulk}
                                                            disabled={selectedAttendeeIds.length === 0}
                                                            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-2 border-black p-3 rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-[2px_2px_0px_#000] active:translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                                                        >
                                                            <Send className="h-4 w-4" />
                                                            Kirim Bulk ({selectedAttendeeIds.length})
                                                        </button>
                                                    )}
                                                </div>
                                                {broadcastChannel === 'whatsapp_me' && (
                                                    <p className="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-100 p-2.5 rounded-xl">
                                                        ⚠️ WhatsApp Me (wa.me) tidak mendukung pengiriman bulk otomatis sekali klik karena batasan browser/WhatsApp. Pengiriman dilakukan manual satu-per-satu menggunakan tombol aksi di tabel daftar peserta di bawah.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Middle Section: Recipient Checklist Table */}
                                    <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0px_#000] space-y-4">
                                        <div className="flex justify-between items-center border-b-2 border-black pb-4">
                                            <div>
                                                <h4 className="text-sm font-black uppercase text-slate-800">Daftar Penerima Broadcast</h4>
                                                <p className="text-[11px] text-slate-400 mt-1 font-bold">Berikut daftar peserta sesuai filter. Beri centang pada peserta yang ingin Anda kirimi pesan.</p>
                                            </div>
                                            <span className="text-xs font-black uppercase text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                                                Menampilkan {filteredAttendees.length} Peserta
                                            </span>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse text-left text-xs">
                                                <thead>
                                                    <tr className="border-b-2 border-black bg-slate-50 text-[10px] font-black uppercase text-slate-450">
                                                        <th className="p-3 w-12 text-center">Pilih</th>
                                                        <th className="p-3">Nama Lengkap</th>
                                                        <th className="p-3">Kode Tiket</th>
                                                        <th className="p-3">Email</th>
                                                        <th className="p-3">WhatsApp</th>
                                                        <th className="p-3">Status Bayar</th>
                                                        <th className="p-3 text-center">Aksi Manual</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y-2 divide-slate-100">
                                                    {filteredAttendees.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={7} className="p-8 text-center font-bold text-slate-400 uppercase">
                                                                Tidak ada peserta yang cocok dengan filter.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        filteredAttendees.map(att => {
                                                            const isChecked = selectedAttendeeIds.includes(att.id);
                                                            return (
                                                                <tr key={att.id} className={`hover:bg-slate-50/50 transition-colors ${isChecked ? 'bg-indigo-50/10' : ''}`}>
                                                                    <td className="p-3 text-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isChecked}
                                                                            onChange={() => handleToggleSelectAttendee(att.id)}
                                                                            className="rounded border-2 border-black text-indigo-650 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                                                                        />
                                                                    </td>
                                                                    <td className="p-3 font-extrabold text-slate-800">{att._name}</td>
                                                                    <td className="p-3 font-black text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-lg inline-block my-2 uppercase">{att.ticket_code}</td>
                                                                    <td className="p-3 text-slate-600 font-medium">{att._email || '-'}</td>
                                                                    <td className="p-3 text-slate-600 font-medium">{att._phone || '-'}</td>
                                                                    <td className="p-3">
                                                                        <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                                                            att.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                                                                            att.payment_status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                                                            'bg-rose-100 text-rose-800'
                                                                        }`}>
                                                                            {att.payment_status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-3 text-center">
                                                                        <div className="flex gap-2 justify-center">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleSendIndividual(att.id, 'email')}
                                                                                title="Kirim email manual"
                                                                                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase shadow-sm transition-all"
                                                                            >
                                                                                📧 Email
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleSendIndividual(att.id, 'whatsapp_fonnte')}
                                                                                title="Kirim WA Fonnte manual"
                                                                                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase shadow-sm transition-all"
                                                                            >
                                                                                💬 Fonnte
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleSendIndividual(att.id, 'whatsapp_me')}
                                                                                title="Hubungi via wa.me"
                                                                                className="bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-600 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase shadow-sm transition-all"
                                                                            >
                                                                                📱 WA Me
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Bottom Section: Broadcast History & Logs */}
                                    <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0px_#000] space-y-4">
                                        <div className="border-b-2 border-black pb-4">
                                            <h4 className="text-sm font-black uppercase text-slate-800">Monitoring Log Pengiriman Broadcast</h4>
                                            <p className="text-[11px] text-slate-400 mt-1 font-bold">Lacak status keberhasilan pengiriman email dan whatsapp secara realtime.</p>
                                        </div>

                                        {/* Color Status Bar Breakdown */}
                                        <div className="space-y-2.5 pb-2">
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
                                                <span>Progress Pengiriman</span>
                                                <div className="flex flex-wrap gap-4 text-[10px]">
                                                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm border border-black"></span> Sukses: {broadcastStats.sent}</span>
                                                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-rose-500 rounded-sm border border-black"></span> Gagal: {broadcastStats.failed}</span>
                                                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-500 rounded-sm border border-black"></span> Antrean: {broadcastStats.pending}</span>
                                                </div>
                                            </div>
                                            
                                            {/* Stacked Progress Bar */}
                                            <div className="w-full h-5 bg-slate-100 border-2 border-black rounded-xl overflow-hidden flex shadow-[2px_2px_0px_#000]">
                                                {broadcastStats.total === 0 ? (
                                                    <div className="w-full flex items-center justify-center text-[10px] font-black uppercase text-slate-400">
                                                        Belum Ada Pengiriman
                                                    </div>
                                                ) : (
                                                    <>
                                                        {broadcastStats.sent > 0 && (
                                                            <div 
                                                                style={{ width: `${broadcastStats.sentPct}%` }}
                                                                className="h-full bg-emerald-500 border-r-2 border-black last:border-r-0 transition-all duration-500 flex items-center justify-center text-[9px] font-black text-white"
                                                                title={`Sukses: ${broadcastStats.sent} (${broadcastStats.sentPct.toFixed(1)}%)`}
                                                            >
                                                                {broadcastStats.sentPct >= 10 && `${broadcastStats.sentPct.toFixed(0)}%`}
                                                            </div>
                                                        )}
                                                        {broadcastStats.failed > 0 && (
                                                            <div 
                                                                style={{ width: `${broadcastStats.failedPct}%` }}
                                                                className="h-full bg-rose-500 border-r-2 border-black last:border-r-0 transition-all duration-500 flex items-center justify-center text-[9px] font-black text-white"
                                                                title={`Gagal: ${broadcastStats.failed} (${broadcastStats.failedPct.toFixed(1)}%)`}
                                                            >
                                                                {broadcastStats.failedPct >= 10 && `${broadcastStats.failedPct.toFixed(0)}%`}
                                                            </div>
                                                        )}
                                                        {broadcastStats.pending > 0 && (
                                                            <div 
                                                                style={{ width: `${broadcastStats.pendingPct}%` }}
                                                                className="h-full bg-amber-500 border-r-2 border-black last:border-r-0 transition-all duration-500 flex items-center justify-center text-[9px] font-black text-slate-900"
                                                                title={`Antrean: ${broadcastStats.pending} (${broadcastStats.pendingPct.toFixed(1)}%)`}
                                                            >
                                                                {broadcastStats.pendingPct >= 10 && `${broadcastStats.pendingPct.toFixed(0)}%`}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto max-h-[300px]">
                                            <table className="w-full border-collapse text-left text-xs">
                                                <thead>
                                                    <tr className="border-b-2 border-black bg-slate-50 text-[10px] font-black uppercase text-slate-450">
                                                        <th className="p-3">Peserta</th>
                                                        <th className="p-3">Penerima</th>
                                                        <th className="p-3">Channel</th>
                                                        <th className="p-3">Status</th>
                                                        <th className="p-3">Keterangan</th>
                                                        <th className="p-3">Waktu</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y-2 divide-slate-100">
                                                    {broadcastLogs.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={6} className="p-6 text-center font-bold text-slate-400 uppercase">
                                                                Belum ada riwayat pengiriman broadcast.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        broadcastLogs.map(log => {
                                                            const attendeeName = log.attendee?.registration_data?.fullname || log.attendee?.registration_data?.nama || log.attendee?.registration_data?.name || 'Peserta';
                                                            return (
                                                                <tr key={log.id} className="hover:bg-slate-50/50">
                                                                    <td className="p-3 font-bold text-slate-700">
                                                                        {attendeeName} <span className="text-[10px] text-slate-400 font-bold block">{log.attendee?.ticket_code || '-'}</span>
                                                                    </td>
                                                                    <td className="p-3 font-semibold text-slate-600">{log.recipient || '-'}</td>
                                                                    <td className="p-3">
                                                                        <span className="font-extrabold uppercase text-[10px] text-indigo-700">
                                                                            {log.channel === 'email' ? '📧 Email' :
                                                                             log.channel === 'whatsapp_fonnte' ? '💬 WA Fonnte' :
                                                                             '📱 WA Me'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-3">
                                                                        <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                                                            log.status === 'sent' ? 'bg-emerald-100 text-emerald-800' :
                                                                            log.status === 'failed' ? 'bg-rose-100 text-rose-800' :
                                                                            log.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                                                            'bg-slate-100 text-slate-800'
                                                                        }`}>
                                                                            {log.status === 'sent' ? 'Sukses' : 
                                                                             log.status === 'failed' ? 'Gagal' : 
                                                                             log.status === 'pending' ? 'Antrean' : 
                                                                             log.status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-3 font-semibold text-slate-500 max-w-[200px] truncate" title={log.error_message || ''}>
                                                                        {log.error_message || '-'}
                                                                    </td>
                                                                    <td className="p-3 text-slate-400 font-bold">{log.sent_at ? new Date(log.sent_at).toLocaleString('id-ID') : '-'}</td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                </div>
                            )}

                            {/* TAB 11: User Management (Admin Only) */}
                            {activeTab === 'users' && isAdmin && (
                                <div className="space-y-6">
                                    <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
                                        <div>
                                            <h4 className="text-xl font-black uppercase flex items-center gap-2">
                                                <Users className="h-6 w-6 text-indigo-500" />
                                                User Management & Permissions
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-1">Manage system administrators and staff access. Set specific permissions via roles.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={openAddUserModal}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2"
                                        >
                                            <Users className="h-4 w-4" />
                                            Tambah User Baru
                                        </button>
                                    </div>

                                    <div className="bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_#000] overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse text-left text-xs">
                                                <thead>
                                                    <tr className="border-b-2 border-black bg-slate-50 text-[10px] font-black uppercase text-slate-450">
                                                        <th className="p-4">Nama</th>
                                                        <th className="p-4">Email Address</th>
                                                        <th className="p-4">Peran (Role)</th>
                                                        <th className="p-4">Hak Akses (Permissions)</th>
                                                        <th className="p-4 text-right">Aksi</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y-2 divide-slate-100">
                                                    {users.map(u => {
                                                        const isSelf = u.id === auth.user.id;
                                                        return (
                                                            <tr key={u.id} className="hover:bg-slate-50/50">
                                                                <td className="p-4 font-bold text-slate-700">{u.name} {isSelf && <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded ml-1 font-black">Anda</span>}</td>
                                                                <td className="p-4 font-semibold text-slate-500">{u.email}</td>
                                                                <td className="p-4">
                                                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                                        u.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                                    }`}>
                                                                        {u.role}
                                                                    </span>
                                                                </td>
                                                                <td className="p-4 font-bold text-slate-500">
                                                                    {u.role === 'admin' ? (
                                                                        <span className="text-indigo-600">Semua Hak Akses (Full Admin)</span>
                                                                    ) : (
                                                                        <span className="text-slate-500">Scanner Racepack & Attendees (Read-Only)</span>
                                                                    )}
                                                                </td>
                                                                <td className="p-4 text-right space-x-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openEditUserModal(u)}
                                                                        className="bg-indigo-50/50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-colors"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                    {!isSelf && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDeleteUser(u.id)}
                                                                            className="bg-rose-50 border border-rose-250 text-rose-700 hover:bg-rose-100 px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-colors"
                                                                        >
                                                                            Hapus
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 12: Voucher Management (Admin Only) */}
                            {activeTab === 'vouchers' && isAdmin && (
                                <div className="space-y-8">
                                    <div className="border-b border-slate-100 pb-4">
                                        <h4 className="text-xl font-black uppercase flex items-center gap-2">
                                            <Gift className="h-6 w-6 text-emerald-500" />
                                            Voucher Code Management
                                        </h4>
                                        <p className="text-xs text-gray-500 mt-1">Buat kode voucher secara satuan maupun massal dengan prefix dinamis, serta kelola batas penggunaan peserta.</p>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        {/* Column 1: Generator Form */}
                                        <div className="lg:col-span-1 bg-slate-50/50 border border-slate-200/50 p-6 rounded-3xl space-y-6">
                                            <div className="flex border-b border-slate-200 pb-3 justify-around">
                                                <button
                                                    type="button"
                                                    onClick={() => setVoucherMode('single')}
                                                    className={`pb-1 text-xs font-black uppercase tracking-wider transition-colors ${
                                                        voucherMode === 'single' ? 'border-b-2 border-indigo-650 text-indigo-650' : 'text-slate-400 hover:text-slate-600'
                                                    }`}
                                                >
                                                    Single Voucher
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setVoucherMode('bulk')}
                                                    className={`pb-1 text-xs font-black uppercase tracking-wider transition-colors ${
                                                        voucherMode === 'bulk' ? 'border-b-2 border-indigo-650 text-indigo-650' : 'text-slate-400 hover:text-slate-600'
                                                    }`}
                                                >
                                                    Bulk Generator
                                                </button>
                                            </div>

                                            <form onSubmit={handleSaveVoucher} className="space-y-4">
                                                {voucherMode === 'single' ? (
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Kode Voucher</label>
                                                            <input
                                                                type="text"
                                                                required
                                                                value={voucherCode}
                                                                onChange={e => setVoucherCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                                                                placeholder="Contoh: ZAWA10K"
                                                                className="w-full border-2 border-black p-3 text-xs font-bold rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
                                                            />
                                                        </div>
                                                        {voucherCategory === 'group' && (
                                                            <div>
                                                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Batas Maksimal Penggunaan</label>
                                                                <input
                                                                    type="number"
                                                                    required
                                                                    min="1"
                                                                    value={voucherMaxUses}
                                                                    onChange={e => setVoucherMaxUses(e.target.value)}
                                                                    className="w-full border-2 border-black p-3 text-xs font-bold rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Prefix Kode</label>
                                                                <input
                                                                    type="text"
                                                                    required
                                                                    value={voucherPrefix}
                                                                    onChange={e => setVoucherPrefix(e.target.value.toUpperCase().replace(/\s/g, ''))}
                                                                    placeholder="Contoh: WALK-"
                                                                    className="w-full border-2 border-black p-3 text-xs font-bold rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Jumlah Voucher</label>
                                                                <input
                                                                    type="number"
                                                                    required
                                                                    min="1"
                                                                    max="500"
                                                                    value={voucherQty}
                                                                    onChange={e => setVoucherQty(e.target.value)}
                                                                    className="w-full border-2 border-black p-3 text-xs font-bold rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Kategori Voucher</label>
                                                    <select
                                                        value={voucherCategory}
                                                        onChange={e => setVoucherCategory(e.target.value as 'group' | 'personal')}
                                                        className="w-full border-2 border-black p-3 text-xs font-bold rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 bg-white"
                                                    >
                                                        <option value="personal">Personal (1 kode hanya untuk 1 pendaftar)</option>
                                                        <option value="group">Group (1 kode bisa dipakai berulang kali)</option>
                                                    </select>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Tipe Potongan</label>
                                                        <select
                                                            value={voucherType}
                                                            onChange={e => setVoucherType(e.target.value as 'percentage' | 'fixed')}
                                                            className="w-full border-2 border-black p-3 text-xs font-bold rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 bg-white"
                                                        >
                                                            <option value="fixed">Nominal (Rp)</option>
                                                            <option value="percentage">Persentase (%)</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Nilai Potongan</label>
                                                        <input
                                                            type="number"
                                                            required
                                                            min="1"
                                                            value={voucherValue}
                                                            onChange={e => setVoucherValue(e.target.value)}
                                                            className="w-full border-2 border-black p-3 text-xs font-bold rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
                                                        />
                                                    </div>
                                                </div>

                                                <button
                                                    type="submit"
                                                    disabled={isSavingVoucher}
                                                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-3 text-xs font-black uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 mt-4"
                                                >
                                                    {isSavingVoucher ? 'Membuat Voucher...' : 'Buat Voucher'}
                                                </button>
                                            </form>
                                        </div>

                                        {/* Column 2 & 3: Voucher Listing */}
                                        <div className="lg:col-span-2 space-y-4">
                                            <div className="bg-white border-2 border-black rounded-3xl shadow-[4px_4px_0px_#000] overflow-hidden">
                                                <div className="overflow-x-auto font-bold text-xs text-slate-700">
                                                    <table className="w-full border-collapse text-left text-xs">
                                                        <thead>
                                                            <tr className="border-b-2 border-black bg-slate-50 text-[10px] font-black uppercase text-slate-450">
                                                                <th className="p-4">Kode</th>
                                                                <th className="p-4">Kategori</th>
                                                                <th className="p-4">Nilai Diskon</th>
                                                                <th className="p-4 text-center">Pemakaian</th>
                                                                <th className="p-4 text-center">Status</th>
                                                                <th className="p-4 text-right">Aksi</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y-2 divide-slate-100">
                                                            {vouchers.length === 0 ? (
                                                                <tr>
                                                                    <td colSpan={6} className="p-8 text-center font-bold text-slate-400 italic">Belum ada voucher yang dibuat.</td>
                                                                </tr>
                                                            ) : (
                                                                vouchers.map(v => (
                                                                    <tr key={v.id} className="hover:bg-slate-50/50">
                                                                        <td className="p-4 font-mono font-black text-slate-800 text-[13px]">{v.code}</td>
                                                                        <td className="p-4 font-bold text-slate-500 uppercase text-[10px]">{v.category}</td>
                                                                        <td className="p-4 font-black text-indigo-950">
                                                                            {v.type === 'percentage' ? `${v.value}%` : `Rp ${(parseFloat(v.value)).toLocaleString('id-ID')}`}
                                                                        </td>
                                                                        <td className="p-4 text-center font-bold">
                                                                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                                                                                v.used_count >= v.max_uses ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-700'
                                                                            }`}>
                                                                                {v.used_count} / {v.max_uses > 100000 ? '∞' : v.max_uses}
                                                                            </span>
                                                                        </td>
                                                                        <td className="p-4 text-center">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleToggleVoucher(v.id)}
                                                                                className={`px-2 py-1 text-[9px] font-black uppercase rounded ${
                                                                                    v.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-250' : 'bg-red-50 text-red-600 border border-red-250'
                                                                                }`}
                                                                            >
                                                                                {v.is_active ? 'Active' : 'Inactive'}
                                                                            </button>
                                                                        </td>
                                                                        <td className="p-4 text-right">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleDeleteVoucher(v.id)}
                                                                                className="bg-rose-50 border border-rose-250 text-rose-700 hover:bg-rose-100 px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-colors"
                                                                            >
                                                                                Hapus
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Modal Add / Edit User */}
                            {userModalOpen && (
                                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                                    <div className="bg-white border-2 border-black p-6 rounded-2xl max-w-md w-full relative shadow-[6px_6px_0px_#000]">
                                        <button 
                                            type="button" 
                                            onClick={() => setUserModalOpen(false)}
                                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold"
                                        >
                                            ✕
                                        </button>
                                        <h4 className="font-black uppercase mb-4 text-sm text-slate-800 border-b-2 border-black pb-2">
                                            {editingUser ? 'Edit User & Permissions' : 'Tambah User Baru'}
                                        </h4>
                                        
                                        <form onSubmit={handleSaveUser} className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Nama Lengkap</label>
                                                <input 
                                                    type="text" 
                                                    required
                                                    value={userFormName}
                                                    onChange={e => setUserFormName(e.target.value)}
                                                    placeholder="Nama Lengkap"
                                                    className="w-full border-2 border-black p-3 text-xs font-bold rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Email Address</label>
                                                <input 
                                                    type="email" 
                                                    required
                                                    value={userFormEmail}
                                                    onChange={e => setUserFormEmail(e.target.value)}
                                                    placeholder="email@zawawalk.com"
                                                    className="w-full border-2 border-black p-3 text-xs font-bold rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                                                    Password {editingUser && <span className="text-[9px] text-slate-450 lowercase font-semibold"> (kosongkan jika tidak ingin diubah)</span>}
                                                </label>
                                                <input 
                                                    type="password" 
                                                    required={!editingUser}
                                                    value={userFormPassword}
                                                    onChange={e => setUserFormPassword(e.target.value)}
                                                    placeholder="Min 8 karakter"
                                                    className="w-full border-2 border-black p-3 text-xs font-bold rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Role / Permission Level</label>
                                                <select
                                                    value={userFormRole}
                                                    onChange={e => setUserFormRole(e.target.value as 'admin' | 'staff')}
                                                    className="w-full border-2 border-black p-3 text-xs font-bold rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 bg-white"
                                                >
                                                    <option value="staff">Staff (Scanner & Attendees Read-Only)</option>
                                                    <option value="admin">Admin (All Hak Akses)</option>
                                                </select>
                                                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                                                    {userFormRole === 'admin' 
                                                        ? 'Admin memiliki akses penuh untuk seluruh konfigurasi event, pembayaran, broadcast, dan manajemen user.' 
                                                        : 'Staff hanya dapat membuka tab Scanner Check-In (untuk serah-terima racepack) dan tab Attendees dalam format read-only.'
                                                    }
                                                </p>
                                            </div>

                                            <div className="pt-4 border-t-2 border-black flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setUserModalOpen(false)}
                                                    className="bg-white border-2 border-black text-slate-700 hover:bg-slate-50 px-5 py-2.5 text-xs font-bold uppercase rounded-xl transition-all"
                                                >
                                                    Batal
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={userFormProcessing}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 text-xs font-bold uppercase rounded-xl shadow-md transition-all disabled:opacity-50"
                                                >
                                                    {userFormProcessing ? 'Menyimpan...' : 'Simpan'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {/* Lightbox / Modal Bukti Transfer */}

                            {selectedProofUrl && (
                                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                                    <div className="bg-white border border-slate-100 p-6 rounded-2xl max-w-lg w-full relative shadow-2xl">
                                        <button 
                                            type="button" 
                                            onClick={() => setSelectedProofUrl(null)}
                                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold"
                                        >
                                            ✕
                                        </button>
                                        <h4 className="font-black uppercase mb-4 text-sm text-slate-800">Bukti Transfer Pembayaran</h4>
                                        <div className="border border-slate-200 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden max-h-[400px] p-2">
                                            <img src={selectedProofUrl} alt="Bukti Transfer" className="object-contain max-h-[380px] rounded-lg" />
                                        </div>
                                        <div className="mt-4 flex justify-end">
                                            <a 
                                                href={selectedProofUrl} 
                                                download={`Bukti_Transfer_${new Date().getTime()}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="bg-emerald-500 text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:opacity-95 transition-all inline-flex items-center gap-2"
                                            >
                                                <Download className="h-4 w-4" />
                                                Download
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>

            </div>

            {/* Custom Alert Modal */}
            {alertDialog.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-sm w-full p-6 space-y-6 transform scale-100 transition-all duration-200">
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className="h-12 w-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-100 shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                </svg>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base font-extrabold uppercase tracking-tight text-slate-800">{alertDialog.title}</h3>
                                <p className="text-xs font-semibold text-slate-550 leading-relaxed">{alertDialog.message}</p>
                            </div>
                        </div>
                        <div>
                            <button
                                type="button"
                                onClick={() => setAlertDialog(prev => ({ ...prev, isOpen: false }))}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-indigo-100 transition-all active:scale-98"
                            >
                                Mengerti
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Confirm Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-sm w-full p-6 space-y-6 transform scale-100 transition-all duration-200">
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100 shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base font-extrabold uppercase tracking-tight text-slate-800">{confirmModal.title}</h3>
                                <p className="text-xs font-semibold text-slate-550 leading-relaxed">{confirmModal.message}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={confirmModal.onConfirm}
                                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-rose-100 transition-all active:scale-98"
                            >
                                Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Public Footer */}
            <PublicFooter 
                socialMediaLinksSetting={settings.social_media_links}
                eventTitle={settings.event_title}
                eventOrganizedBy={settings.event_organized_by}
                eventDevelopedBy={settings.event_developed_by}
                eventOrganizedByUrl={settings.event_organized_by_url}
                eventDevelopedByUrl={settings.event_developed_by_url}
                transparent={true}
            />
        </AuthenticatedLayout>
    );
}
