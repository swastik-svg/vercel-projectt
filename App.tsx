
import React, { useState, useEffect } from 'react';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';
import { APP_NAME, ORG_NAME } from './constants';
import { Landmark } from 'lucide-react';
import { User, MagFormEntry, RabiesPatient, PurchaseOrderEntry, IssueReportEntry, FirmEntry, QuotationEntry, InventoryItem, Store, StockEntryRequest, DakhilaPratibedanEntry, ReturnEntry, MarmatEntry, DhuliyaunaEntry, LogBookEntry, OrganizationSettings } from './types';
import { db } from './firebase';
import { ref, onValue, set, remove, update } from "firebase/database";

// Initial Settings Fallback
const INITIAL_SETTINGS: OrganizationSettings = {
    orgNameNepali: 'चौदण्डीगढी नगरपालिका',
    orgNameEnglish: 'Chaudandigadhi Municipality',
    subTitleNepali: 'नगरकार्यपालिकाको कार्यालय',
    subTitleNepali2: 'स्वास्थ्य शाखा',
    subTitleNepali3: 'आधारभूत नगर अस्पताल बेल्टार',
    address: 'बेल्टार, उदयपुर',
    phone: '०३५-४४०२४५',
    email: 'info@chaudandigadhimun.gov.np',
    website: 'www.chaudandigadhimun.gov.np',
    panNo: '२०१२३४५६७',
    defaultVatRate: '13',
    activeFiscalYear: '2081/082',
    enableEnglishDate: 'no',
    logoUrl: ''
};

// Default Admin User to ensure system access if DB is empty
const DEFAULT_ADMIN: User = {
    id: 'superadmin_init',
    username: 'superadmin',
    password: 'superadmin',
    role: 'SUPER_ADMIN',
    organizationName: 'System Core',
    fullName: 'Super Administrator',
    designation: 'IT Head',
    phoneNumber: '9800000000',
    allowedMenus: ['dashboard', 'services', 'inventory', 'report', 'settings']
};

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>([DEFAULT_ADMIN]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentFiscalYear, setCurrentFiscalYear] = useState<string>('');
  const [generalSettings, setGeneralSettings] = useState<OrganizationSettings>(INITIAL_SETTINGS);
  const [isDbConnected, setIsDbConnected] = useState(false);
  
  // Data States
  const [magForms, setMagForms] = useState<MagFormEntry[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderEntry[]>([]);
  const [issueReports, setIssueReports] = useState<IssueReportEntry[]>([]);
  const [rabiesPatients, setRabiesPatients] = useState<RabiesPatient[]>([]);
  const [firms, setFirms] = useState<FirmEntry[]>([]); 
  const [quotations, setQuotations] = useState<QuotationEntry[]>([]); 
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]); 
  const [stockEntryRequests, setStockEntryRequests] = useState<StockEntryRequest[]>([]); 
  const [stores, setStores] = useState<Store[]>([]); 
  const [dakhilaReports, setDakhilaReports] = useState<DakhilaPratibedanEntry[]>([]); 
  const [returnEntries, setReturnEntries] = useState<ReturnEntry[]>([]); 
  const [marmatEntries, setMarmatEntries] = useState<MarmatEntry[]>([]); 
  const [dhuliyaunaEntries, setDhuliyaunaEntries] = useState<DhuliyaunaEntry[]>([]); 
  const [logBookEntries, setLogBookEntries] = useState<LogBookEntry[]>([]); 

  useEffect(() => {
    const connectedRef = ref(db, ".info/connected");
    onValue(connectedRef, (snap) => {
        setIsDbConnected(snap.val() === true);
    });

    const usersRef = ref(db, 'users');
    onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        let userList: User[] = [];
        if (data) {
            userList = Object.keys(data).map(key => ({
                ...data[key],
                id: data[key].id || key
            }));
        }
        const filteredList = userList.filter(u => u.username?.toLowerCase() !== 'superadmin');
        setUsers([DEFAULT_ADMIN, ...filteredList]);
    });

    const settingsRef = ref(db, 'settings');
    onValue(settingsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) setGeneralSettings(prev => ({...prev, ...data}));
    });

    const safeParseArray = <T,>(data: any): T[] => {
        if (!data) return [];
        return Object.keys(data).map(key => ({ ...data[key], id: data[key].id || key }));
    };

    onValue(ref(db, 'inventory'), (s) => setInventoryItems(safeParseArray(s.val())));
    onValue(ref(db, 'stores'), (s) => setStores(safeParseArray(s.val())));
    onValue(ref(db, 'magForms'), (s) => setMagForms(safeParseArray(s.val())));
    onValue(ref(db, 'purchaseOrders'), (s) => setPurchaseOrders(safeParseArray(s.val())));
    onValue(ref(db, 'issueReports'), (s) => setIssueReports(safeParseArray(s.val())));
    onValue(ref(db, 'stockRequests'), (s) => setStockEntryRequests(safeParseArray(s.val())));
    onValue(ref(db, 'dakhilaReports'), (s) => setDakhilaReports(safeParseArray(s.val())));
    onValue(ref(db, 'returnEntries'), (s) => setReturnEntries(safeParseArray(s.val())));
    onValue(ref(db, 'firms'), (s) => setFirms(safeParseArray(s.val())));
    onValue(ref(db, 'quotations'), (s) => setQuotations(safeParseArray(s.val())));
    onValue(ref(db, 'rabiesPatients'), (s) => setRabiesPatients(safeParseArray(s.val())));
    onValue(ref(db, 'marmatEntries'), (s) => setMarmatEntries(safeParseArray(s.val())));
    onValue(ref(db, 'disposalEntries'), (s) => setDhuliyaunaEntries(safeParseArray(s.val())));
    onValue(ref(db, 'logBook'), (s) => setLogBookEntries(safeParseArray(s.val())));
  }, []);

  const handleLoginSuccess = (user: User, fiscalYear: string) => {
    setCurrentUser(user);
    setCurrentFiscalYear(fiscalYear);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentFiscalYear('');
  };

  if (currentUser) {
    return (
      <Dashboard 
        onLogout={handleLogout} 
        currentUser={currentUser}
        currentFiscalYear={currentFiscalYear} 
        users={users}
        onAddUser={(u) => set(ref(db, `users/${u.id}`), u)}
        onUpdateUser={(u) => set(ref(db, `users/${u.id}`), u)}
        onDeleteUser={(id) => remove(ref(db, `users/${id}`))}
        onChangePassword={(id, pass) => update(ref(db, `users/${id}`), { password: pass })}
        generalSettings={generalSettings}
        onUpdateGeneralSettings={(s) => set(ref(db, 'settings'), s)}
        magForms={magForms}
        onSaveMagForm={(f) => set(ref(db, `magForms/${f.id}`), f)}
        purchaseOrders={purchaseOrders}
        onUpdatePurchaseOrder={(o) => set(ref(db, `purchaseOrders/${o.id}`), o)}
        issueReports={issueReports}
        onUpdateIssueReport={(r) => set(ref(db, `issueReports/${r.id}`), r)}
        rabiesPatients={rabiesPatients}
        onAddRabiesPatient={(p) => set(ref(db, `rabiesPatients/${p.id}`), p)}
        onUpdateRabiesPatient={(p) => set(ref(db, `rabiesPatients/${p.id}`), p)}
        firms={firms}
        onAddFirm={(f) => set(ref(db, `firms/${f.id}`), f)}
        quotations={quotations}
        onAddQuotation={(q) => set(ref(db, `quotations/${q.id}`), q)}
        inventoryItems={inventoryItems}
        onAddInventoryItem={(i) => set(ref(db, `inventory/${i.id}`), i)}
        onUpdateInventoryItem={(i) => set(ref(db, `inventory/${i.id}`), i)}
        stockEntryRequests={stockEntryRequests}
        onRequestStockEntry={(r) => set(ref(db, `stockRequests/${r.id}`), r)}
        onApproveStockEntry={(id, app) => update(ref(db, `stockRequests/${id}`), { status: 'Approved', approvedBy: app })}
        onRejectStockEntry={(id, res, app) => update(ref(db, `stockRequests/${id}`), { status: 'Rejected', rejectionReason: res, approvedBy: app })}
        stores={stores}
        onAddStore={(s) => set(ref(db, `stores/${s.id}`), s)}
        onUpdateStore={(s) => set(ref(db, `stores/${s.id}`), s)}
        onDeleteStore={(id) => remove(ref(db, `stores/${id}`))}
        dakhilaReports={dakhilaReports}
        onSaveDakhilaReport={(r) => set(ref(db, `dakhilaReports/${r.id}`), r)}
        returnEntries={returnEntries}
        onSaveReturnEntry={(e) => set(ref(db, `returnEntries/${e.id}`), e)}
        marmatEntries={marmatEntries}
        onSaveMarmatEntry={(e) => set(ref(db, `marmatEntries/${e.id}`), e)}
        dhuliyaunaEntries={dhuliyaunaEntries}
        onSaveDhuliyaunaEntry={(e) => set(ref(db, `disposalEntries/${e.id}`), e)}
        logBookEntries={logBookEntries}
        onSaveLogBookEntry={(e) => set(ref(db, `logBook/${e.id}`), e)}
        onClearData={(p) => remove(ref(db, p))}
      />
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-slate-200">
        <span className={`relative inline-flex rounded-full h-3 w-3 ${isDbConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
        <span className={`text-xs font-medium ${isDbConnected ? 'text-green-700' : 'text-red-600'}`}>
          {isDbConnected ? 'System Online' : 'System Offline'}
        </span>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] bg-[length:20px_20px]" />
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="bg-white/10 p-3 rounded-full backdrop-blur-sm border border-white/20 shadow-inner">
                <Landmark className="text-white w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-white font-nepali">{APP_NAME}</h1>
              <p className="text-primary-100 text-sm font-medium font-nepali">{ORG_NAME}</p>
            </div>
          </div>

          <div className="p-8 pt-6">
            <LoginForm 
                users={users} 
                onLoginSuccess={handleLoginSuccess} 
                initialFiscalYear={generalSettings.activeFiscalYear} 
            />
          </div>
          
          <div className="bg-slate-50 border-t border-slate-100 p-4 text-center">
             <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} {ORG_NAME}.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
