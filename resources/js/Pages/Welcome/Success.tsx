import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import PublicFooter from '@/Components/PublicFooter';
import {
    CheckCircle2,
    MessageSquare,
    Upload,
    CreditCard,
    Sparkles,
    ArrowLeft,
    Check,
    Download,
    FileText,
    Clock
} from 'lucide-react';

interface Attendee {
    id: number;
    ticket_code: string;
    registration_data: {
        fullname?: string;
        whatsapp?: string;
        [key: string]: any;
    };
    signature_path: string;
    payment_method: string;
    payment_status: string;
    payment_proof_path: string | null;
    form: {
        ticket_price: string;
    };
}

interface SuccessProps {
    attendee: Attendee;
    settings: {
        event_title: string;
        event_date: string;
        event_time: string;
        event_location: string;
        wa_admin_number: string;
        event_type?: string;
        event_platform?: string;
        event_platform_url?: string;
        event_platform_id?: string;
        event_platform_passcode?: string;
        event_platform_custom_name?: string;
        midtrans_client_key?: string;
        midtrans_is_production?: string;
        payment_manual_bank_name?: string;
        payment_manual_account_number?: string;
        payment_manual_account_name?: string;
        event_location_map?: string;
        event_venue_name?: string;
        event_venue_address?: string;
        [key: string]: any;
    };
    waLink: string;
}

declare global {
    interface Window {
        snap: any;
    }
}

export default function Success({ attendee, settings, waLink }: SuccessProps) {
    const { data, setData, post, processing, errors } = useForm({
        payment_proof: null as File | null
    });

    const [uploadLoading, setUploadLoading] = React.useState(false);
    const [copied, setCopied] = React.useState(false);
    const [copiedAmount, setCopiedAmount] = React.useState(false);

    const handleCopyAccount = (accountNumber: string) => {
        navigator.clipboard.writeText(accountNumber);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyAmount = (amount: string) => {
        navigator.clipboard.writeText(amount);
        setCopiedAmount(true);
        setTimeout(() => setCopiedAmount(false), 2000);
    };

    React.useEffect(() => {
        if (attendee.payment_method === 'midtrans' && attendee.payment_status === 'pending') {
            const isProduction = settings.midtrans_is_production === '1' || settings.midtrans_is_production === 'true';
            const scriptUrl = isProduction
                ? 'https://app.midtrans.com/snap/snap.js'
                : 'https://app.sandbox.midtrans.com/snap/snap.js';
            const clientKey = settings.midtrans_client_key || '';

            const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);
            if (!existingScript) {
                const script = document.createElement('script');
                script.src = scriptUrl;
                script.setAttribute('data-client-key', clientKey);
                script.async = true;
                document.body.appendChild(script);
            }
        }
    }, [attendee.payment_method, attendee.payment_status, settings.midtrans_client_key, settings.midtrans_is_production]);

    const handlePayNow = () => {
        const snapToken = attendee.registration_data.snap_token;
        if (!snapToken) {
            alert('Token pembayaran Midtrans tidak ditemukan. Silakan hubungi panitia.');
            return;
        }

        if (window.snap) {
            window.snap.pay(snapToken, {
                onSuccess: function (result: any) {
                    window.location.reload();
                },
                onPending: function (result: any) {
                    alert("Menunggu pembayaran Anda!");
                },
                onError: function (result: any) {
                    alert("Pembayaran gagal!");
                },
                onClose: function () {
                    alert('Anda menutup popup pembayaran sebelum menyelesaikan transaksi.');
                }
            });
        } else {
            alert('Midtrans Snap SDK sedang dimuat, harap tunggu sebentar.');
        }
    };

    const handleFileChange = (file: File | null) => {
        if (!file) {
            setData('payment_proof', null);
            return;
        }

        setUploadLoading(true);
        setData('payment_proof', file);
    };

    React.useEffect(() => {
        if (data.payment_proof) {
            post(route('event.upload_proof', attendee.ticket_code), {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => setUploadLoading(false)
            });
        }
    }, [data.payment_proof]);

    const handleUploadProof = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('event.upload_proof', attendee.ticket_code), {
            forceFormData: true,
            preserveScroll: true
        });
    };

    let fullName = attendee.registration_data.fullname;
    if (!fullName) {
        const nameKey = Object.keys(attendee.registration_data).find(k => k.toLowerCase().includes('nama') || k.toLowerCase().includes('name'));
        if (nameKey) fullName = attendee.registration_data[nameKey];
    }
    fullName = fullName || 'Peserta';

    let displayPhone = attendee.registration_data.whatsapp;
    if (!displayPhone) {
        const phoneKey = Object.keys(attendee.registration_data).find(k =>
            k.toLowerCase().includes('whatsapp') ||
            k.toLowerCase().includes('wa') ||
            k.toLowerCase().includes('telp') ||
            k.toLowerCase().includes('phone') ||
            k.toLowerCase().includes('hp')
        );
        if (phoneKey) displayPhone = attendee.registration_data[phoneKey];
    }
    displayPhone = displayPhone || '-';

    return (
        <div className="min-h-screen bg-slate-50/60 font-sans text-slate-800 antialiased relative overflow-hidden pb-16 py-12 selection:bg-rose-500 selection:text-white print:bg-none print:bg-white print:py-0 print:pb-0">
            <Head title={`Pendaftaran Sukses! - ${settings.event_title || 'Zawawalk'}`}>
                {settings.event_favicon && (
                    <link rel="icon" type="image/x-icon" href={settings.event_favicon} />
                )}
                <meta name="description" content={settings.meta_description || ''} />
                <meta name="keywords" content={settings.meta_keywords || 'zawawalk, fun walk'} />
                <meta name="robots" content="index, follow" />
                <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : ''} />
                <meta property="og:type" content="website" />
                <meta property="og:site_name" content={settings.event_title || 'Zawawalk'} />
                <meta property="og:locale" content="id_ID" />
                <meta property="og:url" content={typeof window !== 'undefined' ? window.location.href : ''} />
                <meta property="og:title" content={settings.og_title ? `Sukses - ${settings.og_title}` : 'Pendaftaran Sukses!'} />
                <meta property="og:description" content={settings.og_description || ''} />
                <meta property="og:image" content={settings.og_image || settings.event_banner || ''} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={settings.og_title ? `Sukses - ${settings.og_title}` : 'Pendaftaran Sukses!'} />
                <meta name="twitter:description" content={settings.og_description || ''} />
                <meta name="twitter:image" content={settings.og_image || settings.event_banner || ''} />
            </Head>

            {/* Blurs */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-rose-200/30 rounded-full blur-[130px] pointer-events-none print:hidden" />
            <div className="absolute top-[20%] right-[-10%] w-[45%] h-[45%] bg-amber-200/20 rounded-full blur-[130px] pointer-events-none print:hidden" />
            <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] bg-cyan-200/20 rounded-full blur-[130px] pointer-events-none print:hidden" />

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 15mm;
                    }
                    body {
                        background-color: #ffffff !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            `}} />

            <div className="max-w-2xl mx-auto px-6 relative z-10 space-y-8 print:max-w-full print:p-0 print:space-y-0">

                {/* Status Header */}
                {(() => {
                    const isPaidOrFree = attendee.payment_status === 'paid' || parseFloat(attendee.registration_data.total_price || attendee.form.ticket_price) === 0;
                    return (
                        <div className="bg-white border border-slate-100 p-6 md:p-8 rounded-2xl shadow-xl shadow-slate-100/50 text-center space-y-4 relative print:hidden">
                            <span className="absolute -top-3 -left-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-extrabold uppercase text-[10px] tracking-wider px-3.5 py-1.5 shadow-md rounded-full">
                                {isPaidOrFree ? 'Berhasil!' : 'Invoice'}
                            </span>
                            {isPaidOrFree ? (
                                <div className="h-16 w-16 bg-emerald-50 text-emerald-500 border border-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-sm">
                                    <CheckCircle2 className="h-10 w-10 stroke-[2.5]" />
                                </div>
                            ) : (
                                <div className="h-16 w-16 bg-amber-50 text-amber-500 border border-amber-100 rounded-full flex items-center justify-center mx-auto shadow-sm">
                                    <FileText className="h-10 w-10 stroke-[2.5]" />
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-800">
                                    {isPaidOrFree ? 'Pendaftaran Sukses!' : 'Invoice Pendaftaran'}
                                </h2>
                                <p className="text-xs md:text-sm font-semibold text-slate-500 max-w-md mx-auto leading-relaxed">
                                    {isPaidOrFree ? (
                                        `Terima kasih ${fullName}, pendaftaran & pembayaran Anda telah kami konfirmasi secara resmi.`
                                    ) : (
                                        `Terima kasih ${fullName}, data pendaftaran Anda telah kami simpan.`
                                    )}
                                    {!isPaidOrFree && (
                                        <span className="block mt-2 text-rose-500 font-extrabold">Silakan selesaikan pembayaran pada box instruksi di bawah ini untuk mengaktifkan E-Tiket resmi Anda.</span>
                                    )}
                                </p>
                            </div>
                        </div>
                    );
                })()}

                {/* Highlighted Payment Instructions Box (Only shows when PENDING and price > 0) */}
                {attendee.payment_status !== 'paid' && parseFloat(attendee.registration_data.total_price || attendee.form.ticket_price) > 0 && (
                    <div className="bg-rose-50/40 border border-rose-100 p-6 md:p-8 rounded-2xl shadow-xl shadow-slate-100/50 relative print:hidden space-y-6">
                        <span className="absolute -top-3 -left-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-extrabold uppercase text-[10px] tracking-wider px-3.5 py-1.5 shadow-md rounded-full animate-bounce hover:[animation-play-state:paused] cursor-pointer select-none">
                            Wajib Bayar!
                        </span>

                        {attendee.payment_method === 'manual' ? (
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                        <CreditCard className="h-5 w-5 text-rose-500 shrink-0" />
                                        Langkah Pembayaran (Transfer Manual)
                                    </h4>
                                    <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm space-y-4">

                                        {/* Payment Breakdown */}
                                        <div className="space-y-2 bg-slate-50/50 border border-slate-100 p-4 rounded-xl shadow-sm">
                                            <h5 className="font-extrabold uppercase text-[9px] tracking-widest text-slate-400 mb-2 border-b border-dashed border-slate-200 pb-1.5">Rincian Pembayaran</h5>
                                            <div className="flex justify-between text-xs font-bold text-slate-600">
                                                <span>🎟️ Tiket Registrasi</span>
                                                <span>Rp {parseFloat(attendee.form.ticket_price).toLocaleString('id-ID')}</span>
                                            </div>

                                            {attendee.registration_data.selected_merchandise && Object.keys(attendee.registration_data.selected_merchandise).length > 0 && (
                                                <>
                                                    {Object.entries(attendee.registration_data.selected_merchandise).map(([key, item]: [string, any]) => (
                                                        <div key={key} className="flex justify-between text-xs font-bold text-slate-600">
                                                            <span>👕 {item.name} {item.size ? `(${item.size})` : ''}</span>
                                                            <span>Rp {parseFloat(item.price).toLocaleString('id-ID')}</span>
                                                        </div>
                                                    ))}
                                                </>
                                            )}

                                            {parseFloat(attendee.registration_data.donation_amount || '0') > 0 && (
                                                <div className="flex justify-between text-xs font-bold text-slate-600">
                                                    <span>🎁 Donasi Sukarela</span>
                                                    <span>Rp {parseFloat(attendee.registration_data.donation_amount).toLocaleString('id-ID')}</span>
                                                </div>
                                            )}

                                            {parseFloat(attendee.registration_data.unique_code || '0') > 0 && (
                                                <div className="flex justify-between text-xs font-black text-rose-500">
                                                    <span>🔢 Kode Unik</span>
                                                    <span>+ Rp {parseFloat(attendee.registration_data.unique_code).toLocaleString('id-ID')}</span>
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center border-t border-slate-200 pt-3 mt-2 font-black text-xs md:text-sm gap-2 text-slate-800">
                                                <span className="uppercase text-[10px] text-slate-500 font-extrabold tracking-wider">Total Wajib Transfer</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1 rounded-xl shadow-sm font-black">
                                                        Rp {parseFloat(attendee.registration_data.total_price || attendee.form.ticket_price).toLocaleString('id-ID')}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyAmount(String(parseFloat(attendee.registration_data.total_price || attendee.form.ticket_price)))}
                                                        className="bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider hover:bg-slate-200 hover:text-slate-800 transition-all"
                                                    >
                                                        {copiedAmount ? '✓ Tersalin!' : '📋 Salin'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="bg-rose-50/50 border border-rose-100 p-3.5 text-xs text-rose-800 rounded-xl font-bold leading-relaxed">
                                            ⚠️ <strong>PENTING:</strong> Mohon transfer tepat sejumlah <span className="bg-white text-rose-600 px-2 py-0.5 border border-rose-150 font-black rounded shadow-sm text-sm">Rp {parseFloat(attendee.registration_data.total_price || attendee.form.ticket_price).toLocaleString('id-ID')}</span> (harus sama persis hingga 3 digit terakhir) agar panitia dapat langsung memverifikasi transaksi Anda!
                                        </p>
                                        <div className="border-t border-dashed border-slate-200 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[9px] text-slate-450 uppercase font-extrabold tracking-wider">Rekening Transfer</p>
                                                <p className="font-extrabold text-slate-850 text-sm flex items-center gap-1.5 flex-wrap">
                                                    {settings.payment_manual_bank_name || 'BANK BCA'}: <span className="font-mono bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200/60">{settings.payment_manual_account_number || '1234-5678-90'}</span>
                                                </p>
                                                <p className="text-slate-500 text-xs font-semibold mt-0.5">
                                                    {settings.payment_manual_account_name || 'a/n Panitia Zawawalk'}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyAccount(settings.payment_manual_account_number || '1234-5678-90')}
                                                className="bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all self-start sm:self-center"
                                            >
                                                {copied ? '✓ Tersalin!' : '📋 Salin Rekening'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Proof Upload Form */}
                                <form className="space-y-3 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                        Unggah Bukti Transfer
                                    </label>
                                    <p className="text-[10px] text-slate-400 font-bold -mt-2">Pilih gambar dan bukti akan terunggah secara otomatis.</p>

                                    {attendee.payment_proof_path ? (
                                        <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl flex flex-col gap-2 text-xs font-bold text-emerald-800">
                                            <div className="flex items-center gap-2">
                                                <Check className="h-5 w-5 text-emerald-600 stroke-[3] shrink-0" />
                                                <span>Bukti transfer telah diunggah! Menunggu konfirmasi admin.</span>
                                            </div>
                                            <span className="text-rose-500 font-extrabold animate-pulse mt-1">👉 Terakhir, klik "Konfirmasi Pembayaran via WhatsApp Admin" di bawah!</span>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2 relative">
                                            {uploadLoading && (
                                                <div className="absolute inset-0 bg-white/95 border border-slate-100 rounded-xl flex flex-col items-center justify-center z-10 p-2">
                                                    <div className="w-2/3 bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                                                        <div className="bg-gradient-to-r from-orange-500 to-rose-500 h-2 rounded-full animate-[pulse_1s_infinite] w-full" />
                                                    </div>
                                                    <span className="font-bold text-[8px] uppercase tracking-widest mt-1.5 text-slate-550 animate-pulse">Mengunggah...</span>
                                                </div>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={e => handleFileChange(e.target.files ? e.target.files[0] : null)}
                                                className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50/50 text-xs file:mr-4 file:py-1 file:px-3 file:border file:border-slate-200 file:rounded-lg file:text-[10px] file:font-bold file:bg-white file:text-slate-700 file:uppercase file:cursor-pointer hover:file:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-50"
                                                disabled={uploadLoading || processing}
                                            />
                                        </div>
                                    )}
                                </form>

                                {/* WhatsApp Redirect Button */}
                                <div className="pt-2">
                                    {attendee.payment_proof_path ? (
                                        <a
                                            href={waLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full bg-gradient-to-r from-orange-500 to-rose-500 border-0 text-white py-4 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2 animate-bounce hover:[animation-play-state:paused]"
                                        >
                                            <MessageSquare className="h-5 w-5" />
                                            Klik Konfirmasi Pembayaran via WhatsApp
                                        </a>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled
                                            title="Unggah bukti transfer terlebih dahulu"
                                            className="w-full border border-slate-200 bg-slate-100 text-slate-400 py-4 rounded-xl text-xs font-bold uppercase tracking-wider cursor-not-allowed flex items-center justify-center gap-2 select-none"
                                        >
                                            <MessageSquare className="h-5 w-5" />
                                            Klik Konfirmasi Pembayaran via WhatsApp
                                        </button>
                                    )}
                                    <span className="text-[10px] mt-2 block text-center font-bold text-slate-400">
                                        {attendee.payment_proof_path
                                            ? 'Klik tombol di atas untuk mengirimkan konfirmasi pendaftaran beserta kode tiket ke WhatsApp admin.'
                                            : '⚠️ Unggah bukti transfer terlebih dahulu untuk mengaktifkan tombol ini.'}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4 space-y-4">
                                <h4 className="font-extrabold text-sm uppercase text-slate-700">Pembayaran Online (Midtrans) Pending</h4>
                                <p className="text-xs text-slate-500 font-semibold">Harap selesaikan pembayaran Anda secara online untuk mengaktifkan E-Tiket.</p>
                                <button
                                    type="button"
                                    onClick={handlePayNow}
                                    className="bg-gradient-to-r from-orange-500 to-rose-500 border-0 text-white px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-md hover:opacity-95 active:scale-98 transition-transform"
                                >
                                    Bayar Sekarang
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* E-Ticket Display */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-100/50 overflow-hidden print:shadow-none print:border-2">
                    <div className="bg-slate-800 text-white px-6 py-5 flex flex-col sm:flex-row justify-between items-center border-b border-slate-100 gap-4 print:border-b-2">
                        <span className="font-extrabold uppercase tracking-wider text-xs sm:text-sm">
                            {attendee.payment_status === 'paid' ? 'E-Tiket Resmi' : 'E-Tiket Sementara'}
                        </span>
                        <span className={`text-[10px] sm:text-xs font-bold px-3 py-1.5 uppercase rounded-full border shadow-sm print:shadow-none print:border ${attendee.payment_status === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-100 animate-pulse'
                            }`}>
                            Status: {attendee.payment_status.toUpperCase()}
                        </span>
                    </div>

                    <div className="p-6 md:p-8 flex flex-col items-center gap-6 border-b border-dashed border-slate-200 print:border-b-2">
                        {/* QR Code */}
                        <div className="flex flex-col items-center justify-center w-full">
                            {attendee.payment_status === 'paid' ? (
                                <>
                                    <div className="border border-slate-100 p-3 bg-white rounded-xl shadow-sm">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${attendee.ticket_code}`}
                                            alt="Ticket QR Code"
                                            className="w-48 h-48"
                                        />
                                    </div>
                                    <div className="mt-3 text-center">
                                        <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Kode Tiket</span>
                                        <span className="inline-block mt-1 font-mono font-black bg-slate-900 text-yellow-400 px-4 py-1.5 rounded-xl text-sm tracking-widest shadow-sm">
                                            {attendee.ticket_code}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="border border-slate-150 p-6 bg-slate-50/50 rounded-xl text-center flex flex-col items-center justify-center h-48 w-48 shadow-sm">
                                    <span className="text-4xl mb-2">⏳</span>
                                    <span className="font-extrabold text-[10px] uppercase text-slate-450 leading-tight">Menunggu Pembayaran</span>
                                </div>
                            )}
                        </div>

                        {/* Event Details */}
                        <div className="w-full space-y-4">
                            <div>
                                <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Event Zawawalk</h4>
                                <h3 className="text-lg font-extrabold uppercase leading-tight text-slate-850">{settings.event_title}</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Nama Lengkap</h4>
                                    <p className="text-xs font-bold text-slate-800">{fullName}</p>
                                </div>
                                <div>
                                    <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-400">No. WhatsApp</h4>
                                    <p className="text-xs font-bold text-slate-800">{displayPhone}</p>
                                </div>
                                <div>
                                    <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Tanggal & Waktu</h4>
                                    <p className="text-xs font-bold text-slate-800">{settings.event_date} / {settings.event_time}</p>
                                </div>
                                <div>
                                    <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Tipe Kehadiran</h4>
                                    <p className="text-xs font-bold text-slate-800">
                                        {attendee.registration_data.attendance_mode === 'online'
                                            ? '💻 Virtual / Online'
                                            : '📍 Fisik / Offline'}
                                    </p>
                                </div>
                                {attendee.registration_data.attendance_mode !== 'online' && (
                                    <>
                                        <div>
                                            <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Nama Venue</h4>
                                            <p className="text-xs font-bold text-slate-800">{settings.event_venue_name || settings.event_location || 'Lokasi Fisik'}</p>
                                        </div>
                                        {settings.event_venue_address && (
                                            <div className="col-span-2">
                                                <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Alamat Venue</h4>
                                                <p className="text-xs font-semibold text-slate-500">{settings.event_venue_address}</p>
                                            </div>
                                        )}
                                    </>
                                )}
                                <div className="col-span-2">
                                    <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Pembayaran</h4>
                                    <p className="text-xs font-black text-rose-500 bg-rose-50/50 border border-rose-100 px-2.5 py-1 rounded-lg w-fit">Rp {parseFloat(attendee.registration_data.total_price || attendee.form.ticket_price).toLocaleString('id-ID')}</p>
                                </div>
                            </div>

                            {attendee.payment_status === 'paid' && (settings.event_type === 'online' || settings.event_type === 'hybrid') && settings.event_platform && attendee.registration_data.attendance_mode === 'online' && (
                                <div className="mt-4 bg-cyan-50/50 border border-cyan-150 p-4 rounded-xl space-y-2 shadow-sm">
                                    <h5 className="text-[9px] font-bold uppercase tracking-wider text-cyan-800 flex items-center gap-1">
                                        🎥 Link & Detail Platform Streaming
                                    </h5>
                                    <p className="text-xs font-semibold text-slate-650">
                                        Platform: <span className="font-extrabold uppercase text-slate-800">{settings.event_platform === 'custom' ? settings.event_platform_custom_name : settings.event_platform.replace('_', ' ')}</span>
                                    </p>

                                    {settings.event_platform_url && (
                                        <div className="pt-1">
                                            <a
                                                href={settings.event_platform_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-block bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all"
                                            >
                                                Gabung Pertemuan / Stream Link
                                            </a>
                                        </div>
                                    )}

                                    {settings.event_platform === 'zoom' && (settings.event_platform_id || settings.event_platform_passcode) && (
                                        <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] font-semibold text-slate-500">
                                            {settings.event_platform_id && (
                                                <div>
                                                    <span className="block text-[8px] uppercase font-bold text-slate-400">Meeting ID</span>
                                                    <span className="font-bold text-slate-800 text-xs">{settings.event_platform_id}</span>
                                                </div>
                                            )}
                                            {settings.event_platform_passcode && (
                                                <div>
                                                    <span className="block text-[8px] uppercase font-bold text-slate-400">Passcode</span>
                                                    <span className="font-bold text-slate-800 text-xs">{settings.event_platform_passcode}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {((attendee.registration_data.selected_merchandise && Object.keys(attendee.registration_data.selected_merchandise).length > 0) || parseFloat(attendee.registration_data.donation_amount || '0') > 0 || (attendee.registration_data.additional_fees_breakdown && attendee.registration_data.additional_fees_breakdown.length > 0)) && (
                                        <div className="mt-4 border-t border-dashed border-slate-250 pt-3 space-y-2">
                                            {attendee.registration_data.selected_merchandise && Object.keys(attendee.registration_data.selected_merchandise).length > 0 && (
                                                <div>
                                                    <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Merchandise Tambahan:</h4>
                                                    <div className="space-y-1.5">
                                                        {Object.entries(attendee.registration_data.selected_merchandise).map(([key, item]: [string, any]) => (
                                                            <div key={key} className="flex justify-between bg-slate-50/50 border border-slate-150/60 p-2 px-3 rounded-lg text-xs font-bold text-slate-655">
                                                                <span>{item.name} {item.size ? `(Ukuran: ${item.size}${item.nickname ? `, Nama: ${item.nickname}` : ''})` : ''}</span>
                                                                <span className="font-bold text-slate-800">Rp {parseFloat(item.price).toLocaleString('id-ID')}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {attendee.registration_data.additional_fees_breakdown && attendee.registration_data.additional_fees_breakdown.length > 0 && (
                                                <div>
                                                    <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Biaya Tambahan:</h4>
                                                    <div className="space-y-1.5">
                                                        {attendee.registration_data.additional_fees_breakdown.map((fee: any, idx: number) => (
                                                            <div key={`fee-${idx}`} className="flex justify-between bg-slate-50/50 border border-slate-150/60 p-2 px-3 rounded-lg text-xs font-bold text-slate-655">
                                                                <span>💵 {fee.name}</span>
                                                                <span className="font-bold text-slate-800">Rp {parseFloat(fee.calculated).toLocaleString('id-ID')}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {parseFloat(attendee.registration_data.donation_amount || '0') > 0 && (
                                                <div>
                                                    <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Donasi Sukarela:</h4>
                                                    <div className="flex justify-between bg-slate-50/50 border border-slate-150/60 p-2 px-3 rounded-lg text-xs font-bold text-slate-655">
                                                        <span>🎁 Donasi untuk Event</span>
                                                        <span className="font-bold text-slate-800">Rp {parseFloat(attendee.registration_data.donation_amount).toLocaleString('id-ID')}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}            </div>
                            )}

                            {settings.event_location_map && attendee.registration_data.attendance_mode !== 'online' && (
                                <div className="mt-4 border-t border-dashed border-slate-250 pt-4 space-y-2 print:hidden">
                                    <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Peta Lokasi Acara:</h4>
                                    <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm h-48 bg-slate-100">
                                        <iframe
                                            src={settings.event_location_map}
                                            className="w-full h-full border-0"
                                            allowFullScreen={false}
                                            loading="lazy"
                                            referrerPolicy="no-referrer-when-downgrade"
                                            title="Lokasi Event"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Digital Signature Preview */}
                    {attendee.signature_path && (
                        <div className="bg-slate-50/50 p-4 flex justify-between items-center px-8 border-b border-slate-150/60 print:border-b-2">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-455">Tanda Tangan Digital Anda</span>
                            <div className="border border-slate-150 bg-white max-h-12 flex items-center justify-center p-1 rounded-lg">
                                <img src={attendee.signature_path} alt="Signature" className="max-h-10 object-contain" />
                            </div>
                        </div>
                    )}

                    {/* Bottom Info */}
                    <div className="p-6 md:p-8 bg-rose-50/20 border-t border-slate-100 print:hidden">
                        {parseFloat(attendee.registration_data.total_price || attendee.form.ticket_price) === 0 ? (
                            <div className="text-center py-4 space-y-3">
                                <div className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                                    ✓ Pendaftaran Terverifikasi Otomatis
                                </div>
                                <p className="text-xs font-semibold text-slate-500">E-Tiket resmi Anda telah aktif dan siap digunakan karena tidak ada pembayaran yang diperlukan.</p>
                            </div>
                        ) : attendee.payment_status === 'paid' ? (
                            attendee.payment_method === 'manual' ? (
                                <div className="space-y-6">
                                    <div className="bg-emerald-50/40 border border-emerald-100 p-4 rounded-xl flex flex-col gap-2 text-xs font-bold text-emerald-800">
                                        <div className="flex items-center gap-2">
                                            <Check className="h-5 w-5 text-emerald-600 stroke-[3] shrink-0" />
                                            <span>Pembayaran telah dikonfirmasi</span>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100">
                                        <button
                                            type="button"
                                            onClick={() => window.print()}
                                            className="w-full bg-gradient-to-r from-orange-500 to-rose-500 border-0 text-white py-4 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Download className="h-5 w-5" />
                                            Download E-Ticket
                                        </button>
                                        <span className="text-[10px] text-slate-455 mt-2 block text-center font-bold">
                                            Klik tombol di atas untuk mengunduh atau mencetak E-Tiket Anda.
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4 space-y-3">
                                    <div className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                                        ✓ Pembayaran Midtrans Lunas
                                    </div>
                                    <p className="text-xs font-semibold text-slate-550">E-Tiket resmi Anda telah aktif. Tunjukkan tiket ini pada pintu masuk acara.</p>
                                </div>
                            )
                        ) : (
                            <div className="text-center py-2">
                                <p className="text-xs font-black text-rose-500 animate-pulse uppercase tracking-wider">
                                    ⚠️ Harap lakukan pembayaran pada kotak petunjuk di bagian atas halaman untuk mengaktifkan E-Tiket Anda.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-center print:hidden flex flex-wrap justify-center gap-4">
                    <a
                        href="/"
                        className="inline-flex items-center gap-1.5 font-bold uppercase text-xs bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 px-5 py-2.5 rounded-xl shadow-sm transition-all"
                    >
                        <ArrowLeft className="h-4 w-4" /> Kembali ke Halaman Utama
                    </a>
                    <a
                        href={`https://wa.me/?text=${encodeURIComponent(`Halo, ini E-Tiket pendaftaran Zawawalk saya (${fullName}). Simpan link tiket ini: ${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-bold uppercase text-xs bg-emerald-500 text-white border-0 px-5 py-2.5 rounded-xl shadow-md hover:opacity-95 transition-all"
                    >
                        <MessageSquare className="h-4 w-4" /> Simpan / Share ke WA
                    </a>
                </div>

                <PublicFooter
                    socialMediaLinksSetting={settings.social_media_links}
                    eventTitle={settings.event_title}
                    eventOrganizedBy={settings.event_organized_by}
                    eventDevelopedBy={settings.event_developed_by}
                    eventOrganizedByUrl={settings.event_organized_by_url}
                    eventDevelopedByUrl={settings.event_developed_by_url}
                />
            </div>
        </div>
    );
}
