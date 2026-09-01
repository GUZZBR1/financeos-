import { ArrowRight, Database, FileUp, ListChecks, PlugZap, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const capabilities = [
  { icon: Database, title: 'Dados locais', text: 'SQLite no computador, com backup e restauração sob seu controle.' },
  { icon: FileUp, title: 'Importação OFX', text: 'Extratos normalizados, deduplicados e organizados por lote.' },
  { icon: ListChecks, title: 'Classificação por regras', text: 'Automação explicável que funciona mesmo sem IA.' },
  { icon: PlugZap, title: 'Conectores opcionais', text: 'Arquitetura preparada para Questor SYN e outros sistemas.' },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <main className="landing-shell">
      <nav className="landing-nav">
        <strong>Finance<span>OS</span></strong>
        <button className="btn btn-primary" onClick={() => navigate('/finance')}>
          Abrir painel <ArrowRight size={15} />
        </button>
      </nav>

      <section className="landing-hero">
        <div className="landing-badge"><ShieldCheck size={14} /> Local-first e privado</div>
        <h1>Controle financeiro no seu computador, sem nuvem obrigatória.</h1>
        <p>Importe extratos, organize lançamentos e prepare integrações contábeis com regras determinísticas e rastreáveis.</p>
        <div className="button-row landing-actions">
          <button className="btn btn-primary" onClick={() => navigate('/finance')}>Começar agora <ArrowRight size={16} /></button>
          <button className="btn btn-ghost" onClick={() => navigate('/finance/imports')}>Ver importações</button>
        </div>
      </section>

      <section className="landing-grid" aria-label="Recursos principais">
        {capabilities.map(({ icon: Icon, title, text }) => (
          <article className="card landing-feature" key={title}>
            <Icon size={20} color="var(--accent-green)" />
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
