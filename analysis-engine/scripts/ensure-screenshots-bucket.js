/**
 * Ensure Screenshots Bucket Exists
 * Creates the Supabase Storage bucket for screenshots if it doesn't exist
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root directory
dotenv.config({ path: join(__dirname, '../../.env') });

const BUCKET_NAME = 'screenshots';

async function ensureScreenshotsBucket() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
      process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if bucket exists
    console.log(`🔍 Checking if '${BUCKET_NAME}' bucket exists...`);
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('❌ Could not list buckets:', listError.message);
      process.exit(1);
    }

    const bucketExists = buckets.some(bucket => bucket.name === BUCKET_NAME);

    if (bucketExists) {
      console.log(`✅ Screenshots bucket '${BUCKET_NAME}' already exists`);

      // Verify bucket is public
      console.log(`🔍 Checking bucket access settings...`);
      const bucket = buckets.find(b => b.name === BUCKET_NAME);
      if (bucket.public) {
        console.log(`✅ Bucket is public - screenshots will be accessible via URLs`);
      } else {
        console.warn(`⚠️  Bucket is private - screenshots may not be accessible via public URLs`);
        console.log(`   You may want to make the bucket public in the Supabase dashboard`);
      }

      return true;
    }

    // Create bucket
    console.log(`📦 Creating screenshots bucket '${BUCKET_NAME}'...`);
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,  // Make bucket public so screenshots can be accessed via URLs
      fileSizeLimit: 52428800, // 50MB limit per file
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    });

    if (createError) {
      console.error(`❌ Could not create bucket: ${createError.message}`);
      process.exit(1);
    }

    console.log(`✅ Successfully created screenshots bucket '${BUCKET_NAME}'`);
    console.log(`   - Public access: enabled`);
    console.log(`   - File size limit: 50MB`);
    console.log(`   - Allowed types: images (png, jpg, jpeg, webp)`);

    return true;
  } catch (error) {
    console.error('❌ Error ensuring screenshots bucket:', error);
    process.exit(1);
  }
}

// Run the script
ensureScreenshotsBucket();
