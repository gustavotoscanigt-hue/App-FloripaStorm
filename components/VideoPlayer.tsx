import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Annotation, Drawing, ToolMode, DrawingPath } from '../types/index';
import { denormalizePosition, normalizePosition } from '../lib/utils';

interface VideoPlayerProps {
  videoSrc: string | null;
  annotations: Annotation[];
  drawings: Drawing[];
  toolMode: ToolMode;
  currentColor: string;
  brushSize: number;
  playbackSpeed: number;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onAddAnnotation: (x: number, y: number, time: number) => void;
  onAddDrawing: (drawing: Drawing) => void;
  zoomConfig: { active: boolean; x: number; y: number } | null;
}

export interface VideoPlayerHandle {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getDuration: () => number;
  getCurrentTime: () => number;
  setMuted: (muted: boolean) => void;
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(({
  videoSrc,
  annotations,
  drawings,
  toolMode,
  currentColor,
  brushSize,
  playbackSpeed,
  onTimeUpdate,
  onDurationChange,
  onAddAnnotation,
  onAddDrawing,
  zoomConfig
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentPathRef = useRef<{ x: number; y: number; isStart: boolean }[]>([]);

  useImperativeHandle(ref, () => ({
    play: () => videoRef.current?.play(),
    pause: () => videoRef.current?.pause(),
    seek: (time: number) => {
      if (videoRef.current) videoRef.current.currentTime = time;
    },
    getDuration: () => videoRef.current?.duration || 0,
    getCurrentTime: () => videoRef.current?.currentTime || 0,
    setMuted: (muted: boolean) => {
      if (videoRef.current) videoRef.current.muted = muted;
    }
  }));

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Canvas Drawing Loop
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas?.getContext('2d');

      if (canvas && video && ctx) {
        // Sync canvas size
        if (canvas.width !== video.clientWidth || canvas.height !== video.clientHeight) {
          canvas.width = video.clientWidth;
          canvas.height = video.clientHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const currentTime = video.currentTime;
        const tolerance = 0.5; // Show drawings within 0.5s window

        drawings.forEach(drawing => {
          if (Math.abs(drawing.time - currentTime) < tolerance) {
            ctx.strokeStyle = drawing.color;
            ctx.lineWidth = drawing.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            
            let first = true;
            drawing.path.forEach((p: DrawingPath) => {
              const pos = denormalizePosition(p.x, p.y, canvas.width, canvas.height);
              if (first || p.isStart) {
                ctx.moveTo(pos.x, pos.y);
                first = false;
              } else {
                ctx.lineTo(pos.x, pos.y);
                // We stroke immediately to avoid long path issues in some browsers
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
              }
            });
          }
        });

        // Draw current stroke being drawn
        if (isDrawing && currentPathRef.current.length > 0) {
          ctx.strokeStyle = currentColor;
          ctx.lineWidth = brushSize;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          let first = true;
           currentPathRef.current.forEach(p => {
              const pos = denormalizePosition(p.x, p.y, canvas.width, canvas.height);
              if (first || p.isStart) {
                ctx.moveTo(pos.x, pos.y);
                first = false;
              } else {
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
              }
            });
        }
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [drawings, isDrawing, currentColor, brushSize]);


  const handlePointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current || !videoRef.current) return;
    
    // Prevent scrolling on touch devices while drawing
    if (toolMode === 'pen') {
      e.currentTarget.releasePointerCapture(e.pointerId); 
    }

    const pos = normalizePosition(e.clientX, e.clientY, containerRef.current);

    if (toolMode === 'point') {
       onAddAnnotation(pos.x, pos.y, videoRef.current.currentTime);
    } else if (toolMode === 'pen') {
      setIsDrawing(true);
      currentPathRef.current = [{ x: pos.x, y: pos.y, isStart: true }];
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || toolMode !== 'pen' || !containerRef.current) return;
    e.preventDefault(); 
    const pos = normalizePosition(e.clientX, e.clientY, containerRef.current);
    currentPathRef.current.push({ x: pos.x, y: pos.y, isStart: false });
  };

  const handlePointerUp = () => {
    if (isDrawing && videoRef.current) {
      setIsDrawing(false);
      if (currentPathRef.current.length > 1) {
        onAddDrawing({
          id: Date.now().toString(),
          time: videoRef.current.currentTime,
          color: currentColor,
          size: brushSize,
          path: [...currentPathRef.current]
        });
      }
      currentPathRef.current = [];
    }
  };

  const transformStyle = zoomConfig && zoomConfig.active
    ? {
        transform: 'scale(2.0)',
        transformOrigin: `${zoomConfig.x * 100}% ${zoomConfig.y * 100}%`
      }
    : {
        transform: 'scale(1)',
        transformOrigin: 'center center'
      };

  return (
    <div className="relative w-full aspect-video bg-black overflow-hidden rounded-lg shadow-xl group">
      {!videoSrc && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
           No Video Loaded
        </div>
      )}
      
      <div 
        ref={containerRef}
        className="w-full h-full relative transition-transform duration-300 ease-out"
        style={transformStyle}
      >
        <video
          ref={videoRef}
          src={videoSrc || ""}
          className="w-full h-full object-contain pointer-events-none"
          playsInline
          onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
          onDurationChange={(e) => onDurationChange(e.currentTarget.duration)}
        />
        
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full touch-none ${toolMode === 'pen' || toolMode === 'point' ? 'cursor-crosshair' : 'cursor-default'}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />

        {/* DOM Overlay for Annotation Points (so they are interactable if needed, though mostly visual) */}
        {videoRef.current && annotations.map(anno => {
           const isVisible = Math.abs(anno.time - videoRef.current!.currentTime) < 0.5;
           if (!isVisible) return null;
           
           return (
             <div
               key={anno.id}
               className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none"
               style={{ 
                 left: `${anno.x * 100}%`, 
                 top: `${anno.y * 100}%`,
                 backgroundColor: anno.color 
               }}
             >
               <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                 {anno.text}
               </div>
             </div>
           );
        })}
      </div>
    </div>
  );
});

export default VideoPlayer;