import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { Play, Pause, Square, Trash2, PenTool, MousePointer2, Share2 } from 'lucide-react';

import VideoPlayer, { VideoPlayerHandle } from './components/VideoPlayer';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Annotation, Clip, Drawing, ToolMode, AnalysisData } from './types/index';
import { formatTime, generateId } from './lib/utils';

const App: React.FC = () => {
  // --- State ---
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [primaryVideoFile, setPrimaryVideoFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Tools
  const [toolMode, setToolMode] = useState<ToolMode>('point');
  const [currentColor, setCurrentColor] = useState('#ef4444'); // red-500
  const [brushSize] = useState(5); // Removed setBrushSize as it was unused

  // Data
  const [notes, setNotes] = useState('');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);

  // Clip Playback State
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  
  const playerRef = useRef<VideoPlayerHandle>(null);

  // --- Handlers ---

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setPrimaryVideoFile(file);
      // Reset data
      setAnnotations([]);
      setDrawings([]);
      setClips([]);
      setNotes('');
    }
  };

  const handleAnalysisUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const zip = await JSZip.loadAsync(file);
      const jsonContent = await zip.file("analysis_data.json")?.async("string");
      
      if (jsonContent) {
        const data: AnalysisData = JSON.parse(jsonContent);
        setNotes(data.notes || '');
        setDrawings(data.drawings || []);
        setAnnotations(data.annotations || []);
        setClips(data.clips || []);

        // Try to load video if inside zip
        if (data.primaryVideoFileName) {
          const videoBlob = await zip.file(data.primaryVideoFileName)?.async("blob");
          if (videoBlob) {
            const videoFile = new File([videoBlob], data.primaryVideoFileName, { type: videoBlob.type });
            const url = URL.createObjectURL(videoFile);
            setVideoSrc(url);
            setPrimaryVideoFile(videoFile);
          } else {
             alert(`Original video "${data.primaryVideoFileName}" not found in archive. Please load the video separately.`);
          }
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load analysis file.");
    }
  };

  const saveAnalysis = async () => {
    if (!primaryVideoFile) {
      alert("Please load a video first.");
      return;
    }

    setIsSaving(true);

    try {
      const data: AnalysisData = {
        version: "1.0",
        notes,
        drawings,
        annotations,
        clips,
        primaryVideoFileName: primaryVideoFile.name
      };

      const zip = new JSZip();
      zip.file("analysis_data.json", JSON.stringify(data, null, 2));
      
      // We include the video file in the zip for portability
      zip.file(primaryVideoFile.name, primaryVideoFile);

      const content = await zip.generateAsync({ type: "blob" });
      const fileName = `BioMotion_${new Date().toISOString().slice(0,10)}.zip`;
      const file = new File([content], fileName, { type: 'application/zip' });

      // Try native share (Mobile) or Fallback to download (Desktop)
      // Cast to any to avoid TypeScript errors with experimental Navigator APIs
      const nav = navigator as any;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({
            files: [file],
            title: 'BioMotion Analysis',
            text: 'Here is the biomechanical analysis package.',
          });
        } catch (error) {
           if ((error as Error).name !== 'AbortError') {
             console.error("Share failed:", error);
             saveAs(content, fileName);
           }
        }
      } else {
        saveAs(content, fileName);
      }
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to create package.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAnnotation = (x: number, y: number, time: number) => {
    // If on mobile, pause video while adding name
    if (window.innerWidth < 768) {
       playerRef.current?.pause();
       setIsPlaying(false);
    }

    const text = prompt("Annotation / Clip Name:", `Point ${annotations.length + 1}`);
    if (!text) return;

    const newAnnotation: Annotation = {
      id: generateId(),
      x, y, time, text, color: currentColor
    };

    setAnnotations([...annotations, newAnnotation]);

    // Create Perfect Clip (2s)
    const clipDuration = 2.0;
    const startTime = Math.max(0, time - 0.5); // Start a bit before
    const endTime = Math.min(duration, startTime + clipDuration);

    const newClip: Clip = {
      id: generateId(),
      name: text,
      startTime,
      endTime,
      duration: parseFloat((endTime - startTime).toFixed(2)),
      speed: 0.5,
      zoomX: x,
      zoomY: y
    };
    setClips([...clips, newClip]);
  };

  const handleAddDrawing = (drawing: Drawing) => {
    setDrawings([...drawings, drawing]);
  };

  // --- Playback Control ---

  const togglePlay = () => {
    if (activeClipId) {
      stopClip();
      return;
    }

    if (isPlaying) {
      playerRef.current?.pause();
      setIsPlaying(false);
    } else {
      playerRef.current?.play();
      setIsPlaying(true);
    }
  };

  const playClip = (clip: Clip) => {
    if (activeClipId) stopClip();

    setActiveClipId(clip.id);
    playerRef.current?.pause();
    playerRef.current?.setMuted(true);
    playerRef.current?.seek(clip.startTime);

    // Give a slight delay for seek to complete before playing
    setTimeout(() => {
        playerRef.current?.play();
    }, 50);
  };

  const stopClip = () => {
    setActiveClipId(null);
    playerRef.current?.pause();
    playerRef.current?.setMuted(false);
    setPlaybackSpeed(1.0); // Reset speed
  };

  // Monitor Clip End
  useEffect(() => {
    if (activeClipId) {
      const clip = clips.find(c => c.id === activeClipId);
      if (clip && currentTime >= clip.endTime) {
        playerRef.current?.pause();
        // Loop effect
        playerRef.current?.seek(clip.startTime);
        playerRef.current?.play();
      }
    }
  }, [currentTime, activeClipId, clips]);

  const effectiveSpeed = activeClipId ? 0.5 : playbackSpeed;
  const activeClipData = clips.find(c => c.id === activeClipId);
  
  const zoomConfig = activeClipData ? {
      active: true,
      x: activeClipData.zoomX,
      y: activeClipData.zoomY
  } : { active: false, x: 0.5, y: 0.5 };


  const clearAll = () => {
    if(confirm("Clear all annotations, drawings and clips?")) {
      setAnnotations([]);
      setDrawings([]);
      setClips([]);
      setNotes('');
      stopClip();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-800 font-sans">
      
      <Header 
        onVideoUpload={handleVideoUpload}
        onAnalysisUpload={handleAnalysisUpload}
        onToggleSidebar={() => setIsSidebarOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Content (Video) */}
        <main className="flex-1 flex flex-col p-2 md:p-6 overflow-y-auto">
           
           {/* Video Stage */}
           <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto w-full">
              <div className={`relative bg-black rounded-lg shadow-lg overflow-hidden ${activeClipId ? 'ring-4 ring-indigo-500' : ''}`}>
                 <VideoPlayer
                   ref={playerRef}
                   videoSrc={videoSrc}
                   annotations={annotations}
                   drawings={drawings}
                   toolMode={toolMode}
                   currentColor={currentColor}
                   brushSize={brushSize}
                   playbackSpeed={effectiveSpeed}
                   onTimeUpdate={setCurrentTime}
                   onDurationChange={setDuration}
                   onAddAnnotation={handleAddAnnotation}
                   onAddDrawing={handleAddDrawing}
                   zoomConfig={zoomConfig}
                 />
                 
                 {/* Floating Label for Clip Mode */}
                 {activeClipId && (
                     <div className="absolute top-4 left-4 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse z-30 shadow-lg">
                        Zoom Clip
                     </div>
                 )}
              </div>

              {/* Controls Bar */}
              <div className="mt-2 md:mt-4 bg-white p-3 rounded-lg shadow-sm border flex flex-wrap gap-3 items-center justify-between">
                 <div className="flex items-center gap-2 md:gap-4">
                    <button 
                      onClick={togglePlay}
                      className={`p-2 md:p-3 rounded-full text-white shadow-md transition transform active:scale-95 ${activeClipId ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    >
                        {activeClipId ? <Square className="w-4 h-4 md:w-5 md:h-5 fill-current"/> : (isPlaying ? <Pause className="w-4 h-4 md:w-5 md:h-5 fill-current" /> : <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />)}
                    </button>
                    <div className="text-xs md:text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 md:px-3 rounded">
                        {formatTime(currentTime)}
                    </div>
                 </div>

                 <div className="flex items-center gap-2 border-l pl-2 md:pl-4 border-gray-200">
                    <button 
                      onClick={() => setToolMode('point')}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs md:text-sm font-medium transition ${toolMode === 'point' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500 ring-offset-1' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                       <MousePointer2 className="w-4 h-4" /> <span className="hidden sm:inline">Point</span>
                    </button>
                    <button 
                      onClick={() => setToolMode('pen')}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs md:text-sm font-medium transition ${toolMode === 'pen' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500 ring-offset-1' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                       <PenTool className="w-4 h-4" /> <span className="hidden sm:inline">Draw</span>
                    </button>
                    
                    <input 
                      type="color" 
                      value={currentColor} 
                      onChange={(e) => setCurrentColor(e.target.value)} 
                      className="w-6 h-6 md:w-8 md:h-8 rounded cursor-pointer border-0 p-0 overflow-hidden shadow-sm"
                    />
                 </div>
                 
                 <button onClick={clearAll} className="ml-auto text-red-500 hover:bg-red-50 p-2 rounded transition" title="Clear All">
                    <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                 </button>
              </div>
           </div>
        </main>

        <Sidebar 
          notes={notes}
          setNotes={setNotes}
          clips={clips}
          setClips={setClips}
          annotations={annotations}
          setAnnotations={setAnnotations}
          activeClipId={activeClipId}
          onPlayClip={playClip}
          onStopClip={stopClip}
          onSave={saveAnalysis}
          videoLoaded={!!videoSrc}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Loading Overlay */}
      {isSaving && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center flex-col text-white">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-medium">Packaging Analysis...</p>
        </div>
      )}
    </div>
  );
};

export default App;