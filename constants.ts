import { VaultData, AppConfig } from './types';
import { KeyRound, CreditCard, Link, NotebookText, Image, FileBadge } from 'lucide-react';

export type AppKey = keyof VaultData;

export const APP_CONFIG: Record<AppKey, AppConfig> = {
    passwords: {
        title: 'Passwords',
        Icon: KeyRound,
        color: 'from-blue-500 to-cyan-400',
        fields: [
            { name: 'title', label: 'Title', type: 'text', required: true },
            { name: 'website', label: 'Website', type: 'url', required: true },
            { name: 'username', label: 'Username', type: 'text', required: true },
            { name: 'password', label: 'Password', type: 'password', required: false },
        ]
    },
    cards: {
        title: 'Cards',
        Icon: CreditCard,
        color: 'from-green-500 to-emerald-400',
        fields: [
            { name: 'title', label: 'Card Nickname', type: 'text', required: true },
            { name: 'cardHolder', label: 'Card Holder', type: 'text', required: true },
            { name: 'cardNumber', label: 'Card Number', type: 'text', required: true },
            { name: 'expiryDate', label: 'Expiry (MM/YY)', type: 'text', required: true },
            { name: 'cvv', label: 'CVV', type: 'password', required: true },
            { name: 'cardFrontData', label: 'Card Front Photo', type: 'file', required: false, accept: 'image/*' },
            { name: 'cardBackData', label: 'Card Back Photo', type: 'file', required: false, accept: 'image/*' },
        ]
    },
    links: {
        title: 'Bookmarks',
        Icon: Link,
        color: 'from-yellow-500 to-amber-400',
        fields: [
            { name: 'title', label: 'Title', type: 'text', required: true },
            { name: 'url', label: 'URL', type: 'url', required: true },
        ]
    },
    notes: {
        title: 'Notes',
        Icon: NotebookText,
        color: 'from-purple-500 to-violet-400',
        fields: [
            { name: 'title', label: 'Title', type: 'text', required: true },
            { name: 'content', label: 'Content', type: 'richtext', required: true, rows: 10 },
        ]
    },
    media: {
        title: 'Media',
        Icon: Image,
        color: 'from-rose-500 to-pink-400',
        fields: [
            { name: 'title', label: 'Title', type: 'text', required: true },
            { name: 'data', label: 'Photo(s) or Video', type: 'file', required: true, accept: 'image/*,video/*', multiple: true },
        ]
    },
    identities: {
        title: 'Identity',
        Icon: FileBadge,
        color: 'from-orange-500 to-amber-400',
        fields: [
            { 
                name: 'documentType', 
                label: 'Document Type', 
                type: 'select', 
                required: true, 
                options: ['ID Photo', 'Passport Copy', 'ID Card', 'License', 'Other'] 
            },
            { name: 'title', label: 'Document Name', type: 'text', required: true },
            { name: 'images', label: 'Document Photo(s)', type: 'file', required: true, accept: 'image/*', multiple: true },
        ]
    }
};