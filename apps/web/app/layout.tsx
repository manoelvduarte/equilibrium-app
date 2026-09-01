import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Equilibrium — Sistema Financeiro para Casais',
  description: 'Gestão financeira compartilhada com inteligência agêntica',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-950 text-slate-50 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
