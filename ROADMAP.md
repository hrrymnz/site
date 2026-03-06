# Roadmap Realista — TaylorSwift. Site Pessoal (2-3 meses)

## Visão: Site pessoal robusto, rápido e sem fricção

## **Assumptions oficiais do ciclo**

- React gradual é a estratégia oficial do ciclo.
- Workspace switcher é opcional-condicional (não automático).
- Analytics permanece backlog neste ciclo.
- Foto pós-import está resolvida e tratada como baseline estável.

---

## **SEMANA 1-2: Foundation Fixes**

### ✅ Checkpoint: Auth estável
- [x] Login/logout funcionando
- [x] Confirmação de email testada (fluxo end-to-end)
- [x] RLS protegendo dados por usuário
- [x] Bug da foto pós-import corrigido (sync imediato da UI)
- [ ] Senha reset via email (Supabase default)
- [ ] Session timeout + refresh automático

**Tempo estimado:** 3-4 horas
**Por quê:** Sem isso, tudo que vem depois é frágil.

---

## **SEMANA 3-4: Search + Organize**

### Goal: Encontrar coisas rapidamente

**Feature 1: Search em tempo real**
- Buscar por título, URL, tags, conteúdo
- Filtro por categoria (era) + status pinned
- Sem necessidade de backend — localStorage + JS

**Feature 2: Ordenação manual por era**
- Drag-and-drop entre cards dentro de uma era
- Salvar ordem no localStorage + sync com Supabase

**Feature 3: Quick filters na topbar**
- Botões "Pinned", "Recent", "Most accessed"
- Filtro por tag

**Tempo estimado:** 8-10 horas
**Dificuldade:** Baixa (UI + localStorage)
**Value:** Alto — melhora 80% da UX

---

## **SEMANA 5-6: Better Performance**

### Goal: Site ultra-rápido (<2s load global)

**Otimizações:**
- [ ] Lazy-load de eras (não carregar tudo de uma vez)
- [ ] Compressão de imagens (SVG otimizado, WEBP para avatars)
- [ ] Code splitting por era (load on demand)
- [ ] Service Worker para offline (ler dados locais sem internet)

**Tempo estimado:** 6-8 horas
**Dificuldade:** Média
**Value:** Médio (já está rápido, isso é "nice to have")

---

## **SEMANA 7-8: Data Integrity + Backup**

### Goal: Nunca perder dados

**Features:**
- [ ] Exportar JSON (já existe) com timestamp
- [ ] Auto-backup a cada mudança importante
- [ ] Versão anterior acessível (últimas 10 mudanças)
- [ ] Confirmação antes de deletar item

**Tempo estimado:** 4-5 horas
**Dificuldade:** Baixa
**Value:** Alto — peace of mind

---

## **SEMANA 9-10: Workspace Switcher** (opcional-condicional)

### Goal: Suportar "modo público" ou "múltiplas views"

**Ideia:**
- Criar "workspaces" dentro de uma conta (ex: "Dev", "Reading", "Ideas")
- Cada workspace tem seu próprio conjunto de eras+dados
- Trocar entre eles sem logout
- Futuramente: compartilhar workspace por link

**Tempo estimado:** 6-8 horas
**Dificuldade:** Média
**Value:** Médio (legal ter, mas não crítico)

---

## **SEMANA 11-12: Stabilization + Refinements**

### Goal: Fechar ciclo estável para release

**Lightweight analytics:** mover para backlog planejado deste ciclo.

**Tempo estimado:** 4-6 horas
**Dificuldade:** Baixa
**Value:** Alto (confiabilidade final antes de novos escopos)

---

## **Coisas NÃO fazer por enquanto:**

- ❌ Multi-tenant/organizações
- ❌ Colaboração em tempo real
- ❌ API pública
- ❌ Migração de todas as tabelas para relacional
- ❌ Admin panel
- ❌ Analytics neste ciclo (mantido em backlog)

---

## **Success Criteria**

| Item | Métrica |
|------|---------|
| Estabilidade | 0 erros de auth/RLS em 1 semana de uso |
| Performance | <2s page load, <500ms interações |
| Data safety | 0 perda de dados, backups automáticos |
| UX | Conseguir encontrar um item em <5 cliques |
| Confiabilidade | Site online 99%+ (Cloudflare + Supabase uptime) |

---

## **Priorização se tempo apertar**

**MUST have (semanas 1-4):**
1. Auth estável
2. Search
3. Ordenação manual

**SHOULD have (semanas 5-8):**
4. Performance
5. Backup/integrity

**NICE to have (semanas 9-12):**
6. Workspace switcher
7. Analytics

---

## **Next Steps**

1. **Cette semana:** Corrigir email confirmation URL
2. **Próxima:** Implementar search
3. **Depois:** Drag-and-drop ordenação
4. Ir marcando conforme conclui ✅
