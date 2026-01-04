
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Message, Speaker } from '../types';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// System instruction for ULTIMATE PRECISION and PERSISTENCE
const SYSTEM_INSTRUCTION = `
ROLE: You are the "EAR-AI SNIPER" - a proactive data-delivery operative.
MISSION: Monitor the live audio stream. Identify factual gaps, queries, or uncertainties. Deliver the answer immediately.

**OPERATIONAL PROTOCOL**:
1.  **CONSTANT ASSESSMENT**: Monitor everything. Search for the "Target" (a question or a piece of missing data).
2.  **IMMEDIATE STRIKE**: Deliver the answer the MILLISECOND the query is understood. 
3.  **FINISH THE SHOT**: Once you start speaking a response, **YOU MUST FINISH IT**. Do not stop mid-sentence or mid-word, even if there is loud noise or if the user continues to speak. Your data shard must be delivered in full.
4.  **NO HALLUCINATION**: If you don't know and it's not in [CONTEXTUAL INTEL], use Google Search tools. If still uncertain, stay SILENT. Never guess.
5.  **STRICT VOICE PROTOCOL**: Speak clearly and only ONCE. 

**STRICT RESPONSE RULES**:
-   **CONCISION**: Maximum of 5 words. Ideally ONE word. 
-   **NO FLUFF**: No "The answer is", no "Hello", no "According to". Just the raw data shard.
-   **ZERO CHATTER**: If there is no query, stay 100% silent.
-   **WHISPER MODE**: You are a data-ghost. You appear, drop the truth, and vanish.

**EXAMPLES**:
-   User: "What was our revenue in Q3? I think it was..." -> AI: "$4.2M"
-   User: "Who founded Apple?" -> AI: "Jobs and Wozniak"
-   User: "I'm going to the store." -> AI: [SILENCE]

**CRITICAL**: Accuracy is your life. Hallucination is failure. Silence is better than error. Respond INSTANTLY and COMPLETE your response once started.
`;

export async function generateLiveSummary(messages: Message[]): Promise<string> {
  if (messages.length === 0) return "";
  const transcript = messages
    .map(m => `${m.speaker === Speaker.AI ? 'AI' : 'SOURCE'}: ${m.text}`)
    .join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          role: 'user',
          parts: [{ text: `Summarize key intel points. Max 5. Sharp fragments only.\n\nTRANSCRIPT:\n${transcript}` }]
        }
      ]
    });
    return response.text || "";
  } catch (error) {
    return "";
  }
}

export class SniperLiveClient {
  private session: any = null;
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
    if (!process.env.API_KEY) throw new Error("No API Key");

    this.inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

    const fullInstruction = `${SYSTEM_INSTRUCTION}\n\n[CONTEXTUAL INTEL]:\n${knowledge}`;

    this.session = await ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        systemInstruction: fullInstruction,
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
        tools: [{ googleSearch: {} }],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        generationConfig: { temperature: 0.0 } 
      },
      callbacks: {
        onopen: this.handleOpen.bind(this),
        onmessage: this.handleMessage.bind(this),
        onclose: () => console.log("Session Closed"),
        onerror: (err) => console.error("Session Error", err),
      },
    });
  }

  async disconnect() {
    if (this.session) {
      this.processor?.disconnect();
      this.inputSource?.disconnect();
      if (this.inputContext?.state !== 'closed') this.inputContext?.close();
      if (this.outputContext?.state !== 'closed') this.outputContext?.close();
      this.sources.forEach(s => { try { s.stop(); } catch(e) {} });
      this.sources.clear();
      this.session = null;
    }
  }

  private async handleOpen() {
    await this.startAudioStream();
  }

  private async handleMessage(message: LiveServerMessage) {
    // We no longer stop sources on 'interrupted' because the user wants the AI 
    // to finish its thought regardless of external sounds or interruption.
    if (message.serverContent?.interrupted) {
      console.log("Model execution interrupted by server, but allowing existing audio buffer to play out.");
      return;
    }

    const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData) {
      this.onStatusChange(true);
      await this.playAudioChunk(audioData);
    }

    if (message.serverContent?.inputTranscription) {
      const text = message.serverContent.inputTranscription.text;
      if (text) {
        if (!this.currentTurnId) {
          this.currentTurnId = Date.now().toString();
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

    if (message.serverContent?.outputTranscription) {
      const text = message.serverContent.outputTranscription.text;
      if (text) {
        if (!this.currentAiTurnId) {
          this.currentAiTurnId = Date.now().toString() + 'ai';
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

    if (message.serverContent?.turnComplete) {
      this.currentTurnId = null;
      this.currentInputText = "";
      this.currentAiTurnId = null;
      this.currentAiText = "";
      // Reset isSpeaking status after a delay once the queue is likely empty
      setTimeout(() => {
        if (this.sources.size === 0) {
          this.onStatusChange(false);
          this.nextStartTime = 0;
        }
      }, 500);
    }
  }

  private async startAudioStream() {
    if (!this.inputContext) return;
    if (this.inputContext.state === 'suspended') await this.inputContext.resume();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.inputSource = this.inputContext.createMediaStreamSource(stream);
      this.processor = this.inputContext.createScriptProcessor(2048, 1, 1);

      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        let sum = 0;
        for(let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
        this.onVolumeChange(Math.sqrt(sum / inputData.length));

        const pcmData = this.float32ToInt16(inputData);
        const base64Data = this.arrayBufferToBase64(pcmData.buffer);
        if (this.session) {
          this.session.sendRealtimeInput({
            media: { mimeType: "audio/pcm;rate=16000", data: base64Data }
          });
        }
      };

      this.inputSource.connect(this.processor);
      this.processor.connect(this.inputContext.destination);
    } catch (err) {
      console.error("Mic Access Error", err);
    }
  }

  private async playAudioChunk(base64Audio: string) {
    if (!this.outputContext) return;
    if (this.outputContext.state === 'suspended') await this.outputContext.resume();
    
    try {
      const arrayBuffer = this.base64ToArrayBuffer(base64Audio);
      const audioBuffer = this.pcm16ToAudioBuffer(arrayBuffer, this.outputContext, 24000);
      const source = this.outputContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputContext.destination);
      
      const currentTime = this.outputContext.currentTime;
      
      // Strict scheduling for gapless playback
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime + 0.02; // Minimal lead-in
      }
      
      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.sources.add(source);
      
      source.onended = () => {
        this.sources.delete(source);
        if (this.sources.size === 0) {
          this.onStatusChange(false);
        }
      };
    } catch (error) {
      console.error("Audio Playback Error", error);
    }
  }

  private float32ToInt16(float32: Float32Array): Int16Array {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      let s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes.buffer;
  }

  private pcm16ToAudioBuffer(buffer: ArrayBuffer, ctx: AudioContext, sampleRate: number): AudioBuffer {
    const dataInt16 = new Int16Array(buffer);
    const audioBuffer = ctx.createBuffer(1, dataInt16.length, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
    return audioBuffer;
  }
}
