import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  X, Minus, Maximize2, Code2, Globe, Terminal as TermIcon,
  Play, Send, RotateCcw, ChevronRight, Plus, Home, ArrowLeft, ArrowRight,
  Video
} from 'lucide-react';

/* ─── Code Editor ─────────────────────────────────────────────── */
const STARTER_CODE = `def solve(nums, target):
    """
    Binary search implementation.
    Returns index of target in sorted nums,
    or -1 if not found.
    """
    left, right = 0, len(nums) - 1
    
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    
    return -1


# Test cases
print(solve([1, 3, 5, 7, 9], 5))   # → 2
print(solve([1, 3, 5, 7, 9], 4))   # → -1
print(solve([], 5))                  # → -1
`;

function CodeEditor({ onLog }) {
  const [files]     = useState(['solution.py', 'test.py', 'utils.py']);
  const [activeFile, setActiveFile] = useState('solution.py');
  const [code,      setCode]   = useState(STARTER_CODE);
  const [output,    setOutput] = useState('');
  const [running,   setRunning]= useState(false);

  const runCode = () => {
    setRunning(true);
    onLog('CODE', 'Executing program…', 'yellow');
    setTimeout(() => {
      setOutput(`Python 3.11.0\n---\n2\n-1\n-1\n---\nAll test cases passed ✓\nExecution time: 0.003s`);
      setRunning(false);
      onLog('CODE', 'Run successful — all tests passed', 'green');
    }, 1200);
  };

  const submitCode = () => {
    onLog('SYSTEM', 'Solution submitted for evaluation', 'green');
    setOutput(prev => prev + '\n\n[SUBMITTED] Solution locked for review.');
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-300 font-mono text-xs">
      {/* Tabs */}
      <div className="flex items-center bg-gray-800 border-b border-gray-700 shrink-0">
        {files.map(f => (
          <button key={f} onClick={() => setActiveFile(f)}
            className={`px-4 py-2.5 text-xs border-r border-gray-700 transition-colors ${activeFile === f ? 'bg-gray-900 text-white border-t-2 border-t-green-500' : 'text-gray-400 hover:bg-gray-750'}`}>
            {f}
          </button>
        ))}
        <button className="px-3 py-2.5 text-gray-500 hover:text-gray-300"><Plus size={12}/></button>
      </div>

      {/* Editor split */}
      <div className="flex flex-1 min-h-0">
        {/* Line numbers + code */}
        <div className="flex flex-1 min-w-0">
          <div className="bg-gray-850 text-gray-600 px-3 py-3 select-none text-right leading-6 min-w-[36px] border-r border-gray-800"
            style={{ background:'#1a1f2e' }}>
            {code.split('\n').map((_, i) => <div key={i}>{i+1}</div>)}
          </div>
          <textarea
            value={code}
            onChange={e => { setCode(e.target.value); onLog('EDITOR','Editing solution.py','green'); }}
            className="flex-1 bg-gray-900 text-gray-300 px-4 py-3 resize-none focus:outline-none leading-6 text-xs"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Output panel */}
      <div className="border-t border-gray-700 bg-gray-950 shrink-0" style={{ height:120 }}>
        <div className="flex items-center gap-3 px-4 py-1.5 border-b border-gray-800 bg-gray-900">
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Terminal</span>
          <div className="ml-auto flex gap-2">
            <button onClick={runCode} disabled={running}
              className="flex items-center gap-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs px-3 py-1 rounded-md transition-colors">
              <Play size={10}/>{running ? 'Running…' : 'Run'}
            </button>
            <button onClick={submitCode}
              className="flex items-center gap-1 bg-blue-700 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded-md transition-colors">
              <Send size={10}/>Submit
            </button>
          </div>
        </div>
        <div className="px-4 py-2 text-green-400 text-xs overflow-y-auto" style={{ height:80 }}>
          {output ? <pre>{output}</pre> : <span className="text-gray-600">$ Ready to run…</span>}
        </div>
      </div>
    </div>
  );
}

/* ─── Mini Chrome ────────────────────────────────────────────── */
const SIMULATED_PAGES = {
  'google.com':     { title:'Google', body: <div className="p-8 text-center"><div className="text-5xl font-bold mb-6"><span className="text-blue-500">G</span><span className="text-red-500">o</span><span className="text-yellow-500">o</span><span className="text-blue-500">g</span><span className="text-green-500">l</span><span className="text-red-500">e</span></div><input className="w-96 border border-gray-300 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Search Google or type a URL"/><div className="flex gap-3 justify-center mt-5 text-sm"><button className="bg-gray-100 hover:bg-gray-200 px-5 py-2 rounded">Google Search</button><button className="bg-gray-100 hover:bg-gray-200 px-5 py-2 rounded">I&apos;m Feeling Lucky</button></div></div> },
  'chat.openai.com':{ title:'ChatGPT', body: <div className="flex flex-col h-full bg-gray-50 p-4"><div className="text-center py-8"><div className="w-12 h-12 bg-green-600 rounded-xl mx-auto flex items-center justify-center mb-3"><span className="text-white font-bold text-xl">G</span></div><h2 className="text-xl font-semibold text-gray-800">ChatGPT</h2><p className="text-gray-500 text-sm mt-1">How can I help you today?</p></div><div className="mt-auto border border-gray-200 rounded-xl bg-white p-3 flex gap-2"><input className="flex-1 text-sm focus:outline-none" placeholder="Message ChatGPT…"/><button className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm">Send</button></div></div> },
  'stackoverflow.com':{ title:'Stack Overflow', body: <div className="p-6 bg-white h-full overflow-y-auto"><div className="flex items-center gap-3 mb-4"><div className="bg-orange-500 text-white px-2 py-1 text-sm font-bold rounded">Stack Overflow</div></div><div className="space-y-4">{['How to implement binary search in Python?','Python binary search edge cases','IndexError in binary search loop'].map(q=><div key={q} className="border-b pb-3"><a className="text-blue-600 hover:underline text-sm font-medium cursor-pointer">{q}</a><p className="text-xs text-gray-500 mt-1">12 answers · 1,234 views</p></div>)}</div></div> },
  'claude.ai':      { title:'Claude', body: <div className="flex flex-col h-full bg-amber-50 p-4"><div className="text-center py-8"><div className="w-12 h-12 bg-amber-600 rounded-xl mx-auto flex items-center justify-center mb-3"><span className="text-white font-bold text-xl">C</span></div><h2 className="text-xl font-semibold">Claude</h2><p className="text-gray-500 text-sm mt-1">Hello! How can I assist you?</p></div><div className="mt-auto border border-amber-200 rounded-xl bg-white p-3 flex gap-2"><input className="flex-1 text-sm focus:outline-none" placeholder="Message Claude…"/><button className="bg-amber-600 text-white px-4 py-1.5 rounded-lg text-sm">Send</button></div></div> },
};
const DEFAULT_PAGE_BODY = (url) => <div className="flex items-center justify-center h-full text-gray-500 flex-col gap-3"><Globe size={40} className="opacity-30"/><p className="text-sm font-medium">{url}</p><p className="text-xs text-gray-400">Simulated page — full browsing allowed</p></div>;

function MiniBrowser({ onLog }) {
  const [tabs, setTabs] = useState([
    { id:1, url:'google.com', title:'Google' },
  ]);
  const [activeTab, setActiveTab] = useState(1);
  const [urlInput, setUrlInput]   = useState('google.com');

  const currentTab = tabs.find(t => t.id === activeTab);
  const page = SIMULATED_PAGES[currentTab?.url];

  const navigate = (url) => {
    const clean = url.replace(/^https?:\/\//,'');
    const meta  = SIMULATED_PAGES[clean];
    setTabs(prev => prev.map(t => t.id === activeTab ? { ...t, url: clean, title: meta?.title || clean } : t));
    setUrlInput(clean);
    onLog('BROWSER', `Opened: ${clean}`, 'blue');
  };

  const newTab = () => {
    const id = Date.now();
    setTabs(prev => [...prev, { id, url:'google.com', title:'Google' }]);
    setActiveTab(id);
    setUrlInput('google.com');
  };

  const closeTab = (id) => {
    if (tabs.length === 1) return;
    setTabs(prev => prev.filter(t => t.id !== id));
    setActiveTab(tabs.find(t => t.id !== id)?.id || tabs[0].id);
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Tabs bar */}
      <div className="flex items-center bg-gray-200 border-b border-gray-300 overflow-x-auto shrink-0">
        {tabs.map(t => (
          <div key={t.id} onClick={() => { setActiveTab(t.id); setUrlInput(t.url); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs cursor-pointer max-w-40 border-r border-gray-300 shrink-0 ${activeTab === t.id ? 'bg-white text-gray-800' : 'text-gray-500 hover:bg-gray-150'}`}>
            <Globe size={11}/>
            <span className="truncate">{t.title}</span>
            <button onClick={e => { e.stopPropagation(); closeTab(t.id); }} className="ml-1 hover:text-red-500"><X size={10}/></button>
          </div>
        ))}
        <button onClick={newTab} className="px-3 py-2 text-gray-500 hover:bg-gray-300"><Plus size={14}/></button>
      </div>

      {/* Address bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-200 shrink-0">
        <button className="text-gray-400"><ArrowLeft size={15}/></button>
        <button className="text-gray-400"><ArrowRight size={15}/></button>
        <button className="text-gray-400"><RotateCcw size={13}/></button>
        <div className="flex-1 flex items-center bg-gray-100 rounded-full px-3 py-1.5 gap-2">
          <Globe size={12} className="text-gray-400 shrink-0"/>
          <input
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && navigate(urlInput)}
            className="flex-1 bg-transparent text-xs focus:outline-none text-gray-700"
          />
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 bg-white overflow-auto">
        {page ? page.body : DEFAULT_PAGE_BODY(currentTab?.url)}
      </div>
    </div>
  );
}

/* ─── Draggable Window ───────────────────────────────────────── */
function Window({ id, title, icon: Icon, color, children, onClose, onMinimize,
                  initialX=80, initialY=40, initialW=700, initialH=480, zIndex, onFocus, minimized }) {
  const [pos,  setPos]  = useState({ x: initialX, y: initialY });
  const [size, setSize] = useState({ w: initialW, h: initialH });
  const [maximized, setMaximized] = useState(false);
  const dragRef = useRef(null);

  const startDrag = useCallback((e) => {
    if (maximized) return;
    const startX = e.clientX - pos.x;
    const startY = e.clientY - pos.y;
    const onMove = (ev) => setPos({ x: ev.clientX - startX, y: ev.clientY - startY });
    const onUp   = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [pos, maximized]);

  if (minimized) return null;

  const style = maximized
    ? { position:'absolute', top:0, left:0, right:0, bottom:40, width:'auto', height:'auto', zIndex }
    : { position:'absolute', left:pos.x, top:pos.y, width:size.w, height:size.h, zIndex };

  return (
    <div style={style} className="flex flex-col rounded-xl overflow-hidden shadow-2xl border border-gray-600" onMouseDown={onFocus}>
      {/* Title bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 shrink-0 cursor-grab select-none"
        style={{ background:color || '#2d2d2d' }}
        onMouseDown={startDrag}>
        <div className="flex gap-1.5">
          <button onClick={onClose}    className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400"/>
          <button onClick={onMinimize} className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400"/>
          <button onClick={() => setMaximized(m => !m)} className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400"/>
        </div>
        <div className="flex items-center gap-1.5 flex-1 justify-center">
          {Icon && <Icon size={13} className="text-gray-300"/>}
          <span className="text-gray-200 text-xs font-semibold">{title}</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

/* ─── Camera Overlay ─────────────────────────────────────────── */
function CameraOverlay() {
  const [cameraOn, setCameraOn] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!cameraOn) return;

    const startCamera = async () => {
      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 320 },
            height: { ideal: 320 }
          },
          audio: false 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        }
      } catch (err) {
        console.error('Camera error:', err);
        setCameraError(err.name === 'NotAllowedError' ? 'Permission denied' : 'Camera unavailable');
        setCameraOn(false);
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [cameraOn]);

  const toggleCamera = () => {
    if (cameraOn && streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraOn(!cameraOn);
  };

  return (
    <div className="fixed bottom-4 left-4 z-[9999] font-sans">
      {cameraOn && !cameraError ? (
        <div className="relative w-80 h-80 bg-black border-4 border-green-500 rounded-full shadow-2xl overflow-hidden flex items-center justify-center"
          style={{ boxShadow: '0 0 30px rgba(34, 197, 94, 0.5)' }}>
          {/* Video feed */}
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline
            className="w-full h-full object-cover block bg-black"
          />
          
          {/* Recording indicator */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/80 px-2.5 py-1 rounded-full">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/>
            <span className="text-xs font-semibold text-white">🟢 Live</span>
          </div>

          {/* Toggle button */}
          <button
            onClick={toggleCamera}
            className="absolute bottom-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-lg transition-all"
            title="Turn off camera">
            <Video size={12}/>
          </button>
        </div>
      ) : (
        <div className="w-80 h-80 bg-gray-900 border-4 border-gray-600 rounded-full shadow-2xl p-4 text-center flex flex-col items-center justify-center"
          style={{ boxShadow: '0 0 30px rgba(0, 0, 0, 0.5)' }}>
          <button
            onClick={toggleCamera}
            className="flex flex-col items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white py-4 px-4 rounded-full text-xs font-semibold transition-all w-24 h-24">
            <Video size={28}/>
            <span className="text-[10px]">Turn On</span>
          </button>
          {cameraError && (
            <p className="text-xs text-red-400 mt-3">{cameraError}</p>
          )}
          <p className="text-xs text-gray-400 mt-3">⚫ Off</p>
        </div>
      )}
    </div>
  );
}

/* ─── DevOS Desktop ──────────────────────────────────────────── */
export default function DevOS({ onExit, onLog: parentLog }) {
  const [windows, setWindows] = useState([
    { id:'editor',  title:'solution.py — VS Code',  icon:Code2,   open:true, minimized:false, zIndex:10, color:'#1e1e1e', x:40, y:20, w:680, h:480 },
    { id:'browser', title:'Chrome',                  icon:Globe,   open:false, minimized:false, zIndex:9, color:'#2d3748', x:100, y:60, w:720, h:500 },
  ]);
  const [logs,   setLogs]   = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const zTop = useRef(20);

  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e+1), 1000);
    return () => clearInterval(t);
  }, []);

  const addLog = (cat, msg, col) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    setLogs(prev => [...prev.slice(-50), { t:time, cat, msg, col }]);
    parentLog?.(cat, msg, col);
  };

  const focusWindow = (id) => {
    zTop.current += 1;
    const z = zTop.current;
    setWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex:z } : w));
  };

  const openWindow = (id) => {
    zTop.current += 1;
    setWindows(prev => prev.map(w => w.id === id ? { ...w, open:true, minimized:false, zIndex:zTop.current } : w));
    addLog('SYSTEM', `Opened ${id}`, 'blue');
  };

  const closeWindow = (id) => setWindows(prev => prev.map(w => w.id === id ? { ...w, open:false } : w));
  const minimizeWindow = (id) => setWindows(prev => prev.map(w => w.id === id ? { ...w, minimized:!w.minimized } : w));

  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background:'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      {/* Camera Overlay */}
      <CameraOverlay/>

      {/* Desktop wallpaper hint */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ backgroundImage:'radial-gradient(circle at 50% 50%, #22c55e 0%, transparent 70%)' }}/>

      {/* Windows */}
      <div className="flex-1 relative overflow-hidden">
        {windows.map(w => {
          if (!w.open) return null;
          return (
            <Window key={w.id} id={w.id} title={w.title} icon={w.icon} color={w.color}
              initialX={w.x} initialY={w.y} initialW={w.w} initialH={w.h}
              zIndex={w.zIndex} minimized={w.minimized}
              onClose={() => closeWindow(w.id)}
              onMinimize={() => minimizeWindow(w.id)}
              onFocus={() => focusWindow(w.id)}>
              {w.id === 'editor'  && <CodeEditor  onLog={addLog}/>}
              {w.id === 'browser' && <MiniBrowser onLog={addLog}/>}
            </Window>
          );
        })}
      </div>

      {/* Taskbar */}
      <div className="h-10 bg-gray-900/95 border-t border-gray-700 flex items-center px-4 gap-3 shrink-0">
        {/* App icons */}
        <div className="flex items-center gap-1">
          {[
            { id:'editor',  icon:Code2, label:'Editor', color:'#22c55e' },
            { id:'browser', icon:Globe, label:'Chrome',  color:'#3b82f6' },
          ].map(app => {
            const w = windows.find(x => x.id === app.id);
            return (
              <button key={app.id} onClick={() => w?.open ? minimizeWindow(app.id) : openWindow(app.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all ${w?.open && !w?.minimized ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
                <app.icon size={13} style={{ color: w?.open ? app.color : undefined }}/>
                <span>{app.label}</span>
              </button>
            );
          })}
        </div>

        {/* Live log ticker */}
        <div className="flex-1 mx-4 overflow-hidden">
          {logs.length > 0 && (
            <p className="text-xs font-mono text-green-400 truncate animate-pulse">
              [{logs[logs.length-1].t}] {logs[logs.length-1].cat}: {logs[logs.length-1].msg}
            </p>
          )}
        </div>

        {/* Right: timer + exit */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-gray-800 px-3 py-1 rounded-lg">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/>
            <span className="text-xs font-mono text-white font-bold">{fmt(elapsed)}</span>
            <span className="text-xs text-gray-400">/ 60:00</span>
          </div>
          <button onClick={onExit}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors">
            <X size={12}/> End Test
          </button>
        </div>
      </div>
    </div>
  );
}
