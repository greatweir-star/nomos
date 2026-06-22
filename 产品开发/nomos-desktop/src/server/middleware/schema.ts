/**
 * Nomos V0.0.3 Schema 校验中间件
 * 基于轻量级运行时校验，不引入外部依赖
 */

export type ValidatorFn<T> = (value: unknown) => ValidationResult<T>;

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors: Array<{ field: string; code: string; message: string }>;
}

export interface StringSchema {
  type: "string";
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: string[];
  optional?: boolean;
  default?: string;
}

export interface NumberSchema {
  type: "number";
  min?: number;
  max?: number;
  integer?: boolean;
  optional?: boolean;
  default?: number;
}

export interface BooleanSchema {
  type: "boolean";
  optional?: boolean;
  default?: boolean;
}

export interface ArraySchema {
  type: "array";
  itemSchema?: ValidatorFn<unknown>;
  minLength?: number;
  maxLength?: number;
  optional?: boolean;
  default?: unknown[];
}

export interface ObjectSchema {
  type: "object";
  properties: Record<string, SchemaField>;
  optional?: boolean;
  default?: Record<string, unknown>;
}

export type SchemaField =
  | StringSchema
  | NumberSchema
  | BooleanSchema
  | ArraySchema
  | ObjectSchema
  | ValidatorFn<unknown>;

export function validateObject<T extends Record<string, unknown>>(
  schema: Record<string, SchemaField>,
  value: unknown,
  path = ""
): ValidationResult<T> {
  const errors: Array<{ field: string; code: string; message: string }> = [];

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      success: false,
      errors: [{ field: path || "root", code: "TYPE_OBJECT", message: "必须为对象" }],
    };
  }

  const result: Record<string, unknown> = {};
  const input = value as Record<string, unknown>;

  for (const [key, fieldSchema] of Object.entries(schema)) {
    const fieldPath = path ? `${path}.${key}` : key;
    const inputValue = input[key];

    if (inputValue === undefined || inputValue === null) {
      if (isOptional(fieldSchema)) {
        const defaultValue = getDefault(fieldSchema);
        if (defaultValue !== undefined) {
          result[key] = defaultValue;
        }
        continue;
      }
      errors.push({ field: fieldPath, code: "REQUIRED", message: "字段必填" });
      continue;
    }

    const fieldResult = validateField(fieldSchema, inputValue, fieldPath);
    if (!fieldResult.success) {
      errors.push(...fieldResult.errors);
    } else if (fieldResult.data !== undefined) {
      result[key] = fieldResult.data;
    }
  }

  // 拒绝未在 schema 中声明的字段（严格模式）
  for (const key of Object.keys(input)) {
    if (!(key in schema)) {
      errors.push({
        field: path ? `${path}.${key}` : key,
        code: "UNKNOWN_FIELD",
        message: "未在合同定义中声明的字段",
      });
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: result as T, errors: [] };
}

function validateField(
  schema: SchemaField,
  value: unknown,
  path: string
): ValidationResult<unknown> {
  if (typeof schema === "function") {
    return schema(value);
  }

  switch (schema.type) {
    case "string": {
      if (typeof value !== "string") {
        return { success: false, errors: [{ field: path, code: "TYPE_STRING", message: "必须为字符串" }] };
      }
      const trimmed = value.trim();
      if (schema.minLength !== undefined && trimmed.length < schema.minLength) {
        return { success: false, errors: [{ field: path, code: "MIN_LENGTH", message: `最短 ${schema.minLength} 字符` }] };
      }
      if (schema.maxLength !== undefined && trimmed.length > schema.maxLength) {
        return { success: false, errors: [{ field: path, code: "MAX_LENGTH", message: `最长 ${schema.maxLength} 字符` }] };
      }
      if (schema.pattern && !schema.pattern.test(trimmed)) {
        return { success: false, errors: [{ field: path, code: "PATTERN", message: "格式不匹配" }] };
      }
      if (schema.enum && !schema.enum.includes(trimmed)) {
        return { success: false, errors: [{ field: path, code: "ENUM", message: `允许值: ${schema.enum.join(", ")}` }] };
      }
      return { success: true, data: trimmed, errors: [] };
    }
    case "number": {
      const num = Number(value);
      if (!Number.isFinite(num)) {
        return { success: false, errors: [{ field: path, code: "TYPE_NUMBER", message: "必须为数字" }] };
      }
      if (schema.integer && !Number.isInteger(num)) {
        return { success: false, errors: [{ field: path, code: "INTEGER", message: "必须为整数" }] };
      }
      if (schema.min !== undefined && num < schema.min) {
        return { success: false, errors: [{ field: path, code: "MIN", message: `最小值 ${schema.min}` }] };
      }
      if (schema.max !== undefined && num > schema.max) {
        return { success: false, errors: [{ field: path, code: "MAX", message: `最大值 ${schema.max}` }] };
      }
      return { success: true, data: num, errors: [] };
    }
    case "boolean": {
      if (typeof value !== "boolean") {
        return { success: false, errors: [{ field: path, code: "TYPE_BOOLEAN", message: "必须为布尔值" }] };
      }
      return { success: true, data: value, errors: [] };
    }
    case "array": {
      if (!Array.isArray(value)) {
        return { success: false, errors: [{ field: path, code: "TYPE_ARRAY", message: "必须为数组" }] };
      }
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        return { success: false, errors: [{ field: path, code: "MIN_LENGTH", message: `最少 ${schema.minLength} 项` }] };
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        return { success: false, errors: [{ field: path, code: "MAX_LENGTH", message: `最多 ${schema.maxLength} 项` }] };
      }
      if (schema.itemSchema) {
        const items: unknown[] = [];
        for (let i = 0; i < value.length; i++) {
          const itemResult = schema.itemSchema(value[i]);
          if (!itemResult.success) {
            return { success: false, errors: itemResult.errors.map(e => ({ ...e, field: `${path}[${i}].${e.field}` })) };
          }
          items.push(itemResult.data);
        }
        return { success: true, data: items, errors: [] };
      }
      return { success: true, data: value, errors: [] };
    }
    case "object": {
      return validateObject(schema.properties, value, path);
    }
    default:
      return { success: true, data: value, errors: [] };
  }
}

function isOptional(schema: SchemaField): boolean {
  if (typeof schema === "function") return false;
  return schema.optional === true;
}

function getDefault(schema: SchemaField): unknown | undefined {
  if (typeof schema === "function") return undefined;
  return schema.default;
}

/** 创建 DTO 校验函数工厂 */
export function createDtoValidator<T extends Record<string, unknown>>(
  schema: Record<string, SchemaField>
): ValidatorFn<T> {
  return (value: unknown) => validateObject(schema, value);
}
