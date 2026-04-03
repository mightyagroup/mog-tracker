-- Create webhook_logs table to track all webhook invocations
CREATE TABLE webhook_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Request metadata
  endpoint text NOT NULL,
  method text NOT NULL DEFAULT 'POST',
  source_ip text,

  -- Response status
  response_status int,
  success boolean NOT NULL DEFAULT false,
  error_message text,

  -- Request and response data
  request_body jsonb,

  -- Timestamp
  logged_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create trigger for updated_at
CREATE TRIGGER update_webhook_logs_updated_at
  BEFORE UPDATE ON webhook_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for filtering
CREATE INDEX idx_webhook_logs_endpoint ON webhook_logs(endpoint);
CREATE INDEX idx_webhook_logs_success ON webhook_logs(success);
CREATE INDEX idx_webhook_logs_logged_at ON webhook_logs(logged_at DESC);

-- Enable RLS
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read webhook logs
CREATE POLICY "Authenticated users can read webhook logs" ON webhook_logs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role to insert logs (from webhooks)
CREATE POLICY "Service role can insert webhook logs" ON webhook_logs
  FOR INSERT WITH CHECK (true);
