// Configuração e conexão com o banco de dados Supabase

const supabaseUrl = 'https://nuawimaiurffhxqetsrj.supabase.co';
const supabaseKey = 'sb_publishable_DsDDE8cXPNorqcrdrTiylw_yi89qRYt';

// Inicia o cliente do Supabase para usarmos em todo o site
const supabaseCliente = supabase.createClient(supabaseUrl, supabaseKey);