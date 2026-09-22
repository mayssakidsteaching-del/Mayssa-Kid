import { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Sparkles,
  Radio,
  Sliders,
  X,
  Bot,
  User,
} from 'lucide-react';
import { ChatbotRole } from '../types';
import { CHATBOT_ROLES } from '../utils/chatbotRoles';

interface VoiceConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: ChatbotRole;
}

interface TranscriptItem {
  id: string;
  sender: 'user' | 'model';
  text: string;
  timestamp: number;
}

const VOICE_OPTIONS = [
  { id: 'Zephyr', label: 'Zephyr (Warm & Clear)' },
  { id: 'Puck', label: 'Puck (Engaging & Energetic)' },
  { id: 'Charon', label: 'Charon (Deep & Gravitas)' },
  { id: 'Kore', label: 'Kore (Reflective & Calm)' },
  { id: 'Fenrir', label: 'Fenrir (Direct & Analytical)' },
];

export function VoiceConversationModal({
  isOpen,
  onClose,
  initialRole = 'epistemic_architect',
}: VoiceConversationModalProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [selectedRole, setSelectedRole] = useState<ChatbotRole>(initialRole);
  const [statusText, setStatusText] = useState('Initializing Live connection...');
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [modelSpeaking, setModelSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef<number>(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript container
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Connect / Disconnect when modal opens / closes
  useEffect(() => {
    if (isOpen) {
      startVoiceSession();
    } else {
      cleanupVoiceSession();
    }
    return () => {
      cleanupVoiceSession();
    };
  }, [isOpen]);

  const cleanupVoiceSession = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch (e) {}
    });
    activeSourcesRef.current = [];

    if (playbackContextRef.current && playbackContextRef.current.state !== 'closed') {
      playbackContextRef.current.close();
      playbackContextRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setUserSpeaking(false);
    setModelSpeaking(false);
  };

  const startVoiceSession = async () => {
    setIsConnecting(true);
    setStatusText('Requesting microphone permission & connecting to gemini-3.8-live...');

    try {
      // 1. Initialize Web Audio Contexts
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const playbackCtx = new AudioCtx({ sampleRate: 24000 });
      playbackContextRef.current = playbackCtx;
      nextStartTimeRef.current = playbackCtx.currentTime;

      // 2. Request user microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // 3. Connect to server Live API WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live-ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnecting(false);
        setIsConnected(true);
        setStatusText('Live API connected • Listening');

        // Send initial configuration
        ws.send(
          JSON.stringify({
            type: 'config',
            voice: selectedVoice,
            role: selectedRole,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'connected') {
            setIsConnected(true);
            setStatusText(`Ready with ${msg.voice || selectedVoice} • Speak naturally`);
          } else if (msg.type === 'audio' && msg.audio) {
            playAudioChunk(msg.audio);
          } else if (msg.type === 'interrupted') {
            handleModelInterruption();
          } else if (msg.type === 'outputTranscription' && msg.text) {
            appendTranscript('model', msg.text);
          } else if (msg.type === 'inputTranscription' && msg.text) {
            appendTranscript('user', msg.text);
          } else if (msg.type === 'error') {
            setStatusText(`Error: ${msg.error}`);
          }
        } catch (e) {
          console.error('Error parsing live WS message:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setStatusText('WebSocket connection error');
      };

      ws.onclose = () => {
        setIsConnected(false);
        setStatusText('Live session disconnected');
      };

      // 4. Set up microphone capture pipeline
      const micSource = audioCtx.createMediaStreamSource(stream);
      const scriptNode = audioCtx.createScriptProcessor(2048, 1, 1);
      scriptProcessorRef.current = scriptNode;

      scriptNode.onaudioprocess = (e) => {
        if (!ws || ws.readyState !== WebSocket.OPEN || isMuted) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Compute RMS energy for visual waveform
        let sumSquares = 0;
        for (let i = 0; i < inputData.length; i++) {
          sumSquares += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sumSquares / inputData.length);
        const level = Math.min(100, Math.round(rms * 250));
        setAudioLevel(level);
        setUserSpeaking(level > 12);

        // Convert Float32 to 16-bit PCM little endian
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Base64 encode PCM bytes
        const bytes = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Audio = btoa(binary);

        ws.send(
          JSON.stringify({
            type: 'audio',
            audio: base64Audio,
          })
        );
      };

      micSource.connect(scriptNode);
      scriptNode.connect(audioCtx.destination);
    } catch (err: any) {
      console.error('Failed to start voice conversation:', err);
      setIsConnecting(false);
      setStatusText(`Microphone error: ${err.message || 'Permission denied'}`);
    }
  };

  const playAudioChunk = (base64Audio: string) => {
    const playbackCtx = playbackContextRef.current;
    if (!playbackCtx || playbackCtx.state === 'closed') return;

    if (playbackCtx.state === 'suspended') {
      playbackCtx.resume();
    }

    try {
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);

      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = playbackCtx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = playbackCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(playbackCtx.destination);

      const currentTime = playbackCtx.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
      }

      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;

      activeSourcesRef.current.push(source);
      setModelSpeaking(true);

      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
        if (activeSourcesRef.current.length === 0) {
          setModelSpeaking(false);
        }
      };
    } catch (e) {
      console.error('Error decoding audio chunk:', e);
    }
  };

  const handleModelInterruption = () => {
    // Instantly cancel any scheduled or playing audio buffers when user starts speaking
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch (e) {}
    });
    activeSourcesRef.current = [];
    if (playbackContextRef.current) {
      nextStartTimeRef.current = playbackContextRef.current.currentTime;
    }
    setModelSpeaking(false);
    setStatusText('Listening to your thought...');
  };

  const appendTranscript = (sender: 'user' | 'model', text: string) => {
    setTranscripts((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.sender === sender && Date.now() - last.timestamp < 3500) {
        // Concatenate consecutive utterance
        return [
          ...prev.slice(0, -1),
          { ...last, text: `${last.text} ${text}`, timestamp: Date.now() },
        ];
      }
      return [
        ...prev,
        {
          id: 'v_tr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          sender,
          text,
          timestamp: Date.now(),
        },
      ];
    });
  };

  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'config',
          voice,
          role: selectedRole,
        })
      );
    }
  };

  const handleRoleChange = (role: ChatbotRole) => {
    setSelectedRole(role);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'config',
          voice: selectedVoice,
          role,
        })
      );
    }
  };

  if (!isOpen) return null;

  const activeRoleConfig = CHATBOT_ROLES[selectedRole] || CHATBOT_ROLES.epistemic_architect;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative flex h-[90vh] max-h-[780px] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0a0d14] shadow-2xl">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-[#0f131d]/90">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Radio className="h-4 w-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-sm font-semibold text-neutral-100">
                  Berno Voice (Live API)
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
                  gemini-3.8-live
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Bidirectional real-time voice with immediate conversational interruption
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Center Dynamic Visualizer & Orb */}
        <div className="flex flex-col items-center justify-center py-8 px-4 bg-gradient-to-b from-[#0f131d]/60 to-transparent">
          {/* Animated Energy Voice Orb */}
          <div className="relative flex items-center justify-center">
            {/* Outer Pulsing Rings */}
            <div
              className={`absolute rounded-full transition-all duration-300 pointer-events-none ${
                modelSpeaking
                  ? 'h-44 w-44 bg-[#d4af37]/20 blur-xl animate-pulse'
                  : userSpeaking
                  ? 'h-44 w-44 bg-emerald-500/25 blur-xl animate-ping'
                  : 'h-36 w-36 bg-white/5 blur-md'
              }`}
            />
            <div
              className={`absolute rounded-full border transition-all duration-200 ${
                modelSpeaking
                  ? 'h-36 w-36 border-[#d4af37]/50 scale-105'
                  : userSpeaking
                  ? 'h-36 w-36 border-emerald-400/50 scale-110'
                  : 'h-32 w-32 border-white/10'
              }`}
            />

            {/* Core Orb */}
            <div
              className={`relative flex h-28 w-28 items-center justify-center rounded-full shadow-2xl transition-all duration-300 ${
                modelSpeaking
                  ? 'bg-gradient-to-tr from-[#8f7422] to-[#f4cf60] text-black shadow-[#d4af37]/40 scale-105'
                  : userSpeaking
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 text-black shadow-emerald-500/40 scale-105'
                  : isConnected
                  ? 'bg-gradient-to-tr from-[#172033] to-[#263554] text-neutral-200 border border-white/20'
                  : 'bg-neutral-800 text-neutral-500'
              }`}
            >
              {modelSpeaking ? (
                <Volume2 className="h-10 w-10 animate-bounce" />
              ) : isMuted ? (
                <MicOff className="h-9 w-9 text-red-400" />
              ) : userSpeaking ? (
                <Mic className="h-9 w-9 animate-pulse" />
              ) : (
                <Radio className="h-8 w-8 text-neutral-400" />
              )}
            </div>
          </div>

          {/* Status Capsule */}
          <div className="mt-5 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-xs font-mono">
            <span
              className={`h-2 w-2 rounded-full ${
                modelSpeaking
                  ? 'bg-[#d4af37] animate-ping'
                  : userSpeaking
                  ? 'bg-emerald-400 animate-pulse'
                  : isConnected
                  ? 'bg-emerald-500'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="text-neutral-200">{statusText}</span>
          </div>
        </div>

        {/* Live Conversation Transcript Stream */}
        <div className="flex-1 overflow-y-auto px-5 py-3 border-t border-b border-white/5 space-y-3 bg-[#080b10]">
          {transcripts.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-neutral-500 py-10">
              <Sparkles className="h-6 w-6 text-[#d4af37]/60 mb-2" />
              <p className="text-xs max-w-sm">
                Voice dialogue will transcribe here in real time. Start speaking into your microphone.
              </p>
            </div>
          ) : (
            transcripts.map((t) => (
              <div
                key={t.id}
                className={`flex gap-2.5 ${
                  t.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {t.sender === 'model' && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#d4af37]">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-3.5 py-2 text-xs leading-relaxed ${
                    t.sender === 'user'
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-100'
                      : 'bg-white/5 border border-white/10 text-neutral-200'
                  }`}
                >
                  <p>{t.text}</p>
                </div>
                {t.sender === 'user' && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={transcriptEndRef} />
        </div>

        {/* Control Footer */}
        <div className="flex flex-col gap-3 bg-[#0f131d] p-4 border-t border-white/10">
          {/* Voice & Role Selectors */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-neutral-400">Voice:</span>
              <select
                value={selectedVoice}
                onChange={(e) => handleVoiceChange(e.target.value)}
                className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 text-xs text-neutral-200 focus:outline-none focus:border-[#d4af37]"
              >
                {VOICE_OPTIONS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-neutral-400">Role:</span>
              <select
                value={selectedRole}
                onChange={(e) => handleRoleChange(e.target.value as ChatbotRole)}
                className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 text-xs text-neutral-200 focus:outline-none focus:border-[#d4af37]"
              >
                {Object.values(CHATBOT_ROLES).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4 pt-1">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all ${
                isMuted
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                  : 'bg-white/10 text-neutral-200 border border-white/15 hover:bg-white/15'
              }`}
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              <span>{isMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
            </button>

            <button
              onClick={onClose}
              className="flex items-center gap-2 rounded-xl bg-red-600/80 hover:bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition-all active:scale-95"
            >
              <PhoneOff className="h-4 w-4" />
              <span>End Call</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
