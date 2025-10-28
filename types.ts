import { LucideIcon } from 'lucide-react';

export interface BaseItem {
    id: string;
    title: string;
    iconUrl?: string;
    createdAt: string;
}

export interface PasswordItem extends BaseItem {
    username: string;
    password?: string;
    website: string;
}

export interface CardItem extends BaseItem {
    cardNumber: string;
    expiryDate: string;
    cvv: string;
    cardHolder: string;
    cardFrontData?: string; // base64 encoded full image
    cardFrontThumbnail?: string; // base64 encoded thumbnail
    cardBackData?: string; // base64 encoded full image
    cardBackThumbnail?: string; // base64 encoded thumbnail
}

export interface LinkItem extends BaseItem {
    url: string;
}

export interface NoteItem extends BaseItem {
    content: string;
}

export interface DocumentImage {
    data: string; // base64 encoded full image
    thumbnail: string; // base64 encoded thumbnail
}

export interface MediaItem extends BaseItem {
    type: 'image' | 'video';
    // For type 'image', 'images' will be populated.
    images?: DocumentImage[];
    // For type 'video', 'data' and 'thumbnail' will be populated.
    data?: string; // base64 encoded video
    thumbnail?: string; // base64 encoded video thumbnail
}

export interface IdentityItem extends BaseItem {
    documentType: string;
    images: DocumentImage[];
}

export type VaultItem = PasswordItem | CardItem | LinkItem | NoteItem | MediaItem | IdentityItem;

export type VaultData = {
    passwords: PasswordItem[];
    cards: CardItem[];
    links: LinkItem[];
    notes: NoteItem[];
    media: MediaItem[];
    identities: IdentityItem[];
};

export interface AppConfig {
    title: string;
    Icon: LucideIcon;
    color: string;
    fields: {
        name: keyof PasswordItem | keyof CardItem | keyof LinkItem | keyof NoteItem | keyof MediaItem | keyof IdentityItem;
        label: string;
        // Fix: Added 'richtext' to the union type to allow for rich text fields, resolving the TypeScript error in constants.ts.
        type: 'text' | 'password' | 'textarea' | 'url' | 'file' | 'select' | 'richtext';
        required: boolean;
        accept?: string; // For file inputs
        options?: string[]; // For select inputs
        rows?: number; // For textarea
        multiple?: boolean; // For file inputs
    }[];
}
