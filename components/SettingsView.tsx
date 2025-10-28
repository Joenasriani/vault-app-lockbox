

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, LogOut, ShieldAlert, Info, User, Fingerprint, Upload } from 'lucide-react';

interface SettingsViewProps {
    vaultId: string | null;
    onExport: () => void;
    onImport: (file: File, id: string) => Promise<boolean>;
    onLock: () => void;
    isBiometricSupportAvailable: boolean;
    isBiometricEnabled: boolean;
    onRegisterBiometric: () => Promise<boolean>;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
    vaultId, 
    onExport, 
    onImport,
    onLock, 
    isBiometricSupportAvailable, 
    isBiometricEnabled, 
    onRegisterBiometric 
}) => {
    const navigate = useNavigate();
    const [isRegistering, setIsRegistering] = useState(false);
    const [registerStatus, setRegisterStatus] = useState<'success' | 'error' | null>(null);
    const [importId, setImportId] = useState('');
    const [importError, setImportError] = useState<string | null>(null);
    const [importSuccess, setImportSuccess] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleRegisterClick = async () => {
        setIsRegistering(true);
        setRegisterStatus(null);
        const success = await onRegisterBiometric();
        setRegisterStatus(success ? 'success' : 'error');
        setIsRegistering(false);
        setTimeout(() => setRegisterStatus(null), 3000);
    };

     const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!importId.trim()) {
            setImportError('Please enter the Vault ID for the backup file before selecting it.');
            return;
        }
        setImportError(null);
        setImportSuccess(null);
        try {
            const success = await onImport(file, importId);
            if (success) {
                setImportSuccess('Vault imported successfully! You are now using the new vault.');
            } else {
                setImportError('Import failed. The Vault ID did not match the backup file.');
            }
        } catch (err) {
            setImportError('Import failed. The file may be corrupt or invalid.');
        }
    };

    const triggerFileSelect = () => {
        if (!importId.trim()) {
            setImportError('Please enter the Vault ID for the backup file first.');
            return;
        }
        setImportError(null);
        setImportSuccess(null);
        fileInputRef.current?.click();
    };

    return (
        <motion.div
            className="flex flex-col h-full text-white"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3 }}
        >
            <header className="flex items-center p-4">
                <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <h2 className="text-2xl font-bold ml-4">Settings</h2>
            </header>
            <div className="flex-grow overflow-y-auto px-4 pb-24 space-y-6">

                <div className="bg-blue-900/30 border border-blue-500/50 p-4 rounded-xl">
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Info /> Your Vault ID is Your Key</h3>
                    <p className="text-sm text-white/70 mb-3">
                        Your Vault ID is the master key to all your data. It's the unique identifier for your encrypted data on this device.
                    </p>
                    <p className="text-sm text-white/70 mb-3">
                        <b>You must remember it.</b> If you switch to a new phone or reinstall the app, you will need this exact ID to import your backup file and regain access.
                    </p>
                    <p className="text-sm font-semibold text-amber-300">
                        Keep it secret, keep it safe! Do not share it with anyone.
                    </p>
                </div>

                 <div className="bg-black/20 p-4 rounded-xl">
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><User />My Profile</h3>
                    <p className="text-sm text-white/70 mb-3">
                        This is your unique Vault ID. You will need it to import your backups on other devices.
                    </p>
                     <div className="bg-gray-800 p-3 rounded-lg font-mono text-xs break-all text-center text-white/80">
                        {vaultId || 'N/A'}
                    </div>
                </div>

                 {isBiometricSupportAvailable && (
                    <div className="bg-black/20 p-4 rounded-xl">
                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Fingerprint />Security</h3>
                        <p className="text-sm text-white/70 mb-4">
                            Enable fingerprint or face recognition for quick and secure access to your vault.
                        </p>
                        <button
                            onClick={handleRegisterClick}
                            disabled={isBiometricEnabled || isRegistering}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            {isRegistering ? 'Follow Browser Prompt...' : (isBiometricEnabled ? 'Fingerprint Enabled' : 'Enable Fingerprint Login')}
                        </button>
                        {registerStatus === 'success' && <p className="text-green-400 text-sm mt-2 text-center">Biometric login enabled successfully!</p>}
                        {registerStatus === 'error' && <p className="text-red-400 text-sm mt-2 text-center">Failed to enable. Please try again.</p>}
                    </div>
                 )}

                <div className="bg-black/20 p-4 rounded-xl">
                    <div>
                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Upload /> Import Vault</h3>
                        <p className="text-sm text-white/70 mb-4">
                            Restore a vault from a backup file. <b className="text-amber-300">This will lock your current vault and replace it with the imported data.</b>
                        </p>
                        <div className="space-y-4">
                            <input
                                type="password"
                                placeholder="Enter Vault ID from Backup"
                                value={importId}
                                onChange={(e) => setImportId(e.target.value)}
                                className="w-full bg-gray-800 p-3 rounded-lg font-mono text-xs text-center focus:ring-sky-500 focus:border-sky-500"
                                aria-label="Vault ID from backup"
                            />
                            <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                            <button
                                onClick={triggerFileSelect}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 transition-colors font-semibold"
                            >
                                <Upload size={20} />
                                Select Backup File (.json)
                            </button>
                        </div>
                        {importError && <p className="text-red-400 text-sm mt-2 text-center">{importError}</p>}
                        {importSuccess && <p className="text-green-400 text-sm mt-2 text-center">{importSuccess}</p>}
                    </div>

                    <hr className="border-white/10 my-6" />

                    <div>
                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Download /> Export Vault</h3>
                        <p className="text-sm text-white/70 mb-4">
                            Download a backup of your vault. Keep this file and your Vault ID safe.
                        </p>
                        <button
                            onClick={onExport}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors font-semibold"
                        >
                            <Download size={20} />
                            Export Data
                        </button>
                    </div>
                </div>

                <div className="bg-red-900/50 border border-red-500/50 p-4 rounded-xl">
                     <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><ShieldAlert /> Danger Zone</h3>
                      <p className="text-sm text-white/70 mb-4">
                        Locking the vault will require you to enter your Vault ID again to access your data.
                    </p>
                    <button
                        onClick={onLock}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 transition-colors font-semibold"
                    >
                        <LogOut size={20} />
                        Lock Vault
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default SettingsView;