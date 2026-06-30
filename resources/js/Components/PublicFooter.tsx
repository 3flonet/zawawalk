import React from 'react';

interface SocialLink {
    name: string;
    url: string;
    username?: string;
    icon_path: string;
}

interface PublicFooterProps {
    socialMediaLinksSetting?: string;
    eventTitle?: string;
    eventOrganizedBy?: string;
    eventDevelopedBy?: string;
    eventOrganizedByUrl?: string;
    eventDevelopedByUrl?: string;
    transparent?: boolean;
}

export default function PublicFooter({ 
    socialMediaLinksSetting, 
    eventTitle = 'Zawawalk 2026',
    eventOrganizedBy,
    eventDevelopedBy,
    eventOrganizedByUrl,
    eventDevelopedByUrl,
    transparent = false
}: PublicFooterProps) {
    let socialLinks: SocialLink[] = [];
    
    try {
        if (socialMediaLinksSetting) {
            socialLinks = JSON.parse(socialMediaLinksSetting);
        }
    } catch (e) {
        console.error('Failed to parse social media links:', e);
    }

    const renderCredits = () => (
        <div className="flex flex-col items-center justify-center gap-4 mt-1 w-full text-center">
            {/* Layer 1: Copyright */}
            <div className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                &copy; {new Date().getFullYear()} {eventTitle}. All Rights Reserved.
            </div>

            {/* Layer 2: Credits (Organized By & Developed By) */}
            {(eventOrganizedBy || eventDevelopedBy) && (
                <div className="flex flex-row items-center justify-center gap-6 sm:gap-12 pt-3 border-t border-slate-100/50 w-full max-w-lg mx-auto text-[10px] uppercase tracking-wider">
                    {eventOrganizedBy && (
                        <div className="flex flex-col items-center justify-center gap-1">
                            <span className="text-slate-400 font-bold">Organized By</span>
                            {eventOrganizedByUrl ? (
                                <a href={eventOrganizedByUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-850 hover:underline transition-all font-black text-slate-800">
                                    {eventOrganizedBy}
                                </a>
                            ) : (
                                <span className="text-slate-800 font-black">{eventOrganizedBy}</span>
                            )}
                        </div>
                    )}
                    {eventOrganizedBy && eventDevelopedBy && <div className="h-6 w-px bg-slate-200"></div>}
                    {eventDevelopedBy && (
                        <div className="flex flex-col items-center justify-center gap-1">
                            <span className="text-slate-400 font-bold">Developed By</span>
                            {eventDevelopedByUrl ? (
                                <a href={eventDevelopedByUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-850 hover:underline transition-all font-black text-slate-800">
                                    {eventDevelopedBy}
                                </a>
                            ) : (
                                <span className="text-slate-800 font-black">{eventDevelopedBy}</span>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    if (!Array.isArray(socialLinks) || socialLinks.length === 0) {
        return (
            <footer className={`w-full py-8 mt-6 text-center ${transparent ? '' : 'border-t border-slate-100 bg-white/40 backdrop-blur-md'}`}>
                {renderCredits()}
            </footer>
        );
    }

    return (
        <footer className={`w-full py-10 mt-10 flex flex-col items-center justify-center gap-6 transition-all ${transparent ? '' : 'border-t border-slate-100 bg-white/50 backdrop-blur-md shadow-[0_-8px_30px_rgb(0,0,0,0.02)]'}`}>
            <div className="flex flex-wrap items-center justify-center gap-4 px-4">
                {socialLinks.map((link, idx) => (
                    <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-2.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-900 hover:border-slate-900 shadow-sm transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 text-slate-700 hover:text-white"
                    >
                        {link.icon_path ? (
                            <img
                                src={link.icon_path}
                                alt={link.name}
                                className="w-5 h-5 object-contain group-hover:invert group-hover:brightness-200 transition-all duration-300"
                            />
                        ) : (
                            <span className="w-5 h-5 flex items-center justify-center text-[10px] font-black uppercase bg-slate-100 group-hover:bg-slate-800 rounded-lg text-slate-500 group-hover:text-white transition-all">
                                {link.name.substring(0, 2)}
                            </span>
                        )}
                        <div className="flex flex-col items-start leading-none">
                            <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 group-hover:text-slate-500 transition-all">
                                {link.name}
                            </span>
                            <span className="text-[11px] font-bold mt-0.5">
                                {link.username || link.name}
                            </span>
                        </div>
                    </a>
                ))}
            </div>
            
            {renderCredits()}
        </footer>
    );
}
