import React, { useEffect, useState, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import PublicFooter from '@/Components/PublicFooter';
import { RefreshCcw, Sparkles, CheckCircle2, User, WifiOff, Power } from 'lucide-react';
import echo from '../echo';

interface Attendee {
    id: number;
    name: string;
    photo: string | null;
    checked_in_at: string;
    timestamp: number;
}

interface RealtimeStatus {
    active: boolean;
    stop_at: string | null;
    message: string;
}

export default function LiveCheckIn({
    settings,
    attendees: initialAttendees,
}: {
    settings: any;
    attendees: Attendee[];
}) {
    const itemsPerPage = 20;
    const [attendees, setAttendees] = useState<Attendee[]>(initialAttendees);
    const [currentPage, setCurrentPage] = useState(0);
    const prevCountRef = useRef(initialAttendees.length);
    const [lastSync, setLastSync] = useState<Date>(new Date());
    const [isConnected, setIsConnected] = useState(false);
    const [realtimeStopped, setRealtimeStopped] = useState(false);
    const [stopMessage, setStopMessage] = useState('');

    const totalPages = Math.max(1, Math.ceil(attendees.length / itemsPerPage));

    // Check realtime_stop_at on load — if already past, show stopped overlay
    useEffect(() => {
        const stopAt = settings.realtime_stop_at;
        const isEnabled = settings.realtime_enabled !== '0';

        if (!isEnabled) {
            setRealtimeStopped(true);
            setStopMessage('Sesi realtime telah dinonaktifkan oleh Admin.');
            return;
        }

        if (stopAt) {
            const stopTime = new Date(stopAt).getTime();
            if (Date.now() >= stopTime) {
                setRealtimeStopped(true);
                setStopMessage('Sesi realtime telah berakhir secara otomatis.');
                return;
            }

            // Schedule auto-stop
            const delay = stopTime - Date.now();
            const timer = setTimeout(() => {
                setRealtimeStopped(true);
                setStopMessage('Sesi realtime telah berakhir secara otomatis.');
            }, delay);
            return () => clearTimeout(timer);
        }
    }, []);

    // Reset to page 0 if new attendees arrive
    useEffect(() => {
        if (attendees.length > prevCountRef.current) {
            setCurrentPage(0);
        }
        prevCountRef.current = attendees.length;
    }, [attendees.length]);

    // Auto-slide every 8 seconds
    useEffect(() => {
        if (totalPages <= 1) return;
        const slideInterval = setInterval(() => {
            setCurrentPage((prev) => (prev + 1) % totalPages);
        }, 8000);
        return () => clearInterval(slideInterval);
    }, [totalPages]);

    // Laravel Echo — WebSocket listeners
    useEffect(() => {
        const pusher = echo.connector.pusher;

        // Fix race condition: check current state immediately on mount
        if (pusher.connection.state === 'connected') setIsConnected(true);

        pusher.connection.bind('connected', () => setIsConnected(true));
        pusher.connection.bind('disconnected', () => setIsConnected(false));
        pusher.connection.bind('unavailable', () => setIsConnected(false));
        pusher.connection.bind('failed', () => setIsConnected(false));

        const channel = echo.channel('live-checkin');

        // New attendee checked in
        channel.listen('.attendee.checked-in', (data: { attendee: Attendee }) => {
            setLastSync(new Date());
            setAttendees((prev) => {
                // Avoid duplicates
                if (prev.some((a) => a.id === data.attendee.id)) return prev;
                return [data.attendee, ...prev];
            });
        });

        // Listen for realtime control commands
        const controlChannel = echo.channel('realtime-control');
        controlChannel.listen('.status.changed', (data: RealtimeStatus) => {
            if (!data.active) {
                setRealtimeStopped(true);
                setStopMessage(data.message || 'Sesi realtime telah dihentikan oleh Admin.');
            } else {
                setRealtimeStopped(false);
                setStopMessage('');
            }
        });

        return () => {
            pusher.connection.unbind('connected');
            pusher.connection.unbind('disconnected');
            pusher.connection.unbind('unavailable');
            pusher.connection.unbind('failed');
            echo.leaveChannel('live-checkin');
            echo.leaveChannel('realtime-control');
        };
    }, []);

    const displayedAttendees = attendees.slice(
        currentPage * itemsPerPage,
        (currentPage + 1) * itemsPerPage
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20 relative overflow-hidden">
            <Head title={`Live Check-in - ${settings.event_title || 'Zawawalk'}`}>
                {settings.event_favicon && (
                    <link rel="icon" type="image/x-icon" href={settings.event_favicon} />
                )}
                <meta name="description" content={settings.meta_description || ''} />
                <meta name="keywords" content={settings.meta_keywords || 'zawawalk, fun walk'} />
                <meta name="robots" content="noindex, nofollow" />
                <meta property="og:type" content="website" />
                <meta property="og:site_name" content={settings.event_title || 'Zawawalk'} />
                <meta property="og:locale" content="id_ID" />
                <meta property="og:title" content={settings.og_title ? `Checkin - ${settings.og_title}` : 'Live Check-in'} />
                <meta property="og:description" content={settings.og_description || ''} />
                <meta property="og:image" content={settings.og_image || settings.event_banner || ''} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={settings.og_title ? `Checkin - ${settings.og_title}` : 'Live Check-in'} />
                <meta name="twitter:description" content={settings.og_description || ''} />
                <meta name="twitter:image" content={settings.og_image || settings.event_banner || ''} />
            </Head>

            {/* Background decorative shapes */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-200/20 rounded-full filter blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-200/10 rounded-full filter blur-3xl pointer-events-none translate-x-1/2 translate-y-1/2"></div>

            {/* Realtime Stopped Overlay */}
            {realtimeStopped && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-10 text-center max-w-md shadow-2xl border border-slate-100">
                        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-rose-100">
                            <Power className="h-10 w-10 text-rose-500" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase mb-2">Sesi Berakhir</h2>
                        <p className="text-sm text-slate-500 font-semibold mb-1">{stopMessage}</p>
                        <p className="text-xs text-slate-400 mt-4">
                            {settings.event_title || 'Zawawalk Event'}
                        </p>
                    </div>
                </div>
            )}

            <div className="relative min-h-screen flex flex-col p-4 md:p-8 max-w-[1600px] mx-auto z-10">
                {/* Header */}
                <header className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xl shadow-slate-100/35 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-center md:text-left">
                        <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-extrabold px-4 py-1.5 text-xs rounded-full shadow-md uppercase tracking-wider mb-3">
                            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                            Live Racepack Pick-Up • {attendees.length} Peserta
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-none">
                            {settings.event_title || 'Zawawalk Event'}
                        </h1>
                    </div>

                    <div className="flex flex-col items-center md:items-end gap-3 shrink-0">
                        {settings.event_logo ? (
                            <img src={settings.event_logo} alt="Event Logo" className="h-14 object-contain" />
                        ) : (
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{settings.event_title ? settings.event_title.split(':')[0] : 'Zawawalk'}</span>
                        )}
                        <div className="flex items-center gap-3">
                            {/* Pagination Indicator */}
                            {totalPages > 1 && (
                                <div className="flex gap-2">
                                    {Array.from({ length: totalPages }).map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentPage(i)}
                                            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === currentPage ? 'bg-indigo-600 w-6 shadow-sm shadow-indigo-600/20' : 'bg-slate-200 hover:bg-slate-300'}`}
                                            aria-label={`Go to page ${i + 1}`}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Connection status badge */}
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-xl border transition-colors ${
                                isConnected
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                    : 'bg-rose-50 border-rose-100 text-rose-600'
                            }`}>
                                {isConnected ? (
                                    <>
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block"></span>
                                        WebSocket Live
                                    </>
                                ) : (
                                    <>
                                        <WifiOff className="h-3 w-3" />
                                        Menghubungkan...
                                    </>
                                )}
                            </div>

                            <div className="bg-slate-50 border border-slate-100 text-slate-500 px-3 py-1.5 text-[10px] font-bold flex items-center gap-1.5 rounded-xl shadow-inner">
                                <RefreshCcw className="h-3 w-3 text-indigo-500" />
                                <span>Sync: {lastSync.toLocaleTimeString('id-ID')}</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-grow">
                    {attendees.length === 0 ? (
                        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-100/35 p-8 text-center max-w-lg mx-auto">
                            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-4 animate-bounce">
                                <User className="h-10 w-10" />
                            </div>
                            <h2 className="text-xl font-extrabold text-slate-900 uppercase">Belum ada pengambilan</h2>
                            <p className="text-slate-500 font-semibold text-xs mt-1.5">Menunggu penyerahan racepack di loket registrasi...</p>
                        </div>
                    ) : (
                        <div
                            key={`page-${currentPage}`}
                            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"
                        >
                            {displayedAttendees.map((att, index) => {
                                const isNewest = currentPage === 0 && index === 0;
                                return (
                                    <div
                                        key={att.id}
                                        className={`bg-white border border-slate-100/80 rounded-2xl p-4 flex flex-col transform transition-all duration-500 relative shadow-sm hover:shadow-md ${isNewest ? 'ring-4 ring-orange-500/20 scale-105 z-10 border-orange-200' : ''}`}
                                        style={{ animation: `fadeIn ${0.2 + index * 0.05}s ease-out forwards` }}
                                    >
                                        {isNewest && (
                                            <div className="absolute -top-3 right-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-extrabold px-3 py-1 text-[9px] rounded-full shadow-md uppercase tracking-wider z-20 animate-bounce flex items-center gap-1">
                                                <CheckCircle2 className="h-3 w-3" />
                                                DIAMBIL!
                                            </div>
                                        )}
                                        <div className="aspect-square bg-slate-50 rounded-xl mb-4 overflow-hidden relative border border-slate-100">
                                            {att.photo ? (
                                                <img src={att.photo} alt={att.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-4xl font-extrabold text-slate-300 uppercase bg-gradient-to-br from-slate-50 to-slate-100">
                                                    {att.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-center flex-grow flex flex-col justify-between">
                                            <div>
                                                <p className="text-[10px] font-extrabold text-orange-500 uppercase tracking-wide mb-1 flex items-center justify-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block"></span>
                                                    Selamat Berolahraga
                                                </p>
                                                <h3 className="text-sm font-extrabold text-slate-850 uppercase leading-snug line-clamp-2" title={att.name}>{att.name}</h3>
                                            </div>
                                            <div className="mt-4 text-[9px] font-bold text-slate-450 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg inline-block mx-auto">
                                                Telah Diambil • {att.checked_in_at}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>

                {totalPages > 1 && (
                    <div className="mt-6 text-center text-xs font-bold text-slate-400">
                        Halaman {currentPage + 1} / {totalPages}
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

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(15px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}
