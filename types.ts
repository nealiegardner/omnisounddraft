
export enum Speaker {
  USER = 'USER',
  AI = 'SNIPER_AI',
  UNKNOWN = 'UNKNOWN'
}

export interface Message {
  id: string;
  speaker: Speaker;
  text: string;
  timestamp: number;
}

export interface SniperResponse {
  raw: string;
  isSilent: boolean;
  timestamp: number;
  sources?: string[];
}

export interface LiveConnectionState {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  volume: number;
}

export const DEFAULT_KNOWLEDGE = `- Q3 Revenue: $4.2M (Up 10% YoY)
- Sacramento Deal Budget: $73,500k
- Past Transcript Snippet: "Actually agreed on 73,500k."
- Latest News Summary: "There was a large peace protest in Paris at the Louvre yesterday."
- Project Alpha Deadline: November 15th
- CEO Name: Elena Rodriguez`;
