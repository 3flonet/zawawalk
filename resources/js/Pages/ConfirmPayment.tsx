import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import PublicFooter from '@/Components/PublicFooter';
import { 
    AlertCircle, 
    CheckCircle2, 
    ShieldCheck, 
    User, 
    Mail, 
    Phone, 
    DollarSign, 
    FileText, 
    Ticket, 
    ShoppingBag, 
    Gift,
    Download,
    Maximize2,
    Loader2
} from 'lucide-react';

interface Attendee {
    id: number;
    ticket_code: string;
    signature_path: string | null;
    payment_status: 'pending' | 'paid' | 'failed';
    payment_method: string;
    payment_proof_path: string | null;
    checked_in: boolean;
    registration_data: {
        fullname: string;
        whatsapp: string;
        email?: string;
        attendance_mode: string;
        ticket_price: number;
        total_price: number;
        unique_code: number;
        merchandise_total: number;
        selected_merchandise?: {
            [key: string]: {
                name: string;
                price: number;
                size?: string;
                nickname?: string;
            }
        };
        donation_amount?: number;
        [key: string]: any;
    };
    form?: {
        title: string;
    };
}

interface ConfirmPaymentProps {
    attendee: Attendee | { ticket_code: string; fullname: string };
    requiresPasscode: boolean;
    settings: {
        event_title: string;
        event_banner: string;
        event_logo: string;
        [key: string]: any;
    };
    errors: {
        passcode?: string;
    };
    flash: {
        success: string | null;
        error: string | null;
    };
}

export default function ConfirmPayment({ attendee, requiresPasscode, settings, errors, flash }: ConfirmPaymentProps) {
    const { data, setData, post, processing } = useForm({
        passcode: '',
    });

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingStatus, setPendingStatus] = useState<'paid' | 'failed' | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    let fullName = 'Peserta';
    let displayPhone = '-';
    let displayEmail = '-';

    if (attendee && 'registration_data' in attendee) {
        fullName = attendee.registration_data.fullname;
        if (!fullName) {
            const nameKey = Object.keys(attendee.registration_data).find(k => k.toLowerCase().includes('nama') || k.toLowerCase().includes('name'));
            if (nameKey) fullName = attendee.registration_data[nameKey];
        }
        fullName = fullName || 'Peserta';

        displayPhone = attendee.registration_data.whatsapp || '';
        if (!displayPhone) {
            const phoneKey = Object.keys(attendee.registration_data).find(k => 
                k.toLowerCase().includes('whatsapp') || 
                k.toLowerCase().includes('wa') || 
                k.toLowerCase().includes('telp') || 
                k.toLowerCase().includes('phone') || 
                k.toLowerCase().includes('hp')
            );
            if (phoneKey) displayPhone = attendee.registration_data[phoneKey] || '';
        }
        displayPhone = displayPhone || '-';

        displayEmail = attendee.registration_data.email || '';
        if (!displayEmail) {
            const emailKey = Object.keys(attendee.registration_data).find(k => k.toLowerCase().includes('email') || k.toLowerCase().includes('surel'));
            if (emailKey) displayEmail = attendee.registration_data[emailKey] || '';
        }
        displayEmail = displayEmail || '-';
    } else if (attendee) {
        fullName = (attendee as any).fullname || 'Peserta';
    }

    const handlePasscodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('event.confirm_payment.verify_passcode', attendee.ticket_code));
    };

    const handleVerifyPayment = (status: 'paid' | 'failed') => {
        setPendingStatus(status);
        setShowConfirmModal(true);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20 relative overflow-hidden flex flex-col items-center justify-center p-4">
            <Head title={`Verifikasi Pembayaran - ${settings.event_title || 'Zawawalk'}`}>
                {settings.event_favicon && (
                    <link rel="icon" type="image/x-icon" href={settings.event_favicon} />
                )}
                <meta name="description" content={settings.meta_description || ''} />
                <meta name="keywords" content={settings.meta_keywords || 'zawawalk, fun walk'} />
                <meta name="robots" content="noindex, nofollow" />
                <meta property="og:type" content="website" />
                <meta property="og:site_name" content={settings.event_title || 'Zawawalk'} />
                <meta property="og:locale" content="id_ID" />
                <meta property="og:title" content={settings.og_title ? `Konfirmasi - ${settings.og_title}` : 'Verifikasi Pembayaran Manual'} />
                <meta property="og:description" content={settings.og_description || ''} />
                <meta property="og:image" content={settings.og_image || settings.event_banner || ''} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={settings.og_title ? `Konfirmasi - ${settings.og_title}` : 'Verifikasi Pembayaran Manual'} />
                <meta name="twitter:description" content={settings.og_description || ''} />
                <meta name="twitter:image" content={settings.og_image || settings.event_banner || ''} />
            </Head>

            {/* Background shapes */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-yellow-200/20 rounded-full filter blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-200/10 rounded-full filter blur-3xl pointer-events-none translate-x-1/2 translate-y-1/2"></div>

            <div className="w-full max-w-2xl relative z-10">
                {/* Logo & title */}
                <div className="text-center mb-8">
                    {settings.event_logo ? (
                        <img src={settings.event_logo} alt="Event Logo" className="h-16 mx-auto mb-4 object-contain" />
                    ) : (
                        <div className="text-3xl font-extrabold tracking-widest text-slate-900 mb-2">{settings.event_title ? settings.event_title.split(':')[0].toUpperCase() : 'ZAWAWALK'}</div>
                    )}
                    <h2 className="text-sm font-black uppercase tracking-wider text-slate-500">{settings.event_title}</h2>
                </div>

                {requiresPasscode ? (
                    /* PASSCODE FORM */
                    <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 rounded-2xl">
                        {flash && (flash.success || flash.error) && (
                            <div className={`mb-6 border-4 border-black p-4 rounded-xl flex items-start gap-3 shadow-[4px_4px_0px_#000] ${
                                flash.success ? 'bg-emerald-50 text-emerald-950 border-emerald-500' : 'bg-rose-50 text-rose-950 border-rose-500'
                            }`}>
                                {flash.success ? (
                                    <CheckCircle2 className="h-6 w-6 text-emerald-650 shrink-0 mt-0.5" />
                                ) : (
                                    <AlertCircle className="h-6 w-6 text-rose-650 shrink-0 mt-0.5" />
                                )}
                                <div>
                                    <h4 className="font-black uppercase text-xs">
                                        {flash.success ? 'Proses Berhasil' : 'Proses Gagal'}
                                    </h4>
                                    <p className="text-xs font-bold mt-1">
                                        {flash.success || flash.error}
                                    </p>
                                </div>
                            </div>
                        )}
                        <div className="text-center mb-6">
                            <div className="h-16 w-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto border-2 border-black mb-4">
                                <ShieldCheck className="h-8 w-8" />
                            </div>
                            <h1 className="text-2xl font-black uppercase">Keamanan Konfirmasi</h1>
                            <p className="text-xs text-slate-500 mt-1">Harap masukkan kode passcode keamanan untuk mengakses halaman ini.</p>
                        </div>

                        <form onSubmit={handlePasscodeSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">Passcode Keamanan</label>
                                <input 
                                    type="password" 
                                    value={data.passcode}
                                    onChange={e => setData('passcode', e.target.value)}
                                    placeholder="Masukkan passcode..."
                                    className="w-full border-4 border-black p-3 font-mono font-bold focus:outline-none focus:bg-yellow-50 rounded-xl"
                                    required
                                />
                                {errors.passcode && (
                                    <p className="text-red-500 text-xs font-black mt-1 flex items-center gap-1">
                                        <AlertCircle className="h-3.5 w-3.5" /> {errors.passcode}
                                    </p>
                                )}
                            </div>

                            <button 
                                type="submit" 
                                disabled={processing}
                                className="w-full bg-yellow-400 border-4 border-black p-3 font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 rounded-xl"
                            >
                                {processing ? 'Memproses...' : 'Buka Halaman'}
                            </button>
                        </form>
                    </div>
                ) : (
                    /* CONFIRM PAYMENT PAGE */
                    <div className="space-y-6">
                        {/* Status Message */}
                        {('payment_status' in attendee) && attendee.payment_status === 'paid' && (
                            <div className="bg-emerald-50 border-4 border-emerald-500 p-4 rounded-xl flex items-start gap-3">
                                <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-black text-emerald-800 uppercase text-sm">Pembayaran Terverifikasi</h3>
                                    <p className="text-xs text-emerald-700 mt-1 font-bold">Tiket digital untuk pendaftar ini telah dikirim ke nomor WhatsApp dan email terdaftar.</p>
                                </div>
                            </div>
                        )}

                        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-2xl overflow-hidden">
                            {/* Card Header */}
                            <div className="bg-yellow-400 border-b-4 border-black p-6 flex justify-between items-center">
                                <div>
                                    <span className="text-[10px] font-black uppercase bg-black text-yellow-400 px-2 py-0.5 rounded">Detail Peserta</span>
                                    <h1 className="text-xl font-black uppercase mt-1 leading-none">
                                        {fullName}
                                    </h1>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-[10px] font-black uppercase block text-slate-700">Kode Tiket</span>
                                    <span className="font-mono font-black text-lg block">{attendee.ticket_code}</span>
                                </div>
                            </div>

                            {/* Card Content */}
                            <div className="p-6 space-y-6">
                                {('registration_data' in attendee) && (
                                    <>
                                        {/* Contact Info */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="flex items-center gap-3 bg-slate-50 border-2 border-black p-3 rounded-xl">
                                                <Phone className="h-5 w-5 text-slate-500 shrink-0" />
                                                <div>
                                                    <span className="text-[9px] font-black uppercase text-slate-400 block">WhatsApp</span>
                                                    <span className="text-xs font-black">{displayPhone}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 bg-slate-50 border-2 border-black p-3 rounded-xl">
                                                <Mail className="h-5 w-5 text-slate-500 shrink-0" />
                                                <div>
                                                    <span className="text-[9px] font-black uppercase text-slate-400 block">Email</span>
                                                    <span className="text-xs font-black">{displayEmail}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Registration Info */}
                                        <div className="border-2 border-black p-4 rounded-xl space-y-3">
                                            <h3 className="text-xs font-black uppercase border-b-2 border-slate-100 pb-1 flex items-center gap-1.5">
                                                <FileText className="h-4 w-4" /> Formulir & Mode Kehadiran
                                            </h3>
                                            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                                                <div>
                                                    <span className="text-slate-450 block text-[9px] uppercase">Formulir</span>
                                                    <span>{attendee.form?.title || 'Form Pendaftaran'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-450 block text-[9px] uppercase">Mode Kehadiran</span>
                                                    <span className="uppercase bg-slate-200 border border-slate-350 px-2 py-0.5 rounded text-[10px] font-black">
                                                        {attendee.registration_data.attendance_mode}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Merchandise Addons */}
                                        {attendee.registration_data.selected_merchandise && Object.keys(attendee.registration_data.selected_merchandise).length > 0 && (
                                            <div className="border-2 border-black p-4 rounded-xl bg-orange-50/50 space-y-3">
                                                <h3 className="text-xs font-black uppercase border-b-2 border-slate-100 pb-1 flex items-center gap-1.5 text-orange-900">
                                                    <ShoppingBag className="h-4 w-4" /> Add-on Merchandise
                                                </h3>
                                                <div className="space-y-2">
                                                    {Object.values(attendee.registration_data.selected_merchandise).map((item: any, idx) => (
                                                        <div key={idx} className="flex justify-between items-center text-xs font-bold bg-white border border-slate-200 p-2 rounded-lg">
                                                            <div>
                                                                <span className="font-black text-slate-800">{item.name}</span>
                                                                {item.size && <span className="ml-1 text-[10px] bg-slate-100 px-1 py-0.5 rounded">Size: {item.size}</span>}
                                                                {item.nickname && <span className="ml-1 text-[10px] bg-yellow-100 px-1 py-0.5 rounded">Cetak: "{item.nickname}"</span>}
                                                            </div>
                                                            <span className="font-extrabold text-slate-600">Rp {number_format(item.price)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Donation */}
                                        {attendee.registration_data.donation_amount && attendee.registration_data.donation_amount > 0 ? (
                                            <div className="border-2 border-black p-4 rounded-xl bg-emerald-50/40 space-y-3">
                                                <h3 className="text-xs font-black uppercase border-b-2 border-slate-100 pb-1 flex items-center gap-1.5 text-emerald-900">
                                                    <Gift className="h-4 w-4" /> Donasi
                                                </h3>
                                                <div className="flex justify-between items-center text-xs font-black">
                                                    <span>Kontribusi Sukarela</span>
                                                    <span className="text-emerald-700">Rp {number_format(attendee.registration_data.donation_amount)}</span>
                                                </div>
                                            </div>
                                        ) : null}

                                        {/* Additional Fees */}
                                        {attendee.registration_data.additional_fees_breakdown && attendee.registration_data.additional_fees_breakdown.length > 0 && (
                                            <div className="border-2 border-black p-4 rounded-xl bg-indigo-50/40 space-y-3">
                                                <h3 className="text-xs font-black uppercase border-b-2 border-slate-100 pb-1 flex items-center gap-1.5 text-indigo-900">
                                                    💵 Biaya Tambahan
                                                </h3>
                                                <div className="space-y-2">
                                                    {attendee.registration_data.additional_fees_breakdown.map((fee: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between items-center text-xs font-black">
                                                            <span>{fee.name}</span>
                                                            <span className="text-slate-700">Rp {number_format(parseFloat(fee.calculated))}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Voucher Discount */}
                                        {parseFloat(attendee.registration_data.discount_amount || '0') > 0 && (
                                            <div className="border-2 border-black p-4 rounded-xl bg-emerald-50/20 space-y-3">
                                                <h3 className="text-xs font-black uppercase border-b-2 border-slate-100 pb-1 flex items-center gap-1.5 text-emerald-950">
                                                    <Ticket className="h-4 w-4 text-emerald-600" /> Voucher Diskon
                                                </h3>
                                                <div className="flex justify-between items-center text-xs font-black">
                                                    <span>
                                                        Diskon Voucher ({attendee.registration_data.voucher_code})
                                                        {attendee.registration_data.voucher_type && attendee.registration_data.voucher_value && (
                                                            <span className="ml-1 text-[9px] font-bold text-slate-500 uppercase">
                                                                ({attendee.registration_data.voucher_type === 'percentage'
                                                                    ? `${attendee.registration_data.voucher_value}%`
                                                                    : `Rp ${number_format(parseFloat(attendee.registration_data.voucher_value))}`
                                                                })
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="text-emerald-700">- Rp {number_format(parseFloat(attendee.registration_data.discount_amount))}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Payment proof */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-xs font-black uppercase">Bukti Pembayaran</h3>
                                                {attendee.payment_proof_path && (
                                                    <div className="flex gap-2">
                                                        <button 
                                                            type="button"
                                                            onClick={() => setIsFullscreen(true)}
                                                            className="bg-yellow-400 border-2 border-black text-black px-2.5 py-1 rounded-lg font-black text-[10px] uppercase flex items-center gap-1 hover:bg-yellow-500 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5"
                                                        >
                                                            <Maximize2 className="h-3 w-3" /> Perbesar
                                                        </button>
                                                        <a 
                                                            href={attendee.payment_proof_path} 
                                                            download={`bukti-transfer-${attendee.ticket_code}.jpg`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="bg-slate-800 border-2 border-black text-white px-2.5 py-1 rounded-lg font-black text-[10px] uppercase flex items-center gap-1 hover:bg-slate-700 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5"
                                                        >
                                                            <Download className="h-3 w-3" /> Download
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                            {attendee.payment_proof_path ? (
                                                <div 
                                                    onClick={() => setIsFullscreen(true)}
                                                    className="border-4 border-black p-2 bg-slate-100 rounded-xl max-h-[350px] overflow-hidden flex items-center justify-center cursor-zoom-in relative group"
                                                >
                                                    <img 
                                                        src={attendee.payment_proof_path} 
                                                        alt="Bukti Transfer" 
                                                        className="max-h-[330px] object-contain group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-black text-xs uppercase tracking-wider">
                                                        Klik untuk memperbesar
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="border-2 border-dashed border-slate-350 p-6 text-center text-slate-450 font-bold text-xs uppercase bg-slate-50 rounded-xl">
                                                    Belum mengunggah bukti pembayaran
                                                </div>
                                            )}
                                        </div>

                                        {/* Total Summary */}
                                        <div className="bg-slate-900 text-white border-2 border-black p-4 rounded-xl flex justify-between items-center">
                                            <div>
                                                <span className="text-[9px] font-black uppercase text-slate-400 block">Total Tagihan (Termasuk Kode Unik)</span>
                                                <span className="text-xs font-mono font-bold text-slate-300">
                                                    Rp {number_format(attendee.registration_data.ticket_price)} (Tiket)
                                                    {attendee.registration_data.merchandise_total > 0 && ` + Rp ${number_format(attendee.registration_data.merchandise_total)} (Merch)`}
                                                    {(attendee.registration_data.donation_amount || 0) > 0 && ` + Rp ${number_format(attendee.registration_data.donation_amount || 0)} (Donasi)`}
                                                    {(attendee.registration_data.additional_fees || 0) > 0 && ` + Rp ${number_format(attendee.registration_data.additional_fees || 0)} (Biaya Tambahan)`}
                                                    {parseFloat(attendee.registration_data.discount_amount || '0') > 0 && ` - Rp ${number_format(parseFloat(attendee.registration_data.discount_amount))} (Diskon)`}
                                                    {attendee.registration_data.unique_code > 0 && ` + Rp ${attendee.registration_data.unique_code} (Unik)`}
                                                </span>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="text-yellow-400 text-lg font-black block">
                                                    Rp {number_format(attendee.registration_data.total_price)}
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Card Footer Actions */}
                            {('payment_status' in attendee) && attendee.payment_status === 'pending' && (
                                <div className="bg-slate-550 border-t-4 border-black p-4 grid grid-cols-2 gap-4">
                                    <button 
                                        onClick={() => handleVerifyPayment('failed')}
                                        className="bg-rose-100 hover:bg-rose-200 text-rose-800 border-2 border-black p-3 rounded-xl font-black uppercase text-xs transition-colors duration-150"
                                    >
                                        Tolak / Gagal
                                    </button>
                                    <button 
                                        onClick={() => handleVerifyPayment('paid')}
                                        className="bg-emerald-400 hover:bg-emerald-500 text-black border-2 border-black p-3 rounded-xl font-black uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform active:translate-y-0.5 duration-100"
                                    >
                                        Konfirmasi Lunas ✔
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Back to Event success / info */}
                        <div className="text-center">
                            <a 
                                href="/" 
                                className="text-xs font-black text-slate-650 hover:underline uppercase"
                            >
                                &larr; Kembali ke Beranda
                            </a>
                        </div>
                    </div>
                )}
                <PublicFooter 
                    socialMediaLinksSetting={settings.social_media_links} 
                    eventTitle={settings.event_title} 
                    eventOrganizedBy={settings.event_organized_by}
                    eventDevelopedBy={settings.event_developed_by}
                    eventOrganizedByUrl={settings.event_organized_by_url}
                    eventDevelopedByUrl={settings.event_developed_by_url}
                />
            </div>

            {/* Fullscreen Image Lightbox */}
            {isFullscreen && attendee && 'payment_proof_path' in attendee && attendee.payment_proof_path && (
                <div 
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
                    onClick={() => setIsFullscreen(false)}
                >
                    <div className="absolute top-4 right-4 flex gap-4">
                        <a 
                            href={attendee.payment_proof_path} 
                            download={`bukti-transfer-${attendee.ticket_code}.jpg`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="bg-yellow-400 border-2 border-black text-black px-4 py-2 rounded-xl font-black uppercase text-xs flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-500 transition-colors"
                        >
                            <Download className="h-4 w-4" /> Download
                        </a>
                        <button 
                            onClick={() => setIsFullscreen(false)}
                            className="bg-rose-100 border-2 border-black text-rose-800 px-4 py-2 rounded-xl font-black uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-rose-200 transition-colors"
                        >
                            Tutup
                        </button>
                    </div>
                    <img 
                        src={attendee.payment_proof_path} 
                        alt="Bukti Transfer Fullscreen" 
                        className="max-w-full max-h-[90vh] object-contain rounded-lg border-4 border-black"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Custom Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-2xl max-w-md w-full p-6 space-y-6">
                        <div className="text-center">
                            <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center border-4 border-black mb-4 ${
                                pendingStatus === 'paid' ? 'bg-emerald-100 text-emerald-850' : 'bg-rose-100 text-rose-800'
                            }`}>
                                {pendingStatus === 'paid' ? (
                                    <CheckCircle2 className="h-8 w-8" />
                                ) : (
                                    <AlertCircle className="h-8 w-8" />
                                )}
                            </div>
                            <h3 className="text-lg font-black uppercase text-slate-900">
                                {pendingStatus === 'paid' ? 'Konfirmasi Lunas?' : 'Tolak Pembayaran?'}
                            </h3>
                            <p className="text-sm font-bold text-slate-500 mt-2">
                                {pendingStatus === 'paid' 
                                    ? 'Apakah Anda yakin ingin memverifikasi pembayaran ini sebagai LUNAS?' 
                                    : 'Apakah Anda yakin ingin menolak pembayaran ini? Status akan diubah menjadi GAGAL.'
                                }
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => {
                                    setShowConfirmModal(false);
                                    setPendingStatus(null);
                                }}
                                className="bg-slate-100 hover:bg-slate-200 text-black border-2 border-black p-3 rounded-xl font-black uppercase text-xs transition-colors duration-150 disabled:opacity-50"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => {
                                    if (pendingStatus) {
                                        router.post(route('event.confirm_payment.verify', attendee.ticket_code), {
                                            payment_status: pendingStatus
                                        }, {
                                            onStart: () => {
                                                setIsSubmitting(true);
                                            },
                                            onFinish: () => {
                                                setIsSubmitting(false);
                                                setShowConfirmModal(false);
                                                setPendingStatus(null);
                                            }
                                        });
                                    }
                                }}
                                className={`p-3 rounded-xl font-black uppercase text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform active:translate-y-0.5 duration-100 disabled:opacity-50 ${
                                    pendingStatus === 'paid' 
                                        ? 'bg-emerald-400 hover:bg-emerald-500 text-black' 
                                        : 'bg-rose-500 hover:bg-rose-600 text-white'
                                }`}
                            >
                                Ya, Proses
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading Overlay */}
            {isSubmitting && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
                    <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-2xl max-w-sm w-full p-6 text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="p-3 bg-yellow-100 rounded-full border-4 border-black">
                                <Loader2 className="h-10 w-10 text-yellow-600 animate-spin" />
                            </div>
                        </div>
                        <h3 className="text-lg font-black uppercase text-slate-900 tracking-wider">
                            Memproses Verifikasi
                        </h3>
                        <p className="text-xs font-bold text-slate-500">
                            Mohon tunggu sebentar, sistem sedang memverifikasi pembayaran serta mengirimkan e-tiket dan notifikasi WhatsApp/Email ke peserta.
                        </p>
                        <div className="w-full bg-slate-100 border-2 border-black h-4 rounded-full overflow-hidden relative">
                            <div className="bg-yellow-400 h-full border-r-2 border-black w-2/3 animate-[pulse_1.5s_infinite]"></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function number_format(num: number) {
    if (isNaN(num)) return '0';
    return num.toLocaleString('id-ID');
}
