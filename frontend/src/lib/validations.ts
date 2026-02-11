import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

// ---------------------------------------------------------------------------
// 1. Transaction form (add-spending page)
// ---------------------------------------------------------------------------

export const transactionSchema = z.object({
  merchant: z
    .string()
    .min(1, "Merchant name is required")
    .max(255, "Merchant name must be 255 characters or fewer"),
  amount: z
    .number({ required_error: "Amount is required", invalid_type_error: "Amount must be a number" })
    .positive("Amount must be greater than 0"),
  currency: z
    .string()
    .length(3, "Currency must be exactly 3 characters")
    .regex(/^[A-Z]{3}$/, "Currency must be 3 uppercase letters (e.g. MYR, USD)"),
  date: z
    .string()
    .min(1, "Date is required")
    .regex(dateRegex, "Date must be in YYYY-MM-DD format"),
  categoryId: z
    .string()
    .regex(uuidRegex, "Category must be a valid UUID")
    .optional()
    .or(z.literal("")),
  description: z
    .string()
    .max(1000, "Description must be 1000 characters or fewer")
    .optional()
    .or(z.literal("")),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;

// ---------------------------------------------------------------------------
// 2. Budget form (create / edit budget)
// ---------------------------------------------------------------------------

export const budgetSchema = z
  .object({
    name: z
      .string()
      .min(1, "Budget name is required")
      .max(255, "Budget name must be 255 characters or fewer"),
    amount: z
      .number({ required_error: "Amount is required", invalid_type_error: "Amount must be a number" })
      .positive("Amount must be greater than 0"),
    period: z.enum(["weekly", "monthly", "yearly"], {
      required_error: "Period is required",
      invalid_type_error: "Period must be weekly, monthly, or yearly",
    }),
    categoryId: z
      .string()
      .regex(uuidRegex, "Category must be a valid UUID")
      .optional()
      .or(z.literal("")),
    startDate: z
      .string()
      .min(1, "Start date is required")
      .regex(dateRegex, "Start date must be in YYYY-MM-DD format"),
    endDate: z
      .string()
      .regex(dateRegex, "End date must be in YYYY-MM-DD format")
      .optional()
      .or(z.literal("")),
    alertThreshold: z
      .number({ invalid_type_error: "Alert threshold must be a number" })
      .min(0, "Alert threshold must be at least 0")
      .max(100, "Alert threshold must be at most 100")
      .optional(),
  })
  .refine(
    (data) => {
      if (data.endDate && data.endDate !== "" && data.startDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: "End date must be on or after the start date",
      path: ["endDate"],
    }
  );

export type BudgetFormData = z.infer<typeof budgetSchema>;

// ---------------------------------------------------------------------------
// 3. Category form (create / edit category)
// ---------------------------------------------------------------------------

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(100, "Category name must be 100 characters or fewer"),
  icon: z.string().optional().or(z.literal("")),
  color: z
    .string()
    .regex(hexColorRegex, "Color must be a valid hex color (e.g. #FF5733)")
    .optional()
    .or(z.literal("")),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

// ---------------------------------------------------------------------------
// 4. Profile name form (settings)
// ---------------------------------------------------------------------------

export const profileNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or fewer"),
});

export type ProfileNameFormData = z.infer<typeof profileNameSchema>;

// ---------------------------------------------------------------------------
// 5. API key form (settings)
// ---------------------------------------------------------------------------

export const apiKeySchema = z.object({
  provider: z.enum(["groq", "gemini"], {
    required_error: "Provider is required",
    invalid_type_error: "Provider must be groq or gemini",
  }),
  api_key: z
    .string()
    .min(10, "API key must be at least 10 characters"),
});

export type ApiKeyFormData = z.infer<typeof apiKeySchema>;
