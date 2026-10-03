# Hero Beauty Precos / Arthur Dev Center

- Repositorio: nascimentoarthur947-afk/hero-beauty-precos; branch principal main.
- Workflow arthur-monitor.yml: push/PR/manual e diario 09:21 BRT.
- Comando existente: npm run check (sintaxe do servidor, nao testes funcionais).
- Nao ha lockfile versionado. CI resolve dependencias sem scripts de instalacao, depois executa npm ci --ignore-scripts e npm audit --audit-level=moderate.
- Nao inventar build/testes ausentes. Nao iniciar testes de escrita em catalogos ou servicos reais.
- Preserve Render, variaveis, credenciais e permissoes. Auto-fix ainda nao elegivel sem testes funcionais e lockfile versionado.
