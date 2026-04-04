#!/usr/bin/env node

/**
 * Setup Supabase Storage bucket for documents
 * Usage: npx ts-node scripts/setup-storage.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function setupStorage() {
  try {
    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets()
    const documentsExists = buckets?.some(b => b.name === 'documents')

    if (documentsExists) {
      console.log('✓ Documents bucket already exists')
      return
    }

    // Create bucket
    const { data, error } = await supabase.storage.createBucket('documents', {
      public: false,
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg',
        'image/png',
        'text/plain',
        'text/csv',
        'application/zip',
        'application/x-zip-compressed',
      ],
      fileSizeLimit: 52428800, // 50MB
    })

    if (error) {
      console.error('Error creating bucket:', error)
      process.exit(1)
    }

    console.log('✓ Documents bucket created successfully')

    // Verify bucket was created
    const { data: updated } = await supabase.storage.listBuckets()
    const created = updated?.find(b => b.name === 'documents')
    if (created) {
      console.log(`  Bucket ID: ${created.id}`)
      console.log(`  Public: ${created.public}`)
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    process.exit(1)
  }
}

setupStorage()
