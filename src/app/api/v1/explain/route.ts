import { NextResponse } from 'next/server';

const VOCAB_DICTIONARY: Record<string, { definition: string; explanation: string }> = {
  tired: {
    definition: 'Needing rest or sleep; having no energy left.',
    explanation: 'Alice felt tired after sitting by her sister all afternoon without anything to do.',
  },
  daisy: {
    definition: 'A small wild flower with a yellow center and white petals.',
    explanation: 'Dorothy picked a daisy in the field to make a necklace for her puppy Toto.',
  },
  rabbit: {
    definition: 'A small furry animal with long ears and a short tail that lives in holes in the ground.',
    explanation: 'A White Rabbit with pink eyes ran past Alice, looking closely at his pocket watch.',
  },
  disagreeable: {
    definition: 'Unpleasant, unfriendly, or hard to get along with.',
    explanation: 'Mary was disagreeable because she frowned and rarely spoke to other children.',
  },
  government: {
    definition: 'The group of people who make rules and run a country or state.',
    explanation: 'Mary’s father worked for the governement in India, helping write new safety rules.',
  },
  remain: {
    definition: 'To stay in the same place or keep being the same way.',
    explanation: 'Mrs. Darling wanted Wendy to remain a little child forever.',
  },
  garden: {
    definition: 'A piece of ground next to a house where flowers, vegetables, or plants are grown.',
    explanation: 'Wendy played in the garden and picked a flower for her mother.',
  },
  prairies: {
    definition: 'Large open areas of flat grassland with moderate temperatures and few trees.',
    explanation: 'Dorothy lived on the wide prairies of Kansas, where grass grew as far as she could see.',
  },
  cyclone: {
    definition: 'A violent tropical storm with heavy winds rotating around a center point.',
    explanation: 'The cyclone carried Dorothy’s house high up into the clouds.',
  },
};

export async function POST(request: Request) {
  try {
    const { word } = await request.json();
    if (!word) {
      return NextResponse.json({ error: 'Word parameter is required' }, { status: 400 });
    }

    const cleanWord = word.toLowerCase().trim();
    const result = VOCAB_DICTIONARY[cleanWord] || {
      definition: 'A word denoting an object, quality, or action in the story.',
      explanation: `The child paused on the word "${word}" to understand the sentence better.`,
    };

    // Simulate small network delay to mock real LLM inference
    await new Promise((resolve) => setTimeout(resolve, 800));

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to explain word' }, { status: 500 });
  }
}
