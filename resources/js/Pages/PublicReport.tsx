import React, { useMemo, useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import PublicFooter from '@/Components/PublicFooter';
import { TrendingUp, Wallet, Users, Package, Gift, RefreshCcw, FileText, Wifi, WifiOff, Power } from 'lucide-react';
import ExcelJS from 'exceljs';
// @ts-ignore
import { saveAs } from 'file-saver';
import echo from '../echo';

interface Attendee {
    id: number;
    ticket_code: string;
    payment_status: string;
    checked_in: boolean;
    checked_in_at?: string;
    registration_data: any;
    created_at: string;
}

export default function PublicReport({ settings, attendees }: { settings: any, attendees: Attendee[] }) {
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [reportTab, setReportTab] = useState<'revenue' | 'checkin'>('revenue');
    const [isConnected, setIsConnected] = useState(false);
    const [realtimeStopped, setRealtimeStopped] = useState(false);
    const [stopMessage, setStopMessage] = useState('');

    // Check realtime_stop_at on load
    useEffect(() => {
        const stopAt = settings.realtime_stop_at;
        const isEnabled = settings.realtime_enabled !== '0';

        if (!isEnabled) {
            setRealtimeStopped(true);
            setStopMessage('Realtime telah dinonaktifkan oleh Admin. Data tidak diperbarui secara otomatis.');
            return;
        }

        if (stopAt) {
            const stopTime = new Date(stopAt).getTime();
            if (Date.now() >= stopTime) {
                setRealtimeStopped(true);
                setStopMessage('Sesi realtime telah berakhir secara otomatis.');
                return;
            }
            const delay = stopTime - Date.now();
            const timer = setTimeout(() => {
                setRealtimeStopped(true);
                setStopMessage('Sesi realtime telah berakhir secara otomatis.');
            }, delay);
            return () => clearTimeout(timer);
        }
    }, []);

    // Laravel Echo — WebSocket listeners
    useEffect(() => {
        const pusher = echo.connector.pusher;

        // Fix race condition: check current state immediately on mount
        if (pusher.connection.state === 'connected') setIsConnected(true);

        pusher.connection.bind('connected', () => setIsConnected(true));
        pusher.connection.bind('disconnected', () => setIsConnected(false));
        pusher.connection.bind('unavailable', () => setIsConnected(false));
        pusher.connection.bind('failed', () => setIsConnected(false));

        // Listen for attendee data changes and re-fetch only attendees prop
        echo.channel('public-report').listen('.attendee.updated', () => {
            router.reload({
                only: ['attendees'],
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setLastUpdated(new Date()),
            } as any);
        });

        // Listen for realtime control commands
        echo.channel('realtime-control').listen('.status.changed', (data: { active: boolean; message: string }) => {
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
            echo.leaveChannel('public-report');
            echo.leaveChannel('realtime-control');
        };
    }, []);

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
        
        // Controller already filters 'paid', but doing it again just in case
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
        worksheet.mergeCells('A1:G1');
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
        worksheet.mergeCells('A8:G8');
        const tableTitle = worksheet.getCell('A8');
        tableTitle.value = 'DETAILED PARTICIPANT BREAKDOWN (PAID ONLY)';
        tableTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
        tableTitle.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        tableTitle.alignment = { horizontal: 'center', vertical: 'middle' };

        // Columns for Details
        const headerRow = worksheet.addRow(['KODE TIKET', 'NAMA PESERTA', 'TIKET', 'MERCHANDISE', 'BIAYA TAMBAHAN', 'DONASI', 'TOTAL BAYAR']);
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
            { width: 25 }, // BIAYA TAMBAHAN
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
                const additionalFees = parseFloat(data.additional_fees) || 0;
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
                    `Rp ${additionalFees.toLocaleString('id-ID')}`,
                    `Rp ${donation.toLocaleString('id-ID')}`,
                    `Rp ${total.toLocaleString('id-ID')}`
                ]);

                row.eachCell(cell => {
                    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                    cell.alignment = { wrapText: true, vertical: 'top' };
                });
            });

            // Add Grand Total row at the end
            const grandTotalRow = worksheet.addRow([
                '', '', '', '', '', 'GRAND TOTAL REVENUE', `Rp ${reportData.totalRevenue.toLocaleString('id-ID')}`
            ]);
            
            grandTotalRow.getCell(6).font = { bold: true };
            grandTotalRow.getCell(6).alignment = { horizontal: 'right' };
            grandTotalRow.getCell(7).font = { bold: true };
            grandTotalRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFDE00' } };
            grandTotalRow.getCell(7).border = { top: {style:'thick'}, left: {style:'thick'}, bottom: {style:'thick'}, right: {style:'thick'} };
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Revenue_Report_${new Date().getTime()}.xlsx`);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
            <Head title={`Laporan Peserta - ${settings.event_title || 'Zawawalk'}`}>
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
                <meta property="og:title" content={settings.og_title ? `Laporan - ${settings.og_title}` : 'Real-Time Revenue Report'} />
                <meta property="og:description" content={settings.og_description || ''} />
                <meta property="og:image" content={settings.og_image || settings.event_banner || ''} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={settings.og_title ? `Laporan - ${settings.og_title}` : 'Real-Time Revenue Report'} />
                <meta name="twitter:description" content={settings.og_description || ''} />
                <meta name="twitter:image" content={settings.og_image || settings.event_banner || ''} />
            </Head>

            <div className="max-w-6xl mx-auto p-4 md:p-8">
                {/* Realtime Stopped Banner */}
                {realtimeStopped && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 px-5 py-3.5 rounded-2xl flex items-center gap-3 mb-6 shadow-sm">
                        <Power className="h-4 w-4 shrink-0" />
                        <p className="text-xs font-bold">{stopMessage}</p>
                    </div>
                )}

                {/* Header Section */}
                <div className="bg-white border border-slate-100 p-6 md:p-8 rounded-2xl shadow-sm mb-8 relative">
                    <div className="absolute -top-3 -left-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-black px-4 py-1.5 text-xs uppercase rotate-[-2deg] rounded-lg shadow-md">
                        LIVE REPORT
                    </div>
                    
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-2">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight leading-none mb-2 text-slate-800">
                                {settings.event_title || 'Zawawalk Event'}
                            </h1>
                            <p className="text-slate-500 font-semibold text-xs max-w-xl mt-1">
                                Real-Time Revenue & Participant Report. Data automatically syncs with the server.
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0 w-full md:w-auto">
                            <button
                                onClick={exportReportToExcel}
                                className="bg-emerald-500 text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 w-full md:w-auto"
                            >
                                <FileText className="h-4 w-4" />
                                Export Report Excel
                            </button>
                            <div className="flex gap-2 w-full justify-end">
                                {/* WebSocket status */}
                                <div className={`px-3 py-2 text-[10px] font-bold flex items-center gap-1.5 rounded-xl border transition-colors ${
                                    isConnected
                                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                        : 'bg-rose-50 border-rose-100 text-rose-600'
                                }`}>
                                    {isConnected ? (
                                        <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block"></span> WebSocket Live</>
                                    ) : (
                                        <><WifiOff className="h-3 w-3" /> Menghubungkan...</>
                                    )}
                                </div>
                                <div className="bg-slate-100 text-slate-600 px-4 py-2 text-[10px] font-bold flex items-center gap-2 rounded-xl border border-slate-150">
                                    <RefreshCcw className="h-3 w-3" />
                                    <span>Last Sync: {lastUpdated.toLocaleTimeString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Report Copied from Admin */}
                <div className="space-y-6">
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
                    <div className="flex border-b border-slate-200 mt-6 w-fit bg-slate-100 rounded-xl p-1">
                        <button 
                            onClick={() => setReportTab('revenue')}
                            className={`px-4 py-2 font-bold text-xs uppercase rounded-lg transition-all ${reportTab === 'revenue' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-550 hover:text-slate-800'}`}
                        >
                            Detailed Revenue
                        </button>
                        <button 
                            onClick={() => setReportTab('checkin')}
                            className={`px-4 py-2 font-bold text-xs uppercase rounded-lg transition-all ${reportTab === 'checkin' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-550 hover:text-slate-800'}`}
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
                                        <th className="p-3 border-r border-slate-100">Biaya Tambahan</th>
                                        <th className="p-3 border-r border-slate-100">Donasi</th>
                                        <th className="p-3 bg-amber-50/40">Total Bayar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.validAttendees.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-6 text-center font-bold text-slate-505 text-xs">Belum ada peserta yang lunas.</td>
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
                                                        <div key={idx} className="flex justify-between items-center text-[10px] mt-1 first:mt-0 text-slate-600">
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
                                                        {data.voucher_code && (
                                                            <span className="block text-[9px] text-emerald-600 font-extrabold uppercase mt-1">🎟️ {data.voucher_code}</span>
                                                        )}
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
                                                    <td className="p-3 border-r border-slate-100">
                                                        {data.additional_fees_breakdown && data.additional_fees_breakdown.length > 0 ? (
                                                            <div className="space-y-1">
                                                                {data.additional_fees_breakdown.map((fee: any, idx: number) => (
                                                                    <div key={idx} className="flex justify-between items-center text-[10px] text-slate-600">
                                                                        <span>- {fee.name}</span>
                                                                        <span>Rp {parseFloat(fee.calculated).toLocaleString('id-ID')}</span>
                                                                    </div>
                                                                ))}
                                                                <div className="border-t border-slate-150 pt-1 mt-1 font-black flex justify-between items-center text-slate-800">
                                                                    <span>Total:</span>
                                                                    <span>Rp {(parseFloat(data.additional_fees) || 0).toLocaleString('id-ID')}</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 font-normal">-</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 border-r border-slate-100">Rp {donation.toLocaleString('id-ID')}</td>
                                                    <td className="p-3 bg-amber-50/20">
                                                        <span>Rp {total.toLocaleString('id-ID')}</span>
                                                        {data.discount_amount && parseFloat(data.discount_amount) > 0 && (
                                                            <span className="block text-[9px] text-emerald-600 font-black mt-1 bg-emerald-50 border border-emerald-100 px-1 py-0.5 rounded w-fit">
                                                                Diskon: -Rp {parseFloat(data.discount_amount).toLocaleString('id-ID')}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                                {reportData.validAttendees.length > 0 && (
                                    <tfoot>
                                        <tr className="bg-slate-850 text-white text-xs uppercase font-black">
                                            <td colSpan={5} className="p-3 text-right">Grand Total Revenue:</td>
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
                                <h5 className="font-black text-sm uppercase">Status Pengambilan Racepack (Peserta Lunas)</h5>
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
                                                <td colSpan={4} className="p-6 text-center font-bold text-slate-550 text-xs">Belum ada pendaftar lunas.</td>
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
