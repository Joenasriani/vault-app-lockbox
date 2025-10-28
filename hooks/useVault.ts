import { useState, useEffect, useCallback } from 'react';
import { VaultData } from '../types';

// Fix: Implement custom base64 encoding/decoding functions as per guidelines, instead of using a library.
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export enum VaultStatus {
    LOADING,
    LOCKED,
    UNLOCKED,
    AWAITING_CONFIRMATION,
}

const VAULT_ID_KEY = 'lockbox_vault_id';
const BIOMETRIC_CREDENTIALS_KEY = 'lockbox_biometric_credentials';

const getVaultDataFromStorage = (vaultId: string): VaultData | null => {
    const rawData = localStorage.getItem(vaultId);
    if (!rawData) return null;
    try {
        return JSON.parse(atob(rawData));
    } catch (error) {
        console.error("Failed to parse vault data:", error);
        return null;
    }
};

const setVaultDataInStorage = (vaultId: string, data: VaultData) => {
    try {
        localStorage.setItem(vaultId, btoa(JSON.stringify(data)));
    } catch (error) {
        console.error("Failed to save vault data:", error);
    }
};

const getBiometricCredentials = (): Record<string, string> => {
    const data = localStorage.getItem(BIOMETRIC_CREDENTIALS_KEY);
    return data ? JSON.parse(data) : {};
};

const setBiometricCredentials = (creds: Record<string, string>) => {
    localStorage.setItem(BIOMETRIC_CREDENTIALS_KEY, JSON.stringify(creds));
};

export const useVault = () => {
    const [vaultId, setVaultId] = useState<string | null>(null);
    const [vaultData, setVaultData] = useState<VaultData | null>(null);
    const [vaultStatus, setVaultStatus] = useState<VaultStatus>(VaultStatus.LOADING);
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);

     useEffect(() => {
        if (vaultId) {
            const credentials = getBiometricCredentials();
            const isEnabled = Object.values(credentials).includes(vaultId);
            setIsBiometricEnabled(isEnabled);
        } else {
            setIsBiometricEnabled(false);
        }
    }, [vaultId]);

    useEffect(() => {
        const storedId = localStorage.getItem(VAULT_ID_KEY);
        if (storedId) {
            setVaultId(storedId);
            const data = getVaultDataFromStorage(storedId);
            if (data) {
                setVaultData(data);
                setVaultStatus(VaultStatus.UNLOCKED);
            } else {
                setVaultStatus(VaultStatus.LOCKED);
            }
        } else {
            setVaultStatus(VaultStatus.LOCKED);
        }
    }, []);

    const setupVault = useCallback((id: string, data: VaultData) => {
        localStorage.setItem(VAULT_ID_KEY, id);
        setVaultDataInStorage(id, data);
        setVaultId(id);
        setVaultData(data);
        setVaultStatus(VaultStatus.UNLOCKED);
    }, []);

    const initializeVault = useCallback((): string => {
        const newId = crypto.randomUUID();
        setPendingId(newId);
        setVaultStatus(VaultStatus.AWAITING_CONFIRMATION);
        return newId;
    }, []);
    
    const confirmInitialization = useCallback(() => {
        if (pendingId) {
            const initialData: VaultData = { passwords: [], cards: [], links: [], notes: [], media: [], identities: [] };
            setupVault(pendingId, initialData);
            setPendingId(null);
        }
    }, [pendingId, setupVault]);

    const cancelInitialization = useCallback(() => {
        setPendingId(null);
        setVaultStatus(VaultStatus.LOCKED);
    }, []);

    const unlockVault = useCallback((idToTry: string): boolean => {
        const data = getVaultDataFromStorage(idToTry);
        if (data) {
            localStorage.setItem(VAULT_ID_KEY, idToTry);
            setVaultId(idToTry);
            setVaultData(data);
            setVaultStatus(VaultStatus.UNLOCKED);
            return true;
        }
        return false;
    }, []);

    const lockVault = useCallback(() => {
        localStorage.removeItem(VAULT_ID_KEY);
        setVaultId(null);
        setVaultData(null);
        setVaultStatus(VaultStatus.LOCKED);
    }, []);

    const updateVaultData = useCallback((newData: VaultData) => {
        if (vaultId) {
            setVaultData(newData);
            setVaultDataInStorage(vaultId, newData);
        }
    }, [vaultId]);

    const exportVault = useCallback(() => {
        if (vaultId && vaultData) {
            const dataStr = JSON.stringify({ [vaultId]: vaultData }, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            const exportFileDefaultName = `lockbox_backup_${vaultId}.json`;
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
        }
    }, [vaultId, vaultData]);

    const importVault = useCallback(async (file: File, idToVerify: string): Promise<boolean> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const text = event.target?.result;
                    if (typeof text !== 'string') {
                        reject(new Error("File content is not readable"));
                        return;
                    }
                    const parsedData = JSON.parse(text);
                    if (parsedData[idToVerify]) {
                        const dataToImport: VaultData = parsedData[idToVerify];
                        
                        // Migration for identities from single image to multi-image
                        if (dataToImport.identities && Array.isArray(dataToImport.identities)) {
                            dataToImport.identities = dataToImport.identities.map((item: any) => {
                                if (item.data && item.thumbnail && !item.images) {
                                    // This is an old format item, convert it
                                    return {
                                        ...item,
                                        images: [{ data: item.data, thumbnail: item.thumbnail }],
                                        data: undefined,
                                        thumbnail: undefined,
                                    };
                                }
                                return item;
                            });
                        }
                        
                        // Migration for media from single image to multi-image
                        if (dataToImport.media && Array.isArray(dataToImport.media)) {
                            dataToImport.media = dataToImport.media.map((item: any) => {
                                // If it's an image with the old structure
                                if (item.type === 'image' && item.data && item.thumbnail && !item.images) {
                                    return {
                                        ...item,
                                        images: [{ data: item.data, thumbnail: item.thumbnail }],
                                        data: undefined,
                                        thumbnail: undefined,
                                    };
                                }
                                return item;
                            });
                        }

                        // ensure all categories exist
                        const sanitizedData = {
                            passwords: [],
                            cards: [],
                            links: [],
                            notes: [],
                            media: [],
                            identities: [],
                            ...dataToImport
                        };
                        setupVault(idToVerify, sanitizedData);
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                } catch (error) {
                    console.error("Import failed:", error);
                    reject(error);
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    }, [setupVault]);

    // Biometrics
    const isBiometricSupportAvailable = useCallback(() => {
        return !!(window.PublicKeyCredential);
    }, []);

    const registerBiometric = useCallback(async (): Promise<boolean> => {
        if (!vaultId || !isBiometricSupportAvailable()) return false;
        
        try {
            const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
                challenge: crypto.getRandomValues(new Uint8Array(32)),
                rp: {
                    name: "LockBox",
                    id: window.location.hostname,
                },
                user: {
                    id: crypto.getRandomValues(new Uint8Array(32)),
                    name: `user-${vaultId}`,
                    displayName: `LockBox User`,
                },
                pubKeyCredParams: [{ alg: -7, type: 'public-key' }], // ES256
                authenticatorSelection: {
                    authenticatorAttachment: 'platform',
                    userVerification: 'required',
                },
                timeout: 60000,
                attestation: 'none'
            };

            const credential = await navigator.credentials.create({ publicKey: publicKeyCredentialCreationOptions });
            
            if (credential) {
                // FIX: Cast credential to PublicKeyCredential to access rawId
                // Fix: Use custom encode function and handle ArrayBuffer to Uint8Array conversion.
                const credentialId = encode(new Uint8Array((credential as PublicKeyCredential).rawId));
                const credentials = getBiometricCredentials();
                credentials[credentialId] = vaultId;
                setBiometricCredentials(credentials);
                setIsBiometricEnabled(true);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Biometric registration failed:", error);
            return false;
        }
    }, [vaultId, isBiometricSupportAvailable]);

    const authenticateWithBiometric = useCallback(async (): Promise<boolean> => {
        if (!isBiometricSupportAvailable()) return false;

        const credentials = getBiometricCredentials();
        const credentialIds = Object.keys(credentials);
        if (credentialIds.length === 0) return false;

        try {
            const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
                challenge: crypto.getRandomValues(new Uint8Array(32)),
                allowCredentials: credentialIds.map(id => ({
                    // Fix: Use custom decode function.
                    id: decode(id),
                    type: 'public-key',
                })),
                timeout: 60000,
                userVerification: 'required',
            };

            const assertion = await navigator.credentials.get({ publicKey: publicKeyCredentialRequestOptions });

            if (assertion) {
                // FIX: Cast assertion to PublicKeyCredential to access rawId
                // Fix: Use custom encode function and handle ArrayBuffer to Uint8Array conversion.
                const credentialId = encode(new Uint8Array((assertion as PublicKeyCredential).rawId));
                const associatedVaultId = credentials[credentialId];
                if (associatedVaultId) {
                    return unlockVault(associatedVaultId);
                }
            }
            return false;
        } catch (error) {
            console.error("Biometric authentication failed:", error);
            return false;
        }
    }, [isBiometricSupportAvailable, unlockVault]);

    return { 
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
    };
};