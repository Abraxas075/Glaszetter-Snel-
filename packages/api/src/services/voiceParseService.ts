import Anthropic from '@anthropic-ai/sdk';
import type { ElementType } from '@glaszetter/shared';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const ELEMENT_TYPES: ElementType[] = [
  'fixed_window',
  'casement',
  'tilt_turn',
  'door',
  'sliding',
  'transom',
  'sidelight',
  'glass_wall',
  'skylight',
  'bay_window',
  'other',
];

export interface ParsedMeasurement {
  elementCode: string | null;
  location: string | null;
  elementType: ElementType | null;
  width: number | null;
  height: number | null;
  glassType: string | null;
  notes: string | null;
}

const EMPTY_RESULT: ParsedMeasurement = {
  elementCode: null,
  location: null,
  elementType: null,
  width: null,
  height: null,
  glassType: null,
  notes: null,
};

const SYSTEM_PROMPT = `Je haalt gestructureerde meetgegevens uit Nederlandse gesproken inmeetzinnen voor een glaszetbedrijf.

Voorbeeld invoer:
"R01 woonkamer, raam, 1230 breed, 1480 hoog, HR++ 4-16-4, sponning 18 millimeter, speling 8 millimeter, links draaikiep, rechts vast."

Geef ALLEEN geldige JSON terug, exact in dit schema, zonder markdown-codeblok eromheen:
{
  "elementCode": string of null,
  "location": string of null,
  "elementType": een van [${ELEMENT_TYPES.join(', ')}] of null,
  "width": getal in millimeters of null,
  "height": getal in millimeters of null,
  "glassType": string of null,
  "notes": string of null
}

Regels:
- Vul een veld alleen als het expliciet of ondubbelzinnig uit de tekst valt af te leiden. Verzin nooit waarden.
- "elementType": "raam" zonder verdere aanduiding -> "fixed_window"; "draaikiep" -> "tilt_turn"; "kiepraam" -> "casement"; "deur" -> "door"; "schuifraam"/"schuifpui" -> "sliding". Bij twijfel: null.
- Zet details die niet in een ander veld passen (sponningmaat, speling, draairichting per vak, overige opmerkingen) samengevat in "notes".
- Bij een onduidelijke of onvolledige zin: laat de betreffende velden null, praat niet omheen.`;

export const parseVoiceTranscript = async (transcript: string): Promise<ParsedMeasurement> => {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    output_config: { effort: 'low' },
    messages: [{ role: 'user', content: transcript }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    return EMPTY_RESULT;
  }

  const raw = textBlock.text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_RESULT;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return EMPTY_RESULT;
  }

  const candidate = parsed as Record<string, unknown>;

  return {
    elementCode: typeof candidate.elementCode === 'string' ? candidate.elementCode : null,
    location: typeof candidate.location === 'string' ? candidate.location : null,
    elementType:
      typeof candidate.elementType === 'string' &&
      ELEMENT_TYPES.includes(candidate.elementType as ElementType)
        ? (candidate.elementType as ElementType)
        : null,
    width: typeof candidate.width === 'number' ? candidate.width : null,
    height: typeof candidate.height === 'number' ? candidate.height : null,
    glassType: typeof candidate.glassType === 'string' ? candidate.glassType : null,
    notes: typeof candidate.notes === 'string' ? candidate.notes : null,
  };
};
