// =====================================================
// Supabase Config
// ملف الاتصال بقاعدة بيانات مُوجّه
// =====================================================

// حط بيانات مشروعك من Supabase هنا
const SUPABASE_URL = "https://gybksasoembmgdevogpv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5YmtzYXNvZW1ibWdkZXZvZ3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NzEyNjIsImV4cCI6MjA5NzM0NzI2Mn0.U0QFX7WS9ETbV0JmMYe-VNZhErJAPtZxwEBASep7AA4";

// لا تعدل هذا السطر
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
