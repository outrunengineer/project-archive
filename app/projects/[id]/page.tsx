export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  return (
    <main>
      <h1>Project {params.id}</h1>
      <p>Project detail and timeline list.</p>
    </main>
  );
}
