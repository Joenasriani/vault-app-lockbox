

import React from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useVault, VaultStatus } from './hooks/useVault';
import HomeScreen from './components/HomeScreen';
import VaultView from './components/VaultView';
import SettingsView from './components/SettingsView';
import UnlockScreen from './components/UnlockScreen';
import { APP_CONFIG, AppKey } from './constants';
import { Home, Settings } from 'lucide-react';

const App: React.FC = () => {
    const { 
        vaultStatus, 
        vaultId, 
        vaultData, 
        initializeVault, 
        confirmInitialization,
        cancelInitialization,
        unlockVault, 
        lockVault, 
        updateVaultData, 
        exportVault, 
        importVault,
        isBiometricSupportAvailable,
        isBiometricEnabled,
        registerBiometric,
        authenticateWithBiometric
    } = useVault();

    if (vaultStatus === VaultStatus.LOCKED || vaultStatus === VaultStatus.AWAITING_CONFIRMATION) {
        return <UnlockScreen 
            status={vaultStatus}
            onInitialize={initializeVault}
            onConfirm={confirmInitialization}
            onCancel={cancelInitialization}
            onUnlock={unlockVault}
            onImport={importVault}
            onBiometricUnlock={authenticateWithBiometric}
            isBiometricSupportAvailable={isBiometricSupportAvailable()}
        />;
    }

    if (vaultStatus === VaultStatus.LOADING) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-gray-900 text-white">
                Loading Vault...
            </div>
        );
    }

    return (
        <div className="w-screen h-screen overflow-hidden bg-cover bg-center" style={{ backgroundImage: "url('https://picsum.photos/1080/1920?blur=10')" }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-md"></div>
            <main className="relative z-10 h-full flex flex-col font-sans text-white p-4 max-w-lg mx-auto landscape:max-w-5xl">
                 <HashRouter>
                    <AppContent
                        vaultId={vaultId}
                        vaultData={vaultData}
                        updateVaultData={updateVaultData}
                        exportVault={exportVault}
                        importVault={importVault}
                        lockVault={lockVault}
                        isBiometricSupportAvailable={isBiometricSupportAvailable()}
                        isBiometricEnabled={isBiometricEnabled}
                        registerBiometric={registerBiometric}
                    />
                </HashRouter>
            </main>
        </div>
    );
};


interface AppContentProps extends Omit<React.ComponentProps<typeof HomeScreen>, 'onAppSelect'> {
    vaultId: string | null;
    lockVault: () => void;
    exportVault: () => void;
    importVault: (file: File, id: string) => Promise<boolean>;
    updateVaultData: (newData: any) => void;
    isBiometricSupportAvailable: boolean;
    isBiometricEnabled: boolean;
    registerBiometric: () => Promise<boolean>;
}

const AppContent: React.FC<AppContentProps> = ({ 
    vaultId, 
    vaultData, 
    updateVaultData, 
    exportVault, 
    importVault,
    lockVault,
    isBiometricSupportAvailable,
    isBiometricEnabled,
    registerBiometric
}) => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleAppSelect = (appKey: AppKey | 'settings') => {
        navigate(`/${appKey}`);
    };
    
    return (
        <>
            <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                    <Route path="/" element={
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.3 }}
                        >
                            <HomeScreen vaultData={vaultData} onAppSelect={handleAppSelect} />
                        </motion.div>
                    }/>
                    {Object.keys(APP_CONFIG).map(key => (
                        <Route key={key} path={`/${key}`} element={
                             <VaultView
                                appKey={key as AppKey}
                                items={vaultData?.[key as AppKey] || []}
                                updateItems={(newItems) => {
                                    if (vaultData) {
                                        updateVaultData({ ...vaultData, [key]: newItems });
                                    }
                                }}
                            />
                        }/>
                    ))}
                    <Route path="/settings" element={
                        <SettingsView 
                            vaultId={vaultId} 
                            onExport={exportVault} 
                            onImport={importVault}
                            onLock={lockVault} 
                            isBiometricSupportAvailable={isBiometricSupportAvailable}
                            isBiometricEnabled={isBiometricEnabled}
                            onRegisterBiometric={registerBiometric}
                        />} 
                    />
                </Routes>
            </AnimatePresence>

            <nav className="mt-auto flex justify-around items-center bg-black/30 backdrop-blur-lg rounded-full p-2 sticky bottom-4">
                <button onClick={() => navigate('/')} className={`p-3 rounded-full transition-colors ${location.pathname === '/' ? 'bg-indigo-500' : 'hover:bg-white/10'}`}>
                    <Home size={24} />
                </button>
                <button onClick={() => navigate('/settings')} className={`p-3 rounded-full transition-colors ${location.pathname === '/settings' ? 'bg-indigo-500' : 'hover:bg-white/10'}`}>
                    <Settings size={24} />
                </button>
            </nav>
        </>
    );
};

export default App;