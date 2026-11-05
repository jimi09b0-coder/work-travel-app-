// Load Supabase from a primary CDN with a fallback.
// A blocked CDN must not silently leave WorkWay as a blank page.
let createClient;
let primaryLoadError;
try {
  ({ createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"));
} catch (error) {
  primaryLoadError = error;
  try {
    ({ createClient } = await import("https://esm.sh/@supabase/supabase-js@2"));
  } catch (fallbackError) {
    console.error("WorkWay: Supabase library failed to load from both CDNs.", primaryLoadError, fallbackError);
    throw new Error("تعذر تحميل خدمة الاتصال. تحقق من الإنترنت ثم أعد المحاولة.");
  }
}

export const supabase = createClient(
  "https://zwdixozyrvhmjrhboqti.supabase.co",
  "sb_publishable_b3p64FMUtYtk0ejBuZAPtw_nn_lHTZ0"
);
