export interface LiveFunctionResponse {
  readonly id: string;
  readonly name: string;
  readonly response: Readonly<Record<string, unknown>>;
}

export interface LiveToolResponsePayload {
  readonly toolResponse: {
    readonly functionResponses: readonly LiveFunctionResponse[];
  };
}

export function createToolResponsePayload(
  functionResponses: readonly LiveFunctionResponse[]
): LiveToolResponsePayload {
  return {
    toolResponse: {
      functionResponses
    }
  };
}

export function isLiveFunctionResponse(
  value: unknown
): value is LiveFunctionResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Readonly<Record<string, unknown>>;
  return (
    typeof candidate["id"] === "string" &&
    Boolean(candidate["id"].trim()) &&
    typeof candidate["name"] === "string" &&
    Boolean(candidate["name"].trim()) &&
    typeof candidate["response"] === "object" &&
    candidate["response"] !== null &&
    !Array.isArray(candidate["response"])
  );
}
