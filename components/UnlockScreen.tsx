

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, LogIn, PlusCircle, ArrowLeft, Copy, Upload, AlertTriangle, Check, Fingerprint } from 'lucide-react';
import { VaultStatus } from '../hooks/useVault';

interface UnlockScreenProps {
    status: VaultStatus;
    onInitialize: () => string;
    onConfirm: () => void;
    onCancel: () => void;
    onUnlock: (id: string) => boolean;
    onImport: (file: File, id: string) => Promise<boolean>;
    onBiometricUnlock: () => Promise<boolean>;
    isBiometricSupportAvailable: boolean;
}

const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
};

const UnlockScreen: React.FC<UnlockScreenProps> = ({ status, onInitialize, onConfirm, onCancel, onUnlock, onImport, onBiometricUnlock, isBiometricSupportAvailable }) => {
    const [mode, setMode] = useState<'select' | 'access'>('select');
    const [idInput, setIdInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [newlyGeneratedId, setNewlyGeneratedId] = useState<string | null>(null);
    const [isIdSaved, setIsIdSaved] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    const hasBiometricCredentials = () => {
        const creds = localStorage.getItem('lockbox_biometric_credentials');
        return creds && Object.keys(JSON.parse(creds)).length > 0;
    };
    
    // Attempt biometric unlock on load if available
    useEffect(() => {
        if (mode === 'select' && hasBiometricCredentials()) {
             handleBiometricUnlock();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    const handleStartCreate = () => {
        const newId = onInitialize();
        setNewlyGeneratedId(newId);
    };
    
    const handleBiometricUnlock = async () => {
        setIsAuthenticating(true);
        setError(null);
        const success = await onBiometricUnlock();
        if (!success) {
            setError("Fingerprint login failed or was cancelled.");
        }
        setIsAuthenticating(false);
    }

    const handleCopyToClipboard = () => {
        if (newlyGeneratedId) {
            navigator.clipboard.writeText(newlyGeneratedId);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };
    
    const handleUnlock = (e: React.FormEvent) => {
        e.preventDefault();
        if (!idInput.trim()) {
            setError('Vault ID cannot be empty.');
            return;
        }
        setError(null);
        const success = onUnlock(idInput);
        if (!success) {
            setError('Invalid Vault ID. Check for typos or import from backup.');
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!idInput.trim()) {
            setError('Please enter the Vault ID for the backup file before selecting it.');
            return;
        }
        setError(null);
        try {
            const success = await onImport(file, idInput);
            if (!success) {
                setError('Import failed. The Vault ID did not match the backup file.');
            }
        } catch (err) {
            setError('Import failed. The file may be corrupt or invalid.');
        }
    };

    const triggerFileSelect = () => {
        if (!idInput.trim()) {
            setError('Please enter the Vault ID for the backup file first.');
            return;
        }
        setError(null);
        fileInputRef.current?.click();
    };

    const renderContent = () => {
        if (status === VaultStatus.AWAITING_CONFIRMATION) {
            return (
                <motion.div key="create" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="w-full">
                    <button onClick={onCancel} className="absolute top-4 left-4 p-2 rounded-full hover:bg-white/10 transition-colors"><ArrowLeft size={20} /></button>
                    <AlertTriangle size={64} className="mx-auto text-amber-400 mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Save Your New Key</h1>
                    <p className="text-white/70 mb-4 text-sm">This is your new, unique Vault ID. It is the only way to recover your vault. <b>Store it somewhere safe and secret.</b></p>
                    
                    <div className="bg-black/40 p-3 my-4 rounded-lg font-mono text-xs break-all relative text-left">
                        {newlyGeneratedId}
                        <button onClick={handleCopyToClipboard} className="absolute top-1/2 -translate-y-1/2 right-2 p-2 rounded-md hover:bg-white/20">
                            {isCopied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                        </button>
                    </div>
                    {isCopied && <p className="text-sm text-green-400 mb-4 -mt-2">Copied to clipboard!</p>}

                    <div className="my-6 text-left">
                        <label className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-white/5">
                            <input type="checkbox" checked={isIdSaved} onChange={(e) => setIsIdSaved(e.target.checked)} className="h-5 w-5 rounded bg-transparent border-2 border-indigo-400 text-indigo-500 focus:ring-indigo-500"/>
                            <span className="text-sm font-medium select-none">I have securely saved my Vault ID.</span>
                        </label>
                    </div>
                    
                    <button onClick={onConfirm} disabled={!isIdSaved} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors font-semibold disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                       <ShieldCheck size={20}/> Finish Setup & Enter Vault
                    </button>
                </motion.div>
            );
        }

        if (mode === 'access') {
            return (
                <motion.div key="access" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="w-full">
                    <button onClick={() => { setMode('select'); setError(null); }} className="absolute top-4 left-4 p-2 rounded-full hover:bg-white/10 transition-colors"><ArrowLeft size={20} /></button>
                    <LogIn size={64} className="mx-auto text-indigo-400 mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Access or Restore Vault</h1>
                    <p className="text-white/70 mb-6">Enter your Vault ID below.</p>
                    
                    <form onSubmit={handleUnlock} className="space-y-4">
                        <input
                            type="password"
                            value={idInput}
                            onChange={(e) => setIdInput(e.target.value)}
                            className="w-full bg-[#2a2a4a] border border-transparent focus:border-indigo-500 focus:ring-indigo-500 rounded-lg px-3 py-2 transition-colors text-center"
                            placeholder="Your Secret Vault ID"
                            aria-label="Vault ID"
                        />
                         {error && <p className="text-red-400 text-sm !mt-2">{error}</p>}
                        <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors font-semibold">
                           <LogIn size={20}/> Unlock
                        </button>
                         {isBiometricSupportAvailable && hasBiometricCredentials() && (
                            <button type="button" onClick={handleBiometricUnlock} disabled={isAuthenticating} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-teal-600 hover:bg-teal-500 transition-colors font-semibold disabled:bg-gray-500">
                               <Fingerprint size={20}/> {isAuthenticating ? 'Authenticating...' : 'Login with Fingerprint'}
                            </button>
                        )}
                    </form>
                    
                    <div className="relative my-6 flex items-center">
                        <div className="flex-grow border-t border-gray-600"></div>
                        <span className="flex-shrink mx-4 text-gray-400 text-sm">OR</span>
                        <div className="flex-grow border-t border-gray-600"></div>
                    </div>
                    
                    <div>
                        <h2 className="font-semibold text-lg mb-2">Restore from Backup</h2>
                        <p className="text-sm text-white/70 mb-4">On a new device? Enter the Vault ID from your backup file above, then select the file to import.</p>
                        <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                        <button type="button" onClick={triggerFileSelect} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-sky-600 hover:bg-sky-500 transition-colors font-semibold">
                           <Upload size={20}/> Import Vault (.json)
                        </button>
                    </div>
                </motion.div>
            );
        }

        return (
             <motion.div key="select" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="w-full">
                <ShieldCheck size={64} className="mx-auto text-indigo-400 mb-4" />
                <h1 className="text-3xl font-bold mb-2">LockBox</h1>
                <p className="text-white/70 mb-8">Your secure, offline-first vault.</p>
                <div className="space-y-4">
                     <button onClick={handleStartCreate} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors font-semibold">
                       <PlusCircle size={20}/> Create New Vault
                    </button>
                    <button onClick={() => setMode('access')} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gray-600 hover:bg-gray-500 transition-colors font-semibold">
                       <LogIn size={20}/> Access Existing Vault
                    </button>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="w-screen h-screen overflow-hidden flex items-center justify-center bg-cover bg-center p-4" style={{ backgroundImage: "url('https://picsum.photos/1080/1920?blur=5')" }}>
            <div className="absolute inset-0 bg-black/70"></div>
            <div className="relative z-10 w-full max-w-sm landscape:max-w-md text-center text-white bg-black/30 backdrop-blur-xl p-8 rounded-2xl shadow-2xl overflow-y-auto max-h-screen">
                <AnimatePresence mode="wait">
                    {renderContent()}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default UnlockScreen;