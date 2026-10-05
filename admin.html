<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Painel Admin - Templo</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <!-- Ícones do FontAwesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gray-100 min-h-screen flex">

    <!-- Menu Lateral (Sidebar) -->
    <aside class="w-64 bg-[#1e3a8a] text-white flex flex-col shadow-xl">
        <div class="p-6 text-center border-b border-blue-800">
            <h1 class="text-2xl font-bold text-white">Painel Gestão</h1>
            <p class="text-xs text-blue-300 mt-1" id="nomeTerreiroSidebar">Carregando...</p>
        </div>
        <nav class="flex-1 p-4 space-y-2 mt-4">
            <a href="#" id="menuVisaoGeral" class="menu-item block py-2.5 px-4 bg-blue-800 rounded-lg hover:bg-blue-700 transition flex items-center">
                <i class="fas fa-home w-6"></i> Visão Geral
            </a>
            <a href="#" id="menuQuadroMediuns" class="menu-item block py-2.5 px-4 rounded-lg hover:bg-blue-800 transition flex items-center">
                <i class="fas fa-users w-6"></i> Quadro de Médiuns
            </a>
            <a href="#" id="menuAgendaGiras" class="menu-item block py-2.5 px-4 rounded-lg hover:bg-blue-800 transition flex items-center">
                <i class="fas fa-calendar-alt w-6"></i> Agenda de Giras
            </a>
        </nav>
        <div class="p-4 border-t border-blue-800">
            <button id="btnSair" class="w-full py-2 px-4 bg-red-600 rounded-lg hover:bg-red-700 transition flex items-center justify-center">
                <i class="fas fa-sign-out-alt mr-2"></i> Sair do Sistema
            </button>
        </div>
    </aside>

    <!-- Conteúdo Principal -->
    <main class="flex-1 p-8 overflow-y-auto">
        <!-- SECÃO: VISÃO GERAL -->
        <div id="secVisaoGeral" class="secao-painel">
        <header class="flex justify-between items-center mb-8">
            <div>
                <h2 class="text-3xl font-bold text-gray-800">Visão Geral</h2>
                <p class="text-gray-500" id="dataHoje"></p>
            </div>
            <div class="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200 flex items-center">
                <i class="fas fa-user-circle text-[#16a34a] text-xl mr-2"></i>
                <span class="text-gray-700 font-medium" id="nomeAdmin">Olá, Admin</span>
            </div>
        </header>

        <!-- Cartões de Resumo (Cards) -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-white p-6 rounded-xl shadow-sm border-l-4 border-[#16a34a]">
                <h3 class="text-gray-500 text-sm font-bold uppercase tracking-wider">Médiuns Presentes Hoje</h3>
                <p class="text-4xl font-bold text-gray-800 mt-2" id="totalPresentes">0</p>
            </div>
            <div class="bg-white p-6 rounded-xl shadow-sm border-l-4 border-[#1e3a8a]">
                <h3 class="text-gray-500 text-sm font-bold uppercase tracking-wider">Total Cadastrados</h3>
                <p class="text-4xl font-bold text-gray-800 mt-2" id="totalMediuns">0</p>
            </div>
            <div class="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
                <h3 class="text-gray-500 text-sm font-bold uppercase tracking-wider">Próxima Gira</h3>
                <p class="text-lg font-bold text-gray-800 mt-2" id="proximaGira">Buscando...</p>
            </div>
        </div>

        <!-- Módulo: Gravar Localização (GPS) -->
        <div class="bg-white p-6 rounded-xl shadow-sm border-t-4 border-[#1e3a8a] mb-8">
            <div class="flex items-center mb-4">
                <div class="bg-blue-100 p-3 rounded-full mr-4 text-[#1e3a8a]">
                    <i class="fas fa-map-marker-alt w-6 h-6 flex items-center justify-center text-xl"></i>
                </div>
                <div>
                    <h3 class="text-xl font-bold text-gray-800">Localização Sede (GPS)</h3>
                    <p class="text-sm text-gray-500">Define o ponto exato para a validação do check-in dos médiuns.</p>
                </div>
            </div>
            <p class="text-sm text-gray-600 mb-5 pl-16">
                Vá fisicamente até o centro do terreiro com o seu celular e clique no botão abaixo. Isso garantirá que o sistema registre a coordenada exata para as próximas giras.
            </p>
            <div class="pl-16">
                <button id="btnGravarLocalizacao" class="w-full sm:w-auto bg-[#1e3a8a] hover:bg-blue-900 focus:ring-4 focus:ring-blue-300 text-white font-bold py-3 px-6 rounded-lg shadow flex items-center justify-center transition-all">
                    Gravar Localização Atual
                </button>
                <div id="msgLocalizacao" class="mt-4 hidden"></div>
            </div>
        </div>

        <!-- Lista de Presença do Dia -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-bold text-gray-800">Lista de Presença (Hoje)</h3>
                <button class="text-sm text-white bg-[#1e3a8a] px-3 py-1 rounded hover:bg-blue-800 transition">
                    <i class="fas fa-file-export mr-1"></i> Exportar
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-200">
                            <th class="p-3 text-sm font-semibold text-gray-600">MÉDIUM</th>
                            <th class="p-3 text-sm font-semibold text-gray-600">GRAU / FUNÇÃO</th>
                            <th class="p-3 text-sm font-semibold text-gray-600">HORÁRIO CHEGADA</th>
                            <th class="p-3 text-sm font-semibold text-gray-600">STATUS</th>
                        </tr>
                    </thead>
                    <tbody id="tabelaPresencas">
                        <tr>
                            <td colspan="4" class="p-6 text-center text-gray-500">Carregando lista de presenças...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        </div> <!-- Fim secVisaoGeral -->

        <!-- SECÃO: QUADRO DE MÉDIUNS -->
        <div id="secQuadroMediuns" class="secao-painel hidden">
            <header class="mb-8">
                <h2 class="text-3xl font-bold text-gray-800">Quadro de Médiuns</h2>
                <p class="text-gray-500">Lista completa de todos os médiuns cadastrados.</p>
            </header>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-200">
                            <th class="p-3 text-sm font-semibold text-gray-600">NOME</th>
                            <th class="p-3 text-sm font-semibold text-gray-600">GRAU / FUNÇÃO</th>
                            <th class="p-3 text-sm font-semibold text-gray-600">WHATSAPP</th>
                            <th class="p-3 text-sm font-semibold text-gray-600">STATUS CADASTRO</th>
                        </tr>
                    </thead>
                    <tbody id="tabelaTodosMediuns">
                        <tr><td colspan="4" class="p-6 text-center text-gray-500">Carregando...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- SECÃO: AGENDA DE GIRAS -->
        <div id="secAgendaGiras" class="secao-painel hidden">
            <header class="mb-8">
                <h2 class="text-3xl font-bold text-gray-800">Agenda de Giras</h2>
                <p class="text-gray-500">Agende novas giras. Envie a arte do seu celular/PC ou cole um link.</p>
            </header>
            
            <div class="bg-white p-6 rounded-xl shadow-sm border-t-4 border-purple-500 mb-8">
                <h3 class="text-lg font-bold text-gray-800 mb-4">Nova Gira</h3>
                <form id="formNovaGira" class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Título da Gira</label>
                            <input type="text" id="giraTitulo" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500" placeholder="Ex: Gira de Caboclo">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Imagem (Envie do seu celular ou PC)</label>
                            <input type="file" id="giraArquivo" accept="image/*" class="mt-1 block w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 bg-white text-sm">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Data e Hora de Início</label>
                            <input type="datetime-local" id="giraInicio" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Data e Hora de Fim</label>
                            <input type="datetime-local" id="giraFim" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500">
                        </div>
                        <div class="md:col-span-2 border-t pt-4 mt-2">
                            <label class="block text-sm font-medium text-gray-700">OU Cole um Link de Imagem (opcional, use caso não envie o arquivo acima)</label>
                            <input type="url" id="giraImagem" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500" placeholder="https://...">
                        </div>
                    </div>
                    <div class="mt-4">
                        <button type="submit" id="btnSalvarGira" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded shadow flex items-center justify-center">
                            Salvar Gira na Agenda
                        </button>
                        <p id="msgGira" class="text-sm mt-2 hidden"></p>
                    </div>
                </form>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 class="text-lg font-bold text-gray-800 mb-4">Próximas Giras Agendadas</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-gray-50 border-b border-gray-200">
                                <th class="p-3 text-sm font-semibold text-gray-600">TÍTULO</th>
                                <th class="p-3 text-sm font-semibold text-gray-600">DATA / HORA</th>
                                <th class="p-3 text-sm font-semibold text-gray-600">IMAGEM</th>
                            </tr>
                        </thead>
                        <tbody id="tabelaGirasCadastradas">
                            <tr><td colspan="3" class="p-6 text-center text-gray-500">Carregando...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

    </main>

    <script src="js/supabase.js"></script>
    <script src="js/admin.js"></script>
</body>
</html>
