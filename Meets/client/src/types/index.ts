export interface User {
    id: number;
    username: string;
    name: string;
    age: number;
    gender: string;
    bio: string;
    image_url: string;
    interests: string[];
    // Chat Metadata
    last_message?: string;
    last_message_time?: string;
    unread_count?: number;
}

export interface Message {
    id: number;
    from: string;
    content: string;
    created_at: string; // ISO string
    is_read: boolean;
}

export interface Profile extends User {
    // Add any profile-specific fields if they differ from User
}

export interface LoginResponse {
    token: string;
    username: string;
}
