/**
 * Script to find and delete a trainer by email
 * Run with: npx tsx scripts/find-and-delete-trainer.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const EMAIL_TO_FIND = 'Mukelathegreat@gmail.com';

async function findUser() {
  console.log(`\n🔍 Searching for user with email: ${EMAIL_TO_FIND}\n`);
  console.log('='.repeat(60));

  // 1. Check profiles table
  console.log('\n📋 PROFILES TABLE:');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .ilike('email', EMAIL_TO_FIND)
    .single();

  if (profileError) {
    console.log('  No profile found or error:', profileError.message);
  } else {
    console.log('  Found profile:');
    console.log(`    - ID: ${profile.id}`);
    console.log(`    - Email: ${profile.email}`);
    console.log(`    - Name: ${profile.first_name} ${profile.last_name}`);
    console.log(`    - Role: ${profile.role}`);
    console.log(`    - User Type: ${profile.user_type}`);
    console.log(`    - Is Super Admin: ${profile.is_super_admin}`);
  }

  // 2. Check bs_staff table
  console.log('\n👥 BS_STAFF TABLE:');
  const { data: staff, error: staffError } = await supabase
    .from('bs_staff')
    .select('*')
    .ilike('email', EMAIL_TO_FIND);

  if (staffError) {
    console.log('  Error:', staffError.message);
  } else if (!staff || staff.length === 0) {
    console.log('  No staff records found');
  } else {
    for (const s of staff) {
      console.log('  Found staff record:');
      console.log(`    - ID: ${s.id}`);
      console.log(`    - Email: ${s.email}`);
      console.log(`    - Name: ${s.first_name} ${s.last_name}`);
      console.log(`    - Staff Type: ${s.staff_type}`);
      console.log(`    - Studio ID: ${s.studio_id}`);
      console.log(`    - Is Solo: ${s.is_solo}`);
    }
  }

  // 3. Check bs_studios table (as owner)
  console.log('\n🏢 BS_STUDIOS TABLE (as owner):');
  if (profile) {
    const { data: studios, error: studioError } = await supabase
      .from('bs_studios')
      .select('*')
      .eq('owner_id', profile.id);

    if (studioError) {
      console.log('  Error:', studioError.message);
    } else if (!studios || studios.length === 0) {
      console.log('  User is not an owner of any studio');
    } else {
      for (const studio of studios) {
        console.log('  Found studio owned by this user:');
        console.log(`    - Studio ID: ${studio.id}`);
        console.log(`    - Name: ${studio.name}`);
        console.log(`    - Plan: ${studio.plan}`);
      }
    }
  }

  // 4. Check related data
  console.log('\n📊 RELATED DATA:');
  if (profile) {
    // Services created by this user
    const { data: services } = await supabase
      .from('ta_services')
      .select('id, name')
      .eq('created_by', profile.id);
    console.log(`  Services created: ${services?.length || 0}`);

    // Bookings as trainer
    const { data: bookings } = await supabase
      .from('ta_bookings')
      .select('id')
      .eq('trainer_id', profile.id);
    console.log(`  Bookings as trainer: ${bookings?.length || 0}`);

    // Availability records
    const { data: availability } = await supabase
      .from('ta_availability')
      .select('id')
      .eq('trainer_id', profile.id);
    console.log(`  Availability records: ${availability?.length || 0}`);

    // Sessions
    const { data: sessions } = await supabase
      .from('ta_sessions')
      .select('id')
      .eq('trainer_id', profile.id);
    console.log(`  Sessions: ${sessions?.length || 0}`);

    // Packages
    const { data: packages } = await supabase
      .from('ta_packages')
      .select('id')
      .eq('trainer_id', profile.id);
    console.log(`  Packages: ${packages?.length || 0}`);

    // Invitations sent
    const { data: invitations } = await supabase
      .from('ta_invitations')
      .select('id')
      .eq('invited_by', profile.id);
    console.log(`  Invitations sent: ${invitations?.length || 0}`);
  }

  console.log('\n' + '='.repeat(60));

  return { profile, staff };
}

async function deleteTrainer(userId: string) {
  console.log(`\n🗑️  DELETING TRAINER WITH ID: ${userId}\n`);

  // Delete in order (respecting foreign key constraints)

  // 1. Delete availability
  const { error: availErr } = await supabase
    .from('ta_availability')
    .delete()
    .eq('trainer_id', userId);
  console.log(`  ta_availability: ${availErr ? 'Error: ' + availErr.message : 'Deleted'}`);

  // 2. Delete sessions
  const { error: sessErr } = await supabase
    .from('ta_sessions')
    .delete()
    .eq('trainer_id', userId);
  console.log(`  ta_sessions: ${sessErr ? 'Error: ' + sessErr.message : 'Deleted'}`);

  // 3. Delete packages
  const { error: pkgErr } = await supabase
    .from('ta_packages')
    .delete()
    .eq('trainer_id', userId);
  console.log(`  ta_packages: ${pkgErr ? 'Error: ' + pkgErr.message : 'Deleted'}`);

  // 4. Delete services
  const { error: svcErr } = await supabase
    .from('ta_services')
    .delete()
    .eq('created_by', userId);
  console.log(`  ta_services: ${svcErr ? 'Error: ' + svcErr.message : 'Deleted'}`);

  // 5. Update bookings (set trainer_id to null or delete)
  const { error: bookErr } = await supabase
    .from('ta_bookings')
    .delete()
    .eq('trainer_id', userId);
  console.log(`  ta_bookings: ${bookErr ? 'Error: ' + bookErr.message : 'Deleted'}`);

  // 6. Delete invitations sent by this user
  const { error: invErr } = await supabase
    .from('ta_invitations')
    .delete()
    .eq('invited_by', userId);
  console.log(`  ta_invitations: ${invErr ? 'Error: ' + invErr.message : 'Deleted'}`);

  // 7. Delete notifications
  const { error: notifErr } = await supabase
    .from('ta_notifications')
    .delete()
    .eq('user_id', userId);
  console.log(`  ta_notifications: ${notifErr ? 'Error: ' + notifErr.message : 'Deleted'}`);

  // 8. Delete bs_staff record
  const { error: staffErr } = await supabase
    .from('bs_staff')
    .delete()
    .eq('id', userId);
  console.log(`  bs_staff: ${staffErr ? 'Error: ' + staffErr.message : 'Deleted'}`);

  // 9. Delete profile
  const { error: profileErr } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);
  console.log(`  profiles: ${profileErr ? 'Error: ' + profileErr.message : 'Deleted'}`);

  // 10. Delete auth user (requires admin API)
  const { error: authErr } = await supabase.auth.admin.deleteUser(userId);
  console.log(`  auth.users: ${authErr ? 'Error: ' + authErr.message : 'Deleted'}`);

  console.log('\n✅ Deletion complete!\n');
}

async function main() {
  const { profile, staff } = await findUser();

  if (!profile && (!staff || staff.length === 0)) {
    console.log('\n❌ No user found with that email. Exiting.\n');
    return;
  }

  // Check if this is a trainer (not studio owner)
  const isTrainer = staff?.some(s => s.staff_type === 'trainer');
  const isOwner = profile?.role === 'studio_owner' || staff?.some(s => s.staff_type === 'owner');

  console.log(`\n📌 USER CLASSIFICATION:`);
  console.log(`   Is Trainer: ${isTrainer}`);
  console.log(`   Is Owner: ${isOwner}`);

  // Only proceed with deletion if confirmed
  const userId = profile?.id || staff?.[0]?.id;

  if (userId) {
    console.log(`\n⚠️  Ready to delete user ID: ${userId}`);

    // Delete only the bs_staff trainer record (not the entire user)
    await deleteTrainerStaffRecord(userId);
  }
}

async function deleteTrainerStaffRecord(userId: string) {
  console.log(`\n🗑️  DELETING TRAINER STAFF RECORD ONLY for ID: ${userId}\n`);

  // Delete the bs_staff record with staff_type = 'trainer'
  const { data, error: staffErr } = await supabase
    .from('bs_staff')
    .delete()
    .eq('id', userId)
    .eq('staff_type', 'trainer')
    .select();

  if (staffErr) {
    console.log(`  bs_staff: Error - ${staffErr.message}`);
  } else if (data && data.length > 0) {
    console.log(`  bs_staff: Successfully deleted trainer record`);
    console.log(`    - Deleted: ${data[0].first_name} ${data[0].last_name} (${data[0].email})`);
  } else {
    console.log(`  bs_staff: No trainer record found to delete`);
  }

  console.log('\n✅ Deletion complete!\n');
}

main().catch(console.error);
