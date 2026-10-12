import { Card } from "@/src/components/source-ui/cards";
import { toTitle } from "@/src/lib/source-ui";
import { searchHref } from "@/src/lib/search-ranking";
import type { Entertainment } from "@/src/types/catalog";
export function EntertainmentCard({ item }: { item: Entertainment }) {
  return <Card title={toTitle(item)} href={searchHref(item)} />;
}
