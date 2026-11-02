import React from 'react';
import { useData } from '../context/DataContext';
import { Shield, Clock } from 'lucide-react';

export const AuditView: React.FC = () => {
  const { auditoria } = useData();

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#16262f] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-xl font-bold text-[#142433] dark:text-[#e8f1ee] flex items-center gap-2">
          <Shield className="text-[#0e8a5f]" size={22} />
          <span>Historial de Auditoría y Cambios</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Registro inmutable de acciones realizadas en el sistema (últimos 100 eventos)
        </p>
      </div>

      <div className="bg-white dark:bg-[#16262f] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {auditoria.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-400 text-[11px] uppercase">
                  <th className="py-2.5 px-3">Fecha y Hora</th>
                  <th className="py-2.5 px-3">Usuario</th>
                  <th className="py-2.5 px-3">Acción</th>
                  <th className="py-2.5 px-3">Colección / Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditoria.map((a, i) => (
                  <tr key={a.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {new Date(a.t).toLocaleString('es-ES')}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {a.u}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold uppercase text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                        {a.a}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                      <b className="text-slate-800 dark:text-slate-200">{a.c}</b> {a.k ? `(${a.k})` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs">
            Aún no hay registros de auditoría almacenados.
          </div>
        )}
      </div>
    </div>
  );
};
