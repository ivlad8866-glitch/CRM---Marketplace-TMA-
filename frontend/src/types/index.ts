/* ================================================================
   Shared types for the CRM Chat frontend
   ================================================================ */

export type ClientTab = "catalog" | "services" | "chats" | "chat" | "profile";
export type AdminTab = "dashboard" | "tickets" | "chats" | "chat" | "more";
export type AdminMoreScreen =
  | "menu"
  | "services"
  | "templates"
  | "team"
  | "settings";

export type ServiceSubTab = "services" | "ads";

export type TicketStatus =
  | "new"
  | "in_progress"
  | "waiting_customer"
  | "resolved"
  | "closed"
  | "spam"
  | "duplicate";

export type Ticket = {
  id: string;
  clientNumber: string;
  title: string;
  status: TicketStatus;
  lastMessage: string;
  updatedAt: string;
  slaMinutes: number;
  service: string;
};

export type MessageType = "text" | "voice" | "sticker" | "image" | "file";

export type Message = {
  id: string;
  author: "customer" | "agent" | "system";
  text: string;
  time: string;
  type: MessageType;
  voiceDuration?: number;
  voiceUrl?: string;
  sticker?: string;
  imageUrl?: string;
  imageName?: string;
  fileName?: string;
  fileSize?: string;
};

export type Service = {
  id: string;
  name: string;
  description: string;
  sla: number;
  agents: number;
  price?: number | null;
  currency?: string;
};

export type Channel = {
  id: string;
  name: string;
  type: "Mini App" | "Bot" | "Канал" | "Провайдер";
  description: string;
  owner: string;
  icon: string;
  color: string;
  services: Service[];
  rating: number;
  reviewCount: number;
};

export type Ad = {
  id: string;
  channelId: string;
  channelName: string;
  channelIcon: string;
  channelColor: string;
  title: string;
  description: string;
  image: string;
  price: number | null;
  currency: string;
  link: string;
};

export type StickerCategory = {
  icon: string;
  label: string;
  stickers: string[];
};
