import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const REP_NAME = 'Dave'
const COMPANY_NAME = 'Sam Rogers Swimming Pools Inc.'

function formatPhone(p) {
  if (!p) return ''
  const d = p.replace(/\D/g, '')
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
  return p
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso)
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function Calendar({ selected, onSelect }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const isToday = (d) => d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()
  const isSelected = (d) => {
    if (!selected || !d) return false
    const s = new Date(selected)
    return d === s.getDate() && viewMonth === s.getMonth() && viewYear === s.getFullYear()
  }
  const isPast = (d) => {
    if (!d) return false
    const cell = new Date(viewYear, viewMonth, d)
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return cell < todayStart
  }

  return (
    <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#0f172a' }}>
        <button onClick={prevMonth} style={{ color: 'white', background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', padding: '0 8px' }}>‹</button>
        <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>{MONTHS[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} style={{ color: 'white', background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', padding: '0 8px' }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f8fafc' }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', padding: '8px 0', fontSize: 12, fontWeight: 700, color: '#64748b' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, padding: '4px 4px 8px' }}>
        {cells.map((d, i) => (
          <button
            key={i}
            disabled={!d || isPast(d)}
            onClick={() => d && !isPast(d) && onSelect(new Date(viewYear, viewMonth, d))}
            style={{
              height: 42, borderRadius: 8, border: 'none',
              cursor: d && !isPast(d) ? 'pointer' : 'default',
              fontWeight: isToday(d) || isSelected(d) ? 700 : 400,
              fontSize: 15,
              background: isSelected(d) ? '#f97316' : isToday(d) ? '#0ea5e9' : 'transparent',
              color: isSelected(d) || isToday(d) ? 'white' : isPast(d) ? '#cbd5e1' : '#0f172a',
            }}
          >
            {d || ''}
          </button>
        ))}
      </div>
    </div>
  )
}

function TimePicker({ value, onChange }) {
  const TIMES = []
  for (let h = 7; h <= 19; h++) {
    TIMES.push(`${h === 12 ? 12 : h % 12}:00 ${h < 12 ? 'AM' : 'PM'}`)
    TIMES.push(`${h === 12 ? 12 : h % 12}:30 ${h < 12 ? 'AM' : 'PM'}`)
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
      {TIMES.map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          style={{
            padding: '10px 4px', borderRadius: 8, border: '2px solid',
            borderColor: value === t ? '#f97316' : '#e2e8f0',
            background: value === t ? '#fff7ed' : 'white',
            color: value === t ? '#f97316' : '#334155',
            fontWeight: value === t ? 700 : 400,
            fontSize: 13, cursor: 'pointer',
          }}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

function OnTheWay({ customerName, onCancel }) {
  const [minutes, setMinutes] = useState(20)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSend = async () => {
    setSending(true)
    await new Promise(r => setTimeout(r, 800))
    setSent(true)
    setSending(false)
    setTimeout(onCancel, 1500)
  }

  if (sent) return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
      <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 18 }}>Text sent to {customerName}</p>
    </div>
  )

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ fontWeight: 800, fontSize: 20, color: '#0f172a', marginBottom: 8 }}>On the way</h3>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 28 }}>
        {REP_NAME} from {COMPANY_NAME} is on the way and will be at your location in <strong style={{ color: '#f97316', fontSize: 18 }}>{minutes} min{minutes === 1 ? '' : 's'}</strong>.
      </p>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: '#94a3b8' }}>
          <span>0 min</span>
          <span>60 min</span>
        </div>
        <input
          type="range" min={1} max={60} value={minutes}
          onChange={e => setMinutes(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#f97316', height: 6 }}
        />
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 36, fontWeight: 800, color: '#f97316' }}>
          {minutes} min
        </div>
      </div>
      <button
        onClick={handleSend}
        disabled={sending}
        style={{
          width: '100%', padding: '16px', borderRadius: 12, border: 'none',
          background: '#f97316', color: 'white', fontWeight: 700, fontSize: 16,
          cursor: 'pointer', marginBottom: 12, opacity: sending ? 0.7 : 1
        }}
      >
        {sending ? 'Sending...' : `Text ${customerName} →`}
      </button>
      <button onClick={onCancel} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: 15, cursor: 'pointer' }}>
        Cancel
      </button>
    </div>
  )
}

function BookAppointment({ lead, onBooked, onCancel }) {
  const [date, setDate] = useState(null)
  const [time, setTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState('date')

  const handleBook = async () => {
    if (!date || !time) return
    setSaving(true)
    const apptDate = new Date(date)
    const [timePart, ampm] = time.split(' ')
    let [h, m] = timePart.split(':').map(Number)
    if (ampm === 'PM' && h !== 12) h += 12
    if (ampm === 'AM' && h === 12) h = 0
    apptDate.setHours(h, m, 0, 0)

    const { error } = await supabase.from('appointments').insert({
      lead_id: lead.id,
      contractor_id: lead.contractor_id,
      customer_name: lead.name,
      customer_phone: lead.phone,
      customer_address: `${lead.address}, ${lead.city}, ${lead.state} ${lead.zip}`,
      appointment_at: apptDate.toISOString(),
      status: 'scheduled',
    })

    if (!error) {
      await supabase.from('leads').update({ status: 'appointment_booked' }).eq('id', lead.id)
    }
    setSaving(false)
    onBooked(apptDate)
  }

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ fontWeight: 800, fontSize: 20, color: '#0f172a', marginBottom: 4 }}>Book appointment</h3>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>{lead.name} · {lead.address}</p>

      {step === 'date' && (
        <>
          <Calendar selected={date} onSelect={(d) => { setDate(d); setStep('time') }} />
          <button onClick={onCancel} style={{ width: '100%', marginTop: 16, padding: 12, borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: 15, cursor: 'pointer' }}>
            Cancel
          </button>
        </>
      )}

      {step === 'time' && (
        <>
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
            📅 {date?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            <button onClick={() => setStep('date')} style={{ float: 'right', color: '#0ea5e9', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>Change</button>
          </div>
          <p style={{ fontWeight: 600, color: '#334155', marginBottom: 12, fontSize: 14 }}>Select a time</p>
          <TimePicker value={time} onChange={setTime} />
          <button
            onClick={handleBook}
            disabled={!time || saving}
            style={{
              width: '100%', marginTop: 20, padding: '16px', borderRadius: 12, border: 'none',
              background: time ? '#f97316' : '#e2e8f0',
              color: time ? 'white' : '#94a3b8',
              fontWeight: 700, fontSize: 16,
              cursor: time ? 'pointer' : 'default',
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? 'Booking...' : 'Confirm appointment →'}
          </button>
          <button onClick={onCancel} style={{ width: '100%', marginTop: 12, padding: 12, borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: 15, cursor: 'pointer' }}>
            Cancel
          </button>
        </>
      )}
    </div>
  )
}

function CustomerCard({ lead, onBack, onBooked }) {
  const [modal, setModal] = useState(null)
  const [booked, setBooked] = useState(lead.status === 'appointment_booked')

  const address = [lead.address, lead.city, lead.state, lead.zip].filter(Boolean).join(', ')
  const mapsUrl = `https://maps.apple.com/?q=${encodeURIComponent(address)}`

  const handleBooked = () => {
    setBooked(true)
    setModal(null)
    onBooked && onBooked()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ background: '#0f172a', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ color: '#0ea5e9', background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', padding: 0 }}>‹ Back</button>
        <span style={{ color: 'white', fontWeight: 700, fontSize: 17, flex: 1 }}>{lead.name}</span>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
          background: booked ? '#065f46' : '#1e3a5f',
          color: booked ? '#6ee7b7' : '#7dd3fc',
          textTransform: 'uppercase', letterSpacing: '0.05em'
        }}>
          {booked ? 'Booked' : lead.status === 'new' ? 'New' : lead.status.replace('_', ' ')}
        </span>
      </div>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Contact</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a href={`tel:${lead.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
              <span style={{ width: 40, height: 40, borderRadius: 20, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📞</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>{formatPhone(lead.phone)}</div>
                <div style={{ fontSize: 12, color: '#0ea5e9' }}>Tap to call</div>
              </div>
            </a>
            <a href={`sms:${lead.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
              <span style={{ width: 40, height: 40, borderRadius: 20, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💬</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>{formatPhone(lead.phone)}</div>
                <div style={{ fontSize: 12, color: '#0ea5e9' }}>Tap to text</div>
              </div>
            </a>
            {lead.email && (
              <a href={`mailto:${lead.email}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                <span style={{ width: 40, height: 40, borderRadius: 20, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✉️</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{lead.email}</div>
                  <div style={{ fontSize: 12, color: '#0ea5e9' }}>Tap to email</div>
                </div>
              </a>
            )}
          </div>
        </div>

        <a href={mapsUrl} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 40, height: 40, borderRadius: 20, background: '#fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📍</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{address}</div>
            <div style={{ fontSize: 12, color: '#0ea5e9', marginTop: 2 }}>Tap to open in Maps</div>
          </div>
        </a>

        {(lead.work_types?.length > 0 || lead.finish) && (
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Project</p>
            {lead.work_types?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: lead.finish ? 10 : 0 }}>
                {lead.work_types.map(w => (
                  <span key={w} style={{ padding: '4px 10px', borderRadius: 20, background: '#eff6ff', color: '#1d4ed8', fontSize: 13, fontWeight: 500 }}>{w}</span>
                ))}
              </div>
            )}
            {lead.finish && <p style={{ fontSize: 14, color: '#334155' }}>Finish: <strong>{lead.finish}</strong></p>}
          </div>
        )}

        {lead.notes && (
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Notes</p>
            <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.6 }}>{lead.notes}</p>
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
          Lead received {timeAgo(lead.created_at)} · {new Date(lead.created_at).toLocaleDateString()}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          <button
            onClick={() => setModal('ontheway')}
            style={{ width: '100%', padding: '16px', borderRadius: 12, border: 'none', background: '#0f172a', color: 'white', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
          >
            🚗 On the way...
          </button>
          <button
            onClick={() => setModal('book')}
            style={{ width: '100%', padding: '16px', borderRadius: 12, border: 'none', background: '#f97316', color: 'white', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
          >
            {booked ? '📅 Reschedule appointment' : '📅 Book appointment'}
          </button>
        </div>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            {modal === 'book' && <BookAppointment lead={lead} onBooked={handleBooked} onCancel={() => setModal(null)} />}
            {modal === 'ontheway' && <OnTheWay customerName={lead.name.split(' ')[0]} onCancel={() => setModal(null)} />}
          </div>
        </div>
      )}
    </div>
  )
}

function LeadRow({ lead, onClick }) {
  const isNew = lead.status === 'new'
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', background: 'white', borderRadius: 12, padding: '16px 18px',
        border: `2px solid ${isNew ? '#f97316' : '#e2e8f0'}`,
        boxShadow: isNew ? '0 2px 8px rgba(249,115,22,0.15)' : '0 1px 3px rgba(0,0,0,0.06)',
        cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14
      }}
    >
      {isNew && <span style={{ width: 10, height: 10, borderRadius: 5, background: '#f97316', flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{lead.name}</span>
          <span style={{ fontSize: 12, color: '#94a3b8', flexShrink: 0, marginLeft: 8 }}>{timeAgo(lead.created_at)}</span>
        </div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lead.city || lead.address} {lead.zip && `· ${lead.zip}`}
        </div>
        {lead.work_types?.length > 0 && (
          <div style={{ fontSize: 12, color: '#0ea5e9', marginTop: 4 }}>{lead.work_types.slice(0, 2).join(' · ')}{lead.work_types.length > 2 ? ` +${lead.work_types.length - 2}` : ''}</div>
        )}
      </div>
      <span style={{ color: '#cbd5e1', fontSize: 20 }}>›</span>
    </button>
  )
}

function ApptRow({ appt, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', background: 'white', borderRadius: 12, padding: '16px 18px',
        border: '2px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14
      }}
    >
      <div style={{ background: '#fff7ed', borderRadius: 10, padding: '8px 12px', textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#f97316', lineHeight: 1 }}>{formatTime(appt.appointment_at)}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{appt.customer_name}</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{appt.customer_address}</div>
      </div>
      <span style={{ color: '#cbd5e1', fontSize: 20 }}>›</span>
    </button>
  )
}

export default function RepApp() {
  const [tab, setTab] = useState('today')
  const [leads, setLeads] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [selectedAppt, setSelectedAppt] = useState(null)

  const today = new Date()
  const todayStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const [{ data: leadsData }, { data: apptData }] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('appointments').select('*')
        .gte('appointment_at', todayStart.toISOString())
        .lte('appointment_at', todayEnd.toISOString())
        .order('appointment_at', { ascending: true })
    ])

    setLeads(leadsData || [])
    setAppointments(apptData || [])
    setLoading(false)
  }

  if (selectedAppt) {
    const matchedLead = leads.find(l => l.id === selectedAppt.lead_id) || {
      id: selectedAppt.lead_id,
      name: selectedAppt.customer_name,
      phone: selectedAppt.customer_phone,
      address: selectedAppt.customer_address,
      status: 'appointment_booked',
      created_at: selectedAppt.created_at,
    }
    return <CustomerCard lead={matchedLead} onBack={() => setSelectedAppt(null)} onBooked={fetchData} />
  }

  if (selected) {
    return <CustomerCard lead={selected} onBack={() => { setSelected(null); fetchData() }} onBooked={fetchData} />
  }

  const newCount = leads.filter(l => l.status === 'new').length

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ background: '#0f172a', padding: '18px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: 18 }}>Pool Remodel <span style={{ color: '#f97316' }}>Rep</span></div>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{todayStr}</div>
          </div>
          <button onClick={fetchData} style={{ color: '#64748b', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>↻</button>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { key: 'today', label: "Today's Appointments" },
            { key: 'leads', label: `Leads${newCount > 0 ? ` (${newCount} new)` : ''}` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: '10px 8px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: tab === t.key ? 'white' : 'transparent',
                color: tab === t.key ? '#f97316' : '#94a3b8',
                borderRadius: '8px 8px 0 0',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>Loading...</div>}

        {!loading && tab === 'today' && (
          appointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
              <p style={{ color: '#64748b', fontWeight: 600 }}>No appointments today</p>
              <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>Switch to Leads to book one</p>
            </div>
          ) : (
            appointments.map(a => <ApptRow key={a.id} appt={a} onClick={() => setSelectedAppt(a)} />)
          )
        )}

        {!loading && tab === 'leads' && (
          leads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏊</div>
              <p style={{ color: '#64748b', fontWeight: 600 }}>No leads yet</p>
              <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>Share poolremodelquote.com to get started</p>
            </div>
          ) : (
            leads.map(l => <LeadRow key={l.id} lead={l} onClick={() => setSelected(l)} />)
          )
        )}
      </div>
    </div>
  )
}
