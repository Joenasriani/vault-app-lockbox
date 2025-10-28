import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Edit, Trash2, X, Eye, EyeOff, PlayCircle, Sparkles, ChevronLeft, ChevronRight, LayoutGrid, Square } from 'lucide-react';
import { VaultItem, BaseItem, MediaItem, IdentityItem, CardItem, DocumentImage } from '../types';
import { APP_CONFIG, AppKey } from '../constants';
import Modal from './Modal';
import { fetchWebsiteTitle } from '../services/geminiService';

type ItemFormData = Omit<BaseItem, 'id' | 'createdAt'> & Record<string, any>;

interface VaultViewProps {
    appKey: AppKey;
    items: VaultItem[];
    updateItems: (newItems: VaultItem[]) => void;
}

const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});

const processImageFile = async (file: File): Promise<DocumentImage> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 200; // Thumbnail width
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
                resolve({ data: e.target?.result as string, thumbnail });
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const generateVideoThumbnail = (videoFile: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        video.onloadeddata = () => {
            video.currentTime = 1; // Seek to 1 second
        };

        video.onseeked = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            resolve(canvas.toDataURL('image/jpeg', 0.5)); // 50% quality JPEG
            URL.revokeObjectURL(video.src);
        };

        video.onerror = (e) => {
            reject("Error loading video for thumbnail generation.");
            URL.revokeObjectURL(video.src);
        };

        video.src = URL.createObjectURL(videoFile);
    });
};

const processMediaFile = async (file: File): Promise<Pick<MediaItem, 'type' | 'thumbnail' | 'data'>> => {
    const type = file.type.startsWith('image/') ? 'image' : 'video';
    const data = await fileToBase64(file);
    let thumbnail = data;
    if (type === 'video') {
        try {
            thumbnail = await generateVideoThumbnail(file);
        } catch (error) {
            console.error(error);
            // Fallback thumbnail if generation fails
            thumbnail = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22white%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22m22 8-6 4 6 4V8Z%22/><path d=%22M2 8v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z%22/></svg>';
        }
    } else { // It's an image, create a proper thumbnail
        try {
           const processed = await processImageFile(file);
           thumbnail = processed.thumbnail;
        } catch (error) {
            console.error("Could not process image for thumbnail:", error);
        }
    }
    return { type, thumbnail, data };
};


const VaultView: React.FC<VaultViewProps> = ({ appKey, items, updateItems }) => {
    const navigate = useNavigate();
    const config = APP_CONFIG[appKey];
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewingItem, setViewingItem] = useState<VaultItem | null>(null);
    const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
    const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

    const handleOpenModal = (item: VaultItem | null = null) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };
    
    const handleViewItem = (item: VaultItem) => {
        if ('data' in item || 'cardFrontData' in item || 'images' in item) {
            setViewingItem(item);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingItem(null);
        setViewingItem(null);
    };

    const handleSaveItem = (formData: ItemFormData) => {
        if (editingItem) {
            const updatedItems = items.map(item =>
                item.id === editingItem.id ? { ...item, ...formData } : item
            );
            updateItems(updatedItems);
        } else {
            const newItem: VaultItem = {
                ...formData,
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
            } as VaultItem;
            updateItems([...items, newItem]);
        }
        handleCloseModal();
    };

    const handleDeleteItem = (id: string) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            updateItems(items.filter(item => item.id !== id));
        }
    };
    
    const togglePasswordVisibility = (id: string) => {
        setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const initialFormData = config.fields.reduce((acc, field) => {
        if(field.name === 'images') {
            acc[field.name] = [];
        } else {
            acc[field.name] = '';
        }
        return acc;
    }, {} as ItemFormData);

    const renderDefaultView = () => (
        <ul className="space-y-3">
            {items.map(item => (
                <li key={item.id} className="bg-black/20 backdrop-blur-md p-4 rounded-xl shadow-lg flex items-center group">
                    <div className="w-12 h-12 bg-white/10 rounded-md mr-4 flex-shrink-0 flex items-center justify-center">
                        {(() => {
                            const cardItem = item as CardItem;
                            if (appKey === 'cards' && cardItem.cardFrontThumbnail) {
                                return <img src={cardItem.cardFrontThumbnail} onClick={() => handleViewItem(item)} className="w-full h-full object-cover rounded-md cursor-pointer" alt={item.title} />;
                            }
                            if ('iconUrl' in item && item.iconUrl) { // Bookmarks
                                return <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center"><img src={item.iconUrl} alt={`${item.title} icon`} className="w-8 h-8 object-contain" /></div>;
                            }
                            return <config.Icon className="text-white/70" size={28}/>;
                        })()}
                    </div>
                    <div className="flex-grow min-w-0">
                        <h3 className="font-bold text-lg truncate">{item.title}</h3>
                        {Object.entries(item).map(([key, value]) => {
                            if (['id', 'title', 'createdAt', 'iconUrl', 'data', 'thumbnail', 'cardFrontData', 'cardFrontThumbnail', 'cardBackData', 'cardBackThumbnail', 'images'].includes(key) || !value) return null;
                            const fieldConfig = config.fields.find(f => f.name === key);
                            if (!fieldConfig) return null;
                            
                            const isPassword = fieldConfig.type === 'password';
                            const isVisible = showPasswords[item.id];

                            return (
                                <p key={key} className="text-sm text-white/70 flex items-center">
                                    <span className="font-semibold w-28 capitalize flex-shrink-0">{fieldConfig.label}:</span>
                                    {isPassword ? (
                                        <>
                                            <span className="font-mono flex-1">{isVisible ? value : '••••••••'}</span>
                                            <button onClick={() => togglePasswordVisibility(item.id)} className="ml-2 p-1 text-white/50 hover:text-white">
                                                {isVisible ? <EyeOff size={16}/> : <Eye size={16}/>}
                                            </button>
                                        </>
                                    ) : (
                                        <span className="truncate">{value.toString().substring(0, 50)}</span>
                                    )}
                                </p>
                            );
                        })}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                        <button onClick={() => handleOpenModal(item)} className="p-2 text-blue-400 hover:text-blue-300">
                            <Edit size={20} />
                        </button>
                        <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-red-400 hover:text-red-300">
                            <Trash2 size={20} />
                        </button>
                    </div>
                </li>
            ))}
        </ul>
    );

    const renderMediaView = () => (
        <div className="grid grid-cols-3 landscape:grid-cols-5 gap-2">
            {(items as (MediaItem | IdentityItem)[]).map(item => {
                const mediaItem = item as MediaItem;
                const thumb = mediaItem.type === 'video' ? mediaItem.thumbnail : (item as MediaItem | IdentityItem).images?.[0]?.thumbnail;

                return (
                    <motion.div
                        key={item.id}
                        layoutId={`media-${item.id}`}
                        onClick={() => handleViewItem(item)}
                        className="relative aspect-square bg-black/20 rounded-lg overflow-hidden group cursor-pointer"
                        whileHover={{ scale: 1.05 }}
                    >
                        <img src={thumb} alt={item.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 text-white">
                            <div className="flex justify-end gap-1">
                                <button onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }} className="p-1.5 bg-black/50 rounded-full text-blue-300 hover:bg-black/80"><Edit size={14} /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} className="p-1.5 bg-black/50 rounded-full text-red-300 hover:bg-black/80"><Trash2 size={14} /></button>
                            </div>
                            {'type' in item && item.type === 'video' && <PlayCircle size={32} className="self-center mb-4" />}
                            <p className="text-xs font-bold truncate">{item.title}</p>
                        </div>
                    </motion.div>
                )
            })}
        </div>
    );

    return (
        <motion.div
            className="flex flex-col h-full"
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ duration: 0.3 }}
        >
            <header className="flex items-center p-4">
                <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <h2 className="text-2xl font-bold ml-4">{config.title}</h2>
                <button onClick={() => handleOpenModal()} className="ml-auto p-2 bg-indigo-500 rounded-full hover:bg-indigo-400 transition-colors">
                    <Plus size={24} />
                </button>
            </header>
            <div className="flex-grow overflow-y-auto px-4 pb-24">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-white/50">
                        <config.Icon size={64} className="mb-4" />
                        <p>No {config.title.toLowerCase()} yet.</p>
                        <p>Click the '+' button to add one.</p>
                    </div>
                ) : (
                    (appKey === 'media' || appKey === 'identities') ? renderMediaView() : renderDefaultView()
                )}
            </div>

            <AnimatePresence>
                {(isModalOpen && !viewingItem) && (
                    <Modal onClose={handleCloseModal}>
                        <ItemForm
                            appKey={appKey}
                            config={config}
                            initialData={editingItem || initialFormData}
                            onSave={handleSaveItem}
                            onCancel={handleCloseModal}
                        />
                    </Modal>
                )}
                {(viewingItem && appKey === 'media') && (
                     <Modal onClose={handleCloseModal}>
                         {(viewingItem as MediaItem).type === 'video' 
                            ? <MediaViewer item={viewingItem as MediaItem} onClose={handleCloseModal} />
                            : <GalleryViewer item={{...viewingItem, images: (viewingItem as MediaItem).images || []}} onClose={handleCloseModal} />
                        }
                    </Modal>
                )}
                 {(viewingItem && appKey === 'cards') && (
                     <Modal onClose={handleCloseModal}>
                        <CardViewer item={viewingItem as CardItem} onClose={handleCloseModal} />
                    </Modal>
                )}
                 {(viewingItem && appKey === 'identities') && (
                     <Modal onClose={handleCloseModal}>
                        <GalleryViewer item={viewingItem as IdentityItem} onClose={handleCloseModal} />
                    </Modal>
                )}
            </AnimatePresence>
        </motion.div>
    );
};


const ItemForm: React.FC<{
    appKey: AppKey,
    config: typeof APP_CONFIG[AppKey],
    initialData: any,
    onSave: (data: ItemFormData) => void,
    onCancel: () => void
}> = ({ appKey, config, initialData, onSave, onCancel }) => {
    const [formData, setFormData] = useState(initialData);
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);
    const [isFetchingTitle, setIsFetchingTitle] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        setIsProcessingFile(true);
        setFileError(null);

        try {
            if (appKey === 'identities') {
                 const currentImages = formData.images || [];
                 const maxFiles: Record<string, number> = { 'ID Photo': 1, 'Passport Copy': 2, 'ID Card': 2, 'License': 1, 'Other': 3 };
                 const limit = maxFiles[formData.documentType] || 1;

                 if (currentImages.length + files.length > limit) {
                     setFileError(`A max of ${limit} file(s) is allowed for ${formData.documentType}. You have already selected ${currentImages.length}.`);
                     setIsProcessingFile(false);
                     return;
                 }
                const processedImages = await Promise.all(Array.from(files).map(processImageFile));
                setFormData((prev: any) => ({
                    ...prev,
                    images: [...(prev.images || []), ...processedImages],
                    title: prev.title || files[0].name
                }));
            } else if (appKey === 'media') {
                 const firstFile = files[0];
                 if (firstFile.type.startsWith('video/')) {
                     // Handle single video
                     const mediaFileData = await processMediaFile(firstFile);
                     setFormData((prev: any) => ({ ...prev, ...mediaFileData, title: prev.title || firstFile.name, images: [] }));
                 } else {
                     // Handle multiple images
                     const processedImages = await Promise.all(Array.from(files).map(processImageFile));
                     setFormData((prev: any) => ({
                         ...prev,
                         type: 'image',
                         images: [...(prev.images || []), ...processedImages],
                         title: prev.title || files[0].name,
                         data: undefined,
                         thumbnail: undefined,
                     }));
                 }
            } else { // single file logic for cards
                const file = files[0];
                if (appKey === 'cards') {
                    const { data, thumbnail } = await processImageFile(file);
                    if (fieldName === 'cardFrontData') setFormData((prev: any) => ({ ...prev, cardFrontData: data, cardFrontThumbnail: thumbnail }));
                    else if (fieldName === 'cardBackData') setFormData((prev: any) => ({ ...prev, cardBackData: data, cardBackThumbnail: thumbnail }));
                }
            }
        } catch (error) {
            console.error(error);
            setFileError("Could not process the selected file(s).");
        } finally {
            setIsProcessingFile(false);
        }
    };

    const handleRemoveImage = (indexToRemove: number) => {
        setFormData((prev: any) => ({
            ...prev,
            images: prev.images.filter((_: any, index: number) => index !== indexToRemove),
        }));
    };
    
    const handleWebsiteBlur = async (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        let url = e.target.value;
        const apiKey = process.env.API_KEY;

        const isBookmarkOrPassword = appKey === 'passwords' || appKey === 'links';
        const urlField = appKey === 'passwords' ? 'website' : 'url';

        if (isBookmarkOrPassword && e.target.name === urlField && url.trim()) {
            
            // Step 1: Format the URL and update state
            const needsProtocol = !url.startsWith('http://') && !url.startsWith('https://');
            if (needsProtocol) {
                url = `https://${url}`;
                setFormData((prev: any) => ({ ...prev, [urlField]: url }));
            }
            
            // Step 2: Use the (potentially) formatted URL for other actions
            try {
                const fullUrl = url;
                new URL(fullUrl); // Validate URL before making API calls
                 
                if (appKey === 'passwords' && !formData.title.trim() && apiKey) {
                     setIsFetchingTitle(true);
                     try {
                        const suggestedTitle = await fetchWebsiteTitle(fullUrl);
                        if (suggestedTitle) {
                             setFormData((prev: any) => ({ ...prev, title: suggestedTitle }));
                        }
                    } catch (error) { console.error("Failed to fetch website title:", error); } 
                    finally { setIsFetchingTitle(false); }
                }
                
                if(appKey === 'links') {
                    const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(fullUrl).hostname}&sz=64`;
                    setFormData((prev: any) => ({ ...prev, iconUrl: faviconUrl }));
                }

            } catch (_) {
                // If it's not a valid URL after formatting, we just stop here.
                // The user will see the formatted (but invalid) URL in the input.
                return;
            }
        }
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 bg-[#1a1a2e] rounded-xl text-white w-full max-w-md mx-auto flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                 <h3 className="text-2xl font-bold">{initialData.id ? 'Edit' : 'Add'} {config.title}</h3>
                 <button type="button" onClick={onCancel} className="p-1 rounded-full hover:bg-white/10"><X size={20}/></button>
            </div>
           
            <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                <div className="space-y-4">
                    {config.fields.map(field => {
                        if (field.type === 'select') {
                            return (
                                <div key={field.name}>
                                    <label htmlFor={field.name as string} className="block text-sm font-medium text-white/70 mb-1">{field.label}</label>
                                    <select
                                        id={field.name as string}
                                        name={field.name as string}
                                        value={formData[field.name] || ''}
                                        onChange={handleChange}
                                        required={field.required}
                                        className="w-full bg-[#2a2a4a] border border-transparent focus:border-indigo-500 focus:ring-indigo-500 rounded-lg px-3 py-2 transition-colors"
                                    >
                                        <option value="" disabled>Select {field.label}</option>
                                        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                            );
                        }

                        if (field.type === 'file') {
                            return (
                                <div key={field.name}>
                                    <label className="block text-sm font-medium text-white/70 mb-1">{field.label}</label>
                                    <input id={field.name as string} name={field.name as string} type="file" accept={field.accept} multiple={field.multiple} onChange={(e) => handleFilesChange(e, field.name as string)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" required={field.required && !initialData.id}/>
                                    {isProcessingFile && <p className="text-sm text-amber-400 mt-2">Processing file(s)...</p>}
                                    {fileError && <p className="text-sm text-red-400 mt-2">{fileError}</p>}
                                    
                                    {appKey === 'cards' && (
                                        <div className="flex gap-4 mt-2">
                                            {formData.cardFrontThumbnail && ( <div><p className="text-xs text-white/50 mb-1">Front:</p><img src={formData.cardFrontThumbnail} alt="Front Preview" className="max-h-24 rounded"/></div> )}
                                            {formData.cardBackThumbnail && ( <div><p className="text-xs text-white/50 mb-1">Back:</p><img src={formData.cardBackThumbnail} alt="Back Preview" className="max-h-24 rounded"/></div> )}
                                        </div>
                                    )}
                                    {(appKey === 'identities' || (appKey === 'media' && formData.type === 'image')) && formData.images?.length > 0 && (
                                        <div className="mt-2 p-2 bg-black/20 rounded-lg">
                                            <p className="text-xs text-white/50 mb-1">Preview(s):</p>
                                            <div className="flex gap-2 flex-wrap">
                                                {formData.images.map((img: DocumentImage, index: number) => (
                                                    <div key={index} className="relative">
                                                        <img src={img.thumbnail} alt={`Preview ${index + 1}`} className="h-24 rounded object-contain"/>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveImage(index)}
                                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-400 transition-colors"
                                                            aria-label="Remove image"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {appKey === 'media' && formData.type === 'video' && formData.thumbnail && (
                                        <div className="mt-2 p-2 bg-black/20 rounded-lg"> <p className="text-xs text-white/50 mb-1">Preview:</p> <img src={formData.thumbnail} alt="Preview" className="max-h-32 rounded"/> </div>
                                    )}
                                </div>
                            )
                        }
                        const InputComponent = field.type === 'textarea' ? 'textarea' : 'input';
                        const isUrlField = field.type === 'url';
                        const isTitleField = appKey === 'passwords' && field.name === 'title';

                        return (
                            <div key={field.name}>
                                <label htmlFor={field.name as string} className="flex items-center text-sm font-medium text-white/70 mb-1">
                                    {field.label}
                                    {isTitleField && isFetchingTitle && <Sparkles size={16} className="ml-2 text-yellow-400 animate-pulse" />}
                                </label>
                                <InputComponent
                                    id={field.name as string}
                                    name={field.name as string}
                                    type={field.type === 'textarea' ? undefined : field.type}
                                    value={formData[field.name] || ''}
                                    onChange={handleChange}
                                    onBlur={isUrlField ? handleWebsiteBlur : undefined}
                                    required={field.required}
                                    className="w-full bg-[#2a2a4a] border border-transparent focus:border-indigo-500 focus:ring-indigo-500 rounded-lg px-3 py-2 transition-colors"
                                    rows={field.rows || (field.type === 'textarea' ? 4 : undefined)}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="mt-8 flex justify-end gap-4 flex-shrink-0">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors font-semibold" disabled={isProcessingFile}>Save</button>
            </div>
        </form>
    );
};

const MediaViewer: React.FC<{item: MediaItem, onClose: () => void}> = ({ item, onClose }) => {
    return (
         <motion.div
            layoutId={`media-${item.id}`}
            className="w-full max-w-3xl max-h-[80vh] flex flex-col bg-[#10101d] rounded-xl overflow-hidden"
        >
            <header className="p-3 flex justify-between items-center bg-black/20">
                <h3 className="font-bold text-white truncate">{item.title}</h3>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-white"><X size={20} /></button>
            </header>
            <div className="flex-grow flex items-center justify-center p-2">
                 {item.type === 'image' ? (
                    <img src={item.data} alt={item.title} className="max-w-full max-h-[70vh] object-contain" />
                ) : (
                    <video src={item.data} controls autoPlay className="max-w-full max-h-[70vh] object-contain" />
                )}
            </div>
        </motion.div>
    )
};

const GalleryViewer: React.FC<{item: { title: string, images: DocumentImage[] }, onClose: () => void}> = ({ item, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [viewMode, setViewMode] = useState<'slide' | 'tile'>('slide');
    const images = item.images;

    if (!images || images.length === 0) return null;

    const goToPrevious = () => setCurrentIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
    const goToNext = () => setCurrentIndex(prev => prev === images.length - 1 ? 0 : prev + 1);

    return (
        <motion.div
            layoutId={`media-${item.title}`} // use title to be generic
            className="w-full max-w-3xl max-h-[80vh] flex flex-col bg-[#10101d] rounded-xl overflow-hidden"
        >
            <header className="p-3 flex justify-between items-center bg-black/20">
                <h3 className="font-bold text-white truncate">{item.title}</h3>
                <div className="flex items-center gap-2">
                    {images.length > 1 && (
                        <div className="flex items-center bg-black/30 rounded-full p-1 text-white">
                            <button title="Slide View" onClick={() => setViewMode('slide')} className={`p-1 rounded-full ${viewMode === 'slide' ? 'bg-indigo-500' : 'hover:bg-white/10'}`}><Square size={16}/></button>
                            <button title="Tile View" onClick={() => setViewMode('tile')} className={`p-1 rounded-full ${viewMode === 'tile' ? 'bg-indigo-500' : 'hover:bg-white/10'}`}><LayoutGrid size={16}/></button>
                        </div>
                    )}
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-white"><X size={20} /></button>
                </div>
            </header>
            <div className="relative flex-grow flex items-center justify-center p-2 overflow-y-auto">
                {viewMode === 'slide' ? (
                    <>
                        <AnimatePresence initial={false}>
                            <motion.img
                                key={currentIndex}
                                src={images[currentIndex].data}
                                alt={`${item.title} ${currentIndex + 1}`}
                                className="max-w-full max-h-full object-contain"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.2 }}
                            />
                        </AnimatePresence>
                        {images.length > 1 && (
                            <>
                                <button onClick={goToPrevious} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white hover:bg-black/80"><ChevronLeft/></button>
                                <button onClick={goToNext} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white hover:bg-black/80"><ChevronRight/></button>
                                <div className="absolute bottom-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">{`${currentIndex + 1} / ${images.length}`}</div>
                            </>
                        )}
                    </>
                ) : (
                    <motion.div 
                        className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 w-full h-full content-start p-2"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    >
                        {images.map((img, index) => (
                            <motion.div
                                key={index}
                                className="aspect-square bg-black/20 rounded-md overflow-hidden cursor-pointer"
                                whileHover={{ scale: 1.05 }}
                                onClick={() => {
                                    setCurrentIndex(index);
                                    setViewMode('slide');
                                }}
                            >
                                <img src={img.thumbnail} alt={`thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};

const CardViewer: React.FC<{item: CardItem, onClose: () => void}> = ({ item, onClose }) => {
    return (
         <motion.div
            className="w-full max-w-3xl max-h-[80vh] flex flex-col bg-[#10101d] rounded-xl overflow-hidden"
        >
            <header className="p-3 flex justify-between items-center bg-black/20">
                <h3 className="font-bold text-white truncate">{item.title}</h3>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-white"><X size={20} /></button>
            </header>
            <div className="flex-grow flex flex-col md:flex-row items-center justify-center gap-4 p-4 overflow-y-auto">
                {item.cardFrontData && (
                    <div className="text-center">
                        <h4 className="font-semibold mb-2 text-white/80">Front</h4>
                        <img src={item.cardFrontData} alt="Card front" className="max-w-full max-h-[60vh] md:max-h-[50vh] object-contain rounded-lg" />
                    </div>
                )}
                 {item.cardBackData && (
                    <div className="text-center">
                        <h4 className="font-semibold mb-2 text-white/80">Back</h4>
                        <img src={item.cardBackData} alt="Card back" className="max-w-full max-h-[60vh] md:max-h-[50vh] object-contain rounded-lg" />
                    </div>
                )}
            </div>
        </motion.div>
    )
};

export default VaultView;