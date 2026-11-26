// Drizzle schema entry point. Define tables here (or in files re-exported
// from here) only for entities that PRODUCT.md requires, then run the
// project's generate script and review the SQL before applying it.
// Do not ship sample business tables or seed data that the product did not ask for.
//
// Example shape, kept as a comment so no table exists until one is needed:
//   import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
//   export const accounts = pgTable("accounts", {
//     id: uuid("id").primaryKey().defaultRandom(),
//     email: text("email").notNull().unique(),
//     createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
//   });
export {};
