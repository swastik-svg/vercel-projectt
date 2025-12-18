
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Package, Calendar, Plus, RotateCcw, Save, X, CheckCircle2, Search, 
  ArrowUpCircle, ArrowDownCircle, Warehouse, DollarSign, Tag, ClipboardList, Barcode,
  Hash, BookOpen, Layers, ScrollText, Store as StoreIcon, User, FileText, Filter, PieChart, Send, Info, Edit, Calculator, SlidersHorizontal, BarChart4
} from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';
import { NepaliDatePicker } from './NepaliDatePicker';
import { EnglishDatePicker } from './EnglishDatePicker'; 
import { InventoryItem, Option, Store, StockEntryRequest, User as UserType, PurchaseOrderEntry } from '../types';
import { SearchableSelect } from './SearchableSelect'; 
import { AddOptionModal } from './AddOptionModal'; 
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface JinshiMaujdatProps {
  currentFiscalYear: string;
  currentUser: UserType; 
  inventoryItems: InventoryItem[];
  onAddInventoryItem: (item: InventoryItem) => void;
  onUpdateInventoryItem: (item: InventoryItem) => void;
  onRequestStockEntry: (request: StockEntryRequest) => void; 
  stores: Store[];
  pendingPoDakhila?: PurchaseOrderEntry | null; 
  onClearPendingPoDakhila?: () => void; 
}

// Helper to get local date string YYYY-MM-DD
const getTodayDateAd = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to calculate total amount
const calculateTotalAmount = (quantity: string, rate: string, tax: string): number => {
  const qty = parseFloat(quantity) || 0;
  const rt = parseFloat(rate) || 0;
  const tx = parseFloat(tax) || 0;
  return qty * rt * (1 + tx / 100);
};

// Common options for item types
const itemTypeOptions: Option[] = [
  { id: 'expendable', value: 'Expendable', label: 'खर्च हुने (Expendable)' },
  { id: 'nonExpendable', value: 'Non-Expendable', label: 'खर्च नहुने (Non-Expendable)' },
];

// Initial common options for item classification
const initialItemClassificationOptions: Option[] = [
  { id: 'medicine', value: 'Medicine', label: 'औषधि (Medicine)' },
  { id: 'surgical', value: 'Surgical', label: 'सर्जिकल (Surgical)' }, 
  { id: 'equipment', value: 'Equipment', label: 'उपकरण (Equipment)' },
  { id: 'consumable', value: 'Consumable', label: 'उपभोग्य सामान (Consumable)' },
  { id: 'officeSupply', value: 'Office Supply', label: 'कार्यालय सामग्री (Office Supply)' },
  { id: 'furniture', value: 'Furniture', label: 'फर्निचर (Furniture)' }, 
  { id: 'other', value: 'Other', label: 'अन्य (Other)' },
];

// Initial common options for receipt source
const initialReceiptSourceOptions: Option[] = [
  { id: 'purchase', value: 'Purchase', label: 'खरिद (Purchase)' },
  { id: 'donation', value: 'Donation', label: 'दान (Donation)' },
  { id: 'return', value: 'Return', label: 'फिर्ता (Return)' },
  { id: 'other', value: 'Other', label: 'अन्य (Other)' },
];

// --- HELPER COMPONENTS ---

interface EditInventoryItemModalProps {
    isOpen: boolean;
    item: InventoryItem;
    onClose: () => void;
    onSave: (updatedItem: InventoryItem) => void;
    storeOptions: Option[];
    itemClassificationOptions: Option[];
}

const EditInventoryItemModal: React.FC<EditInventoryItemModalProps> = ({
    isOpen,
    item,
    onClose,
    onSave,
    storeOptions,
    itemClassificationOptions
}) => {
    const [formData, setFormData] = useState<InventoryItem>(item);

    useEffect(() => {
        setFormData(item);
    }, [item]);

    const handleChange = (field: keyof InventoryItem, value: string | number) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };
            
            // Auto recalc total if rate/qty changes
            if (['currentQuantity', 'rate', 'tax'].includes(field as string)) {
                const qty = parseFloat((updated.currentQuantity || 0).toString());
                const rt = parseFloat((updated.rate || 0).toString());
                const tx = parseFloat((updated.tax || 0).toString());
                updated.totalAmount = calculateTotalAmount(qty.toString(), rt.toString(), tx.toString());
            }
            return updated;
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                            <Edit size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg font-nepali">विवरण सच्याउनुहोस् (Edit Inventory Details)</h3>
                            <p className="text-xs text-slate-500">ID: {item.id}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="सामानको नाम (Item Name)" value={formData.itemName} onChange={e => handleChange('itemName', e.target.value)} />
                        <Select label="गोदाम/स्टोर (Store)" options={storeOptions} value={formData.storeId} onChange={e => handleChange('storeId', e.target.value)} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="युनिक कोड (Unique Code)" value={formData.uniqueCode || ''} onChange={e => handleChange('uniqueCode', e.target.value)} />
                        <Input label="सङ्केत नं (Sanket No)" value={formData.sanketNo || ''} onChange={e => handleChange('sanketNo', e.target.value)} />
                    </div>

                    {/* Item Type & Class */}
                    <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div>
                            <label className="text-sm font-medium text-slate-700 block mb-2">सामानको प्रकार (Type)</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="editType" value="Expendable" checked={formData.itemType === 'Expendable'} onChange={() => handleChange('itemType', 'Expendable')} className="text-orange-600 focus:ring-orange-500"/>
                                    <span className="text-sm">खर्च हुने</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="editType" value="Non-Expendable" checked={formData.itemType === 'Non-Expendable'} onChange={() => handleChange('itemType', 'Non-Expendable')} className="text-blue-600 focus:ring-blue-500"/>
                                    <span className="text-sm">खर्च नहुने</span>
                                </label>
                            </div>
                        </div>
                        <Select label="वर्गीकरण (Class)" options={itemClassificationOptions} value={formData.itemClassification || ''} onChange={e => handleChange('itemClassification', e.target.value)} />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <Input label="एकाई (Unit)" value={formData.unit} onChange={e => handleChange('unit', e.target.value)} />
                        <Input label="परिमाण (Qty)" type="number" value={formData.currentQuantity} onChange={e => handleChange('currentQuantity', e.target.value)} />
                        <Input label="दर (Rate)" type="number" value={formData.rate || ''} onChange={e => handleChange('rate', e.target.value)} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="म्याद सकिने मिति (Expiry AD)" type="date" value={formData.expiryDateAd || ''} onChange={e => handleChange('expiryDateAd', e.target.value)} />
                        <Input label="ब्याच नं (Batch No)" value={formData.batchNo || ''} onChange={e => handleChange('batchNo', e.target.value)} />
                    </div>
                    
                    <div className="grid grid-cols-1">
                         <Input label="कैफियत (Remarks)" value={formData.remarks || ''} onChange={e => handleChange('remarks', e.target.value)} />
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                    <button onClick={() => onSave(formData)} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium shadow-sm">
                        <Save size={16} /> Update Details
                    </button>
                </div>
            </div>
        </div>
    );
};

interface BulkInventoryEntryModalProps {
  onClose: () => void;
  onSave: (
      items: InventoryItem[], 
      commonReceiptSource: string, 
      commonDateBs: string, 
      commonDateAd: string, 
      commonStoreId: string, 
      commonSupplier: string, 
      commonRefNo: string,    
      mode: 'opening' | 'add'
  ) => void;
  inventoryItems: InventoryItem[];
  currentFiscalYear: string;
  mode: 'opening' | 'add'; 
  receiptSourceOptions: Option[];
  storeOptions: Option[]; 
  itemClassificationOptions: Option[]; 
  onAddClassification: (newClassification: string) => void; 
  onAddReceiptSource: (newSource: string) => void; 
  initialData?: PurchaseOrderEntry | null; 
}

const BulkInventoryEntryModal: React.FC<BulkInventoryEntryModalProps> = ({ 
    onClose, 
    onSave, 
    inventoryItems,
    currentFiscalYear,
    mode, 
    receiptSourceOptions,
    storeOptions, 
    itemClassificationOptions, 
    onAddClassification, 
    onAddReceiptSource, 
    initialData 
}) => {
    const initialStoreId = storeOptions && storeOptions.length > 0 ? storeOptions[0].value : '';

    const initialDakhilaNo = useMemo(() => {
        if (mode !== 'add') return '';
        const fyClean = currentFiscalYear.replace('/', '');
        const maxNum = inventoryItems
            .filter(item => item.dakhilaNo && String(item.dakhilaNo).startsWith(`D-${fyClean}-`))
            .map(item => {
                const parts = String(item.dakhilaNo).split('-');
                return parts.length > 2 ? parseInt(parts[2]) : 0;
            })
            .reduce((max, current) => Math.max(max, current), 0);
        
        return `D-${fyClean}-${String(maxNum + 1).padStart(3, '0')}`;
    }, [currentFiscalYear, inventoryItems, mode]);

    const [commonDetails, setCommonDetails] = useState({
        receiptSource: mode === 'opening' ? 'Opening' : '',
        dateBs: '',
        dateAd: getTodayDateAd(),
        storeId: initialStoreId,
        supplier: '', 
        refNo: '',    
        dakhilaNo: initialDakhilaNo, 
    });
    
    const createEmptyBulkItem = useCallback((currentMode: 'opening' | 'add', storeIdForNewItem: string): InventoryItem => {
        return {
            id: `TEMP-${Date.now()}-${Math.random().toString(36).substring(7)}`, 
            itemName: '',
            uniqueCode: '',
            sanketNo: '',
            ledgerPageNo: '',
            dakhilaNo: '', 
            itemType: '' as 'Expendable' | 'Non-Expendable',
            itemClassification: '',
            specification: '', 
            unit: '',
            currentQuantity: 0,
            totalAmount: 0,
            batchNo: '',
            expiryDateAd: '',
            expiryDateBs: '',
            lastUpdateDateAd: '', 
            lastUpdateDateBs: '', 
            fiscalYear: '', 
            receiptSource: '', 
            remarks: '',
            storeId: storeIdForNewItem, 
        };
    }, []);

    const [bulkItems, setBulkItems] = useState<InventoryItem[]>(() => [createEmptyBulkItem(mode, initialStoreId)]);
    
    const todayBs = useMemo(() => {
        try {
            return new NepaliDate().format('YYYY-MM-DD');
        } catch (e) {
            return '';
        }
    }, []);

    useEffect(() => {
        if (initialData) {
            setCommonDetails(prev => ({
                ...prev,
                receiptSource: 'Purchase', 
                supplier: initialData.vendorDetails?.name || '',
                refNo: initialData.orderNo || `PO-${initialData.magFormNo}`,
                dakhilaNo: initialDakhilaNo 
            }));

            const itemsFromPo = initialData.items.map((poItem: any) => {
                const newItem = createEmptyBulkItem(mode, initialStoreId);
                return {
                    ...newItem,
                    itemName: poItem.name,
                    specification: poItem.specification || '',
                    unit: poItem.unit,
                    currentQuantity: parseFloat(poItem.quantity) || 0,
                    rate: parseFloat(poItem.rate) || 0, 
                    totalAmount: (parseFloat(poItem.quantity) || 0) * (parseFloat(poItem.rate) || 0)
                };
            });
            
            if (itemsFromPo.length > 0) {
                setBulkItems(itemsFromPo);
            }
        }
    }, [initialData, createEmptyBulkItem, mode, initialStoreId, initialDakhilaNo]);

    const [validationError, setValidationError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showAddClassificationModal, setShowAddClassificationModal] = useState(false); 
    const [showAddSourceModal, setShowAddSourceModal] = useState(false); 

    const masterType = bulkItems.length > 0 ? bulkItems[0].itemType : '';

    const allInventoryItemOptions: Option[] = useMemo(() => {
        return inventoryItems.map(item => ({
            id: item.id,
            value: item.itemName, 
            label: `${item.itemName} (${item.unit}) - ${item.uniqueCode || item.sanketNo || ''}`,
            itemData: item 
        }));
    }, [inventoryItems]);

    const filteredInventoryItemOptions: Option[] = useMemo(() => {
        if (!masterType) return allInventoryItemOptions;

        return inventoryItems
            .filter(item => item.itemType === masterType) 
            .map(item => ({
                id: item.id,
                value: item.itemName,
                label: `${item.itemName} (${item.unit}) - ${item.uniqueCode || item.sanketNo || ''}`,
                itemData: item
            }));
    }, [inventoryItems, masterType, allInventoryItemOptions]);


    const generateNewSequentialCode = useCallback((
        prefix: string, 
        currentFy: string, 
        committedItems: InventoryItem[], 
        draftItems: InventoryItem[],     
        key: 'uniqueCode' | 'sanketNo'
    ): string => {
        const fyClean = currentFy.replace('/', '');
        const allRelevantItems = [...committedItems, ...draftItems];

        const relevantCodes = allRelevantItems
            .filter(item => item[key] && String(item[key]).startsWith(`${prefix}-${fyClean}-`))
            .map(item => {
                const code = String(item[key]);
                const parts = code.split('-');
                return parts.length > 2 ? parseInt(parts[2]) : 0;
            })
            .filter(num => !isNaN(num)); 

        const maxNum = relevantCodes.length > 0 ? Math.max(...relevantCodes) : 0;
        return `${prefix}-${fyClean}-${String(maxNum + 1).padStart(3, '0')}`;
    }, [currentFiscalYear]);


    const handleAddRow = () => {
        const masterType = bulkItems.length > 0 ? bulkItems[0].itemType : '';
        const newItem = createEmptyBulkItem(mode, commonDetails.storeId);
        
        if (masterType) {
            newItem.itemType = masterType;
        }
        
        setBulkItems(prev => [...prev, newItem]);
    };

    const handleRemoveRow = (id: string) => {
        setBulkItems(prev => prev.filter(item => item.id !== id));
        if (bulkItems.length === 1) { 
            setBulkItems([createEmptyBulkItem(mode, commonDetails.storeId)]); 
        }
    };

    const handleItemFieldChange = (itemId: string, field: keyof InventoryItem, value: string | number) => {
        setBulkItems(prev => {
            const isFirstRow = prev.length > 0 && prev[0].id === itemId;
            
            return prev.map(item => {
                if (item.id === itemId) {
                    const updatedItem = { ...item, [field]: value };

                    if (['currentQuantity', 'rate', 'tax'].includes(field as string)) {
                        const qty = parseFloat((updatedItem.currentQuantity || 0).toString());
                        const rt = parseFloat((updatedItem.rate || 0).toString());
                        const tx = parseFloat((updatedItem.tax || 0).toString());
                        updatedItem.totalAmount = calculateTotalAmount(qty.toString(), rt.toString(), tx.toString());
                    }
                    return updatedItem;
                }
                
                if (isFirstRow && field === 'itemType') {
                    return { ...item, itemType: value as any };
                }
                
                return item;
            });
        });
    };

    const handleItemSelect = (itemId: string, option: Option) => {
        const selectedInvItem = option.itemData as InventoryItem;
        if (!selectedInvItem) return;

        setBulkItems(prev => {
            const masterType = prev.length > 0 ? prev[0].itemType : '';
            const isFirstRow = prev.length > 0 && prev[0].id === itemId;

            return prev.map(row => {
                if (row.id === itemId) {
                    const updatedItem = {
                        ...row,
                        itemName: selectedInvItem.itemName,
                        uniqueCode: selectedInvItem.uniqueCode || '',
                        sanketNo: selectedInvItem.sanketNo || '',
                        ledgerPageNo: selectedInvItem.ledgerPageNo || '',
                        unit: selectedInvItem.unit,
                        itemType: selectedInvItem.itemType,
                        itemClassification: selectedInvItem.itemClassification || '',
                        specification: selectedInvItem.specification || '',
                        currentQuantity: row.currentQuantity,
                        rate: row.rate,
                        tax: row.tax
                    };

                    if (!isFirstRow && masterType && updatedItem.itemType !== masterType) {
                        updatedItem.itemType = masterType;
                    }

                    const qty = parseFloat((updatedItem.currentQuantity || 0).toString());
                    const rt = parseFloat((updatedItem.rate || 0).toString());
                    const tx = parseFloat((updatedItem.tax || 0).toString());
                    updatedItem.totalAmount = calculateTotalAmount(qty.toString(), rt.toString(), tx.toString());

                    return updatedItem;
                }
                return row;
            });
        });
    };

    const handleItemNameChange = (itemId: string, newName: string) => {
        setBulkItems(prev => {
            const masterType = prev.length > 0 ? prev[0].itemType : '';
            const isFirstRow = prev.length > 0 && prev[0].id === itemId;

            return prev.map(item => {
            if (item.id === itemId) {
                let updatedItem = { ...item, itemName: newName };

                let existing = inventoryItems.find(i => 
                    i.itemName.toLowerCase() === newName.toLowerCase() && i.storeId === commonDetails.storeId
                );

                if (!existing) {
                     existing = inventoryItems.find(i => i.itemName.toLowerCase() === newName.toLowerCase());
                }

                const otherDraftItems = prev.filter(i => i.id !== itemId);

                if (existing) {
                    updatedItem.uniqueCode = existing.uniqueCode || '';
                    updatedItem.sanketNo = existing.sanketNo || '';
                    updatedItem.ledgerPageNo = existing.ledgerPageNo || '';
                    
                    if (!isFirstRow && masterType) {
                        updatedItem.itemType = masterType; 
                    } else {
                        updatedItem.itemType = existing.itemType; 
                    }
                    
                    updatedItem.itemClassification = existing.itemClassification || '';
                    updatedItem.specification = existing.specification || ''; 
                    updatedItem.unit = existing.unit;
                    
                    if (existing.storeId === commonDetails.storeId) {
                        updatedItem.batchNo = existing.batchNo || '';
                        updatedItem.expiryDateAd = existing.expiryDateAd || '';
                        updatedItem.expiryDateBs = existing.expiryDateBs || '';
                    } else {
                        updatedItem.batchNo = '';
                        updatedItem.expiryDateAd = '';
                        updatedItem.expiryDateBs = '';
                    }
                    
                    updatedItem.remarks = ''; 
                } else if (newName.trim() !== '') {
                    if (!updatedItem.uniqueCode || !inventoryItems.some(i => i.uniqueCode === updatedItem.uniqueCode)) {
                        updatedItem.uniqueCode = generateNewSequentialCode('UC', currentFiscalYear, inventoryItems, otherDraftItems, 'uniqueCode');
                    }
                    
                    updatedItem.unit = '';
                    
                    if (!isFirstRow && masterType) {
                        updatedItem.itemType = masterType;
                    } else {
                        updatedItem.itemType = '' as 'Expendable' | 'Non-Expendable';
                    }
                    
                    updatedItem.itemClassification = '';
                    updatedItem.specification = '';
                    updatedItem.ledgerPageNo = '';
                    updatedItem.rate = undefined;
                    updatedItem.tax = undefined;
                    updatedItem.batchNo = '';
                    updatedItem.expiryDateBs = '';
                    updatedItem.expiryDateAd = '';
                    updatedItem.remarks = '';

                } else {
                    const originalId = item.id;
                    updatedItem = createEmptyBulkItem(mode, commonDetails.storeId);
                    updatedItem.id = originalId;
                    if (!isFirstRow && masterType) {
                        updatedItem.itemType = masterType;
                    }
                }
                
                const qty = parseFloat((updatedItem.currentQuantity || 0).toString());
                const rt = parseFloat((updatedItem.rate || 0).toString());
                const tx = parseFloat((updatedItem.tax || 0).toString());
                updatedItem.totalAmount = calculateTotalAmount(qty.toString(), rt.toString(), tx.toString());

                return updatedItem;
            }
            return item;
        })});
    };

    const handleCommonDetailsChange = (field: keyof typeof commonDetails, value: string) => {
        setCommonDetails(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveBulk = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);
        setIsSaving(true);

        const dateBs = commonDetails.dateBs.trim();

        if (mode === 'add') {
            let maxDakhilaNum = 0;
            let previousDakhilaDate = '';
            let previousDakhilaNo = '';

            const fyClean = currentFiscalYear.replace('/', '');
            
            inventoryItems.forEach(item => {
                if (item.dakhilaNo && item.dakhilaNo.includes(fyClean)) {
                    const parts = item.dakhilaNo.split('-');
                    if (parts.length >= 3) {
                        const num = parseInt(parts[parts.length - 1]);
                        if (!isNaN(num) && num > maxDakhilaNum) {
                            maxDakhilaNum = num;
                            previousDakhilaDate = item.lastUpdateDateBs || ''; 
                            previousDakhilaNo = item.dakhilaNo;
                        }
                    }
                }
            });

            if (previousDakhilaDate && dateBs < previousDakhilaDate) {
                setValidationError(`मिति क्रम मिलेन (Invalid Date Order): \nअघिल्लो दाखिला नं (${previousDakhilaNo}) को मिति (${previousDakhilaDate}) भन्दा \nअहिलेको मिति (${dateBs}) अगाडि हुन सक्दैन।`);
                setIsSaving(false);
                return;
            }
        }

        if (!commonDetails.storeId) {
            setValidationError('कृपया गोदाम/स्टोर छान्नुहोस्। (Please select a Godam/Store.)');
            setIsSaving(false);
            return;
        }
        if (mode === 'add' && !commonDetails.receiptSource) { 
            setValidationError('कृपया प्राप्तिको स्रोत भर्नुहोस्। (Please fill receipt source.)');
            setIsSaving(false);
            return;
        }
        if (!commonDetails.dateBs) {
            setValidationError('कृपया मिति भर्नुहोस्। (Please fill date.)');
            setIsSaving(false);
            return;
        }
        if (mode === 'add' && !commonDetails.dakhilaNo.trim()) {
            setValidationError('कृपया दाखिला नं. भर्नुहोस्। (Please fill Dakhila No.)');
            setIsSaving(false);
            return;
        }

        let hasError = false;
        const validatedItems = bulkItems.map((item, index) => {
            const itemNumber = index + 1;
            
            const isExistingItemInSelectedStore = inventoryItems.some(i => 
                i.itemName.toLowerCase() === item.itemName.toLowerCase() && i.storeId === commonDetails.storeId
            );

            if (!item.itemName.trim()) {
                setValidationError(`क्रम संख्या ${itemNumber} मा सामानको नाम आवश्यक छ। (Item Name required for row ${itemNumber}.)`);
                hasError = true;
            }
            if (!item.itemType) { 
                setValidationError(`क्रम संख्या ${itemNumber} मा सामानको प्रकार आवश्यक छ। (Item Type required for row ${itemNumber}.)`);
                hasError = true;
            }
            if (!item.unit.trim()) { 
                setValidationError(`क्रम संख्या ${itemNumber} मा एकाई आवश्यक छ। (Unit required for row ${itemNumber}.)`);
                hasError = true;
            }
            if (!item.currentQuantity || isNaN(item.currentQuantity) || item.currentQuantity <= 0) {
                setValidationError(`क्रम संख्या ${itemNumber} मा मान्य परिमाण आवश्यक छ। (Valid Quantity required for row ${itemNumber}.)`);
                hasError = true;
            }
            if ((item.rate !== undefined && item.rate !== null && isNaN(item.rate)) || (item.tax !== undefined && item.tax !== null && isNaN(item.tax))) {
                setValidationError(`क्रम संख्या ${itemNumber} मा दर र कर मान्य संख्या हुनुपर्छ। (Rate and Tax must be valid numbers for row ${itemNumber}.)`);
                hasError = true;
            }

            if (item.ledgerPageNo?.trim()) {
                const conflictingItem = inventoryItems.find(i => 
                    i.storeId === commonDetails.storeId &&
                    i.itemType === item.itemType && 
                    i.ledgerPageNo === item.ledgerPageNo?.trim() && 
                    i.itemName.toLowerCase() !== item.itemName.toLowerCase() 
                );

                if (conflictingItem) {
                     setValidationError(`क्रम संख्या ${itemNumber} मा खाता पाना नं. ${item.ledgerPageNo} पहिले नै "${conflictingItem.itemName}" (${item.itemType === 'Expendable' ? 'खर्च हुने' : 'खर्च नहुने'}) को लागि प्रयोग भइसकेको छ।\nएउटै प्रकृतिका फरक सामानहरूको लागि फरक खाता पाना प्रयोग गर्नुहोस्।\n(Ledger Page ${item.ledgerPageNo} is already assigned to "${conflictingItem.itemName}" in the ${item.itemType} ledger. Different items in the same ledger cannot share a page number.)`);
                     hasError = true;
                }
            }

            if (mode === 'opening') {
                if (isExistingItemInSelectedStore) {
                    const storeLabel = storeOptions?.find(s => s.value === commonDetails.storeId)?.label.split('(')[0] || 'Unknown Store';
                    setValidationError(`क्रम संख्या ${itemNumber} मा सामान "${item.itemName}" पहिले नै "${storeLabel}" गोदाममा मौज्दात छ। ओपनिङ्ग स्टक नयाँ सामानहरूको लागि मात्र हो। (Item "${item.itemName}" already exists in the selected store. Opening stock is only for new items.)`);
                    hasError = true;
                }
                if (!item.uniqueCode?.trim()) {
                    setValidationError(`क्रम संख्या ${itemNumber} मा युनिक कोड आवश्यक छ किनकि यो नयाँ सामान हो। (Unique Code required for new item in row ${itemNumber}.)`);
                    hasError = true;
                }
                if (!item.sanketNo?.trim()) {
                    setValidationError(`क्रम संख्या ${itemNumber} मा सङ्केत नं आवश्यक छ किनकि यो नयाँ सामान हो। (Sanket No required for new item in row ${itemNumber}.)`);
                    hasError = true;
                }
                if (!item.itemClassification?.trim()) {
                    setValidationError(`क्रम संख्या ${itemNumber} मा सामानको वर्गीकरण आवश्यक छ किनकि यो नयाँ सामान हो। (Item Classification required for new item in row ${itemNumber}.)`);
                    hasError = true;
                }
            }
            
            return {
                ...item,
                itemName: item.itemName.trim(),
                uniqueCode: item.uniqueCode?.trim() || "",
                sanketNo: item.sanketNo?.trim() || "",
                ledgerPageNo: item.ledgerPageNo?.trim() || "",
                dakhilaNo: mode === 'add' ? commonDetails.dakhilaNo.trim() : "",
                itemClassification: item.itemClassification?.trim() || "",
                specification: item.specification?.trim() || "",
                unit: item.unit.trim(),
                currentQuantity: parseFloat(item.currentQuantity.toString()),
                rate: item.rate !== undefined && item.rate !== null ? parseFloat(item.rate.toString()) : 0,
                tax: item.tax !== undefined && item.tax !== null ? parseFloat(item.tax.toString()) : 0,
                batchNo: item.batchNo?.trim() || "",
                expiryDateAd: item.expiryDateAd || "",
                expiryDateBs: item.expiryDateBs || "",
                remarks: item.remarks?.trim() || "",
                storeId: commonDetails.storeId, 
            };
        }).filter(item => item.itemName); 

        if (hasError) {
            setIsSaving(false);
            return;
        }

        if (validatedItems.length === 0) {
            setValidationError('कृपया कम्तिमा एउटा सामानको विवरण भर्नुहोस्। (Please add at least one item.)');
            setIsSaving(false);
            return;
        }

        await onSave(
            validatedItems, 
            commonDetails.receiptSource, 
            commonDetails.dateBs, 
            commonDetails.dateAd, 
            commonDetails.storeId, 
            commonDetails.supplier, 
            commonDetails.refNo, 
            mode
        );
        setIsSaving(false);
        onClose(); 
    };

    const modalTitle = mode === 'opening' ? 'ओपनिङ्ग स्टक राख्नुहोस् (Add Opening Stock)' : 'बल्कमा स्टक थप्नुहोस् (Add Stock in Bulk)';
    const headerBgClass = mode === 'opening' ? 'bg-blue-50/50' : 'bg-purple-50/50';
    const iconClass = mode === 'opening' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600';
    const iconComponent = mode === 'opening' ? <ArrowUpCircle size={20} /> : <Layers size={20} />;
    const saveButtonColor = mode === 'opening' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700';

    const specificationPlaceholder = 'Specification (e.g. Model, Brand)';

    const shouldShowBatchExpiry = (classification: string = '') => {
        const lower = classification.toLowerCase();
        return lower.includes('medicine') || lower.includes('surgical') || lower.includes('consumable') || lower.includes('aausadi');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            
            <div className="relative bg-white rounded-2xl shadow-2xl w-full h-full max-w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className={`px-6 py-4 border-b border-slate-100 flex justify-between items-center ${headerBgClass}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${iconClass}`}>
                            {iconComponent}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg font-nepali">{modalTitle}</h3>
                            <p className="text-xs text-slate-500">
                                {mode === 'opening' ? 'यो आर्थिक वर्षको लागि सुरुवाती स्टक प्रविष्ट गर्नुहोस्।' : 'एकै पटक धेरै सामानको मौज्दात प्रविष्ट गर्नुहोस्।'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSaveBulk} className="p-6 space-y-4 overflow-y-auto">
                    
                    {initialData && (
                        <div className="w-full p-3 mb-4 rounded-lg flex items-center gap-3 border bg-indigo-50 border-indigo-200 text-indigo-800">
                            <Info size={20} className="shrink-0" />
                            <div>
                                <span className="font-bold font-nepali block">खरिद आदेशबाट प्राप्त विवरण (Data from Purchase Order)</span>
                                <span className="text-xs">PO No: {initialData.orderNo || initialData.magFormNo} | Vendor: {initialData.vendorDetails?.name}</span>
                            </div>
                        </div>
                    )}

                    {masterType && !initialData && (
                        <div className={`w-full p-3 mb-4 rounded-lg flex items-center gap-3 border ${
                            masterType === 'Expendable' ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-blue-50 border-blue-200 text-blue-800'
                        }`}>
                            <Info size={20} className="shrink-0" />
                            <span className="font-bold font-nepali">
                                {masterType === 'Expendable' 
                                    ? 'तपाईं खर्च हुने जिन्सी सामान दाखिला गर्दै हुनुहुन्छ (You are entering Expendable Inventory Items)' 
                                    : 'तपाईं खर्च नहुने जिन्सी सामान दाखिला गर्दै हुनुहुन्छ (You are entering Non-Expendable Inventory Items)'}
                            </span>
                        </div>
                    )}

                    <div className="grid md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <Input
                            label="आर्थिक वर्ष (Fiscal Year)"
                            value={currentFiscalYear}
                            readOnly
                            disabled
                            className="bg-slate-100 text-slate-600 font-medium cursor-not-allowed"
                            icon={<Calendar size={16} />}
                            tabIndex={-1} 
                        />
                        <Select
                            label="गोदाम/स्टोर (Godam/Store) *"
                            options={storeOptions}
                            value={commonDetails.storeId}
                            onChange={e => handleCommonDetailsChange('storeId', e.target.value)}
                            required
                            icon={<StoreIcon size={16} />}
                        />
                        <Select
                            label="प्राप्तिको स्रोत (Receipt Source)"
                            options={mode === 'opening' ? [{ id: 'opening', value: 'Opening', label: 'ओपनिङ्ग (Opening)' }] : receiptSourceOptions}
                            value={commonDetails.receiptSource}
                            onChange={e => handleCommonDetailsChange('receiptSource', e.target.value)}
                            required
                            icon={<ArrowUpCircle size={16} />}
                            disabled={mode === 'opening'} 
                            className={mode === 'opening' ? 'bg-slate-100 cursor-not-allowed' : ''}
                            tabIndex={mode === 'opening' ? -1 : undefined}
                            onAddOptionHotkeyTriggered={() => setShowAddSourceModal(true)} 
                            addOptionHotkey="Alt+c" 
                        />
                        <NepaliDatePicker
                            label="मिति (नेपाली) (Date - BS)"
                            value={commonDetails.dateBs}
                            onChange={val => handleCommonDetailsChange('dateBs', val)}
                            required
                            minDate={todayBs}
                            maxDate={todayBs}
                        />
                        <Input
                            label="मिति (अंग्रेजी) (Date - AD)"
                            type="date"
                            value={commonDetails.dateAd}
                            readOnly
                            disabled
                            className="bg-slate-100 cursor-not-allowed text-slate-500"
                            icon={<Calendar size={16} />}
                            tabIndex={-1}
                        />
                        <div className="col-span-2">
                            <Input
                                label="आपूर्तिकर्ता / स्रोत (Supplier / Source)"
                                value={commonDetails.supplier}
                                onChange={e => handleCommonDetailsChange('supplier', e.target.value)}
                                placeholder="Supplier Name"
                                icon={<User size={16} />}
                            />
                        </div>
                        <div className="col-span-1">
                            <Input
                                label="खरिद आदेश / हस्तान्तरण फारम नं"
                                value={commonDetails.refNo}
                                onChange={e => handleCommonDetailsChange('refNo', e.target.value)}
                                placeholder="PO / Hafa No"
                                icon={<FileText size={16} />}
                            />
                        </div>
                        {mode === 'add' && (
                            <div className="col-span-1">
                                <Input
                                    label="दाखिला नं (Dakhila No) *"
                                    value={commonDetails.dakhilaNo}
                                    onChange={e => handleCommonDetailsChange('dakhilaNo', e.target.value)}
                                    placeholder="D-081082-001"
                                    required
                                    icon={<Hash size={16} />}
                                    className="font-bold text-purple-700"
                                />
                            </div>
                        )}
                    </div>

                    {validationError && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-xl text-red-700 text-sm whitespace-pre-line">
                            {validationError}
                        </div>
                    )}

                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 font-medium">
                                <tr>
                                    <th className="px-3 py-2 w-8">#</th>
                                    <th className="px-3 py-2 w-40">सामानको नाम (Item Name)<span className="text-red-500">*</span></th>
                                    <th className="px-3 py-2 w-24">युनिक कोड (Unique Code) {mode === 'opening' && <span className="text-red-500">*</span>}</th>
                                    <th className="px-3 py-2 w-24">सङ्केत नं (Sanket No) {mode === 'opening' && <span className="text-red-500">*</span>}</th>
                                    <th className="px-3 py-2 w-24">जिन्सी खाता पाना नं (Ledger Pg No)</th>
                                    <th className="px-3 py-2 w-24">प्रकार (Type)<span className="text-red-500">*</span></th>
                                    <th className="px-3 py-2 w-24">वर्गीकरण (Class) {mode === 'opening' && <span className="text-red-500">*</span>}</th>
                                    <th className="px-3 py-2 w-20">एकाई (Unit)<span className="text-red-500">*</span></th>
                                    <th className="px-3 py-2 w-20">परिमाण (Qty)<span className="text-red-500">*</span></th>
                                    <th className="px-3 py-2 w-20">दर (Rate)</th>
                                    <th className="px-3 py-2 w-16">कर (%) (Tax %)</th>
                                    <th className="px-3 py-2 w-24">जम्मा रकम (Total)</th>
                                    <th className="px-3 py-2 w-24">ब्याच नं (Batch No)</th>
                                    <th className="px-3 py-2 w-28">म्याद सकिने मिति (Expiry AD)</th> 
                                    <th className="px-3 py-2 w-24">स्पेसिफिकेसन (Specification)</th> 
                                    <th className="px-3 py-2 w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {bulkItems.map((item, index) => (
                                    <tr key={item.id} className="border-t border-slate-100">
                                        <td className="px-3 py-2 text-center">{index + 1}</td>
                                        <td className="px-1 py-1">
                                            <SearchableSelect
                                                options={index === 0 ? allInventoryItemOptions : filteredInventoryItemOptions}
                                                value={item.itemName} 
                                                onChange={newName => handleItemNameChange(item.id, newName)} 
                                                onSelect={(option) => handleItemSelect(item.id, option)}
                                                placeholder="-- छान्नुहोस् वा नयाँ प्रविष्ट गर्नुहोस् --"
                                                className="!pl-3 !pr-8"
                                                label="" 
                                            />
                                        </td>
                                        <td className="px-1 py-1">
                                            <Input
                                                value={item.uniqueCode || ''}
                                                onChange={e => handleItemFieldChange(item.id, 'uniqueCode', e.target.value)}
                                                placeholder="कोड"
                                                className="!pl-3" 
                                                label=""
                                                icon={undefined}
                                            />
                                        </td>
                                        <td className="px-1 py-1">
                                            <Input
                                                value={item.sanketNo || ''}
                                                onChange={e => handleItemFieldChange(item.id, 'sanketNo', e.target.value)}
                                                placeholder="सङ्केत नं"
                                                className="!pl-3"
                                                label=""
                                                icon={undefined}
                                            />
                                        </td>
                                        <td className="px-1 py-1">
                                            <Input
                                                value={item.ledgerPageNo || ''}
                                                onChange={e => handleItemFieldChange(item.id, 'ledgerPageNo', e.target.value)}
                                                placeholder="पाना नं"
                                                className="!pl-3"
                                                label=""
                                                icon={undefined}
                                            />
                                        </td>
                                        <td className="px-1 py-1">
                                            <Select
                                                options={itemTypeOptions}
                                                value={item.itemType}
                                                onChange={e => handleItemFieldChange(item.id, 'itemType', e.target.value as 'Expendable' | 'Non-Expendable')}
                                                placeholder="-- प्रकार --"
                                                className={`!pl-3 !pr-8 ${index > 0 ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`} 
                                                icon={undefined}
                                                label=""
                                                disabled={index > 0} 
                                                tabIndex={index > 0 ? -1 : undefined}
                                            />
                                        </td>
                                        <td className="px-1 py-1">
                                            <Select
                                                options={itemClassificationOptions} 
                                                value={item.itemClassification || ''}
                                                onChange={e => handleItemFieldChange(item.id, 'itemClassification', e.target.value)}
                                                placeholder="-- वर्गीकरण --"
                                                className="!pl-3 !pr-8"
                                                icon={undefined}
                                                label=""
                                                onAddOptionHotkeyTriggered={() => setShowAddClassificationModal(true)} 
                                                addOptionHotkey="Alt+c" 
                                            />
                                        </td>
                                        <td className="px-1 py-1">
                                            <Input
                                                value={item.unit}
                                                onChange={e => handleItemFieldChange(item.id, 'unit', e.target.value)}
                                                placeholder="एकाई"
                                                className="!pl-3"
                                                label=""
                                                icon={undefined}
                                            />
                                        </td>
                                        <td className="px-1 py-1">
                                            <Input
                                                type="number"
                                                value={item.currentQuantity === 0 ? '' : item.currentQuantity}
                                                onChange={e => handleItemFieldChange(item.id, 'currentQuantity', e.target.value)}
                                                placeholder="०"
                                                min="0"
                                                step="any"
                                                className="text-center !pl-3"
                                                label=""
                                                icon={undefined}
                                            />
                                        </td>
                                        <td className="px-1 py-1">
                                            <Input
                                                type="number"
                                                value={item.rate === undefined || item.rate === null ? '' : item.rate}
                                                onChange={e => handleItemFieldChange(item.id, 'rate', e.target.value)}
                                                placeholder="०.००"
                                                min="0"
                                                step="0.01"
                                                className="text-right !pl-3"
                                                label=""
                                                icon={undefined}
                                            />
                                        </td>
                                        <td className="px-1 py-1">
                                            <Input
                                                type="number"
                                                value={item.tax === undefined || item.tax === null ? '' : item.tax}
                                                onChange={e => handleItemFieldChange(item.id, 'tax', e.target.value)}
                                                placeholder="०.००"
                                                min="0"
                                                step="0.01"
                                                className="text-right !pl-3"
                                                label=""
                                                icon={undefined}
                                            />
                                        </td>
                                        <td className="px-1 py-1 text-right font-bold text-slate-700 bg-slate-50 cursor-not-allowed">
                                            {item.totalAmount?.toFixed(2) || '0.00'}
                                        </td>
                                        <td className="px-1 py-1">
                                            <Input
                                                value={shouldShowBatchExpiry(item.itemClassification) ? (item.batchNo || '') : '-'}
                                                onChange={e => handleItemFieldChange(item.id, 'batchNo', e.target.value)}
                                                placeholder={shouldShowBatchExpiry(item.itemClassification) ? "ब्याच नं" : "-"}
                                                className={`!pl-3 ${!shouldShowBatchExpiry(item.itemClassification) ? 'bg-slate-100 text-center cursor-not-allowed' : ''}`}
                                                label=""
                                                icon={undefined}
                                                disabled={!shouldShowBatchExpiry(item.itemClassification)}
                                                tabIndex={!shouldShowBatchExpiry(item.itemClassification) ? -1 : undefined}
                                            />
                                        </td>
                                        <td className="px-1 py-1">
                                            {shouldShowBatchExpiry(item.itemClassification) ? (
                                                <EnglishDatePicker 
                                                    value={item.expiryDateAd || ''}
                                                    onChange={val => handleItemFieldChange(item.id, 'expiryDateAd', val)}
                                                    label="" 
                                                />
                                            ) : (
                                                <div className="w-full h-[38px] bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center text-slate-400 text-sm cursor-not-allowed">
                                                    -
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-1 py-1">
                                            <Input
                                                value={item.specification || ''} 
                                                onChange={e => handleItemFieldChange(item.id, 'specification', e.target.value)} 
                                                placeholder={specificationPlaceholder}
                                                className="!pl-3"
                                                label=""
                                                icon={undefined}
                                            />
                                        </td>
                                        <td className="px-1 py-1 text-center">
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveRow(item.id)}
                                                className="text-red-500 hover:text-red-700 p-1"
                                                title="Remove Row"
                                            >
                                                <X size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <button
                        type="button"
                        onClick={handleAddRow}
                        className="flex items-center gap-2 px-4 py-2 mt-4 text-primary-600 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors border border-dashed border-slate-300"
                    >
                        <Plus size={18} /> लहर थप्नुहोस् (Add Row)
                    </button>

                    <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 shrink-0 -mx-6 -mb-6 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                        >
                            रद्द गर्नुहोस् (Cancel)
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className={`flex items-center gap-2 px-6 py-2 text-white rounded-lg text-sm font-medium shadow-sm transition-colors ${saveButtonColor}`}
                        >
                            <Send size={16} />
                            {isSaving ? 'पठाउँदै...' : 'अनुरोध पेश गर्नुहोस् (Submit Request)'}
                        </button>
                    </div>
                </form>
            </div>

            <AddOptionModal
                isOpen={showAddClassificationModal}
                onClose={() => setShowAddClassificationModal(false)}
                onSave={onAddClassification}
                title="नयाँ वर्गीकरण थप्नुहोस् (Add New Classification)"
                label="वर्गीकरणको नाम (Classification Name)"
                placeholder="e.g. सर्जिकल सामग्री (Surgical Supplies)"
            />

            <AddOptionModal
                isOpen={showAddSourceModal}
                onClose={() => setShowAddSourceModal(false)}
                onSave={onAddReceiptSource}
                title="नयाँ स्रोत थप्नुहोस् (Add New Source)"
                label="स्रोतको नाम (Source Name)"
                placeholder="e.g. मन्त्रालयबाट प्राप्त (Received from Ministry)"
            />
        </div>
    );
};

export const JinshiMaujdat: React.FC<JinshiMaujdatProps> = ({ 
  currentFiscalYear, 
  currentUser,
  inventoryItems, 
  onAddInventoryItem, 
  onUpdateInventoryItem,
  onRequestStockEntry,
  stores,
  pendingPoDakhila,
  onClearPendingPoDakhila
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStore, setFilterStore] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<InventoryItem | null>(null);
  const [bulkMode, setBulkMode] = useState<'opening' | 'add'>('add');

  const [itemClassificationOptions, setItemClassificationOptions] = useState<Option[]>(initialItemClassificationOptions);
  const [receiptSourceOptions, setReceiptSourceOptions] = useState<Option[]>(initialReceiptSourceOptions);

  useEffect(() => {
    if (pendingPoDakhila) {
      setBulkMode('add');
      setShowBulkModal(true);
    }
  }, [pendingPoDakhila]);

  const storeOptions: Option[] = useMemo(() => {
      return stores.map(s => ({
          id: s.id,
          value: s.id,
          label: s.name
      }));
  }, [stores]);

  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = 
      item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.uniqueCode && item.uniqueCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.sanketNo && item.sanketNo.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStore = filterStore ? item.storeId === filterStore : true;
    const matchesType = filterType ? item.itemType === filterType : true;
    const matchesClass = filterClass ? item.itemClassification === filterClass : true;

    return matchesSearch && matchesStore && matchesType && matchesClass;
  });

  const handleEditClick = (item: InventoryItem) => {
      setSelectedItemForEdit(item);
      setShowEditModal(true);
  };

  const handleUpdateItem = (updatedItem: InventoryItem) => {
      onUpdateInventoryItem(updatedItem);
      setShowEditModal(false);
      setSelectedItemForEdit(null);
  };

  const handleBulkSave = (items: InventoryItem[], source: string, dateBs: string, dateAd: string, storeId: string, supplier: string, refNo: string, mode: 'opening' | 'add') => {
      const request: StockEntryRequest = {
          id: Date.now().toString(),
          requestDateBs: dateBs,
          requestDateAd: dateAd,
          fiscalYear: currentFiscalYear,
          storeId: storeId,
          receiptSource: source,
          supplier: supplier,
          refNo: refNo,
          items: items,
          status: 'Pending', 
          requestedBy: currentUser.username,
          requesterName: currentUser.fullName,
          requesterDesignation: currentUser.designation,
          mode: mode
      };
      onRequestStockEntry(request);
      
      if (pendingPoDakhila && onClearPendingPoDakhila) {
          onClearPendingPoDakhila();
      }
  };

  const handleAddClassification = (newClass: string) => {
      const newOption = { id: newClass.toLowerCase(), value: newClass, label: newClass };
      setItemClassificationOptions(prev => [...prev, newOption]);
  };

  const handleAddReceiptSource = (newSource: string) => {
      const newOption = { id: newSource.toLowerCase(), value: newSource, label: newSource };
      setReceiptSourceOptions(prev => [...prev, newOption]);
  };

  const handleOpenBulkModal = (mode: 'opening' | 'add') => {
      setBulkMode(mode);
      setShowBulkModal(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
            <Warehouse size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">जिन्सी मौज्दात (Inventory Stock)</h2>
            <p className="text-sm text-slate-500">हालको मौज्दात र विवरणहरू हेर्नुहोस्</p>
          </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
            <button 
                onClick={() => handleOpenBulkModal('opening')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium shadow-sm transition-colors w-full md:w-auto justify-center"
            >
                <ArrowUpCircle size={18} />
                <span className="font-nepali">ओपनिङ्ग स्टक (Opening)</span>
            </button>
            <button 
                onClick={() => handleOpenBulkModal('add')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg text-sm font-medium shadow-sm transition-colors w-full md:w-auto justify-center"
            >
                <Plus size={18} />
                <span className="font-nepali">दाखिला गर्नुहोस् (Add Stock)</span>
            </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                  type="text" 
                  placeholder="Search item, code..." 
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
              />
          </div>
          <Select 
              options={[{id: 'all', value: '', label: 'All Stores'}, ...storeOptions]}
              value={filterStore}
              onChange={e => setFilterStore(e.target.value)}
              placeholder="Filter by Store"
              icon={<StoreIcon size={16} />}
          />
          <Select 
              options={[{id: 'all', value: '', label: 'All Types'}, ...itemTypeOptions]}
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              placeholder="Filter by Type"
              icon={<Layers size={16} />}
          />
          <Select 
              options={[{id: 'all', value: '', label: 'All Classes'}, ...itemClassificationOptions]}
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
              placeholder="Filter by Class"
              icon={<Tag size={16} />}
          />
      </div>

      {/* Inventory Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-700 font-nepali">मौज्दात सूची (Stock List)</h3>
              <span className="text-xs font-medium bg-slate-200 text-slate-600 px-2 py-1 rounded-full">{filteredItems.length} Items</span>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                      <tr>
                          <th className="px-6 py-3 w-16">SN</th>
                          <th className="px-6 py-3">Item Name</th>
                          <th className="px-6 py-3">Code / Sanket</th>
                          <th className="px-6 py-3">Store</th>
                          <th className="px-6 py-3">Type / Class</th>
                          <th className="px-6 py-3 text-center">Qty</th>
                          <th className="px-6 py-3 text-right">Rate</th>
                          <th className="px-6 py-3 text-right">Total</th>
                          <th className="px-6 py-3 text-center">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredItems.length === 0 ? (
                          <tr><td colSpan={9} className="px-6 py-8 text-center text-slate-400 italic">No items found matching criteria.</td></tr>
                      ) : (
                          filteredItems.map((item, index) => {
                              const storeName = storeOptions.find(s => s.value === item.storeId)?.label || 'Unknown';
                              return (
                                  <tr key={item.id} className="hover:bg-slate-50">
                                      <td className="px-6 py-4 text-slate-500">{index + 1}</td>
                                      <td className="px-6 py-4">
                                          <div className="font-medium text-slate-800">{item.itemName}</div>
                                          <div className="text-xs text-slate-500">{item.unit}</div>
                                      </td>
                                      <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                                          <div>U: {item.uniqueCode || '-'}</div>
                                          <div>S: {item.sanketNo || '-'}</div>
                                      </td>
                                      <td className="px-6 py-4 text-slate-600">{storeName}</td>
                                      <td className="px-6 py-4">
                                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border mb-1 ${
                                              item.itemType === 'Expendable' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                                          }`}>
                                              {item.itemType === 'Expendable' ? 'EXP' : 'FIX'}
                                          </span>
                                          <div className="text-xs text-slate-500">{item.itemClassification}</div>
                                      </td>
                                      <td className="px-6 py-4 text-center font-bold text-slate-800 bg-slate-50/50">
                                          {item.currentQuantity}
                                      </td>
                                      <td className="px-6 py-4 text-right text-slate-600">{item.rate?.toFixed(2) || '-'}</td>
                                      <td className="px-6 py-4 text-right font-medium text-slate-700">{item.totalAmount?.toFixed(2) || '-'}</td>
                                      <td className="px-6 py-4 text-center">
                                          <button 
                                              onClick={() => handleEditClick(item)}
                                              className="text-indigo-600 hover:text-indigo-800 p-1.5 hover:bg-indigo-50 rounded transition-colors"
                                              title="Edit"
                                          >
                                              <Edit size={16} />
                                          </button>
                                      </td>
                                  </tr>
                              );
                          })
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedItemForEdit && (
          <EditInventoryItemModal
              isOpen={showEditModal}
              item={selectedItemForEdit}
              onClose={() => {
                  setShowEditModal(false);
                  setSelectedItemForEdit(null);
              }}
              onSave={handleUpdateItem}
              storeOptions={storeOptions}
              itemClassificationOptions={itemClassificationOptions}
          />
      )}

      {/* Bulk Entry Modal */}
      {showBulkModal && (
          <BulkInventoryEntryModal
              mode={bulkMode}
              isOpen={showBulkModal}
              onClose={() => {
                  setShowBulkModal(false);
                  if (onClearPendingPoDakhila) onClearPendingPoDakhila();
              }}
              onSave={handleBulkSave}
              inventoryItems={inventoryItems}
              currentFiscalYear={currentFiscalYear}
              storeOptions={storeOptions}
              receiptSourceOptions={receiptSourceOptions}
              itemClassificationOptions={itemClassificationOptions}
              onAddClassification={handleAddClassification}
              onAddReceiptSource={handleAddReceiptSource}
              initialData={pendingPoDakhila}
          />
      )}
    </div>
  );
};
