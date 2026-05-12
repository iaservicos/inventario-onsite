import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'Inventário Onsite',
  description: 'Dashboard de monitoramento de inventário cíclico de técnicos',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
