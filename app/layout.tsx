export const metadata = { title: 'SkinSignal', description: 'CSFloat-lane analytics' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}