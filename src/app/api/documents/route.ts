import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Document } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query params for filtering
    const { searchParams } = new URL(request.url)
    const entity = searchParams.get('entity')
    const govLeadId = searchParams.get('gov_lead_id')
    const commercialLeadId = searchParams.get('commercial_lead_id')
    const subcontractorId = searchParams.get('subcontractor_id')
    const documentType = searchParams.get('document_type')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100

    // Build query
    let query = supabase
      .from('documents')
      .select('*')
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (entity) {
      query = query.eq('entity', entity)
    }
    if (govLeadId) {
      query = query.eq('gov_lead_id', govLeadId)
    }
    if (commercialLeadId) {
      query = query.eq('commercial_lead_id', commercialLeadId)
    }
    if (subcontractorId) {
      query = query.eq('subcontractor_id', subcontractorId)
    }
    if (documentType) {
      query = query.eq('document_type', documentType)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const entity = formData.get('entity') as string
    const govLeadId = formData.get('gov_lead_id') as string | null
    const commercialLeadId = formData.get('commercial_lead_id') as string | null
    const subcontractorId = formData.get('subcontractor_id') as string | null
    const documentType = formData.get('document_type') as string | null
    const description = formData.get('description') as string | null

    if (!file || !entity) {
      return NextResponse.json(
        { error: 'Missing required fields: file and entity' },
        { status: 400 }
      )
    }

    // Validate file
    if (file.size > 52428800) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit' }, { status: 400 })
    }

    // Generate storage path: {entity}/{lead_id or 'general'}/{timestamp}_{filename}
    const leadId = govLeadId || commercialLeadId || subcontractorId || 'general'
    const timestamp = Date.now()
    const extension = file.name.split('.').pop() || ''
    const baseFileName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const storagePath = `${entity}/${leadId}/${timestamp}_${baseFileName}.${extension}`

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file: ' + uploadError.message },
        { status: 500 }
      )
    }

    // Create document record
    const { data: doc, error: dbError } = await supabase
      .from('documents')
      .insert({
        entity,
        gov_lead_id: govLeadId || null,
        commercial_lead_id: commercialLeadId || null,
        subcontractor_id: subcontractorId || null,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        document_type: documentType || null,
        description: description || null,
        uploaded_by: user.id,
        version: 1,
      } as Document)
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Try to clean up the uploaded file
      await supabase.storage.from('documents').remove([storagePath])
      return NextResponse.json(
        { error: 'Failed to create document record: ' + dbError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(doc, { status: 201 })
  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
