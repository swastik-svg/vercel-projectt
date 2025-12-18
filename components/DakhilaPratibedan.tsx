import React, { useState, useEffect, useCallback } from 'react';
import { Archive, Plus, Trash2, Printer, Save, CheckCircle2, ArrowLeft, Eye, Edit, ClipboardCheck, X, Calendar, Package, ArrowRight, User as UserIcon } from 'lucide-react';
import { DakhilaPratibedanEntry, DakhilaItem, User, StockEntryRequest, OrganizationSettings } from '../types';

interface DakhilaPratibedanProps {
    dakhilaReports: DakhilaPratibedanEntry[];
    onSaveDakhilaReport: (report: DakhilaPratibedanEntry) => void;
    currentFiscalYear: string;
    currentUser: User;
    // New Props for Handling Pending Requests directly here
    stockEntryRequests?: StockEntryRequest[]; 
    onApproveStockEntry?: (requestId: string, approverName: string) => void;
    onRejectStockEntry?: (requestId: string, reason: string, approverName: string) => void;
    generalSettings: OrganizationSettings;
}

export const DakhilaPratibedan: React.FC<DakhilaPratibedanProps> = ({ 
    dakhilaReports, 
    onSaveDakhilaReport, 
    currentFiscalYear, 
    currentUser,
    stockEntryRequests = [],
    onApproveStockEntry,
    onRejectStockEntry,
    generalSettings
}) => {
    const [selectedReport, setSelectedReport] = useState<DakhilaPratibedanEntry | null>(null);
    const [isViewOnlyMode, setIsViewOnlyMode] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    
    // State to track if we are previewing a pending request
    const [previewRequestId, setPreviewRequestId] = useState<string | null>(null);

    // Form Details
    const [reportDetails, setReportDetails] = useState({
        dakhilaNo: '',
        date: '',
        entryType: 'जिन्सी मालसामान (खर्च भएर जाने)', // Default value
        orderNo: '', // Purchase Order/Transfer Form No
        preparedBy: { name: '', designation: '', date: '' },
        recommendedBy: { name: '', designation: '', date: '' },
        approvedBy: { name: '', designation: '', date: '' },
    });

    const [items, setItems] = useState<DakhilaItem[]>([
        { 
            id: Date.now(), name: '', codeNo: '', specification: '', source: '', unit: '', 
            quantity: 0, rate: 0, vatAmount: 0, totalAmount: 0, grandTotal: 0, otherExpenses: 0, finalTotal: 0, remarks: '' 
        }
    ]);

    // Helper to get today's date (placeholder for Nepali date conversion)
    const getTodayNepaliDate = () => {
        // In real app, use date converter. For now, mocking structure YYYY/MM/DD
        return new Date().toISOString().split('T')[0].replace(/-/g, '/'); 
    };

    const handleLoadReport = (report: DakhilaPratibedanEntry, viewOnly: boolean = false) => {
        setSelectedReport(report);
        setIsViewOnlyMode(viewOnly);
        setPreviewRequestId(null); // Ensure we are not in preview mode
        setSuccessMessage(null);
        
        // Determine entry type based on saved items if available, or default
        // Usually Dakhila Report doesn't explicitly save 'entryType' in DB schema provided, 
        // so we infer or default.
        const inferredType = 'जिन्सी मालसामान (खर्च भएर जाने)'; 

        setReportDetails({
            dakhilaNo: report.dakhilaNo,
            date: report.date,
            entryType: inferredType, 
            orderNo: report.orderNo,
            preparedBy: report.preparedBy ? { 
                name: report.preparedBy.name, 
                designation: report.preparedBy.designation || '', 
                date: report.preparedBy.date || '' 
            } : { name: '', designation: '', date: '' },
            recommendedBy: report.recommendedBy ? {
                name: report.recommendedBy.name,
                designation: report.recommendedBy.designation || '',
                date: report.recommendedBy.date || ''
            } : { name: '', designation: '', date: '' },
            approvedBy: report.approvedBy ? {
                name: report.approvedBy.name,
                designation: report.approvedBy.designation || '',
                date: report.approvedBy.date || ''
            } : { name: '', designation: '', date: '' },
        });
        setItems(report.items || []); // Ensure items is array
    };

    const handleCreateNew = useCallback(() => {
        // Find next Dakhila No
        const reportsInFY = dakhilaReports.filter(r => r.fiscalYear === currentFiscalYear);
        const maxNo = reportsInFY.reduce((max, r) => Math.max(max, parseInt(r.dakhilaNo || '0')), 0);
        const nextNo = (maxNo + 1).toString();

        setSelectedReport({
            id: Date.now().toString(),
            fiscalYear: currentFiscalYear,
            dakhilaNo: nextNo,
            date: getTodayNepaliDate(),
            orderNo: '',
            items: [],
            status: 'Draft'
        });
        
        setReportDetails({
            dakhilaNo: nextNo,
            date: getTodayNepaliDate(),
            entryType: 'जिन्सी मालसामान (खर्च भएर जाने)',
            orderNo: '',
            preparedBy: { name: currentUser.fullName, designation: currentUser.designation, date: getTodayNepaliDate() },
            recommendedBy: { name: '', designation: '', date: '' },
            approvedBy: { name: '', designation: '', date: '' },
        });

        setItems([{ 
            id: Date.now(), name: '', codeNo: '', specification: '', source: '', unit: '', 
            quantity: 0, rate: 0, vatAmount: 0, totalAmount: 0, grandTotal: 0, otherExpenses: 0, finalTotal: 0, remarks: '' 
        }]);
        
        setIsViewOnlyMode(false);
        setPreviewRequestId(null);
        setSuccessMessage(null);
    }, [dakhilaReports, currentFiscalYear, currentUser]);

    const handleBack = () => {
        setSelectedReport(null);
        setIsViewOnlyMode(false);
        setPreviewRequestId(null);
        setSuccessMessage(null);
    };

    const handleAddItem = () => {
        setItems([...items, { 
            id: Date.now(), name: '', codeNo: '', specification: '', source: '', unit: '', 
            quantity: 0, rate: 0, vatAmount: 0, totalAmount: 0, grandTotal: 0, otherExpenses: 0, finalTotal: 0, remarks: '' 
        }]);
    };

    const handleRemoveItem = (id: number) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const handleItemChange = (id: number, field: keyof DakhilaItem, value: any) => {
        setItems(items.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value };
                
                // Auto Calculations
                if (['quantity', 'rate', 'vatAmount', 'otherExpenses'].includes(field)) {
                    const qty = field === 'quantity' ? parseFloat(value) || 0 : item.quantity;
                    const rate = field === 'rate' ? parseFloat(value) || 0 : item.rate;
                    const vat = field === 'vatAmount' ? parseFloat(value) || 0 : item.vatAmount;
                    const other = field === 'otherExpenses' ? parseFloat(value) || 0 : item.otherExpenses;

                    updatedItem.totalAmount = qty * rate;
                    updatedItem.grandTotal = updatedItem.totalAmount + vat;
                    updatedItem.finalTotal = updatedItem.grandTotal + other;
                }
                return updatedItem;
            }
            return item;
        }));
    };

    const handleSave = () => {
        if(!selectedReport) return;
        setIsProcessing(true);

        const updatedReport: DakhilaPratibedanEntry = {
            ...selectedReport,
            dakhilaNo: reportDetails.dakhilaNo,
            date: reportDetails.date,
            orderNo: reportDetails.orderNo,
            items: items,
            preparedBy: reportDetails.preparedBy,
            recommendedBy: reportDetails.recommendedBy,
            approvedBy: reportDetails.approvedBy,
            status: 'Final'
        };

        // Simulate network
        setTimeout(() => {
            onSaveDakhilaReport(updatedReport);
            setIsProcessing(false);
            setSuccessMessage("दाखिला प्रतिवेदन सुरक्षित गरियो (Entry Report Saved Successfully)!");
            // Return to list after saving
            setTimeout(() => {
                setSuccessMessage(null);
                handleBack();
            }, 1000);
        }, 600);
    };

    // --- Handling Pending Requests (Preview & Approval) ---
    const pendingRequests = stockEntryRequests.filter(r => r.status === 'Pending');
    const isApprover = ['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role);

    // Convert a Request to a Dakhila Report Preview
    const handlePreviewRequest = (request: StockEntryRequest) => {
        // Calculate potential next Dakhila No (Fallback)
        const reportsInFY = dakhilaReports.filter(r => r.fiscalYear === currentFiscalYear);
        const maxNo = reportsInFY.reduce((max, r) => Math.max(max, parseInt(r.dakhilaNo || '0')), 0);
        let nextDakhilaNo = (maxNo + 1).toString();

        // Use Dakhila No from request if available (taking from first item)
        if (request.items.length > 0 && request.items[0].dakhilaNo) {
             const rawNo = request.items[0].dakhilaNo;
             const parts = rawNo.split('-');
             if (parts.length >= 3 && !isNaN(parseInt(parts[parts.length - 1]))) {
                 nextDakhilaNo = parseInt(parts[parts.length - 1]).toString();
             } else {
                 nextDakhilaNo = rawNo;
             }
        }

        // Determine Entry Type from Request Items (Check first item)
        let entryTypeLabel = 'जिन्सी मालसामान (खर्च भएर जाने)';
        if (request.items.length > 0 && request.items[0].itemType === 'Non-Expendable') {
            entryTypeLabel = 'जिन्सी मालसामान (खर्च नहुने)';
        }

        // Map items from Request to Dakhila Structure
        const previewItems: DakhilaItem[] = request.items.map((item, index) => {
            const qty = item.currentQuantity || 0;
            // 2. Fetch Rate from Request
            const rate = item.rate || 0; 
            const total = qty * rate;
            
            // 3. Calculate VAT Amount based on Tax % from Request
            const taxPercent = item.tax || 0; 
            const vatAmount = total * (taxPercent / 100);
            
            // 4. Calculate Grand Total
            const grandTotal = total + vatAmount;

            return {
                id: Date.now() + index, 
                name: item.itemName,
                codeNo: item.sanketNo || item.uniqueCode || '',
                specification: item.specification || '', // Mapped from Request Specification
                source: request.receiptSource,
                unit: item.unit,
                quantity: qty,
                rate: rate,
                totalAmount: total, 
                vatAmount: vatAmount,
                grandTotal: grandTotal,
                otherExpenses: 0,
                finalTotal: grandTotal, // Assuming no other expenses in basic request
                remarks: item.remarks || ''
            };
        });

        // Format Date: Replace '-' with '/' to match YYYY/MM/DD
        const formattedDate = request.requestDateBs.replace(/-/g, '/');

        // Set up the temporary report for preview
        setSelectedReport({
            id: 'PREVIEW_TEMP',
            fiscalYear: request.fiscalYear,
            dakhilaNo: nextDakhilaNo, // From request or calc
            date: formattedDate,
            orderNo: request.refNo || '',
            items: previewItems,
            status: 'Draft',
            preparedBy: { 
                name: request.requesterName || request.requestedBy, // Use Full Name if available
                designation: request.requesterDesignation || 'Store Assistant', // Use Designation if available
                date: formattedDate 
            },
            recommendedBy: { name: '', designation: '', date: '' },
            approvedBy: { name: currentUser.fullName, designation: currentUser.designation, date: getTodayNepaliDate() }
        });

        // Populate Form State
        setReportDetails({
            dakhilaNo: nextDakhilaNo,
            date: formattedDate,
            entryType: entryTypeLabel, // Set Dynamic Entry Type
            orderNo: request.refNo || '',
            preparedBy: { 
                name: request.requesterName || request.requestedBy, 
                designation: request.requesterDesignation || 'Store Assistant', 
                date: formattedDate 
            },
            recommendedBy: { name: '', designation: '', date: '' },
            approvedBy: { name: currentUser.fullName, designation: currentUser.designation, date: getTodayNepaliDate() },
        });

        setItems(previewItems);
        setPreviewRequestId(request.id); // Mark as Preview Mode
        setIsViewOnlyMode(true); // Preview is essentially view only (verifying), but we allow Approve action
    };

    const handleApproveFromPreview = () => {
        if (!previewRequestId || !onApproveStockEntry) return;
        
        setIsProcessing(true);
        // Trigger the logic in App.tsx to Add to Stock and Generate the Real Report
        onApproveStockEntry(previewRequestId, currentUser.fullName);
        
        setTimeout(() => {
            setIsProcessing(false);
            setSuccessMessage("दाखिला स्वीकृत भयो र स्टक थपियो (Approved & Added to Stock)!");
            setTimeout(() => {
                handleBack();
            }, 1500);
        }, 500);
    };

    // Calculate Footer Totals for current form
    const totalAmountSum = items.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const totalVatSum = items.reduce((sum, item) => sum + (item.vatAmount || 0), 0);
    const grandTotalSum = items.reduce((sum, item) => sum + (item.grandTotal || 0), 0);
    const finalTotalSum = items.reduce((sum, item) => sum + (item.finalTotal || 0), 0);

    if (selectedReport) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                {/* Actions Bar */}
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
                    <div className="flex items-center gap-4">
                        <button onClick={handleBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h2 className="font-bold text-slate-700 font-nepali text-lg">
                                {previewRequestId ? 'प्रिभ्यु: दाखिला प्रतिवेदन (Preview Entry Report)' : 'दाखिला प्रतिवेदन (Entry Report)'}
                            </h2>
                            <p className="text-xs text-slate-500">
                                {previewRequestId ? 'कृपया विवरण यकिन गरेर स्वीकृत गर्नुहोस् (Please verify and approve)' : `Form No: ${reportDetails.dakhilaNo}`}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {/* If in Preview Mode, Show Approve Button */}
                        {previewRequestId ? (
                            <button 
                                onClick={handleApproveFromPreview} 
                                disabled={isProcessing} 
                                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50 animate-pulse"
                            >
                                {isProcessing ? 'Processing...' : <><CheckCircle2 size={18} /> Approve & Add to Stock</>}
                            </button>
                        ) : (
                            // Normal Save Button
                            !isViewOnlyMode && (
                                <button onClick={handleSave} disabled={isProcessing} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50">
                                    {isProcessing ? 'Saving...' : <><Save size={18} /> Save Report</>}
                                </button>
                            )
                        )}
                        
                        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-lg font-medium shadow-sm transition-colors">
                            <Printer size={18} /> Print
                        </button>
                    </div>
                </div>

                {successMessage && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl shadow-sm flex items-center gap-3">
                        <CheckCircle2 className="text-green-500" size={24} />
                        <p className="text-green-700 font-medium">{successMessage}</p>
                    </div>
                )}

                {/* REPORT FORM (A4 Style) */}
                <div className={`bg-white p-8 md:p-12 rounded-xl shadow-lg max-w-[297mm] mx-auto min-h-[210mm] text-slate-900 font-nepali text-xs print:shadow-none print:p-0 print:max-w-none landscape:w-full overflow-x-auto ${previewRequestId ? 'ring-4 ring-teal-50' : ''}`}>
                    
                    {/* Preview Watermark */}
                    {previewRequestId && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-10 -rotate-45 z-0">
                            <span className="text-[150px] font-bold text-teal-600 border-4 border-teal-600 px-10 rounded-xl">PREVIEW</span>
                        </div>
                    )}

                    <div className="text-right text-xs font-bold mb-4">
                        म.ले.प.फारम नं: ४०३
                    </div>

                    <div className="mb-8">
                        <div className="flex items-start justify-between">
                            <div className="w-24 pt-2"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" alt="Emblem" className="h-24 w-24 object-contain"/></div>
                            <div className="flex-1 text-center space-y-1">
                                <h1 className="text-xl font-bold text-red-600">{generalSettings.orgNameNepali}</h1>
                                {generalSettings.subTitleNepali && <h2 className="text-lg font-bold">{generalSettings.subTitleNepali}</h2>}
                                {generalSettings.subTitleNepali2 && <h3 className="text-base font-bold">{generalSettings.subTitleNepali2}</h3>}
                                {generalSettings.subTitleNepali3 && <h3 className="text-lg font-bold">{generalSettings.subTitleNepali3}</h3>}
                                {/* ADDED: Contact Details Row */}
                                <div className="text-xs mt-2 space-x-3 font-medium text-slate-600">
                                    {generalSettings.address && <span>{generalSettings.address}</span>}
                                    {generalSettings.phone && <span>| फोन: {generalSettings.phone}</span>}
                                    {generalSettings.email && <span>| ईमेल: {generalSettings.email}</span>}
                                    {generalSettings.panNo && <span>| पान नं: {generalSettings.panNo}</span>}
                                </div>
                            </div>
                            <div className="w-24"></div> 
                        </div>
                        <div className="text-center pt-6 pb-2">
                            <h2 className="text-xl font-bold underline underline-offset-4">दाखिला प्रतिवेदन फाराम</h2>
                        </div>
                    </div>

                    <div className="flex justify-between items-end mb-6 text-sm font-medium">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span>दाखिला नं. :</span>
                                <input value={reportDetails.dakhilaNo} readOnly className="border-b border-dotted border-slate-800 w-24 text-center bg-transparent font-bold text-red-600 cursor-default"/>
                            </div>
                            <div className="flex items-center gap-2">
                                <span>आर्थिक वर्ष :</span>
                                <input value={selectedReport.fiscalYear} readOnly className="border-b border-dotted border-slate-800 w-24 text-center bg-transparent font-bold cursor-default"/>
                            </div>
                        </div>
                        <div className="space-y-1 text-right">
                            <div className="flex items-center gap-2 justify-end">
                                <span>मिति :</span>
                                <input value={reportDetails.date} readOnly className="border-b border-dotted border-slate-800 w-24 text-center bg-transparent font-bold cursor-default"/>
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                                <span>खरिद आदेश / हस्तान्तरण फारम नं :</span>
                                <input 
                                    value={reportDetails.orderNo} 
                                    onChange={e => setReportDetails({...reportDetails, orderNo: e.target.value})} 
                                    className="border-b border-dotted border-slate-800 w-32 text-center outline-none bg-transparent"
                                    disabled={isViewOnlyMode}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <table className="w-full border-collapse border border-slate-900 text-center align-middle text-[11px]">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="border border-slate-900 p-1 w-8" rowSpan={2}>क्र.सं.</th>
                                <th className="border border-slate-900 p-1" colSpan={5}>विवरण</th>
                                <th className="border border-slate-900 p-1 w-12" rowSpan={2}>एकाई</th>
                                <th className="border border-slate-900 p-1 w-12" rowSpan={2}>परिमाण</th>
                                <th className="border border-slate-900 p-1 w-16" rowSpan={2}>दर</th>
                                <th className="border border-slate-900 p-1 w-20" rowSpan={2}>जम्मा रकम</th>
                                <th className="border border-slate-900 p-1 w-16" rowSpan={2}>अन्य खर्च</th>
                                <th className="border border-slate-900 p-1 w-20" rowSpan={2}>कूल जम्मा</th>
                                <th className="border border-slate-900 p-1 w-24" rowSpan={2}>कैफियत</th>
                            </tr>
                            <tr className="bg-slate-50">
                                <th className="border border-slate-900 p-1 w-20">सङ्केत नं.</th>
                                <th className="border border-slate-900 p-1 w-48">नाम</th>
                                <th className="border border-slate-900 p-1 w-24">स्पेसिफिकेसन</th>
                                <th className="border border-slate-900 p-1 w-24">मोडल</th>
                                <th className="border border-slate-900 p-1 w-24">प्राप्तिको स्रोत</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={item.id}>
                                    <td className="border border-slate-900 p-1">{index + 1}</td>
                                    <td className="border border-slate-900 p-1">
                                        <input 
                                            value={item.codeNo} 
                                            onChange={e => handleItemChange(item.id, 'codeNo', e.target.value)}
                                            className="w-full text-center outline-none bg-transparent disabled:cursor-not-allowed"
                                            disabled={isViewOnlyMode}
                                        />
                                    </td>
                                    <td className="border border-slate-900 p-1">
                                        <input 
                                            value={item.name} 
                                            onChange={e => handleItemChange(item.id, 'name', e.target.value)}
                                            className="w-full text-left px-1 outline-none bg-transparent disabled:cursor-not-allowed"
                                            disabled={isViewOnlyMode}
                                        />
                                    </td>
                                    <td className="border border-slate-900 p-1">
                                        <input 
                                            value={item.specification} 
                                            onChange={e => handleItemChange(item.id, 'specification', e.target.value)}
                                            className="w-full text-left px-1 outline-none bg-transparent disabled:cursor-not-allowed"
                                            disabled={isViewOnlyMode}
                                        />
                                    </td>
                                    <td className="border border-slate-900 p-1">-</td>
                                    <td className="border border-slate-900 p-1">
                                        <input 
                                            value={item.source} 
                                            onChange={e => handleItemChange(item.id, 'source', e.target.value)}
                                            className="w-full text-center outline-none bg-transparent disabled:cursor-not-allowed"
                                            disabled={isViewOnlyMode}
                                        />
                                    </td>
                                    <td className="border border-slate-900 p-1">
                                        <input 
                                            value={item.unit} 
                                            onChange={e => handleItemChange(item.id, 'unit', e.target.value)}
                                            className="w-full text-center outline-none bg-transparent disabled:cursor-not-allowed"
                                            disabled={isViewOnlyMode}
                                        />
                                    </td>
                                    <td className="border border-slate-900 p-1 font-bold">
                                        <input 
                                            type="number"
                                            value={item.quantity || ''} 
                                            onChange={e => handleItemChange(item.id, 'quantity', e.target.value)}
                                            className="w-full text-center outline-none bg-transparent font-bold disabled:cursor-not-allowed"
                                            disabled={isViewOnlyMode}
                                        />
                                    </td>
                                    <td className="border border-slate-900 p-1">
                                        <input 
                                            type="number"
                                            value={item.rate || ''} 
                                            onChange={e => handleItemChange(item.id, 'rate', e.target.value)}
                                            className="w-full text-right px-1 outline-none bg-transparent disabled:cursor-not-allowed"
                                            disabled={isViewOnlyMode}
                                        />
                                    </td>
                                    <td className="border border-slate-900 p-1 text-right px-1">
                                        {item.totalAmount.toFixed(2)}
                                    </td>
                                    <td className="border border-slate-900 p-1">
                                        <input 
                                            type="number"
                                            value={item.otherExpenses || ''} 
                                            onChange={e => handleItemChange(item.id, 'otherExpenses', e.target.value)}
                                            className="w-full text-right px-1 outline-none bg-transparent disabled:cursor-not-allowed"
                                            disabled={isViewOnlyMode}
                                        />
                                    </td>
                                    <td className="border border-slate-900 p-1 text-right px-1 font-bold">
                                        {item.finalTotal.toFixed(2)}
                                    </td>
                                    <td className="border border-slate-900 p-1">
                                        <input 
                                            value={item.remarks} 
                                            onChange={e => handleItemChange(item.id, 'remarks', e.target.value)}
                                            className="w-full text-center outline-none bg-transparent disabled:cursor-not-allowed"
                                            disabled={isViewOnlyMode}
                                        />
                                    </td>
                                </tr>
                            ))}
                            <tr className="font-bold bg-slate-50">
                                <td colSpan={9} className="border border-slate-900 p-1 text-right pr-2">जम्मा</td>
                                <td className="border border-slate-900 p-1 text-right px-1">{totalAmountSum.toFixed(2)}</td>
                                <td className="border border-slate-900 p-1"></td>
                                <td className="border border-slate-900 p-1 text-right px-1">{finalTotalSum.toFixed(2)}</td>
                                <td className="border border-slate-900 p-1"></td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="grid grid-cols-3 gap-8 text-sm mt-8 pt-8">
                        <div>
                            <h4 className="font-bold mb-4">फाँटवालाको दस्तखत:</h4>
                            <div className="space-y-1">
                                <div className="flex gap-2">
                                    <span className="w-10">नाम:</span>
                                    <input value={reportDetails.preparedBy.name} onChange={e => setReportDetails({...reportDetails, preparedBy: {...reportDetails.preparedBy, name: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent" disabled={isViewOnlyMode}/>
                                </div>
                                <div className="flex gap-2">
                                    <span className="w-10">पद:</span>
                                    <input value={reportDetails.preparedBy.designation} onChange={e => setReportDetails({...reportDetails, preparedBy: {...reportDetails.preparedBy, designation: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent" disabled={isViewOnlyMode}/>
                                </div>
                                <div className="flex gap-2">
                                    <span className="w-10">मिति:</span>
                                    <input value={reportDetails.preparedBy.date} onChange={e => setReportDetails({...reportDetails, preparedBy: {...reportDetails.preparedBy, date: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent" disabled={isViewOnlyMode}/>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold mb-4">प्रमाणित गर्नेको दस्तखत:</h4>
                            <div className="space-y-1">
                                <div className="flex gap-2">
                                    <span className="w-10">नाम:</span>
                                    <input value={reportDetails.recommendedBy.name} onChange={e => setReportDetails({...reportDetails, recommendedBy: {...reportDetails.recommendedBy, name: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent" disabled={isViewOnlyMode}/>
                                </div>
                                <div className="flex gap-2">
                                    <span className="w-10">पद:</span>
                                    <input value={reportDetails.recommendedBy.designation} onChange={e => setReportDetails({...reportDetails, recommendedBy: {...reportDetails.recommendedBy, designation: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent" disabled={isViewOnlyMode}/>
                                </div>
                                <div className="flex gap-2">
                                    <span className="w-10">मिति:</span>
                                    <input value={reportDetails.recommendedBy.date} onChange={e => setReportDetails({...reportDetails, recommendedBy: {...reportDetails.recommendedBy, date: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent" disabled={isViewOnlyMode}/>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold mb-4">कार्यालय प्रमुखको दस्तखत:</h4>
                            <div className="space-y-1">
                                <div className="flex gap-2">
                                    <span className="w-10">नाम:</span>
                                    <input value={reportDetails.approvedBy.name} onChange={e => setReportDetails({...reportDetails, approvedBy: {...reportDetails.approvedBy, name: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent" disabled={isViewOnlyMode}/>
                                </div>
                                <div className="flex gap-2">
                                    <span className="w-10">पद:</span>
                                    <input value={reportDetails.approvedBy.designation} onChange={e => setReportDetails({...reportDetails, approvedBy: {...reportDetails.approvedBy, designation: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent" disabled={isViewOnlyMode}/>
                                </div>
                                <div className="flex gap-2">
                                    <span className="w-10">मिति:</span>
                                    <input value={reportDetails.approvedBy.date} onChange={e => setReportDetails({...reportDetails, approvedBy: {...reportDetails.approvedBy, date: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent" disabled={isViewOnlyMode}/>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Filter Logic for List View
    const relevantReports = dakhilaReports.filter(report => {
        // If Admin, Super Admin, Approval, or Storekeeper -> See All
        if (['ADMIN', 'SUPER_ADMIN', 'APPROVAL', 'STOREKEEPER'].includes(currentUser.role)) {
            return true;
        }
        // If Staff/Other -> See only their own (Matching Full Name or Username)
        // This checks if the user Prepared (Requested) the entry
        return (report.preparedBy?.name === currentUser.fullName || report.preparedBy?.name === currentUser.username);
    }).sort((a, b) => parseInt(b.dakhilaNo || '0') - parseInt(a.dakhilaNo || '0'));

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                        <Archive size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 font-nepali">दाखिला प्रतिवेदन (Entry Report)</h2>
                        <p className="text-sm text-slate-500">नयाँ सामान दाखिला तथा प्रतिवेदन व्यवस्थापन</p>
                    </div>
                </div>
                
                <button onClick={handleCreateNew} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg font-medium shadow-sm transition-colors">
                    <Plus size={18} /> New Entry
                </button>
            </div>

            {/* PENDING REQUESTS SECTION */}
            {isApprover && pendingRequests.length > 0 && (
                <div className="bg-white rounded-xl border border-teal-200 shadow-sm overflow-hidden mb-6">
                    <div className="px-6 py-4 border-b border-teal-100 bg-teal-50 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <ClipboardCheck size={18} className="text-teal-600"/>
                            <h3 className="font-semibold text-teal-800 font-nepali">
                                स्टक प्रविष्टि अनुरोधहरू (Pending Stock Entries)
                            </h3>
                        </div>
                        <span className="bg-teal-200 text-teal-800 text-xs font-bold px-2 py-1 rounded-full">{pendingRequests.length}</span>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-medium">
                            <tr>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Source / Supplier</th>
                                <th className="px-6 py-3">Items</th>
                                <th className="px-6 py-3">Requested By</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pendingRequests.map(req => (
                                <tr key={req.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-nepali">
                                        {req.requestDateBs}
                                        <div className="text-xs text-slate-400">{req.requestDateAd}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-800">{req.receiptSource}</div>
                                        <div className="text-xs text-slate-500">{req.supplier || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Package size={14} />
                                            <span>{req.items.length} items</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {req.requesterName || req.requestedBy}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => handlePreviewRequest(req)}
                                            className="text-teal-600 hover:text-teal-800 font-medium text-xs flex items-center justify-end gap-1 bg-teal-50 px-3 py-1.5 rounded-md hover:bg-teal-100 transition-colors border border-teal-200"
                                        >
                                            <Eye size={14} /> Review
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* DAKHILA HISTORY */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-700 font-nepali">दाखिला इतिहास (Entry History)</h3>
                </div>
                {dakhilaReports.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 italic">कुनै दाखिला प्रतिवेदन फेला परेन (No reports found)</div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-medium">
                            <tr>
                                <th className="px-6 py-3">Dakhila No</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Order No</th>
                                <th className="px-6 py-3">Items</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {dakhilaReports.map(report => (
                                <tr key={report.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-mono font-medium text-purple-600">#{report.dakhilaNo}</td>
                                    <td className="px-6 py-4 font-nepali">{report.date}</td>
                                    <td className="px-6 py-4 text-slate-600 font-mono">{report.orderNo || '-'}</td>
                                    <td className="px-6 py-4 text-slate-600">{report.items.length} items</td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => handleLoadReport(report, true)}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-md text-xs font-bold transition-colors border border-slate-300"
                                        >
                                            <Eye size={14} /> View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};