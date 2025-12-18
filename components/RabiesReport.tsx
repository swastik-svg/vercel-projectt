import React, { useState, useMemo } from 'react';
import { Printer, Calendar, Save, Calculator, Filter, Package } from 'lucide-react';
import { Select } from './Select';
import { Input } from './Input';
import { FISCAL_YEARS } from '../constants';
import { RabiesPatient } from '../types';

interface RabiesReportProps {
  currentFiscalYear: string;
  currentUser: { organizationName: string; fullName: string; };
  patients: RabiesPatient[];
}

export const RabiesReport: React.FC<RabiesReportProps> = ({ currentFiscalYear, currentUser, patients }) => {
  const [selectedMonth, setSelectedMonth] = useState('08'); // Default to Mangsir/current
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(currentFiscalYear);

  const nepaliMonthOptions = [
    { id: '01', value: '01', label: 'बैशाख (Baishakh)' },
    { id: '02', value: '02', label: 'जेठ (Jestha)' },
    { id: '03', value: '03', label: 'असार (Ashad)' },
    { id: '04', value: '04', label: 'साउन (Shrawan)' },
    { id: '05', value: '05', label: 'भदौ (Bhadra)' },
    { id: '06', value: '06', label: 'असोज (Ashwin)' },
    { id: '07', value: '07', label: 'कार्तिक (Kartik)' },
    { id: '08', value: '08', label: 'मंसिर (Mangsir)' },
    { id: '09', value: '09', label: 'पुष (Poush)' },
    { id: '10', value: '10', label: 'माघ (Magh)' },
    { id: '11', value: '11', label: 'फागुन (Falgun)' },
    { id: '12', value: '12', label: 'चैत्र (Chaitra)' },
  ];

  const animals = [
    'Dog bite', 'Monkey bite', 'Cat bite', 'Cattle bite', 'Rodent bite', 
    'Jackal bite', 'Tiger bite', 'Bear bite', 'Saliva contact', 'Other specity'
  ];

  const rowLabels = [
    'Male (15+Yr)',
    'Female (15+Yr)',
    'Male Child (<15 Yr)',
    'Female Child (<15 Yr)'
  ];

  // --- AUTOMATIC CALCULATION ---
  const generatedMatrix = useMemo(() => {
    // Initialize 4x10 matrix with zeros
    const mat = Array(4).fill(0).map(() => Array(10).fill(0));

    // Filter Data based on selected Fiscal Year and Month
    const filteredData = patients.filter(p => 
        p.fiscalYear === selectedFiscalYear && p.regMonth === selectedMonth
    );

    // Populate Matrix
    filteredData.forEach(p => {
        let rowIndex = -1;
        const ageNum = parseInt(p.age) || 0;
        
        // Determine Row based on Age and Sex
        if (p.sex === 'Male') {
            rowIndex = ageNum < 15 ? 2 : 0; // Row 2 for Child Male, 0 for Adult Male
        } else if (p.sex === 'Female') {
            rowIndex = ageNum < 15 ? 3 : 1; // Row 3 for Child Female, 1 for Adult Female
        }

        // Determine Column based on Animal Type
        // Mapping: Dog=0, Monkey=1, Cat=2, Cattle=3, Rodent=4, Jackal=5, Tiger=6, Bear=7, Saliva=8, Other=9
        let colIndex = -1;
        switch(p.animalType) {
            case 'Dog': colIndex = 0; break;
            case 'Monkey': colIndex = 1; break;
            case 'Cat': colIndex = 2; break;
            case 'Cattle': colIndex = 3; break;
            case 'Rodent': colIndex = 4; break;
            case 'Jackal': colIndex = 5; break;
            case 'Tiger': colIndex = 6; break;
            case 'Bear': colIndex = 7; break;
            case 'Saliva Contact': colIndex = 8; break;
            default: colIndex = 9; // Other
        }

        if (rowIndex !== -1 && colIndex !== -1) {
            mat[rowIndex][colIndex]++;
        }
    });

    return mat;
  }, [patients, selectedFiscalYear, selectedMonth]);

  // --- STOCK STATE ---
  const [stockData, setStockData] = useState({
    opening: 50,
    received: 100,
    // Expenditure should ideally match total cases * doses per case, but kept manual for report flexibility
    expenditure: 200, 
  });

  // Calculate totals
  const getRowTotal = (rowIndex: number) => generatedMatrix[rowIndex].reduce((a, b) => a + b, 0);
  const getColTotal = (colIndex: number) => generatedMatrix.reduce((sum, row) => sum + row[colIndex], 0);
  const grandTotalCases = generatedMatrix.flat().reduce((a, b) => a + b, 0);
  
  // Auto-calculate expenditure estimation (e.g., avg 3 doses per patient)
  // This is just a helper, user can override if we made it editable, but here we calculate balance
  const balanceDose = stockData.opening + stockData.received - stockData.expenditure;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Controls Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
         <div className="flex items-end gap-4 w-full md:w-auto">
             <div className="w-48">
                <Select 
                    label="आर्थिक वर्ष (Fiscal Year)"
                    options={FISCAL_YEARS}
                    value={selectedFiscalYear}
                    onChange={(e) => setSelectedFiscalYear(e.target.value)}
                    icon={<Calendar size={18} />}
                />
            </div>
            <div className="w-48">
                <Select 
                    label="महिना (Month)"
                    options={nepaliMonthOptions}
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    icon={<Filter size={18} />}
                />
            </div>
         </div>
         <div className="flex gap-2">
            <div className="bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-100 text-xs text-yellow-800 flex flex-col justify-center">
                <span className="font-bold">Auto-Generated</span>
                <span>From Registration Data</span>
            </div>
            <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium shadow-sm transition-colors"
            >
                <Printer size={18} /> Print Report
            </button>
         </div>
      </div>

      {/* Stock Entry Section (Top) */}
      <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 no-print shadow-sm">
          <div className="col-span-full flex items-center gap-2 mb-2">
             <div className="p-1.5 bg-indigo-100 rounded text-indigo-700">
                <Package size={20} />
             </div>
             <h3 className="font-bold text-indigo-900">खोप मौज्दात विवरण (Vaccine Stock Details)</h3>
          </div>
          
          <Input 
              label="अघिल्लो मौज्दात (Opening Stock)"
              type="number"
              min="0"
              value={stockData.opening}
              onChange={(e) => setStockData({...stockData, opening: parseInt(e.target.value)||0})}
              className="bg-white border-indigo-200 focus:border-indigo-500"
          />
          <Input 
              label="प्राप्त मात्रा (Received Dose)"
              type="number"
              min="0"
              value={stockData.received}
              onChange={(e) => setStockData({...stockData, received: parseInt(e.target.value)||0})}
              className="bg-white border-indigo-200 focus:border-indigo-500"
          />
          <Input 
              label="खर्च मात्रा (Expenditure Dose)"
              type="number"
              min="0"
              value={stockData.expenditure}
              onChange={(e) => setStockData({...stockData, expenditure: parseInt(e.target.value)||0})}
              className="bg-white border-indigo-200 focus:border-indigo-500"
          />
           <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-medium text-slate-700">बाँकी मात्रा (Balance)</label>
                <div className="h-[42px] px-3 flex items-center font-bold text-lg bg-white rounded-lg border border-indigo-200 text-indigo-600 shadow-sm">
                    {balanceDose}
                </div>
          </div>
      </div>

      {/* REPORT SHEET (A4 Simulation) */}
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-lg overflow-x-auto min-w-[1000px]">
        
        {/* Report Header */}
        <div className="text-center space-y-1 mb-6 font-bold text-slate-900">
            <h4 className="text-sm uppercase">NG/MOH</h4>
            <h3 className="text-base uppercase">EPIDEMIOLOGY AND DISEASE CONTROL DIVISION</h3>
            <h2 className="text-lg uppercase">MONTHLY RECORDES OF POST EXPOSURE TREATMENT OF RABIES IN HUMANS</h2>
            
            <div className="flex justify-between items-center mt-6 pt-4 px-4 text-sm">
                <span>Name of the Institution : <span className="font-medium underline decoration-dotted">{currentUser.organizationName}</span></span>
                <div className="flex gap-8">
                    <span>Month: <span className="font-medium underline decoration-dotted">{nepaliMonthOptions.find(m => m.value === selectedMonth)?.label.split('(')[0]}</span></span>
                    <span>Year: <span className="font-medium underline decoration-dotted">{FISCAL_YEARS.find(f => f.value === selectedFiscalYear)?.label}</span></span>
                </div>
            </div>
        </div>

        {/* MAIN TABLE */}
        <table className="w-full text-xs border-collapse border border-slate-800 text-center">
            <thead>
                <tr className="bg-slate-100">
                    <th className="border border-slate-800 p-1 w-32" rowSpan={2}>Discription</th>
                    <th className="border border-slate-800 p-1" colSpan={10}>Source of Exposure to Rabies Animals</th>
                    <th className="border border-slate-800 p-1 w-16" rowSpan={2}>Total cases</th>
                    <th className="border border-slate-800 p-1 w-16" rowSpan={2}>Previous month opening</th>
                    <th className="border border-slate-800 p-1 w-16" rowSpan={2}>Received dose</th>
                    <th className="border border-slate-800 p-1 w-16" rowSpan={2}>Expenditure dose</th>
                    <th className="border border-slate-800 p-1 w-16" rowSpan={2}>Balance dose</th>
                </tr>
                <tr className="bg-slate-50">
                    {animals.map((animal, i) => (
                        <th key={i} className="border border-slate-800 p-1 font-semibold">{animal}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {/* Data Rows */}
                {rowLabels.map((label, rowIndex) => (
                    <tr key={rowIndex}>
                        <td className="border border-slate-800 p-1 font-bold text-left bg-slate-50">{label}</td>
                        {generatedMatrix[rowIndex].map((val, colIndex) => (
                            <td key={colIndex} className="border border-slate-800 p-0">
                                <div className={`w-full h-8 flex items-center justify-center ${val > 0 ? 'font-bold text-slate-900' : 'text-slate-300'}`}>
                                    {val > 0 ? val : '-'}
                                </div>
                            </td>
                        ))}
                        {/* Row Total */}
                        <td className="border border-slate-800 p-1 font-bold bg-slate-50">{getRowTotal(rowIndex)}</td>
                        
                        {/* Greyed out stock cells */}
                        <td className="border border-slate-800 bg-slate-500"></td>
                        <td className="border border-slate-800 bg-slate-500"></td>
                        <td className="border border-slate-800 bg-slate-500"></td>
                        <td className="border border-slate-800 bg-slate-500"></td>
                    </tr>
                ))}

                {/* TOTAL ROW */}
                <tr className="font-bold">
                    <td className="border border-slate-800 p-2 text-left bg-slate-100">TOTAL</td>
                    {animals.map((_, colIndex) => (
                        <td key={colIndex} className="border border-slate-800 p-1 bg-slate-50">
                            {getColTotal(colIndex)}
                        </td>
                    ))}
                    <td className="border border-slate-800 p-1 bg-slate-100">{grandTotalCases}</td>
                    
                    {/* Stock Calculation Cells (DISPLAY ONLY) */}
                    <td className="border border-slate-800 p-0 bg-white">
                        <div className="w-full h-8 flex items-center justify-center font-medium">
                            {stockData.opening}
                        </div>
                    </td>
                    <td className="border border-slate-800 p-0 bg-white">
                        <div className="w-full h-8 flex items-center justify-center font-medium">
                            {stockData.received}
                        </div>
                    </td>
                    <td className="border border-slate-800 p-0 bg-white">
                        <div className="w-full h-8 flex items-center justify-center font-medium">
                            {stockData.expenditure}
                        </div>
                    </td>
                    <td className="border border-slate-800 p-1 bg-slate-50">{balanceDose}</td>
                </tr>
            </tbody>
        </table>

        {/* Hydrophobia Table */}
        <div className="mt-6">
            <h4 className="text-center font-medium text-sm mb-1">IF Hydrophobia cases reported</h4>
            <table className="w-full text-xs border-collapse border border-slate-800">
                <thead>
                    <tr className="bg-slate-100 font-bold text-center">
                        <th className="border border-slate-800 p-1 w-1/6">Name</th>
                        <th className="border border-slate-800 p-1 w-1/6">Address</th>
                        <th className="border border-slate-800 p-1 w-12">Age</th>
                        <th className="border border-slate-800 p-1 w-12">Sex</th>
                        <th className="border border-slate-800