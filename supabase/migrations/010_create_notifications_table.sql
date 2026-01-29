-- Migration: Create notifications tables
-- Purpose: Store notifications and user preferences for email/SMS

-- Notifications queue
CREATE TABLE IF NOT EXISTS ta_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  booking_id UUID REFERENCES ta_bookings(id),
  client_id UUID REFERENCES fc_clients(id),

  -- Type: reminder_24h, reminder_2h, booking_confirmed, booking_cancelled,
  --       low_credits, credits_expiring, payment_received, payment_failed
  type TEXT NOT NULL,

  -- Channel: email, sms, push
  channel TEXT NOT NULL DEFAULT 'email',

  -- Recipient
  recipient_email TEXT,
  recipient_phone TEXT,

  -- Content
  subject TEXT,
  body TEXT,
  html_body TEXT,

  -- Template data (JSON for merge fields)
  template_data JSONB DEFAULT '{}',

  -- Status: pending, queued, sent, failed, cancelled
  status TEXT DEFAULT 'pending',

  -- Scheduling
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,

  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- External IDs (from email/SMS providers)
  external_id TEXT,
  provider TEXT, -- 'resend', 'twilio', etc.

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User notification preferences
CREATE TABLE IF NOT EXISTS ta_notification_preferences (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,

  -- Email preferences
  email_enabled BOOLEAN DEFAULT true,
  email_booking_confirmations BOOLEAN DEFAULT true,
  email_booking_reminders BOOLEAN DEFAULT true,
  email_payment_receipts BOOLEAN DEFAULT true,
  email_low_credits BOOLEAN DEFAULT true,
  email_marketing BOOLEAN DEFAULT false,

  -- SMS preferences
  sms_enabled BOOLEAN DEFAULT false,
  sms_booking_reminders BOOLEAN DEFAULT false,
  sms_reminder_2h BOOLEAN DEFAULT false,

  -- Reminder timing
  reminder_24h BOOLEAN DEFAULT true,
  reminder_2h BOOLEAN DEFAULT true,

  -- Quiet hours (don't send during these times)
  quiet_hours_start INTEGER, -- Hour (0-23)
  quiet_hours_end INTEGER, -- Hour (0-23)

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON ta_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_booking ON ta_notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON ta_notifications(status) WHERE status IN ('pending', 'queued');
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON ta_notifications(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notifications_type ON ta_notifications(type);

-- Enable RLS
ALTER TABLE ta_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ta_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications" ON ta_notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view their own preferences" ON ta_notification_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences" ON ta_notification_preferences
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own preferences" ON ta_notification_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_ta_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ta_notifications_updated_at
  BEFORE UPDATE ON ta_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_ta_notifications_updated_at();

-- Function to create reminder notifications for a booking
CREATE OR REPLACE FUNCTION create_booking_reminders(p_booking_id UUID)
RETURNS VOID AS $$
DECLARE
  v_booking RECORD;
  v_trainer RECORD;
  v_client RECORD;
  v_prefs RECORD;
BEGIN
  -- Get booking details
  SELECT b.*, s.name as service_name
  INTO v_booking
  FROM ta_bookings b
  LEFT JOIN ta_services s ON s.id = b.service_id
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Get trainer preferences
  SELECT * INTO v_prefs
  FROM ta_notification_preferences
  WHERE user_id = v_booking.trainer_id;

  -- Get trainer details
  SELECT email, first_name, last_name INTO v_trainer
  FROM profiles
  WHERE id = v_booking.trainer_id;

  -- Get client details
  SELECT email, first_name, last_name, name INTO v_client
  FROM fc_clients
  WHERE id = v_booking.client_id;

  -- Create 24h reminder if enabled
  IF COALESCE(v_prefs.reminder_24h, true) THEN
    INSERT INTO ta_notifications (
      user_id, booking_id, client_id, type, channel,
      recipient_email, subject, scheduled_for, status, template_data
    ) VALUES (
      v_booking.trainer_id,
      p_booking_id,
      v_booking.client_id,
      'reminder_24h',
      'email',
      v_client.email,
      'Reminder: Session tomorrow',
      v_booking.scheduled_at - INTERVAL '24 hours',
      'pending',
      jsonb_build_object(
        'client_name', COALESCE(v_client.name, v_client.first_name || ' ' || v_client.last_name),
        'service_name', v_booking.service_name,
        'scheduled_at', v_booking.scheduled_at,
        'trainer_name', v_trainer.first_name || ' ' || v_trainer.last_name
      )
    );
  END IF;

  -- Create 2h reminder if enabled
  IF COALESCE(v_prefs.reminder_2h, true) AND COALESCE(v_prefs.sms_enabled, false) THEN
    INSERT INTO ta_notifications (
      user_id, booking_id, client_id, type, channel,
      recipient_phone, subject, scheduled_for, status, template_data
    ) VALUES (
      v_booking.trainer_id,
      p_booking_id,
      v_booking.client_id,
      'reminder_2h',
      'sms',
      v_client.phone,
      'Session reminder',
      v_booking.scheduled_at - INTERVAL '2 hours',
      'pending',
      jsonb_build_object(
        'client_name', COALESCE(v_client.name, v_client.first_name || ' ' || v_client.last_name),
        'service_name', v_booking.service_name,
        'scheduled_at', v_booking.scheduled_at
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create reminders when booking is confirmed
CREATE OR REPLACE FUNCTION on_booking_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    PERFORM create_booking_reminders(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_booking_confirmed_reminders
  AFTER INSERT OR UPDATE ON ta_bookings
  FOR EACH ROW
  EXECUTE FUNCTION on_booking_confirmed();

-- Comments
COMMENT ON TABLE ta_notifications IS 'Queue for email/SMS notifications';
COMMENT ON TABLE ta_notification_preferences IS 'User preferences for notifications';
COMMENT ON COLUMN ta_notifications.scheduled_for IS 'When to send (null = send immediately)';
COMMENT ON COLUMN ta_notifications.template_data IS 'JSON data for email/SMS templates';
