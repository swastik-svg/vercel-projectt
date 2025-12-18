
import React, { useState, useRef } from 'react';
import { Calendar, User, Lock, LogIn, Eye, EyeOff, Loader2, AlertCircle, Info } from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';
import { FISCAL_YEARS } from '../constants';
import { LoginFormData, LoginFormProps } from '../types';

export const LoginForm: React.FC<LoginFormProps> = ({ users, onLoginSuccess, initialFiscalYear }) => {
  const [formData, setFormData] = useState<LoginFormData>({
    fiscalYear: initialFiscalYear || '2081/082', // Default to passed prop or fallback
    username: '',
    password: '',
  });

  const [errors, setErrors] = useState<Partial<LoginFormData & { form: string }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordMsg, setShowForgotPasswordMsg] = useState(false);

  // Ref for password input to handle focus
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof LoginFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    if (errors.form) {
      setErrors(prev => ({ ...prev, form: undefined }));
    }
  };

  // Handler for Enter key on Username field
  const handleUsernameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission
      passwordInputRef.current?.focus(); // Move focus to password
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<LoginFormData> = {};
    if (!formData.fiscalYear) newErrors.fiscalYear = 'आर्थिक वर्ष छान्नुहोस् (Required)';
    if (!formData.username.trim()) newErrors.username = 'प्रयोगकर्ता नाम राख्नुहोस् (Required)';
    if (!formData.password) newErrors.password = 'पासवर्ड राख्नुहोस् (Required)';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({}); // Clear previous errors

    try {
      // Simulate API call delay for UX
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const foundUser = users.find(
        u => u.username.toLowerCase() === formData.username.trim().toLowerCase() && u.password === formData.password
      );

      if (foundUser) {
          onLoginSuccess(foundUser, formData.fiscalYear);
      } else {
          setErrors(prev => ({ 
              ...prev, 
              form: 'प्रयोगकर्ता नाम वा पासवर्ड मिलेन (Invalid credentials)' 
          }));
      }
    } catch (error) {
      console.error(error);
      setErrors(prev => ({ ...prev, form: 'An error occurred. Please try again.' }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* Global Error Message */}
      {errors.form && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 flex items-center gap-2 animate-pulse">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errors.form}</span>
        </div>
      )}

      {/* Forgot Password Message */}
      {showForgotPasswordMsg && (
        <div className="bg-blue-50 text-blue-700 text-sm p-3 rounded-lg border border-blue-200 flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
            <Info size={16} className="shrink-0 mt-0.5" />
            <span className="font-nepali">कृपया एडमिनसँग पासवर्ड रिसेटको लागि अनुरोध गर्नुहोस्।</span>
        </div>
      )}

      <div className="space-y-5">
        {/* Fiscal Year Select */}
        <div className="bg-slate-50 p-1 rounded-lg">
            <Select
              label="आर्थिक वर्ष (Fiscal Year)"
              name="fiscalYear"
              value={formData.fiscalYear}
              onChange={handleChange}
              options={FISCAL_YEARS}
              error={errors.fiscalYear}
              icon={<Calendar size={18} />}
              className="font-nepali font-bold text-slate-700 bg-white border-slate-300" 
            />
        </div>

        <Input
          label="प्रयोगकर्ताको नाम (Username)"
          name="username"
          type="text"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          onKeyDown={handleUsernameKeyDown} 
          error={errors.username}
          icon={<User size={18} />}
          className="font-medium"
        />

        <div className="relative">
          <Input
            ref={passwordInputRef} 
            label="पासवर्ड (Password)"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            icon={<Lock size={18} />}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded-full hover:bg-slate-100 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm mt-2">
        <label className="flex items-center gap-2 cursor-pointer group select-none">
          <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
          <span className="text-slate-500 group-hover:text-slate-700 transition-colors">Remember me</span>
        </label>
        <button 
          type="button" 
          onClick={() => setShowForgotPasswordMsg(!showForgotPasswordMsg)}
          className="text-primary-600 hover:text-primary-700 font-medium hover:underline focus:outline-none"
        >
          Forgot Password?
        </button>
      </div>

      <div className="space-y-4">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-primary-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 text-base"
        >
          {isLoading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <LogIn size={20} />
              <span>लगइन गर्नुहोस् (Login)</span>
            </>
          )}
        </button>

        {/* Developer Attribution Directly Below Button */}
        <div className="text-center">
            <p className="text-[10px] text-slate-400 font-medium tracking-tight uppercase">
                App Developed By : Swastik Khatiwada
            </p>
        </div>
      </div>
    </form>
  );
};
