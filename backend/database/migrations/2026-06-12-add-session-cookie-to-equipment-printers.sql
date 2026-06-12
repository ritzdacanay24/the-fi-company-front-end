ALTER TABLE equipment_printers
  ADD COLUMN session_cookie TEXT NULL COMMENT 'Browser session cookie string for printer API auth (e.g. ID=xxx; loginState=true; menuType=Admin)';
