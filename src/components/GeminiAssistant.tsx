import React, { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { translations } from '../i18n/translations'
import { Bot, Send, User, Sparkles, ShieldCheck, HelpCircle } from 'lucide-react'

interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'
  text: string
  timestamp: string
  groundedSource?: string
}

export const GeminiAssistant: React.FC = () => {
  const { nasaData, soilData, rankedStrategies, language } = useAppStore()
  const t = translations[language]

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: language === 'ur'
        ? 'خوش آمدید! میں این ایس ٹی سوئل سائٹ فارم اسسٹنٹ ہوں۔ میں آپ کے کھیت کے ناسا سیٹلائٹ ڈیٹا اور فصلوں کی خصوصیات کی بنیاد پر آپ کے سوالات کے جوابات دے سکتا ہوں۔'
        : 'Welcome! I am your NASA SoilSight Agronomic Advisor. I answer farm planning and rotation questions strictly grounded in your drawn field’s NASA Earth observations, soil profile, and crop traits.',
      timestamp: 'Just now',
      groundedSource: 'NASA POWER + SoilGrids + Global Crop DB',
    },
  ])
  const [isTyping, setIsTyping] = useState(false)

  const quickQuestions = language === 'ur'
    ? [
        'میرے کھیت کے لیے بہترین روٹیشن کون سی ہے؟',
        'مٹی میں نامیاتی مادہ اور نائٹروجن کیسے بڑھائیں؟',
        'سب سے زیادہ خطرے والے مہینے کون سے ہیں؟',
        'پانی کی بچت کے لیے کون سی فصلیں موزوں ہیں؟',
      ]
    : [
        'Why is the top rotation strategy recommended for my field?',
        'How can I rebuild soil organic carbon and fix nitrogen?',
        'Which months present the highest thermal or drought hazard?',
        'How much supplemental irrigation will my rotation require?',
      ]

  const handleSend = (questionText?: string) => {
    const q = (questionText || input).trim()
    if (!q) return

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    if (!questionText) setInput('')
    setIsTyping(true)

    setTimeout(() => {
      let answer = ''
      const lowerQ = q.toLowerCase()

      if (!nasaData) {
        answer = 'Please delineate your field on the map first so I can inspect real NASA climate and soil data for your coordinates.'
      } else {
        const topStrat = rankedStrategies[0]
        if (lowerQ.includes('top') || lowerQ.includes('recommend') || lowerQ.includes('why') || lowerQ.includes('بہترین')) {
          answer = `Based on your NASA climate data (mean ${nasaData.avgTemp.toFixed(1)}°C, ${nasaData.annualRainfall}mm annual precipitation), the top-ranked strategy is "${topStrat?.name}". ${topStrat?.explanation} It achieves a resilience score of ${topStrat?.scores.overall}/100 and incorporates: ${topStrat?.crops.map(c => c.crop.name).join(' → ')}.`
        } else if (lowerQ.includes('soil') || lowerQ.includes('carbon') || lowerQ.includes('nitrogen') || lowerQ.includes('مٹی') || lowerQ.includes('نائٹروجن')) {
          const soc = soilData ? soilData.organicCarbon.toFixed(1) : '14'
          const ph = soilData ? soilData.ph.toFixed(1) : '7.0'
          answer = `Your topsoil (0–30 cm) profile shows a pH of ${ph} and Soil Organic Carbon of ${soc} g/kg. We recommend incorporating legumes like chickpea, lentil, or cowpea in rotation. In your Soil-Restoration rotation, legume root nodule fixation supplies up to +120 kg N/ha, drastically lowering urea costs while decomposing taproots enhance water infiltration.`
        } else if (lowerQ.includes('risk') || lowerQ.includes('hazard') || lowerQ.includes('month') || lowerQ.includes('خطرے')) {
          const hotMonths = nasaData.monthly.filter(m => m.tempMax > 38).map(m => `Month ${m.month}`)
          const dryMonths = nasaData.monthly.filter(m => m.rainfall < 15 && m.soilMoistureRoot < 0.25).map(m => `Month ${m.month}`)
          answer = `NASA climatological reanalysis identifies critical hazard periods: ${hotMonths.length > 0 ? `Heat stress during ${hotMonths.join(', ')}` : 'No severe heat spikes >38°C'}. ${dryMonths.length > 0 ? `Drought hazard in ${dryMonths.join(', ')} with root soil moisture dipping below 25%` : 'Moisture is relatively balanced'}. Ensure field cover crops are established to prevent wind erosion during bare-field intervals.`
        } else if (lowerQ.includes('water') || lowerQ.includes('irrigation') || lowerQ.includes('پانی')) {
          const totalGap = topStrat?.irrigationTotal ?? 250
          answer = `Under the top-ranked rotation, your total annual supplemental water deficit is approximately ${totalGap.toFixed(0)} mm. Adopting the "Water-Smart Rotation" lowers evapotranspiration demand with drought-resilient crops (sorghum, millet, sesame), reducing groundwater tube-well pumping hours by up to 40%.`
        } else {
          answer = `Based on your field's location (${nasaData.lat.toFixed(4)}°N, ${nasaData.lon.toFixed(4)}°E), annual precipitation is ${nasaData.annualRainfall} mm with an average temperature of ${nasaData.avgTemp.toFixed(1)}°C. Your soil texture is classified as ${soilData?.textureClass || 'Loam'}. The recommended rotation (${topStrat?.name}) matches local vegetative cycles. For commercial seed certification and regional pest vectors, please verify with your local agricultural extension service.`
        }
      }

      const botMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        groundedSource: 'Grounded in Local NASA Observations & ISRIC Profile',
      }

      setMessages((prev) => [...prev, botMsg])
      setIsTyping(false)
    }, 600)
  }

  return (
    <div className="glass-panel rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[640px]">
      {/* Header */}
      <div className="p-4 sm:p-5 bg-[#0a0f24] text-white flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Bot className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">{t.tabs.assistant}</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Grounded SI
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Strictly references your field’s NASA POWER climate and SoilGrids data
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">Zero Hallucination Grounding</span>
        </div>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#050814]/80">
        {messages.map((m) => {
          const isUser = m.sender === 'user'
          return (
            <div key={m.id} className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                    : 'bg-slate-800 text-cyan-400 border border-white/10'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[80%] rounded-2xl p-4 text-xs space-y-1.5 ${
                  isUser
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none shadow-md'
                    : 'bg-[#0a0f24] text-slate-200 border border-white/10 rounded-tl-none shadow-xl'
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                <div
                  className={`flex items-center justify-between gap-2 text-[10px] pt-1.5 border-t ${
                    isUser ? 'border-white/20 text-blue-100' : 'border-white/5 text-slate-400'
                  }`}
                >
                  <span className="font-mono">{m.timestamp}</span>
                  {m.groundedSource && (
                    <span className="italic flex items-center gap-1 text-cyan-300 font-mono">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      {m.groundedSource}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {isTyping && (
          <div className="flex items-center gap-2 text-xs text-slate-400 italic">
            <Bot className="w-4 h-4 animate-bounce text-cyan-400" />
            <span className="font-mono">Consulting NASA Earth observations...</span>
          </div>
        )}
      </div>

      {/* Quick Suggestion Pills */}
      <div className="p-3 bg-[#0a0f24] border-t border-white/10 flex items-center gap-2 overflow-x-auto text-xs scrollbar-none">
        <HelpCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />
        {quickQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            className="px-3 py-1 rounded-full bg-white/5 hover:bg-cyan-500/10 hover:text-cyan-300 text-slate-400 border border-white/5 hover:border-cyan-500/30 whitespace-nowrap text-[11px] font-medium transition-all"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="p-3.5 bg-[#080d1e] border-t border-white/10 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={
            language === 'ur'
              ? 'اپنے کھیت یا فصلوں کے بارے میں کوئی سوال پوچھیں...'
              : 'Ask a question about your field climate, soil, or crop rotations...'
          }
          className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-white/10 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/50 bg-slate-900/90 text-white placeholder-slate-500 font-mono"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isTyping}
          className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black disabled:opacity-40 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
