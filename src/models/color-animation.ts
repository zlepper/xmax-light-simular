export interface ColorAnimationFrameLightColor {
  red: number;
  green: number;
  blue: number;
  hex: string;
}

export interface ColorAnimationFrame {
  frameId: number;
  lights: ColorAnimationFrameLightColor[];
}

export interface ColorAnimation {
  filename: string;
  frames: ColorAnimationFrame[];
}

export async function parseColorAnimation(file: File): Promise<ColorAnimation> {
  const content = await file.text();

  const frames = content
    .split('\n')
    .slice(1)
    .filter((line) => line.length > 0)
    .map((line) => {
      const values = line.split(',').map((v) => parseInt(v, 10));
      const frameId = values[0];
      const remaining = values.slice(1);
      const lights: ColorAnimationFrameLightColor[] = [];

      for (let i = 0; i < remaining.length; i += 3) {
        const red = remaining[i];
        const green = remaining[i + 1];
        const blue = remaining[i + 2];

        lights.push({
          red,
          green,
          blue,
          hex: `${red.toString(16)}${green.toString(16)}${blue.toString(16)}`,
        });
      }

      return {
        frameId,
        lights,
      };
    });

  return {
    frames,
    filename: file.name,
  };
}
