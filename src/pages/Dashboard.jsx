import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  useEffect(() => {
    console.log('Dashboard carregou');
    buscarMedicos();
  }, []);

  async function buscarMedicos() {
    const { data, error } = await supabase.from('medicos').select('*');

    if (error) {
      console.error('ERRO SUPABASE:', error);
      return;
    }

    console.log('MEDICOS:', data);
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
    </div>
  );
}
