import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { BIBLIOGRAFIA } from './data/temas';

const AMBIENTES = {
  zen: { 
    bg: "bg-[#F9F7F2]", text: "text-[#4A5759]", sidebar: "bg-[#F0EDE5]", accent: "bg-[#598392]", 
    rojo: "bg-red-100", naranja: "bg-orange-100", verde: "bg-[#AEC3B0]", badge: "bg-red-500 text-white",
    filaSi: "bg-green-50 border-green-200", filaNo: "bg-red-50 border-red-200"
  },
  moderno: { 
    bg: "bg-slate-50", text: "text-slate-900", sidebar: "bg-slate-200", accent: "bg-blue-600", 
    rojo: "bg-red-500", naranja: "bg-amber-500", verde: "bg-emerald-500", badge: "bg-blue-600 text-white",
    filaSi: "bg-emerald-50 border-emerald-200", filaNo: "bg-rose-50 border-rose-200"
  },
  noche: { 
    bg: "bg-[#1A1A1A]", text: "text-[#E0E0E0]", sidebar: "bg-[#121212]", accent: "bg-[#598392]", 
    rojo: "bg-red-900 text-red-100", naranja: "bg-orange-900 text-orange-100", verde: "bg-emerald-900 text-emerald-100", badge: "bg-white text-black",
    filaSi: "bg-emerald-900/20 border-emerald-800", filaNo: "bg-rose-900/20 border-rose-800"
  }
};

function App() {
  const [ambiente, setAmbiente] = useState('zen');
  const [temaIdSeleccionado, setTemaIdSeleccionado] = useState(BIBLIOGRAFIA[0]?.id || 0);
  const [respuestasPorTema, setRespuestasPorTema] = useState({});
  const [conteoPreguntas, setConteoPreguntas] = useState({});
  const [sesionIniciada, setSesionIniciada] = useState(false);
  const [userId, setUserId] = useState(null);

  const estilo = AMBIENTES[ambiente];
  const temaActual = BIBLIOGRAFIA.find(t => t.id === temaIdSeleccionado) || BIBLIOGRAFIA[0];
  const respuestasActuales = respuestasPorTema[temaIdSeleccionado] || {};

  // 1. CARGAR DATOS DESDE SUPABASE AL INICIAR
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        
        // Cargar Progresos (Respuestas Sí/No)
        const { data: prog } = await supabase.from('progresos').select('*').eq('user_id', user.id);
        if (prog) {
          const mapProg = {};
          prog.forEach(p => mapProg[p.tema_id] = p.respuestas);
          setRespuestasPorTema(mapProg);
        }

        // Cargar Conteos (Notificaciones)
        const { data: cont } = await supabase.from('conteos_temas').select('*').eq('user_id', user.id);
        if (cont) {
          const mapCont = {};
          cont.forEach(c => mapCont[c.tema_id] = c.cantidad);
          setConteoPreguntas(mapCont);
        }
      }
    };
    if (sesionIniciada) fetchUserData();
  }, [sesionIniciada]);

  // 2. GUARDAR RESPUESTA (SÍ/NO)
  const handleRespuesta = async (libro, valor) => {
    const nuevasRespuestas = { ...respuestasActuales, [libro]: valor };
    setRespuestasPorTema(prev => ({ ...prev, [temaIdSeleccionado]: nuevasRespuestas }));

    if (userId) {
      await supabase.from('progresos').upsert({
        user_id: userId,
        tema_id: temaIdSeleccionado,
        respuestas: nuevasRespuestas,
        updated_at: new Date()
      });
    }
  };

  // 3. CAMBIAR TEMA, GUARDAR CONTEO E HISTORIAL
  const irATemaAleatorio = async () => {
    const nuevoConteo = (conteoPreguntas[temaIdSeleccionado] || 0) + 1;
    setConteoPreguntas(prev => ({ ...prev, [temaIdSeleccionado]: nuevoConteo }));

    if (userId) {
      // Guardar en conteos_temas
      await supabase.from('conteos_temas').upsert({
        user_id: userId,
        tema_id: temaIdSeleccionado,
        cantidad: nuevoConteo
      });

      // Insertar en historial_estudio
      await supabase.from('historial_estudio').insert({
        user_id: userId,
        tema_id: temaIdSeleccionado
      });
    }

    const otrosTemas = BIBLIOGRAFIA.filter(t => t.id !== temaIdSeleccionado);
    const random = otrosTemas[Math.floor(Math.random() * otrosTemas.length)];
    setTemaIdSeleccionado(random.id);
    document.getElementById('main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getColorEstado = (id) => {
    const respuestas = respuestasPorTema[id] || {};
    const valores = Object.values(respuestas);
    const totalTema = BIBLIOGRAFIA.find(t => t.id === id)?.libros.length || 0;
    const sis = valores.filter(v => v === 'si').length;
    
    if (sis === 0) return estilo.rojo;
    if (sis === totalTema) return estilo.verde + " text-white";
    return estilo.naranja;
  };

  if (!sesionIniciada) {
    return (
      <div className={`min-h-screen ${estilo.bg} flex items-center justify-center transition-all duration-1000`}>
        <div className="text-center space-y-8">
          <h1 className={`text-4xl font-extralight tracking-[0.3em] ${estilo.text}`}>MI BIBLIOGRAFÍA</h1>
          <button onClick={() => setSesionIniciada(true)} className={`px-16 py-4 border border-current rounded-full ${estilo.text} uppercase tracking-[0.2em] text-xs hover:bg-current hover:text-white transition-all`}>
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen overflow-hidden ${estilo.bg} ${estilo.text} transition-colors duration-500`}>
      
      {/* SIDEBAR */}
      <aside className={`w-20 md:w-72 ${estilo.sidebar} flex flex-col h-full border-r border-black/5`}>
        <div className="p-8 text-center opacity-30 text-[9px] font-black tracking-[0.5em] uppercase">Progreso Real</div>
        <nav className="flex-1 overflow-y-auto px-3 space-y-2 custom-scrollbar">
          {BIBLIOGRAFIA.map(t => (
            <button key={t.id} onClick={() => setTemaIdSeleccionado(t.id)} className={`relative w-full flex items-center p-3 rounded-2xl transition-all ${temaIdSeleccionado === t.id ? 'bg-white shadow-md scale-[1.02]' : 'hover:bg-black/5'}`}>
              {conteoPreguntas[t.id] > 0 && (
                <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold z-20 ${estilo.badge}`}>
                  {conteoPreguntas[t.id]}
                </div>
              )}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-inner ${getColorEstado(t.id)}`}>{t.id}</div>
              <div className="hidden md:block ml-4 text-left overflow-hidden">
                <p className={`text-[11px] truncate ${temaIdSeleccionado === t.id ? 'font-bold' : 'opacity-50'}`}>{t.titulo.split(':')[1] || t.titulo}</p>
              </div>
            </button>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main id="main-scroll" className="flex-1 overflow-y-auto relative scroll-smooth">
        <div className="max-w-4xl mx-auto px-8 py-20 pb-48">
          <header className="mb-12">
            <span className="text-[10px] uppercase tracking-[0.3em] opacity-40 mb-2 block">Tema {temaActual.id}</span>
            <h1 className="text-4xl font-light tracking-tight leading-tight">{temaActual.titulo}</h1>
          </header>

          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 opacity-30 text-[9px] font-bold uppercase tracking-[0.2em] border-b border-black/5">
              <div className="col-span-8 md:col-span-9">Referencia Bibliográfica</div>
              <div className="col-span-4 md:col-span-3 text-center">Estado</div>
            </div>

            {temaActual.libros.map((l, i) => {
              const estado = respuestasActuales[l];
              return (
                <div key={i} className={`grid grid-cols-12 gap-4 p-5 rounded-2xl border-2 transition-all duration-300 ${
                  estado === 'si' ? estilo.filaSi : estado === 'no' ? estilo.filaNo : 'bg-white/50 border-transparent shadow-sm'
                }`}>
                  <div className="col-span-8 md:col-span-9 flex items-start space-x-4">
                    <span className="text-[10px] mt-1 opacity-20 font-mono">{i + 1}</span>
                    <p className={`text-sm md:text-base leading-relaxed ${estado ? 'opacity-100 font-medium' : 'opacity-60'}`}>{l}</p>
                  </div>
                  
                  <div className="col-span-4 md:col-span-3 flex justify-center items-center space-x-2">
                    <button 
                      onClick={() => handleRespuesta(l, 'no')}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase transition-all ${estado === 'no' ? 'bg-red-500 text-white shadow-lg' : 'bg-slate-100/50 opacity-40 hover:opacity-100'}`}
                    >
                      No
                    </button>
                    <button 
                      onClick={() => handleRespuesta(l, 'si')}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase transition-all ${estado === 'si' ? 'bg-green-500 text-white shadow-lg' : 'bg-slate-100/50 opacity-40 hover:opacity-100'}`}
                    >
                      Sí
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={irATemaAleatorio} className={`fixed bottom-10 right-10 flex items-center space-x-4 px-10 py-6 rounded-full shadow-2xl transition-all active:scale-95 ${estilo.accent} text-white`}>
            <div className="text-right leading-none mr-2">
              <span className="block text-[8px] uppercase tracking-widest opacity-60 mb-1">Cerrar Sesión</span>
              <span className="text-sm font-bold uppercase tracking-tighter">Siguiente 🎲</span>
            </div>
          </button>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
      `}} />
    </div>
  );
}

export default App;