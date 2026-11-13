import { useState } from 'react'
import { Send, MessageCircle } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { answerQuestion } from '../lib/advisor'
import { EmptyState, PanelTitle } from './ui'
export function Advisor() {
  const { nasaData, soilData, rankedStrategies } = useAppStore()
  const [input, setInput] = useState(''),
    [messages, setMessages] = useState<{ question: string; answer: string }[]>([])
  if (!nasaData) return <EmptyState />
  const send = (q: string) => {
    if (!q.trim()) return
    setMessages((m) => [
      ...m,
      { question: q.trim(), answer: answerQuestion(q, nasaData, soilData, rankedStrategies) },
    ])
    setInput('')
  }
  return (
    <div className="view-stack">
      <PanelTitle
        number="ASK / EXPLAIN THE NUMBERS"
        title="A second look at your plan"
        description="A template-based field advisor. Answers use only your current dashboard data; no generative AI service or API key is involved."
      />
      <section className="panel advisor">
        <div className="advisor-intro">
          <MessageCircle size={30} />
          <h3>What would you like to understand?</h3>
          <p>Start with a question about the plan, its water needs or the evidence behind it.</p>
          <div className="suggestions">
            {[
              'Why this crop plan?',
              'How much water is needed?',
              'What does the soil data mean?',
              'Is this live NASA data?',
            ].map((q) => (
              <button className="btn" key={q} onClick={() => send(q)}>
                {q}
              </button>
            ))}
          </div>
        </div>
        <div className="messages" aria-live="polite" role="log" aria-label="Advisor conversation">
          {messages.map((m, i) => (
            <div key={i} className="exchange">
              <div className="question">
                <strong>You</strong>
                <p>{m.question}</p>
              </div>
              <div className="answer">
                <span className="eyebrow">SOILSIGHT · DATA EXPLANATION</span>
                <p>{m.answer}</p>
              </div>
            </div>
          ))}
        </div>
        <form
          className="ask-form"
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
        >
          <input
            aria-label="Question about your field"
            placeholder="Ask about your climate, soil or crop plan…"
            value={input}
            maxLength={1000}
            onChange={(e) => setInput(e.target.value)}
          />
          <button className="btn primary" disabled={!input.trim()} type="submit">
            <Send size={16} />
            <span>Ask</span>
          </button>
        </form>
        <p className="caption">
          Responses describe the data at the time you ask. Recheck after changing priorities or
          loading new inputs.
        </p>
      </section>
    </div>
  )
}
