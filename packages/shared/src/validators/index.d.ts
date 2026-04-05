import { z } from 'zod';
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
}, {
    page?: number | undefined;
    limit?: number | undefined;
}>;
export declare const cursorPaginationSchema: z.ZodObject<{
    before: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    before?: string | undefined;
}, {
    limit?: number | undefined;
    before?: string | undefined;
}>;
export declare const sendMessageSchema: z.ZodObject<{
    text: z.ZodString;
    type: z.ZodDefault<z.ZodEnum<["TEXT", "NOTE"]>>;
}, "strip", z.ZodTypeAny, {
    type: "TEXT" | "NOTE";
    text: string;
}, {
    text: string;
    type?: "TEXT" | "NOTE" | undefined;
}>;
export declare const requestUploadSchema: z.ZodObject<{
    fileName: z.ZodString;
    mimeType: z.ZodString;
    sizeBytes: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
}, {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
}>;
export declare const rateTicketSchema: z.ZodObject<{
    rating: z.ZodNumber;
    comment: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    rating: number;
    comment?: string | undefined;
}, {
    rating: number;
    comment?: string | undefined;
}>;
export declare const createServiceSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    slaMinutes: z.ZodDefault<z.ZodNumber>;
    routingMode: z.ZodDefault<z.ZodEnum<["manual", "round_robin"]>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    slaMinutes: number;
    routingMode: "manual" | "round_robin";
    description?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
    slaMinutes?: number | undefined;
    routingMode?: "manual" | "round_robin" | undefined;
}>;
export declare const createMacroSchema: z.ZodObject<{
    name: z.ZodString;
    content: z.ZodString;
    category: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    content: string;
    sortOrder: number;
    category?: string | undefined;
}, {
    name: string;
    content: string;
    category?: string | undefined;
    sortOrder?: number | undefined;
}>;
export declare const inviteTeamMemberSchema: z.ZodObject<{
    telegramId: z.ZodString;
    role: z.ZodEnum<["ADMIN", "AGENT"]>;
}, "strip", z.ZodTypeAny, {
    telegramId: string;
    role: "ADMIN" | "AGENT";
}, {
    telegramId: string;
    role: "ADMIN" | "AGENT";
}>;
//# sourceMappingURL=index.d.ts.map