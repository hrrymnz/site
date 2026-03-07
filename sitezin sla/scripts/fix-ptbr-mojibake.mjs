import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "src", "App.jsx");

let text = fs.readFileSync(file, "utf8");

const replacements = [
  ["Carregando sess\uFFFDo...", "Carregando sessão..."],
  ["Configura\uFFFD\uFFFDes", "Configurações"],
  ["Espa\uFFFDo de trabalho", "Espaço de trabalho"],
  ["Notifica\uFFFD\uFFFDes", "Notificações"],
  ["Meus reposit\uFFFDrios", "Meus repositórios"],
  ["P\uFFFDginas Recentes", "Páginas Recentes"],
  ["Contribui\uFFFD\uFFFDes GitHub", "Contribuições GitHub"],
  ["contribui\uFFFD\uFFFDes no per\uFFFDodo", "contribuições no período"],
  ["Per\uFFFDodo", "Período"],
  ["Calend\uFFFDrio de contribui\uFFFD\uFFFDes", "Calendário de contribuições"],
  ["\uFFFDaltimos Commits", "Últimos Commits"],
  ["Visualiza\uFFFD\uFFFDo", "Visualização"],
  ["T\uFFFDtulo da nota", "Título da nota"],
  ["T\uFFFDtulo da checklist", "Título da checklist"],
  ["descri\uFFFD\uFFFDo", "descrição"],
  ["voc\uFFFD...", "você..."],
  ["Reposit\uFFFDrios", "Repositórios"],
  ["informa\uFFFD\uFFFDes", "informações"],
  ["prefer\uFFFDncias", "preferências"],
  ["Prefer\uFFFDncias", "Preferências"],
  ["Hist\uFFFDrico local", "Histórico local"],
  ["\uFFFDaltimas 10 vers\uFFFDes locais para restaura\uFFFD\uFFFDo r\uFFFDpida.", "Últimas 10 versões locais para restauração rápida."],
  ["Nenhuma vers\uFFFDo local encontrada.", "Nenhuma versão local encontrada."],
  ["Editar Reposit\uFFFDrio Fixo", "Editar Repositório Fixo"],
  ["Reposit\uFFFDrio do Fearless", "Repositório do Fearless"],
  ["Selecione um reposit\uFFFDrio da Fearless", "Selecione um repositório da Fearless"],
  ["Descri\uFFFD\uFFFDo", "Descrição"],
  ["Somente reposit\uFFFDrios criados na era Fearless podem ser fixados aqui.", "Somente repositórios criados na era Fearless podem ser fixados aqui."],
  ["Salvar Reposit\uFFFDrio", "Salvar Repositório"],
  ["Esta a\uFFFD\uFFFDo n\uFFFDo pode ser desfeita.", "Esta ação não pode ser desfeita."],
  ['<option value="repo">Reposit\uFFFDrio</option>', '<option value="repo">Repositório</option>'],
  ["<label>T\uFFFDtulo</label>", "<label>Título</label>"],
  ["<label>Conte\uFFFDdo</label>", "<label>Conteúdo</label>"],
  ["(separadas por v\uFFFDrgula)", "(separadas por vírgula)"],
];

for (const [from, to] of replacements) {
  text = text.split(from).join(to);
}

fs.writeFileSync(file, text, "utf8");
console.log("Correções de PT-BR aplicadas em src/App.jsx");
