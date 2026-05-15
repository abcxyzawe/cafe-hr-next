import { NextResponse } from "next/server";

export const dynamic = "force-static";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "Cafe HR API",
    version: "1.0.0",
    description:
      "API documentation for Cafe HR — coffee shop HR management system. All routes are authenticated via session cookie unless noted.",
    contact: {
      name: "Cafe HR",
      email: "admin@cafe.vn",
    },
    license: { name: "MIT" },
  },
  servers: [
    { url: "/api", description: "Current host" },
  ],
  security: [{ sessionCookie: [] }],
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "cafe-hr-session",
        description: "JWT signed with AUTH_SECRET (HS256)",
      },
    },
    schemas: {
      HealthResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
          timestamp: { type: "string", format: "date-time" },
          checks: {
            type: "object",
            additionalProperties: {
              type: "object",
              properties: {
                ok: { type: "boolean" },
                detail: { type: "string" },
              },
            },
          },
        },
      },
      ActivityLog: {
        type: "object",
        properties: {
          id: { type: "integer" },
          action: { type: "string", example: "employee.create" },
          summary: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          user: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "integer" },
              name: { type: "string" },
              email: { type: "string", format: "email" },
              role: { type: "string", enum: ["admin", "staff"] },
            },
          },
        },
      },
      SearchItem: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["employee", "shift", "activity", "nav"],
          },
          id: { type: "string" },
          href: { type: "string" },
          title: { type: "string" },
          subtitle: { type: "string", nullable: true },
          avatarUrl: { type: "string", nullable: true },
          meta: { type: "string", nullable: true },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: { error: { type: "string" } },
      },
    },
    responses: {
      Unauthorized: {
        description: "Authentication required",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      Forbidden: {
        description: "Admin role required",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        summary: "System health check",
        description:
          "Probes database connectivity and XAI API key presence. Public — does NOT require authentication.",
        security: [],
        tags: ["System"],
        responses: {
          "200": {
            description: "All checks passing",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
              },
            },
          },
          "503": {
            description: "One or more checks failing",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
              },
            },
          },
        },
      },
    },
    "/search": {
      get: {
        summary: "Build global search index",
        description:
          "Returns employees, recent shifts, and recent activities as flat searchable items. Used by the Cmd+K command palette.",
        tags: ["Search"],
        responses: {
          "200": {
            description: "Search items",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      items: { $ref: "#/components/schemas/SearchItem" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/activity/stream": {
      get: {
        summary: "Server-Sent Events stream of new activity logs",
        description:
          "Long-lived SSE connection. Server polls every 3s and pushes new activity entries as `data: {json}\\n\\n`. Heartbeat ping comments every 30s.",
        tags: ["Activity"],
        responses: {
          "200": {
            description: "Event stream (text/event-stream)",
            content: {
              "text/event-stream": {
                schema: { type: "string" },
                example:
                  "event: ready\\ndata: {\"lastId\":42}\\n\\ndata: {\"id\":43,\"action\":\"employee.create\",\"summary\":\"...\"}\\n\\n",
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/activity/export": {
      get: {
        summary: "Export audit log as CSV",
        description: "Admin-only. Returns up to 10000 rows. UTF-8 with BOM.",
        tags: ["Activity"],
        parameters: [
          {
            name: "from",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "Start date (inclusive)",
          },
          {
            name: "to",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "End date (inclusive)",
          },
        ],
        responses: {
          "200": {
            description: "CSV file",
            content: { "text/csv": { schema: { type: "string" } } },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/payroll/{period}/export": {
      get: {
        summary: "Export payroll as Excel (.xlsx)",
        tags: ["Payroll"],
        parameters: [
          {
            name: "period",
            in: "path",
            required: true,
            schema: { type: "string", pattern: "^\\d{4}-\\d{2}$" },
            description: "Pay period YYYY-MM",
            example: "2026-05",
          },
        ],
        responses: {
          "200": {
            description: "XLSX file",
            content: {
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
          "400": {
            description: "Invalid period format",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/payroll/{period}/csv": {
      get: {
        summary: "Export payroll as CSV",
        tags: ["Payroll"],
        parameters: [
          {
            name: "period",
            in: "path",
            required: true,
            schema: { type: "string", pattern: "^\\d{4}-\\d{2}$" },
            example: "2026-05",
          },
        ],
        responses: {
          "200": {
            description: "CSV file",
            content: { "text/csv": { schema: { type: "string" } } },
          },
          "400": {
            description: "Invalid period format",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/employees/template.csv": {
      get: {
        summary: "Download employee CSV import template",
        description: "Static CSV template with header + 2 example rows.",
        security: [],
        tags: ["Employees"],
        responses: {
          "200": {
            description: "CSV template",
            content: { "text/csv": { schema: { type: "string" } } },
          },
        },
      },
    },
  },
  tags: [
    { name: "System", description: "Health checks" },
    { name: "Search", description: "Global search index" },
    { name: "Activity", description: "Audit log streaming + export" },
    { name: "Payroll", description: "Payroll exports" },
    { name: "Employees", description: "Employee management" },
  ],
};

export async function GET() {
  return NextResponse.json(spec, {
    headers: {
      "Cache-Control": "public, max-age=300",
    },
  });
}
