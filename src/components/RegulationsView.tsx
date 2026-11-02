import React from 'react';
import { BookOpen } from 'lucide-react';

export const RegulationsView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#16262f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-xl font-bold text-[#142433] dark:text-[#e8f1ee] flex items-center gap-2">
          <BookOpen className="text-[#0e8a5f]" size={22} />
          <span>Reglamento Oficial de KAPE A.F.</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Estatutos y normativas de competición, fichajes, puntuación, arbitraje y fair play
        </p>
      </div>

      <div className="bg-white dark:bg-[#16262f] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
        {/* Cap I */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-[#0e8a5f] dark:text-[#6fe3ae] uppercase tracking-wider">
            Capítulo I · Inscripción y Equipos
          </h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <b>Art. 1.</b> Los equipos se registran y gestionan su información (nombre, escudo, colores, cancha sede, contacto). Nada es oficial hasta que el administrador lo apruebe en la plataforma.
            </li>
            <li>
              <b>Art. 2.</b> Plantel de hasta 25 jugadores base más 5 opcionales (máximo 30 jugadores reglamentarios), con nombre, cédula de identidad, dorsal (único dentro del equipo), posición principal, hasta tres posiciones secundarias y foto.
            </li>
            <li>
              <b>Art. 2 bis.</b> La cédula es única en la asociación: el sistema detecta y rechaza el registro duplicado de una misma persona en dos equipos distintos. Para cambiarla de equipo debe utilizarse el procedimiento de fichajes y traspasos.
            </li>
          </ul>
        </section>

        {/* Cap II */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-[#0e8a5f] dark:text-[#6fe3ae] uppercase tracking-wider">
            Capítulo II · Traspasos y Fair Play
          </h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <b>Art. 3.</b> Traspasos libres en periodos permitidos, sujetos a aprobación del administrador o consentimiento mutuo de los capitanes.
            </li>
            <li>
              <b>Restricción semanal:</b> Un jugador no puede jugar partidos oficiales con dos equipos distintos en la misma semana natural (computada de lunes a domingo).
            </li>
            <li>
              <b>Restricción mensual:</b> Un jugador no puede cambiar de equipo más de dos (2) veces en un periodo móvil de 30 días.
            </li>
          </ul>
        </section>

        {/* Cap III */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-[#0e8a5f] dark:text-[#6fe3ae] uppercase tracking-wider">
            Capítulo III · Sistema de Puntuación y Ranking
          </h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <b>Art. 4.</b> El acta digital oficial incluye marcador, goleadores, asistentes, tarjetas y jugador más valioso (MVP).
            </li>
            <li>
              <b>Art. 5 (Puntuación Base):</b> Victoria 3 puntos, Empate 1 punto, Derrota 0 puntos. Diferencia de goles: +0,2 por gol anotado (GF), −0,1 por gol recibido (GC).
            </li>
            <li>
              <b>Bono por vencer a favoritos:</b> Vencer al equipo que lidera la tabla general multiplica los puntos base de la victoria ×1,75. Vencer a un club ubicado en el Top 3 multiplica la base ×1,50.
            </li>
            <li>
              <b>Deducción de conducta:</b> Tarjeta amarilla resta −0,1 puntos; tarjeta roja resta −0,2 puntos.
            </li>
            <li>
              <b>Penalizaciones opcionales de acta:</b> Llegada tarde al encuentro −0,5 pts; uniforme inadecuado −0,5 pts; abandono prematuro del partido −1,0 pt.
            </li>
            <li>
              <b>Entrenamientos internos:</b> Los partidillos de entrenamiento entre jugadores de un mismo club no computan para el ranking oficial de la asociación.
            </li>
          </ul>
        </section>

        {/* Cap IV */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-[#0e8a5f] dark:text-[#6fe3ae] uppercase tracking-wider">
            Capítulo IV · Torneos y Copas
          </h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <b>Art. 6 (Formatos):</b> Liga, Copa de eliminación directa, Grupos con liguilla final, Grupos con eliminatoria y Estilo Champions. Pueden disputarse a partido único o ida y vuelta (la final siempre es a partido único).
            </li>
            <li>
              <b>Art. 6 bis (Criterios de Desempate):</b> El desempate sigue el paquete normativo seleccionado al crear la competición (UEFA Champions League, Premier League, LaLiga, Serie A, Bundesliga, Ligue 1, CONMEBOL o CONCACAF).
            </li>
            <li>
              <b>Art. 7 (Puntos al Ranking General):</b> Al finalizar un torneo oficial, se otorgan puntos a los participantes según la fórmula de dificultad: <code>8 × log₂(equipos) × (1 + partidos del campeón ÷ 10)</code> (mínimo 10 puntos). El campeón recibe el 100%, subcampeón 60%, semifinalistas 40%, cuartofinalistas 25% y cada participante al menos el 10%.
            </li>
          </ul>
        </section>

        {/* Cap V */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-[#0e8a5f] dark:text-[#6fe3ae] uppercase tracking-wider">
            Capítulo V · Arbitraje y Conflicto de Intereses
          </h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <b>Art. 8.</b> Los árbitros se registran y son oficiales exclusivamente tras la aprobación del administrador de KAPE A.F.
            </li>
            <li>
              <b>Art. 9 (Incompatibilidad):</b> Un árbitro puede ser a su vez jugador activo de la asociación, pero está terminantemente inhabilitado para dirigir cualquier partido donde participe su propio equipo. El sistema bloquea de forma automática cualquier intento de designación en conflicto.
            </li>
            <li>
              <b>Art. 10 (Disponibilidad):</b> Ningún árbitro puede tener dos designaciones en el mismo bloque horario.
            </li>
            <li>
              <b>Art. 11:</b> Al concluir el encuentro, los capitanes evalúan el desempeño arbitral con una calificación de 1 a 5 estrellas.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};
