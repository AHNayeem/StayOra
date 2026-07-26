import { createStubService } from "../../crud";
import { TEMPLATES_SEED } from "./data";
import type { NotificationTemplate } from "./types";
import type { TemplateFormValues } from "./schemas";

/** Notification templates data source (in-memory stub; repository-ready). */
export const templatesService = createStubService<NotificationTemplate, TemplateFormValues>({
  seed: TEMPLATES_SEED,
  getId: (row) => row.id,
  searchFields: ["name", "key", "subject", "description"],
  idPrefix: "tpl",
  applyCreate: (input, id) => ({
    ...input,
    subject: input.channel === "email" ? input.subject : "",
    id,
    updatedAt: new Date().toISOString(),
  }),
  applyUpdate: (existing, input) => ({
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  }),
});

export const templateKeys = {
  all: ["system", "templates"] as const,
};
