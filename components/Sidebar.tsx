import React from 'react';
import { Save, Trash2, Play, Square, X, Share2 } from 'lucide-react';
import { Annotation, Clip } from '../types/index';
import { formatTime } from '../lib/utils';

interface SidebarProps {
  notes: string;
  setNotes: (notes: string) => void;
  clips: Clip[];
  setClips: (clips: Clip[]) => void;
  annotations: Annotation[];
  setAnnotations: (annotations: Annotation[]) => void;
  activeClipId: string | null;
  onPlayClip: (clip: Clip) => void;
  onStopClip: () => void;
  onSave: () => void;
  videoLoaded: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  notes,
  setNotes,
  clips,
  setClips,
  annotations,
  setAnnotations,
  activeClipId,
  onPlayClip,
  onStopClip,
  onSave,
  videoLoaded,
  isOpen,
  onClose
}) => {
  
  const handleDeleteClip = (clipId: string) => {
    setClips(clips.filter((c) => c.id !== clipId));
  };

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations(annotations.filter((a) => a.id !== id));
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed inset-y-0 right-0 z-40 w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out
          md:static md:transform-none md:shadow-xl md:flex md:flex-col md:border-l md:h-full
          ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="font-semibold text-gray-800">Analysis Data</h2>
          <button onClick={onClose} className="md:hidden text-gray-500 hover:text-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 h-[calc(100%-130px)] md:h-auto">
          {/* Notes */}
          <section>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
              General Notes
            </label>
            <textarea
              className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              rows={4}
              placeholder="Enter biomechanical observations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            ></textarea>
          </section>

          {/* Clips */}
          <section>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase">
                Smart Clips (Zoom)
              </label>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                {clips.length}
              </span>
            </div>
            {clips.length === 0 ? (
              <div className="text-sm text-gray-400 italic text-center py-4 border-2 border-dashed rounded-lg bg-gray-50">
                Add a "Point" to auto-generate a zoomed clip.
              </div>
            ) : (
              <div className="space-y-2">
                {clips.map((clip) => (
                  <div
                    key={clip.id}
                    className={`flex items-center p-2 rounded-lg border transition ${
                      activeClipId === clip.id
                        ? 'bg-indigo-50 border-indigo-200'
                        : 'bg-white hover:bg-gray-50 border-gray-100'
                    }`}
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {clip.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTime(clip.startTime)} - {formatTime(clip.endTime)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          activeClipId === clip.id ? onStopClip() : onPlayClip(clip)
                        }
                        className={`p-1.5 rounded transition ${
                          activeClipId === clip.id
                            ? 'bg-red-100 text-red-600'
                            : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                        }`}
                      >
                        {activeClipId === clip.id ? (
                          <Square className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteClip(clip.id)}
                        className="p-1.5 rounded bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Annotation List */}
          <section>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase">
                Annotations
              </label>
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                {annotations.length}
              </span>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {annotations.map((anno, idx) => (
                <div
                  key={anno.id}
                  className="flex justify-between items-center text-xs p-2 bg-gray-50 rounded border border-transparent hover:border-gray-200"
                >
                  <span className="truncate flex-1">
                    <span className="font-mono text-gray-400 mr-2">
                      {formatTime(anno.time)}
                    </span>
                    {idx + 1}. {anno.text}
                  </span>
                  <button
                    onClick={() => handleDeleteAnnotation(anno.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    &times;
                  </button>
                </div>
              ))}
              {annotations.length === 0 && (
                <p className="text-xs text-gray-400">No markers added yet.</p>
              )}
            </div>
          </section>
        </div>

        <div className="p-4 border-t bg-gray-50 absolute bottom-0 w-full md:static">
          <button
            onClick={onSave}
            disabled={!videoLoaded}
            className="w-full flex justify-center items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-medium shadow-sm transition"
          >
             <div className="flex gap-2 items-center">
                 <Share2 className="w-4 h-4 md:hidden" />
                 <Save className="w-4 h-4 hidden md:block" />
                 <span className="md:hidden">Share Analysis</span>
                 <span className="hidden md:inline">Save Analysis Package</span>
             </div>
          </button>
        </div>
      </aside>
    </>
  );
};