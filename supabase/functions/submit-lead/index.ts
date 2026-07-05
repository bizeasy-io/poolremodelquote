import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('Function started')

  try {
    const body = await req.json()
    console.log('Body received:', JSON.stringify(body))

    const { name, phone, email, address, city, state, zip, workTypes, finish, notes, photoPaths } = body

    // Defense in depth: the lead-photos bucket's own RLS policy already
    // restricts uploads to this shape and caps 5 per submission folder,
    // but don't trust the client payload as-is.
    const photoPathPattern = /^[0-9a-f-]{36}\/[0-9a-f-]+\.(jpg|jpeg|png|webp|heic|heif)$/
    const photo_urls = Array.isArray(photoPaths)
      ? photoPaths.filter((p) => typeof p === 'string' && photoPathPattern.test(p)).slice(0, 5)
      : []

    // Save lead to Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    console.log('Supabase URL exists:', !!supabaseUrl)
    console.log('Supabase key exists:', !!supabaseKey)

    const supabase = createClient(supabaseUrl!, supabaseKey!)

    const { error: dbError } = await supabase.from('leads').insert({
      name, phone, email, address, city, state, zip,
      work_types: workTypes,
      finish,
      notes,
      photo_urls: photo_urls.length > 0 ? photo_urls : null,
      status: 'new',
    })

    if (dbError) {
      console.log('DB error:', JSON.stringify(dbError))
      throw dbError
    }

    console.log('Lead saved successfully')

    // Twilio
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')
    const daveNumber = Deno.env.get('DAVE_PHONE_NUMBER')
    const samNumber = Deno.env.get('SAM_PHONE_NUMBER')

    console.log('Twilio SID exists:', !!accountSid)
    console.log('Twilio token exists:', !!authToken)
    console.log('From number exists:', !!fromNumber)
    console.log('Dave number exists:', !!daveNumber)
    console.log('Sam number exists:', !!samNumber)

    const sendSMS = async (to: string, message: string) => {
      console.log('Sending SMS to:', to)
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ To: to, From: fromNumber!, Body: message }),
        }
      )
      const result = await response.json()
      console.log('SMS result:', JSON.stringify(result))
      return result
    }

    await sendSMS(daveNumber!, `NEW LEAD: ${name} in ${city || zip}\n${phone}\n${address}, ${city} ${zip}\nNeeds: ${workTypes?.join(', ') || 'TBD'}`)
    await sendSMS(samNumber!, `New pool remodel lead: ${name} in ${city || zip}. Appointment to be scheduled.`)
    await sendSMS(phone, `Hi ${name.split(' ')[0]}, thanks for reaching out about your pool remodel! We'll be in touch shortly to schedule your free estimate. - Pool Remodel Quote`)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err) {
    console.log('Caught error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})