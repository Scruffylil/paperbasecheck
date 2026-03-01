import { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft, RotateCcw, Trophy, Menu, X, Clock, AlertTriangle } from 'lucide-react';

function loadPaper() {
  try {
    const papers = JSON.parse(localStorage.getItem('pyq_papers') || '[]');
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const paper = id ? papers.find(p => p.id === id) : papers[papers.length - 1];
    if (paper && paper.questions && paper.questions.length > 0) return paper;
  } catch {}
  return null;
}

function makeDemoPaper() {
  const qs = [];
  let id = 1;
  const addSection = (subject, count) => {
    for (let i = 0; i < count; i++) {
      qs.push({ number: id, seqNumber: id, text: `${subject} Q${id}: A particle of mass m moves in a circle of radius r at speed v. The centripetal acceleration is`, options: { A: 'v²/r', B: 'v/r²', C: 'vr', D: 'r/v²' }, section: subject });
      id++;
    }
    for (let i = 0; i < 5; i++) {
      qs.push({ number: id, seqNumber: id, text: `${subject} Numerical Q${id}: The value of sin²(30°) + cos²(30°) equals`, options: {}, section: subject, isNumerical: true });
      id++;
    }
  };
  addSection('Mathematics', 20); addSection('Physics', 20); addSection('Chemistry', 20);
  return { id: 'demo', subject: 'JEE Main', examName: 'Mock Test', year: '2025', duration: 180, questions: qs, answerKey: {'1':'A','2':'A','3':'A','4':'A','5':'A','6':'A'}, markingScheme: { correct: 4, wrong: 1, skipped: 0, total: qs.length * 4 } };
}

function buildGroups(questions) {
  const groups = []; let cur = null;
  questions.forEach((q, i) => {
    const isNum = q.isNumerical || Object.keys(q.options || {}).length === 0;
    const key = `${q.section||'General'}_${isNum?'num':'mcq'}`;
    if (!cur || cur.key !== key) { cur = { key, label: `${q.section||'General'} · ${isNum?'Numerical':'Single Correct'}`, indices: [] }; groups.push(cur); }
    cur.indices.push(i);
  });
  return groups;
}

function fmtTime(s) {
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

export default function App() {
  const paper = useRef(loadPaper() || makeDemoPaper()).current;
  const questions = paper.questions || [];
  const ms = paper.markingScheme || { correct: 4, wrong: 1, skipped: 0, total: questions.length * 4 };
  const ak = paper.answerKey || {};
  const groups = buildGroups(questions);
  const isDemo = paper.id === 'demo';

  const [phase, setPhase] = useState('exam');
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [visited, setVisited] = useState(new Set([0]));
  const [sideOpen, setSideOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState((paper.duration || 180) * 60);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (phase !== 'exam') return;
    timerRef.current = setInterval(() => setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current); doSubmit(); return 0; } return t - 1; }), 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  useEffect(() => { setVisited(v => { const s = new Set(v); s.add(idx); return s; }); }, [idx]);

  const goTo = (i) => { setIdx(Math.max(0, Math.min(questions.length - 1, i))); setSideOpen(false); };
  const setAnswer = (val) => setAnswers(a => ({ ...a, [idx]: val }));
  const clearAnswer = () => setAnswers(a => { const n = {...a}; delete n[idx]; return n; });
  const doSubmit = () => { clearInterval(timerRef.current); setConfirmSubmit(false); setPhase('results'); };
  const restart = () => { setPhase('exam'); setIdx(0); setAnswers({}); setVisited(new Set([0])); setTimeLeft((paper.duration||180)*60); };

  const calcScore = () => {
    let correct = 0, wrong = 0, skipped = 0, marks = 0;
    questions.forEach((q, i) => {
      const ua = answers[i]; const ca = ak[String(q.number)] || ak[String(q.seqNumber)] || ak[String(i+1)];
      if (!ua && ua !== 0) { skipped++; }
      else if (!ca) {}
      else if (String(ua).trim() === String(ca).trim()) { correct++; marks += ms.correct; }
      else { wrong++; marks -= (ms.wrong||0); }
    });
    return { correct, wrong, skipped, marks: Math.max(0, marks) };
  };

  const palState = (i) => { const ua = answers[i]; if (ua !== undefined && ua !== '') return 'answered'; if (visited.has(i)) return 'visited'; return 'fresh'; };
  const answeredCount = Object.values(answers).filter(v => v !== '').length;
  const q = questions[idx];
  const isNumerical = q && (q.isNumerical || Object.keys(q.options||{}).length === 0);
  const timerUrgent = timeLeft < 300;

  const C = { bg: '#0f1117', card: '#1a1f2e', border: '#2a3347', sub: '#64748b', text: '#e2e8f0', muted: '#94a3b8' };

  // ── RESULTS ──────────────────────────────────────────────────
  if (phase === 'results') {
    const { correct, wrong, skipped, marks } = calcScore();
    const hasKey = Object.keys(ak).length > 0;
    const pct = hasKey ? Math.round((marks / ms.total) * 100) : 0;
    const circ = 2 * Math.PI * 54;
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'system-ui,sans-serif', padding: '2rem 1rem' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: '2.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 1.5rem' }}>
              <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="70" cy="70" r="54" fill="none" stroke={C.border} strokeWidth="10" />
                {hasKey && <circle cx="70" cy="70" r="54" fill="none" stroke={pct>=60?'#22c55e':pct>=35?'#f59e0b':'#ef4444'} strokeWidth="10" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ*(1-pct/100)} style={{transition:'stroke-dashoffset 1.2s ease'}} />}
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900 }}>{hasKey ? `${pct}%` : answeredCount}</span>
                <span style={{ fontSize: '0.62rem', color: C.sub, textTransform: 'uppercase', letterSpacing: 1 }}>{hasKey ? 'Score' : 'Answered'}</span>
              </div>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.4rem' }}>{hasKey ? (pct>=75?'🏆 Excellent!':pct>=50?'👍 Good Job!':pct>=35?'📚 Keep Practising!':'💪 Don\'t Give Up!') : '✅ Submitted!'}</h2>
            {hasKey && <p style={{ color: C.sub, marginBottom: '1.5rem' }}><span style={{ color: C.text, fontWeight: 700, fontSize: '1.1rem' }}>{marks}</span> / {ms.total} marks</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.6rem', marginBottom: '1.5rem' }}>
              {[{l:'Correct',v:correct,c:'#22c55e'},{l:'Wrong',v:wrong,c:'#ef4444'},{l:'Skipped',v:skipped,c:'#f59e0b'},{l:'Total',v:questions.length,c:'#60a5fa'}].map(({l,v,c})=>(
                <div key={l} style={{ background: C.bg, borderRadius: 12, padding: '0.85rem 0', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: c }}>{v}</div>
                  <div style={{ fontSize: '0.62rem', color: C.sub, textTransform: 'uppercase', letterSpacing: 0.5 }}>{l}</div>
                </div>
              ))}
            </div>
            <button onClick={restart} style={{ background: '#1e293b', border: `1px solid ${C.border}`, color: C.muted, padding: '0.6rem 1.5rem', borderRadius: 10, cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <RotateCcw size={15} /> Retake
            </button>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '0.85rem 1.25rem', borderBottom: `1px solid ${C.border}`, fontSize: '0.72rem', fontWeight: 700, color: C.sub, textTransform: 'uppercase', letterSpacing: 1 }}>Answer Review</div>
            <div style={{ maxHeight: 460, overflowY: 'auto' }}>
              {questions.map((q, i) => {
                const ua = answers[i]; const ca = ak[String(q.number)]||ak[String(q.seqNumber)]||ak[String(i+1)];
                const isC = ca && String(ua).trim()===String(ca).trim(); const isW = ca && ua && !isC; const isS = !ua && ua!==0;
                return (
                  <div key={i} style={{ padding: '0.85rem 1.25rem', borderBottom: `1px solid ${C.bg}`, display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 26, height: 26, borderRadius: 6, background: isC?'#14532d':isW?'#7f1d1d':'#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: isC?'#22c55e':isW?'#ef4444':C.sub, flexShrink: 0 }}>{i+1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.text}</p>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {ua!==undefined&&ua!==''&&<span style={{ fontSize: '0.7rem', background: isC?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.15)', color: isC?'#22c55e':'#ef4444', padding: '0.1rem 0.45rem', borderRadius: 4 }}>Your: {ua}</span>}
                        {ca&&<span style={{ fontSize: '0.7rem', background: 'rgba(96,165,250,0.15)', color: '#60a5fa', padding: '0.1rem 0.45rem', borderRadius: 4 }}>Key: {ca}</span>}
                        {isS&&<span style={{ fontSize: '0.7rem', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', padding: '0.1rem 0.45rem', borderRadius: 4 }}>Skipped</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── EXAM ──────────────────────────────────────────────────────
  if (!q) return <div style={{ padding: '2rem', textAlign: 'center', color: C.sub }}>No questions found. Upload a paper first.</div>;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.bg, color: C.text, fontFamily: 'system-ui,sans-serif', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, zIndex: 20 }}>
        {isDemo && <span style={{ fontSize: '0.65rem', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 5, padding: '0.1rem 0.45rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Demo</span>}
        <span style={{ flex: 1, fontWeight: 700, fontSize: '0.88rem', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{paper.subject} — {paper.examName} {paper.year}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: timerUrgent?'rgba(239,68,68,0.15)':'#1e293b', border: `1px solid ${timerUrgent?'#ef4444':C.border}`, borderRadius: 8, padding: '0.28rem 0.65rem', flexShrink: 0 }}>
          <Clock size={13} color={timerUrgent?'#ef4444':C.sub} />
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem', color: timerUrgent?'#ef4444':C.text, letterSpacing: 1 }}>{fmtTime(timeLeft)}</span>
        </div>
        <button onClick={() => setSideOpen(s=>!s)} style={{ background: '#1e293b', border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.35rem', cursor: 'pointer', color: C.muted, display: 'flex' }}>
          {sideOpen ? <X size={18}/> : <Menu size={18}/>}
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Question panel */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <span style={{ background: '#1e293b', border: `1px solid ${C.border}`, borderRadius: 6, padding: '0.2rem 0.6rem', fontSize: '0.7rem', color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{q.section||'General'}</span>
              <span style={{ background: isNumerical?'rgba(168,85,247,0.1)':'rgba(96,165,250,0.1)', border: `1px solid ${isNumerical?'rgba(168,85,247,0.25)':'rgba(96,165,250,0.25)'}`, borderRadius: 6, padding: '0.2rem 0.6rem', fontSize: '0.7rem', color: isNumerical?'#c084fc':'#60a5fa', fontWeight: 600 }}>{isNumerical?'Numerical':'Single Correct'}</span>
            </div>
            <span style={{ fontSize: '0.82rem', color: C.sub, fontWeight: 700 }}>Q {idx+1} / {questions.length}</span>
          </div>

          {/* Card */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '1.5rem', flex: 1 }}>
            <p style={{ fontSize: '1rem', lineHeight: 1.75, color: C.text, marginBottom: '1.5rem', whiteSpace: 'pre-wrap' }}>{q.text}</p>

            {/* MCQ */}
            {!isNumerical && Object.keys(q.options||{}).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {Object.entries(q.options).map(([letter, text]) => {
                  const sel = answers[idx] === letter;
                  return (
                    <button key={letter} onClick={() => setAnswer(letter)} style={{ textAlign: 'left', padding: '0.85rem 1rem', borderRadius: 12, border: `2px solid ${sel?'#3b82f6':C.border}`, background: sel?'rgba(59,130,246,0.1)':C.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.85rem', transition: 'border-color 0.15s', outline: 'none' }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, border: `2px solid ${sel?'#3b82f6':C.border}`, background: sel?'#3b82f6':'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', color: sel?'#fff':C.sub, flexShrink: 0, transition: 'all 0.15s' }}>{letter}</div>
                      <span style={{ color: sel?C.text:C.muted, fontSize: '0.92rem', lineHeight: 1.5 }}>{text}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Numerical */}
            {isNumerical && (
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: C.sub, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Your Answer</label>
                <input type="number" value={answers[idx]??''} onChange={e=>setAnswer(e.target.value)} placeholder="Enter numerical value…"
                  style={{ background: C.bg, border: `2px solid ${C.border}`, borderRadius: 12, padding: '0.85rem 1rem', fontSize: '1.1rem', color: C.text, maxWidth: 260, width: '100%', outline: 'none', fontFamily: 'monospace' }} />
              </div>
            )}

            {/* Diagram placeholder */}
            {!isNumerical && Object.keys(q.options||{}).length === 0 && !q.isNumerical && (
              <div style={{ background: C.bg, border: `1px dashed ${C.border}`, borderRadius: 12, padding: '2rem', textAlign: 'center', color: '#475569', fontSize: '0.85rem' }}>
                📊 Diagram question — left blank for now
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button onClick={() => goTo(idx-1)} disabled={idx===0} style={{ background: '#1e293b', border: `1px solid ${C.border}`, color: C.muted, padding: '0.55rem 1rem', borderRadius: 10, cursor: idx===0?'not-allowed':'pointer', opacity: idx===0?0.4:1, display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>
                <ChevronLeft size={16}/> Back
              </button>
              <button onClick={clearAnswer} disabled={answers[idx]===undefined||answers[idx]===''} style={{ background: '#1e293b', border: `1px solid ${C.border}`, color: C.muted, padding: '0.55rem 1rem', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', opacity: (answers[idx]===undefined||answers[idx]==='') ? 0.4:1 }}>
                Clear
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button onClick={() => setConfirmSubmit(true)} style={{ background: 'transparent', border: '1px solid #22c55e', color: '#22c55e', padding: '0.55rem 1rem', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>Submit</button>
              {idx < questions.length-1
                ? <button onClick={() => goTo(idx+1)} style={{ background: '#3b82f6', border: 'none', color: '#fff', padding: '0.55rem 1.25rem', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700, fontSize: '0.85rem' }}>Save & Next <ChevronRight size={16}/></button>
                : <button onClick={() => setConfirmSubmit(true)} style={{ background: '#22c55e', border: 'none', color: '#fff', padding: '0.55rem 1.25rem', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>Submit Exam</button>
              }
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ width: 272, background: C.card, borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>
          {/* Stats */}
          <div style={{ padding: '0.65rem', borderBottom: `1px solid ${C.border}`, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.3rem' }}>
            {[{l:'Done',v:answeredCount,c:'#22c55e'},{l:'Seen',v:visited.size-answeredCount,c:'#ef4444'},{l:'Left',v:questions.length-visited.size,c:C.sub}].map(({l,v,c})=>(
              <div key={l} style={{ background: C.bg, borderRadius: 8, padding: '0.45rem 0', textAlign: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: '1.1rem', color: c }}>{v}</div>
                <div style={{ fontSize: '0.56rem', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>{l}</div>
              </div>
            ))}
          </div>
          {/* Legend */}
          <div style={{ padding: '0.45rem 0.85rem', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            {[{c:'#22c55e',l:'Answered'},{c:'#ef4444',l:'Visited'},{c:'#2a3347',l:'Unseen'}].map(({c,l})=>(
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.62rem', color: C.sub }}><div style={{ width: 8, height: 8, borderRadius: 2, background: c }}/>{l}</div>
            ))}
          </div>
          {/* Palette */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.85rem' }}>
            {groups.map((g, gi) => (
              <div key={gi} style={{ marginBottom: '1.1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.56rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' }}>{g.label}</span>
                  <div style={{ flex: 1, height: 1, backgroundImage: 'repeating-linear-gradient(90deg,#2a3347 0,#2a3347 3px,transparent 3px,transparent 7px)' }}/>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '0.28rem' }}>
                  {g.indices.map(qi => {
                    const state = palState(qi); const isCur = qi===idx;
                    const bg = state==='answered'?'#22c55e':state==='visited'?'#ef4444':'#1e293b';
                    const fg = state==='fresh'?C.sub:'#fff';
                    return (
                      <button key={qi} onClick={() => goTo(qi)}
                        style={{ aspectRatio: '1', borderRadius: 5, border: isCur?'2px solid #3b82f6':'1px solid transparent', background: bg, color: fg, fontWeight: 700, fontSize: '0.68rem', cursor: 'pointer', outline: 'none', transition: 'transform 0.1s' }}
                        onMouseEnter={e=>e.currentTarget.style.transform='scale(1.15)'}
                        onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
                      >{qi+1}</button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {/* Submit */}
          <div style={{ padding: '0.75rem', borderTop: `1px solid ${C.border}` }}>
            <button onClick={() => setConfirmSubmit(true)} style={{ width: '100%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', color: '#fff', padding: '0.7rem', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem' }}>Submit Exam</button>
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {confirmSubmit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: '2rem', maxWidth: 380, width: '100%', textAlign: 'center' }}>
            <AlertTriangle size={36} color="#f59e0b" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.4rem' }}>Submit Exam?</h3>
            <p style={{ color: C.sub, fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              <strong style={{ color: C.text }}>{answeredCount}</strong> of {questions.length} answered.<br/>
              <strong style={{ color: C.text }}>{questions.length - answeredCount}</strong> will be marked skipped.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={() => setConfirmSubmit(false)} style={{ background: '#1e293b', border: `1px solid ${C.border}`, color: C.muted, padding: '0.6rem 1.25rem', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={doSubmit} style={{ background: '#22c55e', border: 'none', color: '#fff', padding: '0.6rem 1.5rem', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>Yes, Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
