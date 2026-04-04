-- Migration 034: Document Management with Supabase Storage
CREATE TABLE documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Entity and Reference
  entity entity_type NOT NULL,
  gov_lead_id uuid REFERENCES gov_leads(id) ON DELETE SET NULL,
  commercial_lead_id uuid REFERENCES commercial_leads(id) ON DELETE SET NULL,
  subcontractor_id uuid REFERENCES subcontractors(id) ON DELETE SET NULL,

  -- File Metadata
  file_name text NOT NULL,
  file_type text,
  file_size bigint,
  storage_path text NOT NULL,

  -- Document Classification
  document_type text, -- solicitation, proposal, teaming_agreement, capability_statement, pricing, contract, correspondence, certification, other
  description text,

  -- Tracking
  uploaded_by uuid,
  version int DEFAULT 1,
  is_archived boolean DEFAULT false,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_documents_entity ON documents(entity);
CREATE INDEX idx_documents_gov_lead ON documents(gov_lead_id);
CREATE INDEX idx_documents_commercial_lead ON documents(commercial_lead_id);
CREATE INDEX idx_documents_subcontractor ON documents(subcontractor_id);
CREATE INDEX idx_documents_document_type ON documents(document_type);
CREATE INDEX idx_documents_created ON documents(created_at DESC);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_read" ON documents
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    user_can_access_entity(auth.uid(), entity::text)
  );

CREATE POLICY "documents_write" ON documents
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid())
  );

CREATE POLICY "documents_update" ON documents
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid())
  ) WITH CHECK (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid())
  );

CREATE POLICY "documents_delete" ON documents
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    user_can_edit(auth.uid())
  );
