import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { BIBLIOGRAFIA } from './data/temas';

// --- PALETA CROMÁTICA DE ALTO CONTRASTE ---
const AMBIENTES = {
  vogue: { 
    bg: "bg-[#FBFBF9]", text: "text-[#1A1C1E]", sidebar: "bg-[#F4F4F1]", accent: "bg-[#1A1C1E]", 
    rojo: "bg-[#FFF2F2] text-[#8B1A1A] border-[#FAD7D7]", 
    naranja: "bg-[#FFF9F0] text-[#7A5A01] border-[#FCEAB8]", 
    verde: "bg-[#F0FAF2] text-[#165C2D] border-[#C6EBD0]",
    card: "bg-white border-[#EAEAEA]"
  },
  slate: { 
    bg: "bg-[#0D1117]", text: "text-[#E6EDF3]", sidebar: "bg-[#161B22]", accent: "bg-[#58A6FF]", 
    rojo: "bg-[#3D1A1A] text-[#FFD1D1] border-[#662222]", 
    naranja: "bg-[#3D2D1A] text-[#FFE4C4] border-[#664422]", 
    verde: "bg-[#1A3D2A] text-[#D1FFD7] border-[#226633]",
    card: "bg-[#161B22] border-[#30363D]"
  }
};

function App() {
  const [ambiente, setAmbiente] = useState('vogue');
  const [temaIdSeleccionado, setTemaIdSeleccionado] = useState(BIBLIOGRAFIA[0]?.id || 0);
  const [respuestasPorTema, setRespuestasPorTema] = useState({});
  const [conteoPreguntas, setConteoPreguntas] = useState({});
  const [sesionIniciada, setSesionIniciada] = useState(false);
  const [userId, setUserId] = useState(null);

  const estilo = AMBIENTES[ambiente];
  const temaActual = BIBLIOGRAFIA.find(t => t.id === temaIdSeleccionado) || BIBLIOGRAFIA[0];
  const respuestasActuales = respuestasPorTema[temaIdSeleccionado] || {};

  // --- CARGA DE DATOS DESDE EL ESQUEMA 'BIBLIOGRAFIA' ---
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        
        // Cargar progresos
        const { data: prog } = await supabase
          .schema('bibliografia')
          .from('progresos')
          .select('*')
          .eq('user_id', user.id);
          
        if (prog) {
          const mapProg = {};
          prog.forEach(p => mapProg[p.tema_id] = p.respuestas);
          setRespuestasPorTema(mapProg);
        }

        // Cargar conteos (badges)
        const { data: cont } = await supabase
          .schema('bibliografia')
          .from('conteos_temas')
          .select('*')
          .eq('user_id', user.id);
          
        if (cont) {
          const mapCont = {};
          cont.forEach(c => mapCont[c.tema_id] = c.cantidad);
          setConteoPreguntas(mapCont);
        }
      }
    };
    if (sesionIniciada) fetchUserData();
  }, [sesionIniciada]);

  // --- PERSISTENCIA EN EL ESQUEMA 'BIBLIOGRAFIA' ---
  const handleRespuesta = async (libro, valor) => {
    const nuevasRespuestas = { ...respuestasActuales, [libro]: valor };
    setRespuestasPorTema(prev => ({ ...prev, [temaIdSeleccionado]: nuevasRespuestas }));

    if (userId) {
      try {
        await supabase
          .schema('bibliografia')
          .from('progresos')
          .upsert({ 
            user_id: userId, 
            tema_id: temaIdSeleccionado, 
            respuestas: nuevasRespuestas 
          }, { onConflict: 'user_id, tema_id' });
      } catch (err) {
        console.error("Error al guardar en bibliografia.progresos:", err.message);
      }
    }
  };

  const irATemaAleatorio = async () => {
    const nuevoConteo = (conteoPreguntas[temaIdSeleccionado] || 0) + 1;
    setConteoPreguntas(prev => ({ ...prev, [temaIdSeleccionado]: nuevoConteo }));

    if (userId) {
      try {
        await supabase
          .schema('bibliografia')
          .from('conteos_temas')
          .upsert({ 
            user_id: userId, 
            tema_id: temaIdSeleccionado, 
            cantidad: nuevoConteo 
          }, { onConflict: 'user_id, tema_id' });

        await supabase
          .schema('bibliografia')
          .from('historial_estudio')
          .insert({ 
            user_id: userId, 
            tema_id: temaIdSeleccionado 
          });
      } catch (err) {
        console.error("Error al guardar en bibliografia.conteos_temas:", err.message);
      }
    }

    const otros = BIBLIOGRAFIA.filter(t => t.id !== temaIdSeleccionado);
    setTemaIdSeleccionado(otros[Math.floor(Math.random() * otros.length)].id);
  };

  const getStatusStyle = (id) => {
    const r = respuestasPorTema[id] || {};
    const sis = Object.values(r).filter(v => v === 'si').length;
    const total = BIBLIOGRAFIA.find(t => t.id === id)?.libros.length || 0;
    if (sis === 0) return estilo.rojo;
    if (sis === total) return estilo.verde;
    return estilo.naranja;
  };

  const totalLibros = temaActual.libros.length;
  const numColumnas = totalLibros > 12 ? 3 : totalLibros > 6 ? 2 : 1;
  const filasPorColumna = Math.ceil(totalLibros / numColumnas);

  if (!sesionIniciada) {
    return (
      <div className={`h-screen ${estilo.bg} flex flex-col items-center justify-center font-['Inter'] px-6 text-center`}>
        <h1 className={`text-8xl font-['Instrument_Serif'] italic mb-12 ${estilo.text}`}>The Library.</h1>
        <button onClick={() => setSesionIniciada(true)} className={`px-12 py-5 rounded-full ${ambiente === 'vogue' ? 'bg-[#1A1C1E] text-white' : 'bg-[#E6EDF3] text-black'} font-bold text-[10px] tracking-[0.4em] uppercase transition-all hover:scale-105 shadow-2xl`}>
          Entrar
        </button>
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${estilo.bg} ${estilo.text} font-['Inter'] transition-colors duration-1000`}>
      
      {/* SIDEBAR REFINADO */}
      <aside className={`w-20 md:w-80 ${estilo.sidebar} flex flex-col h-full border-r border-black/[0.06] shrink-0`}>
        <div className="p-10 mb-2">
          <h2 className="text-xl font-['Instrument_Serif'] italic opacity-40">Index</h2>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-6 space-y-3 custom-scrollbar">
          {BIBLIOGRAFIA.map(t => {
            const repasos = conteoPreguntas[t.id] || 0;
            const activo = temaIdSeleccionado === t.id;
            const statusStyle = getStatusStyle(t.id);

            return (
              <button key={t.id} onClick={() => setTemaIdSeleccionado(t.id)} 
                className={`group relative w-full flex items-center p-4 rounded-2xl transition-all duration-300 ${
                  activo 
                    ? (ambiente === 'vogue' ? 'bg-white shadow-md ring-1 ring-black/[0.05]' : 'bg-[#21262d] shadow-lg ring-1 ring-white/10') 
                    : 'hover:bg-black/[0.02] opacity-70 hover:opacity-100'
                }`}
              >
                {repasos > 0 && (
                  <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center animate-in zoom-in">
                    <span className={`relative flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black shadow-sm ${
                      ambiente === 'vogue' ? 'bg-[#1A1C1E] text-white' : 'bg-[#58A6FF] text-[#0D1117]'
                    }`}>
                      {repasos}
                    </span>
                  </div>
                )}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0 border-2 transition-all ${statusStyle} ${activo ? 'scale-110' : ''}`}>
                  {t.id}
                </div>
                <div className="hidden md:block ml-4 text-left overflow-hidden">
                  <p className={`text-[11px] leading-tight font-bold uppercase tracking-tight ${
                    activo ? (ambiente === 'vogue' ? 'text-[#1A1C1E]' : 'text-white') : 'opacity-40'
                  }`}>
                    {t.titulo.split(':')[1] || t.titulo}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="p-10 flex gap-4 border-t border-black/[0.03]">
          {Object.keys(AMBIENTES).map(k => (
            <button key={k} onClick={() => setAmbiente(k)} className={`w-5 h-5 rounded-full border-2 border-white shadow-sm transition-all ${ambiente === k ? 'scale-125 ring-2 ring-black/10' : 'opacity-30'} ${AMBIENTES[k].bg}`} />
          ))}
        </div>
      </aside>

      <main className="flex-1 h-screen flex flex-col overflow-hidden relative">
        <div className="flex-1 w-full flex flex-col px-12 pt-10">
          
          <header className="mb-6 shrink-0">
            <div className="max-w-[320px]">
              <div className="flex items-center space-x-3 mb-2 opacity-60">
                  <span className="w-6 h-[1px] bg-current"></span>
                  <span className="text-[9px] uppercase tracking-[0.4em] font-bold">Ref. {temaActual.id}</span>
              </div>
              <h1 className="text-3xl font-['Instrument_Serif'] leading-[1.1] italic tracking-tight">
                {temaActual.titulo}
              </h1>
            </div>
          </header>

          <div className="flex-1 w-full overflow-hidden pb-36 pt-4 px-2">
            <div 
              className="h-full grid gap-4 grid-flow-col auto-cols-[minmax(320px,1fr)]"
              style={{ gridTemplateRows: `repeat(${filasPorColumna}, min-content)` }}
            >
              {temaActual.libros.map((l, i) => {
                const res = respuestasActuales[l];
                let cardStyle = ambiente === 'vogue' ? 'bg-white border-black/[0.04] shadow-sm' : 'bg-[#161B22] border-[#30363D]';
                let textStyle = "opacity-85";

                if (res === 'si') {
                  cardStyle = estilo.verde;
                  textStyle = "opacity-100 font-semibold";
                } else if (res === 'no') {
                  cardStyle = estilo.rojo;
                  textStyle = "opacity-100 font-semibold";
                }

                return (
                  <div key={i} className={`flex items-stretch p-1 h-fit rounded-[2rem] border transition-all duration-700 animate-in ${cardStyle}`}>
                    <div className="flex-1 p-5 flex flex-col justify-center">
                      <p className={`text-[14px] leading-relaxed tracking-tight ${textStyle}`}>
                        {l}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 p-1 shrink-0 w-16">
                      <button 
                        onClick={() => handleRespuesta(l, 'si')}
                        className={`flex-1 rounded-[1.3rem] flex items-center justify-center text-[9px] font-bold transition-all ${res === 'si' ? 'bg-[#165C2D] text-[#D1FFD7] shadow-sm' : 'bg-black/[0.03] opacity-20 hover:opacity-100'}`}>
                        SÍ
                      </button>
                      <button 
                        onClick={() => handleRespuesta(l, 'no')}
                        className={`flex-1 rounded-[1.3rem] flex items-center justify-center text-[9px] font-bold transition-all ${res === 'no' ? 'bg-[#8B1A1A] text-[#FFD1D1] shadow-sm' : 'bg-black/[0.03] opacity-20 hover:opacity-100'}`}>
                        NO
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="absolute bottom-10 left-0 right-0 pointer-events-none flex items-center justify-center">
            <button 
              onClick={irATemaAleatorio} 
              className={`pointer-events-auto group flex items-center space-x-6 px-12 py-5 rounded-full ${ambiente === 'vogue' ? 'bg-[#1A1C1E] text-white' : 'bg-[#E6EDF3] text-[#0D1117]'} shadow-2xl hover:scale-105 active:scale-95 transition-all duration-500`}>
               <span className="text-xl">🎲</span>
               <span className="text-[10px] font-bold uppercase tracking-[0.5em]">Continuar</span>
            </button>
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        body, html { overflow: hidden; height: 100%; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </div>
  );
}

export default App;