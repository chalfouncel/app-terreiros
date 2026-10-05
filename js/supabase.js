// Importando o Supabase via CDN
const { createClient } = supabase;

// URL baseada no Project ID da sua imagem
const supabaseUrl = 'https://pbjwqhfzsvdougeksztq.supabase.co';

// Chave Pública (anon / publishable)
const supabaseKey = 'sb_publishable_Ri0hesG16fjM1mxdk2LoLQ_zLFbAmLT';

// Criando a conexão global
const supabaseClient = createClient(supabaseUrl, supabaseKey);
