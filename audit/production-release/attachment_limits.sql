-- Restrict future message-attachment uploads; existing files remain untouched.
DO $attachments$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='message-attachments' AND NOT public)
 THEN RAISE EXCEPTION 'Expected private message-attachments bucket'; END IF;
 IF EXISTS(SELECT 1 FROM storage.buckets WHERE id='message-attachments'
 AND ((file_size_limit IS NOT NULL AND file_size_limit<>5242880)
 OR (allowed_mime_types IS NOT NULL AND allowed_mime_types<>ARRAY['application/pdf','image/jpeg','image/png'])))
 THEN RAISE EXCEPTION 'Attachment configuration drift; inspect before changing'; END IF;
END $attachments$;
UPDATE storage.buckets SET file_size_limit=5242880,
 allowed_mime_types=ARRAY['application/pdf','image/jpeg','image/png']
WHERE id='message-attachments';
