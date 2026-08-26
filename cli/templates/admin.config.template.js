import { setRuntimeConfig } from "@archlynx/admin-panel";
import { entities } from "./admin/entities";

export const adminConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API,
  host: process.env.NEXT_PUBLIC_HOST,
  entities,
};

setRuntimeConfig(adminConfig); // runs the instant this file is imported, anywhere
