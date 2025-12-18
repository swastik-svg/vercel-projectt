
import React, { useState, useEffect, useMemo } from 'react';
import { Save, RotateCcw, Syringe, Calendar, FileDigit, User, Phone, MapPin, CalendarRange, Clock, CheckCircle2, Search, X, AlertTriangle } from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';
import { NepaliDatePicker } from './NepaliDatePicker';
import { RabiesPatient, VaccinationDose, Option } from '../types';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface RabiesRegistrationProps {
  currentFiscalYear: string;
  patients: RabiesPatient[];
  onAddPatient: (patient: RabiesPatient) => void;
  onUpdatePatient: (patient: RabiesPatient) => void;
}

const nepaliMonthOptions = [
  { id: '01', value: '01', label: 'बैशाख (01)' },
  { id: '02', value: '02', label: 'जेठ (02)' },
  { id: '03', value: '03', label: 'असार (03)' },
  { id: '04', value: '04', label: 'साउन (04)' },
  { id: '05', value: '05', label: 'भदौ (05)' },
  { id: '06', value: '06', label: 'असोज (06)' },
  { id: '07', value: '07', label: 'कार्तिक (07)' },
  { id: '08', value: '08', label: 'मंसिर (08)' },
  { id: '09', value: '09', label: 'पुष (09)' },
  { id: '10', value: '10', label: 'माघ (10)' },
  { id: '11', value: '11', label: 'फागुन (11)' },
  { id: '12', value: '12', label: 'चैत्र (12)' },
];

export const RabiesRegistration: React.FC<RabiesRegistrationProps> = ({ 
  currentFiscalYear, 
  patients, 
  onAddPatient, 
  onUpdatePatient 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [modalDateBs, setModalDateBs] = useState('');
  const [doseUpdateError, setDoseUpdateError] = useState<string | null>(null);
  
  // State for Dose Update Modal
  const [selectedDoseInfo, setSelectedDoseInfo] = useState<{
      patient: RabiesPatient;
      doseIndex: number;
      dose: VaccinationDose;
  } | null>(null);

  // Helper to get today's date
  const getTodayDateAd = () => new Date().toISOString().split('T')[0];

  // Helper to generate a new Reg No
  const generateRegNo = () => {
    const fyClean = currentFiscalYear.replace('/', '');
    const maxNum = patients
      .filter(p => p.fiscalYear === currentFiscalYear && p.regNo.startsWith(`R-${fyClean}-`))
      .map(p => parseInt(p.regNo.split('-')[2]))
      .reduce((max, num) => Math.max(max, num), 0);
    return `R-${fyClean}-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const [formData, setFormData] = useState<RabiesPatient>({
    id: '',
    fiscalYear: currentFiscalYear,
    regNo: '',
    regMonth: '',
    regDateBs: '',
    regDateAd: '',
    name: '',
    age: '',
    sex: '',
    address: '',
    phone: '',
    animalType: '',
    exposureCategory: '',
    bodyPart: '',
    exposureDateBs: '',
    regimen: 'Intradermal',
    schedule: []
  });

  // Initialize form on mount
  useEffect(() => {
    const today = new NepaliDate();
    const todayBs = today.format('YYYY-MM-DD');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    
    setFormData(prev => ({
      ...prev,
      regNo: generateRegNo(),
      regDateBs: todayBs,
      regMonth: month,
      regDateAd: new Date().toISOString().split('T')[0],
      exposureDateBs: todayBs
    }));
  }, [currentFiscalYear]);

  const handleRegDateBsChange = (val: string) => {
    let month = formData.regMonth;
    let adDateStr = formData.regDateAd;

    if (val) {
        try {
            if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
                const [y, m, d] = val.split('-').map(Number);
                month = String(m).padStart(2, '0');
                const nd = new NepaliDate(y, m - 1, d);
                const jsDate = nd.toJsDate();
                adDateStr = jsDate.toISOString().split('T')[0];
            }
        } catch (e) {
            console.error("Date conversion error", e);
        }
    }

    setFormData(prev => {
        const updated = {
            ...prev,
            regDateBs: val,
            regMonth: month,
            regDateAd: adDateStr
        };
        updated.schedule = calculateSchedule(adDateStr, prev.regimen);
        return updated;
    });
  };

  const calculateSchedule = (startDateAd: string, regimen: string): VaccinationDose[] => {
      if (!startDateAd) return [];
      
      const start = new Date(startDateAd);
      const schedule: VaccinationDose[] = [];
      const days = regimen === 'Intradermal' ? [0, 3, 7] : [0, 3, 7, 14, 28];

      days.forEach(dayOffset => {
          const doseDate = new Date(start);
          doseDate.setDate(start.getDate() + dayOffset);
          // Omit givenDate when initialized to avoid Firebase undefined error
          schedule.push({
              day: dayOffset,
              date: doseDate.toISOString().split('T')[0],
              status: 'Pending'
          });
      });

      return schedule;
  };

  const handleRegimenChange = (val: 'Intradermal' | 'Intramuscular') => {
      setFormData(prev => ({
          ...prev,
          regimen: val,
          schedule: calculateSchedule(prev.regDateAd, val)
      }));
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!formData.name || !formData.regDateBs) {
          alert("Please fill required fields");
          return;
      }

      if (formData.exposureDateBs && formData.regDateBs && formData.exposureDateBs > formData.regDateBs) {
          alert("टोकेको मिति दर्ता मिति भन्दा पछाडि हुन सक्दैन। (Exposure Date cannot be after Registration Date)");
          return;
      }

      const newPatient = {
          ...formData,
          id: Date.now().toString(),
          schedule: calculateSchedule(formData.regDateAd, formData.regimen)
      };

      onAddPatient(newPatient);
      
      const today = new NepaliDate();
      const todayBs = today.format('YYYY-MM-DD');
      const month = String(today.getMonth() + 1).padStart(2, '0');

      setFormData({
        id: '',
        fiscalYear: currentFiscalYear,
        regNo: generateRegNo(),
        regMonth: month,
        regDateBs: todayBs,
        regDateAd: new Date().toISOString().split('T')[0],
        name: '',
        age: '',
        sex: '',
        address: '',
        phone: '',
        animalType: '',
        exposureCategory: '',
        bodyPart: '',
        exposureDateBs: todayBs,
        regimen: 'Intradermal',
        schedule: []
      });
      alert('Patient Registered Successfully');
  };

  const handleDoseClick = (patient: RabiesPatient, dose: VaccinationDose, index: number) => {
      setSelectedDoseInfo({
          patient,
          doseIndex: index,
          dose
      });
      const today = new NepaliDate();
      setModalDateBs(today.format('YYYY-MM-DD'));
      setDoseUpdateError(null);
  };

  const confirmDoseUpdate = () => {
      if (!selectedDoseInfo) return;
      setDoseUpdateError(null);

      if (!modalDateBs) {
          setDoseUpdateError("कृपया खोप लगाएको मिति छान्नुहोस् (Please select vaccination date)");
          return;
      }
      
      const { patient, doseIndex, dose } = selectedDoseInfo;
      
      let givenDateAd = '';
      try {
          const [y, m, d] = modalDateBs.split('-').map(Number);
          const nd = new NepaliDate(y, m - 1, d);
          givenDateAd = nd.toJsDate().toISOString().split('T')[0];
      } catch (e) {
          console.error("Invalid date conversion", e);
          setDoseUpdateError("मिति ढाँचा मिलेन (Invalid Date)");
          return;
      }

      // Bypass date validation ONLY for Day 0 (D0)
      if (dose.day !== 0 && givenDateAd < dose.date) {
          setDoseUpdateError("तपाईंले छान्नुभएको मिति खोप तालिका (Scheduled Date) भन्दा अगाडि छ। कृपया सही मिति छान्नुहोस्।\n(Selected date cannot be earlier than scheduled date)");
          return;
      }

      const updatedSchedule = [...patient.schedule];
      updatedSchedule[doseIndex] = {
          ...updatedSchedule[doseIndex],
          status: 'Given',
          givenDate: givenDateAd
      };

      const updatedPatient = {
          ...patient,
          schedule: updatedSchedule
      };

      onUpdatePatient(updatedPatient);
      setSelectedDoseInfo(null);
  };

  const revertDoseUpdate = () => {
      if (!selectedDoseInfo) return;
      
      const { patient, doseIndex } = selectedDoseInfo;
      const updatedSchedule = [...patient.schedule];
      
      // Destructure to remove givenDate key entirely
      const { givenDate, ...rest } = updatedSchedule[doseIndex];
      updatedSchedule[doseIndex] = {
          ...rest,
          status: 'Pending'
      };

      const updatedPatient = {
          ...patient,
          schedule: updatedSchedule
      };

      onUpdatePatient(updatedPatient);
      setSelectedDoseInfo(null);
  };

  const filteredPatients = patients.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.regNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const todayAd = getTodayDateAd();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                <Syringe size={24} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800 font-nepali">रेबिज खोप दर्ता (Rabies Registration)</h2>
                <p className="text-sm text-slate-500">नयाँ बिरामी दर्ता र खोप तालिका</p>
            </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-3 bg-indigo-50 p-4 rounded-lg border border-indigo-100 flex items-center gap-4">
                  <div className="bg-white p-2 rounded border border-indigo-200">
                      <FileDigit size={20} className="text-indigo-600" />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-indigo-500 uppercase tracking-wide">दर्ता नम्बर (Reg No)</label>
                      <input 
                          value={formData.regNo} 
                          readOnly 
                          className="bg-transparent font-mono text-lg font-bold text-slate-800 outline-none w-full"
                      />
                  </div>
                  <div className="ml-auto">
                      <label className="text-xs font-bold text-indigo-500 uppercase tracking-wide">आर्थिक वर्ष</label>
                      <div className="font-nepali font-medium">{currentFiscalYear}</div>
                  </div>
              </div>

              <div className="md:col-span-1">
                 <NepaliDatePicker 
                    label="दर्ता मिति (Registration Date - BS)"
                    value={formData.regDateBs}
                    onChange={handleRegDateBsChange}
                    required
                    disabled={true}
                 />
              </div>

              <Select 
                  label="दर्ता भएको महिना (Month)"
                  value={formData.regMonth}
                  onChange={e => setFormData({...formData, regMonth: e.target.value})}
                  options={nepaliMonthOptions}
                  disabled={true}
                  icon={<CalendarRange size={16} />}
                  className="font-bold text-slate-800 bg-slate-100 cursor-not-allowed"
              />
              
              <Input 
                  label="दर्ता मिति (अंग्रेजी - Auto)"
                  value={formData.regDateAd}
                  readOnly
                  className="bg-slate-50 text-slate-500"
                  icon={<Calendar size={16} />}
              />

              <Input 
                  label="बिरामीको नाम (Patient Name)"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder="Full Name"
                  icon={<User size={16} />}
              />

              <div className="grid grid-cols-2 gap-4">
                  <Input 
                      label="उमेर (Age)"
                      value={formData.age}
                      onChange={e => setFormData({...formData, age: e.target.value})}
                      required
                      placeholder="Yr"
                      type="number"
                  />
                  <Select 
                      label="लिङ्ग (Sex)"
                      value={formData.sex}
                      onChange={e => setFormData({...formData, sex: e.target.value})}
                      options={[
                          {id: 'm', value: 'Male', label: 'पुरुष (Male)'},
                          {id: 'f', value: 'Female', label: 'महिला (Female)'},
                          {id: 'o', value: 'Other', label: 'अन्य (Other)'}
                      ]}
                      required
                  />
              </div>

              <Input 
                  label="सम्पर्क नं (Phone)"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  required
                  placeholder="98XXXXXXXX"
                  icon={<Phone size={16} />}
              />

              <div className="md:col-span-2">
                  <Input 
                      label="ठेगाना (Address)"
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      required
                      placeholder="Municipality-Ward, District"
                      icon={<MapPin size={16} />}
                  />
              </div>

              <div className="md:col-span-1">
                  <Select 
                      label="टोक्ने जनावर (Animal)"
                      value={formData.animalType}
                      onChange={e => setFormData({...formData, animalType: e.target.value})}
                      options={[
                          {id: 'dog', value: 'Dog', label: 'Dog bite'},
                          {id: 'monkey', value: 'Monkey', label: 'Monkey bite'},
                          {id: 'cat', value: 'Cat', label: 'Cat bite'},
                          {id: 'cattle', value: 'Cattle', label: 'Cattle bite'},
                          {id: 'rodent', value: 'Rodent', label: 'Rodent bite'},
                          {id: 'jackal', value: 'Jackal', label: 'Jackal bite'},
                          {id: 'tiger', value: 'Tiger', label: 'Tiger bite'},
                          {id: 'bear', value: 'Bear', label: 'Bear bite'},
                          {id: 'saliva', value: 'Saliva Contact', label: 'Saliva contact'},
                          {id: 'other', value: 'Other', label: 'Other specity'},
                      ]}
                      required
                  />
              </div>

              <Select 
                  label="टोकेको स्थान (Body Part)"
                  value={formData.bodyPart}
                  onChange={e => setFormData({...formData, bodyPart: e.target.value})}
                  options={[
                      {id: 'leg', value: 'Leg', label: 'खुट्टा (Leg)'},
                      {id: 'hand', value: 'Hand', label: 'हात (Hand)'},
                      {id: 'head', value: 'Head/Neck', label: 'टाउको/घाँटी (Head/Neck)'},
                      {id: 'trunk', value: 'Trunk', label: 'जीउ (Trunk)'},
                  ]}
                  required
              />

              <Select 
                  label="घाउको प्रकृति (Category)"
                  value={formData.exposureCategory}
                  onChange={e => setFormData({...formData, exposureCategory: e.target.value})}
                  options={[
                      {id: 'i', value: 'I', label: 'Category I (Touch/Lick on intact skin)'},
                      {id: 'ii', value: 'II', label: 'Category II (Minor scratch/Nibbling)'},
                      {id: 'iii', value: 'III', label: 'Category III (Deep bite/Bleeding/Mucous)'},
                  ]}
                  required
              />

              <NepaliDatePicker 
                  label="टोकेको मिति (Exposure Date - BS)"
                  value={formData.exposureDateBs}
                  onChange={val => {
                      if (formData.regDateBs && val > formData.regDateBs) {
                          alert("टोकेको मिति दर्ता मिति भन्दा पछाडि हुन सक्दैन।\n(Exposure Date cannot be after Registration Date)");
                          return;
                      }
                      setFormData({...formData, exposureDateBs: val});
                  }}
              />

              <div className="md:col-span-3 pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button 
                      type="button"
                      className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-2"
                      onClick={() => setFormData({
                          ...formData,
                          name: '', age: '', sex: '', address: '', phone: ''
                      })}
                  >
                      <RotateCcw size={18} /> Reset
                  </button>
                  <button 
                      type="submit"
                      className="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-sm flex items-center gap-2 font-medium"
                  >
                      <Save size={18} /> दर्ता गर्नुहोस् (Register)
                  </button>
              </div>
          </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h3 className="font-semibold text-slate-700 font-nepali">हालै दर्ता भएका बिरामीहरू (Follow-up List)</h3>
              <div className="relative w-full sm:w-64">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                      type="text" 
                      placeholder="Search..." 
                      className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                  />
              </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                  <tr>
                      <th className="px-6 py-3">Reg No</th>
                      <th className="px-6 py-3">Patient</th>
                      <th className="px-6 py-3">Incident</th>
                      <th className="px-6 py-3">Schedule / Follow-up</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                  {filteredPatients.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">No patients found.</td></tr>
                  ) : (
                      filteredPatients.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4 font-mono font-medium text-indigo-600">{p.regNo}</td>
                              <td className="px-6 py-4">
                                  <div className="font-medium text-slate-800">{p.name}</div>
                                  <div className="text-xs text-slate-500">{p.age} Yrs / {p.sex}</div>
                                  <div className="text-xs text-slate-400">{p.phone}</div>
                              </td>
                              <td className="px-6 py-4 text-slate-600">
                                  <div className="flex items-center gap-2">
                                      {(() => {
                                          let animalLabel = p.animalType;
                                          if (p.animalType === 'Saliva Contact') animalLabel = 'Saliva contact';
                                          else if (p.animalType === 'Other') animalLabel = 'Other specity';
                                          else if (!p.animalType.includes('bite') && p.animalType !== 'Saliva Contact' && p.animalType !== 'Other') animalLabel = `${p.animalType} bite`;
                                          
                                          return <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">{animalLabel}</span>;
                                      })()}
                                      <span className="text-xs font-bold text-red-500">Cat {p.exposureCategory}</span>
                                  </div>
                                  <div className="text-xs text-slate-400 mt-1">{p.bodyPart}</div>
                              </td>
                              <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                      {p.schedule.map((dose, idx) => {
                                          const isGiven = dose.status === 'Given';
                                          const isToday = dose.date === todayAd && !isGiven;
                                          
                                          let nepaliDateStr = '';
                                          try {
                                              const [y, m, d] = dose.date.split('-').map(Number);
                                              const dateObj = new Date(y, m - 1, d, 12, 0, 0);
                                              const nd = new NepaliDate(dateObj);
                                              nepaliDateStr = nd.format('YYYY-MM-DD');
                                          } catch (e) {}

                                          return (
                                              <button 
                                                  key={idx}
                                                  onClick={() => handleDoseClick(p, dose, idx)}
                                                  className={`
                                                      flex flex-col items-center justify-center w-12 h-14 rounded-lg border transition-all relative group
                                                      ${isGiven 
                                                          ? 'bg-green-50 border-green-200 text-green-700' 
                                                          : isToday 
                                                              ? 'bg-orange-50 border-orange-200 text-orange-700 ring-2 ring-orange-100 animate-pulse' 
                                                              : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                                                      }
                                                  `}
                                                  title={`Day ${dose.day}: ${dose.date}\n(BS: ${nepaliDateStr})`}
                                              >
                                                  <span className="text-[10px] font-bold uppercase mb-0.5">D{dose.day}</span>
                                                  {isGiven ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                                                  <span className="text-[9px] mt-0.5 font-mono">{dose.date.split('-')[1]}-{dose.date.split('-')[2]}</span>
                                              </button>
                                          );
                                      })}
                                  </div>
                              </td>
                          </tr>
                      ))
                  )}
              </tbody>
            </table>
          </div>
      </div>

      {selectedDoseInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedDoseInfo(null)}></div>
              
              <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm overflow-visible flex flex-col animate-in zoom-in-95 duration-200">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50 rounded-t-xl">
                      <div className="flex items-center gap-2">
                          <Syringe size={20} className="text-indigo-600"/>
                          <h3 className="font-bold text-slate-800">खोप विवरण (Vaccine Details)</h3>
                      </div>
                      <button onClick={() => setSelectedDoseInfo(null)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      <div className="text-center">
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                              <span className="text-2xl font-bold text-slate-700">D{selectedDoseInfo.dose.day}</span>
                          </div>
                          <h4 className="text-lg font-bold text-slate-800">{selectedDoseInfo.patient.name}</h4>
                          <p className="text-sm text-slate-500 mb-1">{selectedDoseInfo.patient.regNo}</p>
                          <p className="text-sm font-medium bg-slate-100 inline-block px-3 py-1 rounded-full font-nepali">
                              Scheduled: {(() => {
                                  try {
                                      const [y, m, d] = selectedDoseInfo.dose.date.split('-').map(Number);
                                      const jsDate = new Date(y, m - 1, d, 12, 0, 0); 
                                      const nd = new NepaliDate(jsDate);
                                      return nd.format('YYYY-MM-DD');
                                  } catch (e) {
                                      return selectedDoseInfo.dose.date;
                                  }
                              })()} <span className="text-xs text-slate-500 font-sans">({selectedDoseInfo.dose.date})</span>
                          </p>
                      </div>

                      {selectedDoseInfo.dose.status === 'Given' ? (
                          <div className="bg-green-50 border border-green-100 p-3 rounded-lg text-center">
                              <p className="text-green-700 font-bold flex items-center justify-center gap-2">
                                  <CheckCircle2 size={18} /> खोप लगाइसकियो (Completed)
                              </p>
                              <p className="text-xs text-green-600 mt-1">Given on: {selectedDoseInfo.dose.givenDate}</p>
                          </div>
                      ) : (
                          <div className="space-y-3">
                              <div className="flex justify-center mb-1">
                                  <div className="bg-indigo-100 p-3 rounded-full text-indigo-600 shadow-sm ring-4 ring-indigo-50">
                                      <Calendar size={32} />
                                  </div>
                              </div>
                              <NepaliDatePicker 
                                  label="खोप लगाएको मिति (Vaccination Date)"
                                  value={modalDateBs}
                                  onChange={(val) => {
                                      setModalDateBs(val);
                                      setDoseUpdateError(null);
                                  }}
                              />
                              <div className="bg-orange-50 border border-orange-100 p-3 rounded-lg flex items-start gap-3">
                                  <AlertTriangle size={18} className="text-orange-600 shrink-0 mt-0.5" />
                                  <p className="text-sm text-orange-800">
                                      के तपाईँ यो डोज (Day {selectedDoseInfo.dose.day}) माथि उल्लेखित मितिमा लगाउन चाहनुहुन्छ?
                                  </p>
                              </div>
                              
                              {doseUpdateError && (
                                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-red-700 text-sm animate-pulse">
                                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                      <span className="font-medium whitespace-pre-line">{doseUpdateError}</span>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>

                  <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50 rounded-b-xl">
                      {selectedDoseInfo.dose.status === 'Given' ? (
                          <button 
                              onClick={revertDoseUpdate}
                              className="w-full py-2.5 text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg font-medium shadow-sm transition-colors text-sm"
                          >
                              Mark as Pending (गलत भए सच्याउनुहोस्)
                          </button>
                      ) : (
                          <>
                              <button onClick={() => setSelectedDoseInfo(null)} className="flex-1 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors text-sm">Cancel</button>
                              <button 
                                  onClick={confirmDoseUpdate}
                                  className="flex-1 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-lg font-medium shadow-sm transition-colors text-sm flex items-center justify-center gap-2"
                              >
                                  <CheckCircle2 size={16} /> Confirm (लगायो)
                              </button>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
