
import React, { useState, useMemo } from 'react';
import { Printer, Calendar, FileText, Filter, Package, AlertCircle, ArrowRight, Hash, FilePlus, Save, CheckCircle2, X } from 'lucide-react';
import { Select } from './Select';
import { Input } from './Input';
import { EnglishDatePicker } from './EnglishDatePicker';
import { FISCAL_YEARS } from '../constants';
import { InventoryItem, Store, User, MagFormEntry, OrganizationSettings } from '../types';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface InventoryMonthlyReportProps {
  currentFiscalYear: string;
  currentUser: User;
  inventoryItems: InventoryItem[];
  stores: Store[]; 
  // Props for generating Mag Faram
  magForms: MagFormEntry[];
  onSaveMagForm: (form: MagFormEntry) => void;
  generalSettings: OrganizationSettings; // Added
}

// Helper to get today's date in YYYY/MM/DD Nepali format
const getTodayNepaliDate = () => {
  try {
      const today = new Date();
      const nd = new NepaliDate(today);
      return nd.format('YYYY/MM/DD');
  } catch (e) {
      // Fallback if library fails
      const today = new Date();
      return `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
  }
};

// Helper to derive Nepali Month Name from English Date
const getNepaliMonthName = (dateStr: string) => {
    if (!dateStr) return '';
    try {
        const [y, m, d] = dateStr.split('-').map(Number);
        // Set time to 12:00 to avoid timezone offset issues (e.g. UTC vs Local causing previous day)
        const date = new Date(y, m - 1, d, 12, 0, 0);
        const nd = new NepaliDate(date);
        const monthIndex = nd.getMonth(); // 0 = Baishakh
        const months = ['बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत्र'];
        return months[monthIndex] || '';
    } catch (e) {
        console.error("Date conversion error", e);
        return '';
    }
};

// Helper to convert AD to BS
const convertADtoBS = (adDate: string) => {
    if (!adDate) return '';
    try {
        const [y, m, d] = adDate.split('-').map(Number);
        // Set time to 12:00 to avoid timezone offset issues
        const date = new Date(y, m - 1, d, 12, 0, 0);
        const nd = new NepaliDate(date);
        return nd.format('YYYY/MM/DD');
    } catch (e) {
        return '';
    }
};

export const InventoryMonthlyReport: React.FC<InventoryMonthlyReportProps> = ({ 
  currentFiscalYear, 
  currentUser,
  inventoryItems,
  stores,
  magForms,
  onSaveMagForm,
  generalSettings
}) => {
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(currentFiscalYear);
  
  // Date Range State (English)
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Ledger Page Range State
  const [fromLedgerPageNo, setFromLedgerPageNo] = useState('');
  const [toLedgerPageNo, setToLedgerPageNo] = useState('');

  // State for Mag Faram Modal
  const [showMagFaramPreview, setShowMagFaramPreview] = useState(false);
  const [previewMagForm, setPreviewMagForm] = useState<MagFormEntry | null>(null);
  const [isSavingForm, setIsSavingForm] = useState(false);

  // Calculate Nepali Month based on selected date range (Prefer 'To Date', fallback to 'From Date')
  const reportNepaliMonth = useMemo(() => {
      if (toDate) return getNepaliMonthName(toDate);
      if (fromDate) return getNepaliMonthName(fromDate);
      return ''; // Or default to current month if needed
  }, [fromDate, toDate]);

  // Memoize report data generation for performance
  const reportData = useMemo(() => {
    // Filter inventory items relevant to the selected fiscal year and Date Range
    const itemsForReport = inventoryItems.filter(item => {
      // 1. Fiscal Year Filter
      const matchFY = item.fiscalYear === selectedFiscalYear;

      // 2. Item Type Filter (Expendable Only)
      const matchType = item.itemType === 'Expendable';
      
      // 3. Date Range Filter (Based on Last Update Date)
      // If dates are provided, check if item's last update falls within range
      let matchDate = true;
      if (fromDate && toDate && item.lastUpdateDateAd) {
          matchDate = item.lastUpdateDateAd >= fromDate && item.lastUpdateDateAd <= toDate;
      } else if (fromDate && item.lastUpdateDateAd) {
          matchDate = item.lastUpdateDateAd >= fromDate;
      } else if (toDate && item.lastUpdateDateAd) {
          matchDate = item.lastUpdateDateAd <= toDate;
      }

      // 4. Ledger Page No Filter
      let matchLedger = true;
      // Parse to integer for comparison. Handle alphanumeric logic if needed, but '1 dekhi 291' implies numbers.
      // Remove non-numeric characters to try and get a number (e.g. 'P-1' -> 1)
      const extractNumber = (str?: string) => {
          if (!str) return 0;
          const match = str.match(/\d+/);
          return match ? parseInt(match[0]) : 0;
      };

      const itemLedgerNo = extractNumber(item.ledgerPageNo);
      const fromL = parseInt(fromLedgerPageNo);
      const toL = parseInt(toLedgerPageNo);

      if (!isNaN(fromL) && !isNaN(toL)) {
          matchLedger = itemLedgerNo >= fromL && itemLedgerNo <= toL;
      } else if (!isNaN(fromL)) {
          matchLedger = itemLedgerNo >= fromL;
      } else if (!isNaN(toL)) {
          matchLedger = itemLedgerNo <= toL;
      }

      return matchFY && matchType && matchDate && matchLedger;
    });

    // Group items by unique name and unit
    const groupedItems: { [key: string]: { item: InventoryItem; receivedQuantity: number } } = {};

    itemsForReport.forEach(invItem => {
        const key = `${invItem.itemName}-${invItem.unit}`;
        if (!groupedItems[key]) {
            groupedItems[key] = {
                item: invItem, 
                receivedQuantity: 0
            };
        }
        groupedItems[key].receivedQuantity = 0; 
    });

    return Object.values(groupedItems).map(group => {
      const { item } = group;
      
      // 1. Current Stock (Actual)
      const thisMonthBalance = item.currentQuantity || 0;

      // 2. Mapped ASL & EOP
      const approvedStockLevel = item.approvedStockLevel || 0;
      const emergencyOrderPoint = item.emergencyOrderPoint || 0;

      // 3. Logic: Calculate Quantity to Order
      // User Request: Order = ASL - Balance
      let quantityToOrder = 0;
      if (approvedStockLevel > 0) {
          quantityToOrder = approvedStockLevel - thisMonthBalance;
      }
      if (quantityToOrder < 0) quantityToOrder = 0;

      // 4. Back-calculate previous month (Mocking Issued/Received since we lack history)
      const thisMonthReceived = 0; 
      const thisMonthIssued = 0;
      const previousMonthBalance = thisMonthBalance; 
      const totalQuantity = previousMonthBalance + thisMonthReceived;

      return {
        ...item,
        previousMonthBalance,
        thisMonthReceived,
        thisMonthIssued,
        total: totalQuantity,
        thisMonthBalance,
        approvedStockLevel,
        emergencyOrderPoint,
        quantityToOrder,
        remarks: item.remarks || '',
      };
    }).sort((a, b) => {
        // Extract numbers for sorting: "P-1" vs "P-10" should sort numerically 1 vs 10
        const extractNumber = (str?: string) => {
            if (!str) return 0;
            const match = str.match(/\d+/);
            return match ? parseInt(match[0]) : 0;
        };
        const ledA = extractNumber(a.ledgerPageNo);
        const ledB = extractNumber(b.ledgerPageNo);
        
        if (ledA !== ledB) {
            return ledA - ledB;
        }
        return a.itemName.localeCompare(b.itemName);
    }); 
  }, [inventoryItems, selectedFiscalYear, fromDate, toDate, fromLedgerPageNo, toLedgerPageNo]);

  const getFiscalYearLabel = (value: string) => {
    return FISCAL_YEARS.find(fy => fy.value === value)?.label || value;
  };

  const handleGenerateMagFaram = () => {
      // 1. Filter items that need ordering
      const itemsToOrder = reportData.filter(d => d.quantityToOrder > 0);

      if (itemsToOrder.length === 0) {
          alert('माग गर्नुपर्ने परिमाण (Quantity to Order) भएको कुनै पनि सामान भेटिएन।\n(No items found with Quantity to Order > 0)');
          return;
      }

      // 2. Generate Next Form No
      const formsInCurrentFY = magForms.filter(f => f.fiscalYear === currentFiscalYear);
      const maxFormNo = formsInCurrentFY.length > 0 ? Math.max(...formsInCurrentFY.map(f => f.formNo)) : 0;
      const nextFormNo = maxFormNo + 1;

      // 3. Create MagForm Object
      const newForm: MagFormEntry = {
          id: Date.now().toString(), // Temp ID
          fiscalYear: currentFiscalYear,
          formNo: nextFormNo,
          date: getTodayNepaliDate(),
          status: 'Pending',
          items: itemsToOrder.map((item, index) => ({
              id: Date.now() + index,
              name: item.itemName,
              specification: item.specification || '',
              unit: item.unit,
              quantity: item.quantityToOrder.toString(),
              remarks: '' // CLEARED: As per user request, remarks should be empty
          })),
          demandBy: {
              name: currentUser.fullName,
              designation: currentUser.designation,
              date: getTodayNepaliDate(),
              purpose: 'मासिक प्रतिवेदन अनुसार स्टक पूर्ति गर्न' // Kept simplistic, can be cleared if needed
          },
          recommendedBy: { name: '', designation: '', date: '' },
          storeKeeper: { status: '', name: '' },
          receiver: { name: '', designation: '', date: '' },
          ledgerEntry: { name: '', date: '' },
          approvedBy: { name: '', designation: '', date: '' },
          issueItemType: 'Expendable' // Locked to Expendable as report filters only expendable
      };

      setPreviewMagForm(newForm);
      setShowMagFaramPreview(true);
  };

  const handleConfirmSave = () => {
      if (previewMagForm) {
          setIsSavingForm(true);
          // Simulate slight delay
          setTimeout(() => {
              onSaveMagForm(previewMagForm);
              setIsSavingForm(false);
              setShowMagFaramPreview(false);
              setPreviewMagForm(null);
              alert(`माग फारम नं ${previewMagForm.formNo} डाटाबेसमा सुरक्षित भयो।\n(Mag Form Saved Successfully!)`);
          }, 500);
      }
  };
  
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Controls Header (Non-printable) */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
        <div className="flex flex-wrap items-end gap-4 w-full xl:w-auto">
          <div className="w-full sm:w-48">
            <Select 
              label="आर्थिक वर्ष (Fiscal Year)"
              options={FISCAL_YEARS}
              value={selectedFiscalYear}
              onChange={(e) => setSelectedFiscalYear(e.target.value)}
              icon={<Calendar size={18} />}
            />
          </div>
          
          {/* Date Range Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="w-full sm:w-40">
                  <EnglishDatePicker 
                      label="देखि (Date From)"
                      value={fromDate}
                      onChange={setFromDate}
                  />
                  {/* Nepali Date Display */}
                  {fromDate && (
                      <div className="text-xs text-primary-600 mt-1 font-bold font-nepali pl-1">
                          (मि: {convertADtoBS(fromDate)})
                      </div>
                  )}
              </div>
              <div className="text-slate-400 mt-6 hidden sm:block">
                  <ArrowRight size={20} />
              </div>
              <div className="w-full sm:w-40">
                  <EnglishDatePicker 
                      label="सम्म (Date To)"
                      value={toDate}
                      onChange={setToDate}
                  />
                  {/* Nepali Date Display */}
                  {toDate && (
                      <div className="text-xs text-primary-600 mt-1 font-bold font-nepali pl-1">
                          (मि: {convertADtoBS(toDate)})
                      </div>
                  )}
              </div>
          </div>

          {/* Ledger Page Range Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-50 p-2 rounded-lg border border-slate-100">
              <div className="w-full sm:w-24">
                  <Input
                      label="पाना नं देखि"
                      value={fromLedgerPageNo}
                      onChange={(e) => setFromLedgerPageNo(e.target.value)}
                      placeholder="1"
                      type="number"
                      className="!py-2"
                  />
              </div>
              <div className="text-slate-400 mt-6 hidden sm:block">
                  <ArrowRight size={20} />
              </div>
              <div className="w-full sm:w-24">
                  <Input
                      label="पाना नं सम्म"
                      value={toLedgerPageNo}
                      onChange={(e) => setToLedgerPageNo(e.target.value)}
                      placeholder="291"
                      type="number"
                      className="!py-2"
                  />
              </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => {
                setFromDate('');
                setToDate('');
                setFromLedgerPageNo('');
                setToLedgerPageNo('');
            }}
            className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
          >
            Clear Filter
          </button>
          
          <button 
            onClick={handleGenerateMagFaram}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 rounded-lg font-medium shadow-sm transition-colors"
          >
            <FilePlus size={18} /> प्रतिवेदन अनुसार माग गर्नुहोस्
          </button>

          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium shadow-sm transition-colors"
          >
            <Printer size={18} /> प्रिन्ट रिपोर्ट (Print Report)
          </button>
        </div>
      </div>

      {/* REPORT SHEET (A4 Simulation) */}
      <div className="bg-white p-8 md:p-12 rounded-xl shadow-lg max-w-[210mm] mx-auto min-h-[297mm] text-slate-900 font-nepali text-sm print:shadow-none print:p-0 print:max-w-none">
        
        {/* Report Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            {/* Left: Logo */}
            <div className="w-24 flex justify-start pt-2">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" 
                alt="Nepal Emblem" 
                className="h-24 w-24 object-contain"
              />
            </div>
            
            {/* Center: Text */}
            <div className="flex-1 text-center space-y-1">
                <h1 className="text-xl font-bold text-red-600">नेपाल सरकार</h1>
                <h2 className="text-lg font-bold">स्वास्थ्य तथा जनसंख्या मन्त्रालय</h2>
                <h3 className="text-base font-bold">स्वास्थ्य सेवा विभाग</h3>
                <h3 className="text-lg font-bold">व्यवस्थापन महाशाखा</h3>
            </div>

            {/* Right: Spacer for balance */}
            <div className="w-24"></div> 
          </div>
          
          <div className="text-center pt-6 pb-2">
            <h2 className="text-xl font-bold underline underline-offset-4">स्वास्थ्य संस्थाहरुको स्टोर मौज्दात तथा निकासा सम्बन्धी आवधिक प्रतिवेदन</h2>
            <p className="text-sm">(खर्च भएर जाने जिन्सी)</p>
          </div>
        </div>

        {/* Meta Data */}
        <div className="flex flex-col gap-2 mb-6 text-sm">
          <div className="flex justify-between">
            <div className="flex items-center gap-2">
                <span>विवरण पठाउने स्वास्थ्य संस्थाको नाम:</span>
                <input 
                    value={currentUser.organizationName} 
                    readOnly 
                    className="border-b border-dotted border-slate-800 flex-1 min-w-[150px] outline-none bg-transparent font-medium cursor-default"
                />
            </div>
            <div className="flex items-center gap-2">
                <span>स्थानीय तहको नाम:</span>
                <input 
                    value={generalSettings.orgNameNepali}
                    readOnly 
                    className="border-b border-dotted border-slate-800 flex-1 min-w-[150px] outline-none bg-transparent font-medium cursor-default"
                />
            </div>
          </div>
          
          <div className="flex justify-between">
            <div className="flex items-center gap-2">
                <span>चालानी नं:</span>
                <input 
                    value="०८१-०८२/जि.प्र./०१" // Mocked
                    readOnly 
                    className="border-b border-dotted border-slate-800 flex-1 min-w-[100px] outline-none bg-transparent font-medium cursor-default"
                />
            </div>
            <div className="flex items-center gap-2">
                <span>प्रतिवेदन पठाएको/चलन गरेको मिति :</span>
                <input 
                    value={getTodayNepaliDate()}
                    readOnly 
                    className="border-b border-dotted border-slate-800 flex-1 min-w-[100px] outline-none bg-transparent font-medium cursor-default"
                />
            </div>
          </div>

          <div className="flex justify-between mt-2">
            <div className="flex items-center gap-2">
                <span>आ.व.:</span>
                <span className="font-bold border-b border-dotted border-slate-800 px-2">{getFiscalYearLabel(selectedFiscalYear)}</span>
            </div>
            
            {/* NEW REPORT MONTH FIELD */}
            <div className="flex items-center gap-2">
                <span>प्रतिवेदन गरेको महिना:</span>
                <input 
                    value={reportNepaliMonth}
                    readOnly 
                    className="border-b border-dotted border-slate-800 w-32 outline-none bg-transparent font-bold text-center cursor-default placeholder:font-normal placeholder:text-slate-400"
                    placeholder="(मिति छान्नुहोस्)"
                />
            </div>
          </div>

          <div className="flex flex-col gap-1 mt-1">
            {/* Filter Info Display in Print */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {fromDate && (
                    <div className="flex items-center gap-2">
                        <span>मिति देखि:</span>
                        <span className="font-bold border-b border-dotted border-slate-800 px-2 min-w-[80px] text-center">
                            {convertADtoBS(fromDate)}
                        </span>
                    </div>
                )}
                {toDate && (
                    <div className="flex items-center gap-2">
                        <span>मिति सम्म:</span>
                        <span className="font-bold border-b border-dotted border-slate-800 px-2 min-w-[80px] text-center">
                            {convertADtoBS(toDate)}
                        </span>
                    </div>
                )}
                {fromLedgerPageNo && (
                    <div className="flex items-center gap-2">
                        <span>खाता पाना देखि:</span>
                        <span className="font-bold border-b border-dotted border-slate-800 px-2 text-center">
                            {fromLedgerPageNo}
                        </span>
                    </div>
                )}
                {toLedgerPageNo && (
                    <div className="flex items-center gap-2">
                        <span>खाता पाना सम्म:</span>
                        <span className="font-bold border-b border-dotted border-slate-800 px-2 text-center">
                            {toLedgerPageNo}
                        </span>
                    </div>
                )}
                <span className="ml-auto">को यस कार्यालय स्टोरको प्रतिवेदन निम्नबमोजिम भएको व्यहोरा अनुरोध छ।</span>
            </div>
          </div>
        </div>

        {/* Main Report Table */}
        <div className="mb-12">
          <table className="w-full border-collapse border border-slate-900 text-xs">
            <thead>
              <tr className="text-center bg-slate-50">
                <th className="border border-slate-900 p-2 w-10" rowSpan={2}>क्र.सं.</th>
                <th className="border border-slate-900 p-2 w-48" rowSpan={2}>सामानको नाम</th>
                <th className="border border-slate-900 p-2 w-16" rowSpan={2}>जि.खा.पा.नं.</th>
                <th className="border border-slate-900 p-2 w-16" rowSpan={2}>सङ्केत नं.</th>
                <th className="border border-slate-900 p-2 w-12" rowSpan={2}>एकाई</th>
                <th className="border border-slate-900 p-1" colSpan={5}>मौज्दात तथा निकासा (खर्च भएर जाने)</th>
                <th className="border border-slate-900 p-2 w-16" rowSpan={2}>स्वीकृत मौज्दात (ASL)</th>
                <th className="border border-slate-900 p-2 w-16" rowSpan={2}>आकस्मिक माग बिन्दु (EOP)</th>
                <th className="border border-slate-900 p-2 w-20" rowSpan={2}>माग गर्नुपर्ने परिमाण</th>
                <th className="border border-slate-900 p-2 w-24" rowSpan={2}>कैफियत</th>
              </tr>
              <tr className="text-center bg-slate-50">
                <th className="border border-slate-900 p-1 w-16">गत महिनाको बाँकी मौज्दात</th>
                <th className="border border-slate-900 p-1 w-16">यस अवधिमा प्राप्त</th>
                <th className="border border-slate-900 p-1 w-16">यस अवधिमा निकासा</th>
                <th className="border border-slate-900 p-1 w-16">जम्मा</th>
                <th className="border border-slate-900 p-1 w-16">हालको बाँकी मौज्दात</th>
              </tr>
              <tr className="text-center bg-slate-100 text-[10px] font-medium">
                <th className="border border-slate-900 p-1">१</th>
                <th className="border border-slate-900 p-1">२</th>
                <th className="border border-slate-900 p-1">३</th>
                <th className="border border-slate-900 p-1">४</th>
                <th className="border border-slate-900 p-1">५</th>
                <th className="border border-slate-900 p-1">६</th>
                <th className="border border-slate-900 p-1">७</th>
                <th className="border border-slate-900 p-1">८</th>
                <th className="border border-slate-900 p-1">९</th> 
                <th className="border border-slate-900 p-1">१०</th>
                <th className="border border-slate-900 p-1">११</th>
                <th className="border border-slate-900 p-1">१२</th>
                <th className="border border-slate-900 p-1">१३</th>
                <th className="border border-slate-900 p-1">१४</th>
              </tr>
            </thead>
            <tbody>
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={14} className="border border-slate-900 p-4 text-center text-slate-400 italic">
                    कुनै डाटा उपलब्ध छैन (No data available).
                  </td>
                </tr>
              ) : (
                reportData.map((data, index) => (
                  <tr key={data.id}>
                    <td className="border border-slate-900 p-1 text-center">{index + 1}</td>
                    <td className="border border-slate-900 p-1 px-2 text-left font-medium">{data.itemName}</td>
                    <td className="border border-slate-900 p-1 text-center">{data.ledgerPageNo || '-'}</td>
                    <td className="border border-slate-900 p-1 text-center">{data.sanketNo || '-'}</td>
                    <td className="border border-slate-900 p-1 text-center">{data.unit}</td>
                    
                    {/* Mocked / Calculated Flow Data */}
                    <td className="border border-slate-900 p-1 text-center">{data.previousMonthBalance}</td>
                    <td className="border border-slate-900 p-1 text-center font-bold text-green-700">{data.thisMonthReceived}</td>
                    <td className="border border-slate-900 p-1 text-center font-bold text-red-700">{data.thisMonthIssued}</td>
                    <td className="border border-slate-900 p-1 text-center font-bold">{data.total}</td>
                    <td className="border border-slate-900 p-1 text-center font-bold bg-slate-50">{data.thisMonthBalance}</td>
                    
                    {/* ASL / EOP / Qty To Order Mapped */}
                    <td className="border border-slate-900 p-1 text-center">{data.approvedStockLevel || '-'}</td>
                    <td className="border border-slate-900 p-1 text-center">{data.emergencyOrderPoint || '-'}</td>
                    <td className="border border-slate-900 p-1 text-center font-bold text-blue-700">
                      {data.quantityToOrder > 0 ? data.quantityToOrder : '-'}
                    </td>
                    
                    <td className="border border-slate-900 p-1 px-2 text-left text-xs">{data.remarks || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Signatures */}
        <div className="grid grid-cols-3 gap-8 text-sm mt-12">
            <div>
                <h4 className="font-bold mb-4">तयार गर्ने:</h4>
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <span className="w-16">नाम:</span>
                        <input value={currentUser.fullName} readOnly className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent cursor-default"/>
                    </div>
                    <div className="flex gap-2">
                        <span className="w-16">पद:</span>
                        <input value={currentUser.designation} readOnly className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent cursor-default"/>
                    </div>
                    <div className="flex gap-2">
                        <span className="w-16">मिति:</span>
                        <input value={getTodayNepaliDate()} readOnly className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent text-xs cursor-default"/>
                    </div>
                </div>
            </div>

            <div>
                <h4 className="font-bold mb-4">शाखा प्रमुख:</h4>
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <span className="w-16">नाम:</span>
                        <input value="" className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent"/>
                    </div>
                    <div className="flex gap-2">
                        <span className="w-16">पद:</span>
                        <input value="" className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent"/>
                    </div>
                    <div className="flex gap-2">
                        <span className="w-16">मिति:</span>
                        <input value="" className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent text-xs"/>
                    </div>
                </div>
            </div>

            <div>
                <h4 className="font-bold mb-4">स्वीकृत गर्ने:</h4>
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <span className="w-16">नाम:</span>
                        <input value="" className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent"/>
                    </div>
                    <div className="flex gap-2">
                        <span className="w-16">पद:</span>
                        <input value="" className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent"/>
                    </div>
                    <div className="flex gap-2">
                        <span className="w-16">मिति:</span>
                        <input value="" className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent text-xs"/>
                    </div>
                </div>
            </div>
        </div>

      </div>

      {/* MAG FARAM PREVIEW MODAL */}
      {showMagFaramPreview && previewMagForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowMagFaramPreview(false)}></div>
              
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div className="flex items-center gap-3">
                          <h3 className="font-bold text-slate-800 text-lg font-nepali">माग फारम (Mag Faram Preview)</h3>
                          <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded border border-orange-200">
                              Generated from Report
                          </span>
                      </div>
                      <div className="flex gap-2">
                          <button 
                              onClick={() => {
                                  // For print logic within modal, we might need a specific print area or simple window.print 
                                  // For now, standard print trigger
                                  window.print();
                              }} 
                              className="p-2 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
                              title="Print"
                          >
                              <Printer size={20} />
                          </button>
                          <button onClick={() => setShowMagFaramPreview(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                              <X size={20} />
                          </button>
                      </div>
                  </div>

                  <div className="p-8 overflow-y-auto bg-slate-50/50">
                      {/* Using the standard Mag Faram A4 Layout Style */}
                      <div className="bg-white p-8 md:p-12 rounded-xl shadow-sm border border-slate-200 max-w-[210mm] mx-auto min-h-[297mm] text-slate-900 font-nepali">
                          <div className="text-right text-xs font-bold mb-4">म.ले.प.फारम नं: ४०१</div>
                          
                          <div className="mb-8">
                             <div className="flex items-start justify-between">
                                 <div className="w-24 flex justify-start pt-2">
                                     <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" alt="Nepal Emblem" className="h-24 w-24 object-contain" />
                                 </div>
                                 <div className="flex-1 text-center space-y-1">
                                     <h1 className="text-xl font-bold text-red-600">{generalSettings.orgNameNepali}</h1>
                                     {generalSettings.subTitleNepali && <h2 className="text-lg font-bold">{generalSettings.subTitleNepali}</h2>}
                                     {generalSettings.subTitleNepali2 && <h3 className="text-base font-bold">{generalSettings.subTitleNepali2}</h3>}
                                     {generalSettings.subTitleNepali3 && <h3 className="text-lg font-bold">{generalSettings.subTitleNepali3}</h3>}
                                 </div>
                                 <div className="w-24"></div> 
                             </div>
                             <div className="text-center pt-6 pb-2">
                                 <h2 className="text-xl font-bold underline underline-offset-4">माग फारम</h2>
                             </div>
                          </div>

                          <div className="flex justify-end mb-4">
                             <div className="space-y-1 text-sm font-medium w-64">
                                <div className="flex justify-between items-center">
                                    <span>आर्थिक वर्ष :</span>
                                    <span className="font-bold border-b border-dotted border-slate-800 w-32 text-center">{previewMagForm.fiscalYear}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>माग फारम नं:</span>
                                    <span className="font-bold border-b border-dotted border-slate-800 w-32 text-center text-red-600">{previewMagForm.formNo}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>मिति:</span>
                                    <span className="font-bold border-b border-dotted border-slate-800 w-32 text-center">{previewMagForm.date}</span>
                                </div>
                             </div>
                          </div>

                          <table className="w-full border-collapse border border-slate-900 text-sm mb-8">
                              <thead>
                                  <tr className="text-center bg-slate-50">
                                      <th className="border border-slate-900 p-2 w-12" rowSpan={2}>क्र.सं.</th>
                                      <th className="border border-slate-900 p-2 w-72" rowSpan={2}>सामानको नाम</th>
                                      <th className="border border-slate-900 p-2" rowSpan={2}>स्पेसिफिकेसन</th>
                                      <th className="border border-slate-900 p-1" colSpan={2}>माग गरिएको</th>
                                      <th className="border border-slate-900 p-2 w-24" rowSpan={2}>कैफियत</th>
                                  </tr>
                                  <tr className="text-center bg-slate-50">
                                      <th className="border border-slate-900 p-1 w-20">एकाई</th>
                                      <th className="border border-slate-900 p-1 w-20">परिमाण</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {previewMagForm.items.map((item, index) => (
                                      <tr key={index}>
                                          <td className="border border-slate-900 p-2 text-center">{index + 1}</td>
                                          <td className="border border-slate-900 p-1 px-2">{item.name}</td>
                                          <td className="border border-slate-900 p-1 px-2">{item.specification}</td>
                                          