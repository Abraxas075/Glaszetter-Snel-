import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Glaszetter Snel</h1>
      <p>Meer dan glaswerk, een heldere werkwijze.</p>
      <p style={{ marginTop: '1rem' }}>
        <Link href="/login">Inloggen</Link>
      </p>
    </main>
  );
}
