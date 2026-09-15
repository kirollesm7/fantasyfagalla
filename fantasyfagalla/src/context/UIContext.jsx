import { createContext, useCallback, useContext, useRef, useState } from 'react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [modals, setModals] = useState([]); // stack of {id, kind, props}
  const resolvers = useRef({});
  const nextId = useRef(1);

  const showToast = useCallback((message, kind = 'neutral') => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 2600);
  }, []);

  const closeModal = useCallback((id, value) => {
    setModals((m) => m.filter((x) => x.id !== id));
    const resolve = resolvers.current[id];
    if (resolve) {
      resolve(value);
      delete resolvers.current[id];
    }
  }, []);

  const openModal = useCallback((props) => {
    return new Promise((resolve) => {
      const id = nextId.current++;
      resolvers.current[id] = resolve;
      setModals((m) => [...m, { id, kind: 'prompt', props }]);
    });
  }, []);

  const openConfirm = useCallback((message) => {
    return new Promise((resolve) => {
      const id = nextId.current++;
      resolvers.current[id] = resolve;
      setModals((m) => [...m, { id, kind: 'confirm', props: { message } }]);
    });
  }, []);

  const openChoice = useCallback(({ title, options }) => {
    return new Promise((resolve) => {
      const id = nextId.current++;
      resolvers.current[id] = resolve;
      setModals((m) => [...m, { id, kind: 'choice', props: { title, options } }]);
    });
  }, []);

  return (
    <UIContext.Provider value={{ showToast, openModal, openConfirm, openChoice }}>
      {children}
      <div className="toastStack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind} show`}>
            {t.message}
          </div>
        ))}
      </div>
      {modals.map((m) => (
        <ModalRenderer key={m.id} modal={m} onClose={(val) => closeModal(m.id, val)} />
      ))}
    </UIContext.Provider>
  );
}

function ModalRenderer({ modal, onClose }) {
  const { kind, props } = modal;
  const [value, setValue] = useState('');
  const overlayClick = (e) => {
    if (e.target === e.currentTarget) onClose(kind === 'confirm' ? false : kind === 'choice' ? null : null);
  };

  if (kind === 'confirm') {
    return (
      <div className="modal-overlay" onClick={overlayClick}>
        <div className="modal-box">
          <p>{props.message}</p>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn ghost small" onClick={() => onClose(false)}>إلغاء</button>
            <button className="btn small" onClick={() => onClose(true)}>تأكيد</button>
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'choice') {
    return (
      <div className="modal-overlay" onClick={overlayClick}>
        <div className="modal-box">
          <h3 className="disp" style={{ margin: '0 0 14px' }}>{props.title}</h3>
          <div className="choiceBtns" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {props.options.map((opt, i) => (
              <button key={i} className={`btn ${opt.danger ? 'danger' : ''}`} style={{ width: '100%' }} onClick={() => onClose(opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
          <button className="btn ghost small" style={{ width: '100%', marginTop: 10 }} onClick={() => onClose(null)}>إلغاء</button>
        </div>
      </div>
    );
  }

  // prompt
  return (
    <div className="modal-overlay" onClick={overlayClick}>
      <div className="modal-box">
        <h3 className="disp" style={{ margin: '0 0 10px' }}>{props.title}</h3>
        <input
          autoFocus
          type={props.type || 'text'}
          placeholder={props.placeholder || ''}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onClose(value);
            if (e.key === 'Escape') onClose(null);
          }}
        />
        <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn ghost small" onClick={() => onClose(null)}>إلغاء</button>
          <button className="btn small" onClick={() => onClose(value)}>تأكيد</button>
        </div>
      </div>
    </div>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside <UIProvider>');
  return ctx;
}
