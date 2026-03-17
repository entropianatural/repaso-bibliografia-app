import React, { useState } from 'react';
import { supabase } from './lib/supabase';
import { BIBLIOGRAFIA } from './data/temas';

const AMBIENTES = {
  zen: { 
    bg: "bg-[#F9F7F2]", card: "bg-white", cardActive: "bg-[#EFF3EF] border-[#AEC3B0]", 
    text: "text-[#4A5759]", subtext: "text-[#7A8B8C]", accent: "bg-[#598392]", sidebar: "bg-[#F0EDE5]",
    rojo: "bg-red-200 text-red-800", naranja: "bg-orange-200 text-orange-800", verde: "bg-[#AEC3B0] text-white"
  },
  moderno: { 
    bg: "bg-slate-50", card: "bg-white", cardActive: "bg-blue-50 border-blue-500", 
    text: "text-slate-900", subtext: "text-slate-500", accent: "bg-blue-600", sidebar: "bg-slate-200",
    rojo: "bg-red-500 text-white", naranja: "bg-amber-500 text-white", verde: "bg-emerald-500 text-white"
  },
  noche: { 
    bg: "bg-[#1A1A1A]", card: "bg-[#2D2D2D]", cardActive: "bg-[#3D3D3D] border-[#598392]", 
    text: "text-[#E0E0E0]", subtext: "text-[#A0A0A0]", accent: "bg-[#598392]", sidebar: "bg-[#121212]",
    rojo: "bg-red-900/50 text-red-200", naranja: "bg-orange-900/50 text-orange-200", verde: "bg-emerald-900/50 text-emerald-200"
  }
};

function App() {
  const [ambiente, setAmbiente] = useState('zen');
  const [temaIdSeleccionado, setTemaIdSeleccionado] = useState(BIBLIOGRAFIA[0].id);
  const [seleccionadosPorTema, setSeleccionadosPorTema] = useState({}); // { temaId: [libros] }
  const [sesionIniciada, setSesionIniciada] = useState(false);

  const temaActual = BIBLIOGRAFIA.find(t => t.id === temaIdSeleccionado);
  const estilo = AMBIENTES[ambiente];

  // Obtener libros seleccionados para el tema actual
  const librosActuales = seleccionadosPorTema[temaIdSeleccionado] || [];

  const toggleLibro = (libro) => {
    setSeleccionadosPorTema(prev => {
      const actual = prev[temaIdSeleccionado] || [];
      const nuevos = actual.includes(libro) 
        ? actual.filter(l => l !== libro) 
        : [...actual, libro];
      return { ...prev, [temaIdSeleccionado]: nuevos };
    });
  };

  // Función para determinar el color del círculo según el progreso
  const getColorEstado = (idTema) => {
    const librosMarcados = seleccionadosPorTema[idTema] || [];
    const tema = BIBLIOGRAFIA.find(t => t.id === idTema);
    const totalLibros = tema.libros.length;

    if (librosMarcados.length === 0) return estilo.rojo;
    if (librosMarcados.length === totalLibros) return estilo.verde;
    return estilo.naranja;
  };

  if (!sesionIniciada) {
    return (
      <div className={`min-h-screen ${estilo.bg} flex items-center justify-center transition-colors duration-700`}>
        <button onClick={() => setSesionIniciada(true)} className={`px-12 py-4 border rounded-full uppercase tracking-[0.3em] text-xs ${estilo.text} border-current hover:bg-current hover:invert transition-all`}>
          Entrar al Sistema
        </button>
      </div>
    );
  }

  return (
    <div className={`flex h-screen overflow-hidden ${estilo.bg} ${estilo.text} transition-colors duration-500`}>
      
      {/* SIDEBAR */}
      <aside className={`w-20 md:w-72 ${estilo.sidebar} flex flex-col h-full border-r border-black/5`}>
        <div className="p-6 shrink-0 text-center">
          <h1 className="text-[10px] font-black tracking-[0.4em] opacity-40">BIBLIOGRAFÍA</h1>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
          {BIBLIOGRAFIA.map((tema) => {
            const esActivo = temaIdSeleccionado === tema.id;
            const colorEstado = getColorEstado(tema.id);
            
            return (
              <button
                key={tema.id}
                onClick={() => setTemaIdSeleccionado(tema.id)}
                className={`w-full flex items-center p-2 md:p-3 rounded-xl transition-all ${
                  esActivo ? 'bg-white/80 shadow-sm' : 'hover:bg-black/5 opacity-70'
                }`}
              >
                <div className={`w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-lg flex items-center justify-center font-bold text-[10px] md:text-xs transition-colors ${colorEstado}`}>
                  {tema.id}
                </div>
                <div className="hidden md:block ml-3 text-left overflow-hidden">
                  <p className={`text-[11px] leading-tight truncate ${esActivo ? 'font-bold' : ''}`}>
                    {tema.titulo.split(':')[1] || tema.titulo}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer Ambientes */}
        <div className="p-6 shrink-0 flex justify-center space-x-4">
          {Object.keys(AMBIENTES).map(k => (
            <button key={k} onClick={() => setAmbiente(k)} className={`w-3 h-3 rounded-full border border-current ${ambiente === k ? 'scale-125 bg-current' : 'opacity-20'}`} />
          ))}
        </div>
      </aside>

      {/* CONTENIDO CENTRAL */}
      <main className="flex-1 h-full overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-16 pb-40">
          <header className="mb-12">
            <h2 className="text-3xl md:text-4xl font-light leading-tight">{temaActual.titulo}</h2>
            <div className="mt-4 flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-widest ${getColorEstado(temaActual.id)}`}>
                {librosActuales.length === 0 ? 'No iniciado' : librosActuales.length === temaActual.libros.length ? 'Dominado' : 'En estudio'}
              </div>
              <span className="text-xs opacity-40">{librosActuales.length} de {temaActual.libros.length} libros seleccionados</span>
            </div>
          </header>

          <div className="space-y-4">
            {temaActual.libros.map((libro, idx) => (
              <div 
                key={idx}
                onClick={() => toggleLibro(libro)}
                className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer shadow-sm ${
                  librosActuales.includes(libro) 
                  ? estilo.cardActive + " translate-x-2" 
                  : estilo.card + " border-transparent hover:border-black/5"
                }`}
              >
                <div className="flex items-start">
                  <div className={`mt-1.5 h-3 w-3 rounded-full border mr-4 shrink-0 transition-colors ${librosActuales.includes(libro) ? estilo.accent : 'border-slate-300'}`} />
                  <p className="text-sm md:text-base leading-relaxed">{libro}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
      `}} />
    </div>
  );
}

export default App;