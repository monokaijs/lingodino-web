import pluralize from "pluralize";
import {Schemas} from "@/lib/services/db/schemas";

export function getCollectionName(schemaName: Schemas): string {
  return pluralize(schemaName.toLowerCase())
}
