
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Message, Speaker } from '../types';

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const SYSTEM_INSTRUCTION = `
# ROLE: EAR-AI SNIPER (PROACTIVE INTELLIGENCE)
Operate as a silent background monitor. Use the following logic to determine when to speak.

## CORE LOGIC: QUESTION DETECTION ENGINE (QDE)
- MONITOR ALL AUDIO. TRANSCRIBE CONTINUOUSLY.
- DEFAULT STATE: ABSOLUTE SILENCE. 
- TRIGGER CONDITION: Only strike when a DIRECT, FACTUAL QUESTION is detected.
- QUESTION SCORE: 
    - Lexical Triggers: "What", "When", "How", "Is it true", "Do you know".
    - Syntactic Cues: Auxiliary inversion ("Are we...", "Do you...").
    - Memory Prompts: "I can't remember...", "I'm blanking on...".
- STRIKE DECISION: If Score >= Threshold AND the question is "complete enough" -> Answer immediately.

## STRIKE RULES
- BREVITY IS SURVIVAL: Responses must be "Data Shards" (One word, one number, or a single semicolon-separated list).
- NO FILLER: Prohibited words: "The", "Is", "Searching", "Hello", "Sure", "Let me check".
- EXCLUDE META-QUESTIONS: Do not respond to "What if someone asked...", "He asked what...", or "Imagine asking...".

## LATENCY PROTOCOL
- RESPOND IMMEDIATELY. NO THINKING. 
- PROVIDE RAW INTEL FRAGMENTS.
- ONCE STRUCK, RETURN TO SILENCE IMMEDIATELY.

## INTEL TARGETS (TRIGGER LEXICON)
- Factual queries, calculations, definitions, status checks, or memory recall.
`;

export class SniperLiveClient {
  private activeSession: any = null;
  private inputContext: AudioContext | null = null;
  private outputContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  
  private currentTurnId: string | null = null;
  private currentInputText = "";
  private currentAiTurnId: string | null = null;
  private currentAiText = "";

  public onMessageUpdate: (msg: Message) => void = () => {};
  public onStatusChange: (isSpeaking: boolean) => void = () => {};
  public onVolumeChange: (level: number) => void = () => {};

  constructor() {}

  async connect(knowledge: string) {
    if (!process.env.API_KEY) throw new Error("API Key Missing");
    await this.disconnect();

    this.inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      config: {
        systemInstruction: `${SYSTEM_INSTRUCTION}\n\n[LOCAL INTEL]:\n${knowledge}`,
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }, 
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        temperature: 0.0,
        thinkingConfig: { thinkingBudget: 0 }
      },
      callbacks: {
        onopen: async () => { 
          this.activeSession = await sessionPromise;
          await this.startAudioStream(); 
        },
        onmessage: (msg: LiveServerMessage) => this.handleMessage(msg),
        onclose: () => { this.activeSession = null; },
        onerror: (err) => { 
          console.error("Sniper Session Error:", err);
          this.activeSession = null;
        },
      },
    });

    return await sessionPromise;
  }

  async disconnect() {
    if (this.processor) { 
        this.processor.onaudioprocess = null; 
        this.processor.disconnect(); 
    }
    if (this.inputSource) this.inputSource.disconnect();
    this.sources.forEach(s => { try { s.stop(); } catch(e) {} });
    this.sources.clear();
    if (this.inputContext) await this.inputContext.close();
    if (this.outputContext) await this.outputContext.close();
    if (this.activeSession) this.activeSession.close();
    
    this.inputContext = this.outputContext = this.processor = this.inputSource = this.activeSession = null;
    this.nextStartTime = 0;
  }

  private handleMessage(message: LiveServerMessage) {
    // 1. Instant Audio Processing (Zero latency buffer)
    const parts = message.serverContent?.modelTurn?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          this.onStatusChange(true);
          this.playAudioChunk(part.inlineData.data);
        }
      }
    }

    // 2. Real-time User Transcription (Source)
    if (message.serverContent?.inputTranscription) {
      const text = message.serverContent.inputTranscription.text;
      if (text) {
        if (!this.currentTurnId) { 
          this.currentTurnId = `u-${Date.now()}`; 
          this.currentInputText = ""; 
        }
        this.currentInputText += text;
        this.onMessageUpdate({ 
          id: this.currentTurnId, 
          speaker: Speaker.USER, 
          text: this.currentInputText, 
          timestamp: Date.now() 
        });
      }
    }

    // 3. Real-time AI Transcription (Sniper)
    if (message.serverContent?.outputTranscription) {
      const text = message.serverContent.outputTranscription.text;
      if (text) {
        if (!this.currentAiTurnId) { 
          this.currentAiTurnId = `ai-${Date.now()}`; 
          this.currentAiText = ""; 
        }
        this.currentAiText += text;
        this.onMessageUpdate({ 
          id: this.currentAiTurnId, 
          speaker: Speaker.AI, 
          text: this.currentAiText, 
          timestamp: Date.now() 
        });
      }
    }

    // 4. Reset markers on completion
    if (message.serverContent?.turnComplete) {
      this.currentTurnId = null;
      this.currentAiTurnId = null;
      this.currentInputText = "";
      this.currentAiText = "";
    }
  }

  private async playAudioChunk(base64: string) {
    if (!this.outputContext) return;
    this.nextStartTime = Math.max(this.nextStartTime, this.outputContext.currentTime);
    const audioBuffer = await decodeAudioData(decode(base64), this.outputContext, 24000, 1);
    const source = this.outputContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.outputContext.destination);
    source.onended = () => {
      this.sources.delete(source);
      if (this.sources.size === 0) this.onStatusChange(false);
    };
    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
    this.sources.add(source);
  }

  private async startAudioStream() {
    if (!this.inputContext) return;
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    });
    this.inputSource = this.inputContext.createMediaStreamSource(stream);
    
    // 256 samples (16ms) for immediate packetization
    this.processor = this.inputContext.createScriptProcessor(256, 1, 1);
    
    this.processor.onaudioprocess = (e) => {
      if (!this.activeSession) return;

      const inputData = e.inputBuffer.getChannelData(0);
      const len = inputData.length;
      const int16 = new Int16Array(len);
      let sum = 0;
      
      for (let i = 0; i < len; i++) {
        const sample = inputData[i];
        sum += sample * sample;
        int16[i] = sample * 32768;
      }
      
      this.onVolumeChange(Math.sqrt(sum / len));
      
      this.activeSession.sendRealtimeInput({
        media: { 
          mimeType: "audio/pcm;rate=16000", 
          data: encode(new Uint8Array(int16.buffer))
        }
      });
    };
    
    this.inputSource.connect(this.processor);
    this.processor.connect(this.inputContext.destination);
  }
}
