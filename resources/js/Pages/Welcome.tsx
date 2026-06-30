import React, { useRef, useState, useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import PublicFooter from '@/Components/PublicFooter';
import { 
    Sparkles, 
    Calendar, 
    MapPin, 
    Clock, 
    Shirt, 
    PenTool, 
    ArrowRight, 
    CheckCircle2, 
    HelpCircle, 
    ChevronRight,
    Camera,
    X
} from 'lucide-react';

interface Field {
    name: string;
    label: string;
    type: 'text' | 'number' | 'email' | 'select' | 'signature' | 'textarea' | 'image' | 'date' | 'datetime' | 'multiselect' | 'title' | 'description' | 'phone' | 'url' | 'rating' | 'checkbox';
    options?: string[];
    required: boolean;
    allow_other?: boolean;
    placeholder?: string;
    help_text?: string;
    description?: string;
}

interface WelcomeProps {
    canLogin: boolean;
    canRegister: boolean;
    settings: {
        event_title: string;
        event_description: string;
        event_date: string;
        event_time: string;
        event_location: string;
        event_dresscode: string;
        event_banner: string;
        event_logo?: string;
        event_favicon?: string;
        event_type?: string;
        event_platform?: string;
        event_platform_url?: string;
        event_platform_id?: string;
        event_platform_passcode?: string;
        event_platform_custom_name?: string;
        online_ticket_type?: string;
        online_ticket_price?: string;
        enable_payment_manual?: string;
        enable_payment_midtrans?: string;
        event_location_map?: string;
        event_venue_name?: string;
        event_venue_address?: string;
        funwalk_route_image?: string;
        funwalk_route_description?: string;
        funwalk_racepack_image?: string;
        funwalk_racepack_info?: string;
        funwalk_schedule?: string;
        funwalk_faq?: string;
        funwalk_terms?: string;
        funwalk_contact?: string;
        funwalk_map_center?: string;
        funwalk_map_zoom?: string;
        funwalk_map_route?: string;
        funwalk_map_markers?: string;
        [key: string]: any;
    };
    activeForm: {
        id: number;
        title: string;
        ticket_price: string;
        fields_schema: Field[];
        max_participants?: number | null;
        closed_at?: string | null;
        attendees_count?: number;
        additional_fees?: { name: string; type: 'fixed' | 'percent'; value: number | string }[] | null;
    } | null;
    merchandisePlugin?: {
        id: string;
        name: string;
        is_active: boolean;
        settings: {
            [key: string]: {
                enabled: boolean;
                required: boolean;
                price: number;
                name?: string;
                description?: string;
                sizes?: string[] | string;
                image?: string;
            }
        };
    } | null;
    donationPlugin?: {
        id: string;
        name: string;
        is_active: boolean;
        settings: any;
    } | null;
}

export default function Welcome({ canLogin, canRegister, settings, activeForm, merchandisePlugin, donationPlugin }: WelcomeProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const [dynamicLoading, setDynamicLoading] = useState<{ [key: string]: boolean }>({});
    const [dynamicPreviews, setDynamicPreviews] = useState<{ [key: string]: string }>({});
    const [currentStep, setCurrentStep] = useState(1);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [wantsMerchandise, setWantsMerchandise] = useState<boolean | null>(null);
    const [wantsDonation, setWantsDonation] = useState<boolean | null>(null);
    // Per-field inline validation errors
    const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
    // Tracks the custom "Lainnya" text for select fields with allow_other enabled
    const [otherValues, setOtherValues] = useState<{ [key: string]: string }>({});  
    const [showSizeChart, setShowSizeChart] = useState<{ [key: string]: boolean }>({});
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [step4EnteredAt, setStep4EnteredAt] = useState<number>(0);

    // Parse and group sponsors
    const groupedSponsors = React.useMemo(() => {
        try {
            if (!settings.event_sponsors) return {};
            const list = JSON.parse(settings.event_sponsors);
            if (!Array.isArray(list)) return {};
            
            const groups: Record<string, any[]> = {};
            list.forEach(sp => {
                if (!sp.category || !sp.name) return;
                if (!groups[sp.category]) {
                    groups[sp.category] = [];
                }
                groups[sp.category].push(sp);
            });
            return groups;
        } catch (e) {
            return {};
        }
    }, [settings.event_sponsors]);

    const categoryOrder = React.useMemo(() => {
        const predefined = ['Platinum', 'Gold', 'Silver', 'Bronze', 'Media Partner', 'Supported By'];
        const keys = Object.keys(groupedSponsors);
        
        // Include predefined tiers that have sponsors, then append custom tiers
        const ordered = predefined.filter(cat => keys.includes(cat));
        const custom = keys.filter(cat => !predefined.includes(cat));
        
        return [...ordered, ...custom];
    }, [groupedSponsors]);

    const hasRequiredMerch = () => {
        if (!merchandisePlugin?.is_active || !merchandisePlugin.settings) return false;
        return ['kaos', 'jaket', 'jersey', 'emoney', 'tumbler'].some(item => {
            const itemConfig = merchandisePlugin.settings[item];
            if (itemConfig && (itemConfig.enabled === true || String(itemConfig.enabled) === 'true')) {
                return (itemConfig.required as any) === true || (itemConfig.required as any) === 'true' || (itemConfig.required as any) === 1 || String(itemConfig.required) === '1';
            }
            return false;
        });
    };

    const handleSelectWantsMerch = (wants: boolean) => {
        if (wants) {
            setWantsMerchandise(true);
        } else {
            setWantsMerchandise(false);
            // Deselect all
            ['kaos', 'jaket', 'jersey', 'emoney', 'tumbler'].forEach(item => {
                setData(`merch_${item}_selected`, false);
            });
            // Advance to next step
            if (donationPlugin?.is_active) {
                setCurrentStep(3);
                setWantsDonation(null);
            } else {
                setCurrentStep(4);
            }
        }
    };

    const handleSelectWantsDonation = (wants: boolean) => {
        if (wants) {
            setWantsDonation(true);
        } else {
            setWantsDonation(false);
            setData('donation_amount', '');
            // Advance to Step 4
            setCurrentStep(4);
        }
    };

    const handleDynamicFileChange = (fieldName: string, file: File | null) => {
        if (!file) {
            setData(fieldName, null);
            setDynamicPreviews(prev => {
                const next = { ...prev };
                delete next[fieldName];
                return next;
            });
            return;
        }

        setDynamicLoading(prev => ({ ...prev, [fieldName]: true }));

        setTimeout(() => {
            setData(fieldName, file);

            const reader = new FileReader();
            reader.onloadend = () => {
                setDynamicPreviews(prev => ({ ...prev, [fieldName]: reader.result as string }));
            };
            reader.readAsDataURL(file);

            setDynamicLoading(prev => ({ ...prev, [fieldName]: false }));
        }, 1000);
    };

    // Find dynamic signature field if exists
    const signatureField = activeForm?.fields_schema.find(f => f.type === 'signature');
    const signatureFieldName = signatureField ? 'field_' + signatureField.name : '';

    // --- Registration closed status computation ---
    const computeClosedReason = (): { closed: boolean; reason: 'quota' | 'deadline' | 'manual' | null; message: string } => {
        if (!activeForm) return { closed: false, reason: null, message: '' };

        // Check quota
        if (activeForm.max_participants != null && (activeForm.attendees_count ?? 0) >= activeForm.max_participants) {
            return {
                closed: true,
                reason: 'quota',
                message: `Mohon maaf, pendaftaran telah ditutup karena kuota peserta (${activeForm.max_participants} orang) telah terpenuhi. Terima kasih atas antusiasme Anda!`,
            };
        }

        // Check deadline
        if (activeForm.closed_at) {
            const deadline = new Date(activeForm.closed_at);
            if (new Date() > deadline) {
                const fmt = new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeStyle: 'short' }).format(deadline);
                return {
                    closed: true,
                    reason: 'deadline',
                    message: `Mohon maaf, pendaftaran telah ditutup karena batas waktu pendaftaran telah berakhir pada ${fmt}. Sampai jumpa di event berikutnya!`,
                };
            }
        }

        return { closed: false, reason: null, message: '' };
    };

    const { closed: registrationClosed, reason: closedReason, message: closedMessage } = computeClosedReason();
    // -------------------------------------------

    const isManualEnabled = settings.enable_payment_manual !== '0' && settings.enable_payment_manual !== 'false';
    const isMidtransEnabled = settings.enable_payment_midtrans === '1' || settings.enable_payment_midtrans === 'true';
    const defaultPaymentMethod = isManualEnabled ? 'manual' : (isMidtransEnabled ? 'midtrans' : 'manual');

    // Initializing form data dynamically based on fields
    const initialFields: { [key: string]: any } = {
        payment_method: defaultPaymentMethod,
        payment_proof: null as File | null,
        donation_amount: '',
        // For hybrid events, default to empty so user must actively choose
        attendance_mode: settings.event_type === 'online' ? 'online' : (settings.event_type === 'offline' ? 'offline' : ''),
    };

    if (activeForm) {
        activeForm.fields_schema.forEach(field => {
            initialFields['field_' + field.name] = '';
        });
    }

    if (activeForm && merchandisePlugin?.is_active && merchandisePlugin.settings) {
        ['kaos', 'jaket', 'jersey', 'emoney', 'tumbler'].forEach(item => {
            const itemConfig = merchandisePlugin.settings[item];
            if (itemConfig && (itemConfig.enabled === true || String(itemConfig.enabled) === 'true')) {
                const isRequired = (itemConfig.required as any) === true || (itemConfig.required as any) === 'true' || (itemConfig.required as any) === 1 || String(itemConfig.required) === '1';
                initialFields[`merch_${item}_selected`] = isRequired;
                if (['kaos', 'jaket', 'jersey'].includes(item)) {
                    let sizesArr: string[] = [];
                    if (itemConfig.sizes) {
                        sizesArr = Array.isArray(itemConfig.sizes) 
                            ? itemConfig.sizes 
                            : String(itemConfig.sizes).split(',').map((s: string) => s.trim());
                    }
                    initialFields[`merch_${item}_size`] = sizesArr.length > 0 ? sizesArr[0] : '';
                    initialFields[`merch_${item}_nickname`] = '';
                }
            }
        });
    }

    const { data, setData, post, processing, errors, reset } = useForm(initialFields);

    const [elevations, setElevations] = useState<number[]>([]);
    const [elevationLoading, setElevationLoading] = useState(false);

    useEffect(() => {
        const L = (window as any).L;
        if (!L || !settings.funwalk_map_center) return;

        // Parse center coordinates
        const centerParts = settings.funwalk_map_center.split(',').map(s => parseFloat(s.trim()));
        if (centerParts.length !== 2 || isNaN(centerParts[0]) || isNaN(centerParts[1])) return;
        const center: [number, number] = [centerParts[0], centerParts[1]];
        const zoom = parseInt(settings.funwalk_map_zoom || '14', 10) || 14;

        // Initialize map
        const map = L.map('funwalk-map').setView(center, zoom);

        // Add OSM Tile Layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Setup custom default icon to avoid path issues
        const defaultIcon = L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        // Add Route Polyline if exists
        if (settings.funwalk_map_route) {
            const routeCoords: [number, number][] = [];
            settings.funwalk_map_route.split('\n').forEach(line => {
                const parts = line.split(',').map(s => parseFloat(s.trim()));
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    routeCoords.push([parts[0], parts[1]]);
                }
            });
            if (routeCoords.length > 0) {
                L.polyline(routeCoords, {
                    color: '#f43f5e', // rose-500 matching the vibrance theme
                    weight: 5,
                    opacity: 0.85
                }).addTo(map);
            }
        }

        // Add Markers if exists
        if (settings.funwalk_map_markers) {
            settings.funwalk_map_markers.split('\n').forEach(line => {
                const parts = line.split('|').map(s => s.trim());
                if (parts.length >= 2) {
                    const lat = parseFloat(parts[0]);
                    const lng = parseFloat(parts[1]);
                    if (!isNaN(lat) && !isNaN(lng)) {
                        const title = parts[2] || '';
                        const desc = parts[3] || '';
                        const marker = L.marker([lat, lng], { icon: defaultIcon }).addTo(map);
                        if (title || desc) {
                            marker.bindPopup(`
                                <div class="p-1 font-sans">
                                    <h5 class="font-extrabold text-xs text-slate-800 uppercase tracking-tight m-0">${title}</h5>
                                    ${desc ? `<p class="text-[10px] text-slate-500 font-medium m-0 mt-1">${desc}</p>` : ''}
                                </div>
                            `);
                        }
                    }
                }
            });
        }

        return () => {
            map.remove();
        };
    }, [settings.funwalk_map_center, settings.funwalk_map_zoom, settings.funwalk_map_route, settings.funwalk_map_markers]);

    useEffect(() => {
        if (!settings.funwalk_map_route) {
            setElevations([]);
            return;
        }

        // Parse coordinates
        const coords: { latitude: number; longitude: number }[] = [];
        settings.funwalk_map_route.split('\n').forEach(line => {
            const parts = line.split(',').map(s => parseFloat(s.trim()));
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                coords.push({ latitude: parts[0], longitude: parts[1] });
            }
        });

        if (coords.length === 0) {
            setElevations([]);
            return;
        }

        setElevationLoading(true);

        // Fallback simulation generator
        const runSimulation = () => {
            const baseElev = 45 + Math.abs(coords[0].latitude * 10) % 50; // semi-random base
            const simulated = coords.map((c, i) => {
                const angle = (i / coords.length) * Math.PI * 2.5;
                const sineWave = Math.sin(angle) * 20;
                const secondaryWave = Math.cos(angle * 3) * 8;
                const coordNoise = (Math.abs(c.latitude + c.longitude) * 1000) % 5;
                return Math.round(baseElev + sineWave + secondaryWave + coordNoise);
            });
            setElevations(simulated);
            setElevationLoading(false);
        };

        // Fetch from Open-Elevation API (capped at 80 points to avoid payload/timeout issues)
        const fetchCoords = coords.slice(0, 80);
        fetch('https://api.open-elevation.com/api/v1/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ locations: fetchCoords })
        })
            .then(res => {
                if (!res.ok) throw new Error('API failed');
                return res.json();
            })
            .then(resData => {
                if (resData && Array.isArray(resData.results)) {
                    const elvs = resData.results.map((r: any) => Math.round(r.elevation || 0));
                    if (coords.length > 80) {
                        const scale = coords.length / elvs.length;
                        const interpolated = coords.map((_, i) => {
                            const sourceIdx = Math.min(Math.floor(i / scale), elvs.length - 1);
                            return elvs[sourceIdx];
                        });
                        setElevations(interpolated);
                    } else {
                        setElevations(elvs);
                    }
                } else {
                    runSimulation();
                }
            })
            .catch(() => {
                runSimulation();
            })
            .finally(() => {
                setElevationLoading(false);
            });
    }, [settings.funwalk_map_route]);

    const isInitialMount = useRef(true);
    useEffect(() => {
        if (currentStep === 4) {
            setStep4EnteredAt(Date.now());
        } else {
            setStep4EnteredAt(0);
        }
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        const container = document.getElementById('registration-form-container');
        if (container) {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [currentStep]);

    const getAdditionalFeesList = () => {
        let baseTicketPrice = parseFloat(activeForm?.ticket_price || '0');
        if (data.attendance_mode === 'online') {
            if (settings.online_ticket_type === 'free') {
                baseTicketPrice = 0;
            } else {
                baseTicketPrice = parseFloat(settings.online_ticket_price || '0');
            }
        }
        if (!activeForm || !activeForm.additional_fees) return [];
        return activeForm.additional_fees.map((fee: any) => {
            let calculated = 0;
            if (fee.type === 'percent') {
                calculated = (parseFloat(fee.value) / 100) * baseTicketPrice;
            } else {
                calculated = parseFloat(fee.value) || 0;
            }
            return {
                name: fee.name,
                calculated: calculated
            };
        }).filter((f: any) => f.calculated > 0);
    };

    const getAdditionalFeesTotal = () => {
        return getAdditionalFeesList().reduce((sum: number, fee: any) => sum + fee.calculated, 0);
    };

    const calculateTotal = () => {
        let baseTicketPrice = parseFloat(activeForm?.ticket_price || '0');
        if (data.attendance_mode === 'online') {
            if (settings.online_ticket_type === 'free') {
                baseTicketPrice = 0;
            } else {
                baseTicketPrice = parseFloat(settings.online_ticket_price || '0');
            }
        }
        let total = baseTicketPrice + getAdditionalFeesTotal();
        if (merchandisePlugin?.is_active && merchandisePlugin.settings) {
            ['kaos', 'jaket', 'jersey', 'emoney', 'tumbler'].forEach(item => {
                const itemConfig = merchandisePlugin.settings[item];
                if (itemConfig && (itemConfig.enabled === true || String(itemConfig.enabled) === 'true')) {
                    const isRequired = (itemConfig.required as any) === true || (itemConfig.required as any) === 'true' || (itemConfig.required as any) === 1 || String(itemConfig.required) === '1';
                    const isSelected = data[`merch_${item}_selected`] || isRequired;
                    if (isSelected) {
                        let itemPrice = parseFloat(itemConfig.price as any || '0');
                        if (['kaos', 'jaket', 'jersey'].includes(item) && (itemConfig as any).sizes_prices) {
                            const spList = (itemConfig as any).sizes_prices || [];
                            const selectedSize = data[`merch_${item}_size`] || '';
                            const foundSp = spList.find((sp: any) => sp.size === selectedSize);
                            if (foundSp) {
                                itemPrice = parseFloat(foundSp.price || '0');
                            }
                        }
                        total += itemPrice;
                    }
                }
            });
        }
        if (donationPlugin?.is_active && data.donation_amount) {
            total += parseFloat(data.donation_amount || '0');
        }
        return total;
    };

    const nextStep = () => {
        setValidationError(null);
        if (currentStep === 1) {
            if (activeForm) {
                let hasErrors = false;
                const newFieldErrors: { [key: string]: string } = {};

                activeForm.fields_schema.forEach(field => {
                    const fieldName = 'field_' + field.name;
                    let val = data[fieldName];
                    if (field.type === 'select' && val === '__other__') {
                        val = otherValues[fieldName] || '';
                    }
                    const isEmpty = !val || (typeof val === 'string' && !val.trim());
                    
                    if (field.required && isEmpty) {
                        hasErrors = true;
                        newFieldErrors[fieldName] = `${field.label} wajib diisi!`;
                    } else if (!isEmpty) {
                        // Format validations for non-empty fields
                        if (field.type === 'email') {
                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                            if (!emailRegex.test(String(val))) {
                                hasErrors = true;
                                newFieldErrors[fieldName] = `Format ${field.label} tidak valid! (contoh: nama@email.com)`;
                            }
                        } else if (field.type === 'url') {
                            const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
                            if (!urlRegex.test(String(val))) {
                                hasErrors = true;
                                newFieldErrors[fieldName] = `Format ${field.label} tidak valid! (contoh: https://google.com)`;
                            }
                        } else if (field.type === 'phone') {
                            const phoneRegex = /^[0-9+\-\s()]+$/;
                            if (!phoneRegex.test(String(val))) {
                                hasErrors = true;
                                newFieldErrors[fieldName] = `Format ${field.label} tidak valid! (hanya boleh angka, spasi, +, -, dan kurung)`;
                            }
                        } else if (field.type === 'number') {
                            if (isNaN(Number(val))) {
                                hasErrors = true;
                                newFieldErrors[fieldName] = `${field.label} harus berupa angka!`;
                            }
                        }
                    }
                });

                // Validate attendance_mode for hybrid events
                if (settings.event_type === 'hybrid' && !data.attendance_mode) {
                    hasErrors = true;
                    newFieldErrors['attendance_mode'] = 'Pilihan Kehadiran wajib dipilih!';
                }

                setFieldErrors(newFieldErrors);

                if (hasErrors) {
                    setValidationError('Harap lengkapi semua kolom wajib sebelum melanjutkan.');
                    // Scroll to first error
                    setTimeout(() => {
                        const el = document.querySelector('[data-field-error="true"]');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 50);
                    return;
                }
            }
            
            if (merchandisePlugin?.is_active) {
                setCurrentStep(2);
                setWantsMerchandise(null);
            } else if (donationPlugin?.is_active) {
                setCurrentStep(3);
                setWantsDonation(null);
            } else {
                setCurrentStep(4);
            }
        } else if (currentStep === 2) {
            if (merchandisePlugin?.is_active && merchandisePlugin.settings) {
                let hasMissingRequired = false;
                let validationErrMsg: string | null = null;
                
                ['kaos', 'jaket', 'jersey', 'emoney', 'tumbler'].forEach(item => {
                    const itemConfig = merchandisePlugin.settings[item];
                    if (itemConfig && (itemConfig.enabled === true || String(itemConfig.enabled) === 'true')) {
                        const isRequired = (itemConfig.required as any) === true || (itemConfig.required as any) === 'true' || (itemConfig.required as any) === 1 || String(itemConfig.required) === '1';
                        const isSelected = data[`merch_${item}_selected`] || isRequired;
                        
                        if (isRequired && !data[`merch_${item}_selected`]) {
                            hasMissingRequired = true;
                        }
                        
                        if (isSelected && ['kaos', 'jaket', 'jersey'].includes(item)) {
                            const enableNickname = (itemConfig as any).enable_nickname === true || String((itemConfig as any).enable_nickname) === 'true';
                            if (enableNickname) {
                                const nick = String(data[`merch_${item}_nickname`] || '').trim();
                                const maxChars = parseInt((itemConfig as any).max_nickname_chars) || 12;
                                if (!nick) {
                                    validationErrMsg = `Nama panggilan untuk ${itemConfig.name || item} wajib diisi!`;
                                } else if (nick.length > maxChars) {
                                    validationErrMsg = `Nama panggilan untuk ${itemConfig.name || item} maksimal ${maxChars} karakter!`;
                                }
                            }
                        }
                    }
                });
                
                if (hasMissingRequired) {
                    setValidationError('Harap pilih merchandise wajib sebelum melanjutkan.');
                    return;
                }
                
                if (validationErrMsg) {
                    setValidationError(validationErrMsg);
                    return;
                }
            }
            
            if (donationPlugin?.is_active) {
                setCurrentStep(3);
                setWantsDonation(null);
            } else {
                setCurrentStep(4);
            }
        } else if (currentStep === 3) {
            setCurrentStep(4);
        }
    };

    const prevStep = () => {
        setValidationError(null);
        if (currentStep === 4) {
            if (donationPlugin?.is_active) {
                setCurrentStep(3);
                setWantsDonation(null);
            } else if (merchandisePlugin?.is_active) {
                setCurrentStep(2);
                setWantsMerchandise(null);
            } else {
                setCurrentStep(1);
            }
        } else if (currentStep === 3) {
            if (merchandisePlugin?.is_active) {
                setCurrentStep(2);
                setWantsMerchandise(null);
            } else {
                setCurrentStep(1);
            }
        } else if (currentStep === 2) {
            setCurrentStep(1);
        }
    };

    // Signature Pad logic
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
    }, [activeForm]);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setIsDrawing(true);
        const rect = canvas.getBoundingClientRect();
        
        // Handle touch vs mouse coordinates
        let clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        let clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        ctx.beginPath();
        ctx.moveTo(clientX - rect.left, clientY - rect.top);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        let clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        let clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        ctx.lineTo(clientX - rect.left, clientY - rect.top);
        ctx.stroke();
        setHasSignature(true);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        saveSignature();
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas || !signatureFieldName) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
        setData(signatureFieldName, '');
    };

    const saveSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas || !signatureFieldName) return;
        const dataUrl = canvas.toDataURL('image/png');
        setData(signatureFieldName, dataUrl);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeForm) return;

        if (currentStep < 4) {
            nextStep();
            return;
        }

        // Prevent accidental/automatic submissions within 500ms of entering Step 4
        if (step4EnteredAt === 0 || Date.now() - step4EnteredAt < 500) {
            return;
        }

        // Resolve any "__other__" sentinel values to the actual typed text before posting
        // Build a patched copy of the data with custom "Lainnya" values substituted
        const patchedData: { [key: string]: any } = { ...data };
        activeForm.fields_schema.forEach(field => {
            if (field.allow_other) {
                const fieldName = 'field_' + field.name;
                if (patchedData[fieldName] === '__other__') {
                    patchedData[fieldName] = (otherValues[fieldName] || '').trim() || 'Lainnya';
                }
            }
        });

        // Apply patched values back to form data then post
        Object.keys(patchedData).forEach(key => {
            if (patchedData[key] !== data[key]) setData(key as any, patchedData[key]);
        });

        post(route('event.register', activeForm.id), {
            forceFormData: true,
            data: patchedData,
            onError: () => {
                saveSignature();
            }
        } as any);
    };

    return (
        <div className="min-h-screen bg-slate-50/60 font-sans text-slate-800 antialiased relative overflow-hidden pb-16 selection:bg-rose-500 selection:text-white">
            <Head title={`${settings.event_title || 'Zawawalk'} - Pendaftaran`}>
                {settings.event_favicon && (
                    <link rel="icon" type="image/x-icon" href={settings.event_favicon} />
                )}
                <meta name="description" content={settings.meta_description || settings.event_description || ''} />
                <meta name="keywords" content={settings.meta_keywords || 'zawawalk, fun walk'} />
                <meta name="robots" content="index, follow" />
                <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : ''} />
                <meta property="og:type" content="website" />
                <meta property="og:site_name" content={settings.event_title || 'Zawawalk'} />
                <meta property="og:locale" content="id_ID" />
                <meta property="og:url" content={typeof window !== 'undefined' ? window.location.href : ''} />
                <meta property="og:title" content={settings.og_title || settings.event_title || ''} />
                <meta property="og:description" content={settings.og_description || settings.event_description || ''} />
                <meta property="og:image" content={settings.og_image || settings.event_banner || ''} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={settings.og_title || settings.event_title || ''} />
                <meta name="twitter:description" content={settings.og_description || settings.event_description || ''} />
                <meta name="twitter:image" content={settings.og_image || settings.event_banner || ''} />
            </Head>

            {/* Modern Playful Vibrant Background Gradients */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-rose-200/30 rounded-full blur-[130px] pointer-events-none" />
            <div className="absolute top-[20%] right-[-10%] w-[45%] h-[45%] bg-amber-200/20 rounded-full blur-[130px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] bg-cyan-200/20 rounded-full blur-[130px] pointer-events-none" />

            {/* Navbar */}
            <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-3 bg-white border border-slate-100 px-4 py-2 shadow-sm rounded-full">
                    {settings.event_logo ? (
                        <img src={settings.event_logo} alt="Logo" className="h-6 object-contain" />
                    ) : (
                        <Sparkles className="h-5 w-5 text-rose-500" />
                    )}
                    <span className="font-extrabold text-sm uppercase tracking-wider text-slate-850">
                        {settings.event_title ? settings.event_title.split(':')[0] : 'Zawawalk'}
                    </span>
                </div>
                <div>
                    {canLogin && (
                        <div className="flex gap-4">
                            <Link
                                href={route('login')}
                                className="bg-white border border-slate-200 font-bold text-xs px-5 py-2.5 rounded-full shadow-sm hover:bg-slate-50 transition-all text-slate-650"
                            >
                                Admin Login
                            </Link>
                        </div>
                    )}
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-6 mt-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                
                {/* Left side: Banner & Info */}
                <div className="lg:col-span-7 space-y-8">
                    
                    {/* Modern Banner Card */}
                    <div className="bg-white p-3 rounded-2xl shadow-xl shadow-slate-100/50 border border-slate-100 relative group overflow-hidden">
                        {settings.event_banner ? (
                            <div className="rounded-xl overflow-hidden bg-white">
                                <img src={settings.event_banner} alt="Event Flyer" className="w-full object-cover max-h-[400px]" />
                            </div>
                        ) : (
                            <div className="rounded-xl bg-gradient-to-r from-orange-400 via-rose-500 to-indigo-600 p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
                                <h1 className="text-5xl md:text-6xl font-extrabold uppercase tracking-tighter text-white drop-shadow-md">
                                    ZAWAWALK
                                </h1>
                                <h2 className="text-2xl font-bold uppercase tracking-widest text-white mt-2 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/20">
                                    Fun Walk Event
                                </h2>
                            </div>
                        )}
                        <span className="absolute top-6 right-6 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-extrabold uppercase text-[10px] tracking-wider px-3.5 py-1.5 shadow-md rounded-full">
                            Must Join!
                        </span>
                    </div>

                    {/* Event Description Card */}
                    <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-100/50 border border-slate-100/80 relative">
                        <div className="absolute top-0 right-0 bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold px-4 py-1.5 rounded-bl-2xl rounded-tr-2xl text-[9px] uppercase tracking-wider shadow-sm">
                            Info Utama
                        </div>
                        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-4 border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-2">
                            <span>{settings.event_title}</span>
                            {settings.event_type && (
                                <div className="flex gap-2">
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-slate-100 shadow-sm ${
                                        settings.event_type === 'online' ? 'bg-cyan-50 text-cyan-700' :
                                        settings.event_type === 'hybrid' ? 'bg-purple-50 text-purple-700' : 'bg-pink-50 text-pink-700'
                                    }`}>
                                        ⚡ {settings.event_type}
                                    </span>
                                    {(settings.event_type === 'online' || settings.event_type === 'hybrid') && settings.event_platform && (
                                        <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-slate-100 shadow-sm bg-yellow-50 text-yellow-800">
                                            🎥 {settings.event_platform === 'custom' ? settings.event_platform_custom_name : settings.event_platform.replace('_', ' ')}
                                        </span>
                                    )}
                                </div>
                            )}
                        </h2>
                        <p className="text-sm font-medium text-slate-655 leading-relaxed mb-6 text-justify whitespace-pre-wrap">
                            {settings.event_description}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                                <Calendar className="h-5 w-5 text-rose-500 shrink-0" />
                                <div>
                                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Tanggal Acara</p>
                                    <p className="text-sm font-bold text-slate-800">{settings.event_date}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                                <Clock className="h-5 w-5 text-rose-500 shrink-0" />
                                <div>
                                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Waktu Pelaksanaan</p>
                                    <p className="text-sm font-bold text-slate-800">{settings.event_time}</p>
                                </div>
                            </div>
                            {activeForm && (
                                <div className="flex items-center gap-3 border border-slate-150 p-4 rounded-xl bg-indigo-50/20 border-dashed md:col-span-2">
                                    <span className="text-xl shrink-0">🎟️</span>
                                    <div>
                                        <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Harga Tiket</p>
                                        <p className="text-sm font-black text-indigo-750">
                                            {parseFloat(activeForm.ticket_price) === 0 ? 'GRATIS' : `Rp ${parseFloat(activeForm.ticket_price).toLocaleString('id-ID')}`}
                                            {activeForm.additional_fees && activeForm.additional_fees.length > 0 && (
                                                <span className="text-[10px] text-slate-500 font-semibold ml-2">
                                                    (belum termasuk biaya tambahan)
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-start gap-3 border border-slate-100 p-4 rounded-xl bg-slate-50/50 md:col-span-2">
                                <MapPin className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                                <div className="space-y-1 text-xs">
                                    {settings.event_type === 'online' ? (
                                        <div>
                                            <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Platform Acara Online</p>
                                            <p className="font-bold text-sm text-slate-800">
                                                {settings.event_platform === 'custom' ? settings.event_platform_custom_name : (settings.event_platform || '').replace('_', ' ').toUpperCase()}
                                            </p>
                                            <p className="text-[9px] text-slate-400 font-medium mt-0.5">🔒 Link akses dikirim setelah pendaftaran selesai</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Nama Venue / Lokasi</p>
                                                <p className="font-bold text-sm text-slate-800">{settings.event_venue_name || settings.event_location}</p>
                                            </div>
                                            {settings.event_venue_address && (
                                                <div className="mt-1">
                                                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Alamat Lengkap</p>
                                                    <p className="font-semibold text-slate-650">{settings.event_venue_address}</p>
                                                </div>
                                            )}
                                            {settings.event_type === 'hybrid' && settings.event_platform && (
                                                <div className="pt-1.5 border-t border-dashed border-slate-200 mt-2">
                                                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Tersedia juga secara Online</p>
                                                    <p className="font-bold text-sm text-slate-800">
                                                        {settings.event_platform === 'custom' ? settings.event_platform_custom_name : settings.event_platform.replace('_', ' ').toUpperCase()}
                                                    </p>
                                                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">🔒 Link akses dikirim setelah pendaftaran selesai</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {settings.event_location_map && (settings.event_type === 'offline' || settings.event_type === 'hybrid') && (
                            <div className="mt-4 border border-slate-100 rounded-xl overflow-hidden shadow-sm h-64 bg-slate-100">
                                <iframe 
                                    src={settings.event_location_map} 
                                    className="w-full h-full border-0" 
                                    allowFullScreen={false} 
                                    loading="lazy" 
                                    referrerPolicy="no-referrer-when-downgrade"
                                    title="Lokasi Event"
                                />
                            </div>
                        )}

                        {settings.event_dresscode && (
                            <div className="mt-6 border-t border-dashed border-slate-200 pt-4">
                                <div className="flex items-start gap-2.5 bg-rose-50/40 border border-rose-100 p-4 rounded-xl">
                                    <Shirt className="h-5 w-5 text-rose-600 shrink-0" />
                                    <div>
                                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Dresscode Pakaian</h4>
                                        <p className="text-xs font-semibold text-rose-900 mt-1">{settings.event_dresscode}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right side: Registration Form */}
                <div id="registration-form-container" className="lg:col-span-5 lg:sticky lg:top-6">
                    <div className="bg-white rounded-2xl shadow-xl shadow-slate-100/50 border border-slate-100 overflow-hidden">
                        
                        <div className="bg-gradient-to-r from-orange-500 via-rose-500 to-indigo-600 p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <h3 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                                    <PenTool className="h-5 w-5" />
                                    Pendaftaran Peserta
                                </h3>
                                <p className="text-xs text-rose-50 mt-1">Isi formulir pendaftaran untuk mengklaim e-tiket Anda.</p>
                            </div>
                            {activeForm && (
                                <div className="bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-xl text-left sm:text-right shrink-0">
                                    <span className="block text-[8px] font-black uppercase text-rose-100 tracking-wider">Harga Tiket</span>
                                    <span className="font-extrabold text-sm text-yellow-300">
                                        {parseFloat(activeForm.ticket_price) === 0 ? 'GRATIS' : `Rp ${parseFloat(activeForm.ticket_price).toLocaleString('id-ID')}`}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Progress Step Indicator */}
                        {activeForm && (
                            <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                <div className="flex items-center gap-1.5">
                                    <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[9px] ${currentStep === 1 ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-400'}`}>1</span>
                                    <span className={`hidden sm:inline ${currentStep === 1 ? 'text-rose-600 font-extrabold' : ''}`}>Data Diri</span>
                                </div>
                                {merchandisePlugin?.is_active && (
                                    <>
                                        <div className="h-px bg-slate-200 flex-1 mx-1.5" />
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[9px] ${currentStep === 2 ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-400'}`}>2</span>
                                            <span className={`hidden sm:inline ${currentStep === 2 ? 'text-rose-600 font-extrabold' : ''}`}>Merchandise</span>
                                        </div>
                                    </>
                                )}
                                {donationPlugin?.is_active && (
                                    <>
                                        <div className="h-px bg-slate-200 flex-1 mx-1.5" />
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[9px] ${currentStep === 3 ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-400'}`}>3</span>
                                            <span className={`hidden sm:inline ${currentStep === 3 ? 'text-rose-600 font-extrabold' : ''}`}>Donasi</span>
                                        </div>
                                    </>
                                )}
                                <div className="h-px bg-slate-200 flex-1 mx-1.5" />
                                <div className="flex items-center gap-1.5">
                                    <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[9px] ${currentStep === 4 ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-400'}`}>4</span>
                                    <span className={`hidden sm:inline ${currentStep === 4 ? 'text-rose-600 font-extrabold' : ''}`}>Pembayaran</span>
                                </div>
                            </div>
                        )}

                        {/* Form Body */}
                        {activeForm && registrationClosed ? (
                            // --- Registration Closed Narration ---
                            <div className="p-8 flex flex-col items-center text-center space-y-6">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-lg ${
                                    closedReason === 'quota'
                                        ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                                        : closedReason === 'deadline'
                                        ? 'bg-gradient-to-br from-slate-500 to-slate-700'
                                        : 'bg-gradient-to-br from-rose-400 to-rose-600'
                                }`}>
                                    {closedReason === 'quota' ? '🎟️' : closedReason === 'deadline' ? '⏰' : '🔒'}
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-slate-800">
                                        {closedReason === 'quota' ? 'Kuota Pendaftaran Penuh'
                                            : closedReason === 'deadline' ? 'Batas Waktu Pendaftaran Berakhir'
                                            : 'Pendaftaran Ditutup'}
                                    </h3>
                                    <p className="text-sm text-slate-600 max-w-md leading-relaxed font-medium">
                                        {closedMessage}
                                    </p>
                                </div>
                                {closedReason === 'quota' && activeForm.max_participants && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 flex items-center gap-3">
                                        <span className="text-2xl">👥</span>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Total Peserta Terdaftar</p>
                                            <p className="text-2xl font-black text-amber-800">{activeForm.attendees_count ?? 0} <span className="text-sm font-bold text-amber-600">/ {activeForm.max_participants} orang</span></p>
                                        </div>
                                    </div>
                                )}
                                {closedReason === 'deadline' && activeForm.closed_at && (
                                    <div className="bg-slate-100 border border-slate-200 rounded-2xl px-6 py-4 flex items-center gap-3">
                                        <span className="text-2xl">📅</span>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Batas Waktu Pendaftaran</p>
                                            <p className="text-sm font-black text-slate-700">
                                                {new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(activeForm.closed_at))}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <p className="text-xs text-slate-400 font-medium">Untuk informasi lebih lanjut, silakan hubungi panitia penyelenggara.</p>
                            </div>
                            // --- End Closed Narration ---
                        ) : activeForm ? (
                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                {validationError && (
                                    <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-xs font-bold text-red-700 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">⚠️</span>
                                            <span className="uppercase tracking-wider">{validationError}</span>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => setValidationError(null)}
                                            className="bg-white border border-slate-200 w-6 h-6 rounded-full flex items-center justify-center font-bold shadow-sm hover:bg-slate-50 transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                                
                                {/* STEP 1: Data Diri */}
                                {currentStep === 1 && (
                                    <div className="space-y-6">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-100 inline-block px-3 py-1 rounded-full">
                                            Langkah 1: Isi Data Diri
                                        </h4>
                                        {activeForm.fields_schema.map((field) => {
                                            // Handle presentation-only non-input field types first
                                            if (field.type === 'title') {
                                                return (
                                                    <div key={field.name} className="pt-6 border-t border-slate-100 mt-6">
                                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                                                            {field.label}
                                                        </h3>
                                                    </div>
                                                );
                                            }

                                            if (field.type === 'description') {
                                                return (
                                                    <div key={field.name} className="space-y-1 my-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                                        {field.label && (
                                                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                                {field.label}
                                                            </h4>
                                                        )}
                                                        {field.description && (
                                                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                                                {field.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            }

                                            const fieldName = 'field_' + field.name;
                                            const hasFieldError = !!fieldErrors[fieldName];
                                            const errorBorder = hasFieldError ? 'border-red-400 focus:ring-red-400/20 focus:border-red-400 bg-red-50/10' : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500';
                                            const clearError = () => {
                                                if (hasFieldError) setFieldErrors(prev => { const n = { ...prev }; delete n[fieldName]; return n; });
                                            };

                                            return (
                                                <div key={field.name} className="space-y-1.5" data-field-error={hasFieldError ? 'true' : undefined}>
                                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                                                        {field.label}
                                                        {field.required && <span className="text-red-500">*</span>}
                                                    </label>

                                                    {field.type === 'select' ? (
                                                        <div className="space-y-2">
                                                            <select
                                                                value={data[fieldName] || ''}
                                                                onChange={e => {
                                                                    setData(fieldName, e.target.value);
                                                                    clearError();
                                                                    if (e.target.value !== '__other__') {
                                                                        setOtherValues(prev => { const n = { ...prev }; delete n[fieldName]; return n; });
                                                                    }
                                                                }}
                                                                required={field.required}
                                                                className={`w-full border p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 transition-all text-xs font-bold text-slate-800 ${errorBorder}`}
                                                            >
                                                                <option value="">Pilih Opsi</option>
                                                                {field.options?.map(opt => (
                                                                    <option key={opt} value={opt}>{opt}</option>
                                                                ))}
                                                                {field.allow_other && (
                                                                    <option value="__other__">Lainnya...</option>
                                                                )}
                                                            </select>
                                                            {field.allow_other && data[fieldName] === '__other__' && (
                                                                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 p-2 rounded-xl">
                                                                    <span className="text-[10px] font-bold uppercase text-amber-700 whitespace-nowrap">Isi Lainnya:</span>
                                                                    <input
                                                                        type="text"
                                                                        value={otherValues[fieldName] || ''}
                                                                        onChange={e => { setOtherValues(prev => ({ ...prev, [fieldName]: e.target.value })); clearError(); }}
                                                                        required={field.required}
                                                                        placeholder={`Ketik ${field.label.toLowerCase()} Anda...`}
                                                                        autoFocus
                                                                        className="flex-1 border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-bold text-slate-800"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : field.type === 'multiselect' ? (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50/50 border border-slate-200 rounded-xl p-3.5">
                                                            {field.options?.map(opt => {
                                                                const currentSelections: string[] = Array.isArray(data[fieldName]) ? data[fieldName] : (data[fieldName] ? String(data[fieldName]).split(', ') : []);
                                                                const isChecked = currentSelections.includes(opt);
                                                                return (
                                                                    <label key={opt} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isChecked}
                                                                            onChange={e => {
                                                                                let nextSelections = [...currentSelections];
                                                                                if (e.target.checked) {
                                                                                    nextSelections.push(opt);
                                                                                } else {
                                                                                    nextSelections = nextSelections.filter(s => s !== opt);
                                                                                }
                                                                                setData(fieldName, nextSelections);
                                                                                clearError();
                                                                            }}
                                                                            className="h-4 w-4 border-slate-300 rounded text-indigo-650 focus:ring-indigo-500/30 focus:outline-none"
                                                                        />
                                                                        <span>{opt}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : field.type === 'textarea' ? (
                                                        <textarea
                                                            value={data[fieldName] || ''}
                                                            onChange={e => { setData(fieldName, e.target.value); clearError(); }}
                                                            required={field.required}
                                                            placeholder={field.placeholder || ''}
                                                            rows={3}
                                                            className={`w-full border p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 transition-all text-xs font-bold text-slate-800 ${errorBorder}`}
                                                        />
                                                    ) : field.type === 'image' ? (
                                                        <div className="space-y-2 relative">
                                                            {dynamicLoading[fieldName] && (
                                                                <div className="absolute inset-0 bg-white/95 border border-slate-100 rounded-xl flex flex-col items-center justify-center z-10 p-2">
                                                                    <div className="w-2/3 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                                        <div className="bg-indigo-600 h-1.5 rounded-full animate-[pulse_1s_infinite] w-full" />
                                                                    </div>
                                                                    <span className="font-bold text-[8px] uppercase tracking-widest mt-1 text-slate-500 animate-pulse">Memproses Gambar...</span>
                                                                </div>
                                                            )}
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={e => handleDynamicFileChange(fieldName, e.target.files?.[0] || null)}
                                                                required={field.required}
                                                                className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50/50 text-xs file:mr-4 file:py-1 file:px-3 file:border file:border-slate-200 file:rounded-lg file:text-[10px] file:font-bold file:bg-white file:text-slate-700 file:uppercase file:cursor-pointer hover:file:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
                                                            />
                                                            {dynamicPreviews[fieldName] && (
                                                                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm h-24 flex items-center justify-center p-1 mt-2">
                                                                    <img src={dynamicPreviews[fieldName]} alt="Preview" className="max-h-20 object-contain" />
                                                                </div>
                                                            )}
                                                            {data[fieldName] && data[fieldName] instanceof File && (
                                                                <p className="text-[10px] text-slate-500 font-bold">File terpilih: {data[fieldName].name}</p>
                                                            )}
                                                        </div>
                                                    ) : field.type === 'signature' ? (
                                                        <div className="border border-slate-200 rounded-xl bg-slate-50/30 relative overflow-hidden">
                                                            <canvas
                                                                ref={canvasRef}
                                                                width={320}
                                                                height={150}
                                                                onMouseDown={startDrawing}
                                                                onMouseMove={draw}
                                                                onMouseUp={stopDrawing}
                                                                onMouseLeave={stopDrawing}
                                                                onTouchStart={startDrawing}
                                                                onTouchMove={draw}
                                                                onTouchEnd={stopDrawing}
                                                                className="w-full h-[150px] cursor-crosshair touch-none"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={clearSignature}
                                                                className="absolute top-2 right-2 bg-red-50 text-red-655 border border-red-100 px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-wider uppercase hover:bg-red-100 transition-colors"
                                                            >
                                                                Ulangi
                                                            </button>
                                                        </div>
                                                    ) : field.type === 'date' ? (
                                                        <input
                                                            type="date"
                                                            value={data[fieldName] || ''}
                                                            onChange={e => { setData(fieldName, e.target.value); clearError(); }}
                                                            required={field.required}
                                                            className={`w-full border p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 transition-all text-xs font-bold text-slate-800 ${errorBorder}`}
                                                        />
                                                    ) : field.type === 'datetime' ? (
                                                        <input
                                                            type="datetime-local"
                                                            value={data[fieldName] || ''}
                                                            onChange={e => { setData(fieldName, e.target.value); clearError(); }}
                                                            required={field.required}
                                                            className={`w-full border p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 transition-all text-xs font-bold text-slate-800 ${errorBorder}`}
                                                        />
                                                    ) : field.type === 'checkbox' ? (
                                                        <label className="flex items-center gap-2.5 p-3.5 bg-slate-50/55 border border-slate-200 rounded-xl cursor-pointer select-none">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!data[fieldName]}
                                                                onChange={e => { setData(fieldName, e.target.checked); clearError(); }}
                                                                required={field.required}
                                                                className="h-4 w-4 border-slate-350 rounded text-indigo-650 focus:ring-indigo-500/30 focus:outline-none"
                                                            />
                                                            <span className="text-xs font-bold text-slate-700">Setuju dengan {field.label}</span>
                                                        </label>
                                                    ) : field.type === 'rating' ? (
                                                        <div className="flex items-center gap-1.5 p-1">
                                                            {[1, 2, 3, 4, 5].map(star => (
                                                                <button
                                                                    key={star}
                                                                    type="button"
                                                                    onClick={() => { setData(fieldName, star); clearError(); }}
                                                                    className="text-2xl transition-all active:scale-95"
                                                                >
                                                                    {star <= (parseInt(data[fieldName]) || 0) ? '★' : '☆'}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <input
                                                            type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : field.type === 'phone' ? 'tel' : 'text'}
                                                            value={data[fieldName] || ''}
                                                            onChange={e => { setData(fieldName, e.target.value); clearError(); }}
                                                            required={field.required}
                                                            placeholder={field.placeholder || ''}
                                                            className={`w-full border p-3 bg-slate-50/50 rounded-xl focus:outline-none focus:bg-white focus:ring-4 transition-all text-xs font-bold text-slate-800 ${errorBorder}`}
                                                        />
                                                    )}
                                                    
                                                    {field.help_text && (
                                                        <p className="text-[10px] text-slate-400 font-semibold italic pl-1">
                                                            ℹ️ {field.help_text}
                                                        </p>
                                                    )}

                                                    {(fieldErrors[fieldName] || errors[fieldName]) && (
                                                        <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1">
                                                            <span>⚠</span>
                                                            <span>{fieldErrors[fieldName] || errors[fieldName]}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {settings.event_type === 'hybrid' && (
                                            <div
                                                className={`space-y-2 pt-4 border-t-2 border-dashed ${fieldErrors['attendance_mode'] ? 'border-red-400' : 'border-gray-300'}`}
                                                data-field-error={fieldErrors['attendance_mode'] ? 'true' : undefined}
                                            >
                                                <label className="block text-xs font-black uppercase tracking-wider flex items-center gap-1">
                                                    Pilihan Kehadiran <span className="text-red-500">*</span>
                                                </label>
                                                <div className="flex flex-col gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => { setData('attendance_mode', 'offline'); setFieldErrors(prev => { const n = { ...prev }; delete n['attendance_mode']; return n; }); }}
                                                        className={`border-2 p-3 font-black uppercase text-xs shadow-[2px_2px_0px_#000] active:translate-y-px transition-colors flex items-center justify-between gap-3 w-full ${
                                                            data.attendance_mode === 'offline'
                                                                ? 'bg-pink-400 text-black border-black'
                                                                : fieldErrors['attendance_mode']
                                                                ? 'bg-red-50 text-gray-500 border-red-500 shadow-[2px_2px_0px_theme(colors.red.400)]'
                                                                : 'bg-white text-gray-500 hover:bg-gray-50 border-black'
                                                        }`}
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <span className="text-base leading-none">📍</span>
                                                            <span>Hadir Fisik (Offline)</span>
                                                        </span>
                                                        <span className="text-[9px] font-bold text-gray-600 shrink-0">
                                                            Rp {parseFloat(activeForm.ticket_price).toLocaleString('id-ID')}
                                                        </span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setData('attendance_mode', 'online'); setFieldErrors(prev => { const n = { ...prev }; delete n['attendance_mode']; return n; }); }}
                                                        className={`border-2 p-3 font-black uppercase text-xs shadow-[2px_2px_0px_#000] active:translate-y-px transition-colors flex items-center justify-between gap-3 w-full ${
                                                            data.attendance_mode === 'online'
                                                                ? 'bg-pink-400 text-black border-black'
                                                                : fieldErrors['attendance_mode']
                                                                ? 'bg-red-50 text-gray-500 border-red-500 shadow-[2px_2px_0px_theme(colors.red.400)]'
                                                                : 'bg-white text-gray-500 hover:bg-gray-50 border-black'
                                                        }`}
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <span className="text-base leading-none">💻</span>
                                                            <span>Hadir Virtual (Online)</span>
                                                        </span>
                                                        <span className="text-[9px] font-bold text-gray-600 shrink-0">
                                                            {settings.online_ticket_type === 'free' ? 'GRATIS' : `Rp ${parseFloat(settings.online_ticket_price || '0').toLocaleString('id-ID')}`}
                                                        </span>
                                                    </button>
                                                </div>
                                                {fieldErrors['attendance_mode'] && (
                                                    <p className="text-xs text-red-600 font-black mt-1 flex items-center gap-1">
                                                        <span>⚠</span>
                                                        <span>{fieldErrors['attendance_mode']}</span>
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {/* STEP 2: Pilihan Merchandise */}
                                {currentStep === 2 && merchandisePlugin?.is_active && merchandisePlugin.settings && (
                                    <div className="space-y-6">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-50 border border-orange-100 inline-block px-3 py-1 rounded-full">
                                            Langkah 2: Pilih Merchandise
                                        </h4>
                                        {wantsMerchandise === null && !hasRequiredMerch() && (merchandisePlugin?.settings as any)?.additional !== false ? (
                                            <div className="border border-slate-100 p-6 bg-indigo-50/40 rounded-2xl text-center space-y-4 my-4">
                                                <span className="text-4xl block">🛍️</span>
                                                <h4 className="font-extrabold text-base uppercase text-slate-800 tracking-tight leading-tight">Apakah Anda ingin memesan Merchandise Zawawalk?</h4>
                                                <p className="text-xs font-medium text-slate-650 leading-relaxed">Kami menyediakan Kaos, Jaket, E-Money, dan Tumbler edisi khusus Zawawalk.</p>
                                                <div className="flex gap-4 justify-center pt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectWantsMerch(true)}
                                                        className="bg-gradient-to-r from-orange-500 to-rose-500 border-0 text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:opacity-95 active:translate-y-px transition-all"
                                                    >
                                                        Ya, Pesan
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectWantsMerch(false)}
                                                        className="bg-white border border-slate-200 text-slate-650 px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm hover:bg-slate-50 active:translate-y-px transition-all"
                                                    >
                                                        Tidak, Lewati
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {['kaos', 'jaket', 'jersey', 'emoney', 'tumbler'].map(item => {
                                                    const itemConfig = merchandisePlugin.settings[item];
                                                    const isEnabled = itemConfig && (itemConfig.enabled === true || String(itemConfig.enabled) === 'true');
                                                    if (!isEnabled) return null;

                                                    const isRequired = (itemConfig.required as any) === true || (itemConfig.required as any) === 'true' || (itemConfig.required as any) === 1 || String(itemConfig.required) === '1';
                                                    const isSelected = data[`merch_${item}_selected`] || isRequired;
                                                    const sizes = itemConfig.sizes 
                                                        ? (Array.isArray(itemConfig.sizes) 
                                                            ? itemConfig.sizes 
                                                            : String(itemConfig.sizes).split(',').map((s: string) => s.trim()))
                                                        : [];

                                                    return (
                                                        <div key={item} className={`border p-4 bg-white rounded-2xl shadow-sm transition-all relative ${isSelected ? 'border-indigo-500 bg-indigo-50/5' : 'border-slate-100'}`}>
                                                            <div className="flex gap-4 items-start">
                                                                {itemConfig.image && (
                                                                    <img src={itemConfig.image} alt={item} className="w-16 h-16 object-cover border border-slate-100 rounded-xl shrink-0 bg-slate-50" />
                                                                )}
                                                                <div className="flex-1 space-y-1.5">
                                                                    <div className="flex justify-between items-start gap-2">
                                                                        <span className="font-extrabold text-xs uppercase tracking-tight text-slate-800">{itemConfig.name || item}</span>
                                                                        <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-lg shrink-0">
                                                                            {(() => {
                                                                                let price = parseFloat(itemConfig.price as any || 0);
                                                                                if (['kaos', 'jaket', 'jersey'].includes(item) && (itemConfig as any).sizes_prices) {
                                                                                    const spList = (itemConfig as any).sizes_prices || [];
                                                                                    const selectedSize = data[`merch_${item}_size`] || '';
                                                                                    const foundSp = spList.find((sp: any) => sp.size === selectedSize);
                                                                                    if (foundSp) {
                                                                                        price = parseFloat(foundSp.price || 0);
                                                                                    }
                                                                                }
                                                                                return price === 0 ? 'Include' : `Rp ${price.toLocaleString('id-ID')}`;
                                                                            })()}
                                                                        </span>
                                                                    </div>
                                                                    {itemConfig.description && (
                                                                        <p className="text-xs text-slate-500 font-medium leading-relaxed">{itemConfig.description}</p>
                                                                    )}
                                                                    
                                                                    {/* Size Selection for clothes */}
                                                                    {isSelected && sizes.length > 0 && (
                                                                        <div className="mt-3 space-y-2">
                                                                            <div className="flex items-center gap-3">
                                                                                <label className="block text-[10px] font-bold uppercase text-slate-400">Pilih Ukuran:</label>
                                                                                {(itemConfig as any).size_chart_image && (
                                                                                    <button type="button" onClick={() => setShowSizeChart(prev => ({...prev, [item]: !prev[item]}))} className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/60 px-2.5 py-0.5 rounded-lg uppercase hover:bg-indigo-100 transition-all">
                                                                                        {showSizeChart[item] ? 'Tutup Size Chart' : '📏 Lihat Size Chart'}
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                            {showSizeChart[item] && (itemConfig as any).size_chart_image && (
                                                                                <div className="border border-slate-100 rounded-xl overflow-hidden bg-white mb-2 shadow-sm p-1">
                                                                                    <img src={(itemConfig as any).size_chart_image} alt="Size Chart" className="w-full h-auto object-contain" />
                                                                                </div>
                                                                            )}
                                                                            <div className="flex flex-wrap gap-1.5">
                                                                                {sizes.map((sz: string) => {
                                                                                    let szPrice = parseFloat(itemConfig.price as any || 0);
                                                                                    if ((itemConfig as any).sizes_prices) {
                                                                                        const foundSp = ((itemConfig as any).sizes_prices || []).find((sp: any) => sp.size === sz);
                                                                                        if (foundSp) {
                                                                                            szPrice = parseFloat(foundSp.price || 0);
                                                                                        }
                                                                                    }
                                                                                    const isSzSelected = data[`merch_${item}_size`] === sz;
                                                                                    return (
                                                                                        <button
                                                                                            key={sz}
                                                                                            type="button"
                                                                                            onClick={() => setData(`merch_${item}_size`, sz)}
                                                                                            className={`border px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                                                                                isSzSelected
                                                                                                    ? 'bg-slate-800 border-slate-800 text-white shadow-sm'
                                                                                                    : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                                                                                            }`}
                                                                                        >
                                                                                            {szPrice === 0 ? sz : `${sz} (Rp ${szPrice.toLocaleString('id-ID')})`}
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Nickname input if enabled */}
                                                                    {isSelected && ['kaos', 'jaket', 'jersey'].includes(item) && ((itemConfig as any).enable_nickname === true || String((itemConfig as any).enable_nickname) === 'true') && (
                                                                        <div className="mt-3 space-y-1.5">
                                                                            <label className="block text-[10px] font-bold uppercase text-slate-400">
                                                                                Cetak Nama Panggilan (Maks {parseInt((itemConfig as any).max_nickname_chars) || 12} Karakter):
                                                                            </label>
                                                                            <input 
                                                                                type="text"
                                                                                maxLength={parseInt((itemConfig as any).max_nickname_chars) || 12}
                                                                                value={data[`merch_${item}_nickname`] || ''}
                                                                                onChange={e => setData(`merch_${item}_nickname`, e.target.value)}
                                                                                className="w-full max-w-xs border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-55/30"
                                                                                placeholder="Contoh: BUDI"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Selection Checkbox */}
                                                            <div className="mt-4 pt-3 border-t border-dashed border-slate-100 flex justify-between items-center">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                                    {isRequired ? '★ Wajib Dibeli' : '⚡ Opsional'}
                                                                </span>
                                                                {!isRequired && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setData(`merch_${item}_selected`, !isSelected)}
                                                                        className={`border px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                                                                            isSelected 
                                                                                ? 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100' 
                                                                                : 'bg-gradient-to-r from-orange-500 to-rose-500 border-0 text-white shadow-sm hover:opacity-95'
                                                                        }`}
                                                                    >
                                                                        {isSelected ? 'Batal Beli' : 'Tambah Ke Tiket'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* STEP 3: Donasi Sukarela */}
                                {currentStep === 3 && donationPlugin?.is_active && (
                                    <div className="space-y-6">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-600 bg-cyan-50 border border-cyan-100 inline-block px-3 py-1 rounded-full">
                                            Langkah 3: Donasi Sukarela
                                        </h4>
                                        {wantsDonation === null && donationPlugin?.settings?.additional !== false ? (
                                            <div className="border border-slate-100 p-6 bg-indigo-50/40 rounded-2xl text-center space-y-4 my-4">
                                                <span className="text-4xl block">🎁</span>
                                                <h4 className="font-extrabold text-base uppercase text-slate-800 tracking-tight leading-tight">Apakah Anda ingin memberikan Donasi Sukarela?</h4>
                                                <p className="text-xs font-medium text-slate-655 leading-relaxed">Setiap donasi Anda membantu mensukseskan jalannya acara Zawawalk.</p>
                                                <div className="flex gap-4 justify-center pt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectWantsDonation(true)}
                                                        className="bg-gradient-to-r from-cyan-500 to-teal-500 border-0 text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:opacity-95 active:translate-y-px transition-all"
                                                    >
                                                        Ya, Berdonasi
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectWantsDonation(false)}
                                                        className="bg-white border border-slate-200 text-slate-650 px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm hover:bg-slate-50 active:translate-y-px transition-all"
                                                    >
                                                        Tidak, Lewati
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-5">
                                                <div className="bg-indigo-50/30 border border-indigo-100/50 p-5 rounded-2xl text-center">
                                                    <h4 className="font-extrabold text-sm uppercase text-indigo-950 flex items-center justify-center gap-1.5">🎁 Donasi Sukarela Zawawalk</h4>
                                                    <p className="text-xs font-medium text-slate-600 mt-1.5 leading-relaxed">Dukung kesuksesan event Zawawalk dengan donasi sukarela Anda. Setiap kontribusi sangat berarti.</p>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="block text-xs font-bold uppercase text-slate-600 tracking-wider">Jumlah Donasi (IDR)</label>
                                                    <div className="relative border border-slate-200 bg-slate-50/50 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all flex items-center rounded-xl overflow-hidden">
                                                        <span className="px-3.5 py-3 text-xs font-extrabold bg-slate-100 border-r border-slate-200 text-slate-600">Rp</span>
                                                        <input 
                                                            type="number"
                                                            min="0"
                                                            placeholder="Masukkan nominal donasi (misal: 50000)"
                                                            value={data.donation_amount}
                                                            onChange={e => setData('donation_amount', e.target.value)}
                                                            className="w-full p-3 border-0 focus:outline-none focus:ring-0 font-bold text-slate-800 text-xs bg-transparent"
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-slate-450 font-semibold">Kosongkan atau isi 0 jika tidak ingin berdonasi.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* STEP 4: Summary & Metode Pembayaran */}
                                {currentStep === 4 && (
                                    <div className="space-y-6">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-650 bg-indigo-50 border border-indigo-100 inline-block px-3 py-1 rounded-full">
                                            Langkah 4: Ringkasan & Metode Pembayaran
                                        </h4>
                                        
                                        {/* Price Breakdown and Total */}
                                        <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-3.5">
                                            <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                                                <span>
                                                    Tiket Masuk ({activeForm.title})
                                                    {settings.event_type === 'hybrid' && (
                                                        <span className="ml-1.5 text-[9px] font-extrabold uppercase text-indigo-650 bg-white border border-slate-150 px-2 py-0.5 rounded-full shadow-sm">
                                                            {data.attendance_mode === 'online' ? 'Virtual / Online' : 'Fisik / Offline'}
                                                        </span>
                                                    )}
                                                    :
                                                </span>
                                                <span className="font-extrabold text-slate-850">
                                                    {(() => {
                                                        let price = parseFloat(activeForm.ticket_price);
                                                        if (data.attendance_mode === 'online') {
                                                            if (settings.online_ticket_type === 'free') {
                                                                return 'GRATIS';
                                                            } else {
                                                                price = parseFloat(settings.online_ticket_price || '0');
                                                            }
                                                        }
                                                        return `Rp ${price.toLocaleString('id-ID')}`;
                                                    })()}
                                                </span>
                                            </div>
                                            
                                            {/* Selected Merchandise details */}
                                            {merchandisePlugin?.is_active && merchandisePlugin.settings && ['kaos', 'jaket', 'jersey', 'emoney', 'tumbler'].map(item => {
                                                const itemConfig = merchandisePlugin.settings[item];
                                                const isEnabled = itemConfig && (itemConfig.enabled === true || String(itemConfig.enabled) === 'true');
                                                if (!isEnabled) return null;
                                                
                                                const isRequired = (itemConfig.required as any) === true || (itemConfig.required as any) === 'true' || (itemConfig.required as any) === 1 || String(itemConfig.required) === '1';
                                                const isSelected = data[`merch_${item}_selected`] || isRequired;
                                                if (!isSelected) return null;
                                                
                                                const hasNickname = ['kaos', 'jaket', 'jersey'].includes(item) && data[`merch_${item}_nickname`];
                                                const size = ['kaos', 'jaket', 'jersey'].includes(item) ? ` (${data[`merch_${item}_size`]}${hasNickname ? `, Nama: ${data[`merch_${item}_nickname`]}` : ''})` : '';
                                                
                                                let itemPrice = parseFloat(itemConfig.price as any || 0);
                                                if (['kaos', 'jaket', 'jersey'].includes(item) && (itemConfig as any).sizes_prices) {
                                                    const spList = (itemConfig as any).sizes_prices || [];
                                                    const selectedSize = data[`merch_${item}_size`] || '';
                                                    const foundSp = spList.find((sp: any) => sp.size === selectedSize);
                                                    if (foundSp) {
                                                        itemPrice = parseFloat(foundSp.price || 0);
                                                    }
                                                }

                                                return (
                                                    <div key={item} className="flex justify-between items-center text-xs font-bold text-slate-600">
                                                        <span>+ {itemConfig.name || item}{size}:</span>
                                                        <span className="font-extrabold text-slate-850">
                                                            {itemPrice === 0 ? 'Include' : `Rp ${itemPrice.toLocaleString('id-ID')}`}
                                                        </span>
                                                    </div>
                                                );
                                            })}

                                            {/* Additional Fees Breakdown */}
                                            {getAdditionalFeesList().map((fee: any, idx: number) => (
                                                <div key={`fee-${idx}`} className="flex justify-between items-center text-xs font-bold text-slate-600">
                                                    <span>+ {fee.name}:</span>
                                                    <span className="font-extrabold text-slate-850">
                                                        Rp {fee.calculated.toLocaleString('id-ID')}
                                                    </span>
                                                </div>
                                            ))}

                                            {/* Donation Amount */}
                                            {donationPlugin?.is_active && data.donation_amount && parseFloat(data.donation_amount) > 0 && (
                                                <div className="flex justify-between items-center text-xs font-bold text-slate-655">
                                                    <span>+ Donasi Sukarela:</span>
                                                    <span className="font-extrabold text-slate-850">Rp {parseFloat(data.donation_amount).toLocaleString('id-ID')}</span>
                                                </div>
                                            )}

                                            <div className="border-t border-slate-200/60 pt-4 mt-2 flex justify-between items-center">
                                                <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Total Pembayaran:</span>
                                                <span className="text-xl font-extrabold text-rose-600 bg-white border border-rose-100 px-4 py-2 shadow-sm rounded-xl inline-block">
                                                    Rp {calculateTotal().toLocaleString('id-ID')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Payment Method selection */}
                                        {isManualEnabled && isMidtransEnabled ? (
                                            <div className="space-y-2">
                                                <label className="block text-xs font-bold uppercase text-slate-600 tracking-wider">Metode Pembayaran</label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => setData('payment_method', 'manual')}
                                                        className={`border p-3 font-extrabold uppercase text-xs rounded-xl shadow-sm transition-all ${
                                                            data.payment_method === 'manual' 
                                                                ? 'bg-slate-800 border-slate-800 text-white' 
                                                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        Transfer Bank (Manual)
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setData('payment_method', 'midtrans')}
                                                        className={`border p-3 font-extrabold uppercase text-xs rounded-xl shadow-sm transition-all ${
                                                            data.payment_method === 'midtrans' 
                                                                ? 'bg-slate-800 border-slate-800 text-white' 
                                                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        Online (Midtrans)
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl text-xs font-bold text-slate-700 shadow-sm">
                                                Metode Pembayaran: <span className="font-extrabold text-indigo-650">{data.payment_method === 'midtrans' ? 'Online (Midtrans)' : 'Transfer Bank (Manual)'}</span>
                                            </div>
                                        )}

                                        {/* Terms & Conditions Checkbox */}
                                        {settings.funwalk_terms && (
                                            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl shadow-sm space-y-2 mt-4">
                                                <div className="flex items-start gap-2.5">
                                                    <input 
                                                        type="checkbox" 
                                                        id="accept_terms"
                                                        checked={acceptTerms}
                                                        onChange={e => setAcceptTerms(e.target.checked)}
                                                        className="h-4.5 w-4.5 text-indigo-600 border border-slate-300 rounded focus:ring-indigo-500 focus:ring-offset-0 mt-0.5 cursor-pointer"
                                                    />
                                                    <label htmlFor="accept_terms" className="text-xs font-semibold text-slate-600 cursor-pointer select-none leading-relaxed">
                                                        Saya menyetujui <button type="button" onClick={() => setShowTermsModal(true)} className="text-indigo-600 underline font-bold hover:text-indigo-700">Syarat & Ketentuan</button> yang berlaku untuk acara ini.
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                )}

                                {/* Step Navigation Buttons */}
                                <div className="flex justify-between items-center gap-4 pt-5 border-t border-slate-100">
                                    {currentStep > 1 && (
                                        <button
                                            type="button"
                                            onClick={prevStep}
                                            className="bg-white border border-slate-200 text-slate-650 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-slate-50 active:translate-y-px transition-all"
                                        >
                                            Kembali
                                        </button>
                                    )}
                                    <div className="flex-1" />
                                    {currentStep < 4 ? (
                                         (currentStep === 2 && wantsMerchandise === null && !hasRequiredMerch() && (merchandisePlugin?.settings as any)?.additional !== false) ||
                                         (currentStep === 3 && wantsDonation === null && donationPlugin?.settings?.additional !== false) ? null : (
                                             <button
                                                 type="button"
                                                 onClick={nextStep}
                                                 className="bg-gradient-to-r from-orange-500 to-rose-500 text-white border-0 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:opacity-95 active:translate-y-px flex items-center gap-1.5 transition-all"
                                             >
                                                 Lanjut
                                                 <ArrowRight className="h-4 w-4" />
                                             </button>
                                         )
                                     ) : (
                                        <button
                                            type="submit"
                                            disabled={processing || (settings.funwalk_terms ? !acceptTerms : false)}
                                            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 px-6 py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-widest shadow-md hover:opacity-95 active:translate-y-px transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {processing ? 'Memproses...' : 'Daftar Sekarang'}
                                            <ArrowRight className="h-4.5 w-4.5" />
                                        </button>
                                    )}
                                </div>
                            </form>
                        ) : (
                            <div className="p-8 text-center bg-gray-50">
                                <p className="font-bold text-gray-600">Pendaftaran Belum Dibuka</p>
                                <p className="text-xs text-gray-400 mt-1">Hubungi admin atau panitia reuni untuk informasi lebih lanjut.</p>
                            </div>
                        )}
                    </div>
                </div>

            </main>

            {/* Fun Walk Info Sections */}
            <div className="max-w-7xl mx-auto px-6 mt-16 mb-20 space-y-12 relative z-10">
                {/* Route Section */}
                {(settings.funwalk_route_image || settings.funwalk_route_description || settings.funwalk_map_center) && (
                    <section className="bg-white border border-slate-100 p-8 rounded-2xl shadow-xl shadow-slate-100/50 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                            <div className="md:col-span-7 space-y-4">
                                <h3 className="text-sm font-extrabold uppercase tracking-tight text-white bg-gradient-to-r from-rose-500 to-orange-500 inline-block px-4 py-1.5 rounded-full shadow-sm">
                                    🗺️ Rute Fun Walk
                                </h3>
                                <p className="text-xs font-medium text-slate-650 leading-relaxed whitespace-pre-line">
                                    {settings.funwalk_route_description || "Ikuti keseruan rute jalan santai bersama seluruh peserta. Peta rute dapat dilihat di samping."}
                                </p>
                            </div>
                            <div className="md:col-span-5 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50 shadow-sm min-h-[350px] relative">
                                {settings.funwalk_map_center ? (
                                    <div id="funwalk-map" className="w-full h-[350px] z-0"></div>
                                ) : settings.funwalk_route_image ? (
                                    <img src={settings.funwalk_route_image} alt="Rute Fun Walk" className="w-full h-auto object-cover" />
                                ) : (
                                    <div className="p-8 text-center font-bold text-gray-400">Peta rute belum diunggah.</div>
                                )}
                            </div>
                        </div>

                        {/* Route Elevation Profile Chart */}
                        {settings.funwalk_map_center && elevations.length > 0 && (
                            <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/50 space-y-4 mt-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                        📈 Profil Elevasi Rute (Ketinggian)
                                    </h4>
                                    <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg shadow-sm">
                                        Min: {Math.min(...elevations)}m &bull; Max: {Math.max(...elevations)}m
                                    </span>
                                </div>
                                
                                {elevationLoading ? (
                                    <div className="h-20 flex items-center justify-center text-xs font-bold text-slate-400 animate-pulse">
                                        Menganalisis elevasi rute...
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="relative pt-2">
                                            {(() => {
                                                const min = Math.min(...elevations);
                                                const max = Math.max(...elevations);
                                                const range = max - min || 1;
                                                const points = elevations.map((h, i) => {
                                                    const x = (i / (elevations.length - 1)) * 500;
                                                    const y = 70 - ((h - min) / range) * 60;
                                                    return `${x},${y}`;
                                                });
                                                const areaPath = `M0,80 L${points.join(' L')} L500,80 Z`;
                                                const linePath = `M${points.join(' L')}`;
                                                return (
                                                    <svg viewBox="0 0 500 80" className="w-full h-24 overflow-visible" preserveAspectRatio="none">
                                                        <defs>
                                                            <linearGradient id="elevationGrad" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
                                                                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                                                            </linearGradient>
                                                        </defs>
                                                        <line x1="0" y1="10" x2="500" y2="10" stroke="#e2e8f0" strokeWidth="0.75" strokeDasharray="3 3" />
                                                        <line x1="0" y1="40" x2="500" y2="40" stroke="#e2e8f0" strokeWidth="0.75" strokeDasharray="3 3" />
                                                        <line x1="0" y1="70" x2="500" y2="70" stroke="#e2e8f0" strokeWidth="0.75" strokeDasharray="3 3" />
                                                        <path d={areaPath} fill="url(#elevationGrad)" />
                                                        <path d={linePath} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                );
                                            })()}
                                        </div>
                                        <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-wider pt-1">
                                            <span>🏁 Start</span>
                                            <span>Tengah Rute</span>
                                            <span>🏁 Finish</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                )}

                {/* Racepack Section */}
                {(settings.funwalk_racepack_image || settings.funwalk_racepack_info) && (
                    <section className="bg-white border border-slate-100 p-8 rounded-2xl shadow-xl shadow-slate-100/50 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                        <div className="md:col-span-5 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50 shadow-sm order-last md:order-first">
                            {settings.funwalk_racepack_image ? (
                                <img src={settings.funwalk_racepack_image} alt="Racepack Fun Walk" className="w-full h-auto object-cover" />
                            ) : (
                                <div className="p-8 text-center font-bold text-gray-400">Foto racepack belum diunggah.</div>
                            )}
                        </div>
                        <div className="md:col-span-7 space-y-4">
                            <h3 className="text-sm font-extrabold uppercase tracking-tight text-white bg-gradient-to-r from-blue-500 to-cyan-500 inline-block px-4 py-1.5 rounded-full shadow-sm">
                                🎒 Informasi Racepack
                            </h3>
                            <p className="text-xs font-medium text-slate-650 leading-relaxed whitespace-pre-line">
                                {settings.funwalk_racepack_info || "Setiap pendaftar akan mendapatkan paket racepack menarik. Informasi selengkapnya ada di samping."}
                            </p>
                        </div>
                    </section>
                )}

                {/* Rundown / Schedule Section */}
                {settings.funwalk_schedule && (
                    <section className="bg-white border border-slate-100 p-8 rounded-2xl shadow-xl shadow-slate-100/50 space-y-5">
                        <h3 className="text-sm font-extrabold uppercase tracking-tight text-white bg-gradient-to-r from-emerald-500 to-teal-500 inline-block px-4 py-1.5 rounded-full shadow-sm">
                            📅 Jadwal & Rundown Acara
                        </h3>
                        <div className="border border-slate-100 p-6 bg-slate-50/50 rounded-2xl shadow-sm whitespace-pre-line text-xs font-medium text-slate-650 leading-relaxed">
                            {settings.funwalk_schedule}
                        </div>
                    </section>
                )}

                {/* FAQ Section */}
                {settings.funwalk_faq && (
                    <section className="bg-white border border-slate-100 p-8 rounded-2xl shadow-xl shadow-slate-100/50 space-y-5">
                        <h3 className="text-sm font-extrabold uppercase tracking-tight text-white bg-gradient-to-r from-purple-500 to-pink-500 inline-block px-4 py-1.5 rounded-full shadow-sm">
                            💬 Pertanyaan Umum (FAQ)
                        </h3>
                        <div className="border border-slate-100 p-6 bg-slate-50/50 rounded-2xl shadow-sm whitespace-pre-line text-xs font-medium text-slate-655 leading-relaxed">
                            {settings.funwalk_faq}
                        </div>
                    </section>
                )}

                {/* Contact Section */}
                {settings.funwalk_contact && (
                    <section className="bg-white border border-slate-100 p-8 rounded-2xl shadow-xl shadow-slate-100/50 space-y-5">
                        <h3 className="text-sm font-extrabold uppercase tracking-tight text-white bg-gradient-to-r from-orange-500 to-yellow-500 inline-block px-4 py-1.5 rounded-full shadow-sm">
                            📞 Hubungi Kami (Narahubung)
                        </h3>
                        <div className="border border-slate-100 p-6 bg-slate-50/50 rounded-2xl shadow-sm whitespace-pre-line text-xs font-medium text-slate-655 leading-relaxed">
                            {settings.funwalk_contact}
                        </div>
                    </section>
                )}

                {/* Sponsors Section */}
                {Object.keys(groupedSponsors).length > 0 && (
                    <section className="bg-white border border-slate-100 p-8 rounded-2xl shadow-xl shadow-slate-100/50 space-y-8">
                        <div className="text-center space-y-2">
                            <h3 className="text-sm font-extrabold uppercase tracking-tight text-white bg-slate-900 inline-block px-4 py-1.5 rounded-full shadow-sm">
                                🤝 Sponsor & Partner Resmi
                            </h3>
                            <p className="text-xs font-semibold text-slate-400">{settings.event_title || 'Event'} ini didukung penuh oleh para sponsor dan partner luar biasa</p>
                        </div>

                        <div className="space-y-10">
                            {categoryOrder.map(cat => {
                                const sponsors = groupedSponsors[cat];
                                if (!sponsors || sponsors.length === 0) return null;

                                // Customize size based on tier
                                let cardClass = 'w-48 h-24';
                                if (cat === 'Platinum') {
                                    cardClass = 'w-64 h-32';
                                } else if (cat === 'Gold') {
                                    cardClass = 'w-56 h-28';
                                } else if (cat === 'Silver') {
                                    cardClass = 'w-48 h-24';
                                } else if (cat === 'Bronze' || cat === 'Media Partner' || cat === 'Supported By') {
                                    cardClass = 'w-40 h-20';
                                }

                                return (
                                    <div key={cat} className="space-y-4 text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="h-[1px] bg-slate-200 flex-1 max-w-[100px]"></div>
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                {cat} Partners
                                            </h4>
                                            <div className="h-[1px] bg-slate-200 flex-1 max-w-[100px]"></div>
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-4 justify-center items-center">
                                            {sponsors.map((sp, idx) => {
                                                const cardClassNames = `relative ${cardClass} bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 rounded-xl p-4 flex items-center justify-center transition-all duration-300 hover:shadow-md group cursor-pointer`;
                                                const innerContent = (
                                                    <>
                                                        {sp.logo_path ? (
                                                            <img 
                                                                src={sp.logo_path} 
                                                                alt={sp.name} 
                                                                className="max-w-full max-h-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300 transform group-hover:scale-105" 
                                                            />
                                                        ) : (
                                                            <span className="font-black text-slate-700 uppercase tracking-tight text-xs group-hover:text-indigo-600 transition-colors">
                                                                {sp.name}
                                                            </span>
                                                        )}
                                                        
                                                        {/* Custom premium tooltip */}
                                                        <div className="absolute bottom-full mb-2.5 left-1/2 transform -translate-x-1/2 bg-slate-900/95 backdrop-blur-sm text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-20 scale-95 group-hover:scale-100">
                                                            {sp.name}
                                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900/95"></div>
                                                        </div>
                                                    </>
                                                );

                                                if (sp.url) {
                                                    return (
                                                        <a 
                                                            key={idx} 
                                                            href={sp.url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            title={sp.name}
                                                            className={cardClassNames}
                                                        >
                                                            {innerContent}
                                                        </a>
                                                    );
                                                }

                                                return (
                                                    <div key={idx} title={sp.name} className={cardClassNames}>
                                                        {innerContent}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
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

            {/* Terms Modal */}
            {showTermsModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-100 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-gradient-to-r from-orange-500 via-rose-500 to-indigo-600 p-5 flex justify-between items-center text-white shadow-sm">
                            <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-2">
                                📋 Syarat & Ketentuan
                            </h3>
                            <button 
                                type="button" 
                                onClick={() => setShowTermsModal(false)}
                                className="bg-white/20 hover:bg-white/30 text-white p-1.5 rounded-full transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 md:p-8 overflow-y-auto font-semibold text-xs md:text-sm text-slate-650 whitespace-pre-line leading-relaxed max-h-[55vh] bg-slate-50/30">
                            {settings.funwalk_terms || "Syarat & ketentuan belum dikonfigurasi."}
                        </div>
                        <div className="bg-white border-t border-slate-100 p-4 flex justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setAcceptTerms(true);
                                    setShowTermsModal(false);
                                }}
                                className="bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold text-xs uppercase px-6 py-2.5 rounded-xl shadow-md hover:opacity-95 active:scale-98 transition-all"
                            >
                                Saya Mengerti & Setuju
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
