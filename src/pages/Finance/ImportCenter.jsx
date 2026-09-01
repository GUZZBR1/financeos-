import { useCallback, useEffect, useState } from 'react';
import { FileUp, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '../../context/TransactionContext';
import { platformApi } from '../../services/platform-api';

export default function ImportCenter() {
  const navigate = useNavigate();
  const { desktop, refresh } = useTransactions();
  const [batches, setBatches] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);

  const loadBatches = useCallback(async () => {
    setBatches(await platformApi.listImportBatches());
  }, []);

  useEffect(() => { loadBatches(); }, [loadBatches]);

  const handleSelect = async () => {
    setProcessing(true);
    setFeedback(null);
    try {
      const result = await platformApi.selectOfx();
      if (!result.canceled) setPreview(result);
    } catch (error) {
      setFeedback({ type: 'error', text: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setDragging(false);
    if (!desktop || processing) return;
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    setProcessing(true);
    setFeedback(null);
    try {
      setPreview(await platformApi.prepareDroppedOfx(file));
    } catch (error) {
      setFeedback({ type: 'error', text: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleCommit = async () => {
    setProcessing(true);
    setFeedback(null);
    try {
      const result = await platformApi.commitOfx(preview.token);
      if (result) {
        setFeedback({
          type: 'success',
          text: result.alreadyImported
            ? 'Este arquivo já havia sido importado; nenhum lançamento foi duplicado.'
            : `${result.imported} lançamentos importados, ${result.duplicates} duplicados e ${result.review} aguardando revisão.`,
        });
        setPreview(null);
        await Promise.all([loadBatches(), refresh()]);
        if (!result.alreadyImported && result.batchId) {
          navigate(`/finance/history?period=all&batchId=${encodeURIComponent(result.batchId)}&status=review`);
        }
      }
    } catch (error) {
      setFeedback({ type: 'error', text: error.message });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <section className="page-shell">
      <p className="eyebrow">Importações</p>
      <h1>Central de importações</h1>
      <p className="page-lead">Importe extratos OFX, revise classificações e acompanhe cada lote processado.</p>

      <div
        className={`card action-card ofx-drop-zone${dragging ? ' ofx-drop-zone--active' : ''}`}
        onDragEnter={(event) => { event.preventDefault(); if (desktop && !processing) setDragging(true); }}
        onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
        onDrop={handleDrop}
        aria-label="Área para soltar arquivo OFX"
      >
        <div>
          <h2>Importar extrato bancário</h2>
          <p>{dragging ? 'Solte o arquivo aqui para preparar a prévia.' : 'Arraste um OFX para este local ou use o botão. São aceitos arquivos de até 25 MB.'}</p>
        </div>
        <button className="btn btn-primary" onClick={handleSelect} disabled={!desktop || processing}>
          {processing ? <RefreshCw size={16} className="spin" /> : <FileUp size={16} />}
          {processing ? 'Processando...' : 'Selecionar OFX'}
        </button>
      </div>

      {!desktop && (
        <div className="notice notice--warning"><AlertTriangle size={16} /> Abra esta função no aplicativo desktop.</div>
      )}
      {feedback && (
        <div className={`notice notice--${feedback.type}`}>
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {feedback.text}
        </div>
      )}

      {preview && (
        <div className="card import-preview">
          <div className="section-heading">
            <div><p className="eyebrow">Prévia</p><h2>{preview.fileName}</h2></div>
            <span>{preview.total} movimentações · conta {preview.account.accountId}</span>
          </div>
          <div className="preview-table">
            {preview.sample.map((transaction, index) => (
              <div className="preview-row" key={`${transaction.date}-${transaction.description}-${index}`}>
                <span>{new Date(`${transaction.date}T12:00:00`).toLocaleDateString('pt-BR')}</span>
                <strong>{transaction.description}</strong>
                <span className={transaction.type === 'income' ? 'amount-positive' : 'amount-negative'}>{transaction.type === 'income' ? 'Crédito +' : 'Débito −'} {transaction.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            ))}
          </div>
          {preview.total > preview.sample.length && <p className="form-help">Mostrando as primeiras {preview.sample.length} movimentações.</p>}
          <div className="form-actions"><button className="btn btn-primary" onClick={handleCommit} disabled={processing}>Confirmar importação</button><button className="btn btn-ghost" onClick={() => setPreview(null)} disabled={processing}>Cancelar</button></div>
        </div>
      )}

      <div className="section-heading">
        <div><p className="eyebrow">Histórico</p><h2>Lotes processados</h2></div>
        <button className="btn btn-ghost" onClick={loadBatches}><RefreshCw size={14} /> Atualizar</button>
      </div>
      {batches.length === 0 ? (
        <div className="card empty-state"><h2>Nenhum arquivo importado</h2><p>O primeiro lote aparecerá aqui com totais e resultado do processamento.</p></div>
      ) : (
        <div className="card data-list">
          {batches.map((batch) => (
            <div className="data-row" key={batch.id}>
              <div><strong>{batch.file_name}</strong><span>{new Date(batch.created_at).toLocaleString('pt-BR')}</span></div>
              <div className="data-row__metrics">
                <span>{batch.imported_rows} importados</span>
                <span>{batch.duplicate_rows} duplicados</span>
                <span>{batch.review_rows} para revisar</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
