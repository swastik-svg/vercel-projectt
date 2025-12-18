
import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface NepaliDatePickerProps {
  value: string; // Format: YYYY-MM-DD or YYYY/MM/DD
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  format?: 'YYYY-MM-DD' | 'YYYY/MM/DD';
  inputClassName?: string;
  wrapperClassName?: string;
  hideIcon?: boolean;
  popupAlign?: 'left' | 'right';
  minDate?: string; // Format: Same as value
  maxDate?: string; // Format: Same as value
}

const NEPALI_MONTHS = [
  'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 
  'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत्र'
];

const WEEK_DAYS = ['आइ', 'सोम', 'मंगल', 'बुध', 'बिही', 'शुक्र', 'शनि'];

export const NepaliDatePicker: React.FC<NepaliDatePickerProps> = ({ 
  value, 
  onChange, 
  label = "मिति (Date)",
  required = false,
  disabled = false,
  format = 'YYYY-MM-DD',
  inputClassName = '',
  wrapperClassName = '',
  hideIcon = false,
  popupAlign = 'left',
  minDate,
  maxDate
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to normalize date strings to YYYY/MM/DD for comparison
  const normalizeDate = (dateStr?: string) => {
      if (!dateStr) return '';
      return dateStr.replace(/-/g, '/');
  };

  // Parse initial value or default to current date
  const parseDate = (val: string) => {
    if (val) {
      // Handle both - and / separators
      const parts = val.split(/[-/]/);
      if (parts.length === 3) {
        return {
          year: parseInt(parts[0]),
          month: parseInt(parts[1]) - 1, // 0-indexed for internal logic
          day: parseInt(parts[2])
        };
      }
    }
    // Default to today
    const now = new NepaliDate();
    return {
      year: now.getYear(),
      month: now.getMonth(),
      day: now.getDate()
    };
  };

  const initial = parseDate(value);
  
  // View state for the calendar (which year/month is currently displayed)
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);
  
  // Selected state
  const [selectedYear, setSelectedYear] = useState(initial.year);
  const [selectedMonth, setSelectedMonth] = useState(initial.month);
  const [selectedDay, setSelectedDay] = useState(initial.day);

  // Sync state with prop value changes
  useEffect(() => {
    if (value) {
      const { year, month, day } = parseDate(value);
      setSelectedYear(year);
      setSelectedMonth(month);
      setSelectedDay(day);
    }
  }, [value]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (year: number, month: number) => {
    // Determine days by checking when month rolls over
    // Nepali months have up to 32 days. 
    // Optimization: Check 32, 31, 30, 29.
    for (let d = 32; d >= 29; d--) {
        try {
            const date = new NepaliDate(year, month, d);
            if (date.getMonth() === month) {
                return d;
            }
        } catch (e) {
            // Ignore invalid date errors
        }
    }
    return 30; // Fallback
  };

  const getMonthStartWeekday = (year: number, month: number) => {
    try {
        // NepaliDate(y, m, d) -> toJsDate() -> getDay()
        const date = new NepaliDate(year, month, 1);
        return date.toJsDate().getDay(); // 0 = Sunday
    } catch (e) {
        return 0;
    }
  };

  const formatDateString = (year: number, month: number, day: number) => {
      const m = String(month + 1).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      return format === 'YYYY/MM/DD' ? `${year}/${m}/${d}` : `${year}-${m}-${d}`;
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleDayClick = (day: number) => {
    const newDateStr = formatDateString(viewYear, viewMonth, day);
    onChange(newDateStr);
    setShowCalendar(false);
  };

  const handleTodayClick = () => {
      const now = new NepaliDate();
      const y = now.getYear();
      const m = now.getMonth();
      const d = now.getDate();
      const newDateStr = formatDateString(y, m, d);
      
      // Validate Today against min/max
      const normalizedToday = normalizeDate(`${y}/${String(m + 1).padStart(2, '0')}/${String(d).padStart(2, '0')}`);
      const normalizedMin = normalizeDate(minDate);
      const normalizedMax = normalizeDate(maxDate);

      if (normalizedMin && normalizedToday < normalizedMin) return;
      if (normalizedMax && normalizedToday > normalizedMax) return;

      onChange(newDateStr);
      setViewYear(y);
      setViewMonth(m);
      setShowCalendar(false);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const startWeekday = getMonthStartWeekday(viewYear, viewMonth);

  // Generate grid days
  const days = [];
  for (let i = 0; i < startWeekday; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Format Display Value
  const displayValue = value ? value : '';

  return (
    <div className={`flex flex-col gap-1.5 w-full relative ${wrapperClassName}`} ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      {/* Input Field */}
      <div 
        className={`relative group ${disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
        onClick={() => {
            if (disabled) return;
            setShowCalendar(!showCalendar);
            // On open, sync view to selected or today
            if (!showCalendar) {
                if (value) {
                    const { year, month } = parseDate(value);
                    setViewYear(year);
                    setViewMonth(month);
                } else {
                    const now = new NepaliDate();
                    setViewYear(now.getYear());
                    setViewMonth(now.getMonth());
                }
            }
        }}
      >
        {!hideIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors pointer-events-none">
                <CalendarIcon size={16} />
            </div>
        )}
        <input
          type="text"
          readOnly
          value={displayValue}
          placeholder={format}
          disabled={disabled}
          className={`
            w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all
            placeholder:text-slate-400 font-nepali
            ${!hideIcon ? 'pl-10' : 'pl-3'}
            ${disabled 
                ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' 
                : 'bg-white text-slate-900 border-slate-300 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer'
            }
            ${inputClassName}
          `}
        />
        {!disabled && !hideIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <CalendarIcon size={14} />
            </div>
        )}
      </div>

      {/* Popup Calendar */}
      {showCalendar && !disabled && (
        <div className={`absolute top-full ${popupAlign === 'right' ? 'right-0' : 'left-0'} mt-2 z-50 bg-white rounded-lg shadow-xl border border-slate-200 p-4 w-72 animate-in fade-in zoom-in-95 duration-200`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <button 
                    onClick={(e) => { e.stopPropagation(); handlePrevMonth(); }}
                    className="p-1 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
                >
                    <ChevronLeft size={18} />
                </button>
                <div className="font-bold text-slate-800 font-nepali">
                    {NEPALI_MONTHS[viewMonth]} {viewYear}
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); handleNextMonth(); }}
                    className="p-1 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
                >
                    <ChevronRight size={18} />
                </button>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 mb-2">
                {WEEK_DAYS.map(day => (
                    <div key={day} className="text-center text-xs font-medium text-slate-400 font-nepali">
                        {day}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
                {days.map((day, idx) => {
                    if (day === null) return <div key={`empty-${idx}`} />;
                    
                    const currentString = normalizeDate(`${viewYear}/${String(viewMonth + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}`);
                    const normalizedMin = normalizeDate(minDate);
                    const normalizedMax = normalizeDate(maxDate);

                    let isDayDisabled = false;
                    if (normalizedMin && currentString < normalizedMin) isDayDisabled = true;
                    if (normalizedMax && currentString > normalizedMax) isDayDisabled = true;

                    const isSelected = 
                        value && 
                        day === selectedDay && 
                        viewMonth === selectedMonth && 
                        viewYear === selectedYear;
                    
                    const isToday = (() => {
                        const now = new NepaliDate();
                        return day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getYear();
                    })();

                    return (
                        <button
                            key={day}
                            disabled={isDayDisabled}
                            onClick={(e) => { e.stopPropagation(); if(!isDayDisabled) handleDayClick(day); }}
                            className={`
                                h-8 w-8 flex items-center justify-center rounded-full text-sm transition-all font-nepali
                                ${isDayDisabled 
                                    ? 'text-slate-300 cursor-not-allowed bg-slate-50' 
                                    : isSelected 
                                        ? 'bg-indigo-600 text-white font-bold shadow-md' 
                                        : isToday 
                                            ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200' 
                                            : 'text-slate-700 hover:bg-slate-100'
                                }
                            `}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between">
                <button 
                    onClick={(e) => { e.stopPropagation(); handleTodayClick(); }}
                    className="text-xs font-bold text-indigo-600 hover:underline font-nepali"
                >
                    आज (Today)
                </button>
                <button 
                    onClick={() => setShowCalendar(false)}
                    className="text-xs text-slate-500 hover:text-slate-700"
                >
                    बन्द गर्नुहोस्
                </button>
            </div>
        </div>
      )}
    </div>
  );
};
