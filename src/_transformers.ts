import type {
  Content,
  ContentListUnion,
  ContentUnion,
  Part,
  PartListUnion,
  PartUnion,
} from '@google/genai';

function _isContent(origin: unknown): boolean {
  return (
    origin !== null &&
    origin !== undefined &&
    typeof origin === 'object' &&
    'parts' in origin &&
    Array.isArray(origin.parts)
  );
}

function _isFunctionCallPart(origin: unknown): boolean {
  return (
    origin !== null &&
    origin !== undefined &&
    typeof origin === 'object' &&
    'functionCall' in origin
  );
}

function _isFunctionResponsePart(origin: unknown): boolean {
  return (
    origin !== null &&
    origin !== undefined &&
    typeof origin === 'object' &&
    'functionResponse' in origin
  );
}

export function tContent(origin?: ContentUnion): Content {
  if (origin === null || origin === undefined) {
    throw new Error('ContentUnion is required');
  }
  if (_isContent(origin)) {
    // _isContent is a utility function that checks if the
    // origin is a Content.
    return origin as Content;
  }

  return {
    role: 'user',
    parts: tParts(origin as PartListUnion)!,
  };
}

export function tContents(origin?: ContentListUnion): Content[] {
  if (
    origin === null ||
    origin === undefined ||
    (Array.isArray(origin) && origin.length === 0)
  ) {
    throw new Error('contents are required');
  }
  if (!Array.isArray(origin)) {
    // If it's not an array, it's a single content or a single PartUnion.
    if (_isFunctionCallPart(origin) || _isFunctionResponsePart(origin)) {
      throw new Error(
        'To specify functionCall or functionResponse parts, please wrap them in a Content object, specifying the role for them'
      );
    }
    return [tContent(origin as ContentUnion)];
  }

  const result: Content[] = [];
  const accumulatedParts: PartUnion[] = [];
  const isContentArray = _isContent(origin[0]);

  for (const item of origin) {
    const isContent = _isContent(item);

    if (isContent !== isContentArray) {
      throw new Error(
        'Mixing Content and Parts is not supported, please group the parts into a the appropriate Content objects and specify the roles for them'
      );
    }

    if (isContent) {
      // `isContent` contains the result of _isContent, which is a utility
      // function that checks if the item is a Content.
      result.push(item as Content);
    } else if (_isFunctionCallPart(item) || _isFunctionResponsePart(item)) {
      throw new Error(
        'To specify functionCall or functionResponse parts, please wrap them, and any other parts, in Content objects as appropriate, specifying the role for them'
      );
    } else {
      accumulatedParts.push(item as PartUnion);
    }
  }

  if (!isContentArray) {
    result.push({ role: 'user', parts: tParts(accumulatedParts) });
  }
  return result;
}

export function tPart(origin?: PartUnion | null): Part {
  if (origin === null || origin === undefined) {
    throw new Error('PartUnion is required');
  }
  if (typeof origin === 'object') {
    return origin;
  }
  if (typeof origin === 'string') {
    return { text: origin };
  }
  throw new Error(`Unsupported part type: ${typeof origin}`);
}

export function tParts(origin?: PartListUnion | null): Part[] {
  if (
    origin === null ||
    origin === undefined ||
    (Array.isArray(origin) && origin.length === 0)
  ) {
    throw new Error('PartListUnion is required');
  }
  if (Array.isArray(origin)) {
    return origin.map((item) => tPart(item as PartUnion)!);
  }
  return [tPart(origin)!];
}
