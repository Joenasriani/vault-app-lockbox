

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Settings, Search, X } from 'lucide-react';
import { VaultData } from '../types';
import { APP_CONFIG, AppKey } from '../constants';

interface AppIconProps {
    appKey: AppKey | 'settings';
    count?: number;
    onClick: (key: AppKey | 'settings') => void;
}

const AppIcon: React.FC<AppIconProps> = ({ appKey, count, onClick }) => {
    const isSpecial = appKey === 'settings';
    const config = isSpecial ? null : APP_CONFIG[appKey];
    
    const title = isSpecial ? 'Settings' : config!.title;
    const Icon = isSpecial ? Settings : config!.Icon;
    const color = isSpecial ? 'from-gray-700 to-gray-600' : config!.color;

    return (
        <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-2 cursor-pointer group"
            onClick={() => onClick(appKey)}
        >
            <div className={`relative w-20 h-20 rounded-3xl bg-gradient-to-br ${color} shadow-lg flex items-center justify-center`}>
                <div className="absolute inset-0 bg-white/10 rounded-3xl backdrop-blur-sm"></div>
                <Icon size={40} className="text-white z-10 drop-shadow-lg" />
                {typeof count !== 'undefined' && count > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-black/20">
                        {count}
                    </div>
                )}
            </div>
            <span className="text-sm font-medium text-white/90 drop-shadow-md">{title}</span>
        </motion.div>
    );
};

interface HomeScreenProps {
    vaultData: VaultData | null;
    onAppSelect: (appKey: AppKey | 'settings') => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ vaultData, onAppSelect }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    const allItems = useMemo(() => {
        if (!vaultData) return [];
        return (Object.keys(APP_CONFIG) as AppKey[]).flatMap(key => 
            vaultData[key].map(item => ({ ...item, categoryKey: key }))
        );
    }, [vaultData]);

    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const lowercasedQuery = searchQuery.toLowerCase();
        return allItems.filter(item => 
            item.title.toLowerCase().includes(lowercasedQuery) ||
            APP_CONFIG[item.categoryKey].title.toLowerCase().includes(lowercasedQuery)
        );
    }, [searchQuery, allItems]);


    return (
        <div className="flex flex-col h-full overflow-hidden">
             <header className="text-center py-8 landscape:py-4 flex-shrink-0">
                <h1 className="text-4xl landscape:text-3xl font-bold tracking-tighter text-white drop-shadow-lg">LockBox</h1>
                <p className="text-white/70 mt-1 landscape:hidden">Your secure, offline-first vault.</p>
            </header>
            
            <div className="px-4 md:px-0 mb-4 flex-shrink-0">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={20} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search vault..."
                        className="w-full bg-black/20 backdrop-blur-md border border-white/10 rounded-full pl-12 pr-12 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>
            
            <div className="flex-grow overflow-y-auto px-4 pb-24">
                {searchQuery.trim() ? (
                    <motion.div initial={{opacity: 0}} animate={{opacity: 1}}>
                        <h2 className="text-white/80 font-bold mb-4 px-2">Search Results ({filteredItems.length})</h2>
                        {filteredItems.length > 0 ? (
                            <ul className="space-y-3">
                                {filteredItems.map(item => {
                                    const config = APP_CONFIG[item.categoryKey];
                                    return (
                                        <motion.li 
                                            key={item.id}
                                            onClick={() => navigate(`/${item.categoryKey}`)}
                                            className="bg-black/20 backdrop-blur-md p-4 rounded-xl shadow-lg flex items-center group cursor-pointer hover:bg-black/40 transition-colors"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                        >
                                            <div className="w-12 h-12 bg-white/10 rounded-md mr-4 flex-shrink-0 flex items-center justify-center">
                                                <config.Icon className="text-white/70" size={28}/>
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <h3 className="font-bold text-lg truncate">{item.title}</h3>
                                                <p className="text-sm text-white/70">{config.title}</p>
                                            </div>
                                        </motion.li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="text-center text-white/50 mt-8">No results found.</p>
                        )}
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-2 landscape:grid-cols-3 gap-8 landscape:gap-6 p-4 content-start">
                        {(Object.keys(APP_CONFIG) as AppKey[]).map((key) => (
                            <AppIcon
                                key={key}
                                appKey={key}
                                count={vaultData?.[key]?.length || 0}
                                onClick={onAppSelect}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomeScreen;