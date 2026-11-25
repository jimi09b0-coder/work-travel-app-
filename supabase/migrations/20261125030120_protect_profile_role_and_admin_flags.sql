-- Prevent non-admin users from changing their account role or admin flag.
-- Mirrors the production migration protect_profile_role_and_admin_flags.
CREATE OR REPLACE FUNCTION private.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF NOT private.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.role IS DISTINCT FROM 'candidate' OR COALESCE(NEW.is_admin, false) THEN
        RAISE EXCEPTION 'Only administrators may assign privileged profile fields';
      END IF;
    ELSE
      IF NEW.role IS DISTINCT FROM OLD.role OR NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
        RAISE EXCEPTION 'Only administrators may change privileged profile fields';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS profiles_prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_privilege_escalation
BEFORE INSERT OR UPDATE OF role, is_admin ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION private.prevent_profile_privilege_escalation();
