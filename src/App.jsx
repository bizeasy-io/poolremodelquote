import { useState, useRef } from 'react'

const FINISHES = [
  'Florida Stucco (Basic)',
  'StoneScapes White Regular',
  'StoneScapes White Mini',
  'StoneScapes Aqua Cool',
  'StoneScapes Aqua Blue Mini',
  'StoneScapes Tahoe Blue',
  'StoneScapes Black Regular',
  'StoneScapes Touch of Glass',
  'Not sure yet',
]

const WORK_TYPES = ['Interior resurfacing', 'Waterline tile', 'Coping', 'Deck', 'Pool cage / screen', 'Equipment upgrade']

// Unsplash direct CDN — free for commercial use, no attribution required for hotlinking
const HERO_IMG = 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=1400&q=80&auto=format&fit=crop'

export default function App() {
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    address: '', city: '', state: 'FL', zip: '',
    workTypes: [], finish: '', notes: '',
  })
  const [photos, setPhotos] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()
  const formRef = useRef()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleWork = (w) => {
    set('workTypes', form.workTypes.includes(w)
      ? form.workTypes.filter(x => x !== w)
      : [...form.workTypes, w])
  }

  const handlePhotos = (e) => {
    const files = Array.from(e.target.files).slice(0, 5)
    setPhotos(files)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name || !form.phone || !form.address || !form.zip) {
      setError('Please fill in your name, phone, street address, and zip code.')
      return
    }
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 1200))
    setSubmitting(false)
    setSubmitted(true)
  }

  if (submitted) return <ThankYou name={form.name} />

  return (
    <div className="min-h-screen" style={{ background: 'var(--sand)' }}>

      {/* Hero with pool photo */}
      <header className="relative overflow-hidden" style={{ minHeight: 380 }}>
        {/* Photo background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMG})` }}
        />
        {/* Dark overlay so text reads clearly */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,37,64,0.72) 0%, rgba(10,37,64,0.60) 60%, rgba(10,37,64,0.85) 100%)' }} />

        <div className="relative max-w-2xl mx-auto px-6 py-16 text-center">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: 'var(--pool-aqua)' }}>
            Southwest Florida Pool Remodeling
          </p>
          <h1 className="display-font text-4xl md:text-5xl font-bold text-white leading-tight mb-5">
            Your pool.<br/>
            <span style={{ color: 'var(--pool-light)' }}>Done right.</span>
          </h1>
          <p className="text-lg mb-8" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Tell us about your project. We'll measure it, price it,<br className="hidden md:block"/>
            and send you a written estimate — often same day.
          </p>
          <button
            onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-block px-8 py-4 rounded-full text-white font-semibold text-base transition-all duration-200 hover:opacity-90 active:scale-95"
            style={{ background: 'var(--orange)' }}
          >
            Get My Free Estimate →
          </button>
        </div>
      </header>

      {/* Trust bar */}
      <div className="border-b border-t" style={{ borderColor: '#ddd', background: 'white' }}>
        <div className="max-w-2xl mx-auto px-6 py-4 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm" style={{ color: 'var(--muted)' }}>
          <span>✓ Licensed &amp; insured</span>
          <span>✓ Free on-site measurement</span>
          <span>✓ Written estimate guaranteed</span>
          <span>✓ Southwest Florida specialists</span>
        </div>
      </div>

      {/* Form */}
      <main className="max-w-xl mx-auto px-5 py-12" ref={formRef}>
        <h2 className="display-font text-2xl font-bold mb-1" style={{ color: 'var(--pool-deep)' }}>
          Tell us about your project
        </h2>
        <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
          No commitment. We'll reach out to schedule a free measurement appointment.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* Contact */}
          <div className="space-y-2">
            <Label>Your name *</Label>
            <Input placeholder="First and last name" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input type="tel" placeholder="(239) 555-0100" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="you@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          </div>

          {/* Address — broken out for routing */}
          <div className="space-y-2">
            <Label>Pool street address *</Label>
            <Input placeholder="123 Palm Drive" value={form.address} onChange={e => set('address', e.target.value)} />
          </div>

          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-2 space-y-2">
              <Label>City</Label>
              <Input placeholder="Naples" value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
            <div className="col-span-1 space-y-2">
              <Label>State</Label>
              <Input placeholder="FL" value={form.state} onChange={e => set('state', e.target.value)} maxLength={2} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Zip code *</Label>
              <Input placeholder="34102" value={form.zip} onChange={e => set('zip', e.target.value)} inputMode="numeric" maxLength={5} />
            </div>
          </div>

          {/* Scope */}
          <div className="space-y-2">
            <Label>What do you need? <span className="font-normal" style={{ color: 'var(--muted)' }}>(check all that apply)</span></Label>
            <div className="flex flex-wrap gap-2">
              {WORK_TYPES.map(w => (
                <button
                  key={w}
                  type="button"
                  onClick={() => toggleWork(w)}
                  className="px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-150"
                  style={form.workTypes.includes(w)
                    ? { background: 'var(--pool-deep)', color: 'white', borderColor: 'var(--pool-deep)' }
                    : { background: 'white', color: 'var(--text)', borderColor: '#d1d5db' }
                  }
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {/* Finish */}
          <div className="space-y-2">
            <Label>Interior finish you're considering <span className="font-normal" style={{ color: 'var(--muted)' }}>(optional)</span></Label>
            <select
              value={form.finish}
              onChange={e => set('finish', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border text-sm appearance-none"
              style={{ borderColor: '#d1d5db', background: 'white', color: form.finish ? 'var(--text)' : 'var(--muted)' }}
            >
              <option value="">Select a finish...</option>
              {FINISHES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Anything else we should know? <span className="font-normal" style={{ color: 'var(--muted)' }}>(optional)</span></Label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Pool age, current condition, gate code for access, special requests..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border text-sm resize-none"
              style={{ borderColor: '#d1d5db', background: 'white' }}
            />
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <Label>Add photos <span className="font-normal" style={{ color: 'var(--muted)' }}>(optional, up to 5)</span></Label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-xl px-6 py-8 text-center cursor-pointer"
              style={{ borderColor: '#d1d5db', background: 'white' }}
            >
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} />
              {photos.length > 0 ? (
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--pool-aqua)' }}>
                    ✓ {photos.length} photo{photos.length > 1 ? 's' : ''} selected
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                    {photos.map(p => p.name).join(', ')}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium" style={{ color: 'var(--pool-mid)' }}>Tap to add photos</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Pool, deck, tile, coping — any photos help us prepare</p>
                </>
              )}
            </div>
          </div>

          {error && (
            <p className="text-sm px-4 py-3 rounded-lg" style={{ background: '#fef2f2', color: '#dc2626' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-xl font-semibold text-base text-white transition-all duration-200 disabled:opacity-70"
            style={{ background: 'var(--orange)' }}
          >
            {submitting ? 'Sending your request...' : 'Get My Free Estimate →'}
          </button>

          <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
            By submitting, you agree to be contacted about your pool project. We never sell your information.
          </p>
        </form>
      </main>

      <footer className="text-center py-8 text-xs" style={{ color: 'var(--muted)', borderTop: '1px solid #e5e7eb' }}>
        <p>© 2026 poolremodelquote.com &nbsp;·&nbsp; Southwest Florida Pool Remodeling Specialists</p>
      </footer>
    </div>
  )
}

function Label({ children }) {
  return <label className="block text-sm font-semibold" style={{ color: 'var(--pool-deep)' }}>{children}</label>
}

function Input({ ...props }) {
  return (
    <input
      {...props}
      className="w-full px-4 py-3 rounded-xl border text-sm"
      style={{ borderColor: '#d1d5db', background: 'white' }}
    />
  )
}

function ThankYou({ name }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--sand)' }}>
      <div className="max-w-md text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'var(--pool-aqua)' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M6 16l7 7L26 9" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="display-font text-3xl font-bold mb-3" style={{ color: 'var(--pool-deep)' }}>
          Got it{name ? `, ${name.split(' ')[0]}` : ''}!
        </h2>
        <p className="text-base mb-2" style={{ color: 'var(--text)' }}>
          Your request is in. You'll hear from us shortly to schedule your free measurement appointment.
        </p>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Check your phone — we may text you to confirm a time.
        </p>
      </div>
    </div>
  )
}
