export const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const normalizePosition = (
  clientX: number,
  clientY: number,
  element: HTMLElement
) => {
  const rect = element.getBoundingClientRect();
  return {
    x: (clientX - rect.left) / rect.width,
    y: (clientY - rect.top) / rect.height,
  };
};

export const denormalizePosition = (
  x: number,
  y: number,
  width: number,
  height: number
) => {
  return {
    x: x * width,
    y: y * height,
  };
};
