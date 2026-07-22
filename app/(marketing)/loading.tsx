import { Container } from "@/components/ui/container";
import { Spinner } from "@/components/ui/spinner";

/** Marketing-wide loading fallback shown while a route segment streams in. */
export default function MarketingLoading() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-4 py-20">
      <Spinner size="lg" label="Loading page" />
      <p className="text-sm text-muted">Loading…</p>
    </Container>
  );
}
