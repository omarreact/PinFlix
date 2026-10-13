import { notFound } from "next/navigation";
import { DigitalCollection } from "@/src/components/source-ui/digital-collection";
import {
  DIGITAL_COLLECTIONS,
  type DigitalSection,
} from "@/src/lib/digital-collections";
export default async function CollectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!Object.hasOwn(DIGITAL_COLLECTIONS, section)) notFound();
  const collection = DIGITAL_COLLECTIONS[section as DigitalSection];
  return (
    <DigitalCollection
      title={collection.title}
      action={collection.action}
      items={collection.items}
    />
  );
}
