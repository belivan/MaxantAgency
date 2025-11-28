export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Lead Details</h1>
      <p className="text-muted-foreground">
        Lead ID: {id}
      </p>
      <p className="text-muted-foreground">
        Full analysis view - Coming in Phase 6
      </p>
    </div>
  );
}
