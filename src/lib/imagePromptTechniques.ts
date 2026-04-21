export type ImagePromptTechnique = {
  id: string;
  name: string;
  description: string;
  generate: (input: string) => { prompt: string; tips: string[] };
};

const creativeEnhancers = {
  styles: [
    "photorealistic", "cinematic lighting", "golden hour", "neon lights", "studio lighting",
    "dramatic shadows", "soft focus", "bokeh", "fisheye lens", "tilt-shift",
    "oil painting", "watercolor", "digital art", "anime style", "cyberpunk", "steampunk",
    "art nouveau", "impressionism", "surrealism", "minimalist", "maximalist",
  ],
  moods: [
    "serene", "mysterious", "dramatic", "whimsical", "dreamy", "energetic", "peaceful",
    "dark and moody", "uplifting", "nostalgic", "futuristic", "ethereal", "gritty",
  ],
  compositions: [
    "wide angle", "close-up", "bird's eye view", "worm's eye view", "symmetrical composition",
    "rule of thirds", "leading lines", "frame within frame", "negative space", "depth of field",
  ],
  lighting: [
    "rim lighting", "natural light", "volumetric lighting", "cinematic backlight",
    "softbox lighting", "practical lighting", "golden hour glow", "blue hour",
  ],
  details: [
    "highly detailed", "intricate patterns", "sharp focus", "complex textures",
    "smooth gradients", "dynamic range", "rich colors", "subtle grain",
  ],
};

function analyzeAndEnhance(input: string): { style: string; mood: string; lighting: string; composition: string; details: string } {
  const lower = input.toLowerCase();
  
  let style = creativeEnhancers.styles[Math.floor(Math.random() * creativeEnhancers.styles.length)];
  let mood = creativeEnhancers.moods[Math.floor(Math.random() * creativeEnhancers.moods.length)];
  let lighting = creativeEnhancers.lighting[Math.floor(Math.random() * creativeEnhancers.lighting.length)];
  let composition = creativeEnhancers.compositions[Math.floor(Math.random() * creativeEnhancers.compositions.length)];
  let details = creativeEnhancers.details[Math.floor(Math.random() * creativeEnhancers.details.length)];

  if (lower.includes("portrait") || lower.includes("face") || lower.includes("person")) {
    style = "professional portrait photography";
    lighting = "studio key light with soft fill";
    composition = "close-up with shallow depth of field";
  }
  if (lower.includes("landscape") || lower.includes("nature") || lower.includes("mountain")) {
    style = "landscape photography";
    mood = "serene";
    lighting = "golden hour natural light";
    composition = "wide angle with leading lines";
  }
  if (lower.includes("city") || lower.includes("urban") || lower.includes("building")) {
    style = "urban photography";
    mood = "moody";
    lighting = "night with neon lights";
    composition = "wide angle";
  }
  if (lower.includes("abstract") || lower.includes("pattern")) {
    style = "abstract digital art";
    composition = "balanced composition";
    details = "intricate patterns";
  }
  if (lower.includes("food") || lower.includes("meal")) {
    style = "food photography";
    lighting = "natural light with soft shadows";
    composition = "45-degree angle";
  }
  if (lower.includes("product") || lower.includes("item")) {
    style = "product photography";
    lighting = "clean studio lighting";
    composition = "centered with white background";
  }
  if (lower.includes("anime") || lower.includes("manga")) {
    style = "anime style illustration";
    mood = "dynamic";
  }
  if (lower.includes("3d") || lower.includes("render")) {
    style = "3D render";
    details = "ultra detailed, 8K resolution";
  }

  return { style, mood, lighting, composition, details };
}

function getRandomAdjectives(): string[] {
  const adjectives = [
    "vibrant", "rich", "warm", "cool", "soft", "bold", "delicate", "stunning",
    "breathtaking", "elegant", "striking", "atmospheric", "immersive", "ethereal",
    "mesmerizing", "captivating", "gorgeous", "luminous",
  ];
  const numToPick = 2 + Math.floor(Math.random() * 2);
  const shuffled = [...adjectives].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, numToPick);
}

export const imagePromptTechniques: ImagePromptTechnique[] = [
  {
    id: "creative",
    name: "Creative Spark",
    description: "Generates creative, detailed prompts from simple ideas",
    generate: (input: string) => {
      const enhanced = analyzeAndEnhance(input);
      const adjectives = getRandomAdjectives();
      
      const prompt = `${input}, ${enhanced.style}, ${enhanced.lighting}, ${enhanced.composition}, ${adjectives.join(", ")} atmosphere, ${enhanced.details}, ${enhanced.mood} mood, high quality, detailed, professional photography, 8k, sharp focus, trending on artstation`;
      
      return {
        prompt,
        tips: [
          `Added ${enhanced.style} style for visual impact`,
          `Used ${enhanced.lighting} for depth`,
          `Included ${enhanced.composition} composition`,
          `Set ${enhanced.mood} mood for atmosphere`,
        ],
      };
    },
  },
  {
    id: "photorealistic",
    name: "Photo Realistic",
    description: "Professional photography-style prompts",
    generate: (input: string) => {
      const enhanced = analyzeAndEnhance(input);
      
      const prompt = `photograph of ${input}, ${enhanced.style}, professional camera, ${enhanced.lighting}, ${enhanced.composition}, sharp focus, bokeh, professional color grading, high detail, 8k resolution, realistic textures, natural expression`;
      
      return {
        prompt,
        tips: [
          "Use professional camera terminology",
          "Specify lens and aperture",
          "Add proper lighting description",
          "Include depth of field",
        ],
      };
    },
  },
  {
    id: "digital",
    name: "Digital Art",
    description: "Illustration and digital art styles",
    generate: (input: string) => {
      const enhanced = analyzeAndEnhance(input);
      const adjectives = getRandomAdjectives();
      
      const prompt = `digital art of ${input}, ${enhanced.style}, ${adjectives.join(", ")}, ${enhanced.mood} mood, ${enhanced.details}, trending on artstation, concept art, masterpiece`;
      
      return {
        prompt,
        tips: [
          "Reference artstation trending",
          "Add style keywords",
          "Include mood adjectives",
          "Use concept art framing",
        ],
      };
    },
  },
  {
    id: "cinematic",
    name: "Cinematic",
    description: "Movie poster-style dramatic prompts",
    generate: (input: string) => {
      const enhanced = analyzeAndEnhance(input);
      
      const prompt = `cinematic shot of ${input}, movie scene, ${enhanced.lighting}, ${enhanced.composition}, film grain, cinematic color grading, teal and orange tones, anamorphic lens flare, dramatic shadows, 2.39:1 aspect ratio, cinema quality`;
      
      return {
        prompt,
        tips: [
          "Use cinematic terminology",
          "Specify aspect ratio",
          "Add color grading",
          "Include film effects",
        ],
      };
    },
  },
  {
    id: "anime",
    name: "Anime / Manga",
    description: "Japanese animation style prompts",
    generate: (input: string) => {
      const prompt = `anime style illustration of ${input}, anime character, detailed anime art, vibrant colors, cel shading, dynamic pose, expressive eyes, intricate details, anime background, clean lines, manga quality`;
      
      return {
        prompt,
        tips: [
          "Use anime terminology",
          "Mention cel shading",
          "Add character details",
          "Include background context",
        ],
      };
    },
  },
  {
    id: "3d",
    name: "3D Render",
    description: "Three-dimensional renders",
    generate: (input: string) => {
      const prompt = `3D render of ${input}, blender, cinema 4D, octane render, ${getRandomAdjectives()[0]} lighting, volumetric lighting, subsurface scattering, detailed textures, 8k, unreal engine 5, trending on artstation, masterpiece`;
      
      return {
        prompt,
        tips: [
          "Reference render engines",
          "Add lighting details",
          "Specify resolution",
          "Use unreal engine 5",
        ],
      };
    },
  },
  {
    id: "painting",
    name: "Classic Painting",
    description: "Traditional art styles",
    generate: (input: string) => {
      const styles = ["oil painting", "watercolor", "acrylic painting", "impasto"];
      const selected = styles[Math.floor(Math.random() * styles.length)];
      const enhanced = analyzeAndEnhance(input);
      
      const prompt = `${selected} of ${input}, ${enhanced.mood} mood, ${enhanced.lighting}, classic painting style, brushstrokes visible, rich textures, museum quality, detailed`;
      
      return {
        prompt,
        tips: [
          "Reference painting medium",
          "Add brushstroke details",
          "Mention museum quality",
          "Include texture descriptions",
        ],
      };
    },
  },
  {
    id: "nano",
    name: "Nano",
    description: "Simple and effective prompts",
    generate: (input: string) => {
      return {
        prompt: `${input}, high quality, detailed, clean`,
        tips: [
          "Keep prompts under 50 words",
          "Add high quality tag",
          "Use simple language",
        ],
      };
    },
  },
];

export function getImageTechniqueById(id: string): ImagePromptTechnique | undefined {
  return imagePromptTechniques.find((t) => t.id === id);
}

export function generateImagePrompt(
  techniqueId: string,
  userInput: string
): { prompt: string; tips: string[] } {
  const technique = getImageTechniqueById(techniqueId);
  if (!technique) {
    return { prompt: userInput, tips: [] };
  }
  return technique.generate(userInput);
}