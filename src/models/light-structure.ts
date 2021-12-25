export interface LightStructureLight {
  x: number;
  y: number;
  z: number;
}

export interface LightStructure {
  filename: string;
  lights: LightStructureLight[];
}

export async function parseLightStructure(file: File): Promise<LightStructure> {
  const content = await file.text();

  const rows = content.split('\n').map((line) => {
    const [x, y, z] = line.split(',').map((value) => parseFloat(value));
    return {
      x: y,
      y: z,
      z: x,
    };
  });

  return {
    filename: file.name,
    lights: rows,
  };
}
