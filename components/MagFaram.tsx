
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Printer, Save, Calendar, CheckCircle2, Send, Clock, FileText, Download, ShieldCheck, CheckCheck, Eye, Search, X, AlertCircle, Store as StoreIcon, Layers, AlertTriangle } from 'lucide-react';
import { User, MagItem, MagFormEntry, InventoryItem, Option, Store, OrganizationSettings } from '../types';
import { SearchableSelect } from './SearchableSelect';
import { Select } from './Select';
import { NepaliDatePicker } from './NepaliDatePicker';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface MagFaramProps {
  currentFiscalYear: string;
  currentUser: User;
  existingForms: MagFormEntry[];
  onSave: (form: MagFormEntry) => void;
  inventoryItems: InventoryItem[]; // Added Inventory Items Prop
  stores?: Store[]; // Added Store Prop
  generalSettings: OrganizationSettings; // Added General Settings Prop
}

export const MagFaram: React.FC<MagFaramProps> = ({ currentFiscalYear, currentUser, existingForms, onSave, inventoryItems, stores = [], generalSettings }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Calculate Today in Nepali for Restrictions
  const todayBS = useMemo(() => {
      try {
          return new NepaliDate().format('YYYY/MM/DD');
      } catch (e) {
          return '';
      }
  }, []);

  // State for Rejection Modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [formToRejectId, setFormToRejectId] = useState<string | null>(null);

  // State for Store/Type Verification Modal
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationData, setVerificationData] = useState({
      storeId: '',
      itemType: 'Expendable' // Default
  });

  // NEW: State for Stock Warning Modal (When purchasing despite having stock)
  const [showStockWarningModal, setShowStockWarningModal] = useState(false);
  const [stockWarningItems, setStockWarningItems] = useState<string[]>([]);


  const [items, setItems] = useState<MagItem[]>([
    { id: Date.now(), name: '', specification: '', unit: '', quantity: '', remarks: '' }
  ]);

  const [formDetails, setFormDetails] = useState({
    fiscalYear: currentFiscalYear,
    formNo: 1, // Store as number for logic, display as string if needed
    date: '', // Default to empty to show placeholder
    status: 'Pending' as 'Pending' | 'Verified' | 'Approved' | 'Rejected',
    demandBy: { 
      name: currentUser.fullName, 
      designation: currentUser.designation, 
      date: '',
      purpose: '' // Default blank as requested
    },
    recommendedBy: { name: '', designation: '', date: '' },
    storeKeeper: { status: '', name: '', }, // 'market' or 'stock' or 'market,stock'
    receiver: { name: '', designation: '', date: '' },
    ledgerEntry: { name: '', date: '' },
    approvedBy: { name: '', designation: '', date: '' }
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Logic to determine Form Number based on Fiscal Year
  useEffect(() => {
    // Only auto-calculate form number if NOT editing an existing one
    if (editingId) return;

    // 1. Filter existing forms for the current fiscal year
    const formsInCurrentFY = existingForms.filter(f => f.fiscalYear === currentFiscalYear);
    
    // 2. Find the max form number
    let maxFormNo = 0;
    if (formsInCurrentFY.length > 0) {
        maxFormNo = Math.max(...formsInCurrentFY.map(f => f.formNo));
    }

    // 3. Set next form number
    setFormDetails(prev => ({
        ...prev,
        fiscalYear: currentFiscalYear,
        formNo: maxFormNo + 1
    }));
  }, [currentFiscalYear, existingForms, editingId]);

  // --- NEW LOGIC: Prevent Mixing Expendable and Non-Expendable Items ---

  // 1. Determine Locked Type based on the first selected item
  const lockedItemType = useMemo(() => {
    // Find the first item in the list that has a valid name matching inventory
    for (const item of items) {
        const invItem = inventoryItems.find(i => i.itemName === item.name);
        if (invItem) return invItem.itemType;
    }
    return null; // No type locked yet
  }, [items, inventoryItems]);

  // 2. Filter Item Options based on Locked Type
  const itemOptions: Option[] = useMemo(() => {
    let availableItems = inventoryItems;

    // If a type is locked, filter inventory to show ONLY that type
    if (lockedItemType) {
        availableItems = inventoryItems.filter(i => i.itemType === lockedItemType);
    }

    return availableItems.map(item => {
        const typeLabel = item.itemType === 'Expendable' ? 'खर्च हुने' : 'खर्च नहुने';
        return {
            id: item.id,
            value: item.itemName, // Value to put in input
            // Custom label showing Name, Type, Unit, Stock
            label: `${item.itemName} [${typeLabel}] (एकाई: ${item.unit}) - मौज्दात: ${item.currentQuantity} ${item.currentQuantity === 0 ? '(Stock Empty)' : ''}`
        };
    });
  }, [inventoryItems, lockedItemType]);

  const storeOptions: Option[] = useMemo(() => {
      return stores.map(s => ({ id: s.id, value: s.id, label: s.name }));
  }, [stores]);

  const handleAddItem = () => {
    setItems([...items, { 
      id: Date.now(), 
      name: '', 
      specification: '', 
      unit: '', 
      quantity: '', 
      remarks: '' 
    }]);
  };

  const handleRemoveItem = (id: number) => {
    if (items.length === 1) return;
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: number, field: keyof MagItem, value: string) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleDateChange = (newDate: string) => {
    // NepaliDatePicker now returns formatted string based on 'format' prop
    // so newDate should already be YYYY/MM/DD
    setFormDetails(prev => ({
        ...prev,
        date: newDate,
        demandBy: { ...prev.demandBy, date: newDate }
    }));
  };

  const handleStoreKeeperStatusChange = (value: string) => {
    // Mutual exclusivity logic
    const newStatus = formDetails.storeKeeper.status === value ? '' : value;
    setFormDetails(prev => ({
        ...prev,
        storeKeeper: { ...prev.storeKeeper, status: newStatus }
    }));
  };

  const handleReset = () => {
      setEditingId(null);
      setIsViewOnly(false);
      setValidationError(null);
      setShowRejectModal(false); 
      setRejectionReasonInput(''); 
      setFormToRejectId(null); 
      setShowVerificationModal(false);
      setShowStockWarningModal(false);
      setStockWarningItems([]); 
      setVerificationData({ storeId: '', itemType: 'Expendable' });
      setItems([{ id: Date.now(), name: '', specification: '', unit: '', quantity: '', remarks: '' }]);
      setFormDetails({
        fiscalYear: currentFiscalYear,
        formNo: 1,
        date: '',
        status: 'Pending',
        demandBy: { 
          name: currentUser.fullName, 
          designation: currentUser.designation, 
          date: '',
          purpose: '' // Default blank
        },
        recommendedBy: { name: '', designation: '', date: '' },
        storeKeeper: { status: '', name: '' },
        receiver: { name: '', designation: '', date: '' },
        ledgerEntry: { name: '', date: '' },
        approvedBy: { name: '', designation: '', date: '' }
      });
      setSaveStatus('idle');
  };

  const handleLoadRequest = (form: MagFormEntry, viewOnly: boolean = false) => {
    setEditingId(form.id);
    setIsViewOnly(viewOnly);
    setValidationError(null);
    setShowRejectModal(false);
    setRejectionReasonInput('');
    setFormToRejectId(null);
    setShowVerificationModal(false);
    setShowStockWarningModal(false);
    setItems(form.items);
    setFormDetails({
        fiscalYear: form.fiscalYear,
        formNo: form.formNo,
        date: form.date,
        status: form.status || 'Pending',
        demandBy: { 
            name: form.demandBy?.name || '', 
            designation: form.demandBy?.designation || '', 
            date: form.demandBy?.date || '', 
            purpose: form.demandBy?.purpose || '' 
        },
        recommendedBy: {
            name: form.recommendedBy?.name || '',
            designation: form.recommendedBy?.designation || '',
            date: form.recommendedBy?.date || ''
        },
        storeKeeper: form.storeKeeper || { status: '', name: '' },
        receiver: {
            name: form.receiver?.name || '',
            designation: form.receiver?.designation || '',
            date: form.receiver?.date || ''
        },
        ledgerEntry: {
            name: form.ledgerEntry?.name || '',
            date: form.ledgerEntry?.date || ''
        },
        approvedBy: (form.status === 'Rejected') ? { name: '', designation: '', date: '' } : {
            name: form.approvedBy?.name || '',
            designation: form.approvedBy?.designation || '',
            date: form.approvedBy?.date || ''
        }
    });
    
    if (form.selectedStoreId) {
        setVerificationData(prev => ({
            ...prev,
            storeId: form.selectedStoreId || '',
            itemType: form.issueItemType || 'Expendable'
        }));
    }

    const formElement = document.getElementById('mag-faram-container');
    if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Determine current role actions
  const isStoreKeeper = currentUser.role === 'STOREKEEPER';
  const isApprover = ['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role);
  const isContentLocked = isViewOnly || (isApprover && editingId !== null);

  const handleSave = () => {
    if (isViewOnly) return;
    setValidationError(null);

    // 1. Validate Date Presence
    if (!formDetails.date.trim()) {
        setValidationError('मिति (Date) खाली छ। कृपया मिति भर्नुहोस्।');
        return;
    }

    // 2. Validate Date Format YYYY/MM/DD
    const dateRegex = /^\d{4}\/\d{2}\/\d{2}$/;
    if (!dateRegex.test(formDetails.date)) {
        setValidationError('मिति ढाँचा मिलेन (Format did not match)। \nकृपया YYYY/MM/DD प्रयोग गर्नुहोस् (उदाहरण: 2082/06/22)');
        return;
    }

    // 2.1 Validate Date within Fiscal Year
    const [fyStart] = currentFiscalYear.split('/'); // e.g., '2081'
    if (fyStart) {
        const startYearNum = parseInt(fyStart);
        const endYearNum = startYearNum + 1;

        const minDate = `${startYearNum}/04/01`; // Shrawan 1
        const maxDate = `${endYearNum}/03/32`; // Ashad End (Using 32 to cover all month lengths)

        if (formDetails.date < minDate || formDetails.date > maxDate) {
             setValidationError(`मिति आर्थिक वर्ष ${currentFiscalYear} भित्रको हुनुपर्छ।\n(${minDate} देखि ${maxDate} सम्म मात्र मान्य छ)`);
             return;
        }
    }

    // 2.2 Validate Date Chronological Order (Prev Form No)
    if (formDetails.formNo > 1) {
        const previousFormNo = formDetails.formNo - 1;
        const previousForm = existingForms.find(f => 
            f.fiscalYear === currentFiscalYear && 
            f.formNo === previousFormNo
        );

        if (previousForm) {
            if (formDetails.date < previousForm.date) {
                setValidationError(`मिति क्रम मिलेन (Invalid Date Order): \nमाग फारम नं ${previousFormNo} को मिति (${previousForm.date}) भन्दा \nमाग फारम नं ${formDetails.formNo} को मिति (${formDetails.date}) अगाडि हुन सक्दैन।`);
                return;
            }
        }
    }

    // 3. Validate Demand By Details
    if (!formDetails.demandBy.name.trim() || !formDetails.demandBy.designation.trim()) {
        setValidationError('माग गर्नेको नाम र पद (Name and Designation) खाली छ। कृपया भर्नुहोस्।');
        return;
    }

    // 4. Validate Purpose (Re-enabled)
    if (!formDetails.demandBy.purpose.trim()) {
        setValidationError('प्रयोजन (Purpose) खाली छ। कृपया प्रयोजन खुलाउनुहोस्।');
        return;
    }

    // 5. Validate Items (Name, Unit, Quantity) & Types
    if (items.length === 0) {
         setValidationError('कृपया कम्तिमा एउटा सामानको विवरण भर्नुहोस्। (Please add at least one item)');
         return;
    }

    // Check for Mixed Types manually (Backup to UI restriction)
    let foundType: 'Expendable' | 'Non-Expendable' | null = null;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.name.trim() || !item.unit.trim() || !item.quantity.toString().trim()) {
             setValidationError(`क्रम संख्या ${i + 1} मा सामानको विवरण (नाम, एकाइ, परिमाण) खाली छ।`);
             return;
        }

        const invItem = inventoryItems.find(inv => inv.itemName === item.name);
        if (invItem) {
            if (!foundType) {
                foundType = invItem.itemType;
            } else if (foundType !== invItem.itemType) {
                setValidationError(`तपाईंले "खर्च हुने" र "खर्च नहुने" सामानहरू एउटै फारममा राख्न सक्नुहुन्न। कृपया फरक फारम प्रयोग गर्नुहोस्।\n(You cannot mix Expendable and Non-Expendable items in the same form.)`);
                return;
            }
        }
    }

    // 6. Validate Duplicate Form No
    const isDuplicate = existingForms.some(f => 
        f.fiscalYear === currentFiscalYear && 
        f.formNo === formDetails.formNo && 
        f.id !== editingId 
    );

    if (isDuplicate) {
        setValidationError(`माग फारम नं. ${formDetails.formNo} पहिले नै दर्ता भइसकेको छ।`);
        return;
    }

    // Validate Storekeeper Checkbox
    if (isStoreKeeper && editingId) {
        const currentFormStatus = existingForms.find(f => f.id === editingId)?.status;
        if (currentFormStatus === 'Pending') {
             if (!formDetails.storeKeeper.status) {
                 setValidationError('कृपया प्रमाणिकरण गर्नु अघि "बजारबाट खरिद गर्नुपर्ने" वा "मौज्दातमा रहेको" मध्ये एउटा विकल्प छान्नुहोस्।');
                 return;
             }
             
             // Case A: Stock selected - Require Store ID
             if (formDetails.storeKeeper.status.includes('stock')) {
                 if (!verificationData.storeId) {
                     const defaultStoreId = stores.length > 0 ? stores[0].id : '';
                     let detectedType = 'Expendable'; 
                     
                     for (const item of items) {
                         const matchedInvItem = inventoryItems.find(inv => 
                             inv.itemName.trim().toLowerCase() === item.name.trim().toLowerCase()
                         );
                         if (matchedInvItem) {
                             detectedType = matchedInvItem.itemType;
                             break;
                         }
                     }

                     setVerificationData({
                         storeId: defaultStoreId,
                         itemType: detectedType as 'Expendable' | 'Non-Expendable'
                     });

                     setShowVerificationModal(true);
                     return; 
                 }
             }

             // Case B: Market Purchase selected - CHECK FOR STOCK AVAILABILITY (New Feature)
             if (formDetails.storeKeeper.status.includes('market')) {
                 const availableItems: string[] = [];
                 
                 items.forEach(reqItem => {
                     const reqQty = parseFloat(reqItem.quantity) || 0;
                     
                     // Check total stock across all stores for this item name
                     // Note: Using case insensitive name match as names should be consistent
                     const matchingInv = inventoryItems.filter(i => 
                         i.itemName.trim().toLowerCase() === reqItem.name.trim().toLowerCase()
                     );
                     
                     const totalStock = matchingInv.reduce((sum, i) => sum + i.currentQuantity, 0);

                     if (totalStock >= reqQty) {
                         availableItems.push(`${reqItem.name} (माग: ${reqQty}, मौज्दात: ${totalStock})`);
                     }
                 });

                 if (availableItems.length > 0) {
                     setStockWarningItems(availableItems);
                     setShowStockWarningModal(true);
                     return; // Stop execution, wait for user confirmation
                 }
             }
        }
    }

    performSave();
  };

  const handleConfirmPurchase = () => {
      setShowStockWarningModal(false);
      performSave();
  };

  const confirmVerification = () => {
      if (!verificationData.storeId) {
          setValidationError('कृपया गोदाम छान्नुहोस्');
          return;
      }
      if (!verificationData.itemType) {
          setValidationError('कृपया सामानको प्रकार छान्नुहोस्');
          return;
      }

      // Check if stock exists for the requested items in the selected store
      for (const item of items) {
          const requestedQty = parseFloat(item.quantity) || 0;
          
          // Find item in specific store (Case insensitive match on name)
          const stockItem = inventoryItems.find(inv => 
              inv.storeId === verificationData.storeId &&
              inv.itemName.trim().toLowerCase() === item.name.trim().toLowerCase()
          );

          const availableQty = stockItem ? stockItem.currentQuantity : 0;

          if (requestedQty > availableQty) {
              setValidationError(`सामान "${item.name}" को मौज्दात अपुग छ। (Insufficient Stock)\nमाग गरिएको (Requested): ${requestedQty}\nउपलब्ध मौज्दात (Available): ${availableQty}`);
              return;
          }
      }

      setShowVerificationModal(false);
      setValidationError(null);
      performSave();
  };

  const performSave = () => {
    setSaveStatus('saving');
    const existingForm = editingId ? existingForms.find(f => f.id === editingId) : null;
    let nextStatus: 'Pending' | 'Verified' | 'Approved' | 'Rejected' = 'Pending';
    
    if (existingForm) {
        if (isStoreKeeper && existingForm.status === 'Pending') {
            nextStatus = 'Verified'; 
        } else if (isApprover && existingForm.status === 'Verified') {
            nextStatus = 'Approved'; 
        } else {
            nextStatus = existingForm.status || 'Pending';
        }
    } else {
        nextStatus = 'Pending';
    }

    const updatedStoreKeeper = isStoreKeeper ? {
        status: formDetails.storeKeeper.status,
        name: currentUser.fullName 
    } : formDetails.storeKeeper;

    const updatedApprovedBy = (isApprover && nextStatus === 'Approved') ? {
        name: currentUser.fullName,
        designation: currentUser.designation,
        date: formDetails.date 
    } : formDetails.approvedBy;


    const newForm: MagFormEntry = {
        id: editingId || Date.now().toString(),
        fiscalYear: formDetails.fiscalYear,
        formNo: formDetails.formNo,
        date: formDetails.date,
        items: items,
        status: nextStatus,
        demandBy: formDetails.demandBy,
        recommendedBy: formDetails.recommendedBy,
        storeKeeper: updatedStoreKeeper,
        receiver: formDetails.receiver,
        ledgerEntry: formDetails.ledgerEntry,
        approvedBy: updatedApprovedBy,
        rejectionReason: undefined, 
        selectedStoreId: (isStoreKeeper && formDetails.storeKeeper.status.includes('stock')) ? verificationData.storeId : existingForm?.selectedStoreId,
        issueItemType: (isStoreKeeper && formDetails.storeKeeper.status.includes('stock')) ? verificationData.itemType as any : existingForm?.issueItemType
    };

    setTimeout(() => {
        onSave(newForm);
        setSaveStatus('saved');
        setTimeout(() => {
            handleReset();
        }, 500);
    }, 500);
  };

  const handleRejectModalOpen = (formId: string) => {
    setFormToRejectId(formId);
    setRejectionReasonInput(''); 
    setShowRejectModal(true);
  };

  const handleRejectSubmit = () => {
    if (!formToRejectId || !rejectionReasonInput.trim()) {
        setValidationError('अस्वीकृतिको कारण खाली छ।');
        return;
    }

    const existingForm = existingForms.find(f => f.id === formToRejectId);
    if (!existingForm) return;

    const rejectedForm: MagFormEntry = {
        ...existingForm,
        status: 'Rejected',
        rejectionReason: rejectionReasonInput.trim(),
        approvedBy: { name: '', designation: '', date: '' }, 
    };

    onSave(rejectedForm);
    setShowRejectModal(false);
    handleReset(); 
    setValidationError(null); 
    alert('फारम सफलतापूर्वक अस्वीकृत गरियो');
  };


  // --- FILTER LOGIC ---
  const pendingRequests = existingForms.filter(f => {
      if (isStoreKeeper) return f.status === 'Pending';
      if (isApprover) return f.status === 'Verified'; 
      return false; 
  }).sort((a, b) => b.formNo - a.formNo);
  
  const showList = (isStoreKeeper || isApprover) && pendingRequests.length > 0;
  const approvedForms = existingForms.filter(f => f.status === 'Approved').sort((a, b) => b.formNo - a.formNo);
  const showApprovedList = isStoreKeeper && approvedForms.length > 0;
  const formsSentForApproval = existingForms.filter(f => {
    return isStoreKeeper && f.status === 'Verified' && f.storeKeeper?.name === currentUser.fullName;
  }).sort((a, b) => b.formNo - a.formNo);
  const showFormsSentForApproval = isStoreKeeper && formsSentForApproval.length > 0;
  const mySubmittedForms = existingForms.filter(f => {
    if (isStoreKeeper) {
      return f.demandBy?.name === currentUser.fullName && f.status === 'Rejected';
    } else {
      return f.demandBy?.name === currentUser.fullName;
    }
  }).sort((a, b) => b.formNo - a.formNo);
  
  const listTitle = isStoreKeeper 
    ? 'प्रमाणिकरणको लागि अनुरोधहरू (Pending Verification)' 
    : 'स्वीकृतिको लागि अनुरोधहरू (Pending Approval)';

  let actionLabel = 'Save & Request';
  let ActionIcon = Send;
  const currentFormStatus = editingId ? existingForms.find(f => f.id === editingId)?.status : 'New';

  if (isStoreKeeper && currentFormStatus === 'Pending') {
      actionLabel = 'Verify & Forward';
      ActionIcon = ShieldCheck;
  } else if (isApprover && currentFormStatus === 'Verified') {
      actionLabel = 'Approve Request';
      ActionIcon = CheckCheck;
  } else if (editingId) {
      actionLabel = 'Update & Save';
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
       
       {/* REQUEST LISTS */}
       {showList && (
          <div className="bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden no-print">
              <div className="bg-orange-50 px-6 py-3 border-b border-orange-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-orange-800">
                      <Clock size={18} />
                      <h3 className="font-bold font-nepali">{listTitle}</h3>
                  </div>
                  <span className="bg-orange-200 text-orange-800 text-xs font-bold px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600 font-medium">
                          <tr>
                              <th className="px-6 py-3">Form No</th>
                              <th className="px-6 py-3">Date</th>
                              <th className="px-6 py-3">Demand By</th>
                              <th className="px-6 py-3">Items</th>
                              <th className="px-6 py-3">Status</th>
                              <th className="px-6 py-3 text-right">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {pendingRequests.map(form => (
                              <tr key={form.id} className="hover:bg-slate-50">
                                  <td className="px-6 py-3 font-mono font-medium text-slate-700">{form.formNo}</td>
                                  <td className="px-6 py-3 font-nepali">{form.date}</td>
                                  <td className="px-6 py-3">
                                      <div className="font-medium text-slate-800">{form.demandBy?.name}</div>
                                      <div className="text-xs text-slate-500">{form.demandBy?.designation}</div>
                                  </td>
                                  <td className="px-6 py-3 text-slate-600">
                                      {form.items.length} items <span className="text-slate-400">({form.items[0].name}...)</span>
                                  </td>
                                  <td className="px-6 py-3">
                                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border
                                          ${form.status === 'Verified' 
                                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                            : 'bg-orange-100 text-orange-700 border-orange-200'
                                          }
                                      `}>
                                          <Clock size={12} /> {form.status === 'Verified' ? 'Waiting Approval' : 'Pending Verification'}
                                      </span>
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                      <button 
                                        onClick={() => handleLoadRequest(form, false)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-xs font-bold transition-colors border border-blue-200"
                                      >
                                         <Download size={14} /> लोड (Load)
                                      </button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
       )}

       {showApprovedList && (
          <div className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden no-print">
              <div className="bg-green-50 px-6 py-3 border-b border-green-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle2 size={18} />
                      <h3 className="font-bold font-nepali">स्वीकृत भएका माग फारमहरू (Approved Forms)</h3>
                  </div>
                  <span className="bg-green-200 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full">{approvedForms.length}</span>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600 font-medium">
                          <tr>
                              <th className="px-6 py-3">Form No</th>
                              <th className="px-6 py-3">Date</th>
                              <th className="px-6 py-3">Demand By</th>
                              <th className="px-6 py-3">Approved By</th>
                              <th className="px-6 py-3">Status</th>
                              <th className="px-6 py-3 text-right">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {approvedForms.map(form => (
                              <tr key={form.id} className="hover:bg-slate-50">
                                  <td className="px-6 py-3 font-mono font-medium text-slate-700">{form.formNo}</td>
                                  <td className="px-6 py-3 font-nepali">{form.date}</td>
                                  <td className="px-6 py-3">
                                      <div className="font-medium text-slate-800">{form.demandBy?.name}</div>
                                      <div className="text-xs text-slate-500">{form.demandBy?.designation}</div>
                                  </td>
                                  <td className="px-6 py-3">
                                      <div className="font-medium text-slate-800">{form.approvedBy?.name || '-'}</div>
                                      <div className="text-xs text-slate-500">{form.approvedBy?.designation}</div>
                                  </td>
                                  <td className="px-6 py-3">
                                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium border border-green-200">
                                          <CheckCircle2 size={12} /> Approved
                                      </span>
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                      <button 
                                        onClick={() => handleLoadRequest(form, true)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-md text-xs font-bold transition-colors border border-slate-200"
                                      >
                                         <Download size={14} /> View
                                      </button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
       )}

       {showFormsSentForApproval && (
          <div className="bg-white rounded-xl border border-purple-200 shadow-sm overflow-hidden no-print">
              <div className="bg-purple-50 px-6 py-3 border-b border-purple-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-800">
                      <ShieldCheck size={18} />
                      <h3 className="font-bold font-nepali">स्वीकृतिको लागि पठाइएको माग फारमहरू</h3>
                  </div>
                  <span className="bg-purple-200 text-purple-800 text-xs font-bold px-2 py-0.5 rounded-full">{formsSentForApproval.length}</span>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600 font-medium">
                          <tr>
                              <th className="px-6 py-3">Form No</th>
                              <th className="px-6 py-3">Date</th>
                              <th className="px-6 py-3">Demand By</th>
                              <th className="px-6 py-3">Items</th>
                              <th className="px-6 py-3">Current Status</th>
                              <th className="px-6 py-3 text-right">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {formsSentForApproval.map(form => (
                              <tr key={form.id} className="hover:bg-purple-50">
                                  <td className="px-6 py-3 font-mono font-medium text-slate-700">{form.formNo}</td>
                                  <td className="px-6 py-3 font-nepali">{form.date}</td>
                                  <td className="px-6 py-3">
                                      <div className="font-medium text-slate-800">{form.demandBy?.name}</div>
                                      <div className="text-xs text-slate-500">{form.demandBy?.designation}</div>
                                  </td>
                                  <td className="px-6 py-3 text-slate-600">
                                      {form.items.length} items <span className="text-slate-400">({form.items[0].name}...)</span>
                                  </td>
                                  <td className="px-6 py-3">
                                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">
                                          <ShieldCheck size={12} /> Verified (Pending Approval)
                                      </span>
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                      <button 
                                        onClick={() => handleLoadRequest(form, true)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-md text-xs font-bold transition-colors border border-slate-300"
                                      >
                                         <Eye size={14} /> Preview
                                      </button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
       )}

       {/* Validation Error Banner */}
       {validationError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-start gap-3 animate-in slide-in-from-top-2">
            <div className="text-red-500 mt-0.5">
               <AlertCircle size={24} />
            </div>
            <div className="flex-1">
               <h3 className="text-red-800 font-bold text-sm">विवरण मिलेन (Validation Error)</h3>
               <p className="text-red-700 text-sm mt-1 whitespace-pre-line leading-relaxed">{validationError}</p>
            </div>
            <button onClick={() => setValidationError(null)} className="text-red-400 hover:text-red-600 transition-colors">
               <X size={20} />
            </button>
          </div>
       )}

       {/* Actions Bar */}
       <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
          <div className="flex items-center gap-3">
             <h2 className="font-bold text-slate-700 font-nepali text-lg">
                माग फारम (Demand Form) 
             </h2>
             {editingId && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded border 
                    ${isViewOnly ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                    {isViewOnly ? 'PREVIEW MODE' : 'EDIT MODE'} • Form No: {formDetails.formNo}
                </span>
             )}
          </div>
          <div className="flex gap-2">
            {isViewOnly ? (
                <button 
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg font-medium transition-colors"
                >
                    <X size={18} /> Close Preview
                </button>
            ) : (
                <>
                    {/* 
                        Allow Rejection:
                        1. Approver can reject Verified forms.
                        2. Storekeeper can reject Pending forms.
                    */}
                    {((isApprover && currentFormStatus === 'Verified') || (isStoreKeeper && currentFormStatus === 'Pending')) && editingId && (
                        <button 
                            onClick={() => handleRejectModalOpen(editingId)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-medium transition-colors"
                        >
                            <X size={18} /> अस्वीकृत (Reject)
                        </button>
                    )}
                    
                    {!isContentLocked && (
                        <button 
                            onClick={handleAddItem}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                        >
                            <Plus size={18} /> Add Row
                        </button>
                    )}

                    <button 
                        onClick={handleSave}
                        disabled={saveStatus !== 'idle'}
                        className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium shadow-sm transition-colors ${
                            saveStatus === 'saved' ? 'bg-green-600' : 'bg-primary-600 hover:bg-primary-700'
                        }`}
                    >
                        {saveStatus === 'saving' ? (
                            <>saving...</>
                        ) : saveStatus === 'saved' ? (
                            <><CheckCircle2 size={18}/> {editingId ? 'Done!' : 'Sent!'}</>
                        ) : (
                            <><ActionIcon size={18} /> {actionLabel}</>
                        )}
                    </button>
                </>
            )}
            <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-lg font-medium shadow-sm transition-colors"
            >
                <Printer size={18} /> Print
            </button>
          </div>
       </div>

       {/* A4 Paper Container */}
       <div id="mag-faram-container" className="bg-white p-8 md:p-12 rounded-xl shadow-lg max-w-[210mm] mx-auto min-h-[297mm] text-slate-900 font-nepali">
          
          {/* Top Right Form No */}
          <div className="text-right text-xs font-bold mb-4">
             म.ले.प.फारम नं: ४०१
          </div>

          {/* Header */}
          <div className="mb-8">
             <div className="flex items-start justify-between">
                 <div className="w-24 flex justify-start pt-2">
                     <img 
                       src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" 
                       alt="Nepal Emblem" 
                       className="h-24 w-24 object-contain"
                     />
                 </div>
                 
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
                 <h2 className="text-xl font-bold underline underline-offset-4">माग फारम</h2>
             </div>
          </div>

          {/* Locked Type Notification Banner (Inside Print View too for reference, or hide with no-print if desired) */}
          {lockedItemType && !isViewOnly && (
             <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 mb-4 rounded flex items-center justify-center gap-2 no-print">
                 <Layers size={18} />
                 <span className="font-bold">
                     यो फारम केवल "{lockedItemType === 'Expendable' ? 'खर्च हुने' : 'खर्च नहुने'}" सामानहरूको लागि मात्र हो। (Locked to {lockedItemType})
                 </span>
             </div>
          )}

          {/* Meta Data */}
          <div className="flex justify-end mb-4">
             <div className="space-y-1 text-sm font-medium w-64">
                <div className="flex justify-between items-center">
                    <span>आर्थिक वर्ष :</span>
                    <input 
                        value={formDetails.fiscalYear} 
                        readOnly
                        disabled
                        className="border-b border-dotted border-slate-800 w-32 text-center outline-none bg-transparent font-bold cursor-default disabled:opacity-100 disabled:text-slate-900"
                    />
                </div>
                <div className="flex justify-between items-center">
                    <span>माग फारम नं:</span>
                    <input 
                        value={formDetails.formNo} 
                        readOnly
                        disabled
                        className="border-b border-dotted border-slate-800 w-32 text-center outline-none bg-transparent font-bold text-red-600 cursor-default disabled:opacity-100 disabled:text-red-600"
                    />
                </div>
                <div className="flex justify-between items-center">
                    <span>मिति <span className="text-red-500">*</span>:</span>
                    <NepaliDatePicker 
                        value={formDetails.date}
                        onChange={handleDateChange}
                        format="YYYY/MM/DD"
                        label=""
                        hideIcon={true}
                        inputClassName="border-b border-dotted border-slate-800 text-center outline-none bg-transparent font-bold placeholder:text-slate-400 placeholder:font-normal rounded-none px-0 py-0 h-auto focus:ring-0 focus:border-slate-800"
                        wrapperClassName="w-32"
                        disabled={isContentLocked}
                        popupAlign="right"
                        minDate={todayBS}
                        maxDate={todayBS}
                    />
                </div>
             </div>
          </div>

          {/* Table */}
          <div className="mb-8">
            <table className="w-full border-collapse border border-slate-900 text-sm">
                <thead>
                    <tr className="text-center bg-slate-50">
                        <th className="border border-slate-900 p-2 w-12" rowSpan={2}>क्र.सं.</th>
                        <th className="border border-slate-900 p-2 w-72" rowSpan={2}>
                            सामानको नाम <span className="text-red-500">*</span>
                        </th>
                        <th className="border border-slate-900 p-2" rowSpan={2}>स्पेसिफिकेसन</th>
                        <th className="border border-slate-900 p-1" colSpan={2}>माग गरिएको</th>
                        <th className="border border-slate-900 p-2 w-24" rowSpan={2}>कैफियत</th>
                        <th className="border border-slate-900 p-1 w-8 no-print" rowSpan={2}></th>
                    </tr>
                    <tr className="text-center bg-slate-50">
                        <th className="border border-slate-900 p-1 w-20">
                            एकाई <span className="text-red-500">*</span>
                        </th>
                        <th className="border border-slate-900 p-1 w-20">
                            परिमाण <span className="text-red-500">*</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => {
                        const isInventoryItem = inventoryItems.some(inv => inv.itemName === item.name);
                        
                        return (
                        <tr key={item.id}>
                            <td className="border border-slate-900 p-2 text-center">{index + 1}</td>
                            <td className="border border-slate-900 p-1">
                                {isContentLocked ? (
                                    <input 
                                        value={item.name}
                                        readOnly 
                                        className="w-full outline-none bg-transparent p-1 disabled:cursor-not-allowed"
                                        disabled
                                    />
                                ) : (
                                    <SearchableSelect
                                        options={itemOptions}
                                        value={item.name}
                                        onChange={(val) => updateItem(item.id, 'name', val)}
                                        onSelect={(option) => {
                                            const selectedInvItem = inventoryItems.find(i => i.id === option.id);
                                            if (selectedInvItem) {
                                                setItems(prevItems => prevItems.map(row => {
                                                    if (row.id === item.id) {
                                                        return {
                                                            ...row,
                                                            unit: selectedInvItem.unit,
                                                            specification: selectedInvItem.specification || '' // Auto-fill specification
                                                        };
                                                    }
                                                    return row;
                                                }));
                                            }
                                        }}
                                        placeholder="आवश्यक"
                                        className="!border-none !p-0 !bg-transparent text-sm"
                                    />
                                )}
                            </td>
                            <td className="border border-slate-900 p-1">
                                <input 
                                    value={item.specification} 
                                    onChange={e => updateItem(item.id, 'specification', e.target.value)}
                                    className="w-full outline-none bg-transparent p-1 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                                    disabled={isContentLocked || isInventoryItem}
                                />
                            </td>
                            <td className="border border-slate-900 p-1">
                                <input 
                                    value={item.unit} 
                                    onChange={e => updateItem(item.id, 'unit', e.target.value)}
                                    className="w-full outline-none bg-transparent p-1 text-center disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                                    placeholder="आवश्यक"
                                    disabled={isContentLocked || isInventoryItem}
                                />
                            </td>
                            <td className="border border-slate-900 p-1">
                                <input 
                                    value={item.quantity} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (/^\d*$/.test(val)) {
                                            updateItem(item.id, 'quantity', val);
                                        }
                                    }}
                                    className="w-full outline-none bg-transparent p-1 text-center font-bold disabled:cursor-not-allowed"
                                    placeholder="आवश्यक"
                                    type="text"
                                    inputMode="numeric"
                                    disabled={isContentLocked}
                                />
                            </td>
                            <td className="border border-slate-900 p-1">
                                <input 
                                    value={item.remarks} 
                                    onChange={e => updateItem(item.id, 'remarks', e.target.value)}
                                    className="w-full outline-none bg-transparent p-1 disabled:cursor-not-allowed"
                                    disabled={isContentLocked}
                                />
                            </td>
                            <td className="border border-slate-900 p-1 text-center no-print">
                                {!isContentLocked && items.length > 1 && (
                                    <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700">
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </td>
                        </tr>
                    )})}
                </tbody>
            </table>
            {!isContentLocked && (
                <div className="mt-2 no-print">
                    <button 
                        onClick={handleAddItem}
                        className="flex items-center gap-2 text-primary-600 hover:text-primary-700 text-sm font-medium hover:bg-slate-50 px-2 py-1 rounded transition-colors"
                    >
                        <Plus size={16} /> लहर थप्नुहोस् (Add Row)
                    </button>
                </div>
            )}
          </div>

          {/* Footer Grid */}
          <div className="grid grid-cols-3 gap-8 text-sm">
             {/* Column 1 */}
             <div className="space-y-8">
                 <div>
                     <h4 className="font-bold mb-2">माग गर्नेको</h4>
                     <div className="space-y-1">
                         <div className="flex items-center gap-2">
                             <span className="w-10">नाम</span>
                             <span>: <input disabled={true} value={formDetails.demandBy.name} onChange={e => setFormDetails({...formDetails, demandBy: {...formDetails.demandBy, name: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none w-32 bg-transparent disabled:cursor-not-allowed"/></span>
                         </div>
                         <div className="flex items-center gap-2">
                             <span className="w-10">पद</span>
                             <span>: <input disabled={true} value={formDetails.demandBy.designation} onChange={e => setFormDetails({...formDetails, demandBy: {...formDetails.demandBy, designation: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none w-32 bg-transparent disabled:cursor-not-allowed"/></span>
                         </div>
                         <div className="flex items-center gap-2">
                             <span className="w-10">मिति</span>
                             <span>: <input disabled={true} value={formDetails.demandBy.date} onChange={e => setFormDetails({...formDetails, demandBy: {...formDetails.demandBy, date: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none w-32 bg-transparent text-xs disabled:cursor-not-allowed"/></span>
                         </div>
                         <div className="flex items-center gap-2">
                             <span className="w-10">प्रयोजन <span className="text-red-500">*</span></span>
                             <span>: <input disabled={isContentLocked} value={formDetails.demandBy.purpose} onChange={e => setFormDetails({...formDetails, demandBy: {...formDetails.demandBy, purpose: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none w-32 bg-transparent disabled:cursor-not-allowed"/></span>
                         </div>
                     </div>
                 </div>

                 <div className="pt-4">
                     <h4 className="font-bold mb-2">मालसामान बुझिलिनेको</h4>
                     <div className="space-y-1">
                         <div className="flex items-center gap-2">
                             <span className="w-10">नाम</span>
                             <span>: <input disabled={true} value={formDetails.receiver.name} onChange={e => setFormDetails({...formDetails, receiver: {...formDetails.receiver, name: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none w-32 bg-transparent disabled:cursor-not-allowed"/></span>
                         </div>
                         <div className="flex items-center gap-2">
                             <span className="w-10">पद</span>
                             <span>: <input disabled={true} value={formDetails.receiver.designation} onChange={e => setFormDetails({...formDetails, receiver: {...formDetails.receiver, designation: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none w-32 bg-transparent disabled:cursor-not-allowed"/></span>
                         </div>
                         <div className="flex items-center gap-2">
                             <span className="w-10">मिति</span>
                             <span>: <input disabled={true} value={formDetails.receiver.date} onChange={e => setFormDetails({...formDetails, receiver: {...formDetails.receiver, date: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none w-32 bg-transparent text-xs disabled:cursor-not-allowed"/></span>
                         </div>
                     </div>
                 </div>
             </div>

             {/* Column 2 */}
             <div className="space-y-8">
                <div>
                     <h4 className="font-bold mb-2">सिफारिस गर्ने:.......</h4>
                     <div className="space-y-1">
                         <div className="flex items-center gap-2">
                             <span className="w-10">नाम</span>
                             <span>: <input disabled={true} value={formDetails.recommendedBy.name} onChange={e => setFormDetails({...formDetails, recommendedBy: {...formDetails.recommendedBy, name: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none w-32 bg-transparent disabled:cursor-not-allowed"/></span>
                         </div>
                         <div className="flex items-center gap-2">
                             <span className="w-10">पद</span>
                             <span>: <input disabled={true} value={formDetails.recommendedBy.designation} onChange={e => setFormDetails({...formDetails, recommendedBy: {...formDetails.recommendedBy, designation: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none w-32 bg-transparent disabled:cursor-not-allowed"/></span>
                         </div>
                         <div className="flex items-center gap-2">
                             <span className="w-10">मिति</span>
                             <span>: <input disabled={true} value={formDetails.recommendedBy.date} onChange={e => setFormDetails({...formDetails, recommendedBy: {...formDetails.recommendedBy, date: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none w-32 bg-transparent text-xs disabled:cursor-not-allowed"/></span>
                         </div>
                     </div>
                 </div>

                 <div className="pt-4">
                     <h4 className="font-bold mb-2">खर्च निकासा खातामा चढाउने: .......</h4>
                     <div className="space-y-1">
                         <div className="flex items-center gap-2">
                             <span className="w-10">नाम</span>
                             <span>: <input disabled={true} value={formDetails.ledgerEntry.name} onChange={e => setFormDetails({...formDetails, ledgerEntry: {...formDetails.ledgerEntry, name: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none w-32 bg-transparent disabled:cursor-not-allowed"/></span>
                         </div>
                         <div className="flex items-center gap-2">
                             <span className="w-10">पद</span>
                             <span>: <input disabled={true} className="border-b border-dotted border-slate-400 outline-none w-32 bg-transparent disabled:cursor-not-allowed"/></span>
                         </div>
                         <div className="flex items-center gap-2">
                             <span className="w-10">मिति</span>
                             <span>: <input disabled={true} value={formDetails.ledgerEntry.date} onChange={e => setFormDetails({...formDetails, ledgerEntry: {...formDetails.ledgerEntry, date: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none w-32 bg-transparent text-xs disabled:cursor-not-allowed"/></span>
                         </div>
                     </div>
                 </div>
             </div>

             {/* Column 3 */}
             <div className="space-y-8">
                 <div className={`
                    ${(isStoreKeeper && !formDetails.storeKeeper.status && !isViewOnly) ? 'animate-pulse ring-2 ring-orange-200 rounded p-2 -m-2' : ''}
                 `}>
                     <h4 className="font-bold mb-2">स्टोरकिपरले भर्ने</h4>
                     <div className="space-y-2 mb-4">
                         <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors">
                             <input 
                                type="checkbox" 
                                checked={formDetails.storeKeeper.status.split(',').includes('market')}
                                onChange={() => handleStoreKeeperStatusChange('market')}
                                disabled={isContentLocked || !isStoreKeeper || !editingId}
                                className="w-5 h-5 rounded border-slate-400 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed cursor-pointer"
                             />
                             <span>क) बजारबाट खरिद गर्नुपर्ने</span>
                         </label>
                         <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors">
                             <input 
                                type="checkbox" 
                                checked={formDetails.storeKeeper.status.split(',').includes('stock')}
                                onChange={() => handleStoreKeeperStatusChange('stock')}
                                disabled={isContentLocked || !isStoreKeeper || !editingId}
                                className="w-5 h-5 rounded border-slate-400 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed cursor-pointer"
                             />
                             <span>ख) मौज्दातमा रहेको</span>
                         </label>
                     </div>
                     <div className="space-y-1">
                         <div className="flex items-center gap-2">
                             <span>स्टोरकिपरको दस्तखत: .......</span>
                         </div>
                         <div className="flex items-center gap-2">
                             <span className="w-10">नाम:</span>
                             <span>: <input disabled={true} value={formDetails.storeKeeper.name} onChange={e => setFormDetails({...formDetails, storeKeeper: {...formDetails.storeKeeper, name: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none w-32 bg-transparent disabled:cursor-not-allowed"/></span>
                         </div>
                     </div>
                 </div>

                 <div className="pt-4">
                     <h4 className="font-bold mb-2">स्वीकृत गर्ने: .......</h4>
                     <div className="space-y-1">
                         <div className="flex items-center gap-2">
                             <span className="w-10">नाम</span>
                             <span>: <input 
                                disabled={true} 
                                value={isViewOnly && formDetails.status === 'Rejected' ? 'Rejected' : formDetails.approvedBy.name} 
                                onChange={e => setFormDetails({...formDetails, approvedBy: {...formDetails.approvedBy, name: e.target.value}})} 
                                className={`border-b border-dotted border-slate-400 outline-none w-32 bg-transparent disabled:cursor-not-allowed
                                ${isViewOnly && formDetails.status === 'Rejected' ? 'font-bold text-red-600' : ''}
                                `}/></span>
                         </div>
                         <div className="flex items-center gap-2">
                             <span className="w-10">पद</span>
                             <span>: <input disabled={true} value={formDetails.approvedBy.designation} onChange={e => setFormDetails({...formDetails, approvedBy: {...formDetails.approvedBy, designation: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent" disabled={!isApprover || isViewOnly}/>
                         </div>
                         <div className="flex items-center gap-2">
                             <span className="w-10">मिति</span>
                             <span>: <input disabled={true} value={formDetails.approvedBy.date} onChange={e => setFormDetails({...formDetails, approvedBy: {...formDetails.approvedBy, date: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent text-xs" disabled={!isApprover || isViewOnly}/>
                         </div>
                     </div>
                 </div>
             </div>
          </div>

       </div>

       {/* User's Submitted Forms Status Section (Bottom) */}
       {mySubmittedForms.length > 0 && (
          <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden no-print mt-6">
              <div className="bg-blue-50 px-6 py-3 border-b border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-800">
                      <FileText size={18} />
                      <h3 className="font-bold font-nepali">तपाईंले पेश गरेको माग फारम स्थिति (Your Submitted Mag Faram Status)</h3>
                  </div>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600 font-medium">
                          <tr>
                              <th className="px-6 py-3">Form No</th>
                              <th className="px-6 py-3">Date</th>
                              <th className="px-6 py-3">Purpose / Verified By</th>
                              <th className="px-6 py-3">Items</th>
                              <th className="px-6 py-3">Current Status</th>
                              <th className="px-6 py-3 text-right">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {mySubmittedForms.map(form => (
                              <tr key={form.id} className="hover:bg-slate-50">
                                  <td className="px-6 py-3 font-mono font-medium text-slate-700">{form.formNo}</td>
                                  <td className="px-6 py-3 font-nepali">{form.date}</td>
                                  <td className="px-6 py-3 text-slate-600 truncate max-w-[200px]">
                                    {isStoreKeeper ? (
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-800">{form.demandBy?.name || '-'}</span>
                                            <span className="text-xs text-slate-500">प्रयोजन: {form.demandBy?.purpose}</span>
                                        </div>
                                    ) : (
                                        form.demandBy?.purpose
                                    )}
                                  </td>
                                  <td className="px-6 py-3 text-slate-600">
                                      {form.items.length} items
                                  </td>
                                  <td className="px-6 py-3">
                                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border
                                          ${form.status === 'Approved' ? 'bg-green-100 text-green-700 border-green-200' :
                                            form.status === 'Verified' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                            form.status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                                            'bg-orange-100 text-orange-700 border-orange-200'
                                          }
                                      `}>
                                          {form.status === 'Approved' ? <CheckCircle2 size={12}/> : 
                                           form.status === 'Verified' ? <ShieldCheck size={12}/> : 
                                           form.status === 'Rejected' ? <X size={12}/> : <Clock size={12}/>}
                                          {form.status === 'Verified' ? 'Verified (Pending Approval)' : 
                                           form.status === 'Pending' ? 'Pending Verification' : 
                                           form.status === 'Rejected' ? 'अस्वीकृत (Rejected)' : 
                                           form.status}
                                      </span>
                                      {/* ADD REASON DISPLAY BELOW STATUS */}
                                      {form.status === 'Rejected' && form.rejectionReason && (
                                          <div className="mt-1 text-xs text-red-600 bg-red-50 p-1 rounded border border-red-100 font-medium">
                                              <strong>कारण (Reason):</strong> {form.rejectionReason}
                                          </div>
                                      )}
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                      <button 
                                        onClick={() => handleLoadRequest(form, true)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-md text-xs font-bold transition-colors border border-slate-300"
                                      >
                                         <Eye size={14} /> Preview
                                      </button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
       )}

       {/* Reject Confirmation Modal */}
       {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowRejectModal(false)}></div>
              
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-red-50/50">
                      <div className="flex items-center gap-3">
                          <div className="bg-red-100 p-2 rounded-lg text-red-600">
                              <X size={20} />
                          </div>
                          <div>
                              <h3 className="font-bold text-slate-800 text-lg font-nepali">फारम अस्वीकृत गर्नुहोस् (Reject Form)</h3>
                              <p className="text-xs text-slate-500">कृपया अस्वीकृतिको कारण उल्लेख गर्नुहोस्।</p>
                          </div>
                      </div>
                      <button onClick={() => setShowRejectModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                          <X size={20} />
                      </button>
                  </div>

                  <div className="p-6 space-y-4">
                      <label htmlFor="rejection-reason" className="block text-sm font-medium text-slate-700">अस्वीकृतिको कारण <span className="text-red-500">*</span></label>
                      <textarea
                          id="rejection-reason"
                          value={rejectionReasonInput}
                          onChange={(e) => setRejectionReasonInput(e.target.value)}
                          rows={4}
                          className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 resize-y"
                          placeholder="यो फारम किन अस्वीकृत गरिँदैछ, कृपया स्पष्ट कारण लेख्नुहोस्।"
                          required
                      ></textarea>
                      {validationError && <p className="text-xs text-red-500 font-medium">{validationError}</p>}
                  </div>

                  <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 shrink-0">
                      <button 
                          onClick={() => setShowRejectModal(false)}
                          className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                      >
                          रद्द गर्नुहोस् (Cancel)
                      </button>
                      <button 
                          onClick={handleRejectSubmit}
                          className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium shadow-sm transition-colors"
                      >
                          <X size={16} /> अस्वीकृत गर्नुहोस् (Reject)
                      </button>
                  </div>
              </div>
          </div>
       )}

       {/* Store & Item Type Verification Modal */}
       {showVerificationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowVerificationModal(false)}></div>
              
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-blue-50/50">
                      <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                              <StoreIcon size={20} />
                          </div>
                          <div>
                              <h3 className="font-bold text-slate-800 text-lg font-nepali">स्टक विवरण (Stock Details)</h3>
                              <p className="text-xs text-slate-500">कृपया स्टोर र सामानको प्रकार छान्नुहोस्।</p>
                          </div>
                      </div>
                      <button onClick={() => setShowVerificationModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                          <X size={20} />
                      </button>
                  </div>

                  <div className="p-6 space-y-4">
                      {/* Store Selection */}
                      <Select 
                          label="स्टोर छान्नुहोस् (Select Store) *"
                          options={storeOptions}
                          value={verificationData.storeId}
                          onChange={e => setVerificationData({...verificationData, storeId: e.target.value})}
                          required
                          icon={<StoreIcon size={16} />}
                          className="font-medium"
                      />

                      {/* Item Type Selection */}
                      <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                              सामानको प्रकार (Item Type) *
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                              <label className={`
                                  border rounded-lg p-3 flex flex-col items-center gap-2 cursor-pointer transition-all
                                  ${verificationData.itemType === 'Expendable' ? 'border-orange-500 bg-orange-50 text-orange-700 ring-1 ring-orange-500' : 'border-slate-200 hover:bg-slate-50'}
                              `}>
                                  <input 
                                      type="radio" 
                                      name="itemType" 
                                      value="Expendable" 
                                      checked={verificationData.itemType === 'Expendable'} 
                                      onChange={e => setVerificationData({...verificationData, itemType: e.target.value})}
                                      className="sr-only"
                                  />
                                  <Layers size={24} className={verificationData.itemType === 'Expendable' ? 'text-orange-600' : 'text-slate-300'} />
                                  <span className="font-medium text-xs text-center font-nepali">खर्च हुने<br/>(Expendable)</span>
                              </label>

                              <label className={`
                                  border rounded-lg p-3 flex flex-col items-center gap-2 cursor-pointer transition-all
                                  ${verificationData.itemType === 'Non-Expendable' ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500' : 'border-slate-200 hover:bg-slate-50'}
                              `}>
                                  <input 
                                      type="radio" 
                                      name="itemType" 
                                      value="Non-Expendable" 
                                      checked={verificationData.itemType === 'Non-Expendable'} 
                                      onChange={e => setVerificationData({...verificationData, itemType: e.target.value})}
                                      className="sr-only"
                                  />
                                  <ShieldCheck size={24} className={verificationData.itemType === 'Non-Expendable' ? 'text-blue-600' : 'text-slate-300'} />
                                  <span className="font-medium text-xs text-center font-nepali">खर्च नहुने<br/>(Non-Expendable)</span>
                              </label>
                          </div>
                      </div>

                      {validationError && <p className="text-xs text-red-500 font-medium">{validationError}</p>}
                  </div>

                  <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 shrink-0">
                      <button 
                          onClick={() => setShowVerificationModal(false)}
                          className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                      >
                          रद्द गर्नुहोस् (Cancel)
                      </button>
                      <button 
                          onClick={confirmVerification}
                          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium shadow-sm transition-colors"
                      >
                          <CheckCircle2 size={16} /> निश्चित गर्नुहोस् (Confirm)
                      </button>
                  </div>
              </div>
          </div>
       )}

       {/* Stock Availability Warning Modal */}
       {showStockWarningModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowStockWarningModal(false)}></div>
              
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                  <div className="px-6 py-4 border-b border-orange-100 flex justify-between items-center bg-orange-50/80">
                      <div className="flex items-center gap-3">
                          <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                              <AlertTriangle size={20} />
                          </div>
                          <div>
                              <h3 className="font-bold text-slate-800 text-lg font-nepali">मौज्दात उपलब्ध छ (Stock Available)</h3>
                          </div>
                      </div>
                      <button onClick={() => setShowStockWarningModal(false)} className="p-2 hover:bg-orange-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                          <X size={20} />
                      </button>
                  </div>

                  <div className="p-6 space-y-4">
                      <p className="text-slate-700 font-medium font-nepali">
                          माग भएको निम्न सामान मौज्दातमा पुरा मात्रामा छ, के तपाइँ अझै खरिद गर्न चाहनुहुन्छ?
                          <br/>
                          <span className="text-xs text-slate-500 font-sans mt-1 block">
                              (The requested items below are available in stock. Do you still want to proceed with purchase?)
                          </span>
                      </p>
                      
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
                          <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                              {stockWarningItems.map((item, index) => (
                                  <li key={index} className="font-medium text-orange-700">{item}</li>
                              ))}
                          </ul>
                      </div>
                  </div>

                  <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 shrink-0">
                      <button 
                          onClick={() => setShowStockWarningModal(false)}
                          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium shadow-sm transition-colors"
                      >
                          हुँदैन (No - Cancel)
                      </button>
                      <button 
                          onClick={handleConfirmPurchase}
                          className="px-6 py-2 bg-orange-600 text-white hover:bg-orange-700 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
                      >
                          <CheckCircle2 size={16} /> हुन्छ (Yes - Proceed)
                      </button>
                  </div>
              </div>
          </div>
       )}

    </div>
  );
};
