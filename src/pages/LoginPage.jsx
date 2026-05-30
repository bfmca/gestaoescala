import { useEffect } from 'react';

const PLATAFORMA_URL = 'https://educacaoemsaude.vercel.app';

export default function LoginPage() {
  useEffect(() => {
    window.location.replace(PLATAFORMA_URL);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, Arial, sans-serif',
      color: '#64748b',
    }}>
      Redirecionando para a nova plataforma...
    </div>
  );
}
