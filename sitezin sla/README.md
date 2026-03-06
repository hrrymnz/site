# TaylorSwift Dashboard

Dashboard interativo de gerenciamento de repositorios GitHub com tema inspirado nos albuns de Taylor Swift.

## Getting Started

### Instalacao
```bash
npm install
```

### Desenvolvimento
```bash
npm run dev
```
Servidor rodara em `http://localhost:5173/`

### Build
```bash
npm run build
```

## Estrutura do Projeto

```
src/
├── main.jsx              # Entry point React
├── App.jsx               # Componente principal
├── index.css             # Reset CSS global
├── legacy/               # Codigo JavaScript original
│   ├── storage.js        # Gerenciamento de localStorage
│   ├── app.js            # Logica principal da SPA
│   ├── bootstrap.js      # Interacoes shell (navegacao, eventos)
│   └── repositorios.js   # Integracao GitHub API
└── styles/
    └── style.css         # Estilos principais (35KB com temas)

public/
├── imagens, icons/       # Assets do projeto
├── settings.html         # Redirect para settings
└── vite.svg

index.html               # Html raiz com Lucide + fonts
vite.config.js          # Config Vite
```

## Temas Disponiveis

9 temas inspirados nos albuns:
- Debut
- Fearless
- Speak Now
- Red
- 1989
- Reputation
- Lover
- Folklore
- Settings

## Funcionalidades

- Gerenciamento de itens por era
- Integracao com GitHub API
- Busca global
- Drag & drop para reordenacao
- Sistema de pins e destaques
- Backup/Export de dados
- Foto de perfil customizavel
- Responsivo

## Tecnologias

- React 18.3
- Vite 8.0
- Lucide Icons
- Vanilla JavaScript (legacy code)
- CSS Grid & Flexbox

---

*Projeto convertido de HTML/CSS/JS para React + Vite*
