export interface DesignToken {
  id: string;
  $type: string;
  $value: unknown;
  description: string;
  brand: string;
  mode: string;
  state: string;
  category: string;
  deprecated: boolean;
  since: string;
  tags: string[];
}

export interface ValidationError {
  tokenId: string;
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  tokenCount: number;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface AliasResolutionResult {
  resolved: DesignToken[];
  errors: ValidationError[];
}

