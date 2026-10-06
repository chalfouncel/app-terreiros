<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Painel Admin - Templo</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --cor-primaria: #1e3a8a;   
            --cor-secundaria: #16a34a; 
            --cor-fundo: #f3f4f6;      
            --cor-texto: #1f2937;      
        }
        
        .bg-tema-primaria { background-color: var(--cor-primaria) !important; }
        .text-tema-primaria { color: var(--cor-primaria) !important; }
        .border-tema-primaria { border-color: var(--cor-primaria) !important; }
        
        .bg-tema-secundaria { background-color: var(--cor-secundaria) !important; }
        .text-tema-secundaria { color: var(--cor-secundaria) !important; }
        .border-tema-secundaria { border-color: var(--cor-secundaria) !important; }
        
        .bg-tema-fundo { background-color: var(--cor-fundo) !important; }
        .text-tema-texto { color: var(--cor-texto) !important; }

        body {
            background-color: var(--cor-fundo);
            color: var(--cor-texto);
            transition: background-color 0.3s ease;
        }
    </style>
</head>
<body class="min-h-screen flex transition-colors duration-300 overflow-hidden">

    <div id="overlayMobile" class="fixed inset-0 bg-black/50 z-40 hidden md:hidden transition-opacity"></div>

    <aside id="sidebar" class="fixed md:static inset-y-0 left-0 transform -translate-x-full md:translate-x-0 z-50 w-64 bg-tema-primaria text-white flex flex-col shadow-xl transition-transform duration-300">
        <div class="p-6 text-center border-b border-white/10 flex flex-col items-center relative">
            <button id="btnFecharMenu" class="md:hidden absolute top-4 right-4 text-white/70 hover:text-white">
                <i class="fas fa-times text-xl"></i>
            </button>
            <img id="logoSidebar" src="" class="hidden max-h-20 mb-3 rounded-lg bg-white/10 p-1 object-contain" alt="Ponto da Casa">
            <h1 class="text-xl font-bold text-white drop-shadow-md">Painel Gestão</h1>
            <p class="text-xs text-white/80 mt-1" id="nomeTerreiroSidebar">Carregando...</p>
        </div>
        <nav class="flex-1 p-4 space-y-2 mt-4">
            <a href="#" id="menuVisaoGeral" class="menu-item block py-2.5 px-4 bg-white/20 rounded-lg hover:bg-white/10 transition flex items-center">
                <i class="fas fa-home w-6 mr-2"></i> Visão Geral
            </a>
            <a href="#" id="menuQuadroMediuns" class="menu-item block py-2.5 px-4 rounded-lg hover:bg-white/10 transition flex items-center">
                <i class="fas fa-users w-6 mr-2"></i> Quadro de Médiuns
            </a>
            <a href="#" id="menuAgendaGiras" class="menu-item block py-2.5 px-4 rounded-lg hover:bg-white/10 transition flex items-center">
                <i class="fas fa-calendar-alt w-6 mr-2"></i> Agenda de Eventos
            </a>
            <hr class="border-white/10 my-2">
            <a href="#" id="menuGrau" class="menu-item block py-2.5 px-4 rounded-lg hover:bg-white/10 transition flex items-center">
                <i class="fas fa-graduation-cap w-6 mr-2"></i> Alteração de Grau
            </a>
            <a href="#" id="menuFinanceiro" class="menu-item block py-2.5 px-4 rounded-lg hover:bg-white/10 transition flex items-center font-medium">
                <i class="fas fa-file-invoice-dollar w-6 mr-2"></i> Financeiro
            </a>
            <hr class="border-white/10 my-2">
            <a href="#" id="menuDoacoes" class="menu-item block py-2.5 px-4 rounded-lg hover:bg-white/10 transition flex items-center font-medium">
                <i class="fas fa-hand-holding-heart w-6 mr-2 text-red-400"></i> Doações / Campanhas
            </a>
            <hr class="border-white/10 my-2">
            <a href="#" id="menuAdmin" class="menu-item block py-2.5 px-4 rounded-lg hover:bg-white/10 transition flex items-center font-bold text-yellow-300">
                <i class="fas fa-cog w-6 mr-2"></i> Config. da Casa
            </a>
            <a href="#" id="menuMaster" class="menu-item hidden py-2.5 px-4 rounded-lg bg-gray-900/50 hover:bg-gray-900/80 border border-gray-700 transition flex items-center font-black text-white mt-4 shadow-inner">
                <i class="fas fa-globe w-6 mr-2 text-blue-400"></i> Gestão Plataforma
            </a>
        </nav>
        <div class="p-4 border-t border-white/10">
            <button id="btnSair" class="w-full py-2 px-4 bg-red-500/80 hover:bg-red-600 rounded-lg transition flex items-center justify-center font-bold shadow-lg">
                <i class="fas fa-sign-out-alt mr-2"></i> Sair do Sistema
            </button>
        </div>
    </aside>

    <div class="flex-1 flex flex-col h-screen overflow-hidden">
        <div class="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm flex-shrink-0">
            <div class="flex items-center gap-3">
                <button id="btnAbrirMenu" class="text-tema-primaria focus:outline-none">
                    <i class="fas fa-bars text-2xl"></i>
                </button>
                <h1 class="font-bold text-gray-800" id="tituloMobile">Visão Geral</h1>
            </div>
            <div class="bg-gray-100 p-2 rounded-full flex items-center justify-center text-tema-secundaria">
                <i class="fas fa-user-circle text-xl"></i>
            </div>
        </div>

        <main class="flex-1 p-4 md:p-8 overflow-y-auto">
            <header class="hidden md:flex justify-between items-center mb-8">
                <div>
                    <h2 class="text-3xl font-bold text-tema-texto" id="tituloSecao">Visão Geral</h2>
                    <p class="text-gray-500" id="dataHoje"></p>
                </div>
                <div class="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200 flex items-center">
                    <i class="fas fa-user-circle text-tema-secundaria text-xl mr-2"></i>
                    <span class="text-gray-700 font-medium" id="nomeAdmin">Olá, Admin</span>
                </div>
            </header>
            
            <p class="md:hidden text-gray-500 text-sm mb-4 font-medium" id="dataHojeMobile"></p>

        <div id="secVisaoGeral" class="secao-painel">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="bg-white p-6 rounded-xl shadow-sm border-l-4 border-tema-secundaria">
                    <h3 class="text-gray-500 text-sm font-bold uppercase tracking-wider">Médiuns Presentes Hoje</h3>
                    <p class="text-4xl font-bold text-tema-texto mt-2" id="totalPresentes">0</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-sm border-l-4 border-tema-primaria">
                    <h3 class="text-gray-500 text-sm font-bold uppercase tracking-wider">Total Cadastrados</h3>
                    <p class="text-4xl font-bold text-tema-texto mt-2" id="totalMediuns">0</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
                    <h3 class="text-gray-500 text-sm font-bold uppercase tracking-wider">Próximo Evento</h3>
                    <p class="text-lg font-bold text-tema-texto mt-2" id="proximaGira">Buscando...</p>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 class="text-lg font-bold text-tema-texto mb-4">Lista de Presença (Hoje)</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-gray-50 border-b border-gray-200">
                                <th class="p-3 text-sm font-semibold text-gray-600">MÉDIUM</th>
                                <th class="p-3 text-sm font-semibold text-gray-600">HORÁRIO CHEGADA</th>
                                <th class="p-3 text-sm font-semibold text-gray-600">STATUS</th>
                            </tr>
                        </thead>
                        <tbody id="tabelaPresencas">
                            <tr><td colspan="3" class="p-6 text-center text-gray-500">Carregando lista...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="secQuadroMediuns" class="secao-painel hidden">
            <div class="bg-white rounded-xl shadow-sm border-t-4 border-tema-primaria p-6 mb-8">
                <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div>
                        <h3 class="text-xl font-bold text-tema-texto">Gestão de Médiuns</h3>
                        <p class="text-sm text-gray-500">Gerencie a corrente da casa e adicione novos médiuns.</p>
                    </div>
                    <button onclick="abrirModalNovoMedium()" class="w-full md:w-auto bg-tema-secundaria hover:opacity-90 text-white font-bold py-2.5 px-5 rounded-lg shadow-sm transition flex items-center justify-center active:scale-95">
                        <i class="fas fa-user-plus mr-2"></i> Novo Médium
                    </button>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-200">
                            <th class="p-3 text-sm font-semibold text-gray-600">NOME COMPLETO</th>
                            <th class="p-3 text-sm font-semibold text-gray-600">GRAU / FUNÇÃO</th>
                            <th class="p-3 text-sm font-semibold text-gray-600">WHATSAPP</th>
                            <th class="p-3 text-sm font-semibold text-gray-600">STATUS</th>
                            <th class="p-3 text-sm font-semibold text-gray-600 text-center w-20">AÇÕES</th>
                        </tr>
                    </thead>
                    <tbody id="tabelaTodosMediuns"></tbody>
                </table>
            </div>
        </div>
        </div>

        <div id="secAgendaGiras" class="secao-painel hidden">
            <div class="bg-white p-6 rounded-xl shadow-sm border-t-4 border-purple-500 mb-8">
                <h3 class="text-lg font-bold text-tema-texto mb-4">Novo Evento</h3>
                <form id="formNovaGira" class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Título do Evento</label>
                            <input type="text" id="giraTitulo" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Arte/Imagem (Arquivo ou Link)</label>
                            <div class="flex flex-col space-y-2 mt-1">
                                <input type="file" id="giraArquivo" accept="image/*" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100">
                                <span class="text-xs text-gray-400">Ou cole um Link abaixo:</span>
                                <input type="url" id="giraImagem" class="block w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="https://...">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Início</label>
                            <input type="datetime-local" id="giraInicio" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Fim</label>
                            <input type="datetime-local" id="giraFim" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                        </div>
                    </div>
                    
                    <div class="bg-purple-50 p-3 rounded-lg border border-purple-100 flex items-center space-x-2 mt-2">
                        <input type="checkbox" id="giraGeraAta" class="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 cursor-pointer">
                        <label for="giraGeraAta" class="text-sm font-bold text-purple-900 cursor-pointer select-none"><i class="fas fa-file-signature mr-1"></i> Gerar ATA em PDF (Livro de Presença) para este evento</label>
                    </div>

                    <button type="submit" id="btnSalvarGira" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded shadow mt-4">
                        Salvar Evento
                    </button>
                    <p id="msgGira" class="text-sm mt-2 hidden"></p>
                </form>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 class="text-lg font-bold text-tema-texto mb-4">Eventos Agendados</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-gray-50 border-b border-gray-200">
                                <th class="p-3 text-sm font-semibold text-gray-600">EVENTO</th>
                                <th class="p-3 text-sm font-semibold text-gray-600">DATA / HORA</th>
                                <th class="p-3 text-sm font-semibold text-gray-600 text-center">OPÇÕES / DOCUMENTOS</th>
                            </tr>
                        </thead>
                        <tbody id="tabelaGirasCadastradas"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="secGrau" class="secao-painel hidden">
            <div class="bg-white rounded-xl shadow-sm border-t-4 border-tema-primaria p-6 overflow-x-auto">
                <p class="text-sm text-gray-500 mb-4">Selecione o grau e a função do médium e clique em Salvar na respectiva linha.</p>
                
                <input type="text" id="buscaMediumGrau" placeholder="🔍 Pesquisar por nome do médium..." class="w-full mb-6 px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-tema-primaria focus:border-tema-primaria outline-none text-lg">

                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-200">
                            <th class="p-3 text-sm font-semibold text-gray-600 w-2/5">NOME COMPLETO</th>
                            <th class="p-3 text-sm font-semibold text-gray-600">GRAU</th>
                            <th class="p-3 text-sm font-semibold text-gray-600">FUNÇÃO</th>
                            <th class="p-3 text-sm font-semibold text-gray-600 text-center w-32">AÇÃO</th>
                        </tr>
                    </thead>
                    <tbody id="tabelaGraus"></tbody>
                </table>
            </div>
        </div>

        <div id="secFinanceiro" class="secao-painel hidden">
            <div class="bg-white rounded-xl shadow-sm border-t-4 border-tema-secundaria p-6">
                <div class="flex justify-between items-center mb-6">
                    <p class="text-sm text-gray-500">Marque o mês para registrar o pagamento. O salvamento é automático!</p>
                    <div class="flex items-center space-x-2">
                        <label class="font-bold text-gray-700">Ano de Referência:</label>
                        <select id="selectAnoFinanceiro" class="border border-gray-300 rounded px-3 py-1 font-bold text-gray-800 bg-gray-50">
                            <option value="2026">2026</option>
                            <option value="2027">2027</option>
                            <option value="2028">2028</option>
                        </select>
                    </div>
                </div>
                
                <div class="overflow-x-auto" style="max-height: 70vh;">
                    <table class="w-full text-center border-collapse text-sm">
                        <thead class="sticky top-0 z-20 shadow-sm">
                            <tr class="bg-gray-100 border-b border-gray-200">
                                <th class="py-2 px-3 text-left font-semibold text-gray-700 sticky left-0 bg-gray-100 z-30 min-w-[220px]">NOME COMPLETO</th>
                                <th class="py-2 px-1 font-semibold text-gray-600">JAN</th>
                                <th class="py-2 px-1 font-semibold text-gray-600">FEV</th>
                                <th class="py-2 px-1 font-semibold text-gray-600">MAR</th>
                                <th class="py-2 px-1 font-semibold text-gray-600">ABR</th>
                                <th class="py-2 px-1 font-semibold text-gray-600">MAI</th>
                                <th class="py-2 px-1 font-semibold text-gray-600">JUN</th>
                                <th class="py-2 px-1 font-semibold text-gray-600">JUL</th>
                                <th class="py-2 px-1 font-semibold text-gray-600">AGO</th>
                                <th class="py-2 px-1 font-semibold text-gray-600">SET</th>
                                <th class="py-2 px-1 font-semibold text-gray-600">OUT</th>
                                <th class="py-2 px-1 font-semibold text-gray-600">NOV</th>
                                <th class="py-2 px-1 font-semibold text-gray-600">DEZ</th>
                                <th class="py-2 px-2 font-semibold text-gray-600 bg-gray-200">STATUS</th>
                            </tr>
                        </thead>
                        <tbody id="tabelaFinanceiro"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="secDoacoes" class="secao-painel hidden">
            
            <div class="bg-white p-6 rounded-xl shadow-sm border-t-4 border-tema-secundaria mb-8">
                <div class="flex justify-between items-center mb-2 flex-wrap gap-3">
                    <h3 class="text-xl font-bold text-tema-texto">
                        <i class="fas fa-box-open mr-2 text-tema-secundaria"></i> Doações Registradas
                    </h3>
                    <button id="btnGerarPDF" class="bg-gray-800 text-white text-sm font-bold px-4 py-2 rounded-lg shadow hover:bg-gray-700 transition flex items-center active:scale-95">
                        <i class="fas fa-file-pdf mr-2 text-red-400"></i> Exportar para PDF
                    </button>
                </div>
                <p class="text-sm text-gray-500 mb-6">Acompanhe aqui o que os médiuns se comprometeram a trazer e dê baixa quando for entregue.</p>
                
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-gray-50 border-b border-gray-200">
                                <th class="p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">MÉDIUM</th>
                                <th class="p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ITEM / CATEGORIA</th>
                                <th class="p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">QTD</th>
                                <th class="p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">DATA</th>
                                <th class="p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">STATUS</th>
                            </tr>
                        </thead>
                        <tbody id="tabelaDoacoesPrometidas">
                            <tr><td colspan="5" class="p-4 text-center text-gray-500">Buscando doações...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="bg-white p-6 rounded-xl shadow-sm border-t-4 border-red-500 mb-8">
                <h3 class="text-lg font-bold text-tema-texto mb-4"><i class="fas fa-plus-circle text-red-500 mr-2"></i> Novo Item de Doação</h3>
                <form id="formNovoItemDoacao" class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Nome do Item/Campanha *</label>
                            <input type="text" id="doacaoNome" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm outline-none focus:ring-2 focus:ring-red-400" placeholder="Ex: Vela de 7 dias, Cesta Básica...">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Valor Sugerido (Opcional)</label>
                            <input type="number" step="0.01" id="doacaoValor" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm outline-none focus:ring-2 focus:ring-red-400" placeholder="Ex: 15.00">
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700">Descrição curta (Opcional)</label>
                            <input type="text" id="doacaoDescricao" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm outline-none focus:ring-2 focus:ring-red-400" placeholder="Ex: Para a firmeza do conga...">
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700">Link da Imagem (Opcional)</label>
                            <input type="url" id="doacaoImagem" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm outline-none focus:ring-2 focus:ring-red-400" placeholder="https://...">
                        </div>
                    </div>
                    <button type="submit" id="btnSalvarDoacao" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded shadow mt-4 transition">
                        Cadastrar Item
                    </button>
                    <p id="msgDoacao" class="text-sm mt-2 hidden"></p>
                </form>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-tema-texto">Catálogo de Itens do Terreiro</h3>
                    <p class="text-xs text-gray-500">Você pode ativar ou desativar itens da lista original aqui.</p>
                </div>
                <div class="overflow-x-auto" style="max-height: 400px;">
                    <table class="w-full text-left border-collapse">
                        <thead class="sticky top-0 bg-white shadow-sm">
                            <tr class="bg-gray-50 border-b border-gray-200">
                                <th class="p-3 text-sm font-semibold text-gray-600">ITEM</th>
                                <th class="p-3 text-sm font-semibold text-gray-600">CATEGORIA</th>
                                <th class="p-3 text-sm font-semibold text-gray-600 text-center w-24">AÇÃO</th>
                            </tr>
                        </thead>
                        <tbody id="tabelaItensDoacao">
                            <tr><td colspan="3" class="p-4 text-center text-gray-500">Buscando itens...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="secAdministracao" class="secao-painel hidden">
            <div class="bg-white p-6 rounded-xl shadow-sm border-t-4 border-green-500 mb-8">
                <div class="flex items-center mb-4">
                    <div class="bg-green-100 p-3 rounded-full mr-4 text-green-600">
                        <i class="fas fa-map-marker-alt w-6 h-6 flex items-center justify-center text-xl"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-tema-texto">Localização Sede (GPS)</h3>
                        <p class="text-sm text-gray-500">Define o ponto exato para a validação do check-in dos médiuns.</p>
                    </div>
                </div>
                <p class="text-sm text-gray-600 mb-5 pl-16">
                    Vá fisicamente até o centro do terreiro com o seu celular e clique no botão abaixo. Isso garantirá que o sistema registre a coordenada exata.
                </p>
                <div class="pl-16">
                    <button id="btnGravarLocalizacao" class="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow flex items-center justify-center transition-all">
                        Gravar Localização Atual
                    </button>
                    <div id="msgLocalizacao" class="mt-4 hidden"></div>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border-t-4 border-tema-primaria p-6 mb-8">
                <h3 class="text-xl font-bold text-tema-texto mb-2"><i class="fas fa-image mr-2 text-tema-secundaria"></i> Ponto / Logo da Casa</h3>
                <p class="text-sm text-gray-500 mb-6">Esta imagem substituirá os textos no menu lateral e balizará a identidade visual do sistema.</p>

                <div class="flex items-start space-x-6">
                    <div class="flex-shrink-0 w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden relative">
                        <img id="previewLogo" src="" class="hidden max-w-full max-h-full object-contain p-2">
                        <div id="placeholderLogo" class="text-gray-400 text-center">
                            <i class="fas fa-camera text-3xl mb-1"></i><br><span class="text-xs">Sem Logo</span>
                        </div>
                    </div>
                    <div class="flex-1">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Enviar nova imagem (Preferência para fundo transparente PNG)</label>
                        <input type="file" id="uploadLogo" accept="image/*" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 mb-3 cursor-pointer">
                        <button id="btnSalvarLogo" class="bg-tema-primaria hover:opacity-90 text-white px-5 py-2 rounded shadow transition text-sm font-bold">
                            Salvar Imagem
                        </button>
                        <p id="msgLogo" class="text-xs font-bold mt-2 hidden"></p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border-t-4 border-tema-secundaria p-6">
                <h3 class="text-xl font-bold text-tema-texto mb-2"><i class="fas fa-palette mr-2 text-tema-secundaria"></i> Identidade Visual (Cores)</h3>
                <p class="text-sm text-gray-500 mb-6">Altere as cores do sistema para deixá-lo com a cara do seu terreiro. Clique na caixa colorida para escolher.</p>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div class="p-4 border border-gray-100 rounded-lg bg-gray-50 flex justify-between items-center hover:shadow-sm transition">
                        <div>
                            <h4 class="font-bold text-gray-800">Cor Primária</h4>
                            <p class="text-xs text-gray-500">Menu lateral, botões principais e cabeçalhos.</p>
                        </div>
                        <input type="color" id="corPrimaria" class="w-14 h-14 cursor-pointer border-0 rounded bg-transparent">
                    </div>

                    <div class="p-4 border border-gray-100 rounded-lg bg-gray-50 flex justify-between items-center hover:shadow-sm transition">
                        <div>
                            <h4 class="font-bold text-gray-800">Cor Secundária</h4>
                            <p class="text-xs text-gray-500">Botões de ação rápida, destaques e sucessos.</p>
                        </div>
                        <input type="color" id="corSecundaria" class="w-14 h-14 cursor-pointer border-0 rounded bg-transparent">
                    </div>

                    <div class="p-4 border border-gray-100 rounded-lg bg-gray-50 flex justify-between items-center hover:shadow-sm transition">
                        <div>
                            <h4 class="font-bold text-gray-800">Cor de Fundo da Tela</h4>
                            <p class="text-xs text-gray-500">O fundo geral de todas as páginas.</p>
                        </div>
                        <input type="color" id="corFundo" class="w-14 h-14 cursor-pointer border-0 rounded bg-transparent">
                    </div>

                    <div class="p-4 border border-gray-100 rounded-lg bg-gray-50 flex justify-between items-center hover:shadow-sm transition">
                        <div>
                            <h4 class="font-bold text-gray-800">Cor do Texto Principal</h4>
                            <p class="text-xs text-gray-500">Textos em destaque, títulos e rótulos.</p>
                        </div>
                        <input type="color" id="corTexto" class="w-14 h-14 cursor-pointer border-0 rounded bg-transparent">
                    </div>
                </div>

                <button id="btnSalvarCores" class="w-full sm:w-auto bg-tema-primaria hover:opacity-90 text-white font-bold py-3 px-8 rounded-lg shadow transition text-lg">
                    Salvar e Aplicar Cores
                </button>
                <p id="msgCores" class="text-sm font-bold mt-3 hidden"></p>
            </div>
        </div>

        <div id="secMaster" class="secao-painel hidden">
            <div class="bg-gray-900 p-6 rounded-xl shadow-lg border-t-4 border-blue-500 mb-8">
                <h3 class="text-lg font-bold text-white mb-4"><i class="fas fa-plus-circle text-blue-400 mr-2"></i> Novo Terreiro (Cliente)</h3>
                <form id="formNovoTerreiro" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300">Nome da Instituição</label>
                        <input type="text" id="novoTerreiroNome" required class="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white shadow-sm outline-none focus:ring-2 focus:ring-blue-400" placeholder="Ex: Templo de Umbanda Luz e Paz">
                    </div>
                    <button type="submit" id="btnSalvarTerreiro" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded shadow mt-4 transition">
                        Cadastrar Sistema
                    </button>
                    <p id="msgNovoTerreiro" class="text-sm mt-2 hidden"></p>
                </form>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-gray-800">Terreiros Ativos na Plataforma</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th class="p-3 text-sm font-semibold text-gray-600">ID</th>
                                <th class="p-3 text-sm font-semibold text-gray-600">NOME DO TERREIRO</th>
                                <th class="p-3 text-sm font-semibold text-gray-600 text-center">STATUS</th>
                                <th class="p-3 text-sm font-semibold text-gray-600 text-center">AÇÕES</th>
                            </tr>
                        </thead>
                        <tbody id="tabelaMasterTerreiros">
                            <tr><td colspan="4" class="p-4 text-center text-gray-500">Buscando clientes...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>

        </main>
    </div>

    <!-- MODAL NOVO MÉDIUM -->
    <div id="modalNovoMedium" class="hidden fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 transition-opacity">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 transform transition-all">
            <div class="flex justify-between items-center mb-4 border-b pb-2">
                <h3 class="text-xl font-bold text-tema-texto"><i class="fas fa-user-plus text-tema-secundaria mr-2"></i> Novo Médium</h3>
                <button onclick="fecharModalNovoMedium()" class="text-gray-400 hover:text-gray-600 transition"><i class="fas fa-times text-xl"></i></button>
            </div>
            
            <form id="formNovoMedium" class="space-y-4">
                <p class="text-sm text-gray-600 mb-4">Digite o nome do médium. O sistema gerará um ID numérico automaticamente para o primeiro acesso dele.</p>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Nome Completo</label>
                    <input type="text" id="novoMediumNome" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm outline-none focus:ring-2 focus:ring-tema-secundaria" placeholder="Ex: João da Silva">
                </div>
                
                <p id="msgNovoMedium" class="hidden"></p>

                <button type="submit" id="btnSalvarNovoMedium" class="w-full bg-tema-secundaria hover:opacity-90 text-white font-bold py-3 px-4 rounded-xl shadow transition mt-4 flex items-center justify-center">
                    Cadastrar Médium
                </button>
            </form>

            <div id="resultadoNovoMedium" class="hidden text-center py-4">
                <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-check text-3xl text-green-600"></i>
                </div>
                <h4 class="text-lg font-bold text-gray-800 mb-2">Médium Cadastrado!</h4>
                <p class="text-sm text-gray-600 mb-4">Passe as credenciais abaixo para o médium fazer o primeiro acesso no aplicativo:</p>
                
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 relative">
                    <p class="text-xs text-gray-500 uppercase font-bold mb-1">ID DE ACESSO (Login)</p>
                    <p class="text-4xl font-black text-tema-primaria" id="idGeradoNovoMedium">00</p>
                    
                    <div class="w-full h-px bg-gray-200 my-4"></div>
                    
                    <p class="text-xs text-gray-500 uppercase font-bold mb-1">SENHA PADRÃO</p>
                    <p class="text-2xl font-bold text-gray-800 tracking-widest">123456</p>
                </div>

                <button onclick="fecharModalNovoMedium()" class="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-4 rounded-xl shadow transition">
                    Entendi, Fechar
                </button>
            </div>
        </div>
    </div>

    <!-- MODAL DE PERMISSÕES -->
    <div id="modalPermissoes" class="hidden fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 transition-opacity">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 transform transition-all">
            <div class="flex justify-between items-center mb-4 border-b pb-2">
                <h3 class="text-xl font-bold text-gray-800"><i class="fas fa-key text-blue-500 mr-2"></i> Permissões de Acesso</h3>
                <button id="btnFecharPermissoes" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-xl"></i></button>
            </div>
            <p class="text-sm text-gray-600 mb-4">Defina quais módulos o médium <strong id="nomeMediumPermissao" class="text-tema-primaria"></strong> pode acessar no Painel Admin:</p>
            
            <input type="hidden" id="idMediumPermissao">
            
            <div class="space-y-3 mb-6">
                <label class="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded">
                    <input type="checkbox" id="chkPermVisao" class="w-5 h-5 text-tema-primaria rounded focus:ring-tema-primaria">
                    <span class="text-gray-700 font-medium"><i class="fas fa-home w-5 text-center text-gray-400 mr-1"></i> Visão Geral</span>
                </label>
                
                <label class="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded">
                    <input type="checkbox" id="chkPermAgenda" class="w-5 h-5 text-tema-primaria rounded focus:ring-tema-primaria">
                    <span class="text-gray-700 font-medium"><i class="fas fa-calendar-alt w-5 text-center text-gray-400 mr-1"></i> Agenda de Eventos</span>
                </label>
                <label class="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded">
                    <input type="checkbox" id="chkPermGrau" class="w-5 h-5 text-tema-primaria rounded focus:ring-tema-primaria">
                    <span class="text-gray-700 font-medium"><i class="fas fa-graduation-cap w-5 text-center text-gray-400 mr-1"></i> Alteração de Grau</span>
                </label>
                <label class="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded">
                    <input type="checkbox" id="chkPermFinanceiro" class="w-5 h-5 text-tema-primaria rounded focus:ring-tema-primaria">
                    <span class="text-gray-700 font-medium"><i class="fas fa-file-invoice-dollar w-5 text-center text-gray-400 mr-1"></i> Financeiro</span>
                </label>
                <label class="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded">
                    <input type="checkbox" id="chkPermDoacoes" class="w-5 h-5 text-tema-primaria rounded focus:ring-tema-primaria">
                    <span class="text-gray-700 font-medium"><i class="fas fa-hand-holding-heart w-5 text-center text-red-400 mr-1"></i> Doações / Campanhas</span>
                </label>
                <label class="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded">
                    <input type="checkbox" id="chkPermAdmin" class="w-5 h-5 text-tema-primaria rounded focus:ring-tema-primaria">
                    <span class="text-gray-700 font-medium"><i class="fas fa-cog w-5 text-center text-gray-400 mr-1"></i> Administração da Casa</span>
                </label>
            </div>
            
            <button id="btnSalvarPermissoes" class="w-full bg-tema-primaria hover:opacity-90 text-white font-bold py-3 px-4 rounded-xl shadow transition flex items-center justify-center">
                Salvar Permissões
            </button>
        </div>
    </div>

    <!-- MODAL IMPORTAÇÃO DE DADOS (CSV) -->
    <div id="modalImportarCSV" class="hidden fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 transition-opacity">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 transform transition-all">
            <div class="flex justify-between items-center mb-4 border-b pb-2">
                <h3 class="text-xl font-bold text-gray-800"><i class="fas fa-file-csv text-blue-500 mr-2"></i> Importar Médiuns</h3>
                <button onclick="fecharModalImportacao()" class="text-gray-400 hover:text-gray-600 transition"><i class="fas fa-times text-xl"></i></button>
            </div>
            
            <p class="text-sm text-gray-600 mb-4">Você está importando dados para a base de:<br><strong id="nomeTerreiroImport" class="text-blue-600 text-lg"></strong></p>
            
            <div class="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4 text-xs text-blue-800">
                <strong>Instruções do Arquivo (Excel/CSV):</strong><br>
                Salve sua planilha como <b>.csv</b> e separe as colunas com vírgula ou ponto-e-vírgula nesta ordem:<br>
                <span class="font-mono bg-white px-1 rounded mt-1 inline-block border">Nome Completo | Telefone | Grau | Função</span>
            </div>

            <form id="formImportarCSV" class="space-y-4">
                <input type="hidden" id="idTerreiroImport">
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Selecione o arquivo (.csv)</label>
                    <input type="file" id="arquivoCSV" accept=".csv" required class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-gray-200 rounded p-1">
                </div>
                
                <button type="submit" id="btnProcessarCSV" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow transition flex items-center justify-center mt-2">
                    Processar e Importar
                </button>
                <p id="msgImportacao" class="hidden text-center mt-2"></p>
            </form>
        </div>
    </div>

    <!-- MODAL EDITAR EVENTO (NOVO) -->
    <div id="modalEditarGira" class="hidden fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 transition-opacity">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 transform transition-all">
            <div class="flex justify-between items-center mb-4 border-b pb-2">
                <h3 class="text-xl font-bold text-tema-texto"><i class="fas fa-edit text-purple-500 mr-2"></i> Editar Evento</h3>
                <button onclick="fecharModalEditarGira()" class="text-gray-400 hover:text-gray-600 transition"><i class="fas fa-times text-xl"></i></button>
            </div>
            
            <form id="formEditarGira" class="space-y-4">
                <input type="hidden" id="editGiraId">
                
                <div>
                    <label class="block text-sm font-medium text-gray-700">Título do Evento</label>
                    <input type="text" id="editGiraTitulo" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-purple-400">
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Início</label>
                        <input type="datetime-local" id="editGiraInicio" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Fim</label>
                        <input type="datetime-local" id="editGiraFim" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                    </div>
                </div>

                <div class="bg-purple-50 p-3 rounded-lg border border-purple-100 flex items-center space-x-2 mt-2">
                    <input type="checkbox" id="editGiraGeraAta" class="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 cursor-pointer">
                    <label for="editGiraGeraAta" class="text-sm font-bold text-purple-900 cursor-pointer select-none"><i class="fas fa-file-signature mr-1"></i> Gerar ATA em PDF (Livro de Presença) para este evento</label>
                </div>
                
                <button type="submit" id="btnSalvarEdicaoGira" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-xl shadow transition mt-4">
                    Atualizar Evento
                </button>
            </form>
        </div>
    </div>

    <script src="js/supabase.js"></script>
    <script src="js/admin.js"></script>
</body>
</html>
